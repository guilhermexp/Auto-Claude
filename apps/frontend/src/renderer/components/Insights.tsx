import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Loader2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import {
  useInsightsStore,
  loadInsightsSession,
  sendMessage,
  newSession,
  switchSession,
  deleteSession,
  renameSession,
  updateModelConfig,
  createTaskFromSuggestion,
  setupInsightsListeners
} from '../stores/insights-store';
import { loadTasks } from '../stores/task-store';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import type { InsightsChatMessage, InsightsModelConfig } from '../../shared/types';
import {
  MessageBubble,
  ToolIndicator,
  ChatInput,
  EmptyState
} from './chat-ui';

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
  const { t } = useTranslation(['insights', 'common']);
  const session = useInsightsStore((state) => state.session);
  const sessions = useInsightsStore((state) => state.sessions);
  const status = useInsightsStore((state) => state.status);
  const streamingContent = useInsightsStore((state) => state.streamingContent);
  const currentTool = useInsightsStore((state) => state.currentTool);
  const isLoadingSessions = useInsightsStore((state) => state.isLoadingSessions);

  // Create markdown components with translated accessibility text
  const markdownComponents = useMemo(() => ({
    a: createSafeLink(t('common:accessibility.opensInNewWindow')),
  }), [t]);

  const [inputValue, setInputValue] = useState('');
  const [creatingTask, setCreatingTask] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session and set up listeners on mount
  useEffect(() => {
    loadInsightsSession(projectId);
    const cleanup = setupInsightsListeners();
    return cleanup;
  }, [projectId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingContent]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset taskCreated when switching sessions
  useEffect(() => {
    setTaskCreated(new Set());
  }, [session?.id]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message || status.phase === 'thinking' || status.phase === 'streaming') return;

    setInputValue('');
    sendMessage(projectId, message);
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
    return await deleteSession(projectId, sessionId);
  };

  const handleRenameSession = async (sessionId: string, newTitle: string): Promise<boolean> => {
    return await renameSession(projectId, sessionId, newTitle);
  };

  const handleCreateTask = async (message: InsightsChatMessage) => {
    if (!message.suggestedTask) return;

    setCreatingTask(message.id);
    try {
      const task = await createTaskFromSuggestion(
        projectId,
        message.suggestedTask.title,
        message.suggestedTask.description,
        message.suggestedTask.metadata
      );

      if (task) {
        setTaskCreated(prev => new Set(prev).add(message.id));
        // Reload tasks to show the new task in the kanban
        loadTasks(projectId);
      }
    } finally {
      setCreatingTask(null);
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

  const isLoading = status.phase === 'thinking' || status.phase === 'streaming';
  const messages = session?.messages || [];

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel: Chat History Sidebar - 1Code style */}
      <nav className="w-80 shrink-0 px-3 py-4 flex flex-col">
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

      {/* Right Panel: Chat Area - 1Code style with rounded card */}
      <div className="flex-1 min-w-0 h-full overflow-hidden py-4 pr-4">
        <div className="flex flex-col h-full bg-card rounded-xl overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {messages.length === 0 && !streamingContent ? (
                <EmptyState onSuggestionClick={handleSuggestionClick} />
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      markdownComponents={markdownComponents}
                      onCreateTask={() => handleCreateTask(message)}
                      isCreatingTask={creatingTask === message.id}
                      taskCreated={taskCreated.has(message.id)}
                    />
                  ))}

                  {/* Streaming message */}
                  {(streamingContent || currentTool) && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="max-w-[85%] space-y-2">
                        <span className="text-[10px] text-muted-foreground block">
                          {t('insights:chat.assistant', 'Assistant')}
                        </span>
                        {streamingContent && (
                          <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {streamingContent}
                              </ReactMarkdown>
                            </div>
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

          {/* Chat Input - 1Code style */}
          <ChatInput
            ref={textareaRef}
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
