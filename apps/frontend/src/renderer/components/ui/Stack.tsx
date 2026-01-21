import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const stackVariants = cva(
  'flex', // base class
  {
    variants: {
      direction: {
        vertical: 'flex-col',
        horizontal: 'flex-row',
      },
      spacing: {
        0: 'gap-0',
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        6: 'gap-6',
        8: 'gap-8',
        12: 'gap-12',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
      },
      wrap: {
        true: 'flex-wrap',
        false: 'flex-nowrap',
      },
    },
    defaultVariants: {
      direction: 'vertical',
      spacing: 4,
      align: 'stretch',
      justify: 'start',
      wrap: false,
    },
  }
);

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, spacing, align, justify, wrap, ...props }, ref) => {
    return (
      <div
        className={cn(stackVariants({ direction, spacing, align, justify, wrap }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Stack.displayName = 'Stack';

export { Stack, stackVariants };
