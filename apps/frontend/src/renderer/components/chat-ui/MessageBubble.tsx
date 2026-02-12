import { useTranslation } from 'react-i18next';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { InsightsChatMessage } from '../../../shared/types';
import { ToolUsageHistory } from './ToolIndicator';
import { SuggestedTaskCard } from './SuggestedTaskCard';

interface MessageBubbleProps {
  message: InsightsChatMessage;
  markdownComponents: Components;
  onCreateTask: () => void;
  isCreatingTask: boolean;
  taskCreated: boolean;
}

export function MessageBubble({
  message,
  markdownComponents,
  onCreateTask,
  isCreatingTask,
  taskCreated
}: MessageBubbleProps) {
  const { t } = useTranslation('insights');
  const isUser = message.role === 'user';
  const formattedDate = new Date(message.timestamp).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[76%] space-y-2">
          <div className="insights-user-message-bubble rounded-2xl px-5 py-4 text-foreground">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
          <div className="insights-user-meta">
            {formattedDate}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="insights-assistant-label">
        {t('chat.assistant', 'Assistant')}
      </span>
      <div className="insights-assistant-content prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {message.content}
        </ReactMarkdown>
      </div>

      {message.toolsUsed && message.toolsUsed.length > 0 && (
        <div className="insights-inline-activity">
          <ToolUsageHistory tools={message.toolsUsed} />
        </div>
      )}

      {message.suggestedTask && (
        <SuggestedTaskCard
          task={message.suggestedTask}
          onCreateTask={onCreateTask}
          isCreatingTask={isCreatingTask}
          taskCreated={taskCreated}
        />
      )}
    </div>
  );
}
