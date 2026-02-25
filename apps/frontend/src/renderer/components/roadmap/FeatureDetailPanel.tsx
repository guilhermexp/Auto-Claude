import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Lightbulb,
  Users,
  CheckCircle2,
  ArrowRight,
  Zap,
  ExternalLink,
  TrendingUp,
  Trash2,
  Archive,
} from 'lucide-react';
import { TaskOutcomeBadge } from './TaskOutcomeBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import {
  ROADMAP_PRIORITY_COLORS,
  ROADMAP_PRIORITY_LABELS,
  ROADMAP_COMPLEXITY_COLORS,
  ROADMAP_IMPACT_COLORS,
} from '../../../shared/constants';
import type { FeatureDetailPanelProps } from './types';

export function FeatureDetailPanel({
  feature,
  onClose,
  onConvertToSpec,
  onGoToTask,
  onDelete,
  onArchive,
  competitorInsights = [],
}: FeatureDetailPanelProps) {
  const { t } = useTranslation(['common', 'roadmap']);
  const priorityLabel = t(`roadmap:priorities.${feature.priority}`, { defaultValue: ROADMAP_PRIORITY_LABELS[feature.priority] });
  const complexityLabel = t(`roadmap:complexities.${feature.complexity}`, { defaultValue: feature.complexity });
  const impactLabel = t(`roadmap:impacts.${feature.impact}`, { defaultValue: feature.impact });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleArchive = () => {
    onArchive?.(feature.id);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(feature.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[26rem] max-w-[92vw] flex-col border-l border-border bg-card shadow-lg">
      {/* Header */}
      <div className="electron-no-drag shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={ROADMAP_PRIORITY_COLORS[feature.priority]}>
                {priorityLabel}
              </Badge>
              <Badge
                variant="outline"
                className={`${ROADMAP_COMPLEXITY_COLORS[feature.complexity]}`}
              >
                {complexityLabel}
              </Badge>
            </div>
            <h2 className="text-[1.05rem] font-semibold leading-tight text-foreground">
              {feature.title}
            </h2>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-1.5 pointer-events-auto">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/70 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              aria-label={t('accessibility.deleteFeatureAriaLabel')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/70"
              onClick={onClose}
              aria-label={t('accessibility.closeFeatureDetailsAriaLabel')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-5 px-5 py-5">
          {/* Description */}
          <section className="space-y-2 rounded-xl border border-border/45 bg-card/60 p-4">
            <h3 className="text-sm font-semibold">{t('roadmap:featureDetail.description')}</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{feature.description}</p>
          </section>

          {/* Rationale */}
          <section className="space-y-2 rounded-xl border border-border/45 bg-card/60 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              {t('roadmap:featureDetail.rationale')}
            </h3>
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{feature.rationale}</p>
          </section>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <Card className="rounded-xl border-border/50 bg-card/70 p-3 text-center">
              <div
                className={`text-xl font-semibold leading-none ${ROADMAP_COMPLEXITY_COLORS[feature.complexity]}`}
              >
                {complexityLabel}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('roadmap:featureDetail.complexity')}</div>
            </Card>
            <Card className="rounded-xl border-border/50 bg-card/70 p-3 text-center">
              <div className={`text-xl font-semibold leading-none ${ROADMAP_IMPACT_COLORS[feature.impact]}`}>
                {impactLabel}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('roadmap:featureDetail.impact')}</div>
            </Card>
            <Card className="rounded-xl border-border/50 bg-card/70 p-3 text-center">
              <div className="text-xl font-semibold leading-none">{feature.dependencies.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t('roadmap:featureDetail.dependencies')}</div>
            </Card>
          </div>

          {/* User Stories */}
          {feature.userStories.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('roadmap:featureDetail.userStories')}
              </h3>
              <div className="space-y-2.5">
                {feature.userStories.map((story, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card/70 p-3 text-[0.95rem] leading-relaxed italic text-foreground">
                    "{story}"
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Acceptance Criteria */}
          {feature.acceptanceCriteria.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                {t('roadmap:featureDetail.acceptanceCriteria')}
              </h3>
              <ul className="space-y-2.5">
                {feature.acceptanceCriteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5 text-[0.95rem] leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Dependencies */}
          {feature.dependencies.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                {t('roadmap:featureDetail.dependencies')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {feature.dependencies.map((dep) => (
                  <Badge key={dep} variant="outline" className="border-border/60 bg-card/60 text-xs">
                    {dep}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Competitor Insights */}
          {competitorInsights.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t('roadmap:featureDetail.competitorInsights')}
              </h3>
              <div className="space-y-2.5">
                {competitorInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-xl border border-border/50 bg-card/70 p-3"
                  >
                    <p className="text-[0.95rem] leading-relaxed text-foreground">{insight.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs roadmap-chip roadmap-chip-neutral">
                        {insight.source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs roadmap-chip ${
                          insight.severity === 'high'
                            ? 'roadmap-chip-must'
                            : insight.severity === 'medium'
                              ? 'roadmap-chip-should'
                              : 'roadmap-chip-complexity-low'
                        }`}
                      >
                        {t('roadmap:featureDetail.severity', { severity: t(`roadmap:severities.${insight.severity}`, { defaultValue: insight.severity }) })}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      {feature.linkedSpecId ? (
        <div className="shrink-0 border-t border-border px-5 py-4">
          <Button className="h-12 w-full text-base" onClick={() => onGoToTask(feature.linkedSpecId!)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('roadmap:featureDetail.goToTask')}
          </Button>
        </div>
      ) : (
        feature.status !== 'done' && (
          <div className="shrink-0 border-t border-border px-5 py-4">
            <Button className="h-12 w-full text-base" onClick={() => onConvertToSpec(feature)}>
              <Zap className="mr-2 h-4 w-4" />
              {t('roadmap:featureDetail.convertToTask')}
            </Button>
          </div>
        )
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 z-10">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">{t('roadmap:featureDetail.deleteTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('roadmap:featureDetail.deleteDescription', { title: feature.title })}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {t('common:buttons.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('common:buttons.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
