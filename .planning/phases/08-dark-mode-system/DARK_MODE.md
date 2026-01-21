# Dark Mode System Documentation

**System:** Complete dark mode implementation with smooth transitions
**Created:** 2026-01-21
**Status:** Production-ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Theme Toggle](#theme-toggle)
4. [Color Themes](#color-themes)
5. [Smooth Transitions](#smooth-transitions)
6. [Token Reference](#token-reference)
7. [Component Development](#component-development)
8. [Integration](#integration)
9. [Testing](#testing)
10. [Migration Guide](#migration-guide)

---

## Overview

Auto-Claude's dark mode system is a complete, production-ready implementation featuring:

- **Token-based architecture** - CSS variables that override automatically in dark mode
- **3 appearance modes** - Light, Dark, and System (follows OS preference)
- **7 color themes** - Multiple color palettes that work in both light and dark modes
- **Smooth transitions** - 200ms color transitions when switching themes
- **System integration** - Respects `prefers-color-scheme` and `prefers-reduced-motion`
- **Persistent state** - Theme preference saved via Zustand store
- **Immediate preview** - Live theme switching without page reload

The system is designed to be maintainable, performant, and accessible.

---

## Architecture

### Token-Based System

Dark mode is implemented using CSS custom properties (variables) that automatically override when the `.dark` class is applied to `<html>`:

```css
/* Light mode (default) */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 228 100% 50%;
  /* ...40+ more tokens */
}

/* Dark mode (.dark class on <html>) */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 240 4.8% 95.9%;
  --primary: 228 100% 50%;
  /* ...40+ overridden tokens */
}
```

All tokens use **HSL color format** (Hue, Saturation, Lightness) for maximum flexibility:

```css
/* Using tokens in components */
background-color: hsl(var(--background));
color: hsl(var(--foreground));
border-color: hsl(var(--border));

/* With opacity via Tailwind */
<div className="bg-primary/20" /> {/* 20% opacity */}
```

### Class-Based Switching

The dark mode class (`.dark`) is applied/removed from `<html>` via JavaScript in `App.tsx`:

```typescript
// App.tsx - Theme application
useEffect(() => {
  const root = document.documentElement;

  const applyTheme = () => {
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  applyTheme();

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (settings.theme === 'system') {
      applyTheme();
    }
  };
  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}, [settings.theme]);
```

### State Management

Theme preference is persisted using **Zustand** store:

```typescript
// apps/frontend/src/renderer/stores/settings-store.ts
interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  colorTheme: ColorTheme;
  // ...other settings
}

// Persisted to localStorage automatically
```

---

## Theme Toggle

### UI Component

The theme selector is located in Settings and provides a 3-option toggle:

**Component:** `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`

```typescript
// Mode options
const modes = ['system', 'light', 'dark'] as const;

// Mode change handler
const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
  // Update local draft state
  onSettingsChange({ ...settings, theme: mode });

  // Apply immediately to store for live preview
  updateStoreSettings({ theme: mode });
};
```

### User Experience

- **System Mode** - Follows OS dark mode preference (`prefers-color-scheme`)
- **Light Mode** - Forces light theme regardless of OS setting
- **Dark Mode** - Forces dark theme regardless of OS setting

Changes apply **immediately** (no save button required) for instant preview.

### Icons

- 🌞 **Sun** - Light mode
- 🌙 **Moon** - Dark mode
- 🖥️ **Monitor** - System preference

---

## Color Themes

### Available Themes

Auto-Claude supports **7 color themes** that work in both light and dark modes:

| Theme ID | Name | Description | Light BG | Dark BG | Accent |
|----------|------|-------------|----------|---------|--------|
| `default` | Default | Oscura-inspired with pale yellow accent | `#F2F2ED` | `#0B0B0F` | `#E6E7A3` |
| `dusk` | Dusk | Warmer variant with lighter dark mode | `#F5F5F0` | `#131419` | `#E6E7A3` |
| `lime` | Lime | Fresh, energetic lime with purple | `#E8F5A3` | `#0F0F1A` | `#7C3AED` |
| `ocean` | Ocean | Calm, professional blue tones | `#E0F2FE` | `#082F49` | `#0284C7` |
| `retro` | Retro | Warm, nostalgic amber vibes | `#FEF3C7` | `#1C1917` | `#D97706` |
| `neo` | Neo | Modern cyberpunk pink/magenta | `#FDF4FF` | `#0F0720` | `#D946EF` |
| `forest` | Forest | Natural, earthy green tones | `#DCFCE7` | `#052E16` | `#16A34A` |

**Location:** `apps/frontend/src/shared/constants/themes.ts`

### How Color Themes Work

Color themes are applied via the `data-theme` attribute on `<html>`:

```typescript
// App.tsx - Color theme application
if (colorTheme === 'default') {
  root.removeAttribute('data-theme');
} else {
  root.setAttribute('data-theme', colorTheme);
}
```

CSS overrides are defined for each theme in `globals.css`:

```css
/* Example: Ocean theme */
[data-theme="ocean"] {
  --primary: 221 83% 53%;
  --accent: 199 89% 48%;
  /* ...theme-specific overrides */
}

/* Ocean dark mode variant */
.dark[data-theme="ocean"] {
  --background: 192 91% 15%;
  --primary: 199 89% 48%;
  /* ...dark mode overrides for ocean theme */
}
```

### Customizing Themes

To add a new theme:

1. **Add to constants:**
   ```typescript
   // apps/frontend/src/shared/constants/themes.ts
   export const COLOR_THEMES: ColorThemeDefinition[] = [
     // ...existing themes
     {
       id: 'sunset',
       name: 'Sunset',
       description: 'Warm orange and purple gradient',
       previewColors: {
         bg: '#FFF4E6',
         accent: '#F97316',
         darkBg: '#1A0B0F',
         darkAccent: '#FB923C'
       }
     }
   ];
   ```

2. **Define CSS overrides:**
   ```css
   /* globals.css */
   [data-theme="sunset"] {
     --primary: 24 95% 53%;
     --accent: 24 95% 70%;
     /* ...more overrides */
   }

   .dark[data-theme="sunset"] {
     --primary: 24 95% 60%;
     --background: 18 50% 10%;
     /* ...dark mode overrides */
   }
   ```

---

## Smooth Transitions

### Implementation

Smooth theme transitions (200ms) are implemented using animation tokens from Phase 7:

```css
/* Global theme transitions for smooth dark mode switching */
* {
  border-color: var(--border);
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: var(--ease-out);
  transition-duration: var(--duration-normal);
}

/* Disable transitions for elements with explicit animations */
*:where([class*="animate-"]),
*:where([class*="transition-transform"]),
*:where([class*="transition-opacity"]),
*:where([class*="transition-all"]) {
  transition-property: revert;
}
```

**Location:** `apps/frontend/src/renderer/styles/globals.css` (lines 301-315)

### Animation Tokens Used

- `--duration-normal` - 200ms (optimal for perceived smoothness)
- `--ease-out` - `cubic-bezier(0, 0, 0.2, 1)` (natural deceleration)

### Performance Considerations

**GPU-Friendly Properties:**
Only color-based properties are animated (not layout):
- `background-color`
- `border-color`
- `color`
- `fill` (SVG)
- `stroke` (SVG)

**Exclusions:**
Elements with explicit animations (like hover states, loading spinners) preserve their own transitions to avoid conflicts.

### Accessibility

Respects user's motion preferences:

```css
/* Reduced motion support */
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

**Location:** `apps/frontend/src/renderer/styles/globals.css` (lines 614-623)

---

## Token Reference

### Complete Dark Mode Token List

All 40+ color tokens with light vs dark values:

#### Layout Base

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--background` | `0 0% 100%` | `240 10% 3.9%` | Main background |
| `--foreground` | `240 10% 3.9%` | `240 4.8% 95.9%` | Main text color |

#### Cards & Surfaces

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--card` | `0 0% 100%` | `240 10% 3.9%` | Card backgrounds |
| `--card-foreground` | `240 10% 3.9%` | `0 0% 98%` | Card text |
| `--popover` | `0 0% 100%` | `0 0% 9%` | Popover backgrounds |
| `--popover-foreground` | `240 10% 3.9%` | `0 0% 98%` | Popover text |

#### Primary Brand

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--primary` | `228 100% 50%` | `228 100% 50%` | Primary buttons, links |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Text on primary |

#### Secondary

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--secondary` | `240 4.8% 95.9%` | `240 3.7% 15.9%` | Secondary buttons |
| `--secondary-foreground` | `240 5.9% 10%` | `0 0% 98%` | Text on secondary |

#### Muted (Disabled/Placeholder)

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--muted` | `240 4.8% 95.9%` | `240 5.9% 10%` | Disabled backgrounds |
| `--muted-foreground` | `240 3.8% 46.1%` | `240 4.4% 58%` | Placeholder text |

#### Accent (Hover States)

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--accent` | `240 4.8% 95.9%` | `240 5.9% 10%` | Hover backgrounds |
| `--accent-foreground` | `240 5.9% 10%` | `0 0% 98%` | Text on hover |

#### Destructive/Error

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Error states |
| `--destructive-foreground` | `0 0% 98%` | `0 0% 98%` | Text on errors |

#### Borders & Inputs

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--border` | `240 5.9% 90%` | `240 3.7% 15.9%` | Border colors |
| `--input` | `240 5.9% 90%` | `240 3.7% 15.9%` | Input borders |
| `--input-background` | `240 4.8% 95.9%` | `60 2% 18%` | Input backgrounds |
| `--ring` | `228 100% 50%` | `228 100% 50%` | Focus rings |

#### Sidebar

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--sidebar` | `0 0% 100%` | `240 10% 3.9%` | Sidebar background |
| `--sidebar-foreground` | `240 10% 3.9%` | `240 4.8% 95.9%` | Sidebar text |

#### Semantic Colors

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--success` | `142 76% 36%` | `142 71% 45%` | Success states |
| `--success-foreground` | `0 0% 100%` | `0 0% 98%` | Text on success |
| `--warning` | `48 96% 53%` | `48 96% 53%` | Warning states |
| `--warning-foreground` | `240 10% 3.9%` | `240 10% 3.9%` | Text on warning |
| `--info` | `221 83% 53%` | `221 83% 53%` | Info states |
| `--info-foreground` | `0 0% 100%` | `0 0% 98%` | Text on info |

#### Shadows

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | `0 1px 2px 0 rgba(0,0,0,0.6)` | Small shadows |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.07)` | `0 4px 6px -1px rgba(0,0,0,0.7)` | Medium shadows |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.08)` | `0 10px 15px -3px rgba(0,0,0,0.8)` | Large shadows |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.08)` | `0 20px 25px -5px rgba(0,0,0,0.9)` | Extra large |
| `--shadow-focus` | `0 0 0 3px rgba(59,130,246,0.2)` | `0 0 0 2px rgba(59,130,246,0.3)` | Focus shadows |

### Using Tokens

**CSS:**
```css
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

**Tailwind:**
```tsx
<div className="bg-background text-foreground border border-border">
  Content
</div>
```

**With Opacity:**
```tsx
<div className="bg-primary/20 text-primary">
  20% opacity primary background
</div>
```

---

## Component Development

### Best Practices

1. **Always use tokens, never hardcoded colors:**

   ```tsx
   // ❌ BAD - Hardcoded colors break in dark mode
   <div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
     Content
   </div>

   // ✅ GOOD - Uses tokens
   <div className="bg-background text-foreground">
     Content
   </div>
   ```

2. **Test in both light and dark modes:**

   ```tsx
   // Switch theme in Settings → Appearance
   // Verify component looks good in:
   // - Light mode
   // - Dark mode
   // - All 7 color themes
   ```

3. **Use semantic color tokens:**

   ```tsx
   // ❌ BAD - Using visual tokens semantically
   <Button className="bg-green-500">Success</Button>

   // ✅ GOOD - Using semantic tokens
   <Button className="bg-success text-success-foreground">
     Success
   </Button>
   ```

4. **Respect contrast ratios:**

   ```tsx
   // Ensure text has sufficient contrast in both modes
   // Foreground tokens are pre-tuned for accessibility:
   <div className="bg-card text-card-foreground">
     {/* Text will be readable in both themes */}
   </div>
   ```

5. **Use HSL with opacity for overlays:**

   ```tsx
   // Tailwind opacity utilities work with HSL
   <div className="bg-background/80 backdrop-blur-sm">
     Semi-transparent overlay
   </div>
   ```

### Common Patterns

**Card Component:**
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg shadow-md">
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card description</p>
</div>
```

**Button States:**
```tsx
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  focus-visible:ring-2 focus-visible:ring-ring
  disabled:bg-muted disabled:text-muted-foreground
">
  Click me
</button>
```

**Input Fields:**
```tsx
<input className="
  bg-input-background text-foreground
  border border-input
  focus:ring-2 focus:ring-ring
  placeholder:text-muted-foreground
" />
```

**Success/Warning/Error States:**
```tsx
// Success
<div className="bg-success/10 text-success border border-success/30">
  Success message
</div>

// Warning
<div className="bg-warning/10 text-warning-foreground border border-warning/30">
  Warning message
</div>

// Error
<div className="bg-destructive/10 text-destructive border border-destructive/30">
  Error message
</div>
```

### Avoiding Common Pitfalls

**Pitfall #1: Hardcoded opacity with HSL**
```tsx
// ❌ BAD - Manual opacity loses token flexibility
background-color: hsla(var(--primary), 0.2);

// ✅ GOOD - Use Tailwind opacity utilities
className="bg-primary/20"
```

**Pitfall #2: Using wrong foreground token**
```tsx
// ❌ BAD - Text not readable on primary background
<div className="bg-primary text-foreground">Text</div>

// ✅ GOOD - Correct foreground token
<div className="bg-primary text-primary-foreground">Text</div>
```

**Pitfall #3: Assuming light mode colors**
```tsx
// ❌ BAD - Assumes light background
<div className="text-gray-900">Dark text</div>

// ✅ GOOD - Uses adaptive token
<div className="text-foreground">Adaptive text</div>
```

---

## Integration

### Phase 01: Design Tokens Foundation

Dark mode builds on the HSL color token foundation from Phase 01:

- **HSL format** enables opacity modifiers (`bg-primary/20`)
- **CSS variables** allow runtime theme switching
- **@theme block** integrates with Tailwind v4

**Reference:** `.planning/phases/01-design-tokens-foundation/TOKENS.md`

### Phase 07: Motion & Animation System

Smooth theme transitions use animation tokens from Phase 07:

```css
/* Animation tokens (Phase 07) */
--duration-normal: 200ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Used in dark mode transitions (Phase 08) */
transition-duration: var(--duration-normal);
transition-timing-function: var(--ease-out);
```

**Reference:** `.planning/phases/07-motion-animation-system/ANIMATIONS.md`

### Settings UI

Theme controls are integrated into Settings dialog:

**Components:**
- `ThemeSelector.tsx` - Theme picker UI with live preview
- `ThemeSettings.tsx` - Wrapper for settings section
- `AppSettings.tsx` - Main settings dialog

**Store:**
- `settings-store.ts` - Zustand store with localStorage persistence

**Location:** `apps/frontend/src/renderer/components/settings/`

---

## Testing

### Manual Testing Checklist

**Basic Theme Switching:**
- [ ] Open Settings → Appearance
- [ ] Switch to Light mode - verify all UI elements visible
- [ ] Switch to Dark mode - verify all UI elements visible
- [ ] Switch to System mode - verify follows OS preference
- [ ] Change OS dark mode while in System - verify auto-updates

**Color Themes:**
- [ ] Test all 7 color themes in Light mode
- [ ] Test all 7 color themes in Dark mode
- [ ] Verify theme preview swatches match actual colors

**Smooth Transitions:**
- [ ] Toggle Light/Dark - verify 200ms smooth transition
- [ ] No jarring color jumps or flashes
- [ ] All elements transition simultaneously

**Persistence:**
- [ ] Set theme to Dark, reload app - verify persists
- [ ] Set color theme to Ocean, reload app - verify persists
- [ ] Change theme, close app, reopen - verify persists

**Component Compatibility:**
- [ ] Open all major screens (Tasks, Roadmap, Settings, etc.)
- [ ] Verify all components readable in both modes
- [ ] Check borders, shadows, focus states visible
- [ ] Verify hover states distinguishable

**Accessibility:**
- [ ] Enable prefers-reduced-motion in OS settings
- [ ] Verify theme transitions instant (no animation)
- [ ] Check contrast ratios meet WCAG AA (4.5:1 for text)

### System Preference Testing

**macOS:**
```bash
# Enable dark mode
defaults write -g AppleInterfaceStyle Dark

# Disable dark mode
defaults delete -g AppleInterfaceStyle
```

**Windows:**
Settings → Personalization → Colors → Choose your color → Dark

**Linux (GNOME):**
```bash
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
gsettings set org.gnome.desktop.interface color-scheme 'prefer-light'
```

### Reduced Motion Testing

**macOS:**
System Preferences → Accessibility → Display → Reduce motion

**Windows:**
Settings → Ease of Access → Display → Show animations

**Linux (GNOME):**
```bash
gsettings set org.gnome.desktop.interface enable-animations false
```

### Color Contrast Verification

Use browser DevTools or online tools to verify contrast ratios:

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools → Accessibility panel
- Firefox DevTools → Accessibility panel

**WCAG Requirements:**
- Normal text (16px+): 4.5:1 minimum
- Large text (18px+ or 14px bold): 3:1 minimum
- UI components: 3:1 minimum

---

## Migration Guide

### Migrating Existing Components

**Step 1: Identify hardcoded colors**
```tsx
// Before migration
<div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
  Content
</div>
```

**Step 2: Replace with tokens**
```tsx
// After migration
<div className="bg-background text-foreground">
  Content
</div>
```

**Step 3: Test in both modes**
- Switch to Dark mode in Settings
- Verify component looks correct
- Check text contrast, borders, shadows

### Common Color Mappings

| Hardcoded Color | Light Token | Dark Token |
|-----------------|-------------|------------|
| `#ffffff` (white bg) | `bg-background` | (auto) |
| `#000000` (black text) | `text-foreground` | (auto) |
| `#f3f4f6` (gray bg) | `bg-muted` | (auto) |
| `#6b7280` (gray text) | `text-muted-foreground` | (auto) |
| `#3b82f6` (blue accent) | `bg-primary` | (auto) |
| `#10b981` (green) | `bg-success` | (auto) |
| `#f59e0b` (amber) | `bg-warning` | (auto) |
| `#ef4444` (red) | `bg-destructive` | (auto) |

### Opacity Conversion

```tsx
// Before: Manual RGBA
backgroundColor: 'rgba(59, 130, 246, 0.2)'

// After: Tailwind opacity utility
className="bg-primary/20"
```

### Shadow Conversion

```tsx
// Before: Hardcoded shadow
boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'

// After: Token-based shadow
className="shadow-md"
// Or CSS: box-shadow: var(--shadow-md);
```

### Border Conversion

```tsx
// Before: Hardcoded border
border: '1px solid #e5e7eb'

// After: Token-based border
className="border border-border"
```

---

## Summary

Auto-Claude's dark mode system provides:

✅ **Complete implementation** - All 40+ tokens defined for light and dark
✅ **Smooth transitions** - 200ms color transitions using animation tokens
✅ **System integration** - Respects OS preferences and reduced motion
✅ **7 color themes** - Multiple palettes for personalization
✅ **Persistent state** - Theme preference saved automatically
✅ **Production-ready** - Used across 80+ components

**Key Files:**
- `apps/frontend/src/renderer/styles/globals.css` - Token definitions & transitions
- `apps/frontend/src/renderer/App.tsx` - Theme application logic
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx` - Theme UI
- `apps/frontend/src/shared/constants/themes.ts` - Color theme definitions

**Next Steps:**
- Phase 09: Component Migration Wave 1 (apply tokens to 40+ existing components)
- Phase 10: Component Migration Wave 2 & final documentation

---

*Documentation created: 2026-01-21*
*Dark mode system: Production-ready*
