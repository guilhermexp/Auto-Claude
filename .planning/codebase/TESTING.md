# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**

Backend:
- pytest - Unit and integration tests
- Config: `tests/pytest.ini`

Frontend:
- Vitest 4.0.16 - Unit tests
- Config: `apps/frontend/vitest.config.ts`

**Assertion Library:**
- Backend: pytest built-in assertions
- Frontend: Vitest built-in `expect`
- Frontend: @testing-library/jest-dom (v6.9.1) - DOM matchers

**Run Commands:**

Backend:
```bash
# From apps/backend/ directory
apps/backend/.venv/bin/pytest tests/ -v                # Run all tests
apps/backend/.venv/bin/pytest tests/ -m "not slow"    # Skip slow tests
apps/backend/.venv/bin/pytest tests/test_security.py::TestCommandExtraction::test_simple_command -v  # Specific test

# Or from root
npm run test:backend
```

Frontend:
```bash
# From apps/frontend/ directory
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test -- path/to/file.test.ts     # Single file
npm run test:coverage                 # Coverage report
npm run test:e2e                      # E2E tests (Playwright)
```

## Test File Organization

**Location:**

Backend:
- All tests in `tests/` directory at project root
- Not co-located with source
- Pattern: `test_*.py`

Frontend:
- Mixed strategy:
  - Some co-located: `{Component}.test.tsx` alongside source
  - Some in `__tests__/` directories
  - Integration tests: `src/__tests__/integration/`
- Pattern: `*.test.ts` or `*.test.tsx`

**Naming:**

Backend:
- `test_*.py` (e.g., `test_security.py`, `test_merge_parallel.py`)

Frontend:
- Unit tests: `{name}.test.ts` or `{name}.test.tsx`
- Integration tests: `{feature}.integration.test.ts`

**Structure:**

Backend:
```
tests/
  ├── pytest.ini
  ├── requirements-test.txt
  ├── test_security.py
  ├── test_merge_parallel.py
  └── test_*.py
```

Frontend:
```
apps/frontend/src/
  ├── __tests__/
  │   ├── setup.ts                 # Test environment setup
  │   └── integration/             # Integration tests
  │       ├── claude-profile-ipc.test.ts
  │       ├── file-watcher.test.ts
  │       └── task-lifecycle.test.ts
  ├── main/__tests__/
  │   ├── agent-events.test.ts
  │   ├── app-logger.test.ts
  │   └── ...
  ├── renderer/
  │   ├── components/
  │   │   ├── TaskCard.tsx
  │   │   ├── AuthStatusIndicator.test.tsx  # Co-located
  │   │   └── __tests__/
  │   │       ├── ProjectTabBar.test.tsx
  │   │       └── SortableProjectTab.test.tsx
  │   └── __tests__/
  │       ├── task-store.test.ts
  │       └── roadmap-store.test.ts
  └── __mocks__/
      ├── electron.ts
      └── sentry-electron-main.ts
```

## Test Structure

**Suite Organization:**

Backend (pytest):
```python
class TestCommandExtraction:
    """Tests for command extraction from shell strings."""

    def test_simple_command(self):
        """Extracts single command correctly."""
        commands = extract_commands("ls -la")
        assert commands == ["ls"]
```

Frontend (Vitest):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ModuleName', () => {
  beforeEach(() => {
    // Reset state
  });

  describe('functionName', () => {
    it('should handle valid input', () => {
      // arrange
      const input = createTestInput();

      // act
      const result = functionName(input);

      // assert
      expect(result).toEqual(expectedOutput);
    });

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow('Invalid input');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

**Patterns:**
- Backend: Class-based tests for related test cases, module-level for simple tests
- Frontend: `beforeEach` for per-test setup, `afterEach` to restore mocks
- Explicit arrange/act/assert structure in complex tests
- One assertion focus per test (but multiple expects OK)

## Mocking

**Framework:**

Backend:
- pytest built-in mocking (monkeypatch, fixtures)

Frontend:
- Vitest built-in mocking (`vi`)
- Module mocking via `vi.mock()` at top of file

**Patterns:**

Backend:
```python
def test_with_mock(monkeypatch):
    mock_fn = lambda: "mocked"
    monkeypatch.setattr(module, "function", mock_fn)
    # test code
```

Frontend:
```typescript
import { vi } from 'vitest';
import { externalFunction } from './external';

// Mock module
vi.mock('./external', () => ({
  externalFunction: vi.fn()
}));

describe('test suite', () => {
  it('mocks function', () => {
    const mockFn = vi.mocked(externalFunction);
    mockFn.mockReturnValue('mocked result');

    // test code

    expect(mockFn).toHaveBeenCalledWith('expected arg');
  });
});
```

**What to Mock:**
- Backend: External subprocess calls, file system operations, network requests
- Frontend: Electron APIs, file system, IPC handlers, timers
- Both: External API calls, environment variables

**What NOT to Mock:**
- Pure functions and utilities
- Internal business logic
- TypeScript types

## Fixtures and Factories

**Test Data:**

Backend:
```python
# Fixtures defined in test files or conftest.py
@pytest.fixture
def sample_config():
    return {"key": "value"}
```

Frontend:
```typescript
// Factory functions in test files
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    specId: 'test-spec-001',
    projectId: 'project-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'backlog' as TaskStatus,
    subtasks: [],
    logs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// Example from task-store.test.ts (lines 10-24)
function createTestPlan(overrides: Partial<ImplementationPlan> = {}): ImplementationPlan {
  return {
    feature: 'Test Feature',
    workflow_type: 'feature',
    services_involved: [],
    phases: [
      {
        phase: 1,
        name: 'Test Phase',
        type: 'implementation',
        subtasks: [
          { id: 'subtask-1', description: 'First subtask', status: 'pending' },
          { id: 'subtask-2', description: 'Second subtask', status: 'pending' }
        ]
      }
    ],
    final_acceptance: ['Tests pass'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    spec_file: 'spec.md',
    ...overrides
  };
}
```

**Location:**
- Backend: Fixtures in test files or `conftest.py`
- Frontend: Factory functions in test files, shared mocks in `src/__mocks__/`

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- Focus on critical paths

**Configuration:**

Backend:
- Not explicitly configured in pytest.ini
- Can be run with: `pytest --cov=apps/backend --cov-report=html`

Frontend:
- Provider: v8
- Reporters: text, json, html
- Config: `apps/frontend/vitest.config.ts`
- Include: `src/**/*.ts`, `src/**/*.tsx`
- Exclude: test files, type definitions, `node_modules`

**View Coverage:**

Backend:
```bash
pytest tests/ --cov=apps/backend --cov-report=html
open htmlcov/index.html
```

Frontend:
```bash
npm run test:coverage
open coverage/index.html
```

## Test Types

**Unit Tests:**
- Backend: Test single function/class in isolation
- Frontend: Test single component/function in isolation
- Mocking: Mock all external dependencies
- Speed: Fast (<100ms per test)

**Integration Tests:**
- Backend: Test multiple modules together (e.g., agent + client + security)
- Frontend: Test IPC bridge, file watchers, task lifecycle
- Location: `apps/frontend/src/__tests__/integration/`
- Mocking: Mock only external boundaries

**E2E Tests:**
- Frontend: Playwright for end-to-end user flows
- Location: `apps/frontend/e2e/`
- Command: `npm run test:e2e`
- Examples: `e2e/task-workflow.spec.ts`

## Common Patterns

**Async Testing:**

Backend:
```python
@pytest.mark.asyncio
async def test_async_operation():
    result = await async_function()
    assert result == "expected"
```

Frontend:
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing:**

Backend:
```python
def test_error():
    with pytest.raises(ValueError, match="Invalid input"):
        function_call()
```

Frontend:
```typescript
it('should throw on invalid input', () => {
  expect(() => parse(null)).toThrow('Cannot parse null');
});

// Async error
it('should reject on file not found', async () => {
  await expect(readConfig('invalid.txt')).rejects.toThrow('ENOENT');
});
```

**React Component Testing:**

Frontend (with React Testing Library):
```typescript
import { render, screen } from '@testing-library/react';

it('renders component', () => {
  render(<TaskCard task={createTestTask()} />);
  expect(screen.getByText('Test Task')).toBeInTheDocument();
});
```

**Performance Testing (Frontend):**

Example from `TaskCard.tsx` (lines 80-109):
```typescript
// React.memo with custom comparator for performance testing
const arePropsEqual = (prevProps: TaskCardProps, nextProps: TaskCardProps) => {
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // Check reference equality first (fast path)
  if (prevTask === nextTask &&
      prevProps.onToggleSelect === nextProps.onToggleSelect) {
    return true;
  }

  // Compare specific fields that affect rendering
  const isEqual = (
    prevTask.id === nextTask.id &&
    prevTask.status === nextTask.status &&
    prevTask.title === nextTask.title &&
    prevTask.description === nextTask.description &&
    prevTask.updatedAt === nextTask.updatedAt &&
    prevTask.subtasks.every((s, i) => s.status === nextTask.subtasks[i]?.status)
  );

  return isEqual;
};
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions

## Pre-Commit Hooks

**Pre-commit Configuration:** `.pre-commit-config.yaml`

**Test Hooks:**

Backend:
- pytest runs on commit for `apps/backend/` and `tests/`
- Excludes slow/integration tests: `-m "not slow and not integration"`
- Skipped in worktrees (if `node_modules` not found)

Frontend:
- Biome lint + format check
- TypeScript type checking
- Skipped in worktrees (if `node_modules` not found)

**Running Manually:**
```bash
# All hooks
pre-commit run --all-files

# Specific hook
pre-commit run pytest --all-files
```

---

*Testing analysis: 2026-01-20*
*Update when test patterns change*
