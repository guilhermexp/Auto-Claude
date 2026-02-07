/**
 * Settings module barrel export
 * Provides clean import paths for settings components
 */

export { AppSettingsDialog, type AppSection } from './AppSettings';
export { ThemeSettings } from './ThemeSettings';
export { ThemeSelector } from './ThemeSelector';
export { GeneralSettings } from './GeneralSettings';
export { AdvancedSettings } from './AdvancedSettings';
export { SettingsCard } from './SettingsCard';
export { SettingsRow } from './SettingsRow';
export { SettingsSection } from './SettingsSection'; // Legacy - prefer SettingsCard
export { useSettings } from './hooks/useSettings';
