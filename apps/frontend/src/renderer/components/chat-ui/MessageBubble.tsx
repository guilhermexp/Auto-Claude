import { useTranslation } from 'react-i18next';
import { User, Bot } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
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

  if (isUser) {
    // User message - right aligned with bubble style
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%]">
          <div className="bg-primary/10 rounded-2xl rounded-tr-sm px-4 py-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block text-right">
            {t('chat.you', 'You')}
          </span>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Assistant message - left aligned with avatar
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-2">
        <span className="text-[10px] text-muted-foreground block">
          {t('chat.assistant', 'Assistant')}
        </span>
        <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Tool usage history */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <ToolUsageHistory tools={message.toolsUsed} />
        )}

        {/* Task suggestion card */}
        {message.suggestedTask && (
          <SuggestedTaskCard
            task={message.suggestedTask}
            onCreateTask={onCreateTask}
            isCreatingTask={isCreatingTask}
            taskCreated={taskCreated}
          />
        )}
      </div>
    </div>
  );
}
