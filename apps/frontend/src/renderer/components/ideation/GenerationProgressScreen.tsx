import { useEffect, useRef, useState } from 'react';
import { Sparkles, FileCode, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  IDEATION_TYPE_LABELS,
  IDEATION_TYPE_COLORS
} from '../../../shared/constants';
import type {
  Idea,
  IdeationType,
  IdeationGenerationStatus,
  IdeationSession
} from '../../../shared/types';
import type { IdeationTypeState } from '../../stores/ideation-store';
import { TypeIcon } from './TypeIcon';
import { TypeStateIcon } from './TypeStateIcon';
import { IdeaSkeletonCard } from './IdeaSkeletonCard';
import { IdeaCard } from './IdeaCard';
import { IdeaDetailPanel } from './IdeaDetailPanel';

interface GenerationProgressScreenProps {
  generationStatus: IdeationGenerationStatus;
  logs: string[];
  typeStates: Record<IdeationType, IdeationTypeState>;
  enabledTypes: IdeationType[];
  session: IdeationSession | null;
  onSelectIdea: (idea: Idea | null) => void;
  selectedIdea: Idea | null;
  onConvert: (idea: Idea) => void;
  onGoToTask?: (taskId: string) => void;
  onDismiss: (idea: Idea) => void;
  onStop: () => void | Promise<void>;
}

export function GenerationProgressScreen({
  generationStatus,
  logs,
  typeStates,
  enabledTypes,
  session,
  onSelectIdea,
  selectedIdea,
  onConvert,
  onGoToTask,
  onDismiss,
  onStop
}: GenerationProgressScreenProps) {
  const { t } = useTranslation(['ideation', 'common']);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  /**
   * Handle stop button click with error handling and double-click prevention
   */
  const handleStopClick = async () => {
    if (isStopping) return;

    setIsStopping(true);
    try {
      await onStop();
    } catch (err) {
      console.error('Failed to stop generation:', err);
    } finally {
      setIsStopping(false);
    }
  };

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsEndRef.current && showLogs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showLogs]);

  const getStreamingIdeasByType = (type: IdeationType): Idea[] => {
    if (!session) return [];
    return session.ideas.filter(
      (idea) => idea.type === type && idea.status !== 'dismissed' && idea.status !== 'archived'
    );
  };

  // Count how many types are still generating
  const _generatingCount = enabledTypes.filter((t) => typeStates[t] === 'generating').length;
  const completedCount = enabledTypes.filter((t) => typeStates[t] === 'completed').length;
  const roundedProgress = Math.max(0, Math.min(100, Math.round(generationStatus.progress || 0)));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/60 p-4 bg-card/40">
        <div className="rounded-2xl border border-border/45 bg-card/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <Badge variant="outline" className="text-xs">
              {t('ideation:generationProgress.complete', { completed: completedCount, total: enabledTypes.length })}
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant={showLogs ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                <FileCode className="h-4 w-4 mr-1.5" />
                {showLogs ? t('ideation:generationProgress.hideButton') : t('ideation:generationProgress.showButton')} {t('ideation:generationProgress.logsButton')}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopClick}
                    disabled={isStopping}
                  >
                    <Square className="h-4 w-4 mr-1.5" />
                    {isStopping ? t('ideation:generationProgress.stopping') : t('ideation:generationProgress.stop')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('ideation:generationProgress.stopGenerationTooltip')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{t('ideation:generationProgress.title')}</h2>
            <p className="mt-1 text-base text-muted-foreground">{generationStatus.message}</p>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('common:labels.progress', { defaultValue: 'Progresso' })}</span>
              <span className="font-medium tabular-nums">{roundedProgress}%</span>
            </div>
            <Progress value={roundedProgress} size="lg" className="h-2.5" />
          </div>

          {/* Type Status Indicators */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {enabledTypes.map((type) => (
              <div
                key={type}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border ${
                  typeStates[type] === 'completed'
                    ? 'bg-success/10 text-success border-success/30'
                    : typeStates[type] === 'failed'
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : typeStates[type] === 'generating'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-muted/35 text-muted-foreground border-border/40'
                }`}
              >
                <TypeStateIcon state={typeStates[type]} />
                <TypeIcon type={type} />
                <span>{t(`ideation:typeLabels.${type}`, { defaultValue: IDEATION_TYPE_LABELS[type] })}</span>
                {typeStates[type] === 'completed' && session && (
                  <span className="ml-1 font-medium tabular-nums">
                    {getStreamingIdeasByType(type).length}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Panel (collapsible) */}
      {showLogs && logs.length > 0 && (
        <div className="shrink-0 border-b border-border/60 p-4 bg-muted/15">
          <ScrollArea className="h-36 rounded-lg border border-border/50 bg-muted/25">
            <div className="p-3 space-y-1 font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className="text-muted-foreground leading-relaxed">
                  <span className="text-muted-foreground/50 mr-2 select-none">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Streaming Ideas View */}
      <div className="flex-1 overflow-auto p-4 md:p-5">
        {generationStatus.error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {generationStatus.error}
          </div>
        )}

        <div className="space-y-6">
          {enabledTypes.map((type) => {
            const ideas = getStreamingIdeasByType(type);
            const state = typeStates[type];

            return (
              <div key={type} className="rounded-xl border border-border/45 bg-card/35 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-md ${IDEATION_TYPE_COLORS[type]}`}>
                    <TypeIcon type={type} />
                  </div>
                  <h3 className="font-medium">{t(`ideation:typeLabels.${type}`, { defaultValue: IDEATION_TYPE_LABELS[type] })}</h3>
                  <TypeStateIcon state={state} />
                  {ideas.length > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {t('ideation:header.ideasCount', { count: ideas.length })}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3">
                  {/* Show actual ideas if available */}
                  {ideas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      isSelected={false}
                      onClick={() => onSelectIdea(selectedIdea?.id === idea.id ? null : idea)}
                      onConvert={onConvert}
                      onGoToTask={onGoToTask}
                      onDismiss={onDismiss}
                      onToggleSelect={() => {/* Selection disabled during generation */}}
                    />
                  ))}

                  {/* Show skeleton placeholders while generating */}
                  {state === 'generating' && (
                    <>
                      <IdeaSkeletonCard />
                      <IdeaSkeletonCard />
                    </>
                  )}

                  {/* Show pending message */}
                  {state === 'pending' && (
                    <div className="text-sm text-muted-foreground py-2">
                      {t('ideation:statusMessages.waitingToStart')}
                    </div>
                  )}

                  {/* Show failed message */}
                  {state === 'failed' && ideas.length === 0 && (
                    <div className="text-sm text-destructive py-2">
                      {t('ideation:statusMessages.failed')}
                    </div>
                  )}

                  {/* Show empty message if completed with no ideas */}
                  {state === 'completed' && ideas.length === 0 && (
                    <div className="text-sm text-muted-foreground py-2">
                      {t('ideation:statusMessages.noIdeas')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Idea Detail Panel */}
      {selectedIdea && (
        <IdeaDetailPanel
          idea={selectedIdea}
          onClose={() => onSelectIdea(null)}
          onConvert={onConvert}
          onGoToTask={onGoToTask}
          onDismiss={onDismiss}
        />
      )}
    </div>
  );
}
