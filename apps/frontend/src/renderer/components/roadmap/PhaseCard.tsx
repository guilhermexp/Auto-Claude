import { useTranslation } from 'react-i18next';
import { Archive, CheckCircle2, Circle, ExternalLink, Play, TrendingUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { TaskOutcomeBadge } from './TaskOutcomeBadge';
import { ROADMAP_PRIORITY_COLORS } from '../../../shared/constants';
import type { PhaseCardProps } from './types';

const INITIAL_VISIBLE_COUNT = 5;

export function PhaseCard({
  phase,
  features,
  isFirst: _isFirst,
  onFeatureSelect,
  onConvertToSpec,
  onGoToTask,
  onArchive,
}: PhaseCardProps) {
  const { t } = useTranslation('roadmap');
  const completedCount = features.filter((f) => f.status === 'done').length;
  const progress = features.length > 0 ? (completedCount / features.length) * 100 : 0;
  const phaseStatusLabel = t(`phaseStatuses.${phase.status}`, { defaultValue: phase.status });

  return (
    <Card className="p-4 roadmap-phase-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              phase.status === 'completed'
                ? 'roadmap-kanban-column-icon-done'
                : phase.status === 'in_progress'
                ? 'roadmap-kanban-column-icon-progress'
                : 'roadmap-kanban-column-icon-review'
            }`}
          >
            {phase.status === 'completed' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <span className="text-sm font-semibold">{phase.order}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{phase.name}</h3>
            <p className="text-sm text-muted-foreground">{phase.description}</p>
          </div>
        </div>
        <Badge variant={phase.status === 'completed' ? 'default' : 'outline'}>
          {phaseStatusLabel}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">{t('phaseCard.progress')}</span>
          <span>
            {t('phaseCard.featuresCount', { completed: completedCount, total: features.length })}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Milestones */}
      {phase.milestones.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">{t('phaseCard.milestones')}</h4>
          <div className="space-y-2">
            {phase.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-2 text-sm">
                {milestone.status === 'achieved' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={
                    milestone.status === 'achieved' ? 'line-through text-muted-foreground' : ''
                  }
                >
                  {milestone.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('phaseCard.featuresSection', { count: features.length })}</h4>
        <div className="grid gap-2">
          {features.slice(0, INITIAL_VISIBLE_COUNT).map((feature) => {
            const isDone = feature.status === 'done';
            const archiveButton = isDone && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                title={t('roadmap.archiveFeature')}
                aria-label={t('accessibility.archiveFeatureAriaLabel')}
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(feature.id);
                }}
              >
                <Archive className="h-3 w-3" />
              </Button>
            );
            return (
            <div
              key={feature.id}
              className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors roadmap-kanban-card"
              onClick={() => onFeatureSelect(feature)}
            >
              <button
                type="button"
                className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => onFeatureSelect(feature)}
              >
                <Badge
                  variant="outline"
                  className={`text-xs ${ROADMAP_PRIORITY_COLORS[feature.priority]}`}
                >
                  {t(`priorities.${feature.priority}`, { defaultValue: feature.priority })}
                </Badge>
                <span className="text-sm truncate">{feature.title}</span>
                {feature.competitorInsightIds && feature.competitorInsightIds.length > 0 && (
                  <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {feature.taskOutcome ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <TaskOutcomeBadge outcome={feature.taskOutcome} size="lg" showLabel={false} />
                  {archiveButton}
                </span>
              ) : isDone ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {archiveButton}
                </span>
              ) : feature.linkedSpecId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToTask(feature.linkedSpecId!);
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('phaseCard.viewTask')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConvertToSpec(feature);
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {t('phaseCard.buildButton')}
                </Button>
              )}
            </div>
            );
          })}
          {features.length > 5 && (
            <div className="text-sm text-muted-foreground text-center py-1">
              {t('phaseCard.moreFeatures', { count: features.length - 5 })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
