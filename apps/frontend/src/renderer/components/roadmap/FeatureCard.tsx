import { useTranslation } from 'react-i18next';
import { ExternalLink, Play, TrendingUp } from 'lucide-react';
import { TaskOutcomeBadge, getTaskOutcomeColorClass } from './TaskOutcomeBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  ROADMAP_PRIORITY_COLORS,
  ROADMAP_PRIORITY_LABELS,
  ROADMAP_COMPLEXITY_COLORS,
  ROADMAP_IMPACT_COLORS,
} from '../../../shared/constants';
import type { FeatureCardProps } from './types';

export function FeatureCard({
  feature,
  onClick,
  onConvertToSpec,
  onGoToTask,
  hasCompetitorInsight = false,
}: FeatureCardProps) {
  const { t } = useTranslation('roadmap');
  const priorityLabel = t(`priorities.${feature.priority}`, { defaultValue: ROADMAP_PRIORITY_LABELS[feature.priority] });
  const complexityLabel = t(`complexities.${feature.complexity}`, { defaultValue: feature.complexity });
  const impactLabel = t(`impacts.${feature.impact}`, { defaultValue: feature.impact });
  return (
    <Card className="p-4 cursor-pointer transition-colors roadmap-kanban-card" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={ROADMAP_PRIORITY_COLORS[feature.priority]}>
              {priorityLabel}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${ROADMAP_COMPLEXITY_COLORS[feature.complexity]}`}
            >
              {complexityLabel}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${ROADMAP_IMPACT_COLORS[feature.impact]}`}
            >
              {t('featureCard.impact', { impact: impactLabel })}
            </Badge>
            {hasCompetitorInsight && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs roadmap-chip roadmap-chip-competitor">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t('featureCard.competitorInsight')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t('featureCard.competitorInsightTooltip')}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <h3 className="font-medium">{feature.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
        </div>
        {feature.taskOutcome ? (
          <Badge variant="outline" className={`text-xs ${getTaskOutcomeColorClass(feature.taskOutcome)}`}>
            <TaskOutcomeBadge outcome={feature.taskOutcome} size="md" />
          </Badge>
        ) : feature.linkedSpecId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onGoToTask(feature.linkedSpecId!);
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {t('featureCard.goToTask')}
          </Button>
        ) : (
          feature.status !== 'done' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onConvertToSpec(feature);
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              {t('featureCard.build')}
            </Button>
          )
        )}
      </div>
    </Card>
  );
}
