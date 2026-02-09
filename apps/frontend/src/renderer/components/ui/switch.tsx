import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const handleCheckedChange = React.useCallback(
    (checked: boolean) => {
      if (!onCheckedChange) return;
      // Deprioritize downstream updates triggered by switch toggles
      // to keep click handlers responsive in dev-heavy screens.
      React.startTransition(() => {
        onCheckedChange(checked);
      });
    },
    [onCheckedChange]
  );

  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border transition-all duration-200',
        'data-[state=checked]:border-transparent data-[state=unchecked]:border-border/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Use a visible blue/teal color for checked state in dark mode
        'data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-secondary',
        className
      )}
      {...props}
      onCheckedChange={handleCheckedChange}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full shadow-sm ring-0 transition-transform duration-200',
          'bg-white',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
