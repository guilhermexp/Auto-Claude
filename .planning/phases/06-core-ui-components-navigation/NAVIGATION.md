# Navigation & Utility Components

**Phase:** 06-core-ui-components-navigation
**Created:** 2026-01-21
**Status:** Complete

---

## Overview

This document provides comprehensive documentation for navigation and utility components in the Auto-Claude UI system. These components are essential building blocks for content organization, user feedback, and visual hierarchy.

**Component Categories:**

1. **Navigation Components:**
   - Tabs - Organize content into switchable panels

2. **Utility Components:**
   - Progress - Visual feedback for loading and completion states
   - Badge - Status indicators, counts, and labels
   - Separator - Visual dividers for content sections

All components are built using:
- **Radix UI** - Accessible, unstyled primitives
- **CVA (class-variance-authority)** - Type-safe variant management
- **Design Tokens** - Integration with Phase 01-03 token systems
- **TypeScript** - Full type safety with VariantProps

---

## Components

### Tabs

**Purpose:** Organize content into switchable panels, reducing cognitive load and screen clutter.

**File:** `apps/frontend/src/renderer/components/ui/tabs.tsx`

**Radix Primitive:** `@radix-ui/react-tabs`

#### API Reference

**Tabs (Root)**
```tsx
<Tabs defaultValue="tab1" orientation="horizontal">
  {/* TabsList and TabsContent here */}
</Tabs>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultValue` | `string` | - | Initially active tab |
| `value` | `string` | - | Controlled active tab |
| `onValueChange` | `(value: string) => void` | - | Callback when tab changes |
| `orientation` | `"horizontal"` | `"horizontal"` | Tab orientation (vertical not supported) |

**TabsList**
```tsx
<TabsList size="default" variant="default">
  {/* TabsTrigger components */}
</TabsList>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | List container size |
| `variant` | `"default" \| "outline" \| "pills"` | `"default"` | List style variant |

**Size Variants:**

| Size | Height | Padding | Use Case |
|------|--------|---------|----------|
| `sm` | `h-8` (2rem) | `p-0.5` (0.125rem) | Compact UI, dense layouts |
| `default` | `h-10` (2.5rem) | `p-1` (0.25rem) | Standard tabs, most common |
| `lg` | `h-12` (3rem) | `p-1.5` (0.375rem) | Prominent navigation, large screens |

**Style Variants:**

| Variant | Appearance | Use Case |
|---------|------------|----------|
| `default` | Gray background (`bg-secondary`) | Standard tabs, contained areas |
| `outline` | Border with transparent bg | Minimal look, light interfaces |
| `pills` | Transparent bg, spaced tabs | Modern look, card-style tabs |

**TabsTrigger**
```tsx
<TabsTrigger value="tab1" size="default">
  Tab Label
</TabsTrigger>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Tab identifier (required) |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Trigger button size |
| `disabled` | `boolean` | `false` | Disable tab interaction |

**Size Variants:**

| Size | Padding | Font Size | Use Case |
|------|---------|-----------|----------|
| `sm` | `px-2 py-1` | `text-xs` | Compact tabs, narrow spaces |
| `default` | `px-3 py-1.5` | `text-sm` | Standard tabs, most interfaces |
| `lg` | `px-4 py-2` | `text-base` | Large tabs, emphasis |

**TabsContent**
```tsx
<TabsContent value="tab1">
  {/* Content for this tab panel */}
</TabsContent>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Tab identifier matching TabsTrigger |

#### Usage Examples

**Basic Tabs (Default Variant)**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function SettingsTabs() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        {/* General settings form */}
      </TabsContent>

      <TabsContent value="security">
        {/* Security settings form */}
      </TabsContent>

      <TabsContent value="notifications">
        {/* Notification settings form */}
      </TabsContent>
    </Tabs>
  );
}
```

**Compact Tabs (Small Size)**
```tsx
export function CompactTabs() {
  return (
    <Tabs defaultValue="code">
      <TabsList size="sm">
        <TabsTrigger value="code" size="sm">Code</TabsTrigger>
        <TabsTrigger value="preview" size="sm">Preview</TabsTrigger>
        <TabsTrigger value="docs" size="sm">Docs</TabsTrigger>
      </TabsList>

      <TabsContent value="code">
        {/* Code editor */}
      </TabsContent>

      <TabsContent value="preview">
        {/* Live preview */}
      </TabsContent>

      <TabsContent value="docs">
        {/* Documentation */}
      </TabsContent>
    </Tabs>
  );
}
```

**Outline Tabs (Minimal Style)**
```tsx
export function MinimalTabs() {
  return (
    <Tabs defaultValue="overview">
      <TabsList variant="outline">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Overview dashboard */}
      </TabsContent>

      <TabsContent value="analytics">
        {/* Analytics charts */}
      </TabsContent>

      <TabsContent value="reports">
        {/* Reports list */}
      </TabsContent>
    </Tabs>
  );
}
```

**Pills Tabs (Modern Style)**
```tsx
export function ModernTabs() {
  return (
    <Tabs defaultValue="all">
      <TabsList variant="pills">
        <TabsTrigger value="all">All Tasks</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        {/* All tasks list */}
      </TabsContent>

      <TabsContent value="active">
        {/* Active tasks */}
      </TabsContent>

      <TabsContent value="completed">
        {/* Completed tasks */}
      </TabsContent>
    </Tabs>
  );
}
```

**Large Tabs (Prominent Navigation)**
```tsx
export function ProminentTabs() {
  return (
    <Tabs defaultValue="dashboard">
      <TabsList size="lg">
        <TabsTrigger value="dashboard" size="lg">Dashboard</TabsTrigger>
        <TabsTrigger value="projects" size="lg">Projects</TabsTrigger>
        <TabsTrigger value="team" size="lg">Team</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        {/* Dashboard view */}
      </TabsContent>

      <TabsContent value="projects">
        {/* Projects list */}
      </TabsContent>

      <TabsContent value="team">
        {/* Team members */}
      </TabsContent>
    </Tabs>
  );
}
```

**Controlled Tabs (with State)**
```tsx
import { useState } from 'react';

export function ControlledTabs() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div>
      <p>Current tab: {activeTab}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* Profile form */}
        </TabsContent>

        <TabsContent value="account">
          {/* Account settings */}
        </TabsContent>

        <TabsContent value="billing">
          {/* Billing information */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### Accessibility

**Keyboard Navigation:**
- **Tab** - Move focus to/from tab list
- **Arrow Left/Right** - Navigate between tabs (horizontal orientation)
- **Home** - Focus first tab
- **End** - Focus last tab
- **Enter/Space** - Activate focused tab

**ARIA Attributes:**
- `role="tablist"` - TabsList container
- `role="tab"` - Each TabsTrigger
- `role="tabpanel"` - Each TabsContent
- `aria-selected="true|false"` - Active/inactive state
- `aria-controls` - Links tab to panel
- `id` and `aria-labelledby` - Associates panel with tab

**Screen Reader Behavior:**
- Announces "Tab N of M" when navigating
- Announces selected/not selected state
- Announces tab label and panel content

**Focus Management:**
- Focus visible ring on keyboard navigation
- Focus trapped within tab list during arrow key navigation
- Focus moves to panel content on tab activation

#### Design Tokens Integration

**From Phase 01 (Colors):**
- `bg-secondary` - Default tab list background
- `bg-card` - Active tab background
- `text-foreground` - Active tab text
- `text-muted-foreground` - Inactive tab text
- `border-border` - Outline variant border
- `ring` - Focus ring color

**From Phase 02 (Typography):**
- `text-xs` (12px) - Small tabs
- `text-sm` (14px) - Default tabs
- `text-base` (16px) - Large tabs
- `font-medium` - Tab label weight

**From Phase 03 (Spacing):**
- `p-0.5` (0.125rem) - Small list padding
- `p-1` (0.25rem) - Default list padding
- `p-1.5` (0.375rem) - Large list padding
- `px-2 py-1` - Small trigger padding
- `px-3 py-1.5` - Default trigger padding
- `px-4 py-2` - Large trigger padding
- `mt-3` (0.75rem) - Content top margin

---

### Progress

**Purpose:** Provide visual feedback for loading states, file uploads, task completion, and other time-based operations.

**File:** `apps/frontend/src/renderer/components/ui/progress.tsx`

**Radix Primitive:** `@radix-ui/react-progress`

#### API Reference

**Progress**
```tsx
<Progress value={50} size="default" variant="default" animated={false} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Progress value (0-100) |
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Height variant |
| `variant` | `"default" \| "success" \| "warning" \| "destructive" \| "info"` | `"default"` | Color variant |
| `animated` | `boolean` | `false` | Enable indeterminate animation |
| `max` | `number` | `100` | Maximum value |

**Size Variants:**

| Size | Height | Use Case |
|------|--------|----------|
| `sm` | `h-1` (0.25rem) | Subtle indicators, inline progress |
| `default` | `h-2` (0.5rem) | Standard progress bars, most common |
| `lg` | `h-3` (0.75rem) | Prominent progress, emphasized feedback |
| `xl` | `h-4` (1rem) | Hero sections, large UI elements |

**Color Variants:**

| Variant | Color | Use Case |
|---------|-------|----------|
| `default` | `bg-primary` | General progress, neutral operations |
| `success` | `bg-success` | Completed tasks, successful uploads |
| `warning` | `bg-warning` | Caution states, approaching limits |
| `destructive` | `bg-destructive` | Error states, failed operations |
| `info` | `bg-info` | Informational progress, system updates |

#### Usage Examples

**Basic Progress (Default)**
```tsx
import { Progress } from '@/components/ui/progress';

export function FileUpload() {
  const [progress, setProgress] = useState(0);

  return (
    <div className="space-y-2">
      <p>Uploading file... {progress}%</p>
      <Progress value={progress} />
    </div>
  );
}
```

**Success Progress (Completed)**
```tsx
export function CompletedTask() {
  return (
    <div className="space-y-2">
      <p>Task completed!</p>
      <Progress value={100} variant="success" />
    </div>
  );
}
```

**Warning Progress (Approaching Limit)**
```tsx
export function StorageUsage() {
  const usage = 85; // 85% full

  return (
    <div className="space-y-2">
      <p>Storage: {usage}% full</p>
      <Progress value={usage} variant="warning" />
    </div>
  );
}
```

**Error Progress (Failed Operation)**
```tsx
export function FailedDownload() {
  return (
    <div className="space-y-2">
      <p>Download failed</p>
      <Progress value={30} variant="destructive" />
    </div>
  );
}
```

**Info Progress (System Update)**
```tsx
export function SystemUpdate() {
  const [progress, setProgress] = useState(0);

  return (
    <div className="space-y-2">
      <p>Installing updates...</p>
      <Progress value={progress} variant="info" />
    </div>
  );
}
```

**Indeterminate Progress (Unknown Duration)**
```tsx
export function LoadingData() {
  return (
    <div className="space-y-2">
      <p>Loading data...</p>
      <Progress animated />
    </div>
  );
}
```

**Small Progress (Inline)**
```tsx
export function InlineProgress() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Loading:</span>
      <Progress value={60} size="sm" className="flex-1" />
      <span className="text-sm text-muted-foreground">60%</span>
    </div>
  );
}
```

**Large Progress (Prominent)**
```tsx
export function HeroProgress() {
  const [progress, setProgress] = useState(0);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Building your project</h2>
      <Progress value={progress} size="lg" variant="info" />
      <p className="text-muted-foreground">
        Step 3 of 5: Compiling TypeScript...
      </p>
    </div>
  );
}
```

**Extra Large Progress (Hero Section)**
```tsx
export function OnboardingProgress() {
  const step = 3;
  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Setup Progress</h1>
      <Progress value={progress} size="xl" variant="success" />
      <p className="text-lg">
        Step {step} of {totalSteps}
      </p>
    </div>
  );
}
```

**Multi-Step Progress**
```tsx
export function MultiStepProgress() {
  const steps = [
    { label: 'Preparing', progress: 100, variant: 'success' },
    { label: 'Processing', progress: 60, variant: 'default' },
    { label: 'Finalizing', progress: 0, variant: 'default' },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{step.label}</span>
            <span className="text-muted-foreground">{step.progress}%</span>
          </div>
          <Progress value={step.progress} variant={step.variant} />
        </div>
      ))}
    </div>
  );
}
```

#### Accessibility

**ARIA Attributes:**
- `role="progressbar"` - Identifies as progress indicator
- `aria-valuenow={value}` - Current value
- `aria-valuemin="0"` - Minimum value
- `aria-valuemax={max}` - Maximum value
- `aria-label` or `aria-labelledby` - Descriptive label

**Screen Reader Behavior:**
- Announces "Progress bar, X percent" on focus
- Updates announced when value changes (throttled)
- Indeterminate state announced as "Loading" or "In progress"

**Visual Accessibility:**
- High contrast indicator colors
- Sufficient height for visibility
- Clear visual distinction between variants
- Color not sole indicator (combine with text/icons)

**Usage Guidelines:**
- Always provide text description of what's progressing
- Show percentage or step count when possible
- Use appropriate variant for context (success/warning/error)
- Don't rely on color alone - include text/icons

#### Design Tokens Integration

**From Phase 01 (Colors):**
- `bg-border` - Track background
- `bg-primary` - Default indicator
- `bg-success` - Success indicator
- `bg-warning` - Warning indicator
- `bg-destructive` - Error indicator
- `bg-info` - Info indicator

**From Phase 03 (Spacing):**
- `h-1` (0.25rem) - Small size
- `h-2` (0.5rem) - Default size
- `h-3` (0.75rem) - Large size
- `h-4` (1rem) - XL size

**Animations:**
- `transition-all duration-300 ease-out` - Smooth value changes
- `progress-working` - Indeterminate animation (CSS keyframes)

---

### Badge

**Purpose:** Display status indicators, counts, labels, and tags for categorical information.

**File:** `apps/frontend/src/renderer/components/ui/badge.tsx`

**Component Type:** Native HTML (no Radix primitive)

**Status:** Already modernized with cva variants (9 variants available)

#### API Reference

**Badge**
```tsx
<Badge variant="default">Label</Badge>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "secondary" \| "destructive" \| "outline" \| "success" \| "warning" \| "info" \| "purple" \| "muted"` | `"default"` | Color/style variant |

**Variants:**

| Variant | Colors | Use Case |
|---------|--------|----------|
| `default` | Primary bg, primary text | Primary actions, emphasis |
| `secondary` | Secondary bg, secondary text | Secondary information |
| `destructive` | Destructive bg, white text | Errors, critical states |
| `outline` | Border only, foreground text | Minimal look, tags |
| `success` | Success bg (10% opacity), success text | Success states, completed |
| `warning` | Warning bg (10% opacity), warning text | Warnings, attention needed |
| `info` | Info bg (10% opacity), info text | Informational, hints |
| `purple` | Purple bg (10% opacity), purple text | Special categories, premium |
| `muted` | Muted bg, muted text | Disabled, inactive |

#### Usage Examples

**Status Badges**
```tsx
import { Badge } from '@/components/ui/badge';

export function TaskStatus({ status }) {
  const variants = {
    pending: 'warning',
    active: 'info',
    completed: 'success',
    failed: 'destructive',
  };

  return <Badge variant={variants[status]}>{status}</Badge>;
}
```

**Count Badges**
```tsx
export function NotificationBadge({ count }) {
  return (
    <div className="relative">
      <BellIcon />
      <Badge variant="destructive" className="absolute -top-2 -right-2">
        {count}
      </Badge>
    </div>
  );
}
```

**Tag List**
```tsx
export function Tags({ tags }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <Badge key={tag} variant="outline">{tag}</Badge>
      ))}
    </div>
  );
}
```

**Feature Labels**
```tsx
export function FeatureLabel() {
  return (
    <div className="flex items-center gap-2">
      <span>Premium Feature</span>
      <Badge variant="purple">PRO</Badge>
    </div>
  );
}
```

**All Variants Showcase**
```tsx
export function BadgeShowcase() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="purple">Purple</Badge>
      <Badge variant="muted">Muted</Badge>
    </div>
  );
}
```

#### Accessibility

**Semantic HTML:**
- Uses `<div>` element (inline-flex)
- Can be nested in buttons, links, or standalone

**Screen Reader Considerations:**
- Text content read directly
- Add `aria-label` for icon-only badges
- Use `role="status"` for live updates

**Visual Accessibility:**
- Color + text content (not color alone)
- High contrast text on backgrounds
- Sufficient padding for readability

#### Design Tokens Integration

**From Phase 01 (Colors):**
- All badge variants use semantic color tokens
- 10% opacity for subtle variants (success/warning/info/purple)
- Border tokens for outline variant

**From Phase 03 (Spacing):**
- `px-2.5 py-0.5` - Compact padding
- `text-xs` - Small, readable text

---

### Separator

**Purpose:** Create visual dividers between content sections, improving readability and hierarchy.

**File:** `apps/frontend/src/renderer/components/ui/separator.tsx`

**Radix Primitive:** `@radix-ui/react-separator`

**Status:** Already functional and well-implemented

#### API Reference

**Separator**
```tsx
<Separator orientation="horizontal" decorative />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Separator direction |
| `decorative` | `boolean` | `true` | Whether separator is purely visual |

**Orientation:**

| Orientation | Dimensions | Use Case |
|-------------|------------|----------|
| `horizontal` | `h-[1px] w-full` | Divide vertical stacks, sections |
| `vertical` | `h-full w-[1px]` | Divide horizontal layouts, sidebars |

#### Usage Examples

**Horizontal Separator (Section Divider)**
```tsx
import { Separator } from '@/components/ui/separator';

export function ContentSections() {
  return (
    <div>
      <section>
        <h2>Section 1</h2>
        <p>Content here...</p>
      </section>

      <Separator className="my-4" />

      <section>
        <h2>Section 2</h2>
        <p>More content...</p>
      </section>
    </div>
  );
}
```

**Vertical Separator (Sidebar Divider)**
```tsx
export function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 p-4">
        <nav>Sidebar content</nav>
      </aside>

      <Separator orientation="vertical" />

      <main className="flex-1 p-4">
        <h1>Main content</h1>
      </main>
    </div>
  );
}
```

**Menu Item Separator**
```tsx
export function Menu() {
  return (
    <div className="w-48 rounded-md border p-1">
      <button>Edit</button>
      <button>Copy</button>

      <Separator className="my-1" />

      <button className="text-destructive">Delete</button>
    </div>
  );
}
```

**Card Section Separator**
```tsx
export function Card() {
  return (
    <div className="rounded-lg border">
      <div className="p-4">
        <h3>Card Header</h3>
      </div>

      <Separator />

      <div className="p-4">
        <p>Card content...</p>
      </div>

      <Separator />

      <div className="p-4">
        <button>Action</button>
      </div>
    </div>
  );
}
```

**Form Section Separator**
```tsx
export function Form() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <h3>Personal Information</h3>
        <Input placeholder="Name" />
        <Input placeholder="Email" />
      </div>

      <Separator />

      <div className="space-y-2">
        <h3>Account Settings</h3>
        <Input placeholder="Username" />
        <Input type="password" placeholder="Password" />
      </div>
    </form>
  );
}
```

#### Accessibility

**ARIA Attributes:**
- `role="separator"` - Identifies as separator
- `aria-orientation="horizontal|vertical"` - Direction
- `decorative={true}` - Removes from accessibility tree (purely visual)

**Semantic Usage:**
- Use `decorative={true}` for visual dividers
- Use `decorative={false}` for meaningful separators
- Combine with semantic HTML (sections, articles)

**Screen Reader Behavior:**
- Decorative separators ignored by screen readers
- Non-decorative separators announced as "Separator"

#### Design Tokens Integration

**From Phase 01 (Colors):**
- `bg-border` - Subtle divider color

**Fixed Dimensions:**
- `h-[1px]` / `w-[1px]` - 1px line (not token-based, correct for thin borders)
- `w-full` / `h-full` - Fill container

---

## Usage Patterns

### Tab Navigation

**Settings Panel**
```tsx
export function Settings() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {/* General settings form */}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          {/* Appearance settings form */}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          {/* Notification settings form */}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {/* Advanced settings form */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Content Organization**
```tsx
export function Documentation() {
  return (
    <Tabs defaultValue="overview" variant="pills">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="api">API Reference</TabsTrigger>
        <TabsTrigger value="examples">Examples</TabsTrigger>
        <TabsTrigger value="changelog">Changelog</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Overview documentation */}
      </TabsContent>

      <TabsContent value="api">
        {/* API reference tables */}
      </TabsContent>

      <TabsContent value="examples">
        {/* Code examples */}
      </TabsContent>

      <TabsContent value="changelog">
        {/* Version history */}
      </TabsContent>
    </Tabs>
  );
}
```

### Progress Indicators

**File Upload with Progress**
```tsx
export function FileUploader() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="space-y-4">
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} variant="info" />
        </div>
      )}
    </div>
  );
}
```

**Task Completion Indicator**
```tsx
export function TaskProgress({ completed, total }) {
  const progress = (completed / total) * 100;
  const variant = progress === 100 ? 'success' : 'default';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Tasks</span>
        <span className="text-muted-foreground">
          {completed} of {total}
        </span>
      </div>
      <Progress value={progress} variant={variant} />
    </div>
  );
}
```

**Loading State**
```tsx
export function DataLoader() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading data...</p>
          <Progress animated />
        </>
      ) : (
        <div>{/* Loaded content */}</div>
      )}
    </div>
  );
}
```

### Badge Usage

**Status Indicators**
```tsx
export function TaskCard({ task }) {
  const statusVariants = {
    pending: { variant: 'warning', label: 'Pending' },
    inProgress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'destructive', label: 'Failed' },
  };

  const status = statusVariants[task.status];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3>{task.title}</h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{task.description}</p>
    </div>
  );
}
```

**Notification Counts**
```tsx
export function NotificationButton({ count }) {
  return (
    <button className="relative p-2">
      <BellIcon />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </button>
  );
}
```

**Tag System**
```tsx
export function ArticleTags({ tags }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-secondary">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
```

### Section Separators

**Page Sections**
```tsx
export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-2">Mission</h2>
        <p>Our mission statement...</p>
      </section>

      <Separator />

      <section>
        <h2 className="text-xl font-bold mb-2">Team</h2>
        <p>Meet our team...</p>
      </section>

      <Separator />

      <section>
        <h2 className="text-xl font-bold mb-2">Contact</h2>
        <p>Get in touch...</p>
      </section>
    </div>
  );
}
```

**Sidebar Layout**
```tsx
export function AppLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 p-4">
        <nav className="space-y-2">
          <button>Dashboard</button>
          <button>Projects</button>
          <button>Settings</button>
        </nav>
      </aside>

      <Separator orientation="vertical" />

      <main className="flex-1 p-6">
        {/* Main content */}
      </main>

      <Separator orientation="vertical" />

      <aside className="w-64 p-4">
        {/* Right sidebar */}
      </aside>
    </div>
  );
}
```

---

## Composition Patterns

### Tabs + FormField

**Tabbed Settings Form**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ProfileSettings() {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <FormField label="Display Name" required>
          <Input placeholder="John Doe" />
        </FormField>

        <FormField label="Bio" hint="Tell us about yourself">
          <Textarea placeholder="I'm a developer..." />
        </FormField>
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <FormField label="Email" required>
          <Input type="email" placeholder="john@example.com" />
        </FormField>

        <FormField label="Password">
          <Input type="password" placeholder="••••••••" />
        </FormField>
      </TabsContent>

      <TabsContent value="privacy" className="space-y-4">
        {/* Privacy settings */}
      </TabsContent>
    </Tabs>
  );
}
```

### Tabs + Card

**Content Cards in Tabs**
```tsx
import { Card } from '@/components/ui/card';

export function Dashboard() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <h3>Total Users</h3>
            <p className="text-3xl font-bold">1,234</p>
          </Card>

          <Card>
            <h3>Active Sessions</h3>
            <p className="text-3xl font-bold">567</p>
          </Card>

          <Card>
            <h3>Revenue</h3>
            <p className="text-3xl font-bold">$12,345</p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="analytics">
        {/* Analytics charts */}
      </TabsContent>

      <TabsContent value="reports">
        {/* Reports list */}
      </TabsContent>
    </Tabs>
  );
}
```

### Progress + Text

**Upload Feedback**
```tsx
export function FileUploadStatus({ filename, progress, status }) {
  const variants = {
    uploading: 'info',
    success: 'success',
    error: 'destructive',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{filename}</span>
        <Badge variant={variants[status]}>
          {status === 'uploading' ? `${progress}%` : status}
        </Badge>
      </div>

      <Progress
        value={progress}
        variant={variants[status]}
        animated={status === 'uploading'}
      />
    </div>
  );
}
```

### Badge + Button

**Notification Button with Count**
```tsx
export function NotificationCenter({ notifications }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <button className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
        >
          {unreadCount}
        </Badge>
      )}
    </button>
  );
}
```

---

## Accessibility Summary

### Keyboard Navigation

**Tabs:**
- Tab - Enter/exit tab list
- Arrow Left/Right - Navigate tabs
- Home/End - First/last tab
- Enter/Space - Activate tab

**Progress:**
- Not interactive (no keyboard navigation needed)
- Screen reader announces value changes

**Badge:**
- Not interactive (unless inside button/link)
- Inherits parent element navigation

**Separator:**
- Not interactive (purely visual)
- Ignored by screen readers when decorative

### Screen Reader Support

**Tabs:**
- "Tab N of M" announcements
- "Selected" / "Not selected" state
- Tab label and panel content

**Progress:**
- "Progress bar, X percent"
- Live region updates (throttled)
- Indeterminate state announced

**Badge:**
- Text content read directly
- Add aria-label for icon-only badges
- Use role="status" for live updates

**Separator:**
- Announced as "Separator" (non-decorative)
- Ignored completely (decorative)

### Focus Management

**Tabs:**
- Visible focus rings
- Focus trapped in tab list during arrow navigation
- Focus moves to panel on activation

**Other Components:**
- Non-interactive components (Progress, Badge, Separator)
- No focus management needed
- Inherit focus from parent when nested

---

## Integration with Design System

### Phase 01: Design Tokens Foundation

**Color Tokens Used:**
- `bg-primary`, `bg-secondary`, `bg-card` - Backgrounds
- `text-foreground`, `text-muted-foreground` - Text colors
- `border-border` - Borders and outlines
- `bg-success`, `bg-warning`, `bg-destructive`, `bg-info` - Status colors
- `ring` - Focus ring color

**All color tokens integrate with light/dark themes automatically.**

### Phase 02: Typography System

**Typography Tokens Used:**
- `text-xs` (12px) - Small badges, compact tabs
- `text-sm` (14px) - Default tabs, progress labels
- `text-base` (16px) - Large tabs
- `font-medium` - Tab labels, emphasis
- `font-semibold` - Badge text

**Typography scales ensure consistent text hierarchy.**

### Phase 03: Spacing & Layout System

**Spacing Tokens Used:**
- `p-0.5` to `p-1.5` - Tab list padding (4px scale)
- `px-2` to `px-4`, `py-1` to `py-2` - Tab trigger padding
- `mt-3` - Tab content margin
- `px-2.5 py-0.5` - Badge padding
- `h-1` to `h-4` - Progress heights

**All spacing follows 4px-based scale from Phase 03.**

### Phase 04: Form Components Integration

**Tabs work seamlessly with Form components:**
```tsx
<Tabs defaultValue="personal">
  <TabsList>
    <TabsTrigger value="personal">Personal Info</TabsTrigger>
    <TabsTrigger value="account">Account</TabsTrigger>
  </TabsList>

  <TabsContent value="personal">
    <FormField label="Name" required>
      <Input />
    </FormField>

    <FormField label="Email" required>
      <Input type="email" />
    </FormField>
  </TabsContent>

  <TabsContent value="account">
    <FormField label="Username" required>
      <Input />
    </FormField>
  </TabsContent>
</Tabs>
```

### Phase 05: Overlay Components Integration

**Progress bars in Dialogs:**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Uploading Files</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <Progress value={45} variant="info" />
      <p className="text-sm text-muted-foreground">
        Uploading 3 of 10 files...
      </p>
    </div>
  </DialogContent>
</Dialog>
```

**Badge in Select options:**
```tsx
<Select>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">
      <div className="flex items-center gap-2">
        <span>Active</span>
        <Badge variant="success">23</Badge>
      </div>
    </SelectItem>
    <SelectItem value="pending">
      <div className="flex items-center gap-2">
        <span>Pending</span>
        <Badge variant="warning">12</Badge>
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

### Future Phases

**Phase 07: Motion & Animation**
- Enhanced tab transitions with Framer Motion
- Progress bar animations (indeterminate, success bounce)
- Badge entrance/exit animations
- Separator fade-in effects

**Phase 08: Advanced Patterns**
- Animated tab content transitions
- Skeleton loaders with Progress
- Badge groups with overflow handling
- Dynamic separator rendering

---

## Variants Reference

### Tabs Variants

**TabsList Sizes:**
| Size | Height | Padding | Example |
|------|--------|---------|---------|
| `sm` | 32px (2rem) | 2px (0.125rem) | `<TabsList size="sm">` |
| `default` | 40px (2.5rem) | 4px (0.25rem) | `<TabsList>` (default) |
| `lg` | 48px (3rem) | 6px (0.375rem) | `<TabsList size="lg">` |

**TabsList Variants:**
| Variant | Appearance | Example |
|---------|------------|---------|
| `default` | Gray background | `<TabsList variant="default">` |
| `outline` | Border, transparent bg | `<TabsList variant="outline">` |
| `pills` | Transparent, spaced tabs | `<TabsList variant="pills">` |

**TabsTrigger Sizes:**
| Size | Padding | Font Size | Example |
|------|---------|-----------|---------|
| `sm` | 8px 4px | 12px | `<TabsTrigger size="sm">` |
| `default` | 12px 6px | 14px | `<TabsTrigger>` (default) |
| `lg` | 16px 8px | 16px | `<TabsTrigger size="lg">` |

### Progress Variants

**Progress Sizes:**
| Size | Height | Example |
|------|--------|---------|
| `sm` | 4px (0.25rem) | `<Progress size="sm">` |
| `default` | 8px (0.5rem) | `<Progress>` (default) |
| `lg` | 12px (0.75rem) | `<Progress size="lg">` |
| `xl` | 16px (1rem) | `<Progress size="xl">` |

**Progress Colors:**
| Variant | Color | Example |
|---------|-------|---------|
| `default` | Primary blue | `<Progress variant="default">` |
| `success` | Green | `<Progress variant="success">` |
| `warning` | Orange | `<Progress variant="warning">` |
| `destructive` | Red | `<Progress variant="destructive">` |
| `info` | Blue | `<Progress variant="info">` |

### Badge Variants

| Variant | Appearance | Example |
|---------|------------|---------|
| `default` | Primary solid | `<Badge variant="default">` |
| `secondary` | Gray solid | `<Badge variant="secondary">` |
| `destructive` | Red solid | `<Badge variant="destructive">` |
| `outline` | Border only | `<Badge variant="outline">` |
| `success` | Green subtle | `<Badge variant="success">` |
| `warning` | Orange subtle | `<Badge variant="warning">` |
| `info` | Blue subtle | `<Badge variant="info">` |
| `purple` | Purple subtle | `<Badge variant="purple">` |
| `muted` | Gray muted | `<Badge variant="muted">` |

### Separator Variants

| Orientation | Dimensions | Example |
|-------------|------------|---------|
| `horizontal` | 1px × full width | `<Separator>` (default) |
| `vertical` | full height × 1px | `<Separator orientation="vertical">` |

---

## Migration Guide

### Migrating to Tabs Component

**Before (Custom Implementation):**
```tsx
// Custom tab implementation with useState
const [activeTab, setActiveTab] = useState('general');

<div className="border-b">
  <button
    onClick={() => setActiveTab('general')}
    className={activeTab === 'general' ? 'border-b-2' : ''}
  >
    General
  </button>
  <button
    onClick={() => setActiveTab('security')}
    className={activeTab === 'security' ? 'border-b-2' : ''}
  >
    Security
  </button>
</div>

<div>
  {activeTab === 'general' && <div>General content</div>}
  {activeTab === 'security' && <div>Security content</div>}
</div>
```

**After (Tabs Component):**
```tsx
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
  </TabsList>

  <TabsContent value="general">
    General content
  </TabsContent>

  <TabsContent value="security">
    Security content
  </TabsContent>
</Tabs>
```

**Benefits:**
- Automatic accessibility (ARIA, keyboard navigation)
- Built-in animations and transitions
- Type-safe variants (size, variant)
- No manual state management needed
- Focus management handled automatically

### Migrating to Progress Component

**Before (Custom Implementation):**
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-blue-500 h-2 rounded-full"
    style={{ width: `${progress}%` }}
  />
</div>
```

**After (Progress Component):**
```tsx
<Progress value={progress} />
```

**With Variants:**
```tsx
// Success state
<Progress value={100} variant="success" />

// Warning state (approaching limit)
<Progress value={85} variant="warning" />

// Large size for prominence
<Progress value={progress} size="lg" variant="info" />

// Indeterminate loading
<Progress animated />
```

**Benefits:**
- Automatic ARIA attributes (valuenow, valuemin, valuemax)
- Smooth transitions (300ms ease-out)
- Type-safe size and color variants
- Consistent with design system
- Screen reader support

### When to Use Each Component

**Use Tabs when:**
- Organizing related content into switchable panels
- Creating settings pages with multiple sections
- Building documentation with different views
- Reducing screen clutter from multiple sections
- Need keyboard navigation and accessibility

**Use Progress when:**
- Showing file upload/download progress
- Indicating task completion percentage
- Providing visual feedback for long operations
- Displaying storage usage or limits
- Need determinate or indeterminate loading states

**Use Badge when:**
- Showing status indicators (pending, active, completed)
- Displaying notification counts
- Tagging content with categories
- Labeling items with metadata
- Highlighting special features (PRO, NEW, etc.)

**Use Separator when:**
- Dividing content sections vertically
- Creating visual hierarchy in layouts
- Separating menu items or options
- Dividing sidebar from main content
- Need subtle visual breaks between elements

---

## Best Practices

### Tabs

1. **Limit tab count** - 3-7 tabs ideal, use nested tabs or different patterns for more
2. **Short labels** - Keep tab labels concise (1-2 words)
3. **Meaningful order** - Most important/common tabs first
4. **Default tab** - Always set a sensible `defaultValue`
5. **Size consistency** - Match size to context (sm for dense, lg for prominent)
6. **Variant choice** - Use `pills` for modern look, `outline` for minimal, `default` for contained

### Progress

1. **Show percentage** - Always display numeric value alongside bar
2. **Descriptive text** - Explain what's progressing ("Uploading file...")
3. **Variant meaning** - Use semantic variants (success for complete, warning for limits)
4. **Size context** - Small for inline, large for hero sections
5. **Indeterminate sparingly** - Only use when duration truly unknown
6. **Smooth updates** - Update value frequently for smooth animation

### Badge

1. **Color meaning** - Use semantic colors (success/warning/destructive)
2. **Short text** - Keep badge text brief (1-3 words)
3. **Consistent variants** - Same color means same thing everywhere
4. **Not for actions** - Badges are informational, not interactive
5. **Combine with icons** - Icons enhance badge meaning
6. **Overflow handling** - Use "9+" for large counts

### Separator

1. **Spacing** - Add margin around separators (my-4, mx-4)
2. **Semantic sections** - Use with semantic HTML (section, article)
3. **Decorative by default** - Keep `decorative={true}` for visual dividers
4. **Vertical height** - Ensure parent has defined height for vertical separators
5. **Subtle appearance** - Separators should enhance, not dominate

---

## Summary

Phase 06 successfully modernized navigation and utility components:

**Modernized Components:**
- **Tabs** - 3 size variants, 3 style variants (default/outline/pills), full accessibility
- **Progress** - 4 size variants, 5 color variants, animated support

**Already Modern:**
- **Badge** - 9 variants, fully functional
- **Separator** - Simple, effective, no changes needed

**Key Achievements:**
- Type-safe variants using cva
- Full integration with Phase 01-03 tokens
- Comprehensive documentation (NAVIGATION.md)
- Zero breaking changes
- Enhanced accessibility
- Flexible composition patterns

**Next Phase:** Phase 07 - Motion & Animation System (Framer Motion, transition tokens, animation patterns)

---

*Documentation created: 2026-01-21*
*Total components: 4 (2 modernized, 2 already complete)*
*Integration: Phases 01-05 complete, ready for Phase 07+*
