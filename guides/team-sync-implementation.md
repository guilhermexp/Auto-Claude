# Team Sync — Implementation Document

> Real-time team synchronization for Auto Claude using **Convex** (cloud database + WebSocket subscriptions) and **Better Auth** (email/password authentication).

**Status:** Feature-complete (backend + frontend wiring). Pending: handler hooks for immediate push, E2E testing.
**Branch:** `develop`
**Date:** 2026-02-19

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Convex Backend](#convex-backend)
3. [Electron Main Process](#electron-main-process)
4. [IPC Bridge & Preload](#ipc-bridge--preload)
5. [Renderer (React UI)](#renderer-react-ui)
6. [Internationalization (i18n)](#internationalization-i18n)
7. [Configuration & Settings](#configuration--settings)
8. [Authentication Flow](#authentication-flow)
9. [Sync Flow](#sync-flow)
10. [Conflict Resolution](#conflict-resolution)
11. [File Inventory](#file-inventory)
12. [Bugs Found & Fixed](#bugs-found--fixed)
13. [Pending Work](#pending-work)
14. [Testing](#testing)
15. [Deployment](#deployment)

---

## Architecture Overview

```
Machine A (Electron)                     Convex Cloud                     Machine B (Electron)
+-------------------+                 +------------------+               +-------------------+
| Main Process      |   WebSocket     |  Convex DB       |  WebSocket    | Main Process      |
|  TeamSyncService  | <=============> |  + Better Auth   | <==========> |  TeamSyncService  |
|  - ConvexClient   |   (ws polyfill) |  Component       |              |  - ConvexClient   |
|  - File Watcher   |                 |                  |              |  - File Watcher   |
|  - Sync Engine    |   HTTP Actions  |  Auth endpoints: |              |  - Sync Engine    |
|  - Credential     | --------------> |  /auth/signup    |              |  - Credential     |
|    Utils (Keychain)|                |  /auth/signin    |              |    Utils (Keychain)|
+-------------------+                 +------------------+              +-------------------+
        |  IPC                                                                 |  IPC
        v                                                                      v
+-------------------+                                                  +-------------------+
| Renderer (React)  |                                                  | Renderer (React)  |
|  - team-sync-store|                                                  |  - team-sync-store|
|  - Auth Modal     |                                                  |  - Auth Modal     |
|  - Settings UI    |                                                  |  - Settings UI    |
+-------------------+                                                  +-------------------+
```

**Key design decisions:**
- **Convex WebSocket** for real-time subscriptions (tasks, insights, roadmap, ideation)
- **Better Auth** via HTTP Actions for email/password auth (no OAuth complexity)
- **LWW (Last-Writer-Wins)** conflict resolution via `updatedAt` timestamps
- **File watcher** (chokidar) for detecting local changes and pushing to Convex
- **Subscription callbacks** for pulling remote changes and writing to local disk
- **Keychain** (macOS) / Credential Manager (Windows) for secure token storage
- **Feature flag** (`teamSyncEnabled`) for progressive rollout

---

## Convex Backend

**Project:** `greedy-mallard-968`
**Cloud URL:** `https://greedy-mallard-968.convex.cloud`
**HTTP Actions URL:** `https://greedy-mallard-968.convex.site`

### Schema (`convex/schema.ts`)

9 application tables with full indexing:

| Table | Fields | Indexes |
|-------|--------|---------|
| `teams` | name, ownerId, inviteCode, createdAt | by_invite_code, by_owner |
| `team_members` | teamId, userId, role, status, joinedAt | by_team, by_user, by_team_user |
| `projects` | teamId, projectName, projectHash, settings, updatedAt, updatedBy | by_team, by_team_hash |
| `tasks` | projectId, specId, title, description, status, reviewReason, xstateState, executionPhase, metadata, executionProgress, specContent, implementationPlan, qaReport, updatedAt, updatedBy, isDeleted | by_project, by_project_spec |
| `task_logs` | taskId, specId, phases, updatedAt | by_task |
| `insights_sessions` | projectId, sessionId, title, messages, pendingAction, modelConfig, updatedAt, updatedBy | by_project, by_project_session |
| `roadmap` | projectId, features, updatedAt, updatedBy | by_project |
| `ideation` | projectId, ideas, config, updatedAt, updatedBy | by_project |
| `sync_events` | teamId, userId, deviceId, resource, resourceId, action, timestamp | by_team_time |

**Better Auth component tables** (managed by `@convex-dev/better-auth`):
- `user` — name, email, emailVerified, image, createdAt, updatedAt
- `session` — token, userId, expiresAt, ipAddress, userAgent
- `account` — accountId, providerId, userId, password, accessToken, refreshToken
- `verification` — identifier, value, expiresAt

### Functions

**`convex/helpers.ts`** — Auth guards used by all protected functions:
- `requireAuthUserId(ctx)` — validates session via Better Auth, returns user ID or throws
- `getOptionalAuthUser(ctx)` — returns user or null
- `requireTeamMembership(ctx, teamId, allowedRoles?)` — checks active membership + role
- `requireProjectAccess(ctx, projectId)` — checks team membership via project's teamId

**`convex/teams.ts`** — Team CRUD:
- `createTeam(name)` — creates team + owner member record, generates 8-char invite code
- `joinTeam(inviteCode)` — adds member (or reactivates if previously removed)
- `getMyTeams()` — returns all teams with role, memberCount, inviteCode (owner only)
- `getTeamMembers(teamId)` — returns active members (requires membership)
- `removeMember(teamId, memberId)` — soft remove (owner/admin only, can't remove owner)
- `generateInviteCode(teamId)` — regenerates invite code (owner/admin only)

**`convex/projects.ts`** — Project management:
- `upsertProject(teamId, projectName, projectHash, settings?)` — create or update by team+hash
- `getTeamProjects(teamId)` — list all team projects

**`convex/tasks.ts`** — Task sync with LWW:
- `upsertTask(projectId, specId, ...)` — create or update with LWW (skips if incoming `updatedAt <= existing.updatedAt`)
- `deleteTask(projectId, specId)` — soft delete (sets `isDeleted: true`)
- `getProjectTasks(projectId)` — returns non-deleted tasks (subscription-friendly)
- `upsertTaskLogs(taskId, specId, phases, updatedAt)` — create or update logs
- `getTaskLogs(taskId)` — returns logs for a task

**`convex/insights.ts`** — Insights session sync:
- `upsertSession(projectId, sessionId, ...)` — create or update with LWW
- `getSessions(projectId)` — list all sessions

**`convex/roadmap.ts`** — Roadmap sync:
- `upsertRoadmap(projectId, features, updatedAt)` — create or update with LWW
- `getRoadmap(projectId)` — returns single roadmap doc

**`convex/ideation.ts`** — Ideation sync:
- `upsertIdeation(projectId, ideas, config?, updatedAt)` — create or update with LWW
- `getIdeation(projectId)` — returns single ideation doc

### Better Auth Configuration

**`convex/convex.config.ts`:**
```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
const app = defineApp();
app.use(betterAuth);
export default app;
```

**`convex/auth.config.ts`:**
```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
export default { providers: [getAuthConfigProvider()] } satisfies AuthConfig;
```

**`convex/auth.ts`:**
```typescript
import { createClient } from "@convex-dev/better-auth";
import { components } from "./_generated/api";
export const betterAuthClient = createClient(components.betterAuth, { verbose: false });
```

**`convex/betterAuth/auth.ts`:**
```typescript
export const createAuth = (ctx: Ctx) => betterAuth({
  database: betterAuthClient.adapter(ctx),
  baseURL: process.env.CONVEX_SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  session: { expiresIn: 30 * 24 * 60 * 60 }, // 30 days
  plugins: [convex({ authConfig })],
});
```

**`convex/http.ts`:**
```typescript
const http = httpRouter();
betterAuthClient.registerRoutes(http, createAuth, { cors: true });
export default http;
```

**Environment variable:** `BETTER_AUTH_SECRET` must be set in Convex dashboard.

---

## Electron Main Process

### ConvexClient (`apps/frontend/src/main/team-sync/convex-client.ts`)

Real Convex client for Node.js (Electron main process):

- **WebSocket polyfill** — `ws` package polyfilled into `globalThis.WebSocket` for Node.js
- **ConvexClient** (WebSocket) — used for subscriptions and mutations
- **ConvexHttpClient** — used for one-shot queries
- **Auth token management** — `setAuthToken(token)` propagates to both clients
- **`authRequest(path, body, method)`** — direct HTTP calls to Better Auth endpoints
- **`subscribe(name, args, callback)`** — returns unsubscribe function
- **`query(name, args)`** / **`mutation(name, args)`** — one-shot operations
- **`buildFunctionRef(name)`** — converts "module:function" strings to Convex `anyApi` references

Hardcoded URLs:
```typescript
const CONVEX_URL = "https://greedy-mallard-968.convex.cloud";
const CONVEX_SITE_URL = "https://greedy-mallard-968.convex.site";
```

### TeamSyncService (`apps/frontend/src/main/team-sync/team-sync-service.ts`)

Central orchestration service (~1100 lines). Extends `EventEmitter`.

**Initialization:**
1. Reads credentials from Keychain
2. If session token exists, validates via `GET /api/auth/get-session`
3. If valid, connects ConvexClient and restores teams list
4. If invalid, clears credentials

**Authentication:**
- `signup(email, name, password)` — POST to `/api/auth/sign-up/email`, stores token in Keychain
- `signin(email, password)` — POST to `/api/auth/sign-in/email`, stores token in Keychain
- `signout()` — POST to `/api/auth/sign-out`, clears Keychain + disconnects

**Team management:**
- `createTeam(name)` — Convex mutation, auto-selects as active team
- `joinTeam(inviteCode)` — Convex mutation, refreshes teams
- `getMyTeams()` — Convex query with caching
- `getTeamMembers(teamId)` — Convex query
- `removeMember(teamId, memberId)` — Convex mutation
- `generateInviteCode(teamId)` — Convex mutation

**Sync lifecycle:**
- `enableSync(projectId, projectPath)` — resolves project identity (git remote → hash), upserts project in Convex, starts file watcher, creates 4 subscriptions (tasks, insights, roadmap, ideation)
- `disableSync(projectId)` — unsubscribes all, stops watcher
- `forcePush(projectId)` — reads all local files and pushes to Convex
- `forcePull(projectId)` — queries all Convex data and writes to local disk

**Project identity resolution:**
- Reads git remote URL from the project directory
- Canonicalizes (ssh → https, removes `.git` suffix)
- Extracts repo slug (e.g., `guilhermexp/Auto-Claude`)
- Hashes to a stable short identifier for cross-machine matching

**Local → Remote (push):**
1. File watcher detects change in `.auto-claude/` directory
2. `handleLocalFileChange(event)` increments revision in sync engine
3. `pushFileChange(sync, event)` reads file, parses based on resource type:
   - Tasks: extracts specId from path, pushes metadata/spec/plan/qa_report
   - Roadmap/Ideation: parses JSON, pushes features/ideas
   - Insights: extracts sessionId, pushes session data

**Remote → Local (pull):**
1. Convex subscription fires callback with updated data
2. `handleRemoteTasksUpdate/InsightsUpdate/RoadmapUpdate/IdeationUpdate` checks revision engine
3. If remote is newer (shouldApplyRemote), writes file to disk via `writeRemoteFile`
4. File watcher ignores this write (via `markRemoteWrite`)

**Direct push methods** (for handler hooks):
- `pushTaskUpdate(projectId, specId, data)` — immediate task push
- `pushInsightsSession(projectId, session)` — immediate insights push
- `pushProjectSettings(projectId, settings)` — immediate settings push
- `isSyncEnabled(projectId)` — check if project is being synced

### File Watcher (`apps/frontend/src/main/team-sync/file-watcher.ts`)

Chokidar-based file watcher with 8 patterns:
- `.auto-claude/specs/**/*.md`
- `.auto-claude/specs/**/*.json`
- `.auto-claude/roadmap/**/*.json`
- `.auto-claude/ideation/**/*.json`
- `.auto-claude/insights/sessions/**/*.json`
- And corresponding glob patterns

Features:
- **Debounce** — 500ms to coalesce rapid changes
- **Remote write exclusion** — `markRemoteWrite(path)` prevents echo loops
- **Resource classification** — maps file paths to resource types (tasks, roadmap, ideation, insights)

### Sync Engine (`apps/frontend/src/main/team-sync/sync-engine.ts`)

Revision tracking for LWW conflict resolution:
- `get(key)` / `set(key, revision)` — read/write revision state
- `shouldApplyRemote(key, incoming)` — returns true if incoming revision is newer
- Key = `{ projectId, resource, resourceId }`
- Revision = `{ revision: number, serverUpdatedAt: number, updatedBy: string }`

### Credential Utils (`apps/frontend/src/main/team-sync/credential-utils.ts`)

Cross-platform secure credential storage:
- **macOS** — Keychain via `security` CLI
- **Windows** — Credential Manager (fallback to file)
- **Linux** — libsecret (fallback to file)

Stores: `{ email, sessionToken, activeTeamId, deviceId }`

Device ID: generated once, persisted in Keychain. Used to identify which machine made a change.

---

## IPC Bridge & Preload

### IPC Channels (`apps/frontend/src/shared/constants/ipc.ts`)

15 channels defined:

```
TEAM_SYNC_SIGNUP          TEAM_SYNC_SIGNIN         TEAM_SYNC_SIGNOUT
TEAM_SYNC_STATUS          TEAM_SYNC_CREATE_TEAM    TEAM_SYNC_JOIN_TEAM
TEAM_SYNC_GET_TEAMS       TEAM_SYNC_GET_MEMBERS    TEAM_SYNC_REMOVE_MEMBER
TEAM_SYNC_GENERATE_INVITE TEAM_SYNC_ENABLE         TEAM_SYNC_DISABLE
TEAM_SYNC_FORCE_PUSH      TEAM_SYNC_FORCE_PULL     TEAM_SYNC_UPDATE (event)
```

### IPC Handlers (`apps/frontend/src/main/ipc-handlers/team-sync-handlers.ts`)

14 `ipcMain.handle()` registrations. Key pattern:

```typescript
function requireService() {
  const svc = getTeamSyncService();
  if (!svc) throw new Error('Team Sync service not initialized');
  return svc;
}

// Handlers always register (no early return)
// Service resolved lazily inside each handler
// TEAM_SYNC_STATUS returns safe default when service is null
// Event forwarding wired via tryWireEvents()
```

### Preload API (`apps/frontend/src/preload/api/modules/team-sync-api.ts`)

14 methods exposed to renderer:
```typescript
teamSync: {
  signup(email, name, password) → IPCResult
  signin(email, password) → IPCResult
  signout() → IPCResult
  getStatus() → IPCResult<TeamSyncStatus>
  createTeam(name) → IPCResult<TeamSyncTeam>
  joinTeam(inviteCode) → IPCResult
  getTeams() → IPCResult<TeamSyncTeam[]>
  getMembers(teamId) → IPCResult<TeamSyncMember[]>
  removeMember(teamId, memberId) → IPCResult
  generateInviteCode(teamId) → IPCResult<string>
  enable(projectId, projectPath) → IPCResult
  disable(projectId) → IPCResult
  forcePush(projectId) → IPCResult
  forcePull(projectId) → IPCResult
  onUpdate(callback) → cleanup function
}
```

### Types (`apps/frontend/src/shared/types/team-sync.ts`)

10 types:
- `TeamSyncStatus` — connected, authenticated, mode, user, activeTeam, syncedProjects, pendingChanges, lastSyncAt
- `TeamSyncTeam` — id, name, role, memberCount, inviteCode, createdAt
- `TeamSyncMember` — id, userId, email, name, role, status, joinedAt
- `TeamSyncUser` — id, email, name
- `TeamSyncUpdate` — type, message, projectId, timestamp
- `TeamSyncMode` — 'disabled' | 'idle' | 'syncing' | 'error'
- `ProjectIdentity` — remoteUrlCanonical, repoSlug, defaultBranch, bindingMode
- `SyncResource` — 'tasks' | 'roadmap' | 'ideation' | 'insights'
- `RevisionInfo` — revision, serverUpdatedAt, updatedBy
- `RevisionKey` — projectId, resource, resourceId

---

## Renderer (React UI)

### Zustand Store (`apps/frontend/src/renderer/stores/team-sync-store.ts`)

State:
```typescript
{
  status: TeamSyncStatus      // connection + auth state
  teams: TeamSyncTeam[]       // known teams
  members: TeamSyncMember[]   // active team members
  updates: TeamSyncUpdate[]   // recent sync events (max 150)
  isLoading: boolean
  error: string | null
  initialized: boolean
}
```

Actions: `initialize`, `fetchStatus`, `signup`, `signin`, `signout`, `createTeam`, `joinTeam`, `fetchTeams`, `fetchMembers`, `enableSync`, `disableSync`, `forcePush`, `forcePull`

All actions call `window.electronAPI.teamSync.*` and update store state.

### TeamSyncButton (`apps/frontend/src/renderer/components/TeamSyncButton.tsx`)

Header bar button with conditional behavior:
- **Not authenticated** → opens `TeamSyncAuthModal`
- **Authenticated** → dispatches `open-app-settings` event with `team-sync` section
- Shows pending changes badge when syncing
- Hidden when `teamSyncEnabled` is false

### TeamSyncAuthModal (`apps/frontend/src/renderer/components/TeamSyncAuthModal.tsx`)

Dialog component for authentication:
- **Sign In mode** — email + password
- **Sign Up mode** — name + email + password
- Toggle between modes via link at bottom
- Enter key submits the form
- Shows inline error messages
- Closes automatically on success
- Uses Radix UI Dialog via project's `ui/dialog` component

### TeamSyncSettings (`apps/frontend/src/renderer/components/settings/TeamSyncSettings.tsx`)

Settings panel with 3 states:

1. **Feature disabled** — toggle + message
2. **Not authenticated** — icon + "Sign in to continue" + button that opens auth modal
3. **Authenticated** — full management UI:
   - Account info (avatar, name, email) + sign out button
   - Connection status badges (connected/disconnected, mode, pending)
   - Create team / Join team with invite code
   - Sync controls (enable, disable, force push, force pull) for current project
   - Teams list + Members list
   - Recent sync events log

### Integration Points

- `ProjectTabBar.tsx` — renders `<TeamSyncButton />` in the header
- `AppSettings.tsx` — adds "team-sync" section in settings navigation
- `browser-mock.ts` — complete mock for `window.electronAPI.teamSync` (testing)

---

## Internationalization (i18n)

Namespace: `team`

Files:
- `apps/frontend/src/shared/i18n/locales/en/team.json` (English)
- `apps/frontend/src/shared/i18n/locales/fr/team.json` (French)
- `apps/frontend/src/shared/i18n/locales/pt/team.json` (Portuguese)

Registered in `apps/frontend/src/shared/i18n/index.ts` — imported, added to resources for all 3 locales, added to `ns` array.

Key groups:
| Group | Keys |
|-------|------|
| `team:settings.*` | title, description, featureFlag, featureFlagDescription, disabledMessage, signInRequired |
| `team:auth.*` | email, password, name, signIn, signOut, signUp, noAccount, hasAccount |
| `team:status.*` | connected, disconnected, authenticated, guest, team, projectsSynced, pending, connectedToTeam |
| `team:manage.*` | createTeam, teamName, create, joinTeam, join, teams, noTeams, members, noMembers |
| `team:sync.*` | currentProject, selectProject, enableSync, disableSync, forcePush, forcePull |
| `team:events.*` | title, noEvents |

Also added to `en/settings.json`, `fr/settings.json`, `pt/settings.json`:
- `settings:sections.teamSync` — navigation title
- `settings:sections.teamSyncDescription` — navigation description

---

## Configuration & Settings

### App Settings

```typescript
// shared/types/settings.ts
interface AppSettings {
  // ... existing fields ...
  teamSyncEnabled?: boolean;  // NEW
}
```

```typescript
// shared/constants/config.ts
const DEFAULT_SETTINGS: AppSettings = {
  // ... existing defaults ...
  teamSyncEnabled: false,  // NEW — feature flag off by default
};
```

### Package Dependencies

**`apps/frontend/package.json`:**
```json
{
  "dependencies": {
    "convex": "^1.27.0",
    "better-auth": "^1.2.0",
    "@convex-dev/better-auth": "^0.10.10",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.18.0"
  }
}
```

**Root `package.json`:**
```json
{
  "dependencies": {
    "convex": "^1.27.0"  // Required for `npx convex deploy` from repo root
  }
}
```

**`convex.json`** (repo root):
```json
{ "functions": "convex/" }
```

### Main Process Lifecycle (`apps/frontend/src/main/index.ts`)

```typescript
// On app ready:
const teamSync = initializeTeamSyncService();
await teamSync.initialize();

// On app quit:
await getTeamSyncService()?.shutdown();
```

---

## Authentication Flow

```
User clicks TeamSyncButton
        │
        ▼
  isAuthenticated? ──── YES ──→ Open Settings (team management)
        │
        NO
        │
        ▼
  Show TeamSyncAuthModal
        │
        ├── Sign In ──→ POST /api/auth/sign-in/email
        │                    │
        │                    ├── Success: token + user → handleAuthSuccess()
        │                    │     ├── Save token to Keychain
        │                    │     ├── Set auth on ConvexClient
        │                    │     ├── Connect WebSocket
        │                    │     ├── Refresh teams list
        │                    │     └── Close modal
        │                    │
        │                    └── Failure: show error inline
        │
        └── Sign Up ──→ POST /api/auth/sign-up/email
                             │
                             └── Same flow as Sign In
```

**Session restore on app startup:**
1. Read token from Keychain
2. `GET /api/auth/get-session` with Bearer token
3. If valid → auto-connect, restore teams
4. If invalid → clear credentials, show as not authenticated

---

## Sync Flow

### Enable Sync

```
enableSync(projectId, projectPath)
        │
        ▼
  Resolve project identity (git remote → slug → hash)
        │
        ▼
  Upsert project in Convex (teams:upsertProject)
        │
        ▼
  Start file watcher (chokidar, 8 patterns, 500ms debounce)
        │
        ▼
  Create 4 Convex subscriptions:
    ├── tasks:getProjectTasks → handleRemoteTasksUpdate
    ├── insights:getSessions → handleRemoteInsightsUpdate
    ├── roadmap:getRoadmap → handleRemoteRoadmapUpdate
    └── ideation:getIdeation → handleRemoteIdeationUpdate
```

### Local Change → Push

```
File changed in .auto-claude/
        │
        ▼
  File watcher fires (debounced 500ms)
        │
        ▼
  Is this a remote write? (markRemoteWrite) ── YES ──→ Skip
        │
        NO
        │
        ▼
  Classify resource type (tasks/roadmap/ideation/insights)
        │
        ▼
  Increment local revision in sync engine
        │
        ▼
  Read file, parse content
        │
        ▼
  Push to Convex mutation (e.g., tasks:upsertTask)
```

### Remote Change → Pull

```
Convex subscription fires (WebSocket)
        │
        ▼
  shouldApplyRemote(key, incomingRevision)?
        │
        ├── NO (local is newer) ──→ Skip
        │
        └── YES
              │
              ▼
        markRemoteWrite(filePath)  // prevent echo loop
              │
              ▼
        Write file to disk
              │
              ▼
        Update revision in sync engine
```

---

## Conflict Resolution

**Strategy: Last-Writer-Wins (LWW)**

Every synced resource carries an `updatedAt` timestamp (milliseconds since epoch).

**Server-side (Convex mutations):**
```typescript
// In upsertTask:
if (args.updatedAt <= existing.updatedAt) {
  return existing._id;  // Skip — existing is newer or equal
}
// Apply update
```

**Client-side (sync engine):**
```typescript
shouldApplyRemote(key, incoming): boolean {
  const local = this.get(key);
  if (!local) return true;  // No local state, always apply
  return incoming.revision > local.revision;
}
```

**Edge cases:**
- Simultaneous edits: the one with the later timestamp wins
- Offline edits: pushed on reconnect with local timestamp
- Deleted tasks: soft delete (`isDeleted: true`), filtered in queries

---

## File Inventory

### New Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `convex/schema.ts` | 109 | Convex database schema (9 tables, 15 indexes) |
| `convex/convex.config.ts` | 7 | App config mounting Better Auth component |
| `convex/auth.config.ts` | 6 | Auth config with Better Auth provider |
| `convex/auth.ts` | 14 | Better Auth client creation |
| `convex/betterAuth/auth.ts` | 32 | Better Auth instance configuration |
| `convex/betterAuth/convex.config.ts` | 7 | Component config re-export |
| `convex/helpers.ts` | 63 | Auth guard helpers |
| `convex/teams.ts` | 172 | Team CRUD mutations/queries |
| `convex/projects.ts` | 58 | Project upsert/query |
| `convex/tasks.ts` | 171 | Task CRUD with LWW + task logs |
| `convex/insights.ts` | 65 | Insights session sync |
| `convex/roadmap.ts` | 52 | Roadmap sync |
| `convex/ideation.ts` | 55 | Ideation sync |
| `convex/http.ts` | 17 | HTTP router with Better Auth routes |
| `convex/tsconfig.json` | — | TypeScript config for convex directory |
| `convex.json` | 3 | Convex project config |
| `apps/frontend/src/main/team-sync/team-sync-service.ts` | 1099 | Main sync service |
| `apps/frontend/src/main/team-sync/convex-client.ts` | 190 | Convex client wrapper |
| `apps/frontend/src/main/team-sync/file-watcher.ts` | ~150 | Chokidar file watcher |
| `apps/frontend/src/main/team-sync/sync-engine.ts` | ~80 | Revision tracking engine |
| `apps/frontend/src/main/team-sync/credential-utils.ts` | ~120 | Keychain credential storage |
| `apps/frontend/src/main/ipc-handlers/team-sync-handlers.ts` | 177 | IPC handler registration |
| `apps/frontend/src/preload/api/modules/team-sync-api.ts` | ~100 | Preload API bridge |
| `apps/frontend/src/renderer/stores/team-sync-store.ts` | 189 | Zustand state store |
| `apps/frontend/src/renderer/components/TeamSyncButton.tsx` | 69 | Header button |
| `apps/frontend/src/renderer/components/TeamSyncAuthModal.tsx` | 124 | Login/signup dialog |
| `apps/frontend/src/renderer/components/settings/TeamSyncSettings.tsx` | 230 | Settings panel |
| `apps/frontend/src/shared/types/team-sync.ts` | ~80 | Type definitions |
| `apps/frontend/src/shared/i18n/locales/en/team.json` | 53 | English translations |
| `apps/frontend/src/shared/i18n/locales/fr/team.json` | 53 | French translations |
| `apps/frontend/src/shared/i18n/locales/pt/team.json` | 53 | Portuguese translations |

### Modified Files

| File | Change |
|------|--------|
| `apps/frontend/package.json` | Added convex, better-auth, @convex-dev/better-auth, ws, @types/ws |
| `package.json` (root) | Added convex dependency (for deploy) |
| `apps/frontend/src/main/index.ts` | Added TeamSyncService init/shutdown lifecycle |
| `apps/frontend/src/main/ipc-handlers/index.ts` | Import + register team-sync-handlers |
| `apps/frontend/src/preload/api/index.ts` | Expose teamSync API |
| `apps/frontend/src/renderer/lib/browser-mock.ts` | Added teamSync mock |
| `apps/frontend/src/renderer/components/ProjectTabBar.tsx` | Added TeamSyncButton |
| `apps/frontend/src/renderer/components/settings/AppSettings.tsx` | Added team-sync section |
| `apps/frontend/src/shared/constants/ipc.ts` | Added 15 IPC channels |
| `apps/frontend/src/shared/constants/config.ts` | Added teamSyncEnabled default |
| `apps/frontend/src/shared/types/index.ts` | Re-export team-sync types |
| `apps/frontend/src/shared/types/ipc.ts` | Added teamSync to ElectronAPI |
| `apps/frontend/src/shared/types/settings.ts` | Added teamSyncEnabled field |
| `apps/frontend/src/shared/i18n/index.ts` | Registered team namespace |
| `apps/frontend/src/shared/i18n/locales/en/settings.json` | Added teamSync nav keys |
| `apps/frontend/src/shared/i18n/locales/fr/settings.json` | Added teamSync nav keys |
| `apps/frontend/src/shared/i18n/locales/pt/settings.json` | Added teamSync nav keys |

---

## Bugs Found & Fixed

### 1. App Stuck — IPC Handlers Not Registering

**Symptom:** `[TeamSync] Service not initialized, skipping handler registration` → `Error occurred in handler for 'team-sync:status'`

**Cause:** `team-sync-handlers.ts` had an early `return` guard when `getTeamSyncService()` returned `null`. This prevented ALL handlers from registering, so renderer calls to any team-sync IPC channel threw "handler not found" errors.

**Fix:** Rewrote to always register handlers. Service is resolved lazily inside each handler via `requireService()`. `TEAM_SYNC_STATUS` returns a safe default when service is null.

### 2. Duplicate .js Files in convex/ Directory

**Symptom:** `npx convex deploy` failed with "Two output files share the same path" for every module (teams.js, auth.js, etc.)

**Cause:** The `convex/` directory contained both `.ts` sources and stale `.js` compiled artifacts. Convex's esbuild tried to bundle both, producing duplicate outputs.

**Fix:** Deleted all `.js` files from `convex/` and `convex/betterAuth/`, keeping only `.ts` sources.

### 3. Destructive Deploy from Wrong Directory

**Symptom:** Running `npx convex deploy` from `apps/frontend/` succeeded but deleted ALL indexes and unmounted the Better Auth component.

**Cause:** `apps/frontend/` doesn't have `convex.json` or the `convex/` directory. The CLI deployed an effectively empty project.

**Fix:** Always deploy from repo root where `convex.json` exists. Added `convex` to root `package.json` dependencies (required by CLI). Redeployed from root with `CONVEX_DEPLOYMENT=prod:greedy-mallard-968`.

### 4. Type Errors

| Error | Fix |
|-------|-----|
| `activeTeam: null` not assignable to `TeamSyncTeam \| undefined` | Changed to `undefined` |
| Missing `mode` property in default status | Added `mode: 'disabled'` |
| `FunctionReference<typeof type>` resolved to union instead of literal | Changed `buildFunctionRef` return type to `any` (uses `anyApi` untyped) |

### 5. No Login Component on Button Click

**Symptom:** User clicks TeamSyncButton → nothing visible happens (dispatches settings event but user expects login)

**Cause:** Button always dispatched `open-app-settings` event regardless of auth state. Settings page showed email/password fields mixed with everything else.

**Fix:** Created `TeamSyncAuthModal` dialog. Button now checks auth state: not authenticated → opens modal, authenticated → opens settings. Settings page is also auth-gated (shows "Sign in" prompt when not authenticated).

---

## Pending Work

### Phase 3: Handler Hooks (Immediate Push)

Currently sync relies on the file watcher (500ms debounce). For lower latency, add direct push hooks in existing IPC handlers:

| Handler | Hook |
|---------|------|
| `task-handlers.ts` — status change | `teamSync.pushTaskUpdate(projectId, specId, data)` |
| `insights-handlers.ts` — session save | `teamSync.pushInsightsSession(projectId, session)` |
| `project-handlers.ts` — settings change | `teamSync.pushProjectSettings(projectId, settings)` |
| `agent-events.ts` — agent completion/error | Trigger push via sync service |

Pattern:
```typescript
const teamSync = getTeamSyncService();
if (teamSync?.isSyncEnabled(projectId)) {
  teamSync.pushTaskUpdate(projectId, specId, updatedData).catch(console.error);
}
```

### Phase 4: Polish (Optional)

- `SyncStatusIndicator.tsx` — sidebar icon (green/yellow/red) showing sync health
- Better error handling for network disconnections and reconnection
- Pagination for large team member lists
- Invite link sharing UI

### Testing Checklist

- [ ] Signup via UI → verify user in Convex dashboard
- [ ] Signin → verify session token in Keychain
- [ ] Restart app → verify auto-reconnect (session restore)
- [ ] Create team → appears in teams list
- [ ] Generate invite code → share with Machine B
- [ ] Machine B joins team → both see member count update
- [ ] Enable sync on project → file watcher active
- [ ] Create task on Machine A → appears in Convex dashboard
- [ ] Machine B sees task via subscription → writes to local disk
- [ ] Edit task on Machine B → Machine A receives update
- [ ] Simultaneous edit → LWW resolves (newer timestamp wins)
- [ ] Force push → all local data uploaded
- [ ] Force pull → all remote data downloaded
- [ ] Sign out → clears Keychain, disconnects WebSocket

---

## Deployment

### Deploying Convex Backend

```bash
# From repo root (where convex.json lives)
CONVEX_DEPLOYMENT=prod:greedy-mallard-968 npx convex deploy --typecheck=disable -y
```

**Required:** `BETTER_AUTH_SECRET` environment variable must be set in Convex dashboard.

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `BETTER_AUTH_SECRET` | Convex dashboard | Secret for Better Auth session signing |
| `CONVEX_SITE_URL` | Auto-set by Convex | Used as baseURL for Better Auth |
| `TEAM_SYNC_CONVEX_URL` | Optional, Electron env | Override default Convex URL |

### Building the Desktop App

No additional build steps required. Team Sync dependencies are bundled by Electron's Vite/esbuild pipeline. The `ws` package provides WebSocket for Node.js (Electron main process).
