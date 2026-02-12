import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ value, onChange, onSend, disabled, isLoading }, ref) => {
    const { t } = useTranslation('insights');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="insights-input-container px-6 pb-4 pt-2">
        <div className="insights-chat-column">
          <div className="relative overflow-hidden insights-input-field px-4 py-3">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.replyPlaceholder', 'Responder...')}
            className="min-h-[56px] max-h-[220px] resize-none border-0 bg-transparent px-0 py-0 pr-14 text-[15px] focus-visible:ring-0"
            disabled={disabled || isLoading}
          />
          <Button type="button" variant="ghost" size="icon" className="absolute bottom-2 left-2 h-8 w-8 rounded-md">
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled || isLoading}
            size="icon"
            className="insights-send-button absolute bottom-2 right-2 h-9 w-9 rounded-xl shadow-none"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground text-center">
          {t('chat.inputHint', 'Press Enter to send, Shift+Enter for new line')}
        </p>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';
