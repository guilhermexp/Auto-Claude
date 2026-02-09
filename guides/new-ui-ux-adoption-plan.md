# Plano de Adoção da Nova Base UI/UX (NEW-UI/UX.md)

## Objetivo
Adotar a nova base de UI/UX/tokens/temas do `NEW-UI/UX.md` no Auto-Claude com risco baixo, preservando o que já funciona (Electron + React 19 + Tailwind v4 + store atual).

## Diagnóstico rápido (estado atual x UX.md)

## Estado atual do Auto-Claude
- Tailwind **v4** com `@import "tailwindcss"` e `@theme` em `apps/frontend/src/renderer/styles/globals.css`.
- Tema aplicado por lógica própria em:
  - `apps/frontend/src/renderer/App.tsx`
  - `apps/frontend/src/renderer/components/settings/hooks/useSettings.ts`
- Persistência de aparência no `settings.json` via:
  - `apps/frontend/src/main/ipc-handlers/settings-handlers.ts`
  - `apps/frontend/src/renderer/stores/settings-store.ts`
- Sistema já possui:
  - `theme: light | dark | system`
  - `colorTheme` com paletas (`default`, `dusk`, `lime`, etc.)

## Proposta do UX.md
- Base conceitual em Tailwind **v3** (`tailwind.config.js` + `@tailwind base/components/utilities`).
- `next-themes` para dark/light/system.
- Sistema avançado de temas com:
  - temas builtin light/dark por ID
  - mapeamento VS Code -> CSS Variables
  - importação de temas VS Code/Cursor/Windsurf
  - persistência com Jotai (`atomWithStorage`)

## Gap principal
- Conflito de abordagem: UX.md assume stack de tema diferente da atual.
- Recomendação: **não migrar 1:1** para `next-themes` + Jotai agora.
- Melhor caminho: implementar o modelo de temas avançados **sobre a arquitetura atual** (Zustand + IPC + App.tsx), mantendo Tailwind v4.

---

## Decisões de arquitetura

1. **Manter Tailwind v4** e adaptar snippets do UX.md.
2. **Manter persistência em `AppSettings`** (não trocar para localStorage/Jotai para tema global do app).
3. **Reaproveitar `ThemeSelector` atual** como ponto de entrada da nova UX.
4. **Adicionar engine de tema modular** (registry + mapping + apply/reset) sem quebrar o fluxo atual.
5. **Fasear importação de temas VS Code** para depois da estabilização de tokens e builtin themes.

---

## Plano por fases

## Fase 1 - Fundamentos de tokens (sem mudar UX visual drasticamente)

Objetivo: alinhar base de tokens do `UX.md` com o sistema atual.

Ações:
- Consolidar tokens semânticos obrigatórios no `globals.css`:
  - `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, `--destructive`.
- Remover variações duplicadas/hardcoded quando possível, priorizando tokens semânticos.
- Garantir que componentes críticos usem `bg-background`, `text-foreground`, `border-border`, etc.

Arquivos-alvo:
- `apps/frontend/src/renderer/styles/globals.css`
- `apps/frontend/src/renderer/components/ui/*.tsx` (ajustes pontuais)

Critério de saída:
- Light/dark continuam funcionando.
- Nenhuma regressão visual grave nas telas principais.

---

## Fase 2 - Unificação do catálogo de temas (novo modelo builtin)

Objetivo: evoluir de `colorTheme` simples para catálogo de temas versionado.

Ações:
- Criar tipo de tema expandido (inspirado no `VSCodeFullTheme`) no shared.
- Introduzir registry de temas builtin com pares light/dark e metadados.
- Mapear compatibilidade dos temas atuais (`default`, `dusk`, etc.) para o novo formato.
- Preservar fallback para `default` em caso de valor inválido.

Arquivos-alvo:
- `apps/frontend/src/shared/types/settings.ts`
- `apps/frontend/src/shared/constants/themes.ts` (ou novo módulo de registry)
- `apps/frontend/src/renderer/App.tsx`
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`

Critério de saída:
- Usuário escolhe tema por ID sem quebrar settings antigos.
- Migração backward compatible para quem já tem `colorTheme` salvo.

---

## Fase 3 - Alternância avançada (System com tema específico para Light e Dark)

Objetivo: suportar no modo `system` uma escolha de tema para claro e outra para escuro (como no UX.md).

Ações:
- Adicionar em `AppSettings`:
  - `selectedThemeId` (null = system)
  - `systemLightThemeId`
  - `systemDarkThemeId`
- Atualizar tela de aparência para:
  - seletor principal (System ou tema fixo)
  - sub-seletores light/dark quando `system` ativo
- Ajustar aplicação no `App.tsx` para resolver tema efetivo por estado + `prefers-color-scheme`.

Arquivos-alvo:
- `apps/frontend/src/shared/types/settings.ts`
- `apps/frontend/src/shared/constants/config.ts`
- `apps/frontend/src/renderer/App.tsx`
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
- `apps/frontend/src/renderer/components/settings/hooks/useSettings.ts`
- `apps/frontend/src/main/ipc-handlers/settings-handlers.ts`

Critério de saída:
- Troca de tema previsível em `light/dark/system`.
- Persistência consistente após reiniciar app.

---

## Fase 4 - Engine VS Code -> CSS Variables

Objetivo: habilitar temas baseados em JSON de VS Code.

Ações:
- Criar módulo de mapeamento:
  - `vscode key -> css var`
  - `hex -> hsl`
  - `detect theme type (light/dark)`
  - `apply/remove css vars`
- Permitir aplicar tema importado em runtime sem substituir tokens base globais permanentemente.

Arquivos-alvo (novos):
- `apps/frontend/src/renderer/lib/themes/vscode-to-css-mapping.ts`
- `apps/frontend/src/renderer/lib/themes/theme-apply.ts`

Arquivos-alvo (integração):
- `apps/frontend/src/renderer/App.tsx`
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`

Critério de saída:
- Tema importado altera UI via CSS vars e pode ser resetado sem reload.

---

## Fase 5 - Importação de temas VS Code/Cursor/Windsurf

Objetivo: descoberta/importação real via processo main.

Ações:
- Implementar scanner no main process para localizar temas instalados.
- Expor IPC para listar temas e carregar JSON.
- Adicionar UI de importação/seleção no settings.
- Validar sanitização de payload e fallback robusto.

Arquivos-alvo (novos):
- `apps/frontend/src/main/themes/vscode-theme-loader.ts`
- `apps/frontend/src/main/ipc-handlers/theme-handlers.ts`
- `apps/frontend/src/preload/api/theme-api.ts`

Arquivos-alvo (integração):
- `apps/frontend/src/main/ipc-setup.ts`
- `apps/frontend/src/preload/api/index.ts`
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`

Critério de saída:
- Importar tema externo com segurança e sem crash.

---

## Fase 6 - Polimento UX e cobertura de testes

Objetivo: estabilizar e garantir manutenção fácil.

Ações:
- Melhorar previews, agrupamento por Light/Dark, feedback visual.
- Adicionar testes de:
  - aplicação de `dark`/`data-theme`
  - fallback para tema inválido
  - persistência/reversão ao cancelar modal
  - mapeamento VS Code -> tokens
- Atualizar docs de manutenção.

Arquivos-alvo:
- `apps/frontend/src/renderer/components/settings/*.tsx`
- `apps/frontend/src/renderer/stores/*.ts`
- `apps/frontend/src/renderer/**/*.test.tsx`
- `guides/theme-layout-tokens.md`

---

## Itens do UX.md que devemos adaptar (não copiar literal)

1. `tailwind.config.js` de v3
- No projeto atual (v4), manter `@theme` e tokens em CSS.

2. `next-themes`
- Opcional. Hoje já temos mecanismo robusto; trocar agora aumenta risco sem ganho imediato.

3. Jotai para preferência de tema
- Opcional. Persistência global já é centralizada no `settings.json` via IPC.

---

## Ordem de execução recomendada

1. Fase 1 (tokens)  
2. Fase 2 (registry builtin)  
3. Fase 3 (system light/dark separado)  
4. Fase 6 parcial (testes do núcleo)  
5. Fase 4 (engine VS Code)  
6. Fase 5 (importação externa)  
7. Fase 6 final (polimento completo)

---

## Riscos e mitigação

1. Regressão visual ampla
- Mitigar com rollout por fase + validação manual por telas-chave.

2. Inconsistência entre preview e persistência
- Mitigar mantendo `useSettings` com `revertTheme/commitTheme` como fonte de verdade.

3. Importação de tema externo quebrar contraste/acessibilidade
- Mitigar com fallback de tokens críticos e validação de schema.

4. Dívida de compatibilidade com settings antigos
- Mitigar com migração explícita de campos legados.

---

## Resultado esperado
Ao fim, o Auto-Claude terá:
- base de tokens mais organizada
- alternância de tema mais poderosa (incluindo system customizado)
- caminho para importar temas VS Code/Cursor/Windsurf
- mapa de manutenção simples para mudanças futuras de UI/UX
