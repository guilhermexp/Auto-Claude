import { cn } from '../../lib/utils';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  controlWidth?: 'sm' | 'md' | 'lg' | 'auto';
  className?: string;
}

const widthClasses = {
  sm: 'w-48',
  md: 'w-64',
  lg: 'w-80',
  auto: 'w-auto'
} as const;

/**
 * Reusable row layout for settings items
 * Displays label + description on the left, control on the right
 */
export function SettingsRow({
  label,
  description,
  children,
  controlWidth = 'lg',
  className
}: SettingsRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className={cn('flex-shrink-0', widthClasses[controlWidth])}>
        {children}
      </div>
    </div>
  );
}
