import chokidar, { type FSWatcher } from 'chokidar';
import { join } from 'node:path';
import type { TeamSyncResource } from '../../shared/types/team-sync';

export interface TeamSyncFileEvent {
  projectId: string;
  projectPath: string;
  absolutePath: string;
  relativePath: string;
  resource: TeamSyncResource;
}

const WATCH_PATTERNS: Array<{ pattern: string; resource: TeamSyncResource }> = [
  { pattern: '.auto-claude/specs/**/implementation_plan.json', resource: 'tasks' },
  { pattern: '.auto-claude/specs/**/task_metadata.json', resource: 'tasks' },
  { pattern: '.auto-claude/specs/**/task_logs.json', resource: 'taskLogs' },
  { pattern: '.auto-claude/specs/**/spec.md', resource: 'tasks' },
  { pattern: '.auto-claude/specs/**/qa_report.md', resource: 'tasks' },
  { pattern: '.auto-claude/roadmap/roadmap.json', resource: 'roadmap' },
  { pattern: '.auto-claude/ideation/ideation.json', resource: 'ideation' },
  { pattern: '.auto-claude/insights/sessions/*.json', resource: 'insights' }
];

const SENSITIVE_BLOCKLIST = ['.env', 'profiles.json', 'credentials.json', 'tokens.json'];

function inferResource(relativePath: string): TeamSyncResource | null {
  for (const entry of WATCH_PATTERNS) {
    const suffix = entry.pattern.split('/**/').at(-1) || entry.pattern;
    if (relativePath.endsWith(suffix.replace('*', ''))) {
      return entry.resource;
    }
  }

  if (relativePath.includes('/roadmap/')) return 'roadmap';
  if (relativePath.includes('/ideation/')) return 'ideation';
  if (relativePath.includes('/insights/')) return 'insights';
  if (relativePath.includes('/specs/')) return 'tasks';
  return null;
}

export class TeamSyncFileWatcher {
  private watchers = new Map<string, FSWatcher>();
  private remoteWritePaths = new Set<string>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly onChange: (event: TeamSyncFileEvent) => Promise<void>) {}

  async watch(projectId: string, projectPath: string): Promise<void> {
    await this.unwatch(projectId);

    const patterns = WATCH_PATTERNS.map(({ pattern }) => join(projectPath, pattern));
    const watcher = chokidar.watch(patterns, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
      ignored: (filePath) => {
        const lower = filePath.toLowerCase();
        return SENSITIVE_BLOCKLIST.some((blocked) => lower.endsWith(blocked));
      }
    });

    const trigger = (absolutePath: string) => {
      if (this.remoteWritePaths.has(absolutePath)) {
        this.remoteWritePaths.delete(absolutePath);
        return;
      }

      const relativePath = absolutePath.startsWith(projectPath)
        ? absolutePath.slice(projectPath.length + 1)
        : absolutePath;
      const resource = inferResource(relativePath);
      if (!resource) return;

      const debounceKey = `${projectId}:${absolutePath}`;
      const existing = this.debounceTimers.get(debounceKey);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(async () => {
        this.debounceTimers.delete(debounceKey);
        await this.onChange({ projectId, projectPath, absolutePath, relativePath, resource });
      }, 500);

      this.debounceTimers.set(debounceKey, timer);
    };

    watcher.on('add', trigger);
    watcher.on('change', trigger);
    watcher.on('unlink', trigger);

    this.watchers.set(projectId, watcher);
  }

  markRemoteWrite(absolutePath: string): void {
    this.remoteWritePaths.add(absolutePath);
  }

  async unwatch(projectId: string): Promise<void> {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(projectId);
    }
  }

  async closeAll(): Promise<void> {
    const entries = Array.from(this.watchers.entries());
    for (const [projectId] of entries) {
      await this.unwatch(projectId);
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}
