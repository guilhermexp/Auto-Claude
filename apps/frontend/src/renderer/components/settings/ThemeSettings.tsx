import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { ThemeSelector } from './ThemeSelector';
import type { AppSettings } from '../../../shared/types';

interface ThemeSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSave?: () => void;
  isSaving?: boolean;
  error?: string | null;
}

/**
 * Theme and appearance settings section
 * Wraps the ThemeSelector component with a consistent settings card layout
 */
export function ThemeSettings({ settings, onSettingsChange, onSave, isSaving, error }: ThemeSettingsProps) {
  const { t } = useTranslation('settings');

  return (
    <SettingsCard
      title={t('theme.title')}
      description={t('theme.description')}
      onSave={onSave}
      isSaving={isSaving}
      error={error}
    >
      <ThemeSelector settings={settings} onSettingsChange={onSettingsChange} />
    </SettingsCard>
  );
}
