# Form Components Documentation

**Phase 04 - Core UI Components: Forms**

This document provides comprehensive documentation for the modernized form components system in Auto-Claude.

---

## Overview

The form components system provides a consistent, accessible, and type-safe foundation for building forms throughout the application. All components follow these principles:

- **Type-safe variants** using `class-variance-authority` (cva)
- **Design token integration** for colors, spacing, and typography
- **Accessibility-first** with proper ARIA attributes and semantic HTML
- **Zero breaking changes** - all components maintain backward compatibility
- **Composition patterns** - components work together seamlessly

---

## Components

### Input

A flexible input component with size and validation state variants.

#### API

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'default' | 'lg';
  validation?: 'none' | 'error' | 'success' | 'warning';
}
```

#### Variants

| Variant | Values | Default | Description |
|---------|--------|---------|-------------|
| `size` | `sm`, `default`, `lg` | `default` | Controls height and text size |
| `validation` | `none`, `error`, `success`, `warning` | `none` | Visual validation state |

#### Size Reference

| Size | Height | Padding | Text Size |
|------|--------|---------|-----------|
| `sm` | 32px (h-8) | 8px 8px (px-2 py-1) | 12px (text-xs) |
| `default` | 36px (h-9) | 12px 8px (px-3 py-2) | 14px (text-sm) |
| `lg` | 44px (h-11) | 16px 12px (px-4 py-3) | 16px (text-base) |

#### Examples

**Basic input:**
```tsx
<Input placeholder="Enter your email" />
```

**Small input:**
```tsx
<Input size="sm" placeholder="Search..." />
```

**Large input:**
```tsx
<Input size="lg" placeholder="Full name" />
```

**Error state:**
```tsx
<Input validation="error" placeholder="Email" />
```

**Success state:**
```tsx
<Input validation="success" placeholder="Username" />
```

**Warning state:**
```tsx
<Input validation="warning" placeholder="Password" />
```

---

### Label

An accessible label component built on Radix UI primitives.

#### API

```typescript
interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {}
```

#### Features

- **Radix UI integration** - Uses `@radix-ui/react-label` for better accessibility
- **Automatic association** - Connects to inputs via `htmlFor`/`id`
- **Peer styles** - Supports `peer-disabled:` variants for disabled state styling
- **Fixed font size** - Uses `text-[12px]` following design system reference

#### Examples

**Basic label:**
```tsx
<Label htmlFor="email">Email Address</Label>
```

**With input:**
```tsx
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

**Disabled state:**
```tsx
<Label htmlFor="disabled-input" className="peer-disabled:opacity-70">
  Disabled Field
</Label>
<Input id="disabled-input" disabled />
```

---

### Textarea

A textarea component with size and resize control variants.

#### API

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'sm' | 'default' | 'lg';
  resize?: 'none' | 'vertical' | 'both';
}
```

#### Variants

| Variant | Values | Default | Description |
|---------|--------|---------|-------------|
| `size` | `sm`, `default`, `lg` | `default` | Controls min-height and text size |
| `resize` | `none`, `vertical`, `both` | `vertical` | Resize behavior |

#### Size Reference

| Size | Min Height | Padding | Text Size |
|------|------------|---------|-----------|
| `sm` | 60px | 8px 8px (px-2 py-1) | 12px (text-xs) |
| `default` | 80px | 12px 8px (px-3 py-2) | 14px (text-sm) |
| `lg` | 120px | 16px 12px (px-4 py-3) | 16px (text-base) |

#### Examples

**Basic textarea:**
```tsx
<Textarea placeholder="Enter your message..." />
```

**Small textarea (no resize):**
```tsx
<Textarea size="sm" resize="none" placeholder="Brief note" />
```

**Large textarea (both directions):**
```tsx
<Textarea size="lg" resize="both" placeholder="Detailed description" />
```

---

### RadioGroup

A radio button group component with orientation and spacing variants.

#### API

```typescript
interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  orientation?: 'vertical' | 'horizontal';
  spacing?: 1 | 2 | 3 | 4;
}
```

#### Variants

| Variant | Values | Default | Description |
|---------|--------|---------|-------------|
| `orientation` | `vertical`, `horizontal` | `vertical` | Layout direction |
| `spacing` | `1`, `2`, `3`, `4` | `2` | Gap between items (using spacing tokens) |

#### Spacing Reference

| Value | Gap | Pixels |
|-------|-----|--------|
| `1` | gap-1 | 4px |
| `2` | gap-2 | 8px |
| `3` | gap-3 | 12px |
| `4` | gap-4 | 16px |

#### Examples

**Vertical radio group:**
```tsx
<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="opt1" />
    <Label htmlFor="opt1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="opt2" />
    <Label htmlFor="opt2">Option 2</Label>
  </div>
</RadioGroup>
```

**Horizontal radio group:**
```tsx
<RadioGroup orientation="horizontal" spacing={4} defaultValue="small">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="small" id="small" />
    <Label htmlFor="small">Small</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="medium" id="medium" />
    <Label htmlFor="medium">Medium</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="large" id="large" />
    <Label htmlFor="large">Large</Label>
  </div>
</RadioGroup>
```

**Compact vertical group:**
```tsx
<RadioGroup spacing={1}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="yes" id="yes" />
    <Label htmlFor="yes">Yes</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="no" id="no" />
    <Label htmlFor="no">No</Label>
  </div>
</RadioGroup>
```

---

### FormField

A composition wrapper that combines Label, input component, and error/hint messages into a cohesive field.

#### API

```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
```

#### Features

- **Automatic ID generation** - Uses `useId()` for unique label/input association
- **Label/input connection** - Automatically sets `htmlFor`/`id` attributes
- **Error display** - Shows error message in red text below input
- **Hint display** - Shows hint text in muted color (only when no error)
- **Required indicator** - Adds red asterisk (*) to label when `required={true}`
- **ARIA integration** - Sets `aria-invalid` and `aria-describedby` automatically
- **Spacing tokens** - Uses Stack component with `spacing={1}` (4px gap)
- **Typography tokens** - Uses Text component with `size="xs"` for messages

#### Examples

**Basic field:**
```tsx
<FormField label="Email Address">
  <Input type="email" placeholder="you@example.com" />
</FormField>
```

**Required field:**
```tsx
<FormField label="Username" required>
  <Input placeholder="Enter username" />
</FormField>
```

**Field with hint:**
```tsx
<FormField
  label="Password"
  hint="Must be at least 8 characters"
>
  <Input type="password" />
</FormField>
```

**Field with error:**
```tsx
<FormField
  label="Email"
  error="Invalid email format"
>
  <Input type="email" validation="error" />
</FormField>
```

**Field with textarea:**
```tsx
<FormField
  label="Description"
  hint="Maximum 500 characters"
>
  <Textarea placeholder="Describe your project..." />
</FormField>
```

**Complete form example:**
```tsx
<form className="space-y-4">
  <FormField label="Full Name" required>
    <Input placeholder="John Doe" />
  </FormField>

  <FormField
    label="Email Address"
    required
    error={errors.email}
  >
    <Input
      type="email"
      validation={errors.email ? 'error' : 'none'}
      placeholder="you@example.com"
    />
  </FormField>

  <FormField
    label="Bio"
    hint="Tell us about yourself"
  >
    <Textarea placeholder="I'm a developer..." />
  </FormField>

  <Button type="submit">Submit</Button>
</form>
```

---

## Usage Patterns

### Basic Form (Label + Input)

```tsx
<div className="space-y-4">
  <div className="space-y-1">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" />
  </div>

  <div className="space-y-1">
    <Label htmlFor="password">Password</Label>
    <Input id="password" type="password" />
  </div>
</div>
```

### Form with Validation (FormField + error)

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

<div className="space-y-4">
  <FormField
    label="Email"
    required
    error={errors.email}
  >
    <Input
      type="email"
      validation={errors.email ? 'error' : 'none'}
      onChange={(e) => validateEmail(e.target.value)}
    />
  </FormField>

  <FormField
    label="Password"
    required
    error={errors.password}
  >
    <Input
      type="password"
      validation={errors.password ? 'error' : 'none'}
      onChange={(e) => validatePassword(e.target.value)}
    />
  </FormField>
</div>
```

### Complex Form (Multiple Field Types)

```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  <FormField label="Project Name" required>
    <Input placeholder="My Awesome Project" />
  </FormField>

  <FormField label="Project Type" required>
    <RadioGroup orientation="horizontal" spacing={4}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="web" id="web" />
        <Label htmlFor="web">Web</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="mobile" id="mobile" />
        <Label htmlFor="mobile">Mobile</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="desktop" id="desktop" />
        <Label htmlFor="desktop">Desktop</Label>
      </div>
    </RadioGroup>
  </FormField>

  <FormField
    label="Description"
    hint="Describe your project in detail"
  >
    <Textarea size="lg" placeholder="Tell us more..." />
  </FormField>

  <div className="flex gap-2">
    <Button type="submit">Create Project</Button>
    <Button type="button" variant="outline">Cancel</Button>
  </div>
</form>
```

### Radio Group: Horizontal vs Vertical

**Vertical (default) - for longer lists:**
```tsx
<RadioGroup>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="opt1" />
    <Label htmlFor="opt1">First option with longer text</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="opt2" />
    <Label htmlFor="opt2">Second option with description</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option3" id="opt3" />
    <Label htmlFor="opt3">Third option</Label>
  </div>
</RadioGroup>
```

**Horizontal - for short lists:**
```tsx
<RadioGroup orientation="horizontal" spacing={4}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="yes" id="yes" />
    <Label htmlFor="yes">Yes</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="no" id="no" />
    <Label htmlFor="no">No</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="maybe" id="maybe" />
    <Label htmlFor="maybe">Maybe</Label>
  </div>
</RadioGroup>
```

---

## Accessibility

### Label/Input Association

All form components support proper label/input association:

**Manual approach:**
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

**Automatic approach (with FormField):**
```tsx
<FormField label="Email">
  <Input type="email" />
  {/* ID automatically generated and connected */}
</FormField>
```

### Error Announcements

FormField automatically sets ARIA attributes for screen readers:

```tsx
<FormField label="Email" error="Invalid email format">
  <Input type="email" />
  {/* Renders with:
    aria-invalid="true"
    aria-describedby="[unique-id]-message"
  */}
</FormField>
```

Error messages have `role="alert"` for immediate announcement to screen readers.

### Focus Management

All input components support proper focus states:

- **Visible focus ring** - `focus-visible:ring-[3px] focus-visible:ring-primary/20`
- **Border highlight** - `focus-visible:border-primary`
- **Keyboard navigation** - All components fully keyboard accessible

### Keyboard Navigation

**Input/Textarea:**
- Tab - Move to next field
- Shift+Tab - Move to previous field

**RadioGroup:**
- Arrow keys - Navigate between radio options
- Space - Select focused option
- Tab - Move to next field group

---

## Migration Guide

### Migrating from Basic Inputs

**Before:**
```tsx
<input
  className="h-10 px-3 py-2 border rounded-lg"
  placeholder="Email"
/>
```

**After:**
```tsx
<Input placeholder="Email" />
```

**Benefits:**
- Design tokens automatically applied
- Focus states consistent
- Size variants available
- Validation states built-in

### Adding Validation States

**Before:**
```tsx
<input
  className={`border ${error ? 'border-red-500' : 'border-gray-300'}`}
/>
```

**After:**
```tsx
<Input validation={error ? 'error' : 'none'} />
```

### Using FormField Wrapper

**Before:**
```tsx
<div className="space-y-1">
  <label htmlFor="email" className="text-sm">Email</label>
  <input id="email" type="email" />
  {error && <span className="text-xs text-red-500">{error}</span>}
</div>
```

**After:**
```tsx
<FormField label="Email" error={error}>
  <Input type="email" />
</FormField>
```

**Benefits:**
- Less boilerplate code
- Automatic ID generation
- Consistent spacing
- Proper ARIA attributes
- Type-safe error/hint messages

### Breaking Changes

**None!** All components maintain backward compatibility:

- `Input` - Works as before, new props are optional
- `Label` - API unchanged, implementation improved
- `Textarea` - Works as before, new props are optional
- `RadioGroup` - Works as before, new props are optional
- `FormField` - New component, doesn't affect existing code

---

## Integration

### Phase 01: Design Tokens Foundation

Form components integrate with color tokens:

- `border-border` - Default border color
- `border-destructive` - Error state border
- `border-[var(--success)]` - Success state border
- `border-warning` - Warning state border
- `bg-card` - Background color
- `text-foreground` - Text color
- `text-muted-foreground` - Placeholder color

### Phase 02: Typography System

Form components use typography tokens:

- **Input sizes:** `text-xs` (sm), `text-sm` (default), `text-base` (lg)
- **Label:** `text-[12px]` (fixed size)
- **Textarea sizes:** `text-xs` (sm), `text-sm` (default), `text-base` (lg)
- **FormField messages:** `text-xs` via Text component

### Phase 03: Spacing & Layout System

Form components use spacing tokens:

- **FormField:** `spacing={1}` (4px gap) via Stack component
- **RadioGroup:** `gap-1` through `gap-4` (4px, 8px, 12px, 16px)
- **Internal padding:** Follows spacing scale

### Phase 05+: Future Integrations

Form components ready for integration with:

- **Select component** (Phase 05) - Will work seamlessly with FormField
- **DatePicker** (Phase 05+) - Compatible with FormField wrapper
- **Validation library** (future) - Error prop supports any validation pattern
- **Form state management** (future) - Components are controlled/uncontrolled compatible

---

## Summary

The form components system provides:

- **5 modernized components:** Input, Label, Textarea, RadioGroup, FormField
- **Type-safe variants** using cva
- **Design token integration** for consistency
- **Accessibility-first** approach
- **Zero breaking changes** for smooth migration
- **Composition patterns** for complex forms

All components follow established patterns from Button, Checkbox, and Switch, ensuring consistency across the entire UI system.

---

*Documentation created: 2026-01-21*
*Phase: 04-core-ui-components-forms*
