import * as React from 'react';
import { Stack } from './Stack';
import { Text } from './Text';
import { Label } from './label';

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, hint, required = false, children }, ref) => {
    const id = React.useId();

    // Clone the child element to add id and aria attributes
    const childWithProps = React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<any>, {
          id,
          'aria-invalid': error ? 'true' : undefined,
          'aria-describedby': error || hint ? `${id}-message` : undefined,
        })
      : children;

    return (
      <Stack ref={ref} spacing={1}>
        <Label htmlFor={id}>
          {label}
          {required && (
            <Text asChild size="xs" color="destructive">
              <span className="ml-1">*</span>
            </Text>
          )}
        </Label>
        {childWithProps}
        {error && (
          <Text
            id={`${id}-message`}
            size="xs"
            color="destructive"
            role="alert"
          >
            {error}
          </Text>
        )}
        {!error && hint && (
          <Text
            id={`${id}-message`}
            size="xs"
            color="muted"
          >
            {hint}
          </Text>
        )}
      </Stack>
    );
  }
);
FormField.displayName = 'FormField';

export { FormField };
