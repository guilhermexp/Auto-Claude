import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { SettingsCard } from './SettingsCard';
import { AgentProfileSettings } from './AgentProfileSettings';
import {
  AVAILABLE_MODELS,
  THINKING_LEVELS,
  DEFAULT_FEATURE_MODELS,
  DEFAULT_FEATURE_THINKING,
  FEATURE_LABELS
} from '../../../shared/constants';
import type {
  AppSettings,
  AuthRoutingMode,
  ClaudeProfile,
  FeatureAuthProfileConfig,
  FeatureModelConfig,
  ModelTypeShort,
  ThinkingLevel,
  ToolDetectionResult,
  APIProfile
} from '../../../shared/types';

interface GeneralSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  section: 'agent' | 'paths';
  onSave?: () => void;
  isSaving?: boolean;
  error?: string | null;
}

type AuthFeatureKey = keyof FeatureAuthProfileConfig;

interface AccountOption {
  id: string;
  label: string;
}

const FEATURE_AUTH_LABELS: Record<AuthFeatureKey, { label: string; description: string }> = {
  tasks: { label: 'Tasks', description: 'Kanban task pipeline (spec/planning/coding/qa)' },
  insights: { label: 'Insights Chat', description: 'Ask questions about your codebase' },
  ideation: { label: 'Ideation', description: 'Generate feature ideas and improvements' },
  roadmap: { label: 'Roadmap', description: 'Create strategic feature roadmaps' },
  githubIssues: { label: 'GitHub Issues', description: 'Automated issue triage and labeling' },
  githubPrs: { label: 'GitHub PR Review', description: 'AI-powered pull request reviews' },
  utility: { label: 'Utility', description: 'Commit messages and merge conflict resolution' },
};

const FEATURE_AUTH_KEYS: AuthFeatureKey[] = [
  'tasks',
  'insights',
  'ideation',
  'roadmap',
  'githubIssues',
  'githubPrs',
  'utility',
];

const USE_GLOBAL_AUTH_OPTION = '__use_global_auth_default__';

/**
 * Helper component to display auto-detected CLI tool information
 */
interface ToolDetectionDisplayProps {
  info: ToolDetectionResult | null;
  isLoading: boolean;
  t: (key: string) => string;
}

function ToolDetectionDisplay({ info, isLoading, t }: ToolDetectionDisplayProps) {
  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground mt-1">
        Detecting...
      </div>
    );
  }

  if (!info || !info.found) {
    return (
      <div className="text-xs text-muted-foreground mt-1">
        {t('general.notDetected')}
      </div>
    );
  }

  const getSourceLabel = (source: ToolDetectionResult['source']): string => {
    const sourceMap: Record<ToolDetectionResult['source'], string> = {
      'user-config': t('general.sourceUserConfig'),
      'venv': t('general.sourceVenv'),
      'homebrew': t('general.sourceHomebrew'),
      'nvm': t('general.sourceNvm'),
      'system-path': t('general.sourceSystemPath'),
      'bundled': t('general.sourceBundled'),
      'fallback': t('general.sourceFallback'),
    };
    return sourceMap[source] || source;
  };

  return (
    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
      <div>
        <span className="font-medium">{t('general.detectedPath')}:</span>{' '}
        <code className="bg-muted px-1 py-0.5 rounded">{info.path}</code>
      </div>
      {info.version && (
        <div>
          <span className="font-medium">{t('general.detectedVersion')}:</span>{' '}
          {info.version}
        </div>
      )}
      <div>
        <span className="font-medium">{t('general.detectedSource')}:</span>{' '}
        {getSourceLabel(info.source)}
      </div>
    </div>
  );
}

/**
 * General settings component for agent configuration and paths
 */
export function GeneralSettings({ settings, onSettingsChange, section, onSave, isSaving, error }: GeneralSettingsProps) {
  const { t } = useTranslation('settings');
  const [toolsInfo, setToolsInfo] = useState<{
    python: ToolDetectionResult;
    git: ToolDetectionResult;
    gh: ToolDetectionResult;
    glab: ToolDetectionResult;
    claude: ToolDetectionResult;
  } | null>(null);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [authAccountOptions, setAuthAccountOptions] = useState<AccountOption[]>([]);

  // Fetch CLI tools detection info when component mounts (paths section only)
  useEffect(() => {
    if (section === 'paths') {
      setIsLoadingTools(true);
      window.electronAPI
        .getCliToolsInfo()
        .then((result: { success: boolean; data?: { python: ToolDetectionResult; git: ToolDetectionResult; gh: ToolDetectionResult; glab: ToolDetectionResult; claude: ToolDetectionResult } }) => {
          if (result.success && result.data) {
            setToolsInfo(result.data);
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to fetch CLI tools info:', error);
        })
        .finally(() => {
          setIsLoadingTools(false);
        });
    }
  }, [section]);

  useEffect(() => {
    if (section !== 'agent') return;

    const loadAuthAccountOptions = async () => {
      try {
        const [claudeProfilesResult, apiProfilesResult] = await Promise.all([
          window.electronAPI.getClaudeProfiles(),
          window.electronAPI.getAPIProfiles(),
        ]);

        const options: AccountOption[] = [];
        const pushOAuthOptions = (profiles: ClaudeProfile[]) => {
          for (const profile of profiles) {
            options.push({
              id: `oauth-${profile.id}`,
              label: `${profile.name} (OAuth)`,
            });
          }
        };
        const pushAPIOptions = (profiles: APIProfile[]) => {
          for (const profile of profiles) {
            options.push({
              id: `api-${profile.id}`,
              label: `${profile.name} (API)`,
            });
          }
        };

        if (claudeProfilesResult.success && claudeProfilesResult.data) {
          const profiles = claudeProfilesResult.data.profiles || [];
          const activeId = claudeProfilesResult.data.activeProfileId;
          if (activeId) {
            const active = profiles.find((p) => p.id === activeId);
            if (active) pushOAuthOptions([active]);
          }
          pushOAuthOptions(profiles.filter((p) => p.id !== activeId));
        }

        if (apiProfilesResult.success && apiProfilesResult.data) {
          const profiles = apiProfilesResult.data.profiles || [];
          const activeId = apiProfilesResult.data.activeProfileId;
          if (activeId) {
            const active = profiles.find((p) => p.id === activeId);
            if (active) pushAPIOptions([active]);
          }
          pushAPIOptions(profiles.filter((p) => p.id !== activeId));
        }

        setAuthAccountOptions(options);
      } catch (loadError) {
        console.error('Failed to load auth account options:', loadError);
        setAuthAccountOptions([]);
      }
    };

    loadAuthAccountOptions();
  }, [section]);

  if (section === 'agent') {
    return (
      <div className="space-y-6">
        {/* Agent Profile Selection */}
        <AgentProfileSettings onSave={onSave} isSaving={isSaving} error={error} />

        {/* Other Agent Settings */}
        <SettingsCard
          title={t('general.otherAgentSettings')}
          description={t('general.otherAgentSettingsDescription')}
          onSave={onSave}
          isSaving={isSaving}
          error={error}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="agentFramework" className="text-sm font-medium text-foreground">{t('general.agentFramework')}</Label>
              <p className="text-sm text-muted-foreground">{t('general.agentFrameworkDescription')}</p>
              <Select
                value={settings.agentFramework}
                onValueChange={(value) => onSettingsChange({ ...settings, agentFramework: value })}
              >
                <SelectTrigger id="agentFramework" className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-claude">{t('general.agentFrameworkAutoClaude')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="autoNameTerminals" className="text-sm font-medium text-foreground">
                    {t('general.aiTerminalNaming')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('general.aiTerminalNamingDescription')}
                  </p>
                </div>
                <Switch
                  id="autoNameTerminals"
                  checked={settings.autoNameTerminals}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, autoNameTerminals: checked })}
                />
              </div>
            </div>

            {/* Feature Model Configuration */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">{t('general.featureModelSettings')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('general.featureModelSettingsDescription')}
                </p>
              </div>

              {(Object.keys(FEATURE_LABELS) as Array<keyof FeatureModelConfig>).map((feature) => {
                const featureModels = settings.featureModels || DEFAULT_FEATURE_MODELS;
                const featureThinking = settings.featureThinking || DEFAULT_FEATURE_THINKING;

                return (
                  <div key={feature} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">
                        {FEATURE_LABELS[feature].label}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {FEATURE_LABELS[feature].description}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      {/* Model Select */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('general.model')}</Label>
                        <Select
                          value={featureModels[feature]}
                          onValueChange={(value) => {
                            const newFeatureModels = { ...featureModels, [feature]: value as ModelTypeShort };
                            onSettingsChange({ ...settings, featureModels: newFeatureModels });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Thinking Level Select */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('general.thinkingLevel')}</Label>
                        <Select
                          value={featureThinking[feature]}
                          onValueChange={(value) => {
                            const newFeatureThinking = { ...featureThinking, [feature]: value as ThinkingLevel };
                            onSettingsChange({ ...settings, featureThinking: newFeatureThinking });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {THINKING_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Authentication Routing Configuration */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">Authentication routing</Label>
                <p className="text-sm text-muted-foreground">
                  Choose one global account for all features, or set specific accounts per feature.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <Select
                    value={settings.authRoutingMode || 'global'}
                    onValueChange={(value) => {
                      const mode = value as AuthRoutingMode;
                      onSettingsChange({
                        ...settings,
                        authRoutingMode: mode,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (current behavior)</SelectItem>
                      <SelectItem value="per_feature">Custom by feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {FEATURE_AUTH_KEYS.map((featureKey) => {
                const featureProfiles = settings.featureAuthProfiles || {};
                const selectedAccountId = featureProfiles[featureKey] || USE_GLOBAL_AUTH_OPTION;
                const customModeEnabled = (settings.authRoutingMode || 'global') === 'per_feature';

                return (
                  <div key={featureKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">
                        {FEATURE_AUTH_LABELS[featureKey].label}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {FEATURE_AUTH_LABELS[featureKey].description}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 max-w-md">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Authentication profile</Label>
                        <Select
                          value={selectedAccountId}
                          disabled={!customModeEnabled}
                          onValueChange={(value) => {
                            const nextFeatureAuthProfiles: FeatureAuthProfileConfig = {
                              ...(settings.featureAuthProfiles || {}),
                            };

                            if (value === USE_GLOBAL_AUTH_OPTION) {
                              delete nextFeatureAuthProfiles[featureKey];
                            } else {
                              nextFeatureAuthProfiles[featureKey] = value;
                            }

                            onSettingsChange({
                              ...settings,
                              featureAuthProfiles: nextFeatureAuthProfiles,
                            });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={USE_GLOBAL_AUTH_OPTION}>Use global default</SelectItem>
                            {authAccountOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SettingsCard>
      </div>
    );
  }

  // paths section
  return (
    <SettingsCard
      title={t('general.paths')}
      description={t('general.pathsDescription')}
      onSave={onSave}
      isSaving={isSaving}
      error={error}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="pythonPath" className="text-sm font-medium text-foreground">{t('general.pythonPath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.pythonPathDescription')}</p>
          <Input
            id="pythonPath"
            placeholder={t('general.pythonPathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.pythonPath || ''}
            onChange={(e) => onSettingsChange({ ...settings, pythonPath: e.target.value })}
          />
          {!settings.pythonPath && (
            <ToolDetectionDisplay
              info={toolsInfo?.python || null}
              isLoading={isLoadingTools}
              t={t}
            />
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="gitPath" className="text-sm font-medium text-foreground">{t('general.gitPath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.gitPathDescription')}</p>
          <Input
            id="gitPath"
            placeholder={t('general.gitPathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.gitPath || ''}
            onChange={(e) => onSettingsChange({ ...settings, gitPath: e.target.value })}
          />
          {!settings.gitPath && (
            <ToolDetectionDisplay
              info={toolsInfo?.git || null}
              isLoading={isLoadingTools}
              t={t}
            />
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="githubCLIPath" className="text-sm font-medium text-foreground">{t('general.githubCLIPath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.githubCLIPathDescription')}</p>
          <Input
            id="githubCLIPath"
            placeholder={t('general.githubCLIPathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.githubCLIPath || ''}
            onChange={(e) => onSettingsChange({ ...settings, githubCLIPath: e.target.value })}
          />
          {!settings.githubCLIPath && (
            <ToolDetectionDisplay
              info={toolsInfo?.gh || null}
              isLoading={isLoadingTools}
              t={t}
            />
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="gitlabCLIPath" className="text-sm font-medium text-foreground">{t('general.gitlabCLIPath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.gitlabCLIPathDescription')}</p>
          <Input
            id="gitlabCLIPath"
            placeholder={t('general.gitlabCLIPathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.gitlabCLIPath || ''}
            onChange={(e) => onSettingsChange({ ...settings, gitlabCLIPath: e.target.value })}
          />
          {!settings.gitlabCLIPath && (
            <ToolDetectionDisplay
              info={toolsInfo?.glab || null}
              isLoading={isLoadingTools}
              t={t}
            />
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="claudePath" className="text-sm font-medium text-foreground">{t('general.claudePath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.claudePathDescription')}</p>
          <Input
            id="claudePath"
            placeholder={t('general.claudePathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.claudePath || ''}
            onChange={(e) => onSettingsChange({ ...settings, claudePath: e.target.value })}
          />
          {!settings.claudePath && (
            <ToolDetectionDisplay
              info={toolsInfo?.claude || null}
              isLoading={isLoadingTools}
              t={t}
            />
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="autoBuildPath" className="text-sm font-medium text-foreground">{t('general.autoClaudePath')}</Label>
          <p className="text-sm text-muted-foreground">{t('general.autoClaudePathDescription')}</p>
          <Input
            id="autoBuildPath"
            placeholder={t('general.autoClaudePathPlaceholder')}
            className="w-full max-w-lg"
            value={settings.autoBuildPath || ''}
            onChange={(e) => onSettingsChange({ ...settings, autoBuildPath: e.target.value })}
          />
        </div>
      </div>
    </SettingsCard>
  );
}
