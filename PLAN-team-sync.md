# Team Sync — Plano de Implementacao

## Objetivo
Sincronizar em tempo real tasks, specs, roadmap, ideation, insights, settings de projeto e estado do Kanban entre maquinas de um time usando Convex como backend real-time. Autenticacao por email+senha com controle de acesso por email autorizado.

## Convex Project
- **URL:** `https://woozy-manatee-748.convex.cloud`
- **HTTP Actions URL:** `https://woozy-manatee-748.convex.site`

---

## Arquitetura Geral

```
Machine A (Electron)                     Convex Cloud                     Machine B (Electron)
+-------------------+                 +------------------+               +-------------------+
| Main Process      |   WebSocket     |                  |  WebSocket    | Main Process      |
|  TeamSyncService  | <=============> |  Real-time DB    | <==========> |  TeamSyncService  |
|  - File Watcher   |   push/pull     |  - Schema        |  push/pull   |  - File Watcher   |
|  - Sync Engine    |                 |  - Auth (HTTP)   |              |  - Sync Engine    |
|  - Convex Client  |                 |  - Mutations     |              |  - Convex Client  |
+-------------------+                 |  - Queries       |              +-------------------+
        |                             |  - Subscriptions |                      |
   IPC  |                             +------------------+                 IPC  |
        v                                                                      v
+-------------------+                                                  +-------------------+
| Renderer (React)  |                                                  | Renderer (React)  |
|  - Zustand store  |                                                  |  - Zustand store  |
|  - Team UI        |                                                  |  - Team UI        |
+-------------------+                                                  +-------------------+
```

### Decisoes Arquiteturais

1. **ConvexClient no Main Process** — Usa `ConvexClient` do `convex/browser` com `ws` polyfill. Main process ja tem acesso ao filesystem e gerencia todo o estado.

2. **Auth por HTTP Actions** — Signup/signin via Convex HTTP Actions (`/auth/signup`, `/auth/signin`). Retorna session token armazenado no OS Keychain.

3. **Sync bidirecional** — Push (local file change → Convex mutation) + Pull (Convex subscription → write local file).

4. **Conflict Resolution: LWW** — Last Write Wins baseado em `updatedAt`. Task logs sao append-only.

5. **Sem .env/credentials no sync** — API keys, OAuth tokens, paths locais NUNCA sincronizados.

---

## Phase 1: Convex Backend Foundation

### 1.1 Setup e Dependencias

**Instalar no `apps/frontend/`:**
```bash
npm install convex bcryptjs ws
npm install -D @types/bcryptjs @types/ws
```

**Criar `convex.json` na raiz do projeto:**
```json
{
  "functions": "convex/",
  "node": { "externalPackages": ["bcryptjs"] }
}
```

**Adicionar `.env.local` na raiz:**
```
CONVEX_URL=https://woozy-manatee-748.convex.cloud
```

### 1.2 Schema (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Auth
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    deviceName: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // Teams
  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    inviteCode: v.string(),
    createdAt: v.number(),
  }).index("by_invite_code", ["inviteCode"]),

  team_members: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("removed")),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  // Sync Data
  projects: defineTable({
    teamId: v.id("teams"),
    projectName: v.string(),
    projectHash: v.string(), // Hash of the project path for matching
    settings: v.optional(v.any()), // ProjectSettings object
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_team", ["teamId"])
    .index("by_team_hash", ["teamId", "projectHash"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    specId: v.string(), // "001-feature-name"
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // TaskStatus
    reviewReason: v.optional(v.string()),
    xstateState: v.optional(v.string()),
    executionPhase: v.optional(v.string()),
    metadata: v.optional(v.any()), // task_metadata.json content
    executionProgress: v.optional(v.any()),
    specContent: v.optional(v.string()), // spec.md content
    implementationPlan: v.optional(v.any()), // implementation_plan.json
    qaReport: v.optional(v.string()), // qa_report.md content
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_project_spec", ["projectId", "specId"]),

  task_logs: defineTable({
    taskId: v.id("tasks"),
    specId: v.string(),
    phases: v.any(), // { planning, coding, validation } PhaseLog objects
    updatedAt: v.number(),
  }).index("by_task", ["taskId"]),

  insights_sessions: defineTable({
    projectId: v.id("projects"),
    sessionId: v.string(),
    title: v.optional(v.string()),
    messages: v.any(), // InsightsChatMessage[]
    pendingAction: v.optional(v.any()),
    modelConfig: v.optional(v.any()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_project_session", ["projectId", "sessionId"]),

  roadmap: defineTable({
    projectId: v.id("projects"),
    features: v.any(), // RoadmapFeature[]
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_project", ["projectId"]),

  ideation: defineTable({
    projectId: v.id("projects"),
    ideas: v.any(), // Idea[]
    config: v.optional(v.any()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_project", ["projectId"]),

  // Sync tracking
  sync_events: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    deviceId: v.string(),
    resource: v.string(), // "task", "insight", "roadmap", etc.
    resourceId: v.string(),
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    timestamp: v.number(),
  })
    .index("by_team_time", ["teamId", "timestamp"])
    .index("by_device", ["deviceId", "timestamp"]),
});
```

### 1.3 Auth HTTP Actions (`convex/auth.ts`)

Funcoes:
- `signup` — Cria usuario, hash da senha com bcryptjs, retorna session token
- `signin` — Verifica email+senha, cria session, retorna token
- `verifySession` — Valida session token, retorna userId
- `signout` — Remove session

### 1.4 Team Functions (`convex/teams.ts`)

Mutations:
- `createTeam(sessionToken, name)` — Cria team + owner member
- `generateInviteCode(sessionToken, teamId)` — Gera novo invite code
- `joinTeam(sessionToken, inviteCode)` — Adiciona membro via invite code
- `removeMember(sessionToken, teamId, memberId)` — Remove membro
- `updateMemberRole(sessionToken, teamId, memberId, role)` — Altera role

Queries:
- `getMyTeams(sessionToken)` — Lista teams do usuario
- `getTeamMembers(sessionToken, teamId)` — Lista membros
- `getTeam(sessionToken, teamId)` — Detalhes do team

### 1.5 Resource Sync Functions

Para cada recurso (tasks, insights, roadmap, ideation):

**Mutations:**
- `upsertTask(sessionToken, projectId, taskData)` — Cria/atualiza task
- `deleteTask(sessionToken, projectId, specId)` — Remove task
- `upsertInsightsSession(sessionToken, projectId, sessionData)`
- `upsertRoadmap(sessionToken, projectId, features)`
- `upsertIdeation(sessionToken, projectId, ideas)`
- `upsertProject(sessionToken, teamId, projectData)`
- `appendTaskLog(sessionToken, taskId, logEntry)` — Append-only

**Queries (com subscriptions):**
- `getProjectTasks(sessionToken, projectId)` — Todas tasks do projeto
- `getInsightsSessions(sessionToken, projectId)` — Todas sessions
- `getRoadmap(sessionToken, projectId)` — Roadmap do projeto
- `getIdeation(sessionToken, projectId)` — Ideation do projeto
- `getSyncEvents(sessionToken, teamId, since)` — Eventos desde timestamp

### 1.6 Helper: Auth validation (`convex/helpers.ts`)

Funcao interna `validateSession(ctx, sessionToken)` usada por todas mutations/queries para validar token e retornar `{ userId, teamIds }`.

---

## Phase 2: Team Sync Service (Main Process)

### 2.1 Convex Client Wrapper

**Arquivo:** `apps/frontend/src/main/team-sync/convex-client.ts`

```typescript
// Polyfill WebSocket for Node.js (Electron main process)
import WebSocket from "ws";
(globalThis as any).WebSocket = WebSocket;

import { ConvexClient } from "convex/browser";
```

Wrapper class:
- `connect(url)` — Conecta ao Convex cloud
- `setAuth(token)` — Seta session token via custom auth
- `subscribe(query, args, callback)` — Subscribe a query com callback
- `mutation(name, args)` — Executa mutation
- `disconnect()` — Desconecta limpo

### 2.2 Team Sync Service

**Arquivo:** `apps/frontend/src/main/team-sync/team-sync-service.ts`

```typescript
class TeamSyncService extends EventEmitter {
  private convexClient: ConvexClientWrapper;
  private fileWatcher: FileWatcher;
  private syncEngine: SyncEngine;
  private sessionToken: string | null;
  private userId: string | null;
  private activeTeamId: string | null;
  private deviceId: string; // UUID unico por maquina

  // Lifecycle
  async initialize(): Promise<void>  // Chamado no app startup
  async shutdown(): Promise<void>    // Chamado no app quit

  // Auth
  async signup(email: string, name: string, password: string): Promise<IPCResult>
  async signin(email: string, password: string): Promise<IPCResult>
  async signout(): Promise<void>
  async restoreSession(): Promise<boolean> // Tenta restaurar do keychain

  // Teams
  async createTeam(name: string): Promise<IPCResult<Team>>
  async joinTeam(inviteCode: string): Promise<IPCResult>
  async getMyTeams(): Promise<IPCResult<Team[]>>
  async getTeamMembers(teamId: string): Promise<IPCResult<TeamMember[]>>

  // Sync
  async enableSync(projectId: string, projectPath: string): Promise<void>
  async disableSync(projectId: string): Promise<void>
  async forcePush(projectId: string): Promise<void>  // Push tudo
  async forcePull(projectId: string): Promise<void>  // Pull tudo

  // Status
  getSyncStatus(): TeamSyncStatus
  isConnected(): boolean
}
```

### 2.3 File Watcher

**Arquivo:** `apps/frontend/src/main/team-sync/file-watcher.ts`

Usa `chokidar` (ja disponivel via Electron) ou `fs.watch` nativo para monitorar:
- `{project}/.auto-claude/specs/*/implementation_plan.json` — Task status
- `{project}/.auto-claude/specs/*/task_metadata.json` — Task metadata
- `{project}/.auto-claude/specs/*/spec.md` — Spec content
- `{project}/.auto-claude/specs/*/qa_report.md` — QA results
- `{project}/.auto-claude/specs/*/task_logs.json` — Logs
- `{project}/.auto-claude/insights/sessions/*.json` — Insights
- `{project}/.auto-claude/roadmap/roadmap.json` — Roadmap
- `{project}/.auto-claude/ideation/ideation.json` — Ideation

Debounce de 500ms para agrupar escritas rapidas. Ignora writes que vieram do proprio sync (flag `isRemoteWrite`).

### 2.4 Sync Engine

**Arquivo:** `apps/frontend/src/main/team-sync/sync-engine.ts`

```typescript
class SyncEngine {
  // Push: arquivo mudou localmente → envia para Convex
  async pushChange(resource: SyncResource, data: any): Promise<void>

  // Pull: Convex notificou mudanca → escreve no disco
  async pullChange(resource: SyncResource, data: any): Promise<void>

  // Full sync: push tudo OU pull tudo
  async fullPush(projectId: string): Promise<SyncResult>
  async fullPull(projectId: string): Promise<SyncResult>

  // Conflict: LWW baseado em updatedAt
  resolveConflict(local: any, remote: any): "local" | "remote"
}
```

**Tipos de SyncResource:**
```typescript
type SyncResource =
  | { type: "task"; specId: string; field: "status" | "metadata" | "spec" | "qa" | "plan" | "logs" }
  | { type: "insights"; sessionId: string }
  | { type: "roadmap" }
  | { type: "ideation" }
  | { type: "project_settings" }
```

### 2.5 Credential Storage

**Arquivo:** `apps/frontend/src/main/team-sync/credential-utils.ts`

Segue o mesmo padrao de `claude-profile/credential-utils.ts`:
- `storeTeamCredentials(credentials)` — Salva no OS Keychain
- `getTeamCredentials()` — Le do OS Keychain
- `deleteTeamCredentials()` — Remove do Keychain
- Cross-platform: macOS Keychain / Windows Credential Manager / Linux Secret Service

Credenciais armazenadas:
```typescript
interface TeamCredentials {
  email: string;
  sessionToken: string;
  activeTeamId?: string;
  deviceId: string;
}
```

### 2.6 Subscriptions Setup

Quando sync habilitado para um projeto, cria subscriptions:
```typescript
// Subscribe a mudancas de tasks do projeto
client.subscribe("tasks:getProjectTasks", { sessionToken, projectId }, (tasks) => {
  // Para cada task remota diferente da local → write to disk
  for (const task of tasks) {
    if (this.isNewerThanLocal(task)) {
      await this.syncEngine.pullChange({ type: "task", specId: task.specId }, task);
    }
  }
});

// Subscribe a roadmap, insights, ideation...
```

---

## Phase 3: IPC & Frontend Integration

### 3.1 IPC Channels

**Arquivo:** `apps/frontend/src/shared/constants/ipc.ts` — Adicionar:
```typescript
// Team Sync
TEAM_SYNC_SIGNUP: 'team-sync:signup',
TEAM_SYNC_SIGNIN: 'team-sync:signin',
TEAM_SYNC_SIGNOUT: 'team-sync:signout',
TEAM_SYNC_STATUS: 'team-sync:status',
TEAM_SYNC_CREATE_TEAM: 'team-sync:create-team',
TEAM_SYNC_JOIN_TEAM: 'team-sync:join-team',
TEAM_SYNC_GET_TEAMS: 'team-sync:get-teams',
TEAM_SYNC_GET_MEMBERS: 'team-sync:get-members',
TEAM_SYNC_REMOVE_MEMBER: 'team-sync:remove-member',
TEAM_SYNC_ENABLE: 'team-sync:enable',
TEAM_SYNC_DISABLE: 'team-sync:disable',
TEAM_SYNC_FORCE_PUSH: 'team-sync:force-push',
TEAM_SYNC_FORCE_PULL: 'team-sync:force-pull',
TEAM_SYNC_UPDATE: 'team-sync:update',     // main → renderer events
TEAM_SYNC_GENERATE_INVITE: 'team-sync:generate-invite',
```

### 3.2 IPC Handlers

**Arquivo:** `apps/frontend/src/main/ipc-handlers/team-sync-handlers.ts`

Registra handlers para todos os channels acima, delegando para `TeamSyncService`.

### 3.3 Preload API

**Arquivo:** `apps/frontend/src/preload/api/modules/team-sync-api.ts`

```typescript
export interface TeamSyncAPI {
  signup(email: string, name: string, password: string): Promise<IPCResult>;
  signin(email: string, password: string): Promise<IPCResult>;
  signout(): Promise<IPCResult>;
  getSyncStatus(): Promise<IPCResult<TeamSyncStatus>>;
  createTeam(name: string): Promise<IPCResult<Team>>;
  joinTeam(inviteCode: string): Promise<IPCResult>;
  getTeams(): Promise<IPCResult<Team[]>>;
  getTeamMembers(teamId: string): Promise<IPCResult<TeamMember[]>>;
  removeMember(teamId: string, memberId: string): Promise<IPCResult>;
  enableSync(projectId: string): Promise<IPCResult>;
  disableSync(projectId: string): Promise<IPCResult>;
  forcePush(projectId: string): Promise<IPCResult>;
  forcePull(projectId: string): Promise<IPCResult>;
  generateInviteCode(teamId: string): Promise<IPCResult<string>>;
  onSyncUpdate(callback: (update: TeamSyncUpdate) => void): void;
  offSyncUpdate(): void;
}
```

### 3.4 Types

**Arquivo:** `apps/frontend/src/shared/types/team-sync.ts`

```typescript
export interface TeamSyncStatus {
  connected: boolean;
  authenticated: boolean;
  user?: { email: string; name: string };
  activeTeam?: { id: string; name: string; role: string };
  syncedProjects: string[];
  lastSyncAt?: Date;
  pendingChanges: number;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  role: "owner" | "admin" | "member";
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "removed";
  joinedAt: Date;
  lastSyncAt?: Date;
}

export interface TeamSyncUpdate {
  type: "connected" | "disconnected" | "sync_start" | "sync_complete" | "sync_error" | "member_joined" | "member_left" | "data_received";
  message?: string;
  resource?: string;
  timestamp: Date;
}
```

### 3.5 Settings Extension

**Adicionar a `AppSettings`:**
```typescript
// Team Sync
teamSyncEnabled?: boolean;
teamSyncEmail?: string;  // Cached email for display (not the password!)
teamSyncTeamId?: string;
teamSyncDeviceId?: string;
teamSyncAutoConnect?: boolean; // Auto-connect on startup
```

### 3.6 Initialize na Main

**Arquivo:** `apps/frontend/src/main/index.ts` — Adicionar:
```typescript
import { TeamSyncService } from './team-sync/team-sync-service';

// After window creation:
const teamSyncService = new TeamSyncService();
await teamSyncService.initialize();

// Register IPC handlers:
registerTeamSyncHandlers(teamSyncService, getMainWindow);

// On quit:
app.on('before-quit', async () => {
  await teamSyncService.shutdown();
});
```

---

## Phase 4: Frontend UI

### 4.1 Zustand Store

**Arquivo:** `apps/frontend/src/renderer/stores/team-sync-store.ts`

```typescript
interface TeamSyncState {
  status: TeamSyncStatus;
  teams: Team[];
  members: TeamMember[];
  updates: TeamSyncUpdate[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStatus(): Promise<void>;
  signup(email: string, name: string, password: string): Promise<boolean>;
  signin(email: string, password: string): Promise<boolean>;
  signout(): Promise<void>;
  createTeam(name: string): Promise<Team | null>;
  joinTeam(inviteCode: string): Promise<boolean>;
  fetchTeams(): Promise<void>;
  fetchMembers(teamId: string): Promise<void>;
}
```

### 4.2 UI Components

**Local:** `apps/frontend/src/renderer/components/team-sync/`

#### `TeamSyncSettings.tsx`
- Pagina de settings com toggle on/off
- Mostra email conectado e team ativo
- Botoes: Login, Criar Time, Sair
- Lista projetos sincronizados
- Force push/pull por projeto
- Aparece como sub-secao em Settings

#### `TeamAuthDialog.tsx`
- Dialog modal para signup/signin
- Tabs: "Entrar" / "Criar conta"
- Campos: email, nome (signup), senha
- Validacao de campos
- Loading state e error handling

#### `TeamManageDialog.tsx`
- Dialog para gerenciar o time
- Lista membros com role badges
- Gerar/copiar invite code
- Remover membros (owner/admin)
- Alterar roles (owner only)

#### `SyncStatusIndicator.tsx`
- Icone pequeno na sidebar/statusbar
- Verde: conectado e sincronizado
- Amarelo: sincronizando
- Vermelho: desconectado/erro
- Tooltip com detalhes
- Click abre TeamSyncSettings

#### `TeamInviteDialog.tsx`
- Dialog para copiar invite code
- Instrucoes de como compartilhar
- QR code opcional

---

## Phase 5: Hook nos Handlers Existentes

Para garantir sync imediato (sem esperar file watcher), hook nos IPC handlers que escrevem dados:

### 5.1 Task Status Changes
Quando `task-handlers.ts` ou `agent-state.ts` escrevem em `implementation_plan.json`:
```typescript
// Apos escrever no disco:
if (teamSyncService.isSyncEnabled(projectId)) {
  teamSyncService.pushTaskUpdate(projectId, specId, updatedPlan);
}
```

### 5.2 Insights Sessions
Quando `insights-handlers.ts` salva uma session:
```typescript
if (teamSyncService.isSyncEnabled(projectId)) {
  teamSyncService.pushInsightsSession(projectId, session);
}
```

### 5.3 Roadmap e Ideation
Similar pattern para roadmap/ideation runners.

### 5.4 Project Settings
Quando project settings mudam em `project-handlers.ts`.

---

## Phase 6: i18n

### Translation Keys (`en/team.json` e `fr/team.json`)

Namespaces novos:
- `team:auth.signIn` / `team:auth.signUp` / `team:auth.signOut`
- `team:auth.email` / `team:auth.password` / `team:auth.name`
- `team:manage.title` / `team:manage.members` / `team:manage.inviteCode`
- `team:manage.roles.owner` / `team:manage.roles.admin` / `team:manage.roles.member`
- `team:sync.status.connected` / `team:sync.status.syncing` / `team:sync.status.disconnected`
- `team:sync.forcePush` / `team:sync.forcePull`
- `team:settings.title` / `team:settings.enable`
- `team:errors.invalidCredentials` / `team:errors.connectionFailed`

---

## Arquivos a Criar

```
convex/                                           # Convex backend (cloud functions)
├── schema.ts                                     # Database schema
├── auth.ts                                       # Auth HTTP actions
├── helpers.ts                                    # Session validation helper
├── teams.ts                                      # Team CRUD mutations/queries
├── tasks.ts                                      # Task sync functions
├── insights.ts                                   # Insights sync functions
├── roadmap.ts                                    # Roadmap sync functions
├── ideation.ts                                   # Ideation sync functions
├── projects.ts                                   # Project sync functions
└── tsconfig.json                                 # Convex TypeScript config

apps/frontend/src/main/team-sync/                 # Main process sync service
├── team-sync-service.ts                          # Principal service class
├── convex-client.ts                              # Convex client wrapper
├── file-watcher.ts                               # .auto-claude/ file watcher
├── sync-engine.ts                                # Push/pull logic
└── credential-utils.ts                           # OS Keychain storage

apps/frontend/src/main/ipc-handlers/
└── team-sync-handlers.ts                         # IPC handlers

apps/frontend/src/preload/api/modules/
└── team-sync-api.ts                              # Preload bridge

apps/frontend/src/renderer/stores/
└── team-sync-store.ts                            # Zustand store

apps/frontend/src/renderer/components/team-sync/  # UI components
├── TeamSyncSettings.tsx                          # Settings section
├── TeamAuthDialog.tsx                            # Login/signup dialog
├── TeamManageDialog.tsx                          # Team management
├── TeamInviteDialog.tsx                          # Invite code dialog
└── SyncStatusIndicator.tsx                       # Status indicator

apps/frontend/src/shared/types/
└── team-sync.ts                                  # Type definitions

apps/frontend/src/shared/i18n/locales/en/
└── team.json                                     # English translations

apps/frontend/src/shared/i18n/locales/fr/
└── team.json                                     # French translations
```

## Arquivos a Modificar

```
apps/frontend/package.json                        # Add convex, bcryptjs, ws deps
apps/frontend/src/shared/constants/ipc.ts         # Add team sync IPC channels
apps/frontend/src/shared/types/ipc.ts             # Add team sync IPC types
apps/frontend/src/main/index.ts                   # Initialize TeamSyncService
apps/frontend/src/main/ipc-handlers/index.ts      # Register team-sync-handlers
apps/frontend/src/preload/api/index.ts            # Export team sync API
apps/frontend/src/preload/index.ts                # Add to ElectronAPI
apps/frontend/src/shared/types/settings.ts        # Add teamSync to AppSettings
apps/frontend/src/renderer/components/settings/   # Add team sync section
apps/frontend/src/shared/i18n/locales/en/settings.json  # Team sync labels
apps/frontend/src/shared/i18n/locales/fr/settings.json  # French labels
convex.json                                       # Convex project config (root)
.env.local                                        # CONVEX_URL
```

## Ordem de Execucao

1. **Phase 1** — Convex backend (schema + auth + CRUD) → deploy
2. **Phase 2** — TeamSyncService no main process → test push/pull
3. **Phase 3** — IPC + preload + types → integration
4. **Phase 4** — UI components → visual
5. **Phase 5** — Hook nos handlers existentes → sync imediato
6. **Phase 6** — i18n (en + fr)

## Consideracoes

- **Security:** Senhas hashadas com bcryptjs no Convex server (nunca no client). Session tokens com 30 dias de validade. Credenciais no OS Keychain, nunca em JSON.
- **Performance:** Debounce de 500ms no file watcher. Batch mutations para multiplas mudancas simultaneas. Subscriptions sao eficientes (Convex otimiza automaticamente).
- **Offline:** App funciona 100% offline. Sync resume automaticamente ao reconectar. Mudancas locais acumulam e sao pushadas quando reconectar.
- **Conflicts:** LWW simples. Para task logs, append-only (sem conflito). Se ambas maquinas editam o mesmo campo, ultima escrita ganha.
