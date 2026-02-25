import { EventEmitter } from 'node:events';
import type { TeamSyncResource, TeamSyncRevision } from '../../shared/types/team-sync';

interface RevisionKey {
  projectId: string;
  resource: TeamSyncResource;
  resourceId: string;
}

function toKey(input: RevisionKey): string {
  return `${input.projectId}:${input.resource}:${input.resourceId}`;
}

export class TeamSyncRevisionEngine extends EventEmitter {
  private revisions = new Map<string, TeamSyncRevision>();

  get(input: RevisionKey): TeamSyncRevision | undefined {
    return this.revisions.get(toKey(input));
  }

  set(input: RevisionKey, revision: TeamSyncRevision): void {
    this.revisions.set(toKey(input), revision);
  }

  shouldApplyRemote(input: RevisionKey, incoming: TeamSyncRevision): boolean {
    const current = this.get(input);
    if (!current) return true;
    if (incoming.revision > current.revision) return true;

    // Conflict detected — remote update is not newer than local
    console.warn(
      `[team-sync] Conflict: dropping remote update for ${input.resource}/${input.resourceId}` +
      ` (remote rev=${incoming.revision}, local rev=${current.revision}, remote by=${incoming.updatedBy})`
    );
    this.emit('conflict', {
      key: toKey(input),
      resource: input.resource,
      resourceId: input.resourceId,
      localRevision: current.revision,
      remoteRevision: incoming.revision,
      remoteUpdatedBy: incoming.updatedBy,
    });
    return false;
  }

  shouldPushLocal(input: RevisionKey, localRevision: number): boolean {
    const current = this.get(input);
    if (!current) return true;
    return localRevision > current.revision;
  }

  applyRemoteIfNewer(input: RevisionKey, incoming: TeamSyncRevision): boolean {
    if (!this.shouldApplyRemote(input, incoming)) {
      return false;
    }
    this.set(input, incoming);
    return true;
  }
}
