# Overlay Components Documentation

## Overview

Overlay components provide UI elements that appear above the main content layer, creating modal experiences for dialogs, menus, selections, and contextual information. All overlay components in Auto-Claude are built on Radix UI primitives with consistent animations, accessibility features, and design token integration.

**Key Features:**
- **Accessibility-first**: ARIA attributes, keyboard navigation, focus management
- **Consistent animations**: 200ms transitions with fade, zoom, and slide effects
- **Type-safe variants**: Using `class-variance-authority` (cva) for flexible styling
- **Design system integration**: All colors, spacing, and typography use tokens
- **Zero breaking changes**: All existing usage remains fully compatible

**Components covered:**
- Dialog (modal dialogs with size variants)
- AlertDialog (confirmation dialogs with intent variants)
- Tooltip (contextual hints)
- DropdownMenu (action menus with submenus)
- Select (form selections with size variants)
- Popover (contextual overlays with width variants)

---

## Components

### Dialog

Modal dialogs for forms, confirmations, and multi-step flows.

**API:**

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
```

**DialogContent Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg' \| 'xl' \| 'full'` | `'default'` | Dialog width |
| `hideCloseButton` | `boolean` | `false` | Hide the X close button |

**Size Variants:**

| Variant | Max Width | Use Case |
|---------|-----------|----------|
| `sm` | `max-w-sm` (384px) | Quick confirmations, small forms |
| `default` | `max-w-lg` (512px) | Standard forms, settings |
| `lg` | `max-w-2xl` (672px) | Multi-field forms, content viewers |
| `xl` | `max-w-4xl` (896px) | Complex forms, data tables |
| `full` | `max-w-[95vw]` | Maximum width for detailed views |

**Example - Basic Dialog:**

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here. Click save when you're done.
      </DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Example - Large Dialog:**

```tsx
<DialogContent size="xl">
  <DialogHeader>
    <DialogTitle>Advanced Settings</DialogTitle>
    <DialogDescription>
      Configure advanced options for your project.
    </DialogDescription>
  </DialogHeader>
  {/* Complex form with multiple sections */}
</DialogContent>
```

**Example - Dialog without Close Button:**

```tsx
<DialogContent hideCloseButton>
  <DialogHeader>
    <DialogTitle>Required Information</DialogTitle>
  </DialogHeader>
  {/* Content that requires explicit action */}
  <DialogFooter>
    <Button>Continue</Button>
  </DialogFooter>
</DialogContent>
```

**Composition:**
- `DialogHeader`: Contains title and description with consistent spacing
- `DialogFooter`: Action buttons, right-aligned on desktop, stacked on mobile
- `DialogTitle`: Main heading with semantic markup
- `DialogDescription`: Supporting text with muted color

---

### AlertDialog

Specialized dialogs for important confirmations and alerts.

**API:**

```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
```

**AlertDialogContent Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `intent` | `'default' \| 'info' \| 'warning' \| 'destructive'` | `'default'` | Visual intent |

**Intent Variants:**

| Variant | Border Color | Title Color | Use Case |
|---------|--------------|-------------|----------|
| `default` | `border-border` | `text-foreground` | Neutral confirmations |
| `info` | `border-info` | `text-info` | Information, tips |
| `warning` | `border-warning` | `text-warning` | Caution, potential issues |
| `destructive` | `border-destructive` | `text-destructive` | Delete, irreversible actions |

**Example - Destructive Alert:**

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent intent="destructive">
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your
        account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete Account</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Example - Warning Alert:**

```tsx
<AlertDialogContent intent="warning">
  <AlertDialogHeader>
    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
    <AlertDialogDescription>
      You have unsaved changes. Are you sure you want to leave?
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Keep Editing</AlertDialogCancel>
    <AlertDialogAction>Discard Changes</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

**Context API:**
The `intent` prop automatically propagates from `AlertDialogContent` to `AlertDialogTitle` via React Context. You can override the title color by passing `intent` directly to `AlertDialogTitle` if needed.

**Dialog vs AlertDialog:**

| Feature | Dialog | AlertDialog |
|---------|--------|-------------|
| Purpose | General modals, forms | Important confirmations |
| Focus trap | Optional | Required (cannot dismiss via overlay) |
| Close button | Optional X button | No X button (must use actions) |
| Actions | Flexible | Structured (Cancel + Action) |
| Use when | Collecting input, showing content | Confirming destructive/important actions |

---

### Tooltip

Contextual hints that appear on hover or focus.

**API:**

```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
```

**Example:**

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>This is a helpful tooltip</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Example - Multiple Tooltips:**

```tsx
<TooltipProvider delayDuration={300}>
  <div className="flex gap-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Save className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Save (Ctrl+S)</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Undo className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
    </Tooltip>
  </div>
</TooltipProvider>
```

**TooltipProvider Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delayDuration` | `number` | `700` | Delay before showing (ms) |
| `skipDelayDuration` | `number` | `300` | Delay between tooltips (ms) |

**Best Practices:**
- Wrap your app/section with `TooltipProvider` once at the top level
- Use for icon-only buttons and abbreviated text
- Keep content concise (1-2 lines)
- Don't duplicate visible text
- Include keyboard shortcuts when relevant

---

### DropdownMenu

Action menus with support for submenus, checkboxes, and radio groups.

**API:**

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
```

**Example - Basic Menu:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>
      <User className="mr-2 h-4 w-4" />
      Profile
      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Settings className="mr-2 h-4 w-4" />
      Settings
      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Example - Checkbox Items:**

```tsx
<DropdownMenuContent>
  <DropdownMenuLabel>View Options</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuCheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
    Show Toolbar
  </DropdownMenuCheckboxItem>
  <DropdownMenuCheckboxItem checked={showSidebar} onCheckedChange={setShowSidebar}>
    Show Sidebar
  </DropdownMenuCheckboxItem>
</DropdownMenuContent>
```

**Example - Radio Group:**

```tsx
<DropdownMenuContent>
  <DropdownMenuLabel>Theme</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
</DropdownMenuContent>
```

**Example - Submenu:**

```tsx
<DropdownMenuContent>
  <DropdownMenuItem>New File</DropdownMenuItem>
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Plus className="mr-2 h-4 w-4" />
      More Options
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuItem>From Template</DropdownMenuItem>
      <DropdownMenuItem>From Clipboard</DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Close</DropdownMenuItem>
</DropdownMenuContent>
```

**Features:**
- **Keyboard shortcuts**: Display shortcuts with `DropdownMenuShortcut`
- **Nested menus**: Support unlimited nesting with `DropdownMenuSub`
- **Checkboxes**: Toggle multiple options with `DropdownMenuCheckboxItem`
- **Radio groups**: Single selection with `DropdownMenuRadioGroup`
- **Icons**: Add icons to items for visual hierarchy
- **Destructive actions**: Use `className="text-destructive"` for dangerous actions

---

### Select

Form selections with keyboard navigation and search.

**API:**

```tsx
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '@/components/ui/select';
```

**SelectTrigger Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Input size |

**Size Variants:**

| Variant | Height | Text Size | Padding | Use Case |
|---------|--------|-----------|---------|----------|
| `sm` | `h-8` (32px) | `text-xs` | `px-2` | Compact forms, tables |
| `default` | `h-10` (40px) | `text-sm` | `px-3` | Standard forms |
| `lg` | `h-12` (48px) | `text-base` | `px-4` | Prominent selections |

**Example - Basic Select:**

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
    <SelectItem value="orange">Orange</SelectItem>
  </SelectContent>
</Select>
```

**Example - Grouped Select:**

```tsx
<Select>
  <SelectTrigger size="lg">
    <SelectValue placeholder="Select a framework" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Frontend</SelectLabel>
      <SelectItem value="react">React</SelectItem>
      <SelectItem value="vue">Vue</SelectItem>
      <SelectItem value="svelte">Svelte</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Backend</SelectLabel>
      <SelectItem value="node">Node.js</SelectItem>
      <SelectItem value="python">Python</SelectItem>
      <SelectItem value="go">Go</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

**Example - Controlled Select:**

```tsx
const [value, setValue] = React.useState('');

<Select value={value} onValueChange={setValue}>
  <SelectTrigger size="sm">
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Features:**
- **Keyboard navigation**: Arrow keys, Home, End, Page Up/Down
- **Type to search**: Start typing to filter options
- **Scroll buttons**: Automatic scroll indicators for long lists
- **Grouping**: Organize options with labels and separators
- **Size alignment**: Matches Input component sizing from Phase 04

---

### Popover

Contextual overlays for additional content.

**API:**

```tsx
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
```

**PopoverContent Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `'sm' \| 'default' \| 'lg' \| 'auto'` | `'default'` | Popover width |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment relative to trigger |
| `sideOffset` | `number` | `4` | Distance from trigger (px) |

**Width Variants:**

| Variant | Width | Use Case |
|---------|-------|----------|
| `sm` | `w-56` (224px) | Quick actions, small forms |
| `default` | `w-72` (288px) | Standard content |
| `lg` | `w-96` (384px) | Rich content, longer text |
| `auto` | `w-auto` | Content-sized |

**Example - Basic Popover:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <h4 className="font-medium">About this feature</h4>
      <p className="text-sm text-muted-foreground">
        This feature allows you to customize your experience.
      </p>
    </div>
  </PopoverContent>
</Popover>
```

**Example - Date Picker Popover:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP') : 'Pick a date'}
    </Button>
  </PopoverTrigger>
  <PopoverContent width="auto" align="start">
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>
```

**Example - Filter Popover:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Filters
    </Button>
  </PopoverTrigger>
  <PopoverContent width="lg" align="end">
    <div className="space-y-4">
      <h4 className="font-medium">Filter Options</h4>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" className="w-full">Apply Filters</Button>
    </div>
  </PopoverContent>
</Popover>
```

**Positioning:**
- Use `align` to control horizontal alignment: `start`, `center`, `end`
- Use `side` to control vertical positioning: `top`, `bottom`, `left`, `right`
- Use `sideOffset` to adjust distance from trigger
- Popover automatically flips to stay in viewport

---

## Usage Patterns

### Modal Dialogs

**Form Dialogs:**

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Create Project</Button>
  </DialogTrigger>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogDescription>
        Fill in the details below to create a new project.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <FormField name="name" label="Project Name" />
        <FormField name="description" label="Description" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Create</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**Confirmation Dialogs:**

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent intent="destructive">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {itemCount} items?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete {itemCount} items. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Context Menus

**Right-click Actions:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <div onContextMenu={(e) => e.preventDefault()}>
      {/* Your content */}
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Cut</DropdownMenuItem>
    <DropdownMenuItem>Copy</DropdownMenuItem>
    <DropdownMenuItem>Paste</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Selection Dropdowns

**Filter Selects:**

```tsx
<div className="flex gap-2">
  <Select value={status} onValueChange={setStatus}>
    <SelectTrigger size="sm" className="w-[120px]">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="archived">Archived</SelectItem>
    </SelectContent>
  </Select>

  <Select value={priority} onValueChange={setPriority}>
    <SelectTrigger size="sm" className="w-[120px]">
      <SelectValue placeholder="Priority" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="high">High</SelectItem>
      <SelectItem value="medium">Medium</SelectItem>
      <SelectItem value="low">Low</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## Composition Patterns

### Dialog + FormField

Create forms in dialogs with proper validation:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <Stack spacing={4}>
        <FormField
          label="Full Name"
          hint="Your full name as it appears on your profile"
          error={errors.name}
        >
          <Input {...register('name')} />
        </FormField>

        <FormField
          label="Email"
          error={errors.email}
        >
          <Input type="email" {...register('email')} />
        </FormField>

        <FormField
          label="Bio"
          hint="Tell us about yourself"
        >
          <Textarea {...register('bio')} />
        </FormField>
      </Stack>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### DropdownMenu + Button

Action menus for tables and lists:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Actions</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDuplicate}>
      <Copy className="mr-2 h-4 w-4" />
      Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Popover + Calendar

Date pickers and date range selectors:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className={cn(!date && "text-muted-foreground")}>
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, "PPP") : "Pick a date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent width="auto" align="start">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      initialFocus
    />
  </PopoverContent>
</Popover>
```

### AlertDialog + Destructive Actions

Safe deletion flows:

```tsx
const [itemToDelete, setItemToDelete] = React.useState<Item | null>(null);

<AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
  <AlertDialogContent intent="destructive">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {itemToDelete?.name}?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "{itemToDelete?.name}" and all associated data.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDelete(itemToDelete)}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* In your list/table */}
<Button
  variant="ghost"
  size="icon"
  onClick={() => setItemToDelete(item)}
>
  <Trash className="h-4 w-4" />
</Button>
```

---

## Accessibility

### Keyboard Navigation

All overlay components support comprehensive keyboard navigation:

**Dialog / AlertDialog:**
- `Esc` - Close dialog
- `Tab` / `Shift+Tab` - Navigate between focusable elements
- Focus is trapped within dialog (cannot tab outside)
- Focus returns to trigger element when closed

**DropdownMenu:**
- `Space` / `Enter` - Open menu (when focused on trigger)
- `↓` / `↑` - Navigate menu items
- `←` / `→` - Open/close submenus
- `Esc` - Close menu
- `Tab` - Close menu and move focus
- Type character - Jump to item starting with that character

**Select:**
- `Space` / `Enter` - Open select
- `↓` / `↑` - Navigate options
- `Home` / `End` - Jump to first/last option
- `PageUp` / `PageDown` - Navigate by page
- `Esc` - Close select
- Type characters - Filter/jump to matching option

**Tooltip:**
- Automatically shows on focus (not just hover)
- `Esc` - Dismiss tooltip
- Screen reader accessible via `aria-describedby`

**Popover:**
- `Esc` - Close popover
- `Tab` - Navigate within popover content
- Focus management same as Dialog

### Focus Management

**Focus Trapping:**

Dialog and AlertDialog trap focus, preventing keyboard users from accessing content behind the overlay:

```tsx
// Focus is automatically trapped
<DialogContent>
  <input /> {/* User can tab here */}
  <button /> {/* And here */}
  {/* But cannot tab outside dialog */}
</DialogContent>
```

**Focus Return:**

When an overlay closes, focus automatically returns to the trigger element:

```tsx
<Button id="trigger">Open</Button> {/* Focus starts here */}
<Dialog>
  {/* ... */}
</Dialog>
{/* When dialog closes, focus returns to button */}
```

### ARIA Attributes

All components include proper ARIA attributes:

**Dialog:**
- `role="dialog"` - Identifies as dialog
- `aria-modal="true"` - Announces modal behavior
- `aria-labelledby` - Points to DialogTitle
- `aria-describedby` - Points to DialogDescription

**AlertDialog:**
- `role="alertdialog"` - Higher priority than dialog
- Requires user action before dismissing
- Announces important content to screen readers

**DropdownMenu:**
- `role="menu"` - Identifies as menu
- `aria-expanded` - Announces open/closed state
- `aria-haspopup` - Indicates submenu presence

**Select:**
- Fully accessible native-like select behavior
- Announces selected value changes
- Groups announced with labels

**Tooltip:**
- `role="tooltip"` - Identifies as tooltip
- Linked via `aria-describedby`
- Auto-announces on focus

### Screen Reader Announcements

**Live Regions:**

Use live regions for dynamic overlay changes:

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {isDialogOpen ? "Dialog opened" : "Dialog closed"}
</div>
```

**Hidden Content:**

Use `.sr-only` for screen reader-only text:

```tsx
<Button variant="ghost" size="icon">
  <Trash className="h-4 w-4" />
  <span className="sr-only">Delete item</span>
</Button>
```

---

## Animation

All overlay components use consistent animations for professional, cohesive UX.

### Animation Patterns

**Fade In/Out:**

Overlay backgrounds fade in/out:

```css
data-[state=open]:animate-in
data-[state=closed]:animate-out
data-[state=closed]:fade-out-0
data-[state=open]:fade-in-0
```

**Zoom In/Out:**

Dialog and AlertDialog content zooms:

```css
data-[state=closed]:zoom-out-95
data-[state=open]:zoom-in-95
```

**Slide:**

Popovers and Selects slide from the direction they appear:

```css
data-[side=bottom]:slide-in-from-top-2
data-[side=top]:slide-in-from-bottom-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
```

### Duration

All animations use **200ms** duration for consistency:

```css
duration-200
```

This creates a fast, responsive feel while still being smooth and noticeable.

### Customizing Animations

To customize animations, override the data attributes:

```tsx
<DialogContent
  className={cn(
    // Remove default animations
    "[&>*]:duration-0",
    // Add custom animations
    "data-[state=open]:animate-custom-entrance"
  )}
>
  {/* ... */}
</DialogContent>
```

---

## Integration

### Phase 01: Design Tokens Foundation

Overlay components use color and shadow tokens:

**Colors:**
- Background: `bg-card`, `bg-popover`
- Borders: `border-border`, `border-info`, `border-warning`, `border-destructive`
- Text: `text-foreground`, `text-muted-foreground`
- Overlays: `bg-black/80` with `backdrop-blur-sm`

**Shadows:**
- Dialog/AlertDialog: `shadow-xl`
- Popover/Select: `shadow-md`
- Consistent depth hierarchy

### Phase 02: Typography System

Overlay components use typography tokens:

**Dialog/AlertDialog:**
- Title: `text-lg font-semibold` (18px, 600 weight)
- Description: `text-sm text-muted-foreground` (14px)

**DropdownMenu:**
- Items: `text-sm` (14px)
- Labels: `text-sm font-semibold`

**Select:**
- Trigger: `text-sm` / `text-xs` / `text-base` based on size
- Items: `text-sm`

### Phase 03: Spacing & Layout System

Overlay components use spacing tokens:

**Header/Footer Spacing:**
- DialogHeader: `space-y-2` (8px)
- DialogFooter: `mt-6` (24px)
- AlertDialogHeader: `space-y-2` (8px)
- AlertDialogFooter: `mt-6` (24px)

**Internal Padding:**
- Dialog/AlertDialog: `p-6` (24px)
- Popover: `p-4` (16px)

**Item Spacing:**
- DropdownMenu items: `py-2` (8px vertical)
- Select items: `py-2` (8px vertical)

### Phase 04: Form Components

Overlay components integrate with form components:

**Select Size Alignment:**

Select sizes match Input sizes for visual consistency:

| Size | Height | Use Together |
|------|--------|--------------|
| `sm` | `h-8` | Compact forms |
| `default` | `h-10` | Standard forms |
| `lg` | `h-12` | Prominent forms |

**Dialog + FormField:**

```tsx
<Dialog>
  <DialogContent>
    <form>
      <Stack spacing={4}>
        <FormField label="Name" error={errors.name}>
          <Input {...register('name')} />
        </FormField>

        <FormField label="Category">
          <Select onValueChange={(value) => setValue('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </Stack>

      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Migration Guide

### Migrating to Modern Overlays

**From Custom Modals to Dialog:**

Before:
```tsx
{isOpen && (
  <div className="fixed inset-0 bg-black/50">
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
      <h2>Title</h2>
      <p>Content</p>
      <button onClick={() => setIsOpen(false)}>Close</button>
    </div>
  </div>
)}
```

After:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <p>Content</p>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Benefits:**
- Automatic focus management
- Keyboard navigation (Esc to close)
- Accessibility (ARIA attributes)
- Consistent animations
- Responsive (mobile-friendly)

### When to Use Each Component

**Dialog vs AlertDialog:**

Use **Dialog** when:
- Collecting user input (forms)
- Showing content (previews, details)
- User can dismiss by clicking overlay
- Non-critical actions

Use **AlertDialog** when:
- Confirming destructive actions
- Important warnings
- User must make explicit choice
- Cannot dismiss by clicking overlay

**Select vs DropdownMenu:**

Use **Select** when:
- Form input (single selection)
- Options are data values
- Need grouped options
- Native select behavior expected

Use **DropdownMenu** when:
- Actions/commands (not data selection)
- Need submenus
- Need checkboxes/radio groups
- Need keyboard shortcuts

**Popover vs Tooltip:**

Use **Popover** when:
- Showing rich content (forms, lists)
- User needs to interact with content
- More than 1-2 lines of text
- Clickable trigger

Use **Tooltip** when:
- Brief contextual hints (1-2 lines)
- Non-interactive content
- Icon buttons need labels
- Hover/focus trigger

### Best Practices

**DO:**
- Use semantic intents (destructive for delete actions)
- Provide clear titles and descriptions
- Include keyboard shortcuts in menus
- Use size variants consistently with Input
- Trap focus in dialogs
- Return focus to trigger on close

**DON'T:**
- Nest dialogs (use stepper patterns instead)
- Put forms in tooltips (use Popover)
- Make tooltips interactive (use Popover)
- Override accessibility attributes
- Remove keyboard navigation
- Use AlertDialog for non-critical actions

### Standardization Benefits

**Consistency:**
- All overlays use same animations (200ms)
- Same color tokens across components
- Same spacing patterns
- Same accessibility features

**Maintainability:**
- Change once, applies everywhere
- Design token updates cascade
- Radix UI handles complex logic
- Less custom code to maintain

**Developer Experience:**
- Type-safe variants with cva
- IntelliSense support
- Composable patterns
- Self-documenting APIs

**User Experience:**
- Familiar patterns (modal, menu, select)
- Consistent behavior
- Accessible by default
- Smooth animations

---

*Documentation generated for Phase 05: Core UI Components - Overlays*
*Last updated: 2026-01-21*
