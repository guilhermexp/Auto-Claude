import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const gridVariants = cva(
  'grid', // base class
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        6: 'grid-cols-6',
        12: 'grid-cols-12',
      },
      gap: {
        0: 'gap-0',
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        6: 'gap-6',
        8: 'gap-8',
        12: 'gap-12',
      },
      responsive: {
        true: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        false: '',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 4,
      responsive: false,
    },
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, responsive, ...props }, ref) => {
    return (
      <div
        className={cn(gridVariants({ cols, gap, responsive }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Grid.displayName = 'Grid';

export { Grid, gridVariants };
