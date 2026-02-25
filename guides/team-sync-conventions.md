# Team Sync Conventions (Local + Convex)

## Objetivo
Garantir que o estado do projeto usado pelos agentes esteja sempre alinhado entre:
- arquivos locais do repositório (`.auto-claude/*` e Git),
- banco remoto (Convex),
- estado exibido no app.

## Regra Principal
Antes de continuar uma tarefa antiga, o app deve validar alinhamento.
Se houver drift (mudança local após o último baseline), o fluxo de execução é bloqueado até reanálise/sincronização.

## Baseline de Alinhamento
O baseline local é salvo em:
- `.auto-claude/team-sync/alignment-state.json`

Campos principais:
- `gitHead`
- `filesFingerprint`
- `updatedAt`

## Quando atualizar baseline
Atualizar baseline após:
1. `forcePush` concluído com sucesso;
2. `forcePull` concluído com sucesso;
3. push incremental local -> Convex concluído com sucesso;
4. reanálise concluída e usuário confirmar alinhamento.

## Drift Detection
A verificação considera:
1. diferença de `git rev-parse HEAD`;
2. diferença do fingerprint dos arquivos de domínio:
   - `.auto-claude/specs/**`
   - `.auto-claude/roadmap/roadmap.json`
   - `.auto-claude/ideation/ideation.json`
   - `.auto-claude/insights/sessions/*.json`

## Preflight obrigatório para execução de task
No `TASK_START`, quando Team Sync está autenticado e o projeto está sincronizado:
- executar `checkProjectAlignment(projectPath)`;
- se `aligned=false`, bloquear execução e solicitar reanálise.

## Fonte de Verdade para Sync
Sempre enviar para Convex dados persistidos no projeto (não apenas estado em memória).
Isso cobre alterações feitas fora do Auto-Claude (IDE, scripts, git checkout etc.).

## Limpeza de estado local
Para onboarding de novo usuário/dispositivo:
- usar `team-sync:clear-local-state`;
- limpar credenciais locais e snapshots de alinhamento.

## Segurança
Nunca sincronizar:
- `.env`
- tokens OAuth/API
- segredos de integrações
- paths absolutos locais
