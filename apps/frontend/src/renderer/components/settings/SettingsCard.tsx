import { useTranslation } from 'react-i18next';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Card container for settings with optional footer containing save button
 * Follows 1Code design pattern with bg-background card inside bg-card content area
 */
export function SettingsCard({
  title,
  description,
  children,
  onSave,
  isSaving,
  showSaveButton = true,
  error,
  className
}: SettingsCardProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section title above the card */}
      {(title || description) && (
        <div className="pb-2">
          {title && (
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}

      {/* Card container */}
      <div className="rounded-lg overflow-hidden settings-card">
        {/* Card content */}
        <div className="p-5 space-y-5">
          {children}
        </div>

        {/* Card footer with save button */}
        {showSaveButton && (
          <div className="px-5 py-3.5 flex items-center justify-between gap-4 settings-card-footer">
            {/* Error message on the left */}
            {error && (
              <div className="flex-1 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-sm text-destructive">
                {error}
              </div>
            )}
            {!error && <div className="flex-1" />}

            {/* Save button on the right */}
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  {t('common:buttons.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3 w-3" />
                  {t('settings:actions.save')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
