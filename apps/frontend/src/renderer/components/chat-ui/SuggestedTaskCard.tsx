import { useTranslation } from 'react-i18next';
import { Sparkles, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
  TASK_COMPLEXITY_LABELS,
  TASK_COMPLEXITY_COLORS
} from '../../../shared/constants';

interface SuggestedTask {
  title: string;
  description: string;
  metadata?: {
    category?: string;
    complexity?: string;
  };
}

interface SuggestedTaskCardProps {
  task: SuggestedTask;
  onCreateTask: () => void;
  isCreatingTask: boolean;
  taskCreated: boolean;
}

export function SuggestedTaskCard({
  task,
  onCreateTask,
  isCreatingTask,
  taskCreated
}: SuggestedTaskCardProps) {
  const { t } = useTranslation('insights');

  return (
    <div className="mt-3 bg-background rounded-lg border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {t('suggestedTask.title', 'Suggested Task')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h4 className="font-medium text-foreground leading-tight">
          {task.title}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {task.description}
        </p>

        {/* Metadata badges */}
        {task.metadata && (task.metadata.category || task.metadata.complexity) && (
          <div className="flex flex-wrap gap-2">
            {task.metadata.category && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  TASK_CATEGORY_COLORS[task.metadata.category]
                )}
              >
                {TASK_CATEGORY_LABELS[task.metadata.category] || task.metadata.category}
              </Badge>
            )}
            {task.metadata.complexity && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  TASK_COMPLEXITY_COLORS[task.metadata.complexity]
                )}
              >
                {TASK_COMPLEXITY_LABELS[task.metadata.complexity] || task.metadata.complexity}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Footer with action */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
        <Button
          size="sm"
          className="h-8"
          onClick={onCreateTask}
          disabled={isCreatingTask || taskCreated}
        >
          {isCreatingTask ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {t('suggestedTask.creating', 'Creating...')}
            </>
          ) : taskCreated ? (
            <>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              {t('suggestedTask.created', 'Task Created')}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-3.5 w-3.5" />
              {t('suggestedTask.createTask', 'Create Task')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
