import { AlertTriangle, GitMerge, GitCommit, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { getSeverityIcon, getSeverityVariant } from './utils';
import type { MergeConflict, MergeStats, GitConflictInfo } from '../../../../shared/types';

interface ConflictDetailsDialogProps {
  open: boolean;
  mergePreview: { files: string[]; conflicts: MergeConflict[]; summary: MergeStats; gitConflicts?: GitConflictInfo } | null;
  stageOnly: boolean;
  onOpenChange: (open: boolean) => void;
  onMerge: () => void;
}

/**
 * Dialog displaying detailed information about merge conflicts and branch status
 */
export function ConflictDetailsDialog({
  open,
  mergePreview,
  stageOnly,
  onOpenChange,
  onMerge
}: ConflictDetailsDialogProps) {
  const hasAIConflicts = mergePreview && mergePreview.conflicts.length > 0;
  const gitConflicts = mergePreview?.gitConflicts;
  const isBranchBehind = gitConflicts?.needsRebase && (gitConflicts?.commitsBehind || 0) > 0;
  const hasPathMappedMerges = (mergePreview?.summary?.pathMappedAIMergeCount || 0) > 0;

  // Determine dialog title and description based on the actual situation
  const getTitle = () => {
    if (hasAIConflicts) return 'Merge Conflicts Preview';
    if (isBranchBehind) return 'Branch Behind';
    return 'Merge Status';
  };

  const getDescription = () => {
    if (hasAIConflicts) {
      const count = mergePreview?.conflicts.length || 0;
      const autoMergeable = mergePreview?.summary?.autoMergeable || 0;
      let desc = `${count} potential conflict${count !== 1 ? 's' : ''} detected.`;
      if (autoMergeable > 0) {
        desc += ` ${autoMergeable} can be auto-merged.`;
      }
      return desc;
    }
    if (isBranchBehind) {
      return `Branch ${gitConflicts?.baseBranch || 'main'} has ${gitConflicts?.commitsBehind} new commits since this build started.`;
    }
    return 'No issues detected.';
  };

  const getTitleIcon = () => {
    if (hasAIConflicts) return <AlertTriangle className="h-5 w-5 text-warning" />;
    if (isBranchBehind) return <GitCommit className="h-5 w-5 text-warning" />;
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getTitleIcon()}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-auto min-h-0 -mx-6 px-6">
          {/* AI Conflicts List */}
          {hasAIConflicts ? (
            <div className="space-y-3">
              {mergePreview!.conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border",
                    conflict.canAutoMerge
                      ? "bg-secondary/30 border-border"
                      : conflict.severity === 'high' || conflict.severity === 'critical'
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-warning/10 border-warning/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getSeverityIcon(conflict.severity)}
                      <span className="text-sm font-mono truncate">{conflict.file}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', getSeverityVariant(conflict.severity))}
                      >
                        {conflict.severity}
                      </Badge>
                      {conflict.canAutoMerge && (
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                          auto-merge
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {conflict.location && (
                      <div><span className="text-foreground/70">Location:</span> {conflict.location}</div>
                    )}
                    {conflict.reason && (
                      <div><span className="text-foreground/70">Reason:</span> {conflict.reason}</div>
                    )}
                    {conflict.strategy && (
                      <div><span className="text-foreground/70">Strategy:</span> {conflict.strategy}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : isBranchBehind ? (
            /* Branch Behind Details */
            <div className="space-y-3">
              <div className="p-3 rounded-lg border bg-warning/10 border-warning/20 text-sm">
                <p className="text-muted-foreground">
                  No file conflicts were detected, but the AI will rebase your changes onto the latest{' '}
                  <code className="bg-background/80 px-1 py-0.5 rounded text-xs">{gitConflicts?.baseBranch || 'main'}</code>{' '}
                  to ensure compatibility.
                </p>
                {hasPathMappedMerges && (
                  <p className="text-warning mt-2">
                    {mergePreview?.summary?.pathMappedAIMergeCount} file{(mergePreview?.summary?.pathMappedAIMergeCount || 0) !== 1 ? 's' : ''} need AI merge due to renames.
                  </p>
                )}
              </div>
              {gitConflicts?.conflictingFiles && gitConflicts.conflictingFiles.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Files requiring merge:</span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {gitConflicts.conflictingFiles.map((file, idx) => (
                      <li key={idx} className="truncate font-mono">{file}</li>
                    ))}
                  </ul>
                </div>
              )}
              {gitConflicts?.pathMappedAIMerges && gitConflicts.pathMappedAIMerges.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Renamed files:</span>
                  <ul className="mt-1 space-y-1">
                    {gitConflicts.pathMappedAIMerges.map((pm, idx) => (
                      <li key={idx} className="font-mono truncate">
                        <span className="text-destructive">{pm.oldPath}</span>
                        <span className="mx-1">→</span>
                        <span className="text-success">{pm.newPath}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-muted-foreground text-sm">
              <CheckCircle className="h-5 w-5 text-success mx-auto mb-2" />
              No conflicts detected — ready to merge.
            </div>
          )}
        </div>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(false);
              onMerge();
            }}
            className={cn(
              isBranchBehind || hasAIConflicts
                ? "bg-warning text-warning-foreground hover:bg-warning/90"
                : "bg-success text-success-foreground hover:bg-success/90"
            )}
          >
            <GitMerge className="mr-2 h-4 w-4" />
            {hasAIConflicts || isBranchBehind
              ? (stageOnly ? 'Stage with AI Merge' : 'Merge with AI')
              : (stageOnly ? 'Stage Changes' : 'Merge')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
