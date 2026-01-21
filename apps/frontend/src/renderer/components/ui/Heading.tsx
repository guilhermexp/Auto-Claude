import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const headingVariants = cva(
  'text-foreground font-semibold', // base class
  {
    variants: {
      level: {
        h1: 'text-5xl leading-tight',
        h2: 'text-4xl leading-tight',
        h3: 'text-3xl leading-normal',
        h4: 'text-2xl leading-normal',
        h5: 'text-xl leading-normal',
        h6: 'text-lg leading-normal',
      },
      weight: {
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
      color: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
      },
    },
    defaultVariants: {
      level: 'h2',
      weight: 'semibold',
      color: 'default',
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  asChild?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level, weight, color, asChild = false, as, ...props }, ref) => {
    const Comp = asChild ? Slot : (as || (level as string) || 'h2');
    return (
      <Comp
        className={cn(headingVariants({ level, weight, color }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Heading.displayName = 'Heading';

export { Heading, headingVariants };
