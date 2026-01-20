# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
Auto-Claude/
├── apps/
│   ├── backend/           # Python CLI and agent logic
│   │   ├── agents/        # Agent implementations
│   │   ├── cli/           # Command-line interface
│   │   ├── core/          # Core infrastructure
│   │   ├── integrations/  # External integrations
│   │   ├── security/      # Security validation
│   │   ├── spec/          # Spec creation pipeline
│   │   └── run.py         # Main CLI entry point
│   └── frontend/          # Electron desktop app
│       ├── resources/     # Static assets
│       └── src/           # TypeScript source code
│           ├── main/      # Electron main process
│           ├── preload/   # IPC bridge
│           ├── renderer/  # React UI
│           └── shared/    # Shared utilities
├── guides/                # Documentation
├── tests/                 # Test suite
├── scripts/               # Build and utility scripts
├── .auto-claude/          # Project data (gitignored)
│   ├── specs/            # Spec directories
│   └── worktrees/        # Isolated workspaces
└── .planning/             # GSD planning files (optional)
```

## Directory Purposes

### `apps/backend/` - Python Backend

**agents/**
- Purpose: Agent implementations (planner, coder, QA)
- Contains: `coder.py`, `planner.py`, `session.py`, `memory_manager.py`, `tools_pkg/`
- Key files: `coder.py` (main implementation agent), `session.py` (lifecycle management)

**analysis/**
- Purpose: AI-based code analysis
- Contains: `analyzers/` (framework, route, database, port, service detectors)
- Key files: `insight_extractor.py` (643 lines)

**cli/**
- Purpose: Command-line interface
- Contains: `main.py`, `build_commands.py`, `workspace_commands.py`, `qa_commands.py`, `spec_commands.py`
- Key files: `main.py` (entry point, argument parser)

**context/**
- Purpose: Project context discovery and building
- Contains: `main.py`, `builder.py`, `search.py`
- Key files: `main.py` (codebase discovery)

**core/**
- Purpose: Core infrastructure
- Contains: `client.py` (SDK factory), `auth.py`, `workspace.py` (2096 lines), `worktree.py` (1404 lines)
- Subdirectories: `platform/` (cross-platform utilities), `workspace/` (merge utilities)
- Key files: `client.py` (Claude SDK client), `workspace.py` (merge orchestration)

**ideation/**
- Purpose: Ideation/brainstorming features
- Contains: `phase_executor.py`

**implementation_plan/**
- Purpose: Plan data structures
- Contains: `plan.py`, `phase.py`, `subtask.py`, `factories.py`, `verification.py`

**integrations/**
- Purpose: External integrations
- Contains: `graphiti/` (memory system), `linear/` (project management)
- Subdirectories: `graphiti/queries_pkg/` (graph queries), `graphiti/providers_pkg/` (LLM providers)

**merge/**
- Purpose: Conflict resolution and merge strategies
- Contains: `ai_resolver/resolver.py`, `conflict_analysis.py`, `compatibility_rules.py`

**project/**
- Purpose: Project analysis and stack detection
- Contains: `analyzer.py`, `stack_detector.py`

**prompts/**
- Purpose: Agent system prompts (.md files)
- Contains: `planner.md`, `coder.md`, `qa_reviewer.md`, `qa_fixer.md`, `spec_gatherer.md`

**qa/**
- Purpose: QA validation logic
- Contains: `loop.py`, `report.py`, `reviewer.py`, `fixer.py`

**runners/**
- Purpose: Spec creation and automation runners
- Contains: `spec_runner.py`, `github/` (GitHub automation), `gitlab/` (GitLab automation), `roadmap/`
- Subdirectories: `github/services/` (batch processor, PR worktree manager)

**security/**
- Purpose: Security validation and scanning
- Contains: `parser.py`, `shell_validators.py`, `filesystem_validators.py`, `git_validators.py`, `hooks.py`

**services/**
- Purpose: Core service orchestration
- Contains: `orchestrator.py`, `context.py`, `recovery.py`

**spec/**
- Purpose: Spec pipeline
- Contains: `complexity.py`, `validation_strategy.py`, `phases/` (phase definitions and executor)

**task_logger/**
- Purpose: Build logging
- Contains: `logger.py`

**ui/**
- Purpose: Terminal UI utilities
- Contains: Styling and status managers

### `apps/frontend/` - TypeScript/Electron Frontend

**resources/**
- Purpose: Static assets (icons, images)
- Contents: Platform-specific assets for macOS, Linux, Windows

**src/main/** - Electron Main Process
- Purpose: Main process logic
- Contains:
  - `index.ts` - Entry point, window creation
  - `agent-manager.ts` - Python agent orchestration
  - `cli-tool-manager.ts` - Claude CLI integration (1246 lines)
  - `ipc-setup.ts` - IPC handler registration
  - `agent/` - Agent execution runners
  - `ipc-handlers/` - IPC message handlers
  - `platform/` - Cross-platform utilities
  - `services/` - Terminal, Python, profile managers
- Key files:
  - `index.ts` - Electron app entry (461 lines)
  - `cli-tool-manager.ts` - CLI integration (1246 lines)
  - `terminal/pty-manager.ts` - PTY management

**src/preload/**
- Purpose: IPC bridge between main and renderer
- Contains: `api/` (safe IPC API exports)
- Key files: `index.ts` (context bridge)

**src/renderer/** - React UI
- Purpose: User interface
- Contains:
  - `main.tsx` - React entry point
  - `App.tsx` - Root component
  - `components/` - 80+ React components
  - `stores/` - Zustand state management
  - `hooks/` - Custom React hooks
  - `lib/` - Utilities (WebGL, Sentry, terminal buffer)
  - `contexts/` - React contexts
- Subdirectories:
  - `components/ui/` - Radix UI-based components
  - `components/ideation/` - Ideation workspace components
  - `components/github/`, `components/gitlab/` - Integration components
- Key files:
  - `App.tsx` - Main UI layout
  - `stores/task-store.ts` - Task state management

**src/shared/**
- Purpose: Shared code across main, preload, renderer
- Contains:
  - `types/` - TypeScript interfaces
  - `constants/` - App constants, themes, colors
  - `i18n/` - Internationalization (English, French)
  - `utils/` - Utility functions

## Key File Locations

**Entry Points:**
- Backend: `apps/backend/run.py` - CLI entry point
- Backend: `apps/backend/runners/spec_runner.py` - Spec creation
- Frontend: `apps/frontend/src/main/index.ts` - Electron main process
- Frontend: `apps/frontend/src/renderer/main.tsx` - React root

**Configuration:**
- Backend: `apps/backend/requirements.txt` - Python dependencies
- Backend: `apps/backend/.env.example` - Environment variable template
- Frontend: `apps/frontend/package.json` - Node dependencies and scripts
- Frontend: `apps/frontend/electron.vite.config.ts` - Build configuration
- Frontend: `apps/frontend/biome.jsonc` - Linting configuration
- Frontend: `apps/frontend/tailwind.config.ts` - CSS framework config
- Frontend: `apps/frontend/.env.example` - Environment variable template

**Core Logic:**
- Backend: `apps/backend/agents/coder.py` - Main implementation agent
- Backend: `apps/backend/core/client.py` - Claude SDK client factory
- Backend: `apps/backend/core/workspace.py` - Merge orchestration (2096 lines)
- Frontend: `apps/frontend/src/main/agent-manager.ts` - Python agent control
- Frontend: `apps/frontend/src/renderer/stores/` - Application state

**Testing:**
- Backend: `tests/` - Python tests (pytest)
- Frontend: `apps/frontend/src/renderer/__tests__/` - React component tests
- Frontend: `apps/frontend/src/main/__tests__/` - Main process tests
- Frontend: `apps/frontend/e2e/` - Playwright E2E tests

**Documentation:**
- `README.md` - Project overview
- `CLAUDE.md` - Claude Code instructions (project guidance)
- `guides/` - User and developer documentation
- `RELEASE.md` - Release process documentation

## Naming Conventions

**Files:**

Backend (Python):
- `snake_case.py` - All Python modules
- `test_*.py` - Test files

Frontend (TypeScript):
- `PascalCase.tsx` - React components (e.g., `TaskCard.tsx`, `ProjectTabBar.tsx`)
- `kebab-case.ts` - Services, utilities (e.g., `app-logger.ts`, `claude-cli-utils.ts`)
- `camelCase-store.ts` - Zustand stores (e.g., `task-store.ts`, `project-store.ts`)
- `*.test.ts` or `*.test.tsx` - Test files

**Directories:**
- `kebab-case` - All directories (Python and TypeScript)
- Plural for collections: `agents/`, `services/`, `components/`

**Special Patterns:**
- `index.ts` - Directory exports (barrel files)
- `__tests__/` - Test directories
- `__mocks__/` - Mock implementations

## Where to Add New Code

**New Backend Agent:**
- Primary code: `apps/backend/agents/{agent-name}.py`
- Prompt: `apps/backend/prompts/{agent-name}.md`
- Tests: `tests/test_{agent-name}.py`

**New Frontend Component:**
- Implementation: `apps/frontend/src/renderer/components/{ComponentName}.tsx`
- Tests: Co-located `{ComponentName}.test.tsx` or `__tests__/{ComponentName}.test.tsx`
- Styles: Inline Tailwind CSS classes

**New Integration:**
- Backend: `apps/backend/integrations/{service}/`
- Frontend: `apps/frontend/src/renderer/components/{service}/`

**New Security Validator:**
- Implementation: `apps/backend/security/{type}_validators.py`
- Register: `apps/backend/security/hooks.py`

**New State Store:**
- Implementation: `apps/frontend/src/renderer/stores/{feature}-store.ts`
- Types: `apps/frontend/src/shared/types/index.ts`

**Utilities:**
- Backend: `apps/backend/` (no dedicated utils/ directory - domain-specific)
- Frontend: `apps/frontend/src/shared/utils/`

## Special Directories

**.auto-claude/**
- Purpose: Project data (specs, worktrees, memory)
- Source: Created by backend during execution
- Committed: No (in `.gitignore`)
- Contents: `.auto-claude/specs/`, `.auto-claude/worktrees/`

**.planning/**
- Purpose: GSD planning files (optional - not part of core Auto Claude)
- Source: Created by GSD workflow if used
- Committed: Yes (planning artifacts)

**apps/frontend/dist/**
- Purpose: Built frontend assets
- Source: Vite build output
- Committed: No (build artifacts in `.gitignore`)

**apps/backend/.venv/**
- Purpose: Python virtual environment
- Source: Created by `uv venv`
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-01-20*
*Update when directory structure changes*
