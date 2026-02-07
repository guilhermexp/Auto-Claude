import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
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
import { cn } from '../lib/utils';
import type { InsightsSessionSummary, InsightsModelConfig } from '../../shared/types';
import { InsightsModelSelector } from './InsightsModelSelector';

interface ChatHistorySidebarProps {
  sessions: InsightsSessionSummary[];
  currentSessionId: string | null;
  isLoading: boolean;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onRenameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
  modelConfig?: InsightsModelConfig;
  onModelConfigChange?: (config: InsightsModelConfig) => void;
  isModelSelectorDisabled?: boolean;
}

export function ChatHistorySidebar({
  sessions,
  currentSessionId,
  isLoading,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  modelConfig,
  onModelConfigChange,
  isModelSelectorDisabled
}: ChatHistorySidebarProps) {
  const { t } = useTranslation(['insights', 'common']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const handleStartEdit = (session: InsightsSessionSummary) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async () => {
    if (deleteSessionId) {
      await onDeleteSession(deleteSessionId);
      setDeleteSessionId(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('insights:history.today', 'Today');
    } else if (diffDays === 1) {
      return t('insights:history.yesterday', 'Yesterday');
    } else if (diffDays < 7) {
      return t('insights:history.daysAgo', { count: diffDays, defaultValue: '{{count}} days ago' });
    } else {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const dateLabel = formatDate(session.updatedAt);
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(session);
    return groups;
  }, {} as Record<string, InsightsSessionSummary[]>);

  return (
    <div className="flex h-full flex-col">
      {/* Title - 1Code style */}
      <h2 className="text-lg font-semibold px-2 pb-4 text-foreground">
        {t('insights:chat.title', 'Insights')}
      </h2>

      <ScrollArea className="flex-1">
        {/* New Chat Button */}
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm h-8 font-medium mb-2 insights-new-chat-button"
        >
          <Plus className="h-4 w-4 opacity-50" />
          <span className="truncate">{t('insights:chat.newConversation', 'New Conversation')}</span>
        </button>

        {/* Separator */}
        <div className="border-t border-border/30 mx-1 my-3" />

        {/* Session list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t('insights:history.noConversations', 'No conversations yet')}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
              <div key={dateLabel}>
                {/* Section header - 1Code style */}
                <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateLabel}
                </h3>
                <div className="space-y-0.5">
                  {dateSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      isEditing={editingId === session.id}
                      editTitle={editTitle}
                      onSelect={() => onSelectSession(session.id)}
                      onStartEdit={() => handleStartEdit(session)}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onEditTitleChange={setEditTitle}
                      onDelete={() => setDeleteSessionId(session.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Model Selector at bottom */}
      {onModelConfigChange && (
        <div className="mt-auto pt-4 border-t border-border/30 mx-1">
          <div className="px-1 pb-1">
            <InsightsModelSelector
              currentConfig={modelConfig}
              onConfigChange={onModelConfigChange}
              disabled={isModelSelectorDisabled}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('insights:deleteDialog.title', 'Delete conversation?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('insights:deleteDialog.description', 'This will permanently delete this conversation and all its messages. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common:buttons.delete', 'Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SessionItemProps {
  session: InsightsSessionSummary;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTitleChange: (title: string) => void;
  onDelete: () => void;
}

function SessionItem({
  session,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTitleChange,
  onDelete
}: SessionItemProps) {
  const { t } = useTranslation(['insights', 'common']);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm flex-1"
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onSaveEdit}
          aria-label={t('common:accessibility.saveEditAriaLabel', 'Save')}
        >
          <Check className="h-3.5 w-3.5 text-success" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onCancelEdit}
          aria-label={t('common:accessibility.cancelEditAriaLabel', 'Cancel')}
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  // Session item with semantic tokens
  return (
    <div
      className={cn(
        'group relative cursor-pointer px-3 py-1.5 text-sm font-medium insights-session-item',
        isActive
          ? 'insights-session-item-active text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 pr-6">
        <MessageSquare
          className={cn(
            'h-4 w-4 shrink-0',
            isActive ? 'opacity-100' : 'opacity-50'
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight">
            {session.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">
            {session.messageCount === 1
              ? t('insights:history.messageCount', { count: session.messageCount, defaultValue: '{{count}} message' })
              : t('insights:history.messageCount_plural', { count: session.messageCount, defaultValue: '{{count}} messages' })
            }
          </p>
        </div>
      </div>

      {/* Menu button */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-foreground/10 transition-opacity"
            aria-label={t('common:accessibility.moreOptionsAriaLabel', 'More options')}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={5} className="w-36 z-[100]">
          <DropdownMenuItem onSelect={onStartEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {t('common:buttons.rename', 'Rename')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t('common:buttons.delete', 'Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
