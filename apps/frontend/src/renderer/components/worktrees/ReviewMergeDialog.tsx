import { useEffect, useState, useCallback, useRef } from 'react';
import {
  SearchCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  FileSearch,
  Wrench,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  FileCode,
  Search,
  FolderSearch,
  Pencil,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import type {
  ReviewMergeProgressData,
  ReviewMergeResult,
  ReviewMergeStage,
  ReviewMergeLogEntry,
} from '../../../shared/types';

interface ReviewMergeDialogProps {
  open: boolean;
  taskId: string;
  specName: string;
  baseBranch: string;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: ReviewMergeResult) => void;
}

const stageIconMap: Record<string, typeof FileSearch> = {
  reviewing: FileSearch,
  checking_conflicts: GitMerge,
  planning: SearchCheck,
  building: Wrench,
  verifying: RefreshCw,
  creating_pr: GitPullRequest,
  merging: GitMerge,
  complete: CheckCircle2,
  error: XCircle,
  max_iterations: AlertTriangle,
};

function StageIcon({ stage, active }: { stage: string; active: boolean }) {
  const Icon = stageIconMap[stage] || Loader2;

  if (stage === 'complete') return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
  if (stage === 'error') return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
  if (stage === 'max_iterations') return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />;

  if (active) return <Icon className="h-3.5 w-3.5 animate-pulse text-primary shrink-0" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

// ── Tool-level log entry rendering (matches TaskLogs.tsx pattern) ──

function getToolInfo(toolName: string, t: (key: string) => string) {
  switch (toolName) {
    case 'Read':
      return { icon: FileText, label: t('dialogs:worktrees.reviewMergeToolReading'), color: 'text-blue-500 bg-blue-500/10' };
    case 'Glob':
      return { icon: FolderSearch, label: t('dialogs:worktrees.reviewMergeToolSearchingFiles'), color: 'text-amber-500 bg-amber-500/10' };
    case 'Grep':
      return { icon: Search, label: t('dialogs:worktrees.reviewMergeToolSearchingCode'), color: 'text-green-500 bg-green-500/10' };
    case 'Edit':
      return { icon: Pencil, label: t('dialogs:worktrees.reviewMergeToolEditing'), color: 'text-purple-500 bg-purple-500/10' };
    case 'Write':
      return { icon: FileCode, label: t('dialogs:worktrees.reviewMergeToolWriting'), color: 'text-cyan-500 bg-cyan-500/10' };
    case 'Bash':
      return { icon: Terminal, label: t('dialogs:worktrees.reviewMergeToolRunning'), color: 'text-orange-500 bg-orange-500/10' };
    default:
      return { icon: Wrench, label: toolName, color: 'text-muted-foreground bg-muted' };
  }
}

function LogEntryItem({ entry, t }: { entry: ReviewMergeLogEntry; t: (key: string) => string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetail = Boolean(entry.detail);

  if (entry.type === 'tool_start' && entry.tool_name) {
    const { icon: Icon, label, color } = getToolInfo(entry.tool_name, t);
    return (
      <div className="flex flex-col">
        <div className={cn('inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs', color)}>
          <Icon className="h-3 w-3 animate-pulse" />
          <span className="font-medium">{label}</span>
          {entry.tool_input && (
            <span className="text-muted-foreground truncate max-w-[400px]" title={entry.tool_input}>
              {entry.tool_input}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (entry.type === 'tool_end' && entry.tool_name) {
    const { icon: Icon, color } = getToolInfo(entry.tool_name, t);
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className={cn('inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs', color, 'opacity-60')}>
            <Icon className="h-3 w-3" />
            {entry.success === false ? (
              <XCircle className="h-3 w-3 text-destructive" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-success" />
            )}
            <span className="text-muted-foreground">{entry.success === false ? t('dialogs:worktrees.reviewMergeToolFailed') : t('dialogs:worktrees.reviewMergeToolDone')}</span>
          </div>
          {hasDetail && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                'text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors',
                isExpanded && 'bg-secondary/50'
              )}
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="h-2.5 w-2.5" />
                  <span>{t('dialogs:worktrees.reviewMergeHideOutput')}</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-2.5 w-2.5" />
                  <span>{t('dialogs:worktrees.reviewMergeShowOutput')}</span>
                </>
              )}
            </button>
          )}
        </div>
        {hasDetail && isExpanded && (
          <div className="mt-1.5 ml-4 p-2 bg-secondary/30 rounded-md border border-border/50 overflow-x-auto">
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-words font-mono max-h-[300px] overflow-y-auto">
              {entry.detail}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (entry.type === 'error') {
    return (
      <div className="flex flex-col">
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1">
          <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="break-words flex-1">{entry.content}</span>
          {hasDetail && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0',
                'text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors',
                isExpanded && 'bg-secondary/50'
              )}
            >
              {isExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            </button>
          )}
        </div>
        {hasDetail && isExpanded && (
          <div className="mt-1.5 ml-4 p-2 bg-destructive/5 rounded-md border border-destructive/20 overflow-x-auto">
            <pre className="text-[10px] text-destructive/80 whitespace-pre-wrap break-words font-mono max-h-[300px] overflow-y-auto">
              {entry.detail}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (entry.type === 'success') {
    return (
      <div className="flex items-start gap-2 text-xs text-success bg-success/10 rounded-md px-2 py-1">
        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="break-words flex-1">{entry.content}</span>
      </div>
    );
  }

  if (entry.type === 'info') {
    return (
      <div className="flex items-start gap-2 text-xs text-info bg-info/10 rounded-md px-2 py-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="break-words flex-1">{entry.content}</span>
      </div>
    );
  }

  // Default text entry
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground py-0.5">
      <span className="break-words whitespace-pre-wrap flex-1">{entry.content || ''}</span>
    </div>
  );
}

// ── Main dialog ──

export function ReviewMergeDialog({
  open,
  taskId,
  specName,
  baseBranch,
  onOpenChange,
  onComplete,
}: ReviewMergeDialogProps) {
  const { t } = useTranslation(['dialogs', 'common']);
  const [progress, setProgress] = useState<ReviewMergeProgressData | null>(null);
  const [result, setResult] = useState<ReviewMergeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logEntries, setLogEntries] = useState<ReviewMergeLogEntry[]>([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const hasError = progress?.stage === 'error' || (result !== null && !result.success);

  // Auto-scroll activity log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries]);

  // Subscribe to progress and log events (always active while dialog is open)
  useEffect(() => {
    if (!open) return;

    const unsubProgress = window.electronAPI?.onReviewMergeProgress(
      (_taskId: string, progressData: ReviewMergeProgressData) => {
        if (_taskId === taskId) {
          setProgress(progressData);
        }
      }
    );

    const MAX_LOG_ENTRIES = 500;
    const unsubLog = window.electronAPI?.onReviewMergeLog(
      (_taskId: string, entry: ReviewMergeLogEntry) => {
        if (_taskId === taskId) {
          setLogEntries((prev) => {
            const updated = [...prev, entry];
            return updated.length > MAX_LOG_ENTRIES ? updated.slice(-MAX_LOG_ENTRIES) : updated;
          });
        }
      }
    );

    return () => {
      unsubProgress?.();
      unsubLog?.();
    };
  }, [open, taskId]);

  // Start the pipeline when dialog opens (only once, guarded by startedRef)
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }

    // Guard against React StrictMode double-invocation
    if (startedRef.current) return;
    startedRef.current = true;

    setProgress(null);
    setResult(null);
    setIsRunning(true);
    setIsCancelling(false);
    setLogEntries([]);
    setShowErrorLogs(false);

    // Start the review-merge process
    window.electronAPI?.reviewAndMergeWorktree(taskId).then((ipcResult) => {
      // Ignore "already in progress" responses from duplicate StrictMode calls
      if (!ipcResult.success && ipcResult.error?.includes('already in progress')) {
        return;
      }
      setIsRunning(false);
      if (ipcResult.success && ipcResult.data) {
        setResult(ipcResult.data);
        onComplete?.(ipcResult.data);
      } else {
        setResult({
          success: false,
          message: ipcResult.error || t('dialogs:worktrees.reviewMergeUnknownError'),
          logs: ipcResult.data?.logs,
        });
      }
    }).catch((err: unknown) => {
      setIsRunning(false);
      setResult({
        success: false,
        message: err instanceof Error ? err.message : t('dialogs:worktrees.reviewMergeUnexpectedError'),
      });
    });
  }, [open, taskId]);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await window.electronAPI?.cancelReviewMerge(taskId);
    } catch {
      // Ignore cancel errors
    }
    setIsRunning(false);
    setResult({ success: false, message: t('dialogs:worktrees.reviewMergeCancelledByUser') });
  }, [taskId]);

  const handleClose = useCallback(() => {
    if (isRunning && !isCancelling) {
      return;
    }
    onOpenChange(false);
  }, [isRunning, isCancelling, onOpenChange]);

  const getStageLabel = (stage: ReviewMergeStage): string => {
    return t(`dialogs:worktrees.reviewMergeStage_${stage}`);
  };

  const getProgressVariant = () => {
    if (progress?.stage === 'error') return 'destructive' as const;
    if (progress?.stage === 'complete') return 'success' as const;
    if (progress?.stage === 'max_iterations') return 'warning' as const;
    return 'default' as const;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SearchCheck className="h-5 w-5" />
            {t('dialogs:worktrees.reviewMergeTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs:worktrees.reviewMergeDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
          {/* Spec & Branch info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="truncate">{specName}</span>
            <span className="flex items-center gap-1 shrink-0">
              <GitMerge className="h-3.5 w-3.5" />
              {baseBranch}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <Progress
              value={progress?.percent ?? 0}
              variant={getProgressVariant()}
              size="default"
              animated={isRunning}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {progress?.stage ? (
                  <StageIcon stage={progress.stage} active={isRunning} />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {progress ? getStageLabel(progress.stage) : t('common:labels.loading')}
              </span>
              <span className="text-muted-foreground text-xs">
                {progress?.percent ?? 0}%
              </span>
            </div>
          </div>

          {/* Iteration counter */}
          {progress?.iteration != null && progress.maxIterations != null && (
            <div className="text-xs text-muted-foreground">
              {t('dialogs:worktrees.reviewMergeIteration', {
                current: progress.iteration,
                max: progress.maxIterations,
              })}
            </div>
          )}

          {/* Activity log — TaskLogs-style entries */}
          <div className="border rounded-md overflow-auto flex-1 min-h-[120px] max-h-[350px]">
            <div className="p-2 space-y-1">
              {logEntries.length === 0 && isRunning && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t('common:labels.loading')}...</span>
                </div>
              )}
              {logEntries.map((entry, i) => (
                <LogEntryItem key={`${entry.type}-${entry.tool_name || ''}-${i}`} entry={entry} t={t} />
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* PR link */}
          {result?.prUrl && (
            <div className="flex items-center gap-2 text-sm">
              <GitPullRequest className="h-4 w-4 text-info shrink-0" />
              <span className="shrink-0">{t('dialogs:worktrees.reviewMergePrCreated')}:</span>
              <button
                type="button"
                className="text-info hover:underline flex items-center gap-1 truncate"
                onClick={() => window.electronAPI?.openExternal(result.prUrl!)}
              >
                <span className="truncate">{result.prUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </button>
            </div>
          )}

          {/* Full error logs (stderr/stdout) collapsible */}
          {hasError && result?.logs && (
            <div className="border border-destructive/30 rounded-md overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                onClick={() => setShowErrorLogs(!showErrorLogs)}
              >
                {showErrorLogs ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                {t('dialogs:worktrees.reviewMergeShowLogs')}
              </button>
              {showErrorLogs && (
                <pre className="px-3 pb-2 text-[10px] leading-tight text-muted-foreground overflow-auto max-h-48 whitespace-pre-wrap break-all font-mono bg-muted/30">
                  {result.logs}
                </pre>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isRunning && !isCancelling ? (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              {t('dialogs:worktrees.reviewMergeCancel')}
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleClose}>
              {t('dialogs:worktrees.reviewMergeClose')}
            </Button>
          )}
          {isCancelling && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common:buttons.cancel')}...
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
