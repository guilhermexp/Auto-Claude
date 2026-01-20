# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- Python 3.12+ - Backend CLI and agent logic (`apps/backend/`)
- TypeScript 5.9.3 - Frontend Electron desktop app (`apps/frontend/`)

**Secondary:**
- JavaScript - Build scripts, configuration files
- Markdown - Documentation, prompts, specs

## Runtime

**Environment:**
- Python 3.12+ (backend) - Required for agent SDK and async operations
- Node.js 24.0.0+ (frontend) - Electron runtime
- Electron 39.2.7 - Desktop application framework

**Package Manager:**
- Backend: uv (Python package manager)
  - Lockfile: `requirements.txt` with pinned versions
- Frontend: npm
  - Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- **Backend:** None (vanilla Python CLI with asyncio)
  - claude-agent-sdk - AI agent orchestration
  - real_ladybug - Embedded graph database
- **Frontend:** Electron 39.2.7 - Desktop UI framework
  - React 19.2.3 - UI library
  - Vite 7.2.7 - Build tool and dev server

**Testing:**
- Backend: pytest - Unit and integration tests
- Frontend: Vitest 4.0.16 - Unit tests
- Frontend: Playwright - E2E tests (configured in `e2e/`)

**Build/Dev:**
- Frontend: Vite 7.2.7 - Bundling and HMR
- Frontend: TypeScript 5.9.3 - Type checking and compilation
- Frontend: Biome 2.3.11 - Linting (replaces ESLint)
- Backend: ruff 0.14.10 - Python linting and formatting

## Key Dependencies

**Critical (Backend):**
- **claude-agent-sdk** >=0.1.19 - Core AI agent SDK for all LLM interactions
  - Location: `apps/backend/core/client.py` (client factory)
- **graphiti-core** >=0.5.0 - Graph-based memory system with semantic search
  - Location: `apps/backend/integrations/graphiti/`
- **real_ladybug** >=0.13.0 - Embedded graph database (no Docker required)
  - Used by Graphiti for memory persistence

**Critical (Frontend):**
- **@anthropic-ai/sdk** ^0.71.2 - Direct Anthropic API access (CLI integration)
- **zustand** 5.0.9 - State management
- **react-i18next** 16.5.0 - Internationalization
- **xterm** 6.0.0 - Terminal emulator for PTY sessions

**Infrastructure (Backend):**
- **aiofiles** - Async file I/O
- **pydantic** - Data validation and settings
- **rich** - Terminal UI and formatting

**Infrastructure (Frontend):**
- **node-pty** 1.1.0-beta14 - PTY (pseudo-terminal) management
- **electron-updater** 6.6.2 - Auto-updates

**UI Components (Frontend):**
- **@radix-ui/react-*** - 14+ Radix UI primitives (accessible components)
- **lucide-react** 0.469.0 - Icon library
- **tailwindcss** 4.1.17 - CSS framework

## Configuration

**Environment:**
- Backend: `.env` file with environment variables
  - Critical vars: `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `GRAPHITI_ENABLED`
  - Example: `apps/backend/.env.example`
- Frontend: `.env` file with environment variables
  - Example: `apps/frontend/.env.example`

**Build:**
- Backend: `requirements.txt` - Python dependencies
- Frontend:
  - `electron.vite.config.ts` - Electron-Vite configuration
  - `vite.config.ts` - Vite renderer configuration
  - `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json` - TypeScript configs
  - `biome.jsonc` - Linting configuration
  - `tailwind.config.ts` - Tailwind CSS configuration

## Platform Requirements

**Development:**
- macOS/Linux/Windows (cross-platform)
- Python 3.12+ installation required
- Node.js 24+ installation required
- Git for version control

**Production:**
- Desktop application distributed via:
  - DMG for macOS
  - AppImage/deb for Linux
  - EXE installer for Windows
- GitHub Actions CI/CD for automated builds
- Electron auto-updater for seamless updates

---

*Stack analysis: 2026-01-20*
*Update after major dependency changes*
