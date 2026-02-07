import { useTranslation } from 'react-i18next';
import { MessageSquare, Code, Shield, Lightbulb, Layers } from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const SUGGESTION_ICONS = [
  { icon: Layers, key: 'architecture' },
  { icon: Lightbulb, key: 'improvements' },
  { icon: Code, key: 'features' },
  { icon: Shield, key: 'security' }
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const { t } = useTranslation('insights');

  const suggestions = [
    { key: 'architecture', text: t('emptyState.suggestions.architecture', 'What is the architecture of this project?') },
    { key: 'improvements', text: t('emptyState.suggestions.improvements', 'Suggest improvements for code quality') },
    { key: 'features', text: t('emptyState.suggestions.features', 'What features could I add next?') },
    { key: 'security', text: t('emptyState.suggestions.security', 'Are there any security concerns?') }
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title and description */}
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {t('emptyState.title', 'Start a Conversation')}
        </h3>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          {t('emptyState.description', 'Ask questions about your codebase, get suggestions for improvements, or discuss features you\'d like to implement.')}
        </p>

        {/* Suggestion cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((suggestion, index) => {
            const IconComponent = SUGGESTION_ICONS[index]?.icon || MessageSquare;
            return (
              <button
                key={suggestion.key}
                className="h-auto flex items-start gap-3 p-4 text-left insights-suggestion-card group"
                onClick={() => onSuggestionClick(suggestion.text)}
              >
                <IconComponent className="h-4 w-4 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs leading-tight line-clamp-2">
                  {suggestion.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
