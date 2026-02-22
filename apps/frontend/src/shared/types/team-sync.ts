export type TeamSyncResource =
  | 'projectSettings'
  | 'tasks'
  | 'taskLogs'
  | 'roadmap'
  | 'ideation'
  | 'insights';

export type TeamSyncBindingMode = 'git_identity' | 'manual';

export interface ProjectIdentity {
  remoteUrlCanonical: string;
  repoSlug: string;
  defaultBranch?: string;
  bindingMode: TeamSyncBindingMode;
}

export interface TeamSyncUser {
  id: string;
  email: string;
  name?: string;
}

export interface TeamSyncTeam {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  memberCount?: number;
  inviteCode?: string;
  createdAt?: number;
}

export interface TeamSyncMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'removed';
  joinedAt?: number;
  lastSyncAt?: number;
}

export interface TeamSyncStatus {
  connected: boolean;
  authenticated: boolean;
  user?: TeamSyncUser;
  activeTeam?: TeamSyncTeam;
  syncedProjects: string[];
  pendingChanges: number;
  lastSyncAt?: string;
  mode: 'disabled' | 'idle' | 'syncing' | 'error';
  error?: string;
}

export interface TeamSyncUpdate {
  type:
    | 'connected'
    | 'disconnected'
    | 'auth-changed'
    | 'team-changed'
    | 'sync-enabled'
    | 'sync-disabled'
    | 'sync-started'
    | 'sync-finished'
    | 'sync-error';
  message?: string;
  projectId?: string;
  resource?: TeamSyncResource;
  timestamp: string;
}

export interface TeamSyncRevision {
  revision: number;
  serverUpdatedAt: number;
  updatedBy: string;
  deletedAt?: number;
  deletedBy?: string;
}

export interface TeamSyncAuthResult {
  token: string;
  user: TeamSyncUser;
  expiresAt?: string;
}

export interface TeamSyncInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'expired';
  expiresAt?: string;
  organizationId?: string;
}

export interface TeamSyncInviteResult {
  invitationId: string;
  email: string;
  role: string;
  status: string;
}
