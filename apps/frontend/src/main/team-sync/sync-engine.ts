import type { TeamSyncResource, TeamSyncRevision } from '../../shared/types/team-sync';

interface RevisionKey {
  projectId: string;
  resource: TeamSyncResource;
  resourceId: string;
}

function toKey(input: RevisionKey): string {
  return `${input.projectId}:${input.resource}:${input.resourceId}`;
}

export class TeamSyncRevisionEngine {
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
    return incoming.revision > current.revision;
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
