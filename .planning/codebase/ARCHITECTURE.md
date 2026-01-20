# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Multi-Tier Autonomous AI Framework (Layered + Agent-based architecture)

**Key Characteristics:**
- Complex microservices architecture with CLI backend + Electron desktop frontend
- Multi-agent autonomous coding with workspace isolation
- Agent-based execution with session management and recovery
- Git worktree isolation for safe feature development
- Async/await concurrency (Python backend) and Promise-based (TypeScript frontend)

## Layers

### Backend Python (`apps/backend/`)

**CLI Entry & Command Layer** (`cli/`):
- Purpose: Command-line interface for user interactions
- Contains: Argument parsers, command handlers, workspace management
- Location: `cli/main.py`, `cli/build_commands.py`, `cli/workspace_commands.py`, `cli/qa_commands.py`
- Depends on: Agent orchestration, services, spec pipeline
- Used by: User CLI invocations (`python run.py --spec 001`)

**Agent Orchestration Layer** (`agents/`, `services/`):
- Purpose: AI agent lifecycle and coordination
- Contains:
  - Agent implementations: `agents/coder.py`, `agents/planner.py`, `agents/session.py`
  - Memory management: `agents/memory_manager.py`
  - Orchestration: `services/orchestrator.py`, `services/context.py`
- Depends on: SDK client layer, implementation plan, security
- Used by: CLI commands, spec runner

**Spec/Feature Pipeline Layer** (`spec/`, `runners/`):
- Purpose: Spec creation and validation
- Contains:
  - Spec runner: `runners/spec_runner.py` (dynamic complexity-based phases)
  - Complexity assessment: `spec/complexity.py`
  - Phase execution: `spec/phases/executor.py`
  - Validation: `spec/validation_strategy.py`
- Depends on: Agents, context, analysis
- Used by: User spec creation workflows

**Implementation Plan Layer** (`implementation_plan/`):
- Purpose: Structured plan representation and tracking
- Contains: `plan.py`, `phase.py`, `subtask.py`, `factories.py`, `verification.py`
- Depends on: None (data structures)
- Used by: Agents, orchestrator

**Workspace/Isolation Layer** (`core/workspace/`, `core/worktree.py`):
- Purpose: Git worktree management for isolated builds
- Contains:
  - Workspace orchestration: `core/workspace.py` (2096 lines - complex merge operations)
  - Worktree management: `core/worktree.py` (git operations)
  - Git utilities: `core/workspace/git_utils.py`
- Depends on: Git executable, security
- Used by: CLI workspace commands, merge operations

**SDK Client Layer** (`core/client.py`):
- Purpose: Claude Agent SDK client factory
- Contains: `client.py` (client creation), `auth.py` (OAuth), `model_config.py`
- Depends on: Security hooks, platform detection
- Used by: All agents

**Security & Validation Layer** (`security/`):
- Purpose: Multi-layered security for agent tool calls
- Contains:
  - Command parsing: `parser.py`
  - Validators: `shell_validators.py`, `filesystem_validators.py`, `git_validators.py`
  - Secret scanning: `scan_secrets.py`
  - Security hooks: `hooks.py`
- Depends on: Project analysis (for dynamic allowlists)
- Used by: SDK client (pre-execution hooks)

**Integration Layer** (`integrations/`):
- Purpose: External service integrations
- Contains:
  - Graphiti memory: `graphiti/memory.py`, `graphiti/queries_pkg/`
  - Linear: `linear/integration.py`
- Depends on: External APIs
- Used by: Agents, orchestrator

**Project Analysis Layer** (`context/`, `analysis/`):
- Purpose: Codebase discovery and stack detection
- Contains: `context/main.py`, `context/builder.py`, `analysis/analyzers/`
- Depends on: File system, AI analyzers
- Used by: Security (dynamic allowlists), spec creation, agents

**Knowledge & Planning Layer** (`prompt_generator.py`, `prompts/`):
- Purpose: Dynamic prompt construction for agents
- Contains: `prompt_generator.py`, `prompts/*.md` (agent system prompts)
- Depends on: None (templates)
- Used by: Agents

**Utilities & Infrastructure**:
- Platform abstraction: `core/platform/` (Windows/macOS/Linux compatibility)
- Terminal UI: `ui/` (styling, status managers)
- Logging: `task_logger.py`, `debug.py`
- Recovery: `recovery.py`

### Frontend TypeScript/React (`apps/frontend/`)

**Electron Main Process** (`src/main/`):
- Purpose: Desktop app lifecycle, native integration
- Contains: `index.ts` (entry), `agent-manager.ts`, `ipc-setup.ts`, `services/`
- Depends on: Node APIs, Python subprocess
- Used by: Electron runtime

**Preload Script** (`src/preload/`):
- Purpose: Safe IPC bridge between main and renderer
- Contains: `api/` (IPC exports to renderer)
- Depends on: Electron contextBridge
- Used by: Renderer process

**Renderer Process (React UI)** (`src/renderer/`):
- Purpose: User interface
- Contains:
  - Components: `components/` (80+ React components)
  - State management: `stores/` (Zustand)
  - Hooks: `hooks/` (custom React hooks)
- Depends on: Preload API, React
- Used by: User interactions

**State Management** (`src/renderer/stores/`):
- Purpose: Application state
- Contains: `project-store.ts`, `task-store.ts`, `settings-store.ts`, `terminal-store.ts`, etc.
- Depends on: Zustand, IPC
- Used by: React components

**Shared Code** (`src/shared/`):
- Purpose: Cross-process utilities and types
- Contains: `types/`, `constants/`, `i18n/`, `utils/`
- Depends on: None
- Used by: Main, preload, renderer

## Data Flow

### Spec Creation Flow (Multi-Phase)

```
User Input → CLI (spec_runner.py)
  ↓
Complexity Assessment (complexity.py with AI evaluation)
  ↓
Dynamic Phase Selection (phases/ directory)
  ├─ SIMPLE: Discovery → Quick Spec → Validate (3 phases)
  ├─ STANDARD: Discovery → Requirements → Context → Spec → Plan → Validate (6-7 phases)
  └─ COMPLEX: Full 8-phase pipeline + Research + Critique
  ↓
Phase Execution (spec/phases/executor.py)
  ↓
Agent Sessions (Core SDK client)
  ↓
Spec Output (.auto-claude/specs/XXX/)
  ├─ spec.md
  ├─ requirements.json
  ├─ context.json
  ├─ implementation_plan.json
  └─ graphiti/ (memory)
```

### Implementation Flow (Agent Loop)

```
Run Command (run.py --spec 001)
  ↓
Workspace Setup (worktree.py) - Isolated branch
  ↓
Agent Loop (agents/coder.py - async, concurrent)
  ├─ Load Implementation Plan
  ├─ Get Next Subtask
  ├─ Prepare Prompt (prompt_generator.py)
  ├─ Create SDK Client (core/client.py)
  ├─ Run Agent Session (agents/session.py)
  │   ├─ Security Validation (security/)
  │   ├─ Tool Execution
  │   ├─ Memory Update (Graphiti)
  │   └─ Recovery Tracking
  ├─ Post-Session Processing (update plan, sync memory)
  ├─ Linear Integration (if enabled)
  └─ Next iteration → Get Next Subtask
  ↓
Completion
  ├─ Worktree Review (user tests in isolated dir)
  └─ Merge to Main (workspace.py)
```

### Frontend IPC Flow

```
Renderer (React Components)
  ↓
useIpc Hook / IPC Events
  ↓
Preload Bridge (preload/api/)
  ↓
Main Process IPC Handlers (ipc-handlers/)
  ├─ Terminal I/O (node-pty)
  ├─ File Operations
  ├─ Python Process Control
  ├─ Agent Execution
  └─ Settings Management
  ↓
Backend Services
  ├─ Python CLI (subprocess)
  ├─ Git Operations
  └─ Claude SDK
  ↓
State Updates (Zustand stores)
  ↓
Renderer Re-render
```

**State Management:**
- Backend: Stateless per-command execution, state persisted to `.auto-claude/` directory
- Frontend: Zustand stores with IPC sync to backend
- Graphiti: Cross-session memory in embedded graph database

## Key Abstractions

**Agent:**
- Purpose: Autonomous AI worker for specific tasks
- Examples: Planner (`agents/planner.py`), Coder (`agents/coder.py`), QA Reviewer, QA Fixer
- Pattern: Session-based with Claude SDK client, memory persistence
- Location: `apps/backend/agents/`

**Workspace Isolation:**
- Purpose: Safe feature development without polluting main branch
- Pattern: Git worktree per spec (`auto-claude/{spec-name}`)
- Location: `.auto-claude/worktrees/tasks/{spec-name}/`
- Files: `core/workspace.py`, `core/worktree.py`

**Implementation Plan:**
- Purpose: Hierarchical task tracking
- Structure: Phases → Subtasks with status tracking
- Storage: JSON in `.auto-claude/specs/XXX/implementation_plan.json`
- Location: `implementation_plan/plan.py`

**Memory System (Graphiti):**
- Purpose: Cross-session context and semantic search
- Pattern: Graph database with embedded LadybugDB
- Storage: `.auto-claude/specs/XXX/graphiti/`
- Location: `integrations/graphiti/`

**Security Hooks:**
- Purpose: Middleware for agent tool call validation
- Pattern: Pre-execution validators (shell, git, filesystem)
- Allowlist: Dynamic based on project stack detection
- Location: `security/hooks.py`, `security/*_validators.py`

**Phase-Based Architecture:**
- Purpose: Adaptive workflow based on task complexity
- Spec Creation: 3-8 dynamic phases
- Implementation: Multi-phase subtask execution
- Configuration: `phase_config.py` controls model and thinking budget

## Entry Points

### Backend Entry Points

**CLI Entry:**
- Location: `/Users/guilhermevarela/Documents/Projetos/Auto-Claude/apps/backend/run.py`
- Entry: `cli/main.py`
- Triggers: User runs `python run.py --spec 001`
- Responsibilities: Parse args, route to command handlers

**Spec Runner:**
- Location: `apps/backend/runners/spec_runner.py`
- Triggers: User runs `python spec_runner.py --task "..."`
- Responsibilities: Dynamic spec creation with complexity assessment

### Frontend Entry Points

**Main Process:**
- Location: `apps/frontend/src/main/index.ts`
- Triggers: Electron app launch
- Responsibilities: Window creation, IPC setup, agent management

**Renderer:**
- Location: `apps/frontend/src/renderer/main.tsx`
- Triggers: Main process creates renderer window
- Responsibilities: React root, provider setup

**App Root:**
- Location: `apps/frontend/src/renderer/App.tsx`
- Triggers: React render
- Responsibilities: Main UI layout, route management

## Error Handling

**Strategy:** Multi-level error handling with recovery mechanisms

**Patterns:**
- Backend: Try/catch at command level, log and exit(1)
- Agents: Session recovery, checkpoint tracking
- Frontend: Error boundaries for React components, IPC error propagation
- Security: Validation errors fail fast before execution

## Cross-Cutting Concerns

**Logging:**
- Backend: Rich console output, file logging (`task_logger/`)
- Frontend: App logger service (`app-logger.ts`)
- Levels: debug, info, warn, error

**Validation:**
- Security: Multi-validator pattern (shell, git, filesystem)
- Data: Pydantic models (backend), TypeScript interfaces (frontend)
- Fail fast: Invalid input rejected before execution

**Authentication:**
- Claude SDK: OAuth token-based authentication
- Pattern: Token stored in environment variable, validated at client creation
- Location: `core/auth.py`

**Platform Abstraction:**
- Centralized: `core/platform/` (backend), `src/main/platform/` (frontend)
- Pattern: Feature detection, executable finding, path handling
- Cross-platform: Windows, macOS, Linux

---

*Architecture analysis: 2026-01-20*
*Update when major patterns change*
