import { EventEmitter } from 'events';
import type {
  InsightsSession,
  InsightsSessionSummary,
  InsightsChatMessage,
  InsightsModelConfig,
  InsightsActionProposal,
  InsightsActionResult
} from '../shared/types';
import { InsightsConfig } from './insights/config';
import { InsightsPaths } from './insights/paths';
import { SessionStorage } from './insights/session-storage';
import { SessionManager } from './insights/session-manager';
import { InsightsExecutor } from './insights/insights-executor';

/**
 * Service for AI-powered codebase insights chat
 *
 * This service coordinates between multiple specialized modules:
 * - InsightsConfig: Manages configuration and environment
 * - InsightsPaths: Provides consistent path resolution
 * - SessionStorage: Handles filesystem persistence
 * - SessionManager: Manages session lifecycle and cache
 * - InsightsExecutor: Executes Python insights runner
 */
export class InsightsService extends EventEmitter {
  private config: InsightsConfig;
  private paths: InsightsPaths;
  private storage: SessionStorage;
  private sessionManager: SessionManager;
  private executor: InsightsExecutor;

  constructor() {
    super();

    // Initialize modules
    this.config = new InsightsConfig();
    this.paths = new InsightsPaths();
    this.storage = new SessionStorage(this.paths);
    this.sessionManager = new SessionManager(this.storage, this.paths);
    this.executor = new InsightsExecutor(this.config);

    // Forward executor events
    this.executor.on('status', (projectId, status) => {
      this.emit('status', projectId, status);
    });
    this.executor.on('stream-chunk', (projectId, chunk) => {
      this.emit('stream-chunk', projectId, chunk);
    });
    this.executor.on('error', (projectId, error) => {
      this.emit('error', projectId, error);
    });
    this.executor.on('sdk-rate-limit', (info) => {
      this.emit('sdk-rate-limit', info);
    });
  }

  /**
   * Configure paths for Python and auto-claude source
   */
  configure(pythonPath?: string, autoBuildSourcePath?: string): void {
    this.config.configure(pythonPath, autoBuildSourcePath);
  }

  /**
   * Load current session from disk or cache
   */
  loadSession(projectId: string, projectPath: string): InsightsSession | null {
    return this.sessionManager.loadSession(projectId, projectPath);
  }

  /**
   * List all sessions for a project
   */
  listSessions(projectPath: string): InsightsSessionSummary[] {
    return this.sessionManager.listSessions(projectPath);
  }

  /**
   * Create a new session
   */
  createNewSession(projectId: string, projectPath: string): InsightsSession {
    return this.sessionManager.createNewSession(projectId, projectPath);
  }

  /**
   * Switch to a different session
   */
  switchSession(projectId: string, projectPath: string, sessionId: string): InsightsSession | null {
    return this.sessionManager.switchSession(projectId, projectPath, sessionId);
  }

  /**
   * Delete a session
   */
  deleteSession(projectId: string, projectPath: string, sessionId: string): boolean {
    return this.sessionManager.deleteSession(projectId, projectPath, sessionId);
  }

  /**
   * Rename a session
   */
  renameSession(projectPath: string, sessionId: string, newTitle: string): boolean {
    return this.sessionManager.renameSession(projectPath, sessionId, newTitle);
  }

  /**
   * Clear current session (delete messages but keep the session)
   */
  clearSession(projectId: string, projectPath: string): void {
    this.sessionManager.clearSession(projectId, projectPath);
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    projectId: string,
    projectPath: string,
    message: string,
    modelConfig?: InsightsModelConfig
  ): Promise<void> {
    // Cancel any existing session
    this.executor.cancelSession(projectId);

    // Validate auto-claude source
    const autoBuildSource = this.config.getAutoBuildSourcePath();
    if (!autoBuildSource) {
      this.emit('error', projectId, 'Auto Claude source not found');
      return;
    }

    // Load or create session
    let session = this.sessionManager.loadSession(projectId, projectPath);
    if (!session) {
      session = this.sessionManager.createNewSession(projectId, projectPath);
    }

    // Auto-generate title from first user message if still default
    if (session.messages.length === 0 && session.title === 'New Conversation') {
      session.title = this.storage.generateTitle(message);
    }

    // Add user message
    const userMessage: InsightsChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);
    session.pendingAction = null;
    session.updatedAt = new Date();
    this.sessionManager.saveSession(projectPath, session);

    // Build conversation history for context
    const conversationHistory = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Use provided modelConfig or fall back to session's config
    const configToUse = modelConfig || session.modelConfig;

    try {
      // Execute insights query
      const result = await this.executor.execute(
        projectId,
        projectPath,
        message,
        conversationHistory,
        configToUse
      );

      // Add assistant message to session
      const assistantMessage: InsightsChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.fullResponse,
        timestamp: new Date(),
        suggestedTasks: result.suggestedTasks,
        toolsUsed: result.toolsUsed.length > 0 ? result.toolsUsed : undefined
      };

      session.messages.push(assistantMessage);
      session.pendingAction = result.pendingAction ?? null;
      session.updatedAt = new Date();
      this.sessionManager.saveSession(projectPath, session);

      // Emit session-updated event for real-time UI updates
      this.emit('session-updated', projectId, session);
    } catch (error) {
      // Error already emitted by executor
      console.error('[InsightsService] Error executing insights:', error);
    }
  }

  /**
   * Update model configuration for a session
   */
  updateSessionModelConfig(projectPath: string, sessionId: string, modelConfig: InsightsModelConfig): boolean {
    return this.sessionManager.updateSessionModelConfig(projectPath, sessionId, modelConfig);
  }

  appendUserMessage(
    projectId: string,
    projectPath: string,
    content: string
  ): InsightsSession | null {
    const session = this.sessionManager.loadSession(projectId, projectPath);
    if (!session) return null;
    session.messages.push({
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    });
    session.updatedAt = new Date();
    this.sessionManager.saveSession(projectPath, session);
    this.emit('session-updated', projectId, session);
    return session;
  }

  setPendingAction(
    projectId: string,
    projectPath: string,
    action: InsightsActionProposal | null
  ): InsightsSession | null {
    const session = this.sessionManager.loadSession(projectId, projectPath);
    if (!session) return null;
    session.pendingAction = action;
    session.updatedAt = new Date();
    this.sessionManager.saveSession(projectPath, session);
    console.log('[INSIGHTS_KANBAN] pending-action-updated', {
      projectId,
      sessionId: session.id,
      actionId: action?.actionId ?? null,
      intent: action?.intent ?? null,
      requiresConfirmation: action?.requiresConfirmation ?? null
    });
    this.emit('session-updated', projectId, session);
    return session;
  }

  appendActionResultMessage(
    projectId: string,
    projectPath: string,
    actionResult: InsightsActionResult
  ): InsightsSession | null {
    const session = this.sessionManager.loadSession(projectId, projectPath);
    if (!session) return null;

    session.pendingAction = null;
    session.messages.push({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: actionResult.summary,
      timestamp: new Date()
    });
    session.updatedAt = new Date();
    this.sessionManager.saveSession(projectPath, session);
    console.log('[INSIGHTS_KANBAN] action-result-appended', {
      projectId,
      sessionId: session.id,
      actionId: actionResult.actionId,
      intent: actionResult.intent,
      success: actionResult.success,
      cancelled: Boolean(actionResult.cancelled),
      executedCount: actionResult.executedSpecIds.length,
      failedCount: actionResult.failed.length
    });
    this.emit('session-updated', projectId, session);
    return session;
  }
}

// Singleton instance
export const insightsService = new InsightsService();
