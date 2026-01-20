# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- Backend: `snake_case.py` (e.g., `project_analyzer.py`, `linear_updater.py`, `app_logger.py`)
- Frontend Components: `PascalCase.tsx` (e.g., `TaskCard.tsx`, `ProjectTabBar.tsx`, `AddFeatureDialog.tsx`)
- Frontend Services/Utilities: `kebab-case.ts` (e.g., `app-logger.ts`, `api-validation-service.ts`, `claude-cli-utils.ts`)
- Frontend Stores: `kebab-case-store.ts` (e.g., `task-store.ts`, `project-store.ts`, `terminal-store.ts`)
- Test files: `*.test.ts` or `*.test.tsx` (co-located with source) or `test_*.py` (backend)

**Functions:**
- Python: `snake_case()` (e.g., `get_or_create_profile()`, `validate_bash_command()`, `extract_commands()`)
- TypeScript: `camelCase()` for regular functions (e.g., `createTestTask()`, `formatRelativeTime()`)
- React Components: `PascalCase()` (e.g., `TaskCard()`, `ProjectTabBar()`)
- React Hooks: `camelCase()` with `use` prefix (e.g., `useTaskStore()`, `useGlobalTerminalListeners()`)

**Variables:**
- camelCase for all variables (both Python and TypeScript)
- Constants: `UPPER_SNAKE_CASE` (Python) or camelCase when exported (TypeScript)
  - Examples: `STUCK_CHECK_SKIP_PHASES`, `TASK_STATUS_LABELS`

**Types:**
- Interfaces: `PascalCase` with `Props` suffix for component props
  - Examples: `TaskCardProps`, `TaskStatus`
- Enums: `PascalCase`
- Python: Type hints use built-in types or Pydantic models

## Code Style

**Formatting:**

Backend (Python):
- Tool: ruff-format (v0.14.10)
- Indentation: 4 spaces
- Quotes: Single quotes preferred
- Line length: ~100 characters (not strictly enforced)
- PEP 8 compliant

Frontend (TypeScript):
- Tool: Biome (v2.3.11) for linting (formatting disabled)
- Indentation: 2 spaces
- Quotes: Mix of single and double (normalized by Biome)
- Semicolons: Required
- Line length: Keep under 100 characters when practical

**Linting:**

Backend:
- Tool: ruff (v0.14.10) with auto-fix
- Config: `.pre-commit-config.yaml`
- Rules: PEP 8 + type hints required
- Run: `ruff check apps/backend/`

Frontend:
- Tool: Biome (v2.3.11)
- Config: `apps/frontend/biome.jsonc`
- Rules: Recommended with selective overrides:
  - `noSecrets` disabled (false positives)
  - `noDangerouslySetInnerHtml` set to warn (legitimate markdown rendering)
  - `noConsole` disabled (debugging needs)
  - `useNamingConvention` disabled
- Run: `npx biome check --write .`

## Import Organization

**Order:**

TypeScript:
1. External packages (react, electron, etc.)
2. Internal modules (@/, relative imports)
3. Type imports (import type {})

Python:
1. Standard library imports
2. Third-party packages
3. Local application imports

**Grouping:**
- Blank lines between groups
- Alphabetical sorting within groups (not strictly enforced)

**Path Aliases (Frontend):**
- `@/` → `src/`
- `@shared/` → `src/shared/`
- `@features/` → `src/renderer/components/features/`
- `@components/` → `src/renderer/components/`
- `@hooks/` → `src/renderer/hooks/`
- `@lib/` → `src/renderer/lib/`

## Error Handling

**Patterns:**

Backend (Python):
- Throw exceptions, catch at command/agent boundaries
- Custom error classes extend `Exception`
- Async functions use try/except, no chained .catch()
- Log errors with context before re-raising

Frontend (TypeScript):
- Throw errors, catch at component boundaries (error boundaries)
- IPC errors propagated to UI with user-friendly messages
- Async functions use try/catch

**Error Types:**
- Throw on: invalid input, missing dependencies, invariant violations
- Log before throwing: Include context (user ID, file path, operation)
- Include cause: `new Error('Failed to X', { cause: originalError })`

## Logging

**Framework:**

Backend:
- `rich` library for terminal output
- Custom logging in `task_logger/logger.py`, `core/debug.py`
- Levels: debug, info, warn, error

Frontend:
- Custom app logger in `src/main/services/app-logger.ts`
- Levels: info, warn, error, debug
- Sentry integration for error tracking

**Patterns:**
- Log at service boundaries, not in utility functions
- Log state transitions, external API calls, errors
- Structured logging with context when possible
- No console.log in committed frontend code (use app logger)

## Comments

**When to Comment:**

Backend (Python):
- Module docstrings required (PEP 257 format)
- Function docstrings for public APIs with Args, Returns sections
- Inline comments explain "why", not "what"
- Complex algorithms need explanation

Frontend (TypeScript):
- File headers with JSDoc-style comments describing purpose
- Complex logic needs explanation
- Avoid obvious comments (e.g., `// increment counter`)

**JSDoc/TSDoc:**

Frontend:
- Used for file headers
- Format: `/**  * Description */`
- `@param` and `@returns` tags for complex functions (not strictly required)

**TODO Comments:**
- Format: `// TODO: description` (no username - use git blame)
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`
- Examples found in codebase:
  - `apps/backend/core/workspace.py:1578` - TODO for unimplemented feature
  - `apps/frontend/src/renderer/stores/settings-store.ts:214` - TODO for i18n
  - `apps/frontend/src/renderer/components/ideation/EnvConfigModal.tsx:1` - TODO for props interface

## Function Design

**Size:**
- Keep functions focused and reasonably sized
- Extract helpers for complex logic
- Many files >300 lines indicate room for refactoring

**Parameters:**

Backend (Python):
- Type hints required for all parameters
- Example: `def get_profile(project_dir: Path, force: bool = False) -> SecurityProfile:`

Frontend (TypeScript):
- TypeScript strict mode enabled
- Use object destructuring for multiple parameters

**Return Values:**
- Explicit returns required
- Type hints (Python) or TypeScript return types
- Return early for guard clauses

## Module Design

**Exports:**

Frontend:
- Named exports preferred
- Default exports for React components
- Barrel files (`index.ts`) for public APIs

Backend:
- Standard Python module exports
- No `__all__` declarations typically

**Patterns:**
- Avoid circular dependencies
- Keep internal helpers private

## Internationalization (Frontend)

**CRITICAL: All user-facing text must use i18n translation keys.**

- Framework: react-i18next (v16.5.0)
- Translation files: `apps/frontend/src/shared/i18n/locales/{lang}/*.json`
- Namespaces: common, navigation, settings, dialogs, tasks, errors, onboarding, welcome
- Usage pattern:
  ```typescript
  const { t } = useTranslation(['navigation', 'common']);
  <span>{t('navigation:items.githubPRs')}</span>  // ✅ CORRECT
  <span>GitHub PRs</span>                          // ❌ WRONG
  ```
- When adding new UI text:
  1. Add translation key to ALL language files (minimum: en/*.json and fr/*.json)
  2. Use `namespace:section.key` format
  3. Never use hardcoded strings in JSX/TSX

## Cross-Platform Development

**CRITICAL: Centralized platform abstraction required.**

**Pattern:**
- Backend: `apps/backend/core/platform/` module
- Frontend: `apps/frontend/src/main/platform/` module
- All platform checks MUST use these modules, not direct `process.platform` checks

**Anti-pattern (violations found):**
- Direct `process.platform === 'win32'` checks in multiple files
- Hardcoded paths like `C:\Program Files` or `/opt/homebrew/bin`

**Correct approach:**
```typescript
// ❌ WRONG - Direct platform check
if (process.platform === 'win32') { }

// ✅ CORRECT - Use abstraction
import { isWindows, findExecutable } from './platform';
if (isWindows()) { }
```

## Type Safety

**Python:**
- Type hints mandatory for function signatures
- Pydantic models for data validation
- mypy or similar type checker (not strictly enforced in practice)

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- No `any` types preferred
- Type inference used where clear
- Explicit types for public APIs

---

*Convention analysis: 2026-01-20*
*Update when patterns change*
