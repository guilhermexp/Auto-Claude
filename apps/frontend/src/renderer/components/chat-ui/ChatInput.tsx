import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';
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
      <div className="p-4 insights-input-container">
        <div className="relative overflow-hidden insights-input-field">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder', 'Ask about your codebase...')}
            className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[60px] max-h-[200px] pr-14 py-3 text-[13px]"
            disabled={disabled || isLoading}
          />
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled || isLoading}
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-full shadow-sm insights-send-button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground text-center">
          {t('chat.inputHint', 'Press Enter to send, Shift+Enter for new line')}
        </p>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';
