import { IPC_CHANNELS } from '../../../shared/constants';
import type { IPCResult } from '../../../shared/types';
import type { TeamSyncInvitation, TeamSyncInviteResult, TeamSyncMember, TeamSyncStatus, TeamSyncTeam, TeamSyncUpdate } from '../../../shared/types/team-sync';
import { createIpcListener, invokeIpc, type IpcListenerCleanup } from './ipc-utils';

export interface TeamSyncAPI {
  initialize: () => Promise<IPCResult<TeamSyncStatus>>;
  signup: (email: string, name: string, password: string) => Promise<IPCResult>;
  signin: (email: string, password: string) => Promise<IPCResult>;
  signout: () => Promise<IPCResult>;
  getStatus: () => Promise<IPCResult<TeamSyncStatus>>;
  createTeam: (name: string) => Promise<IPCResult<TeamSyncTeam>>;
  joinTeam: (inviteCode: string) => Promise<IPCResult>;
  getTeams: () => Promise<IPCResult<TeamSyncTeam[]>>;
  getMembers: (teamId: string) => Promise<IPCResult<TeamSyncMember[]>>;
  removeMember: (teamId: string, memberId: string) => Promise<IPCResult>;
  generateInviteCode: (teamId: string) => Promise<IPCResult<string>>;
  enable: (projectId: string, projectPath: string) => Promise<IPCResult>;
  disable: (projectId: string) => Promise<IPCResult>;
  forcePush: (projectId: string) => Promise<IPCResult>;
  forcePull: (projectId: string) => Promise<IPCResult>;
  inviteMember: (organizationId: string, email: string, role?: string) => Promise<IPCResult<TeamSyncInviteResult>>;
  acceptInvitation: (invitationId: string) => Promise<IPCResult<{ organizationId: string; name: string }>>;
  listInvitations: (organizationId: string) => Promise<IPCResult<TeamSyncInvitation[]>>;
  onUpdate: (callback: (update: TeamSyncUpdate) => void) => IpcListenerCleanup;
}

export const createTeamSyncAPI = (): TeamSyncAPI => ({
  initialize: () =>
    invokeIpc<IPCResult<TeamSyncStatus>>(IPC_CHANNELS.TEAM_SYNC_INITIALIZE),
  signup: (email: string, name: string, password: string) =>
    invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_SIGNUP, email, name, password),
  signin: (email: string, password: string) =>
    invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_SIGNIN, email, password),
  signout: () => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_SIGNOUT),
  getStatus: () => invokeIpc<IPCResult<TeamSyncStatus>>(IPC_CHANNELS.TEAM_SYNC_STATUS),
  createTeam: (name: string) => invokeIpc<IPCResult<TeamSyncTeam>>(IPC_CHANNELS.TEAM_SYNC_CREATE_TEAM, name),
  joinTeam: (inviteCode: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_JOIN_TEAM, inviteCode),
  getTeams: () => invokeIpc<IPCResult<TeamSyncTeam[]>>(IPC_CHANNELS.TEAM_SYNC_GET_TEAMS),
  getMembers: (teamId: string) => invokeIpc<IPCResult<TeamSyncMember[]>>(IPC_CHANNELS.TEAM_SYNC_GET_MEMBERS, teamId),
  removeMember: (teamId: string, memberId: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_REMOVE_MEMBER, teamId, memberId),
  generateInviteCode: (teamId: string) => invokeIpc<IPCResult<string>>(IPC_CHANNELS.TEAM_SYNC_GENERATE_INVITE, teamId),
  enable: (projectId: string, projectPath: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_ENABLE, projectId, projectPath),
  disable: (projectId: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_DISABLE, projectId),
  forcePush: (projectId: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_FORCE_PUSH, projectId),
  forcePull: (projectId: string) => invokeIpc<IPCResult>(IPC_CHANNELS.TEAM_SYNC_FORCE_PULL, projectId),
  inviteMember: (organizationId: string, email: string, role?: string) =>
    invokeIpc<IPCResult<TeamSyncInviteResult>>(IPC_CHANNELS.TEAM_SYNC_INVITE_MEMBER, organizationId, email, role),
  acceptInvitation: (invitationId: string) =>
    invokeIpc<IPCResult<{ organizationId: string; name: string }>>(IPC_CHANNELS.TEAM_SYNC_ACCEPT_INVITATION, invitationId),
  listInvitations: (organizationId: string) =>
    invokeIpc<IPCResult<TeamSyncInvitation[]>>(IPC_CHANNELS.TEAM_SYNC_LIST_INVITATIONS, organizationId),
  onUpdate: (callback: (update: TeamSyncUpdate) => void): IpcListenerCleanup =>
    createIpcListener<[TeamSyncUpdate]>(IPC_CHANNELS.TEAM_SYNC_UPDATE, callback)
});
