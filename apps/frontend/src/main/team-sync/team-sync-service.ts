import { EventEmitter } from 'node:events';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { TeamSyncConvexClient } from './convex-client';
import { TeamSyncFileWatcher, type TeamSyncFileEvent } from './file-watcher';
import { TeamSyncRevisionEngine } from './sync-engine';
import {
  clearTeamSyncCredentials,
  getOrCreateDeviceId,
  loadTeamSyncCredentials,
  saveTeamSyncCredentials,
  type TeamSyncCredentials
} from './credential-utils';
import type {
  ProjectIdentity,
  TeamSyncMember,
  TeamSyncStatus,
  TeamSyncTeam,
  TeamSyncUpdate,
  TeamSyncUser
} from '../../shared/types/team-sync';

export interface TeamSyncServiceOptions {
  convexUrl?: string;
}

interface ActiveProjectSync {
  projectId: string;
  projectPath: string;
  convexProjectId?: string; // Convex _id for the project document
  unsubscribers: Array<() => void>;
}

function canonicalizeRemote(remoteUrl: string): string {
  return remoteUrl
    .trim()
    .replace(/^git@github.com:/, 'https://github.com/')
    .replace(/^ssh:\/\//, 'https://')
    .replace(/\.git$/, '')
    .toLowerCase();
}

function extractRepoSlug(remoteCanonical: string): string {
  try {
    const url = new URL(remoteCanonical);
    return url.pathname.replace(/^\//, '');
  } catch {
    return remoteCanonical;
  }
}

/** Hash a string to a stable short identifier for project matching across machines. */
function hashProjectIdentity(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class TeamSyncService extends EventEmitter {
  private readonly convex: TeamSyncConvexClient;
  private readonly revisionEngine = new TeamSyncRevisionEngine();
  private readonly watcher: TeamSyncFileWatcher;
  private readonly deviceId: string;
  private credentials: TeamSyncCredentials | null = null;
  private status: TeamSyncStatus = {
    connected: false,
    authenticated: false,
    syncedProjects: [],
    pendingChanges: 0,
    mode: 'disabled'
  };

  private activeSyncs = new Map<string, ActiveProjectSync>();
  private updatesBuffer: TeamSyncUpdate[] = [];
  private knownTeams: TeamSyncTeam[] = [];

  constructor(options: TeamSyncServiceOptions = {}) {
    super();
    this.deviceId = getOrCreateDeviceId();
    this.convex = new TeamSyncConvexClient(options.convexUrl || process.env.TEAM_SYNC_CONVEX_URL);
    this.watcher = new TeamSyncFileWatcher(async (event) => {
      await this.handleLocalFileChange(event);
    });
  }

  async initialize(): Promise<void> {
    this.credentials = loadTeamSyncCredentials();
    if (this.credentials?.sessionToken) {
      // Set auth token BEFORE calling get-session so the Authorization header is included
      this.convex.setAuthToken(this.credentials.sessionToken);
      try {
        // Validate session against Better Auth
        const response = await this.convex.authRequest(
          '/api/auth/get-session',
          undefined,
          'GET'
        );
        if (response.ok) {
          const session = await response.json() as { user?: { id: string; email: string; name?: string } };
          if (session?.user) {
            const jwtOk = await this.convex.fetchAndSetConvexToken();
            if (!jwtOk) {
              console.error('[team-sync] Session valid but Convex JWT exchange failed');
              // Still mark user info but flag as not fully authenticated
              this.status = {
                ...this.status,
                authenticated: false,
                connected: false,
                mode: 'idle',
                user: {
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.name
                }
              };
              this.emitUpdate('auth-changed', 'Session valid but JWT exchange failed — try signing out and back in');
              return;
            }
            await this.convex.connect();
            this.status = {
              ...this.status,
              authenticated: true,
              connected: true,
              mode: 'idle',
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name
              }
            };
            this.emitUpdate('auth-changed', 'Session restored from secure storage');
            // Refresh teams list
            await this.refreshTeams();
            return;
          }
        }
      } catch (error) {
        console.warn('[team-sync] Failed to restore session:', error);
      }
      // Session invalid, clear auth token and credentials
      this.convex.setAuthToken(undefined);
      this.credentials.sessionToken = '';
      saveTeamSyncCredentials(this.credentials);
    }

    this.status = {
      ...this.status,
      connected: false,
      authenticated: false,
      mode: 'idle'
    };
  }

  async shutdown(): Promise<void> {
    // Unsubscribe all active syncs
    for (const sync of this.activeSyncs.values()) {
      for (const unsub of sync.unsubscribers) {
        unsub();
      }
    }
    await this.watcher.closeAll();
    await this.convex.disconnect();
    this.activeSyncs.clear();
    this.status = {
      ...this.status,
      connected: false,
      mode: 'idle'
    };
  }

  async signup(email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    try {
      const response = await this.convex.authRequest('/api/auth/sign-up/email', {
        email,
        name: name || email.split('@')[0],
        password,
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Sign up failed: ${body}` };
      }

      const data = await response.json() as {
        token?: string;
        user?: { id: string; email: string; name?: string };
      };

      if (data.token && data.user) {
        return this.handleAuthSuccess(data.token, data.user);
      }

      // If signup auto-signs in, the token is in cookies/headers
      // Fall through to sign in
      return this.signin(email, password);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  async signin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    try {
      const response = await this.convex.authRequest('/api/auth/sign-in/email', {
        email,
        password,
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Sign in failed: ${body}` };
      }

      const data = await response.json() as {
        token?: string;
        session?: { token?: string };
        user?: { id: string; email: string; name?: string };
      };

      const token = data.token || data.session?.token;
      if (token && data.user) {
        return this.handleAuthSuccess(token, data.user);
      }

      return { success: false, error: 'No token received from server' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  async signout(): Promise<void> {
    try {
      await this.convex.authRequest('/api/auth/sign-out', {});
    } catch {
      // Best effort
    }

    clearTeamSyncCredentials();
    this.credentials = null;
    this.convex.setAuthToken(undefined);
    await this.disableAllSync();

    this.status = {
      ...this.status,
      authenticated: false,
      connected: false,
      activeTeam: undefined,
      user: undefined,
      mode: 'idle'
    };
    this.emitUpdate('auth-changed', 'Signed out');
  }

  async createTeam(name: string): Promise<{ success: boolean; data?: TeamSyncTeam; error?: string }> {
    if (!name.trim()) {
      return { success: false, error: 'Team name is required' };
    }

    if (!this.convex.hasAuth()) {
      // Try refreshing the JWT before giving up
      console.warn('[team-sync] No Convex JWT for createTeam, attempting refresh...');
      const refreshed = await this.convex.fetchAndSetConvexToken();
      if (!refreshed) {
        return { success: false, error: 'Not authenticated with Convex. Please sign out and sign in again.' };
      }
    }

    try {
      const trimmed = name.trim();

      // Server-side invite code generation via our custom endpoint
      const response = await this.convex.authRequest('/api/team-sync/create-team', {
        name: trimmed,
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Failed to create team: ${body}` };
      }

      const org = await response.json() as { id: string; name: string; slug: string; inviteCode: string };

      const team: TeamSyncTeam = {
        id: org.id,
        name: trimmed,
        role: 'owner',
        memberCount: 1,
        inviteCode: org.inviteCode,
        createdAt: Date.now()
      };

      this.knownTeams = [team, ...this.knownTeams.filter((item) => item.id !== team.id)];
      this.status = { ...this.status, activeTeam: team };

      if (this.credentials) {
        this.credentials.activeTeamId = team.id;
        saveTeamSyncCredentials(this.credentials);
      }

      this.emitUpdate('team-changed', `Team created: ${team.name}`);
      return { success: true, data: team };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create team' };
    }
  }

  async joinTeam(inviteCode: string): Promise<{ success: boolean; error?: string }> {
    if (!inviteCode.trim()) {
      return { success: false, error: 'Invite code is required' };
    }

    try {
      const response = await this.convex.authRequest('/api/team-sync/join-by-code', {
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to join team' })) as { error?: string };
        return { success: false, error: body.error || 'Failed to join team' };
      }

      const result = await response.json() as { organizationId: string; name: string };

      // Refresh teams to get full details
      await this.refreshTeams();

      const joinedTeam = this.knownTeams.find((t) => t.id === result.organizationId);
      if (joinedTeam) {
        this.status = { ...this.status, activeTeam: joinedTeam };
      }

      if (this.credentials) {
        this.credentials.activeTeamId = result.organizationId;
        saveTeamSyncCredentials(this.credentials);
      }

      this.emitUpdate('team-changed', `Joined team`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to join team' };
    }
  }

  async getMyTeams(): Promise<TeamSyncTeam[]> {
    try {
      await this.refreshTeams();
    } catch {
      // Return cached
    }
    return this.knownTeams;
  }

  async getTeamMembers(teamId: string): Promise<TeamSyncMember[]> {
    try {
      const response = await this.convex.authRequest('/api/auth/organization/get-full-organization', {
        organizationId: teamId,
      });

      if (!response.ok) {
        console.warn('[team-sync] Failed to fetch org members:', response.status);
        return [];
      }

      const data = await response.json() as {
        members?: Array<{
          id: string;
          userId: string;
          role: string;
          createdAt: string;
          user?: { email?: string; name?: string };
        }>;
      };

      return (data.members || []).map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user?.email || m.userId,
        role: m.role as 'owner' | 'admin' | 'member',
        status: 'active' as const,
        joinedAt: new Date(m.createdAt).getTime(),
      }));
    } catch (error) {
      console.warn('[team-sync] Failed to fetch members:', error);
      return [];
    }
  }

  async removeMember(teamId: string, memberId: string): Promise<{ success: boolean }> {
    try {
      const response = await this.convex.authRequest('/api/team-sync/remove-member', {
        organizationId: teamId,
        memberId,
      });
      return { success: response.ok };
    } catch {
      return { success: false };
    }
  }

  async generateInviteCode(teamId: string): Promise<string> {
    try {
      const response = await this.convex.authRequest('/api/team-sync/regenerate-invite-code', {
        organizationId: teamId,
      });
      if (!response.ok) return 'ERROR';
      const data = await response.json() as { inviteCode: string };
      return data.inviteCode;
    } catch {
      return 'ERROR';
    }
  }

  async enableSync(projectId: string, projectPath: string): Promise<void> {
    if (!this.status.activeTeam) {
      throw new Error('No active team. Create or join a team first.');
    }

    // Resolve project identity for cross-machine matching
    const identity = this.resolveProjectIdentity(projectPath);
    const projectHash = identity
      ? hashProjectIdentity(identity.repoSlug)
      : hashProjectIdentity(basename(projectPath));
    const projectName = identity?.repoSlug || basename(projectPath);

    // Upsert project in Convex
    const convexProjectId = await this.convex.mutation<string>(
      'projects:upsertProject',
      {
        teamId: this.status.activeTeam.id,
        projectName,
        projectHash,
      }
    );

    // Start file watching
    await this.watcher.watch(projectId, projectPath);

    // Set up subscriptions for real-time sync
    const unsubscribers: Array<() => void> = [];

    // Subscribe to task changes
    const unsubTasks = this.convex.subscribe(
      'tasks:getProjectTasks',
      { projectId: convexProjectId },
      (tasks: unknown) => {
        this.handleRemoteTasksUpdate(projectId, projectPath, tasks as Array<Record<string, unknown>>);
      }
    );
    unsubscribers.push(unsubTasks);

    // Subscribe to insights changes
    const unsubInsights = this.convex.subscribe(
      'insights:getSessions',
      { projectId: convexProjectId },
      (sessions: unknown) => {
        this.handleRemoteInsightsUpdate(projectId, projectPath, sessions as Array<Record<string, unknown>>);
      }
    );
    unsubscribers.push(unsubInsights);

    // Subscribe to roadmap changes
    const unsubRoadmap = this.convex.subscribe(
      'roadmap:getRoadmap',
      { projectId: convexProjectId },
      (roadmap: unknown) => {
        this.handleRemoteRoadmapUpdate(projectId, projectPath, roadmap as Record<string, unknown> | null);
      }
    );
    unsubscribers.push(unsubRoadmap);

    // Subscribe to ideation changes
    const unsubIdeation = this.convex.subscribe(
      'ideation:getIdeation',
      { projectId: convexProjectId },
      (ideation: unknown) => {
        this.handleRemoteIdeationUpdate(projectId, projectPath, ideation as Record<string, unknown> | null);
      }
    );
    unsubscribers.push(unsubIdeation);

    this.activeSyncs.set(projectId, {
      projectId,
      projectPath,
      convexProjectId,
      unsubscribers
    });

    this.status = {
      ...this.status,
      syncedProjects: Array.from(this.activeSyncs.keys()),
      mode: 'syncing'
    };
    this.emitUpdate('sync-enabled', `Sync enabled for ${projectName}`, projectId);
  }

  async disableSync(projectId: string): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (sync) {
      for (const unsub of sync.unsubscribers) {
        unsub();
      }
    }
    await this.watcher.unwatch(projectId);
    this.activeSyncs.delete(projectId);
    this.status = {
      ...this.status,
      syncedProjects: Array.from(this.activeSyncs.keys()),
      mode: this.activeSyncs.size > 0 ? 'syncing' : 'idle'
    };
    this.emitUpdate('sync-disabled', `Sync disabled for ${projectId}`, projectId);
  }

  async forcePush(projectId: string): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (!sync?.convexProjectId) return;

    this.status = { ...this.status, pendingChanges: this.status.pendingChanges + 1, mode: 'syncing' };
    this.emitUpdate('sync-started', `Force push started`, projectId);

    try {
      await this.pushAllLocalData(sync);
    } catch (error) {
      console.error('[team-sync] Force push failed:', error);
    }

    this.status = {
      ...this.status,
      pendingChanges: Math.max(0, this.status.pendingChanges - 1),
      lastSyncAt: new Date().toISOString(),
      mode: 'idle'
    };
    this.emitUpdate('sync-finished', `Force push completed`, projectId);
  }

  async forcePull(projectId: string): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (!sync?.convexProjectId) return;

    this.status = { ...this.status, pendingChanges: this.status.pendingChanges + 1, mode: 'syncing' };
    this.emitUpdate('sync-started', `Force pull started`, projectId);

    try {
      // Query all data and write to local files
      const tasks = await this.convex.query<Array<Record<string, unknown>>>(
        'tasks:getProjectTasks',
        { projectId: sync.convexProjectId }
      );
      this.handleRemoteTasksUpdate(projectId, sync.projectPath, tasks);

      const sessions = await this.convex.query<Array<Record<string, unknown>>>(
        'insights:getSessions',
        { projectId: sync.convexProjectId }
      );
      this.handleRemoteInsightsUpdate(projectId, sync.projectPath, sessions);

      const roadmap = await this.convex.query<Record<string, unknown> | null>(
        'roadmap:getRoadmap',
        { projectId: sync.convexProjectId }
      );
      this.handleRemoteRoadmapUpdate(projectId, sync.projectPath, roadmap);

      const ideation = await this.convex.query<Record<string, unknown> | null>(
        'ideation:getIdeation',
        { projectId: sync.convexProjectId }
      );
      this.handleRemoteIdeationUpdate(projectId, sync.projectPath, ideation);
    } catch (error) {
      console.error('[team-sync] Force pull failed:', error);
    }

    this.status = {
      ...this.status,
      pendingChanges: Math.max(0, this.status.pendingChanges - 1),
      lastSyncAt: new Date().toISOString(),
      mode: 'idle'
    };
    this.emitUpdate('sync-finished', `Force pull completed`, projectId);
  }

  /** Push a task update immediately (called from handler hooks). */
  async pushTaskUpdate(projectId: string, specId: string, data: Record<string, unknown>): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (!sync?.convexProjectId) return;

    try {
      await this.convex.mutation('tasks:upsertTask', {
        projectId: sync.convexProjectId,
        specId,
        ...data,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('[team-sync] Failed to push task update:', error);
    }
  }

  /** Push an insights session immediately. */
  async pushInsightsSession(projectId: string, session: Record<string, unknown>): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (!sync?.convexProjectId) return;

    try {
      await this.convex.mutation('insights:upsertSession', {
        projectId: sync.convexProjectId,
        ...session,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('[team-sync] Failed to push insights session:', error);
    }
  }

  /** Push project settings immediately. */
  async pushProjectSettings(projectId: string, settings: Record<string, unknown>): Promise<void> {
    const sync = this.activeSyncs.get(projectId);
    if (!sync?.convexProjectId || !this.status.activeTeam) return;

    try {
      const identity = this.resolveProjectIdentity(sync.projectPath);
      const projectHash = identity
        ? hashProjectIdentity(identity.repoSlug)
        : hashProjectIdentity(basename(sync.projectPath));

      await this.convex.mutation('projects:upsertProject', {
        teamId: this.status.activeTeam.id,
        projectName: identity?.repoSlug || basename(sync.projectPath),
        projectHash,
        settings,
      });
    } catch (error) {
      console.warn('[team-sync] Failed to push project settings:', error);
    }
  }

  isSyncEnabled(projectId: string): boolean {
    return this.activeSyncs.has(projectId);
  }

  getSyncStatus(): TeamSyncStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  getRecentUpdates(): TeamSyncUpdate[] {
    return [...this.updatesBuffer];
  }

  resolveProjectIdentity(projectPath: string): ProjectIdentity | null {
    try {
      const remoteRaw = execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin'], {
        encoding: 'utf-8',
        timeout: 5000
      }).trim();
      if (!remoteRaw) return null;

      const remoteUrlCanonical = canonicalizeRemote(remoteRaw);
      const repoSlug = extractRepoSlug(remoteUrlCanonical) || basename(projectPath);

      let defaultBranch: string | undefined;
      try {
        const symbolic = execFileSync('git', ['-C', projectPath, 'symbolic-ref', 'refs/remotes/origin/HEAD'], {
          encoding: 'utf-8',
          timeout: 5000
        }).trim();
        defaultBranch = symbolic.split('/').pop();
      } catch {
        // optional
      }

      return {
        remoteUrlCanonical,
        repoSlug,
        defaultBranch,
        bindingMode: 'git_identity'
      };
    } catch {
      return null;
    }
  }

  // --- Private methods ---

  private async handleAuthSuccess(
    token: string,
    user: { id: string; email: string; name?: string }
  ): Promise<{ success: boolean; error?: string }> {
    this.credentials = {
      email: user.email,
      sessionToken: token,
      activeTeamId: this.credentials?.activeTeamId,
      deviceId: this.deviceId
    };
    saveTeamSyncCredentials(this.credentials);
    this.convex.setAuthToken(token);
    const jwtOk = await this.convex.fetchAndSetConvexToken();
    if (!jwtOk) {
      console.error('[team-sync] Auth succeeded but Convex JWT exchange failed');
      this.status = {
        ...this.status,
        connected: false,
        authenticated: false,
        mode: 'idle',
        user: { id: user.id, email: user.email, name: user.name }
      };
      this.emitUpdate('auth-changed', 'JWT exchange failed — please try again');
      return { success: false, error: 'Failed to exchange token with Convex. Please try again.' };
    }
    await this.convex.connect();

    this.status = {
      ...this.status,
      connected: true,
      authenticated: true,
      mode: 'idle',
      user: { id: user.id, email: user.email, name: user.name }
    };
    this.emitUpdate('auth-changed', 'Authenticated successfully');

    // Refresh teams
    await this.refreshTeams();
    return { success: true };
  }

  private async refreshTeams(): Promise<void> {
    try {
      // Use our custom endpoint that returns orgs with the user's actual role
      const response = await this.convex.authRequest('/api/team-sync/my-teams', {});

      if (!response.ok) {
        console.warn('[team-sync] Failed to list teams:', response.status);
        return;
      }

      const teams = await response.json() as Array<{
        id: string;
        name: string;
        role: string;
        memberCount: number;
        inviteCode?: string;
        createdAt: string;
      }>;

      this.knownTeams = teams.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role as 'owner' | 'admin' | 'member',
        memberCount: t.memberCount,
        inviteCode: t.inviteCode,
        createdAt: new Date(t.createdAt).getTime(),
      }));

      // Restore active team from credentials
      if (this.credentials?.activeTeamId) {
        const activeTeam = this.knownTeams.find((t) => t.id === this.credentials?.activeTeamId);
        if (activeTeam) {
          this.status = { ...this.status, activeTeam };
        }
      }

      // Auto-select first team if none active
      if (!this.status.activeTeam && this.knownTeams.length > 0) {
        this.status = { ...this.status, activeTeam: this.knownTeams[0] };
        if (this.credentials) {
          this.credentials.activeTeamId = this.knownTeams[0].id;
          saveTeamSyncCredentials(this.credentials);
        }
      }
    } catch (error) {
      console.warn('[team-sync] Failed to refresh teams:', error);
    }
  }

  private async disableAllSync(): Promise<void> {
    const ids = Array.from(this.activeSyncs.keys());
    for (const projectId of ids) {
      await this.disableSync(projectId);
    }
  }

  private emitUpdate(type: TeamSyncUpdate['type'], message?: string, projectId?: string): void {
    const update: TeamSyncUpdate = {
      type,
      message,
      projectId,
      timestamp: new Date().toISOString()
    };
    this.updatesBuffer = [update, ...this.updatesBuffer].slice(0, 100);
    this.emit('update', update);
  }

  // --- Local file change → push to Convex ---

  private async handleLocalFileChange(event: TeamSyncFileEvent): Promise<void> {
    const sync = this.activeSyncs.get(event.projectId);
    if (!sync?.convexProjectId) return;

    this.status = {
      ...this.status,
      pendingChanges: this.status.pendingChanges + 1,
      mode: 'syncing'
    };

    const revisionKey = {
      projectId: event.projectId,
      resource: event.resource,
      resourceId: event.relativePath
    };

    const current = this.revisionEngine.get(revisionKey);
    const nextRevision = (current?.revision || 0) + 1;
    this.revisionEngine.set(revisionKey, {
      revision: nextRevision,
      serverUpdatedAt: Date.now(),
      updatedBy: this.status.user?.id || 'local-user'
    });

    this.emitUpdate('sync-started', `Detected ${event.resource} update`, event.projectId);

    try {
      await this.pushFileChange(sync, event);
    } catch (error) {
      console.warn('[team-sync] Failed to push file change:', error);
    }

    this.status = {
      ...this.status,
      pendingChanges: Math.max(0, this.status.pendingChanges - 1),
      lastSyncAt: new Date().toISOString(),
      mode: 'idle'
    };
    this.emitUpdate('sync-finished', `Synced ${event.relativePath}`, event.projectId);
  }

  private async pushFileChange(sync: ActiveProjectSync, event: TeamSyncFileEvent): Promise<void> {
    if (!sync.convexProjectId) return;
    const filePath = event.absolutePath;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const now = Date.now();

      switch (event.resource) {
        case 'tasks': {
          // Extract specId from path: .auto-claude/specs/001-name/...
          const specMatch = event.relativePath.match(/specs\/(\d{3}[^/]*)\//);
          if (!specMatch) break;
          const specId = specMatch[1];

          if (event.relativePath.endsWith('task_metadata.json')) {
            const metadata = JSON.parse(content);
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              title: metadata.title || `Task ${specId}`,
              status: metadata.status || 'draft',
              metadata,
              updatedAt: now,
            });
          } else if (event.relativePath.endsWith('spec.md')) {
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              specContent: content,
              updatedAt: now,
            });
          } else if (event.relativePath.endsWith('implementation_plan.json')) {
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              implementationPlan: JSON.parse(content),
              updatedAt: now,
            });
          } else if (event.relativePath.endsWith('qa_report.md')) {
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              qaReport: content,
              updatedAt: now,
            });
          }
          break;
        }

        case 'roadmap': {
          const data = JSON.parse(content);
          await this.convex.mutation('roadmap:upsertRoadmap', {
            projectId: sync.convexProjectId,
            features: data.features || data,
            updatedAt: now,
          });
          break;
        }

        case 'ideation': {
          const data = JSON.parse(content);
          await this.convex.mutation('ideation:upsertIdeation', {
            projectId: sync.convexProjectId,
            ideas: data.ideas || data,
            config: data.config,
            updatedAt: now,
          });
          break;
        }

        case 'insights': {
          const sessionMatch = event.relativePath.match(/sessions\/([^/]+)\.json$/);
          if (!sessionMatch) break;
          const sessionId = sessionMatch[1];
          const data = JSON.parse(content);
          await this.convex.mutation('insights:upsertSession', {
            projectId: sync.convexProjectId,
            sessionId,
            title: data.title,
            messages: data.messages || [],
            pendingAction: data.pendingAction,
            modelConfig: data.modelConfig,
            updatedAt: now,
          });
          break;
        }
      }
    } catch (error) {
      console.warn(`[team-sync] Failed to read/push ${event.relativePath}:`, error);
    }
  }

  // --- Remote subscription updates → write to local files ---

  private handleRemoteTasksUpdate(
    projectId: string,
    projectPath: string,
    tasks: Array<Record<string, unknown>>
  ): void {
    if (!tasks) return;
    for (const task of tasks) {
      const specId = task.specId as string;
      if (!specId) continue;

      const revisionKey = { projectId, resource: 'tasks' as const, resourceId: specId };
      const incomingRevision = {
        revision: task.updatedAt as number,
        serverUpdatedAt: task.updatedAt as number,
        updatedBy: (task.updatedBy as string) || 'remote'
      };

      if (!this.revisionEngine.shouldApplyRemote(revisionKey, incomingRevision)) continue;

      // Write metadata
      const specDir = join(projectPath, '.auto-claude', 'specs', specId);
      this.ensureDir(specDir);

      if (task.metadata) {
        this.writeRemoteFile(join(specDir, 'task_metadata.json'), JSON.stringify(task.metadata, null, 2));
      }
      if (task.specContent) {
        this.writeRemoteFile(join(specDir, 'spec.md'), task.specContent as string);
      }
      if (task.implementationPlan) {
        this.writeRemoteFile(join(specDir, 'implementation_plan.json'), JSON.stringify(task.implementationPlan, null, 2));
      }
      if (task.qaReport) {
        this.writeRemoteFile(join(specDir, 'qa_report.md'), task.qaReport as string);
      }

      this.revisionEngine.set(revisionKey, incomingRevision);
    }
  }

  private handleRemoteInsightsUpdate(
    projectId: string,
    projectPath: string,
    sessions: Array<Record<string, unknown>>
  ): void {
    if (!sessions) return;
    for (const session of sessions) {
      const sessionId = session.sessionId as string;
      if (!sessionId) continue;

      const revisionKey = { projectId, resource: 'insights' as const, resourceId: sessionId };
      const incomingRevision = {
        revision: session.updatedAt as number,
        serverUpdatedAt: session.updatedAt as number,
        updatedBy: (session.updatedBy as string) || 'remote'
      };

      if (!this.revisionEngine.shouldApplyRemote(revisionKey, incomingRevision)) continue;

      const sessionsDir = join(projectPath, '.auto-claude', 'insights', 'sessions');
      this.ensureDir(sessionsDir);
      this.writeRemoteFile(
        join(sessionsDir, `${sessionId}.json`),
        JSON.stringify({
          title: session.title,
          messages: session.messages,
          pendingAction: session.pendingAction,
          modelConfig: session.modelConfig,
        }, null, 2)
      );

      this.revisionEngine.set(revisionKey, incomingRevision);
    }
  }

  private handleRemoteRoadmapUpdate(
    projectId: string,
    projectPath: string,
    roadmap: Record<string, unknown> | null
  ): void {
    if (!roadmap) return;

    const revisionKey = { projectId, resource: 'roadmap' as const, resourceId: 'main' };
    const incomingRevision = {
      revision: roadmap.updatedAt as number,
      serverUpdatedAt: roadmap.updatedAt as number,
      updatedBy: (roadmap.updatedBy as string) || 'remote'
    };

    if (!this.revisionEngine.shouldApplyRemote(revisionKey, incomingRevision)) return;

    const roadmapDir = join(projectPath, '.auto-claude', 'roadmap');
    this.ensureDir(roadmapDir);
    this.writeRemoteFile(
      join(roadmapDir, 'roadmap.json'),
      JSON.stringify({ features: roadmap.features }, null, 2)
    );

    this.revisionEngine.set(revisionKey, incomingRevision);
  }

  private handleRemoteIdeationUpdate(
    projectId: string,
    projectPath: string,
    ideation: Record<string, unknown> | null
  ): void {
    if (!ideation) return;

    const revisionKey = { projectId, resource: 'ideation' as const, resourceId: 'main' };
    const incomingRevision = {
      revision: ideation.updatedAt as number,
      serverUpdatedAt: ideation.updatedAt as number,
      updatedBy: (ideation.updatedBy as string) || 'remote'
    };

    if (!this.revisionEngine.shouldApplyRemote(revisionKey, incomingRevision)) return;

    const ideationDir = join(projectPath, '.auto-claude', 'ideation');
    this.ensureDir(ideationDir);
    this.writeRemoteFile(
      join(ideationDir, 'ideation.json'),
      JSON.stringify({ ideas: ideation.ideas, config: ideation.config }, null, 2)
    );

    this.revisionEngine.set(revisionKey, incomingRevision);
  }

  // --- Force push all local data ---

  private async pushAllLocalData(sync: ActiveProjectSync): Promise<void> {
    if (!sync.convexProjectId) return;
    const projectPath = sync.projectPath;
    const specsDir = join(projectPath, '.auto-claude', 'specs');
    const now = Date.now();

    // Push tasks
    if (existsSync(specsDir)) {
      try {
        const specs = require('node:fs').readdirSync(specsDir, { withFileTypes: true });
        for (const entry of specs) {
          if (!entry.isDirectory()) continue;
          const specId = entry.name;
          const specDir = join(specsDir, specId);

          const metadataPath = join(specDir, 'task_metadata.json');
          if (existsSync(metadataPath)) {
            const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              title: metadata.title || `Task ${specId}`,
              status: metadata.status || 'draft',
              metadata,
              updatedAt: now,
            });
          }

          const specPath = join(specDir, 'spec.md');
          if (existsSync(specPath)) {
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              specContent: readFileSync(specPath, 'utf-8'),
              updatedAt: now,
            });
          }

          const planPath = join(specDir, 'implementation_plan.json');
          if (existsSync(planPath)) {
            await this.convex.mutation('tasks:upsertTask', {
              projectId: sync.convexProjectId,
              specId,
              implementationPlan: JSON.parse(readFileSync(planPath, 'utf-8')),
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.warn('[team-sync] Error pushing specs:', error);
      }
    }

    // Push roadmap
    const roadmapPath = join(projectPath, '.auto-claude', 'roadmap', 'roadmap.json');
    if (existsSync(roadmapPath)) {
      try {
        const data = JSON.parse(readFileSync(roadmapPath, 'utf-8'));
        await this.convex.mutation('roadmap:upsertRoadmap', {
          projectId: sync.convexProjectId,
          features: data.features || data,
          updatedAt: now,
        });
      } catch (error) {
        console.warn('[team-sync] Error pushing roadmap:', error);
      }
    }

    // Push ideation
    const ideationPath = join(projectPath, '.auto-claude', 'ideation', 'ideation.json');
    if (existsSync(ideationPath)) {
      try {
        const data = JSON.parse(readFileSync(ideationPath, 'utf-8'));
        await this.convex.mutation('ideation:upsertIdeation', {
          projectId: sync.convexProjectId,
          ideas: data.ideas || data,
          config: data.config,
          updatedAt: now,
        });
      } catch (error) {
        console.warn('[team-sync] Error pushing ideation:', error);
      }
    }
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private writeRemoteFile(filePath: string, content: string): void {
    this.watcher.markRemoteWrite(filePath);
    writeFileSync(filePath, content, 'utf-8');
  }
}

let teamSyncServiceInstance: TeamSyncService | null = null;

export function initializeTeamSyncService(options: TeamSyncServiceOptions = {}): TeamSyncService {
  if (teamSyncServiceInstance) {
    return teamSyncServiceInstance;
  }
  teamSyncServiceInstance = new TeamSyncService(options);
  return teamSyncServiceInstance;
}

export function getTeamSyncService(): TeamSyncService | null {
  return teamSyncServiceInstance;
}
