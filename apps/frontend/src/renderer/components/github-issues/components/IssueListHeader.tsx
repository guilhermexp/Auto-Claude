import { useTranslation } from 'react-i18next';
import { Github, RefreshCw, Search, Filter, Wand2, Loader2, Layers } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import type { IssueListHeaderProps } from '../types';

export function IssueListHeader({
  repoFullName,
  openIssuesCount,
  isLoading,
  searchQuery,
  filterState,
  onSearchChange,
  onFilterChange,
  onRefresh,
  autoFixEnabled,
  autoFixRunning,
  autoFixProcessing,
  onAutoFixToggle,
  onAnalyzeAndGroup,
  isAnalyzing,
}: IssueListHeaderProps) {
  const { t } = useTranslation('common');

  return (
    <div className="shrink-0 border-b border-border/40 px-6 py-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Github className="h-6 w-6" />
            {t('githubIssues.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{repoFullName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 rounded-full px-3 text-sm">
            {t('githubIssues.openCount', { count: openIssuesCount })}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="github-pr-action-button h-9 px-3"
            aria-label={t('buttons.refresh')}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {t('buttons.refresh')}
          </Button>
        </div>
      </div>

      {/* Issue Management Actions */}
      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Analyze & Group Button (Proactive) */}
        {onAnalyzeAndGroup && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onAnalyzeAndGroup}
                  disabled={isAnalyzing || isLoading}
                  className="github-pr-action-button h-10 w-full justify-center"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4 mr-2" />
                  )}
                  {t('githubIssues.analyzeGroup')}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{t('githubIssues.analyzeGroupTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Auto-Fix Toggle (Reactive) */}
        {onAutoFixToggle && (
          <div className="github-pr-action-button flex h-10 items-center justify-between gap-3 rounded-lg px-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2.5">
                    {autoFixRunning ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="auto-fix-toggle" className="cursor-pointer whitespace-nowrap text-sm">
                      {t('githubIssues.autoFixNew')}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{t('githubIssues.autoFixTooltip')}</p>
                  {autoFixRunning && autoFixProcessing !== undefined && autoFixProcessing > 0 && (
                    <p className="mt-1 text-primary">
                      {t('githubIssues.autoFixProcessing', { count: autoFixProcessing })}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Switch
              id="auto-fix-toggle"
              checked={autoFixEnabled ?? false}
              onCheckedChange={onAutoFixToggle}
              disabled={autoFixRunning}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('githubIssues.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 rounded-lg border-border/45 bg-card/30 pl-10 text-sm"
          />
        </div>
        <Select value={filterState} onValueChange={onFilterChange}>
          <SelectTrigger className="h-10 rounded-lg border-border/45 bg-card/30 px-3 text-sm">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">{t('githubIssues.filterOpen')}</SelectItem>
            <SelectItem value="closed">{t('githubIssues.filterClosed')}</SelectItem>
            <SelectItem value="all">{t('githubIssues.filterAll')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
