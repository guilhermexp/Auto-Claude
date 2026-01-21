import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'motion/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-8 p-0.5',
        default: 'h-10 p-1',
        lg: 'h-12 p-1.5',
      },
      variant: {
        default: 'bg-secondary',
        outline: 'border border-border bg-transparent',
        pills: 'bg-transparent gap-1',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=inactive]:hover:text-foreground/80',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        default: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {
  animatedIndicator?: boolean;
}

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, size, variant, animatedIndicator = false, children, ...props }, ref) => {
  // Note: For full animated indicator implementation, we would need:
  // 1. Context to track active tab position/dimensions
  // 2. Motion underline with layoutId for shared layout animations
  // 3. Measurement of tab positions on mount and resize
  // This is a simplified implementation showing the prop API

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        tabsListVariants({ size, variant }),
        animatedIndicator && 'relative',
        className
      )}
      {...props}
    >
      {children}
      {/* Animated indicator would render here when enabled */}
      {animatedIndicator && (
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary"
          layoutId="tabs-indicator"
          transition={{
            duration: 0.2,
            ease: [0, 0, 0.2, 1], // --ease-out
          }}
        />
      )}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, size, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ size }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
