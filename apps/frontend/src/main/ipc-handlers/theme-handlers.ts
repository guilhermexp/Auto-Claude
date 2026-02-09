import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult, ExternalThemeData, ExternalThemeInfo } from '../../shared/types';
import { loadExternalTheme, scanExternalThemes } from '../themes/vscode-theme-loader';

/**
 * Register IPC handlers for external/imported themes (VS Code/Cursor/Windsurf).
 */
export function registerThemeHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.THEMES_SCAN_EXTERNAL,
    async (): Promise<IPCResult<ExternalThemeInfo[]>> => {
      try {
        const themes = scanExternalThemes();
        return { success: true, data: themes };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to scan external themes'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.THEMES_LOAD_EXTERNAL,
    async (_, theme: ExternalThemeInfo): Promise<IPCResult<ExternalThemeData>> => {
      try {
        const loaded = loadExternalTheme(theme);
        return { success: true, data: loaded };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load external theme'
        };
      }
    }
  );
}

