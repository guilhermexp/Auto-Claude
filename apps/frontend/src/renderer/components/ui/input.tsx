import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 file:border-0 file:bg-transparent file:font-medium',
  {
    variants: {
      size: {
        sm: 'h-8 px-2 py-1 text-xs file:text-xs',
        default: 'h-9 px-3 py-2 text-sm file:text-sm',
        lg: 'h-11 px-4 py-3 text-base file:text-base',
      },
      validation: {
        none: 'border-black/20 dark:border-white/15',
        error: 'border-destructive focus-visible:border-destructive',
        success: 'border-[var(--success)] focus-visible:border-[var(--success)]',
        warning: 'border-warning focus-visible:border-warning',
      },
    },
    defaultVariants: {
      size: 'default',
      validation: 'none',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, validation, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, validation, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
