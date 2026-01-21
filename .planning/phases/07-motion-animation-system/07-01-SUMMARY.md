---
phase: 07-motion-animation-system
plan: 01
subsystem: ui
tags: [motion, framer-motion, animations, css, tailwind, design-tokens]

# Dependency graph
requires:
  - phase: 01-design-tokens-foundation
    provides: CSS variables in @theme block, token-based design system
  - phase: 02-typography-system
    provides: Typography components with cva variants
  - phase: 05-core-ui-components-overlays
    provides: Dialog and Tabs components to enhance

provides:
  - Animation duration tokens (5 tokens: instant → slower)
  - Animation easing tokens (5 tokens: linear, in, out, in-out, bounce)
  - Animation shorthand variables (7+ pre-configured animations)
  - Optional Motion variants for Dialog (useMotion prop)
  - Optional Motion variants for Tabs (animatedIndicator prop)
  - Comprehensive animation system documentation

affects: [08-dark-mode-system, future-component-development, ui-consistency]

# Tech tracking
tech-stack:
  added: [motion@12.23.26 (already installed, now used)]
  patterns:
    - "Hybrid animation system (CSS-first, Motion opt-in)"
    - "Animation tokens in @theme block for consistency"
    - "Optional Motion props (useMotion, animatedIndicator) for backward compatibility"
    - "GPU-accelerated animations (transform, opacity)"

key-files:
  created:
    - .planning/phases/07-motion-animation-system/ANIMATIONS.md
  modified:
    - apps/frontend/src/renderer/styles/globals.css
    - apps/frontend/src/renderer/components/ui/dialog.tsx
    - apps/frontend/src/renderer/components/ui/tabs.tsx

key-decisions:
  - "CSS-first approach: 90% of animations use CSS, Motion only when needed"
  - "Backward compatibility: All existing CSS animations preserved, Motion is opt-in"
  - "Token-based durations/easings: Centralized in @theme for consistency"
  - "Optional props pattern: useMotion and animatedIndicator default to false"

patterns-established:
  - "Animation tokens pattern: --duration-*, --ease-*, --animate-* variables"
  - "Optional Motion integration: Props to enable Motion without breaking existing code"
  - "Comprehensive documentation: Full examples, decision guides, performance tips"

# Metrics
duration: 5 min
completed: 2026-01-21
---

# Phase 07 Plan 01: Motion & Animation System Summary

**Hybrid animation system with CSS-first approach and optional Motion variants, formalized animation tokens, and comprehensive documentation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-21T10:44:01Z
- **Completed:** 2026-01-21T10:48:46Z
- **Tasks:** 3
- **Files modified:** 3 (1 created)

## Accomplishments

- Created animation token system with 5 durations, 5 easings, and 7+ shorthand variables in @theme block
- Added optional Motion variants to Dialog (useMotion prop) and Tabs (animatedIndicator prop)
- Comprehensive ANIMATIONS.md documentation (~830 lines) with examples, performance tips, and decision guides
- Zero breaking changes - all existing CSS animations work as-is, Motion is opt-in
- Documented all 10+ existing @keyframes (accordion, fade-in, slide-up, scale-in, pulse, indeterminate, progress animations, task animations, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Animation Tokens** - `77306a41` (feat)
2. **Task 2: Add Motion Variants to Dialog and Tabs** - `32cd4371` (feat)
3. **Task 3: Document Animation System** - `071336a6` (docs)

**Plan metadata:** (will be committed with STATE.md update)

## Files Created/Modified

**Created:**
- `.planning/phases/07-motion-animation-system/ANIMATIONS.md` - Comprehensive animation system documentation (830+ lines)

**Modified:**
- `apps/frontend/src/renderer/styles/globals.css` - Added animation duration, easing, and shorthand tokens to @theme
- `apps/frontend/src/renderer/components/ui/dialog.tsx` - Added optional useMotion prop with Motion variants
- `apps/frontend/src/renderer/components/ui/tabs.tsx` - Added optional animatedIndicator prop with Motion underline

## Decisions Made

1. **CSS-First Philosophy**: Prioritize CSS animations for 90% of use cases (smaller bundle, better performance, simpler code). Motion is opt-in for complex scenarios (gestures, layout animations, sequences).

2. **Backward Compatibility**: All existing CSS animations preserved. Motion is completely optional via props (useMotion, animatedIndicator) that default to false.

3. **Token-Based System**: Centralized animation durations and easings in @theme block for consistency across the entire application. Follows same pattern as color/spacing tokens from Phase 01.

4. **Optional Props Pattern**: Added useMotion and animatedIndicator props that default to false, ensuring existing components continue using CSS animations unless explicitly opted into Motion.

5. **Documentation-First**: Created comprehensive ANIMATIONS.md before promoting Motion usage, ensuring developers have clear guidance on when to use CSS vs Motion.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 08 (Dark Mode System):**
- Animation tokens available for smooth dark mode transitions (background-color, color, border-color)
- Motion installed and integrated for potential theme switching animations
- Documentation provides patterns for color transitions using animation tokens

**Integration points for Phase 08:**
```css
:root {
  transition:
    background-color var(--duration-normal) var(--ease-out),
    color var(--duration-normal) var(--ease-out);
}
```

**No blockers or concerns.**

---
*Phase: 07-motion-animation-system*
*Completed: 2026-01-21*
