import { useCallback, useEffect, useState } from 'react';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';
import { COLOR_THEMES, DEFAULT_THEME_ID } from '../../../shared/constants';
import { useSettingsStore } from '../../stores/settings-store';
import type { BuiltinThemeId, AppSettings, ExternalThemeInfo } from '../../../shared/types';

interface ThemeSelectorProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * Theme selector component displaying a grid of theme cards with preview swatches
 * and a 3-option mode toggle (Light/Dark/System)
 *
 * Theme changes are applied immediately for live preview, while other settings
 * require saving to take effect.
 */
export function ThemeSelector({ settings, onSettingsChange }: ThemeSelectorProps) {
  const updateStoreSettings = useSettingsStore((state) => state.updateSettings);
  const [externalThemes, setExternalThemes] = useState<ExternalThemeInfo[]>([]);
  const [loadingExternalThemes, setLoadingExternalThemes] = useState(false);
  const [applyingExternalThemeId, setApplyingExternalThemeId] = useState<string | null>(null);
  const [externalThemeError, setExternalThemeError] = useState<string | null>(null);

  const currentColorTheme = settings.themeId || settings.colorTheme || DEFAULT_THEME_ID;
  const systemLightThemeId = settings.systemLightThemeId || currentColorTheme;
  const systemDarkThemeId = settings.systemDarkThemeId || currentColorTheme;
  const currentMode = settings.theme;
  const isDark = currentMode === 'dark' ||
    (currentMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const activeThemeId = currentMode === 'system'
    ? (isDark ? systemDarkThemeId : systemLightThemeId)
    : currentColorTheme;

  const handleColorThemeChange = (themeId: BuiltinThemeId) => {
    const updates: Partial<AppSettings> = currentMode === 'system'
      ? (isDark
        ? { themeId, colorTheme: themeId, systemDarkThemeId: themeId }
        : { themeId, colorTheme: themeId, systemLightThemeId: themeId })
      : { themeId, colorTheme: themeId };

    // Update local draft state
    onSettingsChange({ ...settings, ...updates });
    // Apply immediately to store for live preview (triggers App.tsx useEffect)
    updateStoreSettings(updates);
  };

  const handleSystemThemeChange = (target: 'light' | 'dark', themeId: BuiltinThemeId) => {
    const updates: Partial<AppSettings> = target === 'light'
      ? { systemLightThemeId: themeId }
      : { systemDarkThemeId: themeId };
    onSettingsChange({ ...settings, ...updates });
    updateStoreSettings(updates);
  };

  const loadExternalThemes = useCallback(async () => {
    setLoadingExternalThemes(true);
    setExternalThemeError(null);
    try {
      const result = await window.electronAPI.scanExternalThemes();
      if (result.success && result.data) {
        setExternalThemes(result.data);
      } else {
        setExternalThemeError(result.error || 'Failed to scan external themes');
      }
    } catch (error) {
      setExternalThemeError(error instanceof Error ? error.message : 'Failed to scan external themes');
    } finally {
      setLoadingExternalThemes(false);
    }
  }, []);

  const handleApplyExternalTheme = async (theme: ExternalThemeInfo) => {
    setApplyingExternalThemeId(theme.id);
    setExternalThemeError(null);
    const result = await window.electronAPI.loadExternalTheme(theme);
    if (!result.success || !result.data) {
      setApplyingExternalThemeId(null);
      setExternalThemeError(result.error || `Failed to load "${theme.name}"`);
      return;
    }

    const updates: Partial<AppSettings> = {
      customThemeColors: result.data.colors,
      customThemeName: result.data.name,
      customThemeSource: result.data.source
    };
    onSettingsChange({ ...settings, ...updates });
    updateStoreSettings(updates);
    setApplyingExternalThemeId(null);
  };

  const handleClearExternalTheme = () => {
    const updates: Partial<AppSettings> = {
      customThemeColors: undefined,
      customThemeName: undefined,
      customThemeSource: undefined
    };
    onSettingsChange({ ...settings, ...updates });
    updateStoreSettings(updates);
  };

  const lightExternalThemes = externalThemes.filter((theme) => theme.type === 'light');
  const darkExternalThemes = externalThemes.filter((theme) => theme.type !== 'light');
  const lightBuiltinThemes = COLOR_THEMES.filter((theme) => theme.type === 'light');
  const darkBuiltinThemes = COLOR_THEMES.filter((theme) => theme.type === 'dark');
  const visibleBuiltinThemes = currentMode === 'system'
    ? COLOR_THEMES
    : (currentMode === 'light' ? lightBuiltinThemes : darkBuiltinThemes);

  useEffect(() => {
    loadExternalThemes();
  }, [loadExternalThemes]);

  const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
    // Update local draft state
    onSettingsChange({ ...settings, theme: mode });
    // Apply immediately to store for live preview (triggers App.tsx useEffect)
    updateStoreSettings({ theme: mode });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Appearance Mode</Label>
          <p className="text-sm text-muted-foreground">Choose light, dark, or system preference</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 max-w-md">
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3.5 rounded-lg transition-all settings-mode-button',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                currentMode === mode && 'settings-mode-button-selected'
              )}
            >
              {getModeIcon(mode)}
              <span className="text-sm font-medium capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Theme Grid */}
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Color Theme</Label>
          <p className="text-sm text-muted-foreground">
            {currentMode === 'system'
              ? 'Select a color palette for the interface'
              : `Showing ${currentMode} themes for current appearance mode`}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleBuiltinThemes.map((theme) => {
            const isSelected = activeThemeId === theme.id;
            const bgColor = isDark ? theme.previewColors.darkBg : theme.previewColors.bg;
            const accentColor = isDark
              ? (theme.previewColors.darkAccent || theme.previewColors.accent)
              : theme.previewColors.accent;

            return (
              <button
                type="button"
                key={theme.id}
                onClick={() => handleColorThemeChange(theme.id)}
                className={cn(
                  'relative flex flex-col p-3.5 rounded-lg text-left transition-all settings-theme-card',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected && 'settings-theme-card-selected'
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}

                {/* Preview swatches */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex -space-x-1.5">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: bgColor }}
                      title="Background color"
                    />
                    <div
                      className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: accentColor }}
                      title="Accent color"
                    />
                  </div>
                </div>

                {/* Theme info */}
                <div className="space-y-1">
                  <p className="font-medium text-sm text-foreground">{theme.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{theme.description}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{theme.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentMode === 'system' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">System Theme Mapping</Label>
            <p className="text-sm text-muted-foreground">
              Choose different themes for light and dark system appearance
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Light Appearance</p>
            <div className="flex flex-wrap gap-2">
              {lightBuiltinThemes.map((theme) => (
                <button
                  type="button"
                  key={`system-light-${theme.id}`}
                  onClick={() => handleSystemThemeChange('light', theme.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button',
                    systemLightThemeId === theme.id && 'settings-preset-button-selected'
                  )}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dark Appearance</p>
            <div className="flex flex-wrap gap-2">
              {darkBuiltinThemes.map((theme) => (
                <button
                  type="button"
                  key={`system-dark-${theme.id}`}
                  onClick={() => handleSystemThemeChange('dark', theme.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button',
                    systemDarkThemeId === theme.id && 'settings-preset-button-selected'
                  )}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">External Themes</Label>
          <p className="text-sm text-muted-foreground">
            Import and apply themes discovered from VS Code, Cursor, and Windsurf
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadExternalThemes}
            className="px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button"
            disabled={loadingExternalThemes}
          >
            {loadingExternalThemes ? 'Scanning...' : 'Rescan'}
          </button>
          <button
            type="button"
            onClick={handleClearExternalTheme}
            className="px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button"
          >
            Use Built-in Only
          </button>
          <span className="text-xs text-muted-foreground">
            {externalThemes.length} themes found
          </span>
        </div>

        {externalThemeError && (
          <p className="text-xs text-destructive">{externalThemeError}</p>
        )}

        {settings.customThemeName && (
          <p className="text-xs text-muted-foreground">
            Active external theme:
            {' '}
            <span className="font-medium text-foreground">{settings.customThemeName}</span>
            {settings.customThemeSource && (
              <>
                {' '}
                <span className="uppercase">{settings.customThemeSource}</span>
              </>
            )}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Light External Themes</p>
          <div className="flex flex-wrap gap-2">
            {lightExternalThemes.map((theme) => {
              const isActive = settings.customThemeName === theme.name && settings.customThemeSource === theme.source;
              const isApplying = applyingExternalThemeId === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => handleApplyExternalTheme(theme)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button',
                    isActive && 'settings-preset-button-selected'
                  )}
                  disabled={isApplying}
                  title={theme.path}
                >
                  {isApplying ? 'Applying...' : theme.name}
                  <span className="ml-1 uppercase text-[10px] opacity-70">{theme.source}</span>
                </button>
              );
            })}
            {lightExternalThemes.length === 0 && (
              <p className="text-xs text-muted-foreground">No light external themes found</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dark External Themes</p>
          <div className="flex flex-wrap gap-2">
            {darkExternalThemes.map((theme) => {
              const isActive = settings.customThemeName === theme.name && settings.customThemeSource === theme.source;
              const isApplying = applyingExternalThemeId === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => handleApplyExternalTheme(theme)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs transition-colors settings-preset-button',
                    isActive && 'settings-preset-button-selected'
                  )}
                  disabled={isApplying}
                  title={theme.path}
                >
                  {isApplying ? 'Applying...' : theme.name}
                  <span className="ml-1 uppercase text-[10px] opacity-70">{theme.source}</span>
                </button>
              );
            })}
            {darkExternalThemes.length === 0 && (
              <p className="text-xs text-muted-foreground">No dark external themes found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
