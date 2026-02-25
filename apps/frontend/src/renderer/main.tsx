// Initialize browser mock before anything else (no-op in Electron)
import './lib/browser-mock';

// Initialize i18n before React
import '../shared/i18n';

// Initialize Sentry for error tracking (respects user's sentryEnabled setting)
// Fire-and-forget: React rendering proceeds immediately while Sentry initializes async
import { initSentryRenderer } from './lib/sentry';
initSentryRenderer().catch((err) => {
  console.warn('[Sentry] Failed to initialize renderer:', err);
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import type { AppSettings, BuiltinThemeId } from '../shared/types';
import {
  BUILTIN_THEME_COLOR_SCHEMES,
  BUILTIN_THEME_IDS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_THEME_ID,
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN
} from '../shared/constants';
import { generateCSSVariables } from './lib/themes/vscode-to-css-mapping';
import { applyThemeVariables, removeThemeVariables } from './lib/themes/theme-apply';
import { useSettingsStore } from './stores/settings-store';

function applyInitialAppearance(settings: AppSettings): void {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isSystemDark = mediaQuery.matches;
  const isDarkMode = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);

  root.classList.toggle('dark', isDarkMode);

  const rawThemeId = settings.theme === 'system'
    ? (isSystemDark
      ? (settings.systemDarkThemeId ?? settings.themeId ?? settings.colorTheme ?? DEFAULT_THEME_ID)
      : (settings.systemLightThemeId ?? settings.themeId ?? settings.colorTheme ?? DEFAULT_THEME_ID))
    : (settings.themeId ?? settings.colorTheme ?? DEFAULT_THEME_ID);

  const themeId: BuiltinThemeId = BUILTIN_THEME_IDS.includes(rawThemeId as BuiltinThemeId)
    ? (rawThemeId as BuiltinThemeId)
    : DEFAULT_THEME_ID;

  root.setAttribute('data-theme', themeId);

  const builtinTheme = BUILTIN_THEME_COLOR_SCHEMES[themeId];
  const builtinVariables = generateCSSVariables(builtinTheme.colors);
  removeThemeVariables(root);
  applyThemeVariables(builtinVariables, root);

  if (settings.customThemeColors && Object.keys(settings.customThemeColors).length > 0) {
    const customVariables = generateCSSVariables(settings.customThemeColors);
    applyThemeVariables(customVariables, root);
  }

  const scale = settings.uiScale ?? UI_SCALE_DEFAULT;
  const clampedScale = Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, scale));
  root.setAttribute('data-ui-scale', clampedScale.toString());
}

async function bootstrapAndRender(): Promise<void> {
  let initialSettings: AppSettings = DEFAULT_APP_SETTINGS as AppSettings;

  try {
    if (window.electronAPI?.getSettings) {
      const result = await window.electronAPI.getSettings();
      if (result.success && result.data) {
        initialSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...result.data,
          notifications: {
            ...DEFAULT_APP_SETTINGS.notifications,
            ...(result.data.notifications ?? {})
          }
        } as AppSettings;
      }
    }
  } catch {
    // Keep defaults if settings bootstrap fails.
  }

  applyInitialAppearance(initialSettings);
  useSettingsStore.getState().setSettings(initialSettings);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrapAndRender();
