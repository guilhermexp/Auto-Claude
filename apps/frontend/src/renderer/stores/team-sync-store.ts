import { create } from 'zustand';
import type { TeamSyncMember, TeamSyncStatus, TeamSyncTeam, TeamSyncUpdate } from '../../shared/types/team-sync';

interface TeamSyncState {
  status: TeamSyncStatus;
  teams: TeamSyncTeam[];
  members: TeamSyncMember[];
  updates: TeamSyncUpdate[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<boolean>;
  signin: (email: string, password: string) => Promise<boolean>;
  signout: () => Promise<void>;
  createTeam: (name: string) => Promise<TeamSyncTeam | null>;
  joinTeam: (inviteCode: string) => Promise<boolean>;
  fetchTeams: () => Promise<void>;
  fetchMembers: (teamId: string) => Promise<void>;
  enableSync: (projectId: string, projectPath: string) => Promise<boolean>;
  disableSync: (projectId: string) => Promise<boolean>;
  forcePush: (projectId: string) => Promise<boolean>;
  forcePull: (projectId: string) => Promise<boolean>;
}

const EMPTY_STATUS: TeamSyncStatus = {
  connected: false,
  authenticated: false,
  activeTeam: undefined,
  syncedProjects: [],
  pendingChanges: 0,
  mode: 'disabled'
};

let cleanupUpdateListener: (() => void) | null = null;

export const useTeamSyncStore = create<TeamSyncState>((set, get) => ({
  status: EMPTY_STATUS,
  teams: [],
  members: [],
  updates: [],
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    cleanupUpdateListener = window.electronAPI.teamSync.onUpdate((update) => {
      set((state) => ({
        updates: [update, ...state.updates].slice(0, 150)
      }));
      void get().fetchStatus();
    });

    set({ initialized: true });
    await get().fetchStatus();
  },

  fetchStatus: async () => {
    const result = await window.electronAPI.teamSync.getStatus();
    if (!result.success || !result.data) {
      set({ error: result.error || 'team:errors.loadStatus' });
      return;
    }
    set({ status: result.data, error: null });
  },

  signup: async (email, name, password) => {
    set({ isLoading: true, error: null });
    const result = await window.electronAPI.teamSync.signup(email, name, password);
    set({ isLoading: false, error: result.success ? null : result.error || 'team:errors.signup' });
    if (result.success) {
      await Promise.all([get().fetchStatus(), get().fetchTeams()]);
    }
    return result.success;
  },

  signin: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await window.electronAPI.teamSync.signin(email, password);
    set({ isLoading: false, error: result.success ? null : result.error || 'team:errors.signin' });
    if (result.success) {
      await Promise.all([get().fetchStatus(), get().fetchTeams()]);
    }
    return result.success;
  },

  signout: async () => {
    await window.electronAPI.teamSync.signout();
    set({ status: EMPTY_STATUS, teams: [], members: [], error: null });
  },

  createTeam: async (name) => {
    const result = await window.electronAPI.teamSync.createTeam(name);
    if (!result.success || !result.data) {
      set({ error: result.error || 'team:errors.createTeam' });
      return null;
    }

    set((state) => ({
      teams: [result.data as TeamSyncTeam, ...state.teams.filter((item) => item.id !== result.data?.id)],
      status: {
        ...state.status,
        activeTeam: result.data
      },
      error: null
    }));
    return result.data;
  },

  joinTeam: async (inviteCode) => {
    const result = await window.electronAPI.teamSync.joinTeam(inviteCode);
    if (!result.success) {
      set({ error: result.error || 'team:errors.joinTeam' });
      return false;
    }

    await Promise.all([get().fetchTeams(), get().fetchStatus()]);
    return true;
  },

  fetchTeams: async () => {
    const result = await window.electronAPI.teamSync.getTeams();
    if (!result.success || !result.data) {
      set({ error: result.error || 'team:errors.loadTeams' });
      return;
    }
    set({ teams: result.data, error: null });
  },

  fetchMembers: async (teamId) => {
    const result = await window.electronAPI.teamSync.getMembers(teamId);
    if (!result.success || !result.data) {
      set({ error: result.error || 'team:errors.loadMembers' });
      return;
    }
    set({ members: result.data, error: null });
  },

  enableSync: async (projectId, projectPath) => {
    const result = await window.electronAPI.teamSync.enable(projectId, projectPath);
    if (!result.success) {
      set({ error: result.error || 'team:errors.enableSync' });
      return false;
    }
    await get().fetchStatus();
    return true;
  },

  disableSync: async (projectId) => {
    const result = await window.electronAPI.teamSync.disable(projectId);
    if (!result.success) {
      set({ error: result.error || 'team:errors.disableSync' });
      return false;
    }
    await get().fetchStatus();
    return true;
  },

  forcePush: async (projectId) => {
    const result = await window.electronAPI.teamSync.forcePush(projectId);
    if (!result.success) {
      set({ error: result.error || 'team:errors.forcePush' });
      return false;
    }
    await get().fetchStatus();
    return true;
  },

  forcePull: async (projectId) => {
    const result = await window.electronAPI.teamSync.forcePull(projectId);
    if (!result.success) {
      set({ error: result.error || 'team:errors.forcePull' });
      return false;
    }
    await get().fetchStatus();
    return true;
  }
}));

export function cleanupTeamSyncStore(): void {
  if (cleanupUpdateListener) {
    cleanupUpdateListener();
    cleanupUpdateListener = null;
  }
}
