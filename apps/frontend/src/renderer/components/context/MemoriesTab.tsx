import { useState, useMemo } from 'react';
import {
  RefreshCw,
  Database,
  Brain,
  Search,
  CheckCircle,
  XCircle,
  GitPullRequest,
  Lightbulb,
  FolderTree,
  Code,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { MemoryCard } from './MemoryCard';
import { InfoItem } from './InfoItem';
import { memoryFilterCategories } from './constants';
import { useTranslation } from 'react-i18next';
import type { GraphitiMemoryStatus, GraphitiMemoryState, MemoryEpisode } from '../../../shared/types';

type FilterCategory = keyof typeof memoryFilterCategories;

interface MemoriesTabProps {
  memoryStatus: GraphitiMemoryStatus | null;
  memoryState: GraphitiMemoryState | null;
  recentMemories: MemoryEpisode[];
  memoriesLoading: boolean;
  searchResults: Array<{ type: string; content: string; score: number }>;
  searchLoading: boolean;
  onSearch: (query: string) => void;
}

// Helper to check if memory is a PR review (by type or content)
function isPRReview(memory: MemoryEpisode): boolean {
  if (['pr_review', 'pr_finding', 'pr_pattern', 'pr_gotcha'].includes(memory.type)) {
    return true;
  }
  try {
    const parsed = JSON.parse(memory.content);
    return parsed.prNumber !== undefined && parsed.verdict !== undefined;
  } catch {
    return false;
  }
}

// Get the effective category for a memory
function getMemoryCategory(memory: MemoryEpisode): FilterCategory {
  if (isPRReview(memory)) return 'pr';
  if (['session_insight', 'task_outcome'].includes(memory.type)) return 'sessions';
  if (['codebase_discovery', 'codebase_map'].includes(memory.type)) return 'codebase';
  if (['pattern', 'pr_pattern'].includes(memory.type)) return 'patterns';
  if (['gotcha', 'pr_gotcha'].includes(memory.type)) return 'gotchas';
  return 'sessions'; // default
}

// Filter icons for each category
const filterIcons: Record<FilterCategory, React.ElementType> = {
  all: Brain,
  pr: GitPullRequest,
  sessions: Lightbulb,
  codebase: FolderTree,
  patterns: Code,
  gotchas: AlertTriangle
};

export function MemoriesTab({
  memoryStatus,
  memoryState,
  recentMemories,
  memoriesLoading,
  searchResults,
  searchLoading,
  onSearch
}: MemoriesTabProps) {
  const { t } = useTranslation('insights');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  // Calculate memory counts by category
  const memoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      all: recentMemories.length,
      pr: 0,
      sessions: 0,
      codebase: 0,
      patterns: 0,
      gotchas: 0
    };

    for (const memory of recentMemories) {
      const category = getMemoryCategory(memory);
      counts[category]++;
    }

    return counts;
  }, [recentMemories]);

  // Filter memories based on active filter
  const filteredMemories = useMemo(() => {
    if (activeFilter === 'all') return recentMemories;
    return recentMemories.filter(memory => getMemoryCategory(memory) === activeFilter);
  }, [recentMemories, activeFilter]);

  const handleSearch = () => {
    if (localSearchQuery.trim()) {
      onSearch(localSearchQuery);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 context-page-section">
        {/* Memory Status */}
        <Card className="context-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                {t('graphMemoryStatus')}
              </CardTitle>
              {memoryStatus?.available ? (
                <Badge variant="outline" className="context-chip context-chip-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('connected')}
                </Badge>
              ) : (
                <Badge variant="outline" className="context-chip context-chip-neutral">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('notAvailable')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryStatus?.available ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <InfoItem label={t('labels.database')} value={memoryStatus.database || 'auto_claude_memory'} />
                  <InfoItem label={t('labels.path')} value={memoryStatus.dbPath || '~/.auto-claude/memories'} />
                </div>

                {/* Memory Stats Summary */}
                {recentMemories.length > 0 && (
                  <div className="pt-3 context-divider">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-neutral">
                        <div className="text-lg font-semibold text-foreground">{memoryCounts.all}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.total')}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-cyan">
                        <div className="text-lg font-semibold context-tone-cyan">{memoryCounts.pr}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.prReviews')}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-warning">
                        <div className="text-lg font-semibold context-tone-warning">{memoryCounts.sessions}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.sessions')}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-blue">
                        <div className="text-lg font-semibold context-tone-blue">{memoryCounts.codebase}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.codebase')}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-purple">
                        <div className="text-lg font-semibold context-tone-purple">{memoryCounts.patterns}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.patterns')}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg context-stat-box context-stat-box-danger">
                        <div className="text-lg font-semibold context-tone-danger">{memoryCounts.gotchas}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.gotchas')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>{memoryStatus?.reason || t('notConfigured.description')}</p>
                <p className="mt-2 text-xs">
                  {t('notConfigured.hint')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('searchMemories.title')}
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder={t('searchMemories.placeholder')}
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="context-search-input"
            />
            <Button onClick={handleSearch} disabled={searchLoading} variant="secondary" className="context-action-button">
              <Search className={cn('h-4 w-4', searchLoading && 'animate-pulse')} />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('searchMemories.resultsFound', { count: searchResults.length })}
              </p>
              {searchResults.map((result, idx) => (
                <Card key={idx} className="context-card-soft">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs capitalize context-chip context-chip-muted">
                        {result.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t('searchMemories.score')} {result.score.toFixed(2)}
                      </span>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-auto">
                      {result.content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Memory Browser */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('memoryBrowser.title')}
            </h3>
            <span className="text-xs text-muted-foreground">
              {t('memoryBrowser.itemsCount', { current: filteredMemories.length, total: recentMemories.length })}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(memoryFilterCategories) as FilterCategory[]).map((category) => {
              const config = memoryFilterCategories[category];
              const count = memoryCounts[category];
              const Icon = filterIcons[category];
              const isActive = activeFilter === category;

              return (
                <Button
                  key={category}
                  variant="secondary"
                  size="sm"
                  className={cn(
                    'gap-1.5 h-8 context-filter-pill',
                    isActive && 'context-filter-pill-active',
                    !isActive && count === 0 && 'opacity-50'
                  )}
                  onClick={() => setActiveFilter(category)}
                  disabled={count === 0 && category !== 'all'}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t(config.labelKey)}</span>
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'ml-1 px-1.5 py-0 text-xs context-chip context-chip-neutral',
                        isActive && 'context-filter-pill-count-active'
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Memory List */}
          {memoriesLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!memoriesLoading && filteredMemories.length === 0 && recentMemories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('memoryBrowser.noMemoriesEmpty')}
              </p>
            </div>
          )}

          {!memoriesLoading && filteredMemories.length === 0 && recentMemories.length > 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('memoryBrowser.noMemoriesFiltered')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveFilter('all')}
                className="mt-2 context-action-button"
              >
                {t('memoryBrowser.showAll')}
              </Button>
            </div>
          )}

          {filteredMemories.length > 0 && (
            <div className="space-y-3">
              {filteredMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
