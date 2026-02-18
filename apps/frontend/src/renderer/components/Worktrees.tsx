import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitBranch,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  FolderGit,
  GitMerge,
  GitPullRequest,
  FileCode,
  Plus,
  Minus,
  ChevronRight,
  Check,
  X,
  Terminal,
  CheckSquare2,
  CheckSquare,
  Square,
  SearchCheck,
  Maximize2,
  XCircle,
  FileSearch,
  Wrench,
  CheckCircle2,
  Monitor,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog';
import { useProjectStore } from '../stores/project-store';
import { useTaskStore } from '../stores/task-store';
import { useToast } from '../hooks/use-toast';
import type { WorktreeListItem, WorktreeMergeResult, TerminalWorktreeConfig, WorktreeStatus, Task, WorktreeCreatePROptions, WorktreeCreatePRResult, ReviewMergeResult, ReviewMergeProgressData, ReviewMergeLogEntry, ReviewMergeStage } from '../../shared/types';
import { cn } from '../lib/utils';
import { Progress } from './ui/progress';
import { CreatePRDialog } from './task-detail/task-review/CreatePRDialog';
import { ReviewMergeDialog } from './worktrees/ReviewMergeDialog';
import { debugError, debugLog, debugWarn } from '../../shared/utils/debug-logger';

// ── Review & Merge Timeline Stepper ──

const PIPELINE_STEPS = [
  { key: 'reviewing' as const, icon: FileSearch },
  { key: 'checking_conflicts' as const, icon: GitMerge },
  { key: 'planning' as const, icon: SearchCheck },
  { key: 'building' as const, icon: Wrench },
  { key: 'verifying' as const, icon: RefreshCw },
  { key: 'e2e_testing' as const, icon: Monitor },
  { key: 'creating_pr' as const, icon: GitPullRequest },
  { key: 'merging' as const, icon: GitMerge },
];

const STAGE_TO_STEP_INDEX: Record<string, number> = {
  reviewing: 0,
  checking_conflicts: 1,
  planning: 2,
  building: 3,
  verifying: 4,
  e2e_testing: 5,
  creating_pr: 6,
  merging: 7,
  complete: 8, // all done
};

function ReviewMergeTimeline({ stage, isRunning }: {
  stage: ReviewMergeStage | null;
  isRunning: boolean;
}) {
  const { t } = useTranslation(['dialogs']);

  const activeIndex = stage ? (STAGE_TO_STEP_INDEX[stage] ?? -1) : -1;
  const isError = stage === 'error' || stage === 'max_iterations';

  return (
    <div className="flex items-center gap-0.5 py-2 px-1 overflow-x-auto">
      {PIPELINE_STEPS.map((step, i) => {
        const isDone = activeIndex > i;
        const isActive = !isDone && activeIndex === i;
        const isPending = !isDone && !isActive;

        const StepIcon = isDone ? CheckCircle2 : (isActive && isError) ? XCircle : step.icon;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step */}
            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
              <StepIcon
                className={cn(
                  'h-3.5 w-3.5',
                  isDone && 'text-success',
                  isActive && !isError && 'animate-pulse text-primary',
                  isActive && isError && 'text-destructive',
                  isPending && 'text-muted-foreground/40',
                )}
              />
              <span
                className={cn(
                  'text-[9px] leading-tight whitespace-nowrap',
                  isDone && 'text-success',
                  isActive && !isError && 'text-primary font-medium',
                  isActive && isError && 'text-destructive font-medium',
                  isPending && 'text-muted-foreground/40',
                )}
              >
                {t(`dialogs:worktrees.reviewMergeStep_${step.key}`)}
              </span>
            </div>
            {/* Connector line */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-3 mx-0.5 mt-[-8px]',
                  isDone ? 'bg-success' : (isActive && isRunning) ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Prefix constants for worktree ID parsing
const TASK_PREFIX = 'task:';
const TERMINAL_PREFIX = 'terminal:';

interface WorktreesProps {
  projectId: string;
}

export function Worktrees({ projectId }: WorktreesProps) {
  const { t } = useTranslation(['common', 'dialogs']);
  const { toast } = useToast();
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = projects.find((p) => p.id === projectId);
  const tasks = useTaskStore((state) => state.tasks);

  const [worktrees, setWorktrees] = useState<WorktreeListItem[]>([]);
  const [terminalWorktrees, setTerminalWorktrees] = useState<TerminalWorktreeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal worktree delete state
  const [terminalWorktreeToDelete, setTerminalWorktreeToDelete] = useState<TerminalWorktreeConfig | null>(null);
  const [isDeletingTerminal, setIsDeletingTerminal] = useState(false);

  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedWorktree, setSelectedWorktree] = useState<WorktreeListItem | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<WorktreeMergeResult | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [worktreeToDelete, setWorktreeToDelete] = useState<WorktreeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk delete confirmation state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Create PR dialog state
  const [showCreatePRDialog, setShowCreatePRDialog] = useState(false);
  const [prWorktree, setPrWorktree] = useState<WorktreeListItem | null>(null);
  const [prTask, setPrTask] = useState<Task | null>(null);

  // Review & Merge state (lifted from dialog so it persists when minimized)
  const [showReviewMergeDialog, setShowReviewMergeDialog] = useState(false);
  const [reviewMergeWorktree, setReviewMergeWorktree] = useState<WorktreeListItem | null>(null);
  const [reviewMergeTaskId, setReviewMergeTaskId] = useState<string>('');
  const [rmProgress, setRmProgress] = useState<ReviewMergeProgressData | null>(null);
  const [rmLogEntries, setRmLogEntries] = useState<ReviewMergeLogEntry[]>([]);
  const [rmIsRunning, setRmIsRunning] = useState(false);
  const [rmIsCancelling, setRmIsCancelling] = useState(false);
  const [rmResult, setRmResult] = useState<ReviewMergeResult | null>(null);
  const rmStartedRef = useRef(false);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWorktreeIds, setSelectedWorktreeIds] = useState<Set<string>>(new Set());

  // Selection callbacks
  const toggleWorktree = useCallback((id: string) => {
    setSelectedWorktreeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = [
      ...worktrees.map(w => `${TASK_PREFIX}${w.specName}`),
      ...terminalWorktrees.map(wt => `${TERMINAL_PREFIX}${wt.name}`)
    ];
    setSelectedWorktreeIds(new Set(allIds));
  }, [worktrees, terminalWorktrees]);

  const deselectAll = useCallback(() => {
    setSelectedWorktreeIds(new Set());
  }, []);

  // Computed selection values
  const totalWorktrees = worktrees.length + terminalWorktrees.length;

  const isAllSelected = useMemo(
    () => totalWorktrees > 0 &&
      worktrees.every(w => selectedWorktreeIds.has(`${TASK_PREFIX}${w.specName}`)) &&
      terminalWorktrees.every(wt => selectedWorktreeIds.has(`${TERMINAL_PREFIX}${wt.name}`)),
    [worktrees, terminalWorktrees, selectedWorktreeIds, totalWorktrees]
  );

  const isSomeSelected = useMemo(
    () => (
      worktrees.some(w => selectedWorktreeIds.has(`${TASK_PREFIX}${w.specName}`)) ||
      terminalWorktrees.some(wt => selectedWorktreeIds.has(`${TERMINAL_PREFIX}${wt.name}`))
    ) && !isAllSelected,
    [worktrees, terminalWorktrees, selectedWorktreeIds, isAllSelected]
  );

  // Compute selectedCount by filtering against current worktrees to exclude stale selections
  const selectedCount = useMemo(() => {
    const validTaskIds = new Set(worktrees.map(w => `${TASK_PREFIX}${w.specName}`));
    const validTerminalIds = new Set(terminalWorktrees.map(wt => `${TERMINAL_PREFIX}${wt.name}`));
    let count = 0;
    selectedWorktreeIds.forEach(id => {
      if (validTaskIds.has(id) || validTerminalIds.has(id)) {
        count++;
      }
    });
    return count;
  }, [worktrees, terminalWorktrees, selectedWorktreeIds]);

  // Load worktrees (both task and terminal worktrees)
  const loadWorktrees = useCallback(async () => {
    if (!projectId || !selectedProject) return;

    // Clear selection when refreshing list to prevent stale selections
    setSelectedWorktreeIds(new Set());
    setIsSelectionMode(false);

    setIsLoading(true);
    setError(null);

    try {
      // Fetch both task worktrees and terminal worktrees in parallel
      const [taskResult, terminalResult] = await Promise.all([
        window.electronAPI.listWorktrees(projectId, { includeStats: true }),
        window.electronAPI.listTerminalWorktrees(selectedProject.path)
      ]);

      debugLog('[Worktrees] Task worktrees result:', taskResult);
      debugLog('[Worktrees] Terminal worktrees result:', terminalResult);

      if (taskResult.success) {
        // Always update state when successful, even if data is null/undefined
        setWorktrees(taskResult.data?.worktrees || []);
      } else {
        setError(taskResult.error || t('common:errors.failedToLoadTaskWorktrees'));
      }

      if (terminalResult.success && terminalResult.data) {
        debugLog('[Worktrees] Setting terminal worktrees:', terminalResult.data);
        setTerminalWorktrees(terminalResult.data);
      } else {
        debugWarn('[Worktrees] Terminal worktrees fetch failed or empty:', terminalResult);
      }
    } catch (err) {
      debugError('[Worktrees] Error loading worktrees:', err);
      setError(err instanceof Error ? err.message : t('common:errors.failedToLoadWorktrees'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, selectedProject]);

  // Load on mount and when project changes
  useEffect(() => {
    loadWorktrees();
  }, [loadWorktrees]);

  // Find task for a worktree
  const findTaskForWorktree = useCallback((specName: string) => {
    return tasks.find(t => t.specId === specName);
  }, [tasks]);

  // Handle merge
  const handleMerge = async () => {
    if (!selectedWorktree) return;

    const task = findTaskForWorktree(selectedWorktree.specName);
    if (!task) {
      setError(t('common:errors.taskNotFoundForWorktree'));
      return;
    }

    setIsMerging(true);
    try {
      const result = await window.electronAPI.mergeWorktree(task.id);
      if (result.success && result.data) {
        setMergeResult(result.data);
        if (result.data.success) {
          // Refresh worktrees after successful merge
          await loadWorktrees();
        }
      } else {
        setMergeResult({
          success: false,
          message: result.error || t('dialogs:worktrees.mergeFailed')
        });
      }
    } catch (err) {
      setMergeResult({
        success: false,
        message: err instanceof Error ? err.message : t('dialogs:worktrees.mergeFailed')
      });
    } finally {
      setIsMerging(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!worktreeToDelete) return;

    const task = findTaskForWorktree(worktreeToDelete.specName);
    if (!task) {
      setError(t('common:errors.taskNotFoundForWorktree'));
      return;
    }

    setIsDeleting(true);
    try {
      let result;
      if (task) {
        // Normal delete via task ID
        result = await window.electronAPI.discardWorktree(task.id);
      } else if (worktreeToDelete.isOrphaned) {
        // Orphaned worktree - delete by spec name directly
        result = await window.electronAPI.discardOrphanedWorktree(projectId, worktreeToDelete.specName);
      } else {
        setError(t('common:errors.taskNotFoundForWorktree', { specName: worktreeToDelete.specName }));
        setIsDeleting(false);
        return;
      }

      if (result.success) {
        // Refresh worktrees after successful delete
        await loadWorktrees();
        setShowDeleteConfirm(false);
        toast({
          title: t('common:actions.success'),
          description: t('common:worktrees.deleteSuccess', { branch: worktreeToDelete.branch || worktreeToDelete.specName }),
        });
        setWorktreeToDelete(null);
      } else {
        setError(result.error || t('common:errors.failedToDeleteTaskWorktree', { specName: worktreeToDelete.specName }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.failedToDeleteTaskWorktree', { specName: worktreeToDelete.specName }));
    } finally {
      setIsDeleting(false);
    }
  };

  // Open merge dialog
  const openMergeDialog = (worktree: WorktreeListItem) => {
    setSelectedWorktree(worktree);
    setMergeResult(null);
    setShowMergeDialog(true);
  };

  // Confirm delete
  const confirmDelete = (worktree: WorktreeListItem) => {
    setWorktreeToDelete(worktree);
    setShowDeleteConfirm(true);
  };

  // Convert WorktreeListItem to WorktreeStatus for the dialog
  const worktreeToStatus = (worktree: WorktreeListItem): WorktreeStatus => ({
    exists: true,
    worktreePath: worktree.path,
    branch: worktree.branch,
    baseBranch: worktree.baseBranch,
    commitCount: worktree.commitCount ?? 0,
    filesChanged: worktree.filesChanged ?? 0,
    additions: worktree.additions ?? 0,
    deletions: worktree.deletions ?? 0
  });

  // Open Create PR dialog
  const openCreatePRDialog = (worktree: WorktreeListItem, task: Task) => {
    setPrWorktree(worktree);
    setPrTask(task);
    setShowCreatePRDialog(true);
  };

  const openReviewMergeDialog = (worktree: WorktreeListItem, task: Task) => {
    // If already running for a different task, don't allow starting another
    if (rmIsRunning && reviewMergeTaskId !== task.id) return;
    setReviewMergeWorktree(worktree);
    setReviewMergeTaskId(task.id);
    setShowReviewMergeDialog(true);
  };

  // IPC listeners for review-merge events — active as long as a taskId is set
  useEffect(() => {
    if (!reviewMergeTaskId) return;

    const unsubProgress = window.electronAPI?.onReviewMergeProgress(
      (_taskId: string, progressData: ReviewMergeProgressData) => {
        if (_taskId === reviewMergeTaskId) {
          setRmProgress(progressData);
        }
      }
    );

    const MAX_LOG_ENTRIES = 500;
    const unsubLog = window.electronAPI?.onReviewMergeLog(
      (_taskId: string, entry: ReviewMergeLogEntry) => {
        if (_taskId === reviewMergeTaskId) {
          setRmLogEntries((prev) => {
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
  }, [reviewMergeTaskId]);

  // Start the pipeline when dialog opens for the first time
  useEffect(() => {
    if (!showReviewMergeDialog || !reviewMergeTaskId) return;
    if (rmStartedRef.current) return;
    rmStartedRef.current = true;

    setRmProgress(null);
    setRmResult(null);
    setRmIsRunning(true);
    setRmIsCancelling(false);
    setRmLogEntries([]);

    window.electronAPI?.reviewAndMergeWorktree(reviewMergeTaskId).then((ipcResult) => {
      if (!ipcResult.success && ipcResult.error?.includes('already in progress')) {
        return;
      }
      setRmIsRunning(false);
      if (ipcResult.success && ipcResult.data) {
        setRmResult(ipcResult.data);
        if (ipcResult.data.success) {
          toast({
            title: t('dialogs:worktrees.reviewMergeSuccess'),
            description: ipcResult.data.prUrl
              ? t('dialogs:worktrees.reviewMergePrLink', { url: ipcResult.data.prUrl })
              : ipcResult.data.message,
          });
          loadWorktrees();
        }
      } else {
        setRmResult({
          success: false,
          message: ipcResult.error || t('dialogs:worktrees.reviewMergeUnknownError'),
          logs: ipcResult.data?.logs,
        });
      }
    }).catch((err: unknown) => {
      setRmIsRunning(false);
      setRmResult({
        success: false,
        message: err instanceof Error ? err.message : t('dialogs:worktrees.reviewMergeUnexpectedError'),
      });
    });
  }, [showReviewMergeDialog, reviewMergeTaskId]);

  const handleReviewMergeCancel = useCallback(async () => {
    setRmIsCancelling(true);
    try {
      await window.electronAPI?.cancelReviewMerge(reviewMergeTaskId);
      setRmIsRunning(false);
      setRmResult({ success: false, message: t('dialogs:worktrees.reviewMergeCancelledByUser') });
    } catch {
      // Cancel request failed — pipeline may still be running, clear cancelling state
      setRmIsCancelling(false);
    }
  }, [reviewMergeTaskId, t]);

  const handleReviewMergeDialogChange = useCallback((open: boolean) => {
    setShowReviewMergeDialog(open);
    // Reset everything when dialog closes AND pipeline is not running
    if (!open && !rmIsRunning) {
      rmStartedRef.current = false;
      setReviewMergeWorktree(null);
      setReviewMergeTaskId('');
      setRmProgress(null);
      setRmLogEntries([]);
      setRmResult(null);
    }
  }, [rmIsRunning]);

  const handleReviewMergeDismiss = useCallback(() => {
    // Dismiss the inline banner after completion
    rmStartedRef.current = false;
    setReviewMergeWorktree(null);
    setReviewMergeTaskId('');
    setRmProgress(null);
    setRmLogEntries([]);
    setRmResult(null);
    setRmIsRunning(false);
  }, []);

  // Handle Create PR
  const handleCreatePR = async (options: WorktreeCreatePROptions): Promise<WorktreeCreatePRResult | null> => {
    if (!prTask) return null;

    try {
      const result = await window.electronAPI.createWorktreePR(prTask.id, options);
      if (result.success && result.data) {
        if (result.data.success && result.data.prUrl && !result.data.alreadyExists) {
          // Update task in store
          useTaskStore.getState().updateTask(prTask.id, {
            status: 'done',
            metadata: { ...prTask.metadata, prUrl: result.data.prUrl }
          });
        }
        return result.data;
      }
      // Propagate IPC error; let CreatePRDialog use its i18n fallback
      return { success: false, error: result.error, prUrl: undefined, alreadyExists: false };
    } catch (err) {
      // Propagate actual error message; let CreatePRDialog handle i18n fallback for undefined
      return { success: false, error: err instanceof Error ? err.message : undefined, prUrl: undefined, alreadyExists: false };
    }
  };

  // Handle bulk delete - triggered from selection bar
  const handleBulkDelete = useCallback(() => {
    if (selectedWorktreeIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  }, [selectedWorktreeIds]);

  // Execute bulk delete - called when user confirms in dialog
  const executeBulkDelete = useCallback(async () => {
    if (selectedWorktreeIds.size === 0 || !selectedProject) return;

    setIsBulkDeleting(true);
    const errors: string[] = [];

    // Parse selected IDs and separate by type
    const taskSpecNames: string[] = [];
    const terminalNames: string[] = [];

    selectedWorktreeIds.forEach((id) => {
      if (id.startsWith(TASK_PREFIX)) {
        taskSpecNames.push(id.slice(TASK_PREFIX.length));
      } else if (id.startsWith(TERMINAL_PREFIX)) {
        terminalNames.push(id.slice(TERMINAL_PREFIX.length));
      }
    });

    // Delete task worktrees
    for (const specName of taskSpecNames) {
      const task = findTaskForWorktree(specName);
      const worktree = worktrees.find(w => w.specName === specName);

      try {
        let result;
        if (task) {
          // Normal delete via task ID
          result = await window.electronAPI.discardWorktree(task.id);
        } else if (worktree?.isOrphaned) {
          // Orphaned worktree - delete by spec name directly
          result = await window.electronAPI.discardOrphanedWorktree(projectId, specName);
        } else {
          errors.push(t('common:errors.taskNotFoundForWorktree', { specName }));
          continue;
        }

        if (!result.success) {
          errors.push(result.error || t('common:errors.failedToDeleteTaskWorktree', { specName }));
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : t('common:errors.failedToDeleteTaskWorktree', { specName }));
      }
    }

    // Delete terminal worktrees
    for (const name of terminalNames) {
      const terminalWt = terminalWorktrees.find((wt) => wt.name === name);
      if (!terminalWt) {
        errors.push(t('common:errors.terminalWorktreeNotFound', { name }));
        continue;
      }

      try {
        const result = await window.electronAPI.removeTerminalWorktree(
          selectedProject.path,
          terminalWt.name,
          terminalWt.hasGitBranch // Delete the branch too if it was created
        );
        if (!result.success) {
          errors.push(result.error || t('common:errors.failedToDeleteTerminalWorktree', { name }));
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : t('common:errors.failedToDeleteTerminalWorktree', { name }));
      }
    }

    // Clear selection and refresh list
    setSelectedWorktreeIds(new Set());
    setShowBulkDeleteConfirm(false);
    await loadWorktrees();

    const deletedCount = taskSpecNames.length + terminalNames.length;

    // Show error if any failures occurred, otherwise show success toast
    if (errors.length > 0) {
      setError(`${t('common:errors.bulkDeletePartialFailure')}\n${errors.join('\n')}`);
    } else {
      toast({
        title: t('common:actions.success'),
        description: t('common:worktrees.bulkDeleteSuccess', { count: deletedCount }),
      });
    }

    setIsBulkDeleting(false);
  }, [selectedWorktreeIds, selectedProject, worktrees, terminalWorktrees, projectId, findTaskForWorktree, loadWorktrees, t, toast]);

  // Handle terminal worktree delete
  const handleDeleteTerminalWorktree = async () => {
    if (!terminalWorktreeToDelete || !selectedProject) return;

    setIsDeletingTerminal(true);
    try {
      const result = await window.electronAPI.removeTerminalWorktree(
        selectedProject.path,
        terminalWorktreeToDelete.name,
        terminalWorktreeToDelete.hasGitBranch // Delete the branch too if it was created
      );
      if (result.success) {
        // Refresh worktrees after successful delete
        await loadWorktrees();
        toast({
          title: t('common:actions.success'),
          description: t('common:worktrees.deleteSuccess', { branch: terminalWorktreeToDelete.name }),
        });
        setTerminalWorktreeToDelete(null);
      } else {
        setError(result.error || t('common:errors.failedToDeleteTerminalWorktree', { name: terminalWorktreeToDelete.name }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.failedToDeleteTerminalWorktree', { name: terminalWorktreeToDelete.name }));
    } finally {
      setIsDeletingTerminal(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('dialogs:worktrees.selectProject')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6 worktrees-page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            {t('dialogs:worktrees.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dialogs:worktrees.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={isSelectionMode ? 'worktrees-action-button-active' : 'worktrees-action-button'}
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedWorktreeIds(new Set());
              } else {
                setIsSelectionMode(true);
              }
            }}
          >
            <CheckSquare2 className="h-4 w-4 mr-2" />
            {isSelectionMode ? t('common:selection.done') : t('common:selection.select')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="worktrees-action-button"
            onClick={loadWorktrees}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common:buttons.refresh')}
          </Button>
        </div>
      </div>

      {/* Selection controls bar - visible when selection mode is enabled */}
      {isSelectionMode && totalWorktrees > 0 && (
        <div className="flex items-center justify-between py-2 mb-4 border-b border-border shrink-0 worktrees-selection-bar">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={isAllSelected ? deselectAll : selectAll}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground worktrees-inline-action"
            >
              {/* tri-state icon: isAllSelected -> CheckSquare, isSomeSelected -> Minus, none -> Square */}
              {isAllSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : isSomeSelected ? <Minus className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {isAllSelected ? t('common:selection.clearSelection') : t('common:selection.selectAll')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('common:selection.selectedOfTotal', { selected: selectedCount, total: totalWorktrees })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="worktrees-danger-button"
              disabled={selectedWorktreeIds.size === 0}
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common:buttons.delete')} ({selectedWorktreeIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">{t('common:labels.error')}</p>
              <p className="text-muted-foreground mt-1 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Review & Merge inline progress (visible when dialog is minimized) */}
      {reviewMergeWorktree && !showReviewMergeDialog && (rmIsRunning || rmResult) && (
        <div className={`mb-4 rounded-lg border p-3 ${
          rmResult?.success === false
            ? 'border-destructive/50 bg-destructive/5'
            : rmResult?.success
              ? 'border-success/50 bg-success/5'
              : 'border-primary/30 bg-primary/5'
        }`}>
          <div className="flex items-center gap-3">
            <SearchCheck className={`h-4 w-4 shrink-0 ${
              rmIsRunning ? 'animate-pulse text-primary' : rmResult?.success ? 'text-success' : 'text-destructive'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate">
                  {t('dialogs:worktrees.reviewMergeTitle')} — {reviewMergeWorktree.specName || reviewMergeWorktree.branch}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {rmProgress?.percent ?? 0}%
                </span>
              </div>
              <Progress
                value={rmProgress?.percent ?? 0}
                variant={
                  rmProgress?.stage === 'error' || rmResult?.success === false
                    ? 'destructive'
                    : rmProgress?.stage === 'complete' || rmResult?.success
                      ? 'success'
                      : 'default'
                }
                size="sm"
                animated={rmIsRunning}
              />
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {rmResult
                  ? rmResult.message
                  : rmProgress?.message || t('common:labels.loading')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowReviewMergeDialog(true)}
                title={t('dialogs:worktrees.reviewMergeExpand')}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              {!rmIsRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleReviewMergeDismiss}
                  title={t('dialogs:worktrees.reviewMergeClose')}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && worktrees.length === 0 && terminalWorktrees.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && worktrees.length === 0 && terminalWorktrees.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('dialogs:worktrees.empty')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            {t('dialogs:worktrees.emptyDescription')}
          </p>
        </div>
      )}

      {/* Main content area with scroll */}
      {(worktrees.length > 0 || terminalWorktrees.length > 0) && (
        <ScrollArea className="flex-1 -mx-2">
          <div className="space-y-6 px-2">
            {/* Task Worktrees Section */}
            {worktrees.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  {t('dialogs:worktrees.taskSection')}
                </h3>
                {worktrees.map((worktree) => {
                  const task = findTaskForWorktree(worktree.specName);
                  const taskId = `${TASK_PREFIX}${worktree.specName}`;
                  return (
                    <Card key={worktree.specName} className="overflow-hidden worktrees-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {isSelectionMode && (
                              <Checkbox
                                checked={selectedWorktreeIds.has(taskId)}
                                onCheckedChange={() => toggleWorktree(taskId)}
                                className="mt-1"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-info shrink-0" />
                                <span className="truncate">{worktree.isOrphaned ? t('common:labels.orphaned') : worktree.branch}</span>
                              </CardTitle>
                              {task && (
                                <CardDescription className="mt-1 truncate">
                                  {task.title}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 ml-2 worktrees-chip">
                            {worktree.specName}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 text-sm mb-4 worktrees-stats-row">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FileCode className="h-3.5 w-3.5" />
                            <span>{t('dialogs:worktrees.filesChanged', { count: worktree.filesChanged })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>{t('dialogs:worktrees.commitsAhead', { count: worktree.commitCount })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-success">
                            <Plus className="h-3.5 w-3.5" />
                            <span>{worktree.additions ?? 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-destructive">
                            <Minus className="h-3.5 w-3.5" />
                            <span>{worktree.deletions ?? 0}</span>
                          </div>
                        </div>

                        {/* Branch info */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 rounded-md p-2 worktrees-branch-info">
                          <span className="font-mono">{worktree.baseBranch || t('common:labels.orphaned')}</span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-mono worktrees-branch-target">{worktree.isOrphaned ? t('common:labels.orphaned') : worktree.branch}</span>
                        </div>

                        {/* Pipeline timeline — visible when Review & Merge is active for this worktree */}
                        {reviewMergeWorktree?.specName === worktree.specName && (rmIsRunning || rmResult) && (
                          <ReviewMergeTimeline
                            stage={rmProgress?.stage ?? null}
                            isRunning={rmIsRunning}
                          />
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openMergeDialog(worktree)}
                            disabled={!task}
                          >
                            <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                            {t('dialogs:worktrees.mergeTo', { branch: worktree.baseBranch })}
                          </Button>
                          {task && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openReviewMergeDialog(worktree, task)}
                            >
                              <SearchCheck className="h-3.5 w-3.5 mr-1.5" />
                              {t('dialogs:worktrees.reviewAndMerge')}
                            </Button>
                          )}
                          {task && (
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => openCreatePRDialog(worktree, task)}
                            >
                              <GitPullRequest className="h-3.5 w-3.5 mr-1.5" />
                              {t('common:buttons.createPR')}
                            </Button>
                          )}
                          {task?.status === 'done' && task.metadata?.prUrl && (
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => window.electronAPI?.openExternal(task.metadata?.prUrl ?? '')}
                            >
                              <GitPullRequest className="h-3.5 w-3.5 mr-1.5" />
                              {t('common:buttons.openPR')}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="worktrees-action-button"
                            onClick={() => {
                              // Copy worktree path to clipboard
                              navigator.clipboard.writeText(worktree.path);
                            }}
                          >
                            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                            {t('dialogs:worktrees.copyPath')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="worktrees-danger-button"
                            onClick={() => confirmDelete(worktree)}
                            disabled={!task && !worktree.isOrphaned}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {t('dialogs:worktrees.deleteAction')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Terminal Worktrees Section */}
            {terminalWorktrees.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  {t('dialogs:worktrees.terminalSection')}
                </h3>
                {terminalWorktrees.map((wt) => {
                  const terminalId = `${TERMINAL_PREFIX}${wt.name}`;
                  return (
                    <Card key={wt.name} className="overflow-hidden worktrees-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {isSelectionMode && (
                              <Checkbox
                                checked={selectedWorktreeIds.has(terminalId)}
                                onCheckedChange={() => toggleWorktree(terminalId)}
                                className="mt-1"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FolderGit className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="truncate">{wt.name}</span>
                              </CardTitle>
                              {wt.branchName && (
                                <CardDescription className="mt-1 truncate font-mono text-xs">
                                  {wt.branchName}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          {wt.taskId && (
                            <Badge variant="outline" className="shrink-0 ml-2 worktrees-chip">
                              {wt.taskId}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    <CardContent className="pt-0">
                      {/* Branch info */}
                      {wt.baseBranch && wt.branchName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 rounded-md p-2 worktrees-branch-info">
                          <span className="font-mono">{wt.baseBranch}</span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-mono worktrees-branch-target-secondary">{wt.branchName}</span>
                        </div>
                      )}

                      {/* Created at */}
                      {wt.createdAt && (
                        <div className="text-xs text-muted-foreground mb-4">
                          {t('dialogs:worktrees.createdAt', { date: new Date(wt.createdAt).toLocaleDateString() })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="worktrees-action-button"
                          onClick={() => {
                            // Copy worktree path to clipboard
                            navigator.clipboard.writeText(wt.worktreePath);
                          }}
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                          {t('dialogs:worktrees.copyPath')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="worktrees-danger-button"
                          onClick={() => setTerminalWorktreeToDelete(wt)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          {t('dialogs:worktrees.deleteAction')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              {t('dialogs:worktrees.mergeTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('dialogs:worktrees.mergeDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedWorktree && !mergeResult && (
            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('dialogs:worktrees.mergeSourceBranch')}</span>
                  <span className="font-mono worktrees-branch-target">{selectedWorktree.branch}</span>
                </div>
                <div className="flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('dialogs:worktrees.mergeTargetBranch')}</span>
                  <span className="font-mono">{selectedWorktree.baseBranch}</span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('dialogs:worktrees.mergeChangesLabel')}</span>
                    <span>
                      {t('dialogs:worktrees.mergeChangesSummary', { commits: selectedWorktree.commitCount, files: selectedWorktree.filesChanged })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mergeResult && (
            <div className="py-4">
              <div className={`rounded-lg p-4 text-sm ${
                mergeResult.success
                  ? 'worktrees-result-success'
                  : 'worktrees-result-error'
              }`}>
                <div className="flex items-start gap-2">
                  {mergeResult.success ? (
                    <Check className="h-4 w-4 text-success mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-destructive mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${mergeResult.success ? 'text-success' : 'text-destructive'}`}>
                      {mergeResult.success ? t('dialogs:worktrees.mergeSuccess') : t('dialogs:worktrees.mergeFailed')}
                    </p>
                    <p className="text-muted-foreground mt-1">{mergeResult.message}</p>
                    {mergeResult.conflictFiles && mergeResult.conflictFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">{t('dialogs:worktrees.mergeConflicts')}</p>
                        <ul className="list-disc list-inside text-xs mt-1">
                          {mergeResult.conflictFiles.map(file => (
                            <li key={file} className="font-mono">{file}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              className="worktrees-action-button"
              onClick={() => {
                setShowMergeDialog(false);
                setMergeResult(null);
              }}
            >
              {mergeResult ? t('common:buttons.close') : t('common:buttons.cancel')}
            </Button>
            {!mergeResult && (
              <Button
                onClick={handleMerge}
                disabled={isMerging}
              >
                {isMerging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('dialogs:worktrees.merging')}
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4 mr-2" />
                    {t('dialogs:worktrees.mergeAction')}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !open && !isDeleting && setShowDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs:worktrees.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs:worktrees.deleteDescription')}
              {worktreeToDelete && (
                <span className="block mt-2 font-mono text-sm">
                  {worktreeToDelete.isOrphaned ? t('common:labels.orphaned') : worktreeToDelete.branch}
                </span>
              )}
              {t('dialogs:worktrees.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('dialogs:worktrees.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common:buttons.delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminal Worktree Delete Confirmation Dialog */}
      <AlertDialog open={!!terminalWorktreeToDelete} onOpenChange={(open) => !open && !isDeletingTerminal && setTerminalWorktreeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs:worktrees.deleteTerminalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs:worktrees.deleteTerminalDescription')}
              {terminalWorktreeToDelete && (
                <span className="block mt-2 font-mono text-sm">
                  {terminalWorktreeToDelete.name}
                  {terminalWorktreeToDelete.branchName && (
                    <span className="text-muted-foreground"> ({terminalWorktreeToDelete.branchName})</span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTerminal}>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTerminalWorktree();
              }}
              disabled={isDeletingTerminal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingTerminal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('dialogs:worktrees.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common:buttons.delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={(open) => !open && !isBulkDeleting && setShowBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('dialogs:worktrees.bulkDeleteTitle', { count: selectedWorktreeIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs:worktrees.bulkDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeBulkDelete();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('dialogs:worktrees.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('dialogs:worktrees.deleteSelected')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create PR Dialog */}
      {prTask && prWorktree && (
        <CreatePRDialog
          open={showCreatePRDialog}
          task={prTask}
          worktreeStatus={worktreeToStatus(prWorktree)}
          onOpenChange={setShowCreatePRDialog}
          onCreatePR={handleCreatePR}
        />
      )}

      {/* Review & Merge Dialog */}
      {reviewMergeWorktree && (
        <ReviewMergeDialog
          open={showReviewMergeDialog}
          specName={reviewMergeWorktree.specName || reviewMergeWorktree.branch}
          baseBranch={reviewMergeWorktree.baseBranch || 'main'}
          progress={rmProgress}
          logEntries={rmLogEntries}
          isRunning={rmIsRunning}
          isCancelling={rmIsCancelling}
          result={rmResult}
          onOpenChange={handleReviewMergeDialogChange}
          onCancel={handleReviewMergeCancel}
        />
      )}
    </div>
  );
}
