import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type {
  InsightsActionProposal,
  InsightsActionResult,
  InsightsKanbanSnapshot,
  InsightsKanbanTargetSelector,
  InsightsKanbanTaskSummary,
  Task
} from '../../shared/types';
import { projectStore } from '../project-store';
import { AgentManager } from '../agent';
import { findTaskWorktree } from '../worktree-paths';
import { cleanupWorktree } from '../utils/worktree-cleanup';
import { findAllSpecPaths } from '../utils/spec-path-helpers';
import { getSpecsDir } from '../../shared/constants';
import { taskStateManager } from '../task-state-manager';
import { checkGitStatus } from '../project-initializer';
import { initializeClaudeProfileManager } from '../claude-profile-manager';

const MAX_BATCH_SIZE = 20;

function toSummary(task: Task): InsightsKanbanTaskSummary {
  return {
    specId: task.specId,
    title: task.title,
    status: task.status,
    reviewReason: task.reviewReason
  };
}

export class TaskControlService {
  constructor(private readonly agentManager: AgentManager) {}

  getKanbanSnapshot(projectId: string): InsightsKanbanSnapshot {
    const tasks = projectStore.getTasks(projectId);
    const counts = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      projectId,
      asOf: new Date().toISOString(),
      counts,
      queue: tasks.filter(t => t.status === 'queue').map(toSummary),
      inProgress: tasks.filter(t => t.status === 'in_progress').map(toSummary),
      humanReview: tasks.filter(t => t.status === 'human_review').map(toSummary),
      error: tasks.filter(t => t.status === 'error').map(toSummary)
    };
  }

  resolveTargets(projectId: string, selector?: InsightsKanbanTargetSelector): string[] {
    const tasks = projectStore.getTasks(projectId);
    if (!selector) return [];

    const limit = Math.max(1, Math.min(selector.limit ?? MAX_BATCH_SIZE, MAX_BATCH_SIZE));

    if (selector.specIds?.length) {
      const wanted = new Set(selector.specIds.map(id => id.trim()).filter(Boolean));
      const ids = tasks
        .filter(task => wanted.has(task.specId) || wanted.has(task.id))
        .map(task => task.specId);
      return Array.from(new Set(ids)).slice(0, limit);
    }

    const filter = selector.filter;
    if (!filter || filter === 'all') {
      return tasks.map(task => task.specId).slice(0, limit);
    }

    return tasks
      .filter(task => task.status === filter)
      .map(task => task.specId)
      .slice(0, limit);
  }

  async executeIntent(projectId: string, proposal: InsightsActionProposal): Promise<InsightsActionResult> {
    const resolvedSpecIds = proposal.resolvedSpecIds?.length
      ? proposal.resolvedSpecIds.slice(0, MAX_BATCH_SIZE)
      : this.resolveTargets(projectId, proposal.targets);
    console.log('[INSIGHTS_KANBAN] execute-intent-start', {
      projectId,
      actionId: proposal.actionId,
      intent: proposal.intent,
      requiresConfirmation: proposal.requiresConfirmation,
      resolvedSpecIds,
      selector: proposal.targets
    });

    const failed: Array<{ specId: string; error: string }> = [];
    const executedSpecIds: string[] = [];

    const runForEach = async (fn: (task: Task) => Promise<void>): Promise<void> => {
      const tasksBySpec = new Map(projectStore.getTasks(projectId).map(task => [task.specId, task]));
      for (const specId of resolvedSpecIds) {
        const task = tasksBySpec.get(specId);
        if (!task) {
          failed.push({ specId, error: 'Task not found in active project' });
          continue;
        }

        try {
          await fn(task);
          executedSpecIds.push(specId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[INSIGHTS_KANBAN] task-operation-failed', {
            projectId,
            actionId: proposal.actionId,
            intent: proposal.intent,
            specId,
            error: errorMessage
          });
          failed.push({
            specId,
            error: errorMessage
          });
        }
      }
    };

    switch (proposal.intent) {
      case 'status_summary':
      case 'queue_count':
      case 'in_progress_count':
      case 'list_human_review':
      case 'list_errors':
        break;
      case 'start_tasks':
        await runForEach(async (task) => this.startTask(projectId, task));
        break;
      case 'stop_tasks':
        await runForEach(async (task) => this.stopTask(projectId, task));
        break;
      case 'delete_tasks':
        await runForEach(async (task) => this.deleteTask(projectId, task));
        break;
      case 'review_tasks':
        await runForEach(async (task) => this.approveTask(projectId, task));
        break;
      default:
        break;
    }

    projectStore.invalidateTasksCache(projectId);
    const snapshotAfter = this.getKanbanSnapshot(projectId);

    const baseSummary =
      proposal.intent === 'status_summary'
        ? this.buildStatusSummary(snapshotAfter)
        : proposal.intent === 'queue_count'
          ? `Queue: ${snapshotAfter.counts.queue ?? 0} task(s).`
          : proposal.intent === 'in_progress_count'
            ? `In progress: ${snapshotAfter.counts.in_progress ?? 0} task(s).`
            : proposal.intent === 'list_human_review'
              ? `Human review: ${snapshotAfter.counts.human_review ?? 0} task(s).`
              : proposal.intent === 'list_errors'
                ? `Errors: ${snapshotAfter.counts.error ?? 0} task(s).`
                : executedSpecIds.length > 0
                  ? `Executed on ${executedSpecIds.length} task(s): ${executedSpecIds.join(', ')}.`
                  : 'No tasks were executed.';

    const success = failed.length === 0;
    const summary = failed.length > 0
      ? `${baseSummary} Failures: ${failed.map(item => `${item.specId} (${item.error})`).join('; ')}`
      : baseSummary;
    console.log('[INSIGHTS_KANBAN] execute-intent-finish', {
      projectId,
      actionId: proposal.actionId,
      intent: proposal.intent,
      success,
      executedCount: executedSpecIds.length,
      failedCount: failed.length
    });

    return {
      actionId: proposal.actionId,
      intent: proposal.intent,
      success,
      summary,
      executedSpecIds,
      failed,
      snapshot: snapshotAfter
    };
  }

  private buildStatusSummary(snapshot: InsightsKanbanSnapshot): string {
    const queue = snapshot.counts.queue ?? 0;
    const inProgress = snapshot.counts.in_progress ?? 0;
    const humanReview = snapshot.counts.human_review ?? 0;
    const errors = snapshot.counts.error ?? 0;
    return `Board summary: queue=${queue}, in_progress=${inProgress}, human_review=${humanReview}, errors=${errors}.`;
  }

  private async ensureExecutionPrerequisites(projectPath: string): Promise<void> {
    const git = checkGitStatus(projectPath);
    if (!git.isGitRepo) {
      throw new Error('Project has no git repository initialized');
    }
    if (!git.hasCommits) {
      throw new Error('Git repository has no initial commit');
    }

    const profileManager = await initializeClaudeProfileManager();
    if (!profileManager.hasValidAuth()) {
      throw new Error('Claude not authenticated');
    }
  }

  private async startTask(projectId: string, task: Task): Promise<void> {
    const project = projectStore.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (this.agentManager.isRunning(task.id)) {
      return;
    }

    await this.ensureExecutionPrerequisites(project.path);

    const specsBaseDir = getSpecsDir(project.autoBuildPath);
    const specDir = path.join(project.path, specsBaseDir, task.specId);
    const specFilePath = path.join(specDir, 'spec.md');
    const baseBranch = task.metadata?.baseBranch || project.settings?.mainBranch;

    taskStateManager.handleManualStatusChange(task.id, 'in_progress', task, project);

    if (!existsSync(specFilePath)) {
      await this.agentManager.startSpecCreation(
        task.id,
        project.path,
        task.description || task.title,
        specDir,
        task.metadata,
        baseBranch,
        project.id
      );
      return;
    }

    await this.agentManager.startTaskExecution(
      task.id,
      project.path,
      task.specId,
      {
        parallel: false,
        workers: 1,
        baseBranch,
        useWorktree: task.metadata?.useWorktree,
        useLocalBranch: task.metadata?.useLocalBranch
      },
      project.id
    );
  }

  private async stopTask(projectId: string, task: Task): Promise<void> {
    const project = projectStore.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    this.agentManager.killTask(task.id);
    taskStateManager.handleManualStatusChange(task.id, 'backlog', task, project);
  }

  private async approveTask(projectId: string, task: Task): Promise<void> {
    const project = projectStore.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    taskStateManager.handleUiEvent(task.id, { type: 'MARK_DONE' }, task, project);
  }

  private async deleteTask(projectId: string, task: Task): Promise<void> {
    const project = projectStore.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    if (this.agentManager.isRunning(task.id)) {
      throw new Error('Task is running');
    }

    const worktreePath = findTaskWorktree(project.path, task.specId);
    if (worktreePath) {
      await cleanupWorktree({
        worktreePath,
        projectPath: project.path,
        specId: task.specId,
        logPrefix: '[INSIGHTS_TASK_CONTROL]',
        deleteBranch: true
      });
    }

    const specsBaseDir = getSpecsDir(project.autoBuildPath);
    const specPaths = findAllSpecPaths(project.path, specsBaseDir, task.specId);
    for (const specDir of specPaths) {
      await rm(specDir, { recursive: true, force: true });
    }
  }
}
