import { ipcMain, app } from "electron";
import type { BrowserWindow } from "electron";
import type { AgentManager } from "../agent";
import path from "path";
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { debugError } from "../../shared/utils/debug-logger";
import {
  IPC_CHANNELS,
  getSpecsDir,
  AUTO_BUILD_PATHS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_MODELS,
  DEFAULT_FEATURE_THINKING,
} from "../../shared/constants";
import type {
  IPCResult,
  InsightsSession,
  InsightsSessionSummary,
  InsightsModelConfig,
  InsightsActionResult,
  InsightsActionProposal,
  Task,
  TaskMetadata,
  AppSettings,
} from "../../shared/types";
import { projectStore } from "../project-store";
import { insightsService } from "../insights-service";
import { safeSendToRenderer } from "./utils";
import { TaskControlService } from "../services/task-control-service";
import { getTeamSyncService } from "../team-sync/team-sync-service";

/**
 * Read insights feature settings from the settings file
 */
function getInsightsFeatureSettings(): InsightsModelConfig {
  const settingsPath = path.join(app.getPath("userData"), "settings.json");

  try {
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");
      const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(content) };

      // Get insights-specific settings from Agent Settings
      // Use nullish coalescing at property level to handle partial settings objects
      const featureModels = settings.featureModels ?? DEFAULT_FEATURE_MODELS;
      const featureThinking = settings.featureThinking ?? DEFAULT_FEATURE_THINKING;

      return {
        profileId: "balanced", // Default profile for settings-based config
        model: featureModels.insights ?? DEFAULT_FEATURE_MODELS.insights,
        thinkingLevel: featureThinking.insights ?? DEFAULT_FEATURE_THINKING.insights,
      };
    }
  } catch (error) {
    debugError("[Insights Handler] Failed to read feature settings:", error);
  }

  // Return defaults if settings file doesn't exist or fails to parse
  return {
    profileId: "balanced", // Default profile for settings-based config
    model: DEFAULT_FEATURE_MODELS.insights,
    thinkingLevel: DEFAULT_FEATURE_THINKING.insights,
  };
}

/**
 * Register all insights-related IPC handlers
 */
export function registerInsightsHandlers(
  agentManager: AgentManager,
  getMainWindow: () => BrowserWindow | null
): void {
  const taskControlService = new TaskControlService(agentManager);
  const KANBAN_LOG_PREFIX = '[INSIGHTS_KANBAN]';

  const normalizeDecision = (text: string): "confirm" | "cancel" | null => {
    const value = text.trim().toLowerCase();
    if (!value) return null;

    const confirmSet = new Set([
      "sim",
      "s",
      "yes",
      "y",
      "ok",
      "okay",
      "confirmar",
      "confirma",
      "pode",
      "pode executar",
      "executa",
      "iniciar"
    ]);

    const cancelSet = new Set([
      "nao",
      "não",
      "n",
      "no",
      "cancelar",
      "cancela",
      "parar",
      "pare",
      "stop"
    ]);

    if (confirmSet.has(value)) return "confirm";
    if (cancelSet.has(value)) return "cancel";
    return null;
  };
  // ============================================
  // Insights Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_GET_SESSION,
    async (_, projectId: string): Promise<IPCResult<InsightsSession | null>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const session = insightsService.loadSession(projectId, project.path);
      return { success: true, data: session };
    }
  );

  ipcMain.on(
    IPC_CHANNELS.INSIGHTS_SEND_MESSAGE,
    async (_, projectId: string, message: string, modelConfig?: InsightsModelConfig) => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        safeSendToRenderer(
          getMainWindow,
          IPC_CHANNELS.INSIGHTS_ERROR,
          projectId,
          "Project not found"
        );
        return;
      }

      const session = insightsService.loadSession(projectId, project.path);
      const pendingAction = session?.pendingAction as InsightsActionProposal | null | undefined;
      const decision = pendingAction ? normalizeDecision(message) : null;

      if (pendingAction && decision) {
        console.log(`${KANBAN_LOG_PREFIX} text-decision`, {
          projectId,
          sessionId: session?.id,
          actionId: pendingAction.actionId,
          intent: pendingAction.intent,
          decision
        });
        insightsService.appendUserMessage(projectId, project.path, message);

        const result: InsightsActionResult =
          decision === "confirm"
            ? await taskControlService.executeIntent(projectId, pendingAction)
            : {
                actionId: pendingAction.actionId,
                intent: pendingAction.intent,
                success: true,
                cancelled: true,
                summary: `Action cancelled: ${pendingAction.intent}.`,
                executedSpecIds: [],
                failed: [],
                snapshot: taskControlService.getKanbanSnapshot(projectId)
              };

        insightsService.setPendingAction(projectId, project.path, null);
        // Only persist a chat message for confirmed/executed results; cancelled results
        // are conveyed via the action_result stream chunk (no English-only bubble needed).
        if (!result.cancelled) {
          insightsService.appendActionResultMessage(projectId, project.path, result);
        }
        console.log(`${KANBAN_LOG_PREFIX} text-decision-result`, {
          projectId,
          sessionId: session?.id,
          actionId: result.actionId,
          intent: result.intent,
          success: result.success,
          cancelled: Boolean(result.cancelled),
          executedCount: result.executedSpecIds.length,
          failedCount: result.failed.length
        });
        safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STREAM_CHUNK, projectId, {
          type: "action_result",
          actionResult: result
        });
        return;
      }

      // Get feature settings from Agent Settings and merge with provided config
      const featureSettings = getInsightsFeatureSettings();
      const configWithSettings: InsightsModelConfig = {
        // Start with feature settings as defaults
        ...featureSettings,
        // Override with any explicitly provided config
        ...modelConfig,
      };

      console.log("[Insights Handler] Using model config:", {
        model: configWithSettings.model,
        thinkingLevel: configWithSettings.thinkingLevel,
      });

      // Await the async sendMessage to ensure proper error handling and
      // that all async operations (like getProcessEnv) complete before
      // the handler returns. This fixes race conditions on Windows where
      // environment setup wouldn't complete before process spawn.
      try {
        await insightsService.sendMessage(projectId, project.path, message, configWithSettings);
      } catch (error) {
        // Errors during sendMessage (executor errors) are already emitted via
        // the 'error' event, but we catch here to prevent unhandled rejection
        // and ensure all error types are reported to the UI
        console.error("[Insights IPC] Error in sendMessage:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        safeSendToRenderer(
          getMainWindow,
          IPC_CHANNELS.INSIGHTS_ERROR,
          projectId,
          `Failed to send message: ${errorMessage}`
        );
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_CLEAR_SESSION,
    async (_, projectId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      insightsService.clearSession(projectId, project.path);
      return { success: true };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_CREATE_TASK,
    async (
      _,
      projectId: string,
      title: string,
      description: string,
      metadata?: TaskMetadata
    ): Promise<IPCResult<Task>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      if (!project.autoBuildPath) {
        return { success: false, error: "Auto Claude not initialized for this project" };
      }

      try {
        // Generate a unique spec ID based on existing specs
        // Get specs directory path
        const specsBaseDir = getSpecsDir(project.autoBuildPath);
        const specsDir = path.join(project.path, specsBaseDir);

        // Find next available spec number
        let specNumber = 1;
        if (existsSync(specsDir)) {
          const existingDirs = readdirSync(specsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);

          const existingNumbers = existingDirs
            .map((name) => {
              const match = name.match(/^(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => n > 0);

          if (existingNumbers.length > 0) {
            specNumber = Math.max(...existingNumbers) + 1;
          }
        }

        // Create spec ID with zero-padded number and slugified title
        const slugifiedTitle = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 50);
        const specId = `${String(specNumber).padStart(3, "0")}-${slugifiedTitle}`;

        // Create spec directory
        const specDir = path.join(specsDir, specId);
        mkdirSync(specDir, { recursive: true });

        // Build metadata with source type
        const taskMetadata: TaskMetadata = {
          sourceType: "insights",
          ...metadata,
        };

        // Create initial implementation_plan.json
        const now = new Date().toISOString();
        const implementationPlan = {
          feature: title,
          description: description,
          created_at: now,
          updated_at: now,
          status: "pending",
          phases: [],
        };

        const planPath = path.join(specDir, AUTO_BUILD_PATHS.IMPLEMENTATION_PLAN);
        writeFileSync(planPath, JSON.stringify(implementationPlan, null, 2), 'utf-8');

        // Save task metadata
        const metadataPath = path.join(specDir, "task_metadata.json");
        writeFileSync(metadataPath, JSON.stringify(taskMetadata, null, 2), 'utf-8');

        // Create the task object
        const task: Task = {
          id: specId,
          specId: specId,
          projectId,
          title,
          description,
          status: "backlog",
          subtasks: [],
          logs: [],
          metadata: taskMetadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return { success: true, data: task };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create task",
        };
      }
    }
  );

  // List all sessions for a project
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_LIST_SESSIONS,
    async (_, projectId: string): Promise<IPCResult<InsightsSessionSummary[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const sessions = insightsService.listSessions(project.path);
      return { success: true, data: sessions };
    }
  );

  // Create a new session
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_NEW_SESSION,
    async (_, projectId: string): Promise<IPCResult<InsightsSession>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const session = insightsService.createNewSession(projectId, project.path);
      return { success: true, data: session };
    }
  );

  // Switch to a different session
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_SWITCH_SESSION,
    async (_, projectId: string, sessionId: string): Promise<IPCResult<InsightsSession | null>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const session = insightsService.switchSession(projectId, project.path, sessionId);
      return { success: true, data: session };
    }
  );

  // Delete a session
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_DELETE_SESSION,
    async (_, projectId: string, sessionId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const success = insightsService.deleteSession(projectId, project.path, sessionId);
      if (success) {
        return { success: true };
      }
      return { success: false, error: "Failed to delete session" };
    }
  );

  // Rename a session
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_RENAME_SESSION,
    async (_, projectId: string, sessionId: string, newTitle: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const success = insightsService.renameSession(project.path, sessionId, newTitle);
      if (success) {
        return { success: true };
      }
      return { success: false, error: "Failed to rename session" };
    }
  );

  // Update model configuration for a session
  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_UPDATE_MODEL_CONFIG,
    async (
      _,
      projectId: string,
      sessionId: string,
      modelConfig: InsightsModelConfig
    ): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const success = insightsService.updateSessionModelConfig(
        project.path,
        sessionId,
        modelConfig
      );
      if (success) {
        return { success: true };
      }
      return { success: false, error: "Failed to update model configuration" };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_GET_KANBAN_SNAPSHOT,
    async (_, projectId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const snapshot = taskControlService.getKanbanSnapshot(projectId);
      return { success: true, data: snapshot };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_CANCEL_ACTION,
    async (
      _,
      projectId: string,
      sessionId: string,
      actionId: string
    ): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const session = insightsService.loadSession(projectId, project.path);
      if (!session || session.id !== sessionId) {
        return { success: false, error: "Insights session not found" };
      }

      const pendingAction = session.pendingAction;
      if (!pendingAction || pendingAction.actionId !== actionId) {
        return { success: false, error: "Pending action not found" };
      }

      console.log(`${KANBAN_LOG_PREFIX} cancel-request`, {
        projectId,
        sessionId,
        actionId,
        intent: pendingAction.intent,
        source: "ipc_cancel"
      });
      const snapshot = taskControlService.getKanbanSnapshot(projectId);
      const result: InsightsActionResult = {
        actionId,
        intent: pendingAction.intent,
        success: true,
        cancelled: true,
        summary: `Action cancelled: ${pendingAction.intent}.`,
        executedSpecIds: [],
        failed: [],
        snapshot
      };

      insightsService.setPendingAction(projectId, project.path, null);
      // Cancelled results are conveyed via the stream chunk; no persistent chat bubble needed.
      safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STREAM_CHUNK, projectId, {
        type: "action_result",
        actionResult: result
      });
      console.log(`${KANBAN_LOG_PREFIX} cancel-result`, {
        projectId,
        sessionId,
        actionId: result.actionId,
        intent: result.intent
      });
      return { success: true, data: result };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSIGHTS_CONFIRM_ACTION,
    async (
      _,
      projectId: string,
      sessionId: string,
      actionId: string,
      confirmed: boolean
    ): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const session = insightsService.loadSession(projectId, project.path);
      if (!session || session.id !== sessionId) {
        return { success: false, error: "Insights session not found" };
      }

      const pendingAction = session.pendingAction as InsightsActionProposal | null;
      if (!pendingAction || pendingAction.actionId !== actionId) {
        return { success: false, error: "Pending action not found" };
      }

      console.log(`${KANBAN_LOG_PREFIX} confirm-request`, {
        projectId,
        sessionId,
        actionId,
        intent: pendingAction.intent,
        confirmed
      });
      if (!confirmed) {
        const snapshot = taskControlService.getKanbanSnapshot(projectId);
        const cancelledResult: InsightsActionResult = {
          actionId,
          intent: pendingAction.intent,
          success: true,
          cancelled: true,
          summary: `Action cancelled: ${pendingAction.intent}.`,
          executedSpecIds: [],
          failed: [],
          snapshot
        };
        insightsService.setPendingAction(projectId, project.path, null);
        // Cancelled results are conveyed via the stream chunk; no persistent chat bubble needed.
        safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STREAM_CHUNK, projectId, {
          type: "action_result",
          actionResult: cancelledResult
        });
        console.log(`${KANBAN_LOG_PREFIX} confirm-result`, {
          projectId,
          sessionId,
          actionId: cancelledResult.actionId,
          intent: cancelledResult.intent,
          success: cancelledResult.success,
          cancelled: true,
          executedCount: 0,
          failedCount: 0
        });
        return { success: true, data: cancelledResult };
      }

      try {
        const result = await taskControlService.executeIntent(projectId, pendingAction);
        insightsService.setPendingAction(projectId, project.path, null);
        insightsService.appendActionResultMessage(projectId, project.path, result);
        safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STREAM_CHUNK, projectId, {
          type: "action_result",
          actionResult: result
        });
        console.log(`${KANBAN_LOG_PREFIX} confirm-result`, {
          projectId,
          sessionId,
          actionId: result.actionId,
          intent: result.intent,
          success: result.success,
          cancelled: Boolean(result.cancelled),
          executedCount: result.executedSpecIds.length,
          failedCount: result.failed.length
        });
        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        insightsService.setPendingAction(projectId, project.path, null);
        return { success: false, error: `Failed to execute action: ${errorMessage}` };
      }
    }
  );

  // ============================================
  // Insights Event Forwarding (Service -> Renderer)
  // ============================================

  // Forward streaming chunks to renderer
  insightsService.on("stream-chunk", (projectId: string, chunk: unknown) => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STREAM_CHUNK, projectId, chunk);
  });

  // Forward status updates to renderer
  insightsService.on("status", (projectId: string, status: unknown) => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_STATUS, projectId, status);
  });

  // Forward errors to renderer
  insightsService.on("error", (projectId: string, error: string) => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_ERROR, projectId, error);
  });

  // Forward SDK rate limit events to renderer
  insightsService.on("sdk-rate-limit", (rateLimitInfo: unknown) => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.CLAUDE_SDK_RATE_LIMIT, rateLimitInfo);
  });

  // Forward session-updated events to renderer for real-time UI updates
  insightsService.on("session-updated", (projectId: string, session: unknown) => {
    safeSendToRenderer(getMainWindow, IPC_CHANNELS.INSIGHTS_SESSION_UPDATED, projectId, session);

    // Push to Team Sync (strip sensitive modelConfig, limit message count)
    const teamSync = getTeamSyncService();
    if (teamSync?.isSyncEnabled(projectId) && session && typeof session === "object") {
      const s = session as Record<string, unknown>;
      const messages = Array.isArray(s.messages) ? (s.messages as unknown[]).slice(-50) : [];
      teamSync.pushInsightsSession(projectId, {
        sessionId: s.id || s.sessionId,
        title: s.title,
        messages,
        pendingAction: s.pendingAction,
      }).catch(() => {});
    }
  });
}
