import { useTranslation } from 'react-i18next';
import { Lightbulb, Eye, EyeOff, Settings2, Plus, Trash2, RefreshCw, CheckSquare, X, Languages, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { IDEATION_TYPE_COLORS } from '../../../shared/constants';
import type { IdeationType } from '../../../shared/types';
import { TypeIcon } from './TypeIcon';

interface IdeationHeaderProps {
  totalIdeas: number;
  ideaCountByType: Record<string, number>;
  showDismissed: boolean;
  selectedCount: number;
  onToggleShowDismissed: () => void;
  onOpenConfig: () => void;
  onOpenAddMore: () => void;
  onDismissAll: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  hasActiveIdeas: boolean;
  canAddMore: boolean;
  showTranslateToggle?: boolean;
  isTranslateEnabled?: boolean;
  isTranslating?: boolean;
  onToggleTranslate?: () => void;
}

export function IdeationHeader({
  totalIdeas,
  ideaCountByType,
  showDismissed,
  selectedCount,
  onToggleShowDismissed,
  onOpenConfig,
  onOpenAddMore,
  onDismissAll,
  onDeleteSelected,
  onSelectAll,
  onClearSelection,
  onRefresh,
  hasActiveIdeas,
  canAddMore,
  showTranslateToggle = false,
  isTranslateEnabled = false,
  isTranslating = false,
  onToggleTranslate,
}: IdeationHeaderProps) {
  const { t } = useTranslation(['common', 'ideation']);
  const hasSelection = selectedCount > 0;
  return (
    <div className="shrink-0 border-b border-border/60 px-5 py-4 bg-card/65 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 border border-primary/25">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{t('ideation:header.title')}</h2>
            <Badge variant="outline" className="ideation-chip ideation-tone-neutral px-2.5 py-1 text-xs font-medium">
              {t('ideation:header.ideasCount', { count: totalIdeas })}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground/90 leading-relaxed">
            {t('ideation:header.description')}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Selection controls */}
          {hasSelection ? (
            <>
              <Badge variant="secondary" className="mr-1 ideation-chip ideation-tone-selected px-2.5 py-1">
                {t('ideation:header.selectedCount', { count: selectedCount })}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('ideation:header.deleteButton')}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClearSelection}
                    aria-label={t('accessibility.clearSelectionAriaLabel')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('accessibility.clearSelectionAriaLabel')}</TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1" />
            </>
          ) : (
            hasActiveIdeas && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onSelectAll}
                    aria-label={t('accessibility.selectAllAriaLabel')}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('accessibility.selectAllAriaLabel')}</TooltipContent>
              </Tooltip>
            )
          )}

          {/* View toggles */}
          {showTranslateToggle && onToggleTranslate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isTranslateEnabled ? 'default' : 'secondary'}
                  size="icon"
                  onClick={onToggleTranslate}
                  aria-label={
                    isTranslateEnabled
                      ? t('ideation:header.translation.showOriginal')
                      : t('ideation:header.translation.translateToPortuguese')
                  }
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isTranslating
                  ? t('ideation:header.translation.translating')
                  : isTranslateEnabled
                    ? t('ideation:header.translation.showOriginal')
                    : t('ideation:header.translation.translateToPortuguese')}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showDismissed ? 'default' : 'secondary'}
                size="icon"
                onClick={onToggleShowDismissed}
                aria-label={showDismissed ? t('accessibility.hideDismissedAriaLabel') : t('accessibility.showDismissedAriaLabel')}
              >
                {showDismissed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showDismissed ? t('accessibility.hideDismissedAriaLabel') : t('accessibility.showDismissedAriaLabel')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={onOpenConfig}
                aria-label={t('accessibility.configureAriaLabel')}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('accessibility.configureAriaLabel')}</TooltipContent>
          </Tooltip>
          {canAddMore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  onClick={onOpenAddMore}
                  aria-label={t('accessibility.addMoreAriaLabel')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('ideation:header.addMoreButton')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('accessibility.addMoreAriaLabel')}</TooltipContent>
            </Tooltip>
          )}
          {hasActiveIdeas && !hasSelection && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onDismissAll}
                  aria-label={t('accessibility.dismissAllAriaLabel')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('accessibility.dismissAllAriaLabel')}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={onRefresh}
                aria-label={t('accessibility.regenerateIdeasAriaLabel')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('accessibility.regenerateIdeasAriaLabel')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4">
        {Object.entries(ideaCountByType).map(([type, count]) => (
          <Badge
            key={type}
            variant="outline"
            className={`ideation-chip ${IDEATION_TYPE_COLORS[type]}`}
          >
            <TypeIcon type={type as IdeationType} />
            <span className="ml-1">{count}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
