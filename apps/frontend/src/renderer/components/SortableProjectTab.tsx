import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { Project } from '../../shared/types';
import type { ProjectTabActivityState } from './ProjectTabBar';

interface SortableProjectTabProps {
  project: Project;
  isActive: boolean;
  canClose: boolean;
  tabIndex: number;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  activityState?: ProjectTabActivityState;
  // Optional control props for active tab
  onSettingsClick?: () => void;
}

// Detect if running on macOS for keyboard shortcut display
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl+';

export function SortableProjectTab({
  project,
  isActive,
  canClose,
  tabIndex,
  onSelect,
  onClose,
  activityState = 'idle',
  onSettingsClick
}: SortableProjectTabProps) {
  const { t } = useTranslation('common');
  // Build tooltip with keyboard shortcut hint (only for tabs 1-9)
  const shortcutHint = tabIndex < 9 ? `${modKey}${tabIndex + 1}` : '';
  const closeShortcut = `${modKey}W`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Prevent z-index stacking issues during drag
    zIndex: isDragging ? 50 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center min-w-0 project-tab-item',
        // Responsive max-widths: smaller on mobile, larger on desktop
        isActive
          ? 'max-w-[190px] sm:max-w-[240px] md:max-w-[310px]'
          : 'max-w-[130px] sm:max-w-[180px] md:max-w-[230px]',
        'touch-none transition-all duration-200',
        isDragging && 'opacity-60 scale-[0.98] shadow-lg'
      )}
      {...attributes}
    >
      <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center gap-1.5 sm:gap-2',
            // Responsive padding: tighter on mobile, normal on desktop
            'px-2.5 sm:px-3 md:px-3.5 py-2',
            'text-xs rounded-none',
            'min-w-0 truncate transition-colors cursor-pointer',
            'border-b-2 border-transparent',
            isActive && [
              'text-foreground border-b-border/80',
              'bg-transparent'
            ],
            !isActive && [
              'text-[11px] text-muted-foreground/72',
              'hover:text-foreground hover:bg-muted/20'
            ]
          )}
          onClick={onSelect}
        >
            {/* Drag handle - visible on hover, hidden on mobile */}
            <div
              {...listeners}
              className={cn(
                'hidden sm:block',
                'opacity-0 group-hover:opacity-70 transition-opacity',
                'cursor-grab active:cursor-grabbing',
                'w-1 h-3 bg-muted-foreground/80 rounded-full flex-shrink-0'
              )}
            />
            <span className={cn(
              'truncate',
              isActive ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground/78'
            )}>
              {project.name}
            </span>
            {activityState === 'running' && (
              <span className="relative inline-flex h-2.5 w-2.5" title={t('projectTab.activityRunning', 'Activity in progress')} aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-sky-500/35 animate-pulse" />
                <span className="absolute inset-0 rounded-full border border-sky-500 border-t-transparent animate-spin" />
              </span>
            )}
            {activityState === 'ready' && (
              <span
                className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_1px_hsl(var(--background))]"
                title={t('projectTab.activityReady', 'New completed activity')}
                aria-hidden="true"
              />
            )}
        </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>{project.name}</span>
          {shortcutHint && (
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border font-mono">
              {shortcutHint}
            </kbd>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Active tab controls - settings and archive, always accessible */}
      {isActive && (
        <div className="flex items-center gap-1 mr-1 flex-shrink-0">
          {/* Settings icon - responsive sizing */}
          {onSettingsClick && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-6 w-6 p-0 rounded-md',
                    'flex items-center justify-center',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-muted/45 transition-colors border border-transparent hover:border-border/40',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettingsClick();
                  }}
                  aria-label={t('projectTab.settings')}
                >
                  <Settings2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{t('projectTab.settings')}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {canClose && (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-6 w-6 p-0 mr-1',
                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                'transition-opacity duration-200 rounded-md flex-shrink-0',
                'hover:bg-destructive hover:text-destructive-foreground',
                'flex items-center justify-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive && 'opacity-100'
              )}
              onClick={onClose}
              aria-label={t('projectTab.closeTabAriaLabel')}
            >
              <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            <span>{t('projectTab.closeTab')}</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border font-mono">
              {closeShortcut}
            </kbd>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
