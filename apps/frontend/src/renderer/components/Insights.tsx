import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Loader2,
  AlertCircle,
  Languages,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Plus,
  Send,
  Layers,
  Lightbulb,
  Code,
  Shield
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ui/scroll-area';
import {
  useInsightsStore,
  loadInsightsSession,
  sendMessage,
  newSession,
  switchSession,
  deleteSession,
  deleteSessions,
  renameSession,
  archiveSession,
  archiveSessions,
  unarchiveSession,
  updateModelConfig,
  createTaskFromSuggestion,
  confirmInsightsAction,
  cancelInsightsAction,
  setupInsightsListeners
} from '../stores/insights-store';
import { useImageUpload } from './task-form/useImageUpload';
import { createThumbnail, generateImageId } from './ImageUpload';
import { loadTasks } from '../stores/task-store';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import type { InsightsChatMessage, InsightsModelConfig, TaskMetadata } from '../../shared/types';
import {
  MessageBubble,
  ToolIndicator,
  ChatInput
} from './chat-ui';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';
import { useTextTranslation } from '../hooks/useTextTranslation';
import { toast } from '../hooks/use-toast';
import { useProjectStore } from '../stores/project-store';
import { Textarea } from './ui/textarea';

// createSafeLink - factory function that creates a SafeLink component with i18n support
const createSafeLink = (opensInNewWindowText: string) => {
  return function SafeLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    // Validate URL - only allow http, https, and relative links
    const isValidUrl = href && (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('/') ||
      href.startsWith('#')
    );

    if (!isValidUrl) {
      // For invalid or potentially malicious URLs, render as plain text
      return <span className="text-muted-foreground">{children}</span>;
    }

    // External links get security attributes and accessibility indicator
    const isExternal = href?.startsWith('http://') || href?.startsWith('https://');

    return (
      <a
        href={href}
        {...props}
        {...(isExternal && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
        className="text-primary hover:underline"
      >
        {children}
        {isExternal && <span className="sr-only"> {opensInNewWindowText}</span>}
      </a>
    );
  };
};

interface InsightsProps {
  projectId: string;
}

export function Insights({ projectId }: InsightsProps) {
  const { t, i18n } = useTranslation(['insights', 'common']);
  const session = useInsightsStore((state) => state.session);
  const sessions = useInsightsStore((state) => state.sessions);
  const status = useInsightsStore((state) => state.status);
  const streamingContent = useInsightsStore((state) => state.streamingContent);
  const currentTool = useInsightsStore((state) => state.currentTool);
  const isLoadingSessions = useInsightsStore((state) => state.isLoadingSessions);
  const pendingAction = useInsightsStore((state) => state.session?.pendingAction ?? null);
  const isPortugueseUi = i18n.resolvedLanguage === 'pt';
  const {
    isEnabled: isTranslationEnabled,
    isTranslating,
    lastError,
    toggleEnabled: toggleTranslation,
    clearError: clearTranslationError,
    getText: getTranslatedText,
    ensureTranslations,
  } = useTextTranslation('pt');

  // Create markdown components with translated accessibility text
  const markdownComponents = useMemo(() => ({
    a: createSafeLink(t('common:accessibility.opensInNewWindow')),
  }), [t]);

  const [inputValue, setInputValue] = useState('');
  const [creatingTask, setCreatingTask] = useState<Set<string>>(new Set());
  const [taskCreated, setTaskCreated] = useState<Set<string>>(new Set());
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId)
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isLoading = status.phase === 'thinking' || status.phase === 'streaming';

  // Image upload hook
  const {
    isDragOver,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeImage,
    canAddMore
  } = useImageUpload({
    images: pendingImages,
    onImagesChange: setPendingImages,
    disabled: isLoading,
    onError: setImageError,
    errorMessages: {
      maxImagesReached: t('insights.images.maxImagesReached'),
      invalidImageType: t('insights.images.invalidType'),
      processPasteFailed: t('insights.images.processFailed'),
      processDropFailed: t('insights.images.processFailed')
    }
  });

  // Scroll threshold in pixels - user is considered "at bottom" if within this distance
  const SCROLL_BOTTOM_THRESHOLD = 100;

  // Check if user is near the bottom of scroll area
  const checkIfAtBottom = useCallback((viewport: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    return scrollHeight - scrollTop - clientHeight <= SCROLL_BOTTOM_THRESHOLD;
  }, []);

  // Handle scroll events to track user position
  const handleScroll = useCallback(() => {
    if (viewportEl) {
      setIsUserAtBottom(checkIfAtBottom(viewportEl));
    }
  }, [viewportEl, checkIfAtBottom]);

  // Set up scroll listener and check initial position when viewport becomes available
  useEffect(() => {
    if (viewportEl) {
      // Check initial scroll position
      setIsUserAtBottom(checkIfAtBottom(viewportEl));
      viewportEl.addEventListener('scroll', handleScroll, { passive: true });
      return () => viewportEl.removeEventListener('scroll', handleScroll);
    }
  }, [viewportEl, handleScroll, checkIfAtBottom]);

  // Load session and set up listeners on mount
  useEffect(() => {
    loadInsightsSession(projectId, showArchived);
    const cleanup = setupInsightsListeners();
    return cleanup;
  // biome-ignore lint/correctness/useExhaustiveDependencies: showArchived is handled by the dedicated effect below; including it here would cause duplicate loads
  }, [projectId]);

  // Reload sessions when showArchived changes (skip first run to avoid duplicate load with mount effect)
  const isFirstRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: projectId changes are handled by the mount effect above; this effect only reacts to showArchived toggles
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    loadInsightsSessions(projectId, showArchived);
  }, [showArchived]);

  // Smart auto-scroll: only scroll if user is already at bottom
  // This allows users to scroll up to read previous messages without being
  // yanked back down during streaming responses
  useEffect(() => {
    if (isUserAtBottom && viewportEl) {
      viewportEl.scrollTop = viewportEl.scrollHeight;
    }
  }, [session?.messages?.length, streamingContent, currentTool, isUserAtBottom, viewportEl]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset task creation state when switching sessions
  // biome-ignore lint/correctness/useExhaustiveDependencies: session?.id is intentionally used as a trigger
  useEffect(() => {
    setTaskCreated(new Set());
  }, [session?.id]);

  const handleSend = () => {
    const message = inputValue.trim();
    const hasImages = pendingImages.length > 0;
    if ((!message && !hasImages) || isLoading) return;

    setInputValue('');
    sendMessage(projectId, message, session?.modelConfig, hasImages ? pendingImages : undefined);
    setPendingImages([]);
    setImageError(null);
    setIsUserAtBottom(true); // Resume auto-scroll when user sends a message
  };

  const handleNewSession = async () => {
    await newSession(projectId);
    setTaskCreated(new Set());
    textareaRef.current?.focus();
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId !== session?.id) {
      await switchSession(projectId, sessionId);
    }
  };

  const handleDeleteSession = async (sessionId: string): Promise<boolean> => {
    return await deleteSession(projectId, sessionId, showArchived);
  };

  const handleRenameSession = async (sessionId: string, newTitle: string): Promise<boolean> => {
    return await renameSession(projectId, sessionId, newTitle);
  };

  const handleArchiveSession = async (sessionId: string) => {
    try {
      await archiveSession(projectId, sessionId);
      await loadInsightsSessions(projectId, showArchived);
      // Reload current session in case backend switched to a different one
      await loadInsightsSession(projectId, showArchived);
    } catch (error) {
      console.error(`Failed to archive session ${sessionId}:`, error);
    }
  };

  const handleUnarchiveSession = async (sessionId: string) => {
    try {
      await unarchiveSession(projectId, sessionId);
      await loadInsightsSessions(projectId, showArchived);
      // Reload current session in case backend switched to a different one
      await loadInsightsSession(projectId, showArchived);
    } catch (error) {
      console.error(`Failed to unarchive session ${sessionId}:`, error);
    }
  };

  const handleDeleteSessions = async (sessionIds: string[]) => {
    try {
      const result = await deleteSessions(projectId, sessionIds);
      await loadInsightsSessions(projectId, showArchived);
      // Reload current session in case backend switched to a different one
      await loadInsightsSession(projectId, showArchived);

      // Log partial failures for debugging
      if (result.failedIds && result.failedIds.length > 0) {
        console.warn(`Failed to delete ${result.failedIds.length} session(s):`, result.failedIds);
      }
    } catch (error) {
      console.error(`Failed to delete sessions ${sessionIds.join(', ')}:`, error);
    }
  };

  const handleArchiveSessions = async (sessionIds: string[]) => {
    try {
      const result = await archiveSessions(projectId, sessionIds);
      await loadInsightsSessions(projectId, showArchived);
      // Reload current session in case backend switched to a different one
      await loadInsightsSession(projectId, showArchived);

      // Log partial failures for debugging
      if (result.failedIds && result.failedIds.length > 0) {
        console.warn(`Failed to archive ${result.failedIds.length} session(s):`, result.failedIds);
      }
    } catch (error) {
      console.error(`Failed to archive sessions ${sessionIds.join(', ')}:`, error);
    }
  };

  const handleToggleShowArchived = () => {
    useInsightsStore.getState().setShowArchived(!showArchived);
  };

  const handleCreateTask = async (
    messageId: string,
    taskIndex: number,
    taskData: { title: string; description: string; metadata?: TaskMetadata }
  ) => {
    const taskKey = `${messageId}-${taskIndex}`;
    setCreatingTask(prev => new Set(prev).add(taskKey));
    try {
      const task = await createTaskFromSuggestion(
        projectId,
        taskData.title,
        taskData.description,
        taskData.metadata
      );

      if (task) {
        setTaskCreated(prev => new Set(prev).add(taskKey));
        // Reload tasks to show the new task in the kanban
        loadTasks(projectId);
      }
    } finally {
      setCreatingTask(prev => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
    }
  };

  const handleConfirmPendingAction = async () => {
    if (!session?.id || !pendingAction) return;
    setIsSubmittingAction(true);
    try {
      await confirmInsightsAction(projectId, session.id, pendingAction.actionId);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCancelPendingAction = async () => {
    if (!session?.id || !pendingAction) return;
    setIsSubmittingAction(true);
    try {
      await cancelInsightsAction(projectId, session.id, pendingAction.actionId);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleModelConfigChange = async (config: InsightsModelConfig) => {
    // If we have a session, persist the config
    if (session?.id) {
      await updateModelConfig(projectId, session.id, config);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const messages = session?.messages || [];
  const translationEntries = useMemo(() => {
    if (!isPortugueseUi || !isTranslationEnabled) {
      return [];
    }

    return messages.flatMap((message) => {
      if (message.role !== 'assistant') {
        return [];
      }

      const entries = [
        { key: `${message.id}:content`, text: message.content },
      ];

      message.suggestedTasks?.forEach((task, index) => {
        entries.push({
          key: `${message.id}:suggestedTaskTitle:${index}`,
          text: task.title,
        });
        entries.push({
          key: `${message.id}:suggestedTaskDescription:${index}`,
          text: task.description,
        });
      });

      return entries;
    });
  }, [isPortugueseUi, isTranslationEnabled, messages]);

  useEffect(() => {
    if (!isTranslationEnabled) {
      return;
    }

    void ensureTranslations(translationEntries);
  }, [isTranslationEnabled, ensureTranslations, translationEntries]);

  useEffect(() => {
    if (!lastError) {
      return;
    }

    toast({
      variant: 'destructive',
      title: t('insights:chat.translation.errorTitle'),
      description: t('insights:chat.translation.errorDescription'),
    });
    clearTranslationError();
  }, [lastError, clearTranslationError, t]);

  const displayedMessages = useMemo(() => {
    if (!isTranslationEnabled) {
      return messages;
    }

    return messages.map((message) => {
      if (message.role !== 'assistant') {
        return message;
      }

      return {
        ...message,
        content: getTranslatedText(`${message.id}:content`, message.content),
        suggestedTasks: message.suggestedTasks?.map((task, index) => ({
          ...task,
          title: getTranslatedText(
            `${message.id}:suggestedTaskTitle:${index}`,
            task.title
          ),
          description: getTranslatedText(
            `${message.id}:suggestedTaskDescription:${index}`,
            task.description
          ),
        })),
      };
    });
  }, [isTranslationEnabled, messages, getTranslatedText]);

  const isEmptySession = messages.length === 0 && !streamingContent;
  const greetingName = project?.name || t('insights:chat.defaultGreetingName', 'there');
  const quickActions = [
    { key: 'architecture', icon: Layers, text: t('emptyState.suggestions.architecture', 'What is the architecture of this project?') },
    { key: 'improvements', icon: Lightbulb, text: t('emptyState.suggestions.improvements', 'Suggest improvements for code quality') },
    { key: 'features', icon: Code, text: t('emptyState.suggestions.features', 'What features could I add next?') },
    { key: 'security', icon: Shield, text: t('emptyState.suggestions.security', 'Are there any security concerns?') }
  ];

  return (
    <div className="flex h-full bg-background insights-layout">
      {/* Left Panel: Chat History Sidebar - Collapsible */}
      <nav
        className={cn(
          'shrink-0 flex flex-col insights-sidebar',
          isSidebarCollapsed
            ? 'insights-sidebar-collapsed'
            : 'w-80 px-3 py-4'
        )}
      >
        <ChatHistorySidebar
          sessions={sessions}
          currentSessionId={session?.id || null}
          isLoading={isLoadingSessions}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          modelConfig={session?.modelConfig}
          onModelConfigChange={handleModelConfigChange}
          isModelSelectorDisabled={isLoading}
        />
      </nav>

      {/* Right Panel: Chat Area */}
      <div className={cn(
        'flex-1 min-w-0 h-full overflow-hidden p-0 insights-main-pane'
      )}>
        <div className="flex flex-col h-full overflow-hidden insights-main-inner">
          {/* Header with sidebar toggle and translation button */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 insights-sidebar-toggle"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isSidebarCollapsed
                  ? t('insights:sidebar.show', 'Show history')
                  : t('insights:sidebar.hide', 'Hide history')}
              </TooltipContent>
            </Tooltip>

            {isPortugueseUi && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isTranslationEnabled ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={toggleTranslation}
                  >
                    {isTranslating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isTranslating
                    ? t('insights:chat.translation.translating')
                    : isTranslationEnabled
                      ? t('insights:chat.translation.showOriginal')
                      : t('insights:chat.translation.translateToPortuguese')}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1" onViewportRef={setViewportEl}>
            <div className="p-6">
              {isEmptySession ? (
                <div className="insights-empty-shell">
                  <h1 className="insights-empty-title">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <span>
                      {t('insights:chat.greetingTitle', 'Boa madrugada')}, {greetingName}
                    </span>
                  </h1>

                  <div className="insights-empty-composer">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={t('insights:chat.placeholder', 'Ask about your codebase...')}
                      className="min-h-[52px] resize-none border-0 bg-transparent p-0 text-[16px] placeholder:text-muted-foreground/80 focus-visible:ring-0"
                      disabled={isLoading}
                    />
                    <div className="insights-empty-composer-footer">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        size="icon"
                        className="h-10 w-10 rounded-xl insights-send-button"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="insights-empty-actions">
                    {quickActions.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <Button
                          key={action.key}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="insights-empty-action-chip"
                          onClick={() => handleSuggestionClick(action.text)}
                        >
                          <ActionIcon className="h-4 w-4" />
                          {action.text}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="insights-chat-column space-y-8">
                  {displayedMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      markdownComponents={markdownComponents}
                      onCreateTask={(taskIndex) => {
                        const task = message.suggestedTasks?.[taskIndex];
                        if (!task) return;
                        void handleCreateTask(message.id, taskIndex, task);
                      }}
                      isCreatingTask={(taskIndex) =>
                        creatingTask.has(`${message.id}-${taskIndex}`)
                      }
                      taskCreated={(taskIndex) =>
                        taskCreated.has(`${message.id}-${taskIndex}`)
                      }
                    />
                  ))}

                  {pendingAction && pendingAction.requiresConfirmation && (
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="text-sm font-medium">
                        {t('insights:kanban.pendingAction.title', { intent: pendingAction.intent })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pendingAction.reason}
                      </div>
                      {pendingAction.resolvedSpecIds && pendingAction.resolvedSpecIds.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {t('insights:kanban.pendingAction.ids', { ids: pendingAction.resolvedSpecIds.join(', ') })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmPendingAction}
                          disabled={isSubmittingAction}
                        >
                          {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : t('insights:kanban.pendingAction.confirm')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelPendingAction}
                          disabled={isSubmittingAction}
                        >
                          {t('insights:kanban.pendingAction.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Streaming message */}
                  {(streamingContent || currentTool) && (
                    <div className="space-y-2">
                      <span className="insights-assistant-label">
                        {t('insights:chat.assistant', 'Assistant')}
                      </span>
                      <div className="space-y-2">
                        {streamingContent && (
                          <div className="insights-assistant-content prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {streamingContent}
                            </ReactMarkdown>
                          </div>
                        )}
                        {currentTool && (
                          <ToolIndicator name={currentTool.name} input={currentTool.input} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thinking indicator */}
                  {status.phase === 'thinking' && !streamingContent && !currentTool && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('insights:chat.thinking', 'Thinking...')}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {status.phase === 'error' && status.error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {status.error}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input - keep docked input after conversation starts */}
          {!isEmptySession && (
            <ChatInput
              ref={textareaRef}
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
