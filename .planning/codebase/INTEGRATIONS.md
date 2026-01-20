# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**AI/LLM Services:**
- **Anthropic Claude API** - Primary AI agent execution
  - SDK/Client: claude-agent-sdk >=0.1.19 (`apps/backend/core/client.py`)
  - Auth: OAuth token in `CLAUDE_CODE_OAUTH_TOKEN` env var
  - Usage: All agent sessions (planner, coder, QA, spec creation)

- **Anthropic API (Direct)** - Secondary usage for complexity assessment
  - SDK/Client: @anthropic-ai/sdk ^0.71.2 (frontend)
  - Auth: API key in `ANTHROPIC_API_KEY` env var
  - Usage: Spec complexity analysis, Graphiti embeddings

- **OpenAI API** - Optional LLM provider for Graphiti
  - SDK/Client: openai (via graphiti-core)
  - Auth: API key in `OPENAI_API_KEY` env var
  - Usage: Graphiti memory embeddings and LLM operations

- **Google AI (Gemini)** - Optional LLM provider for Graphiti
  - SDK/Client: google-generativeai (via graphiti-core)
  - Auth: API key in `GOOGLE_AI_API_KEY` env var
  - Usage: Graphiti memory embeddings

- **Ollama** - Optional local LLM provider for Graphiti
  - Integration: HTTP client to Ollama server
  - Endpoint: `OLLAMA_BASE_URL` env var (default: http://localhost:11434)
  - Usage: Local/offline Graphiti memory operations

**Project Management:**
- **Linear** - Optional issue tracking integration
  - SDK/Client: Custom GraphQL client (`apps/backend/integrations/linear/`)
  - Auth: API key in `LINEAR_API_KEY` env var
  - Usage: Auto-update Linear issues during spec execution

- **GitHub** - Repository and PR automation
  - SDK/Client: GitHub CLI (gh) via subprocess
  - Auth: GitHub token (managed by gh CLI)
  - Usage: PR creation, issue management, batch operations
  - Location: `apps/backend/runners/github/`

- **GitLab** - Repository and MR automation
  - SDK/Client: Custom GitLab client
  - Auth: GitLab token
  - Usage: MR review, issue management
  - Location: `apps/backend/runners/gitlab/`

**Error Tracking:**
- **Sentry** - Application error monitoring
  - SDK/Client: @sentry/electron (frontend), sentry-sdk (backend)
  - DSN: `SENTRY_DSN` env var (frontend and backend)
  - Usage: Error tracking, performance monitoring, release tracking

## Data Storage

**Databases:**
- **LadybugDB (Embedded)** - Graph database for Graphiti memory
  - Connection: Embedded in-process (no external server)
  - Client: real_ladybug >=0.13.0
  - Location: `.auto-claude/specs/XXX/graphiti/` per spec
  - No migrations needed (embedded)

**File Storage:**
- **Local File System** - All state stored locally
  - Spec data: `.auto-claude/specs/` directory
  - Worktrees: `.auto-claude/worktrees/tasks/` directory
  - Graphiti memory: `.auto-claude/specs/XXX/graphiti/`
  - No cloud storage integration

**Caching:**
- **In-Memory Cache** - Project index cache with 5-minute TTL
  - Location: `apps/backend/core/client.py` (threadsafe cache)
  - No Redis or external cache

## Authentication & Identity

**Auth Provider:**
- **Claude Code OAuth** - Authentication for Claude SDK
  - Implementation: OAuth token flow via `claude setup-token`
  - Token storage: Environment variable `CLAUDE_CODE_OAUTH_TOKEN`
  - Location: `apps/backend/core/auth.py`

**No User Authentication:**
- Desktop app runs as single-user application
- No login/logout flow
- No session management

## Monitoring & Observability

**Error Tracking:**
- **Sentry** - Error and performance monitoring
  - DSN: `SENTRY_DSN` env var
  - Release tracking: Git commit SHA via `SENTRY_RELEASE`
  - Location: `apps/backend/core/sentry.py`, `apps/frontend/src/main/sentry.ts`

**Analytics:**
- None currently implemented

**Logs:**
- **Local Logging** - File-based and console logging
  - Backend: `apps/backend/core/debug.py`, `apps/backend/task_logger/`
  - Frontend: `apps/frontend/src/main/services/app-logger.ts`
  - Retention: Local files only (no cloud aggregation)

## CI/CD & Deployment

**Hosting:**
- **GitHub Releases** - Desktop app distribution
  - Deployment: Automatic on tag push (GitHub Actions)
  - Artifacts: DMG (macOS), AppImage/deb (Linux), EXE (Windows)

**CI Pipeline:**
- **GitHub Actions** - Tests and builds
  - Workflows: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
  - Multi-platform: ubuntu-latest, windows-latest, macos-latest
  - Secrets: None needed for public builds

## Environment Configuration

**Development:**
- Required env vars:
  - `CLAUDE_CODE_OAUTH_TOKEN` - Claude SDK auth
  - `ANTHROPIC_API_KEY` - Direct API access
  - `GRAPHITI_ENABLED=true` - Enable memory system
- Optional env vars:
  - `LINEAR_API_KEY` - Linear integration
  - `SENTRY_DSN` - Error tracking
  - `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` - Graphiti providers
- Secrets location: `.env` files (gitignored), documented in `.env.example`

**Production:**
- Same environment variables as development
- Distributed as desktop app (no server deployment)
- User manages their own API keys

## Webhooks & Callbacks

**Incoming:**
- None (desktop application, no server endpoints)

**Outgoing:**
- None currently implemented

---

*Integration audit: 2026-01-20*
*Update when adding/removing external services*
