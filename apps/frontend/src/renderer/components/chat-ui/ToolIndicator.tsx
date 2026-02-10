import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderSearch, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

// Tool indicator component for showing what the AI is currently doing
interface ToolIndicatorProps {
  name: string;
  input?: string;
}

export function ToolIndicator({ name, input }: ToolIndicatorProps) {
  const { t } = useTranslation('insights');

  const getToolInfo = (toolName: string) => {
    switch (toolName) {
      case 'Read':
        return {
          icon: FileText,
          label: t('tools.readingFile', 'Reading file'),
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10 border-blue-500/20'
        };
      case 'Glob':
        return {
          icon: FolderSearch,
          label: t('tools.searchingFiles', 'Searching files'),
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10 border-amber-500/20'
        };
      case 'Grep':
        return {
          icon: Search,
          label: t('tools.searchingCode', 'Searching code'),
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 border-green-500/20'
        };
      default:
        return {
          icon: Loader2,
          label: toolName,
          color: 'text-primary',
          bgColor: 'bg-primary/10 border-primary/20'
        };
    }
  };

  const { icon: Icon, label, color, bgColor } = getToolInfo(name);
  const isDefaultLoader = name !== 'Read' && name !== 'Glob' && name !== 'Grep';

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
      bgColor
    )}>
      <Icon className={cn('h-4 w-4', color, isDefaultLoader && 'animate-spin')} />
      <span className={cn('font-medium', color)}>{label}</span>
      {input && (
        <span className="text-muted-foreground truncate max-w-[250px] text-xs">
          {input}
        </span>
      )}
    </div>
  );
}

// Tool usage history component for showing tools used in completed messages
interface ToolUsageHistoryProps {
  tools: Array<{
    name: string;
    input?: string;
    timestamp: Date;
  }>;
}

export function ToolUsageHistory({ tools }: ToolUsageHistoryProps) {
  const { t } = useTranslation('insights');
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) return null;

  // Group tools by name for summary
  const toolCounts = tools.reduce((acc, tool) => {
    acc[tool.name] = (acc[tool.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'Read':
        return FileText;
      case 'Glob':
        return FolderSearch;
      case 'Grep':
        return Search;
      default:
        return FileText;
    }
  };

  const getToolColor = (toolName: string) => {
    switch (toolName) {
      case 'Read':
        return 'text-blue-500';
      case 'Glob':
        return 'text-amber-500';
      case 'Grep':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const toolsUsedText = tools.length === 1
    ? t('tools.toolsUsed', { count: tools.length, defaultValue: '{{count}} tool used' })
    : t('tools.toolsUsed_plural', { count: tools.length, defaultValue: '{{count}} tools used' });

  return (
    <div className="overflow-hidden insights-tool-card">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="flex h-auto w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {Object.entries(toolCounts).map(([name, count]) => {
            const Icon = getToolIcon(name);
            return (
              <span key={name} className={cn('flex items-center gap-0.5', getToolColor(name))}>
                <Icon className="h-3 w-3" />
                <span className="font-medium">{count}</span>
              </span>
            );
          })}
        </span>
        <span className="flex-1 text-left">{toolsUsedText}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      {expanded && (
        <div className="p-2 space-y-1 insights-tool-card-content">
          {tools.map((tool, index) => {
            const Icon = getToolIcon(tool.name);
            return (
              <div
                key={`${tool.name}-${index}`}
                className="flex items-center gap-2 text-xs px-1 py-0.5"
              >
                <Icon className={cn('h-3 w-3 shrink-0', getToolColor(tool.name))} />
                <span className="font-medium text-foreground">{tool.name}</span>
                {tool.input && (
                  <span className="text-muted-foreground truncate max-w-[250px]">
                    {tool.input}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
