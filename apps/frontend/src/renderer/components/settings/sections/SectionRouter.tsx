import { useTranslation } from 'react-i18next';
import type { Project, ProjectSettings as ProjectSettingsType, AutoBuildVersionInfo, ProjectEnvConfig, LinearSyncStatus, GitHubSyncStatus, GitLabSyncStatus } from '../../../../shared/types';
import { SettingsCard } from '../SettingsCard';
import { GeneralSettings } from '../../project-settings/GeneralSettings';
import { SecuritySettings } from '../../project-settings/SecuritySettings';
import { LinearIntegration } from '../integrations/LinearIntegration';
import { GitHubIntegration } from '../integrations/GitHubIntegration';
import { GitLabIntegration } from '../integrations/GitLabIntegration';
import { InitializationGuard } from '../common/InitializationGuard';
import type { ProjectSettingsCard } from '../ProjectSettingsContent';

interface SectionRouterProps {
  activeSection: ProjectSettingsCard;
  project: Project;
  settings: ProjectSettingsType;
  setSettings: React.Dispatch<React.SetStateAction<ProjectSettingsType>>;
  versionInfo: AutoBuildVersionInfo | null;
  isCheckingVersion: boolean;
  isUpdating: boolean;
  envConfig: ProjectEnvConfig | null;
  isLoadingEnv: boolean;
  envError: string | null;
  updateEnvConfig: (updates: Partial<ProjectEnvConfig>) => void;
  showLinearKey: boolean;
  setShowLinearKey: React.Dispatch<React.SetStateAction<boolean>>;
  showOpenAIKey: boolean;
  setShowOpenAIKey: React.Dispatch<React.SetStateAction<boolean>>;
  showGitHubToken: boolean;
  setShowGitHubToken: React.Dispatch<React.SetStateAction<boolean>>;
  gitHubConnectionStatus: GitHubSyncStatus | null;
  isCheckingGitHub: boolean;
  showGitLabToken: boolean;
  setShowGitLabToken: React.Dispatch<React.SetStateAction<boolean>>;
  gitLabConnectionStatus: GitLabSyncStatus | null;
  isCheckingGitLab: boolean;
  linearConnectionStatus: LinearSyncStatus | null;
  isCheckingLinear: boolean;
  handleInitialize: () => Promise<void>;
  onOpenLinearImport: () => void;
}

/**
 * Routes to the appropriate settings section based on activeSection.
 * Handles initialization guards and section-specific configurations.
 */
export function SectionRouter({
  activeSection,
  project,
  settings,
  setSettings,
  versionInfo,
  isCheckingVersion,
  isUpdating,
  envConfig,
  isLoadingEnv,
  envError,
  updateEnvConfig,
  showLinearKey,
  setShowLinearKey,
  showOpenAIKey,
  setShowOpenAIKey,
  showGitHubToken,
  setShowGitHubToken,
  gitHubConnectionStatus,
  isCheckingGitHub,
  showGitLabToken,
  setShowGitLabToken,
  gitLabConnectionStatus,
  isCheckingGitLab,
  linearConnectionStatus,
  isCheckingLinear,
  handleInitialize,
  onOpenLinearImport
}: SectionRouterProps) {
  const { t } = useTranslation('settings');

  switch (activeSection) {
    case 'general':
      return (
        <SettingsCard
          title="General"
          description={`Configure Auto-Build, agent model, and notifications for ${project.name}`}
          showSaveButton={false}
        >
          <GeneralSettings
            project={project}
            settings={settings}
            setSettings={setSettings}
            versionInfo={versionInfo}
            isCheckingVersion={isCheckingVersion}
            isUpdating={isUpdating}
            handleInitialize={handleInitialize}
          />
        </SettingsCard>
      );

    case 'linear':
      return (
        <SettingsCard
          title={t('projectSections.linear.integrationTitle')}
          description={t('projectSections.linear.integrationDescription')}
          showSaveButton={false}
        >
          <InitializationGuard
            initialized={!!project.autoBuildPath}
            title={t('projectSections.linear.integrationTitle')}
            description={t('projectSections.linear.syncDescription')}
          >
            <LinearIntegration
              envConfig={envConfig}
              updateEnvConfig={updateEnvConfig}
              showLinearKey={showLinearKey}
              setShowLinearKey={setShowLinearKey}
              linearConnectionStatus={linearConnectionStatus}
              isCheckingLinear={isCheckingLinear}
              onOpenLinearImport={onOpenLinearImport}
            />
          </InitializationGuard>
        </SettingsCard>
      );

    case 'github':
      return (
        <SettingsCard
          title={t('projectSections.github.integrationTitle')}
          description={t('projectSections.github.integrationDescription')}
          showSaveButton={false}
        >
          <InitializationGuard
            initialized={!!project.autoBuildPath}
            title={t('projectSections.github.integrationTitle')}
            description={t('projectSections.github.syncDescription')}
          >
            <GitHubIntegration
              envConfig={envConfig}
              updateEnvConfig={updateEnvConfig}
              showGitHubToken={showGitHubToken}
              setShowGitHubToken={setShowGitHubToken}
              gitHubConnectionStatus={gitHubConnectionStatus}
              isCheckingGitHub={isCheckingGitHub}
              projectPath={project.path}
              settings={settings}
              setSettings={setSettings}
            />
          </InitializationGuard>
        </SettingsCard>
      );

    case 'gitlab':
      return (
        <SettingsCard
          title={t('projectSections.gitlab.integrationTitle')}
          description={t('projectSections.gitlab.integrationDescription')}
          showSaveButton={false}
        >
          <InitializationGuard
            initialized={!!project.autoBuildPath}
            title={t('projectSections.gitlab.integrationTitle')}
            description={t('projectSections.gitlab.syncDescription')}
          >
            <GitLabIntegration
              envConfig={envConfig}
              updateEnvConfig={updateEnvConfig}
              showGitLabToken={showGitLabToken}
              setShowGitLabToken={setShowGitLabToken}
              gitLabConnectionStatus={gitLabConnectionStatus}
              isCheckingGitLab={isCheckingGitLab}
              projectPath={project.path}
              settings={settings}
              setSettings={setSettings}
            />
          </InitializationGuard>
        </SettingsCard>
      );

    case 'memory':
      return (
        <SettingsCard
          title={t('projectSections.memory.integrationTitle')}
          description={t('projectSections.memory.integrationDescription')}
          showSaveButton={false}
        >
          <InitializationGuard
            initialized={!!project.autoBuildPath}
            title={t('projectSections.memory.integrationTitle')}
            description={t('projectSections.memory.syncDescription')}
          >
            <SecuritySettings
              envConfig={envConfig}
              settings={settings}
              setSettings={setSettings}
              updateEnvConfig={updateEnvConfig}
              showOpenAIKey={showOpenAIKey}
              setShowOpenAIKey={setShowOpenAIKey}
              expanded={true}
              onToggle={() => {}}
            />
          </InitializationGuard>
        </SettingsCard>
      );

    default:
      return null;
  }
}
