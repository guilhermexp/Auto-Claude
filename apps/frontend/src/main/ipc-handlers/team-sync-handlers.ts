import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';
import type { TeamSyncMember, TeamSyncStatus, TeamSyncTeam } from '../../shared/types/team-sync';
import { getTeamSyncService } from '../team-sync/team-sync-service';

function requireService() {
  const svc = getTeamSyncService();
  if (!svc) throw new Error('Team Sync service not initialized');
  return svc;
}

export function registerTeamSyncHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Wire event forwarding once the service exists (may be initialized later)
  let eventsWired = false;
  const tryWireEvents = () => {
    if (eventsWired) return;
    const teamSync = getTeamSyncService();
    if (!teamSync) return;
    eventsWired = true;
    teamSync.on('update', (update) => {
      const window = getMainWindow();
      if (!window || window.isDestroyed()) return;
      window.webContents.send(IPC_CHANNELS.TEAM_SYNC_UPDATE, update);
    });
  };
  tryWireEvents();

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_INITIALIZE, async (): Promise<IPCResult<TeamSyncStatus>> => {
    try {
      const teamSync = requireService();
      await teamSync.initialize();
      tryWireEvents();
      return { success: true, data: teamSync.getSyncStatus() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_SIGNUP, async (_, email: string, name: string, password: string): Promise<IPCResult> => {
    try {
      const teamSync = requireService();
      const result = await teamSync.signup(email, name, password);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to sign up' };
      }
      tryWireEvents();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign up' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_SIGNIN, async (_, email: string, password: string): Promise<IPCResult> => {
    try {
      const teamSync = requireService();
      const result = await teamSync.signin(email, password);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to sign in' };
      }
      tryWireEvents();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_SIGNOUT, async (): Promise<IPCResult> => {
    try {
      await requireService().signout();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign out' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_STATUS, async (): Promise<IPCResult<TeamSyncStatus>> => {
    try {
      const teamSync = getTeamSyncService();
      if (!teamSync) {
        return {
          success: true,
          data: {
            connected: false,
            authenticated: false,
            activeTeam: undefined,
            syncedProjects: [],
            pendingChanges: 0,
            mode: 'disabled',
          },
        };
      }
      return { success: true, data: teamSync.getSyncStatus() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to load status' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_CREATE_TEAM, async (_, name: string): Promise<IPCResult<TeamSyncTeam>> => {
    try {
      const result = await requireService().createTeam(name);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to create team' };
      }
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create team' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_JOIN_TEAM, async (_, inviteCode: string): Promise<IPCResult> => {
    try {
      const result = await requireService().joinTeam(inviteCode);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to join team' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to join team' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_GET_TEAMS, async (): Promise<IPCResult<TeamSyncTeam[]>> => {
    try {
      return { success: true, data: await requireService().getMyTeams() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to load teams' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_GET_MEMBERS, async (_, teamId: string): Promise<IPCResult<TeamSyncMember[]>> => {
    try {
      return { success: true, data: await requireService().getTeamMembers(teamId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to load team members' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_REMOVE_MEMBER, async (_, teamId: string, memberId: string): Promise<IPCResult> => {
    try {
      const result = await requireService().removeMember(teamId, memberId);
      return result.success ? { success: true } : { success: false, error: 'Failed to remove member' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove member' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_GENERATE_INVITE, async (_, teamId: string): Promise<IPCResult<string>> => {
    try {
      return { success: true, data: await requireService().generateInviteCode(teamId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate invite code' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_ENABLE, async (_, projectId: string, projectPath: string): Promise<IPCResult> => {
    try {
      await requireService().enableSync(projectId, projectPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to enable sync' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_DISABLE, async (_, projectId: string): Promise<IPCResult> => {
    try {
      await requireService().disableSync(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to disable sync' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_FORCE_PUSH, async (_, projectId: string): Promise<IPCResult> => {
    try {
      await requireService().forcePush(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to force push' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEAM_SYNC_FORCE_PULL, async (_, projectId: string): Promise<IPCResult> => {
    try {
      await requireService().forcePull(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to force pull' };
    }
  });
}
