# Operador de Kanban no Insights (Análises)

## Objetivo
Transformar o chat de **Análises (Insights)** em um operador de Kanban conversacional no **projeto ativo**, com:
- leitura operacional do quadro (snapshot, contagens, listas)
- ações de gestão de tarefas (start, stop, delete, review)
- confirmação obrigatória para ações destrutivas

## Escopo desta implementação
- Projeto ativo apenas (sem cross-project).
- Fluxo no chat com proposta estruturada + confirmação.
- Suporte a linguagem natural e comandos `/kanban ...`.

## Arquitetura implementada

### 1) Runner (backend) gera proposta estruturada
Arquivo: `apps/backend/runners/insights_runner.py`

- Novo protocolo de saída:
  - `__KANBAN_ACTION__:{...json...}`
- O runner detecta comandos operacionais e emite proposta com:
  - `actionId`
  - `intent`
  - `targets`
  - `resolvedSpecIds` (quando houver)
  - `requiresConfirmation`
  - `reason`
  - `createdAt`

Intents suportados:
- `status_summary`
- `list_human_review`
- `list_errors`
- `start_tasks`
- `stop_tasks`
- `delete_tasks`
- `review_tasks`
- `queue_count`
- `in_progress_count`

Regras ativas:
- `stop_tasks` e `delete_tasks` sempre exigem confirmação.
- Escopo fixo no projeto ativo.
- Limite operacional de lote aplicado no serviço (máx. 20).

### 2) Executor do Insights interpreta o marcador
Arquivo: `apps/frontend/src/main/insights/insights-executor.ts`

- Parse do marcador `__KANBAN_ACTION__`.
- Emissão de chunk de stream:
  - `type: 'action_proposal'`
- Retorno de `pendingAction` para persistência na sessão.

### 3) Sessão Insights passa a guardar ação pendente
Arquivos:
- `apps/frontend/src/main/insights-service.ts`
- `apps/frontend/src/main/insights/session-manager.ts`
- `apps/frontend/src/main/insights/session-storage.ts`

- `InsightsSession.pendingAction` persistido em disco.
- Métodos adicionados:
  - `setPendingAction(...)`
  - `appendActionResultMessage(...)`

### 4) Serviço de domínio para executar intents
Arquivo: `apps/frontend/src/main/services/task-control-service.ts`

Métodos principais:
- `getKanbanSnapshot(projectId)`
- `resolveTargets(projectId, selector)`
- `executeIntent(projectId, proposal)`

Operações cobertas:
- leitura: resumo, contadores e listas
- ação: start, stop, delete, review

Snapshot retornado:
- contagem por status
- filas principais: `queue`, `inProgress`, `humanReview`, `error`
- resumo por tarefa (`specId`, `title`, `status`, `reviewReason`)

### 5) IPC e preload para confirmação/cancelamento/snapshot
Arquivos:
- `apps/frontend/src/shared/constants/ipc.ts`
- `apps/frontend/src/main/ipc-handlers/insights-handlers.ts`
- `apps/frontend/src/preload/api/modules/insights-api.ts`
- `apps/frontend/src/shared/types/ipc.ts`

Novos canais:
- `INSIGHTS_CONFIRM_ACTION`
- `INSIGHTS_CANCEL_ACTION`
- `INSIGHTS_GET_KANBAN_SNAPSHOT`

### 6) Frontend (store/UI) com card de confirmação
Arquivos:
- `apps/frontend/src/renderer/stores/insights-store.ts`
- `apps/frontend/src/renderer/components/Insights.tsx`

Comportamento:
- recebe `action_proposal` no stream
- guarda `pendingAction` na sessão
- mostra card com resumo + IDs + botões `Confirmar` e `Cancelar`
- em ações sem confirmação obrigatória, tenta confirmar automaticamente
- após execução, recebe `action_result` e atualiza a conversa

## Tipos adicionados/alterados
Arquivo: `apps/frontend/src/shared/types/insights.ts`

Novos tipos:
- `InsightsKanbanIntent`
- `InsightsKanbanTargetSelector`
- `InsightsKanbanTaskSummary`
- `InsightsKanbanSnapshot`
- `InsightsActionProposal`
- `InsightsActionResult`

Alterações:
- `InsightsSession.pendingAction?: InsightsActionProposal | null`
- `InsightsStreamChunk.type` inclui:
  - `action_proposal`
  - `action_result`

## Como usar (chat do Insights)

### Perguntas de leitura
- `como está meu quadro kanban?`
- `quantas tarefas tem na fila?`
- `quantas em andamento?`
- `quais tarefas para análise humana?`
- `o que deu erro?`

### Ações
- `inicia 003,007`
- `pare as tarefas com erro`
- `deleta 012`
- `aprovar 021`

### Comandos estruturados
- `/kanban status`
- `/kanban start 003,007`
- `/kanban stop erro`
- `/kanban delete 012`

## Fluxo de confirmação
1. Usuário envia comando.
2. Runner emite `__KANBAN_ACTION__`.
3. UI mostra proposta pendente.
4. Usuário confirma/cancela.
5. Main process executa via `TaskControlService`.
6. Chat recebe `action_result` + novo snapshot resumido.

## Guardrails ativos
- projeto ativo obrigatório
- sem cross-project
- confirmação para `stop` e `delete`
- limite de lote: 20 tarefas por operação

## Limitações atuais
- Parser de linguagem natural no runner é heurístico (não NLU avançado).
- Seletores naturais estão focados em:
  - IDs de spec (`003`, `003-slug`)
  - filtros (`fila`, `andamento`, `erro`, `revisão humana`)
  - limite numérico simples
- Auditoria detalhada por evento ainda não está em formato dedicado de log estruturado (o resultado fica na sessão do chat).

## Checklist rápido de validação manual
1. Abrir Insights no projeto ativo.
2. Perguntar: `como está meu quadro kanban?`
3. Enviar: `/kanban stop erro` e verificar card de confirmação.
4. Cancelar e confirmar que nada muda.
5. Repetir e confirmar execução.
6. Verificar mensagem de resultado e atualização de contadores.

