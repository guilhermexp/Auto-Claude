# Animation System Documentation

**Auto-Claude UI/UX Modernization - Phase 07**

This document provides comprehensive guidance on the hybrid animation system combining CSS animations with optional Motion (Framer Motion) for complex use cases.

---

## Table of Contents

1. [Overview](#overview)
2. [Animation Tokens](#animation-tokens)
3. [CSS Animations](#css-animations)
4. [Motion Variants](#motion-variants)
5. [Usage Patterns](#usage-patterns)
6. [Performance](#performance)
7. [Accessibility](#accessibility)
8. [Integration](#integration)
9. [Examples](#examples)
10. [Decision Guide: CSS vs Motion](#decision-guide-css-vs-motion)

---

## Overview

Auto-Claude uses a **hybrid animation system** that prioritizes CSS animations for most use cases while providing optional Motion integration for complex scenarios.

**Philosophy:**
- **CSS First**: Use CSS animations/transitions for 90% of cases (faster, simpler, less bundle size)
- **Motion Optional**: Opt-in to Motion for gestures, layout animations, and complex sequences
- **Backward Compatible**: All existing CSS animations continue working
- **Token-Based**: Centralized duration and easing tokens for consistency

**Tech Stack:**
- **CSS Variables**: Animation tokens in `@theme` block
- **Tailwind Classes**: `animate-in`, `fade-in-0`, `zoom-in-95`, etc.
- **Motion v12**: Framer Motion for programmatic animations (opt-in)

---

## Animation Tokens

All animation tokens are defined in `apps/frontend/src/renderer/styles/globals.css` within the `@theme` block.

### Duration Tokens

| Token | Value | Use Case |
|-------|-------|----------|
| `--duration-instant` | 0ms | Immediate state changes (no animation) |
| `--duration-fast` | 100ms | Quick micro-interactions (hover states, tooltips) |
| `--duration-normal` | 200ms | **Default** - Most UI transitions (overlays, dialogs) |
| `--duration-slow` | 300ms | Emphasis animations (form validation, alerts) |
| `--duration-slower` | 500ms | Complex sequences (multi-step animations) |

**Usage in CSS:**
```css
.my-element {
  transition: opacity var(--duration-normal) var(--ease-out);
}
```

**Usage in Tailwind:**
```tsx
<div className="transition-opacity duration-200">
  {/* Uses default 200ms */}
</div>
```

### Easing Tokens

| Token | Value | Use Case |
|-------|-------|----------|
| `--ease-linear` | `linear` | Constant speed (loading spinners, indeterminate progress) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerating (elements exiting viewport) |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | **Default** - Decelerating (elements entering viewport) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth both ends (state transitions) |
| `--ease-bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful overshoot (success confirmations) |

**Usage in CSS:**
```css
.card {
  transition: transform var(--duration-normal) var(--ease-out);
}
```

**Usage in Motion:**
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    duration: 0.2,
    ease: [0, 0, 0.2, 1] // --ease-out
  }}
/>
```

### Animation Shorthand Variables

Pre-configured animation sequences combining keyframes, duration, and easing:

| Variable | Value | Description |
|----------|-------|-------------|
| `--animate-fade-in` | `fade-in var(--duration-normal) var(--ease-out)` | Opacity 0 → 1 |
| `--animate-slide-up` | `slide-up var(--duration-normal) var(--ease-out)` | Translate Y + fade |
| `--animate-scale-in` | `scale-in var(--duration-normal) var(--ease-out)` | Scale 0.95 → 1 + fade |
| `--animate-accordion-down` | `accordion-down var(--duration-normal) var(--ease-out)` | Height expand |
| `--animate-accordion-up` | `accordion-up var(--duration-normal) var(--ease-out)` | Height collapse |
| `--animate-pulse-subtle` | `pulse-subtle var(--duration-slower) var(--ease-in-out)` | Subtle pulsing |
| `--animate-indeterminate` | `indeterminate 1.5s var(--ease-in-out)` | Loading bar sweep |

**Usage:**
```css
.dialog-content {
  animation: var(--animate-scale-in);
}
```

---

## CSS Animations

### Available @keyframes

The following CSS keyframes are defined and ready to use:

#### 1. Fade Animations
```css
@keyframes fade-in {
  from { opacity: 0 }
  to { opacity: 1 }
}
```
**Use case**: Simple opacity transitions (tooltips, overlays)

#### 2. Slide Animations
```css
@keyframes slide-up {
  from { transform: translateY(8px); opacity: 0 }
  to { transform: translateY(0); opacity: 1 }
}
```
**Use case**: Content appearing from below (toasts, notifications)

#### 3. Scale Animations
```css
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0 }
  to { transform: scale(1); opacity: 1 }
}
```
**Use case**: Dialogs, popovers entering viewport

#### 4. Accordion Animations
```css
@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}
```
**Use case**: Radix UI Accordion expand/collapse

#### 5. Pulse Animation
```css
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(71, 159, 250, 0.4); }
  50% { opacity: 0.95; box-shadow: 0 0 0 4px rgba(71, 159, 250, 0.1); }
}
```
**Use case**: Focus states, active indicators

#### 6. Indeterminate Progress
```css
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```
**Use case**: Loading bars, progress indicators

#### 7. Progress Animations
```css
@keyframes progress-glow-sweep {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes progress-sweep {
  0% { transform: translateX(0); }
  100% { transform: translateX(200%); }
}
```
**Use case**: Working/active progress bars

#### 8. Task Card Animations
```css
@keyframes task-pulse {
  0%, 100% {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4);
  }
  50% {
    border-color: hsl(var(--primary) / 0.8);
    box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
  }
}

@keyframes stuck-pulse {
  0%, 100% {
    border-color: hsl(var(--warning));
    box-shadow: 0 0 0 0 hsl(var(--warning) / 0.3);
  }
  50% {
    border-color: hsl(var(--warning) / 0.8);
    box-shadow: 0 0 8px hsl(var(--warning) / 0.2);
  }
}
```
**Use case**: Running/stuck task cards in Kanban view

#### 9. Empty State Animation
```css
@keyframes empty-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```
**Use case**: Empty column placeholders

#### 10. Status Pulse
```css
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```
**Use case**: Running status badges

### Using CSS Animations with Tailwind

Tailwind provides built-in animation utilities:

```tsx
// Fade in on open, fade out on close (Radix UI pattern)
<DialogOverlay
  className="
    data-[state=open]:animate-in
    data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0
    data-[state=open]:fade-in-0
  "
/>

// Scale + slide animation
<DialogContent
  className="
    data-[state=open]:animate-in
    data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0
    data-[state=open]:fade-in-0
    data-[state=closed]:zoom-out-95
    data-[state=open]:zoom-in-95
    data-[state=closed]:slide-out-to-top-[48%]
    data-[state=open]:slide-in-from-top-[48%]
    duration-200
  "
/>
```

**Common Tailwind Animation Classes:**
- `animate-in` / `animate-out` - Entry/exit animation triggers
- `fade-in-0` / `fade-out-0` - Opacity transitions
- `zoom-in-95` / `zoom-out-95` - Scale transitions (95% → 100%)
- `slide-in-from-*` / `slide-out-to-*` - Directional slides
- `duration-200` - Animation duration (200ms)

---

## Motion Variants

Motion (Framer Motion) is available for **opt-in** complex animations. By default, components use CSS animations.

### Dialog with Motion

```tsx
import { DialogContent } from '@/components/ui/dialog';

// Default: CSS animations
<DialogContent>
  <DialogTitle>Standard Dialog</DialogTitle>
  {/* Uses CSS fade + zoom + slide */}
</DialogContent>

// Opt-in: Motion animations
<DialogContent useMotion={true}>
  <DialogTitle>Motion-Powered Dialog</DialogTitle>
  {/* Uses Motion variants for programmatic control */}
</DialogContent>
```

**Motion variants defined:**
```tsx
const dialogMotionVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // --ease-out
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};
```

### Tabs with Animated Indicator

```tsx
import { TabsList } from '@/components/ui/tabs';

// Default: CSS transitions
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="details">Details</TabsTrigger>
  {/* Uses CSS transition on tab change */}
</TabsList>

// Opt-in: Motion animated indicator
<TabsList animatedIndicator={true}>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="details">Details</TabsTrigger>
  {/* Motion underline slides smoothly between tabs */}
</TabsList>
```

**Note**: Animated indicator is a simplified implementation. For production use, consider tracking active tab dimensions with `layoutId` for shared layout animations.

### Custom Motion Animations

For custom components, use Motion directly:

```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{
    duration: 0.2,
    ease: [0, 0, 0.2, 1] // --ease-out
  }}
>
  Custom content
</motion.div>
```

---

## Usage Patterns

### 1. Overlay Animations (Dialog, Popover, Tooltip)

**Pattern**: Fade background + scale/slide content

```tsx
// Overlay
<DialogOverlay
  className="
    data-[state=open]:animate-in
    data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0
    data-[state=open]:fade-in-0
  "
/>

// Content
<DialogContent
  className="
    data-[state=open]:zoom-in-95
    data-[state=closed]:zoom-out-95
    duration-200
  "
>
  {/* Dialog content */}
</DialogContent>
```

**Why**: Provides visual context (overlay fade) + directional entry (content zoom/slide)

### 2. List Animations (Stagger, Enter/Exit)

**Pattern**: Sequential entry with delay

```tsx
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.li key={item.id} variants={item}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

**Why**: Draws attention to individual items, feels responsive

### 3. Loading States (Pulse, Indeterminate)

**Pattern**: Infinite loop animations

```tsx
// Pulse (for active states)
<div className="animate-pulse-subtle">
  Processing...
</div>

// Indeterminate progress bar
<div className="relative h-1 bg-muted overflow-hidden">
  <div className="absolute inset-0 w-1/4 bg-primary animate-indeterminate" />
</div>
```

**Why**: Communicates ongoing process without precise progress

### 4. Hover/Focus Transitions

**Pattern**: Short duration color/scale changes

```css
.button {
  transition: all var(--duration-fast) var(--ease-out);
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}
```

**Why**: Immediate feedback (100ms feels instant)

---

## Performance

### GPU-Accelerated Properties

**Fast** (GPU-accelerated):
- `opacity`
- `transform` (translate, scale, rotate)
- `filter` (blur, brightness)

**Slow** (causes layout reflow):
- `width`, `height`
- `top`, `left`, `right`, `bottom` (use `transform` instead)
- `margin`, `padding`

**Example - DO:**
```css
/* ✅ Use transform for movement */
.element {
  transform: translateY(10px);
  transition: transform var(--duration-normal);
}
```

**Example - DON'T:**
```css
/* ❌ Avoid animating layout properties */
.element {
  top: 10px;
  transition: top var(--duration-normal);
}
```

### Prefer CSS Over Motion for Simple Cases

**CSS Animations:**
- Smaller bundle size (no JS library)
- Browser-optimized (runs on compositor thread)
- Declarative (less code)
- Better for simple enter/exit transitions

**Use Motion When:**
- Need gesture interactions (drag, swipe)
- Layout animations (elements rearranging)
- Complex sequencing (multiple steps)
- Dynamic spring physics

### Reduce Motion Support

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Users with motion sensitivity see instant state changes instead of animations.

---

## Accessibility

### Duration Constraints

**Guideline**: Keep animations under 300ms for most cases

- **Fast (100ms)**: Micro-interactions (hover states)
- **Normal (200ms)**: **Default** - Overlays, dialogs
- **Slow (300ms)**: Emphasis (alerts, validation)
- **Slower (500ms)**: Only for complex sequences

**Why**: Longer animations delay user interaction and can feel sluggish

### Don't Block Interaction

Animations should not prevent users from continuing:

**Bad**:
```tsx
// ❌ Button disabled during animation
<Button disabled={isAnimating}>
  Submit
</Button>
```

**Good**:
```tsx
// ✅ Animation provides feedback, doesn't block
<Button onClick={handleSubmit}>
  {isSubmitting ? <Spinner /> : "Submit"}
</Button>
```

### Focus Management

Ensure focus moves correctly after animations:

```tsx
<Dialog onOpenChange={(open) => {
  if (open) {
    // Focus first input after dialog animation completes
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200); // Match animation duration
  }
}}>
  <DialogContent>
    <input ref={inputRef} />
  </DialogContent>
</Dialog>
```

### ARIA Live Regions

For loading states, use ARIA to announce changes:

```tsx
<div
  role="status"
  aria-live="polite"
  className="animate-pulse-subtle"
>
  Loading...
</div>
```

---

## Integration

### With Phase 01 (Design Tokens)

Animation tokens integrate seamlessly with color tokens:

```css
.card {
  background: hsl(var(--card));
  transition:
    background var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out);
}

.card:hover {
  background: hsl(var(--accent));
  border-color: hsl(var(--primary));
}
```

**Why**: Consistent timing across all transitions (colors, transforms, shadows)

### With Phase 02-06 (Component System)

All modernized components use animation tokens:

```tsx
// Input validation state (Phase 04)
<Input
  state="error"
  className="transition-all duration-200" // Uses --duration-normal
/>

// Dialog size variants (Phase 05)
<DialogContent
  size="lg"
  className="zoom-in-95 duration-200" // Uses CSS + tokens
/>

// Tabs with indicator (Phase 06)
<TabsList animatedIndicator={true}>
  {/* Uses Motion when enabled, CSS otherwise */}
</TabsList>
```

### For Phase 08+ (Dark Mode Transitions)

Color transitions will use animation tokens:

```css
:root {
  transition:
    background-color var(--duration-normal) var(--ease-out),
    color var(--duration-normal) var(--ease-out);
}

.dark {
  /* Colors change smoothly when theme switches */
}
```

---

## Examples

### Example 1: Animated Card on Hover (CSS)

```tsx
<div className="
  card-surface
  transition-all duration-200
  hover:shadow-lg hover:border-primary hover:-translate-y-1
">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

**Result**: Card lifts 4px, shadow grows, border color changes (200ms)

### Example 2: Toast Notification (CSS)

```tsx
<div className="
  bg-card border border-border rounded-lg p-4
  animate-in slide-in-from-bottom-4 fade-in-0 duration-300
">
  <p>Notification message</p>
</div>
```

**Result**: Toast slides up from bottom with fade (300ms)

### Example 3: Modal Dialog (Motion)

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>Open Modal</DialogTrigger>
  <DialogContent useMotion={true} size="lg">
    <DialogTitle>Modal Title</DialogTitle>
    <p>Modal content with Motion-powered animations</p>
  </DialogContent>
</Dialog>
```

**Result**: Dialog fades + scales + slides with Motion (programmatic control)

### Example 4: Staggered List (Motion)

```tsx
import { motion } from 'motion/react';

const list = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

<motion.ul
  variants={list}
  initial="hidden"
  animate="visible"
>
  {['Item 1', 'Item 2', 'Item 3'].map((text, i) => (
    <motion.li key={i} variants={item}>
      {text}
    </motion.li>
  ))}
</motion.ul>
```

**Result**: List items appear sequentially with 100ms delay between each

### Example 5: Progress Bar with Glow (CSS)

```tsx
<div className="h-2 bg-muted rounded-full overflow-hidden">
  <div
    className="h-full bg-primary progress-working"
    style={{ width: '60%' }}
  >
    {/* progress-working class adds glow sweep animation */}
  </div>
</div>
```

**Result**: Progress bar with animated glow sweep effect

### Example 6: Accordion Expand/Collapse (CSS)

```tsx
import * as Accordion from '@radix-ui/react-accordion';

<Accordion.Item value="item-1">
  <Accordion.Trigger>Click to expand</Accordion.Trigger>
  <Accordion.Content className="
    data-[state=open]:animate-accordion-down
    data-[state=closed]:animate-accordion-up
  ">
    Content that expands smoothly
  </Accordion.Content>
</Accordion.Item>
```

**Result**: Content height animates smoothly with CSS

### Example 7: Loading Skeleton (CSS)

```tsx
<div className="space-y-4">
  <div className="h-4 bg-muted rounded animate-pulse-subtle w-3/4" />
  <div className="h-4 bg-muted rounded animate-pulse-subtle w-1/2" />
  <div className="h-4 bg-muted rounded animate-pulse-subtle w-5/6" />
</div>
```

**Result**: Pulsing placeholder lines (500ms cycle)

### Example 8: Drag and Drop (Motion)

```tsx
import { motion, Reorder } from 'motion/react';

<Reorder.Group values={items} onReorder={setItems}>
  {items.map(item => (
    <Reorder.Item key={item.id} value={item}>
      <motion.div
        whileDrag={{ scale: 1.05, rotate: 2 }}
        className="cursor-grab active:cursor-grabbing"
      >
        {item.name}
      </motion.div>
    </Reorder.Item>
  ))}
</Reorder.Group>
```

**Result**: Draggable list items with scale + rotate feedback

### Example 9: Tabs with Animated Indicator (Motion)

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="overview">
  <TabsList animatedIndicator={true}>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="analytics">Analytics content</TabsContent>
  <TabsContent value="settings">Settings content</TabsContent>
</Tabs>
```

**Result**: Underline indicator smoothly slides between active tabs

### Example 10: Success Confirmation (Motion with Bounce)

```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{
    type: "spring",
    stiffness: 200,
    damping: 15
  }}
  className="bg-success text-success-foreground rounded-full p-4"
>
  ✓ Success!
</motion.div>
```

**Result**: Success badge bounces in with spring physics

---

## Decision Guide: CSS vs Motion

### Use CSS When:

- ✅ Simple enter/exit transitions (fade, slide, scale)
- ✅ Hover/focus states
- ✅ Loading states (pulse, indeterminate)
- ✅ Overlays (dialogs, popovers, tooltips)
- ✅ Accordion expand/collapse
- ✅ Tab content switching
- ✅ Button animations

**Why**: Smaller bundle, faster performance, simpler code

### Use Motion When:

- ✅ Gesture interactions (drag, swipe, pinch)
- ✅ Layout animations (elements rearranging)
- ✅ Staggered list animations
- ✅ Complex multi-step sequences
- ✅ Spring physics (bounce, elasticity)
- ✅ Shared layout animations (magic move)
- ✅ Scroll-triggered animations

**Why**: Programmatic control, advanced features, better for complex cases

### Quick Reference Table

| Scenario | Recommendation | Rationale |
|----------|----------------|-----------|
| Dialog open/close | CSS | Simple fade + scale |
| Tooltip appear | CSS | Quick micro-interaction |
| Button hover | CSS | Immediate color/scale change |
| Draggable card | Motion | Gesture tracking needed |
| List reordering | Motion | Layout animations |
| Accordion | CSS | Height animation sufficient |
| Staggered list entry | Motion | Sequential timing control |
| Progress bar | CSS | Infinite loop animation |
| Success confirmation with bounce | Motion | Spring physics |
| Tab switching | CSS (default) | CSS transitions work well |
| Tab indicator sliding | Motion (opt-in) | Shared layout animation |

---

## Summary

**Animation System at a Glance:**

1. **Tokens**: 5 durations, 5 easings, 7+ shorthands
2. **CSS Animations**: 10+ keyframes ready to use
3. **Tailwind Integration**: `animate-in`, `fade-in-0`, `zoom-in-95`, etc.
4. **Motion (Opt-In)**: Dialog `useMotion` prop, Tabs `animatedIndicator` prop
5. **Performance**: Prefer `transform` and `opacity` (GPU-accelerated)
6. **Accessibility**: Respects `prefers-reduced-motion`, animations under 300ms
7. **Integration**: Works seamlessly with Phase 01-06 tokens and components

**Default Behavior**: CSS animations everywhere (backward compatible)
**Opt-In Motion**: Only when you need gestures, layout animations, or complex sequences

**Next Steps**: Use these patterns in your components. For Phase 08 (Dark Mode), add smooth color transitions using animation tokens.

---

*Documentation created: 2026-01-21*
*Phase: 07-motion-animation-system*
