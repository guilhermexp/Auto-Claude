import { useState, useEffect, useCallback } from 'react';
import { startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Palette,
  Bot,
  FolderOpen,
  Package,
  Bell,
  Settings2,
  Zap,
  Github,
  Database,
  Sparkles,
  Monitor,
  Globe,
  Code,
  Bug,
  Terminal,
  Users
} from 'lucide-react';

// GitLab icon component (lucide-react doesn't have one)
function GitLabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" role="img" aria-labelledby="gitlab-icon-title">
      <title id="gitlab-icon-title">GitLab</title>
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
    </svg>
  );
}
import {
  FullScreenDialog,
  FullScreenDialogContent,
  FullScreenDialogBody,
  FullScreenDialogHeader,
  FullScreenDialogTitle,
  FullScreenDialogDescription
} from '../ui/full-screen-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useSettings } from './hooks/useSettings';
import { ThemeSettings } from './ThemeSettings';
import { DisplaySettings } from './DisplaySettings';
import { LanguageSettings } from './LanguageSettings';
import { GeneralSettings } from './GeneralSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { DevToolsSettings } from './DevToolsSettings';
import { DebugSettings } from './DebugSettings';
import { TerminalFontSettings } from './terminal-font-settings/TerminalFontSettings';
import { AccountSettings } from './AccountSettings';
import { ProjectSelector } from './ProjectSelector';
import { ProjectSettingsContent, ProjectSettingsSection } from './ProjectSettingsContent';
import { useProjectStore } from '../../stores/project-store';
import type { UseProjectSettingsReturn } from '../project-settings/hooks/useProjectSettings';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: AppSection;
  initialProjectSection?: ProjectSettingsSection;
  onRerunWizard?: () => void;
}

// App-level settings sections
export type AppSection = 'appearance' | 'display' | 'language' | 'devtools' | 'terminal-fonts' | 'agent' | 'paths' | 'integrations' | 'accounts' | 'api-profiles' | 'updates' | 'notifications' | 'debug';

interface NavItemConfig<T extends string> {
  id: T;
  icon: React.ElementType;
}

const appNavItemsConfig: NavItemConfig<AppSection>[] = [
  { id: 'appearance', icon: Palette },
  { id: 'display', icon: Monitor },
  { id: 'language', icon: Globe },
  { id: 'devtools', icon: Code },
  { id: 'terminal-fonts', icon: Terminal },
  { id: 'agent', icon: Bot },
  { id: 'paths', icon: FolderOpen },
  { id: 'accounts', icon: Users },
  { id: 'updates', icon: Package },
  { id: 'notifications', icon: Bell },
  { id: 'debug', icon: Bug }
];

const projectNavItemsConfig: NavItemConfig<ProjectSettingsSection>[] = [
  { id: 'general', icon: Settings2 },
  { id: 'linear', icon: Zap },
  { id: 'github', icon: Github },
  { id: 'gitlab', icon: GitLabIcon },
  { id: 'memory', icon: Database }
];

// Simplified navigation item component for 1Code-style sidebar
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, isActive, isDisabled, onClick }: NavItemProps) {
  const handleClick = useCallback(() => {
    // Keep navigation click handlers snappy while large settings trees rerender.
    startTransition(() => {
      onClick();
    });
  }, [onClick]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'settings-nav-item w-full h-9 justify-start gap-2.5 px-2.5 py-1.5 text-sm rounded-md font-normal transition-colors',
        isActive
          ? 'settings-nav-item-active text-foreground'
          : isDisabled
            ? 'opacity-50 cursor-not-allowed text-muted-foreground'
            : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'opacity-90' : 'opacity-60')} />
      <span className="truncate">{label}</span>
    </Button>
  );
}

/**
 * Main application settings dialog container
 * Coordinates app and project settings sections
 * Uses 1Code-style layout with narrow sidebar and card-based content
 */
export function AppSettingsDialog({ open, onOpenChange, initialSection, initialProjectSection, onRerunWizard }: AppSettingsDialogProps) {
  const { t } = useTranslation('settings');
  const { settings, setSettings, isSaving, error, saveSettings, revertTheme, commitTheme } = useSettings();
  const [version, setVersion] = useState<string>('');

  // Track which top-level section is active
  const [activeTopLevel, setActiveTopLevel] = useState<'app' | 'project'>('app');
  const [appSection, setAppSection] = useState<AppSection>(initialSection || 'appearance');
  const [projectSection, setProjectSection] = useState<ProjectSettingsSection>('general');

  // Navigate to initial section when dialog opens with a specific section
  useEffect(() => {
    if (open) {
      if (initialProjectSection) {
        setActiveTopLevel('project');
        setProjectSection(initialProjectSection);
      } else if (initialSection) {
        setActiveTopLevel('app');
        setAppSection(initialSection);
      }
    }
  }, [open, initialSection, initialProjectSection]);

  // Project state
  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const selectProject = useProjectStore((state) => state.selectProject);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Project settings hook state (lifted from child)
  const [projectSettingsHook, setProjectSettingsHook] = useState<UseProjectSettingsReturn | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Load app version on mount
  useEffect(() => {
    window.electronAPI.getAppVersion().then(setVersion);
  }, []);

  // Memoize the callback to avoid infinite loops
  const handleProjectHookReady = useCallback((hook: UseProjectSettingsReturn | null) => {
    setProjectSettingsHook(hook);
    if (hook) {
      setProjectError(hook.error || hook.envError || null);
    } else {
      setProjectError(null);
    }
  }, []);

  // Save handler for app settings sections
  const handleSaveAppSettings = async () => {
    const success = await saveSettings();
    if (success) {
      commitTheme();
    }
  };

  // Save handler for project settings sections
  const handleSaveProjectSettings = async () => {
    if (selectedProject && projectSettingsHook) {
      await projectSettingsHook.handleSave(() => {});
      if (projectSettingsHook.error || projectSettingsHook.envError) {
        setProjectError(projectSettingsHook.error || projectSettingsHook.envError);
      }
    }
  };

  const handleProjectChange = (projectId: string | null) => {
    selectProject(projectId);
  };

  const renderAppSection = () => {
    // Common props for sections that use SettingsCard with save functionality
    const saveProps = {
      onSave: handleSaveAppSettings,
      isSaving,
      error
    };

    switch (appSection) {
      case 'appearance':
        return <ThemeSettings settings={settings} onSettingsChange={setSettings} {...saveProps} />;
      case 'display':
        return <DisplaySettings settings={settings} onSettingsChange={setSettings} {...saveProps} />;
      case 'language':
        return <LanguageSettings settings={settings} onSettingsChange={setSettings} {...saveProps} />;
      case 'devtools':
        return <DevToolsSettings settings={settings} onSettingsChange={setSettings} {...saveProps} />;
      case 'terminal-fonts':
        return <TerminalFontSettings />;
      case 'agent':
        return <GeneralSettings settings={settings} onSettingsChange={setSettings} section="agent" {...saveProps} />;
      case 'paths':
        return <GeneralSettings settings={settings} onSettingsChange={setSettings} section="paths" {...saveProps} />;
      case 'integrations':
      case 'api-profiles':
      case 'accounts':
        // Legacy section ids ("integrations"/"api-profiles") now route to the unified Accounts screen
        return <AccountSettings settings={settings} onSettingsChange={setSettings} isOpen={open} />;
      case 'updates':
        return <AdvancedSettings settings={settings} onSettingsChange={setSettings} section="updates" version={version} {...saveProps} />;
      case 'notifications':
        return <AdvancedSettings settings={settings} onSettingsChange={setSettings} section="notifications" version={version} {...saveProps} />;
      case 'debug':
        return <DebugSettings />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (activeTopLevel === 'app') {
      return renderAppSection();
    }
    return (
      <ProjectSettingsContent
        project={selectedProject}
        activeSection={projectSection}
        isOpen={open}
        onHookReady={handleProjectHookReady}
      />
    );
  };

  // Determine if project nav items should be disabled
  const projectNavDisabled = !selectedProjectId;

  return (
    <FullScreenDialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Dialog is being closed (via X, escape, or overlay click)
        // Revert any unsaved theme changes
        revertTheme();
      }
      onOpenChange(newOpen);
    }}>
      <FullScreenDialogContent className="settings-modal-shell w-[95vw] max-w-[1400px] h-[88vh] max-h-[920px]">
        <FullScreenDialogHeader className="sr-only">
          <FullScreenDialogTitle>{t('title')}</FullScreenDialogTitle>
          <FullScreenDialogDescription>
            {t('description', { defaultValue: 'Configure application and project settings.' })}
          </FullScreenDialogDescription>
        </FullScreenDialogHeader>
        <FullScreenDialogBody className="p-0">
          <div className="settings-modal worktrees-page flex h-full min-h-0 bg-background">
            {/* Navigation sidebar - 1Code style: narrow, darker background */}
            <nav className="w-[360px] min-w-0 max-w-[360px] flex-[0_0_360px] py-4 flex flex-col bg-sidebar border-r border-border/30 box-border min-h-0">
              {/* Title */}
              <h2 className="text-lg font-semibold px-4 pb-4 text-foreground">
                {t('title')}
              </h2>

              <ScrollArea className="settings-scroll-area flex-1 min-h-0 w-full max-w-full px-4 box-border">
                <div className="space-y-4 w-full max-w-full box-border pr-1">
                  {/* APPLICATION Section */}
                  <div>
                    <h3 className="mb-2 px-2 text-sm font-medium text-muted-foreground">
                      {t('tabs.app')}
                    </h3>
                    <div className="space-y-0.5 pr-1">
                      {appNavItemsConfig.map((item) => (
                        <NavItem
                          key={item.id}
                          icon={item.icon}
                          label={t(`sections.${item.id}.title`)}
                          isActive={activeTopLevel === 'app' && appSection === item.id}
                          onClick={() => {
                            setActiveTopLevel('app');
                            setAppSection(item.id);
                          }}
                        />
                      ))}

                      {/* Re-run Wizard button */}
                      {onRerunWizard && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            onRerunWizard();
                          }}
                          className={cn(
                            'settings-nav-item w-full h-9 justify-start gap-2.5 px-2.5 py-1.5 text-sm rounded-md font-normal transition-colors mt-1',
                            'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Sparkles className="h-4 w-4 opacity-60" />
                          <span className="truncate">{t('actions.rerunWizard')}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="settings-divider border-t border-border/30 mx-2" />

                  {/* PROJECT Section */}
                  <div>
                    <h3 className="mb-2 px-2 text-sm font-medium text-muted-foreground">
                      {t('tabs.project')}
                    </h3>

                    {/* Project Selector */}
                    <div className="mb-2">
                      <ProjectSelector
                        selectedProjectId={selectedProjectId}
                        onProjectChange={handleProjectChange}
                      />
                    </div>

                    {/* Project Nav Items */}
                    <div className="space-y-0.5 pr-1">
                      {projectNavItemsConfig.map((item) => (
                        <NavItem
                          key={item.id}
                          icon={item.icon}
                          label={t(`projectSections.${item.id}.title`)}
                          isActive={activeTopLevel === 'project' && projectSection === item.id}
                          isDisabled={projectNavDisabled}
                          onClick={() => {
                            setActiveTopLevel('project');
                            setProjectSection(item.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Version at bottom */}
              {version && (
                <div className="settings-divider mt-auto pt-4 border-t border-border/30 mx-2">
                  <p className="text-xs text-muted-foreground text-center">
                    {t('updates.version')} {version}
                  </p>
                </div>
              )}
            </nav>

            {/* Main content - 1Code style: card-based with rounded corners */}
            <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden py-5 px-5 md:py-6 md:px-6 flex flex-col">
              <ScrollArea className="settings-scroll-area flex-1 min-h-0 px-1 py-1 md:px-2" viewportClassName="settings-scroll-viewport">
                <div className="mx-auto w-full max-w-[1080px]">
                  {renderContent()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </FullScreenDialogBody>
      </FullScreenDialogContent>
    </FullScreenDialog>
  );
}
