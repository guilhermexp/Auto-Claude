import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { SortableProjectTab } from './SortableProjectTab';
import { UsageIndicator } from './UsageIndicator';
import { AuthStatusIndicator } from './AuthStatusIndicator';
import { TeamSyncButton } from './TeamSyncButton';
import type { Project } from '../../shared/types';

export type ProjectTabActivityState = 'idle' | 'running' | 'ready';

interface ProjectTabBarProps {
  projects: Project[];
  activeProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onProjectClose: (projectId: string) => void;
  onAddProject: () => void;
  activityByProjectId?: Record<string, ProjectTabActivityState>;
  className?: string;
  // Control props for active tab
  onSettingsClick?: () => void;
}

export function ProjectTabBar({
  projects,
  activeProjectId,
  onProjectSelect,
  onProjectClose,
  onAddProject,
  activityByProjectId,
  className,
  onSettingsClick
}: ProjectTabBarProps) {
  const { t } = useTranslation('common');

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Cmd/Ctrl + 1-9: Switch to tab N
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < projects.length) {
          onProjectSelect(projects[index].id);
        }
        return;
      }

      // Cmd/Ctrl + Tab: Next tab
      // Cmd/Ctrl + Shift + Tab: Previous tab
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = projects.findIndex((p) => p.id === activeProjectId);
        if (currentIndex === -1 || projects.length === 0) return;

        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + projects.length) % projects.length
          : (currentIndex + 1) % projects.length;
        onProjectSelect(projects[nextIndex].id);
        return;
      }

      // Cmd/Ctrl + W: Close current tab (only if more than one tab)
      if (e.key === 'w' && activeProjectId && projects.length > 1) {
        e.preventDefault();
        onProjectClose(activeProjectId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projects, activeProjectId, onProjectSelect, onProjectClose]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center h-12 border-b bg-background project-tabbar-shell',
      'overflow-visible',
      className
    )}>
      <div className="min-w-0 flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border/30 scrollbar-track-transparent">
        <div className="flex items-stretch h-full">
          {projects.map((project, index) => {
            const isActiveTab = activeProjectId === project.id;
            return (
              <SortableProjectTab
                key={project.id}
                project={project}
                isActive={isActiveTab}
                canClose={projects.length > 1}
                tabIndex={index}
                onSelect={() => onProjectSelect(project.id)}
                onClose={(e) => {
                  e.stopPropagation();
                  onProjectClose(project.id);
                }}
                activityState={activityByProjectId?.[project.id] ?? 'idle'}
                // Pass control props only for active tab
                onSettingsClick={isActiveTab ? onSettingsClick : undefined}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
        <TeamSyncButton />
        <AuthStatusIndicator />
        <UsageIndicator />
      </div>
      <button
        type="button"
        className="flex items-center justify-center px-4 border-l border-border/14 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors flex-shrink-0 h-full project-tabbar-right-divider"
        onClick={onAddProject}
        aria-label={t('projectTab.addProjectAriaLabel')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
