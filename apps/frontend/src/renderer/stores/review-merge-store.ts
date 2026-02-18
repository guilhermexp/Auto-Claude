import { create } from 'zustand';
import type {
  WorktreeListItem,
  ReviewMergeProgressData,
  ReviewMergeLogEntry,
  ReviewMergeResult,
} from '../../shared/types';
import { debugLog, debugError } from '../../shared/utils/debug-logger';

const MAX_LOG_ENTRIES = 500;

interface ReviewMergeState {
  // State
  dialogOpen: boolean;
  worktree: WorktreeListItem | null;
  taskId: string;
  progress: ReviewMergeProgressData | null;
  logEntries: ReviewMergeLogEntry[];
  isRunning: boolean;
  isCancelling: boolean;
  result: ReviewMergeResult | null;

  // Actions
  openDialog: (worktree: WorktreeListItem, taskId: string) => void;
  setDialogOpen: (open: boolean) => void;
  startProcess: () => void;
  resumeProcess: () => void;
  cancelProcess: () => Promise<void>;
  dismiss: () => void;
}

// IPC listener unsub functions — stored outside React lifecycle
let _unsubProgress: (() => void) | null = null;
let _unsubLog: (() => void) | null = null;
let _started = false;

function setupListeners(taskId: string) {
  cleanupListeners();

  debugLog('[ReviewMergeStore] Setting up IPC listeners for task:', taskId);

  _unsubProgress = window.electronAPI?.onReviewMergeProgress(
    (_taskId: string, progressData: ReviewMergeProgressData) => {
      if (_taskId === taskId) {
        useReviewMergeStore.setState({ progress: progressData });
      }
    }
  ) ?? null;

  _unsubLog = window.electronAPI?.onReviewMergeLog(
    (_taskId: string, entry: ReviewMergeLogEntry) => {
      if (_taskId === taskId) {
        useReviewMergeStore.setState((state) => {
          const updated = [...state.logEntries, entry];
          return {
            logEntries: updated.length > MAX_LOG_ENTRIES
              ? updated.slice(-MAX_LOG_ENTRIES)
              : updated,
          };
        });
      }
    }
  ) ?? null;
}

function cleanupListeners() {
  if (_unsubProgress) {
    _unsubProgress();
    _unsubProgress = null;
  }
  if (_unsubLog) {
    _unsubLog();
    _unsubLog = null;
  }
}

function _launchProcess(taskId: string, resume: boolean) {
  useReviewMergeStore.setState({
    progress: null,
    result: null,
    isRunning: true,
    isCancelling: false,
    logEntries: [],
    dialogOpen: true,
  });

  setupListeners(taskId);

  const options = resume ? { resume: true } : undefined;

  window.electronAPI?.reviewAndMergeWorktree(taskId, options).then((ipcResult) => {
    if (!ipcResult.success && ipcResult.error?.includes('already in progress')) {
      return;
    }

    if (ipcResult.success && ipcResult.data) {
      useReviewMergeStore.setState({ isRunning: false, result: ipcResult.data });
    } else {
      useReviewMergeStore.setState({
        isRunning: false,
        result: {
          success: false,
          message: ipcResult.error || 'Unknown error',
          logs: ipcResult.data?.logs,
        },
      });
    }
  }).catch((err: unknown) => {
    useReviewMergeStore.setState({
      isRunning: false,
      result: {
        success: false,
        message: err instanceof Error ? err.message : 'Unexpected error',
      },
    });
  });
}

function resetState() {
  _started = false;
  cleanupListeners();
  useReviewMergeStore.setState({
    dialogOpen: false,
    worktree: null,
    taskId: '',
    progress: null,
    logEntries: [],
    isRunning: false,
    isCancelling: false,
    result: null,
  });
}

export const useReviewMergeStore = create<ReviewMergeState>((set, get) => ({
  // Initial state
  dialogOpen: false,
  worktree: null,
  taskId: '',
  progress: null,
  logEntries: [],
  isRunning: false,
  isCancelling: false,
  result: null,

  openDialog: (worktree, taskId) => {
    const state = get();
    // If already running for a different task, block
    if (state.isRunning && state.taskId !== taskId) return;

    set({ worktree, taskId, dialogOpen: true });
  },

  setDialogOpen: (open) => {
    if (open) {
      set({ dialogOpen: true });
      return;
    }
    // Closing dialog
    const state = get();
    if (state.isRunning) {
      // Just hide dialog — keep state alive for banner
      set({ dialogOpen: false });
    } else {
      // Pipeline not running — full reset
      resetState();
    }
  },

  startProcess: () => {
    if (_started) return;
    const { taskId } = get();
    if (!taskId) return;

    _started = true;
    debugLog('[ReviewMergeStore] Starting review-merge for task:', taskId);
    _launchProcess(taskId, false);
  },

  resumeProcess: () => {
    const { taskId, worktree } = get();
    if (!taskId || !worktree) return;

    _started = true;
    debugLog('[ReviewMergeStore] Resuming review-merge for task:', taskId);
    _launchProcess(taskId, true);
  },

  cancelProcess: async () => {
    const { taskId } = get();
    set({ isCancelling: true });
    try {
      await window.electronAPI?.cancelReviewMerge(taskId);
      set({
        isRunning: false,
        result: { success: false, message: 'Cancelled by user' },
      });
    } catch (err) {
      debugError('[ReviewMergeStore] Cancel failed:', err);
      // Cancel request failed — pipeline may still be running
      set({ isCancelling: false });
    }
  },

  dismiss: () => {
    resetState();
  },
}));
