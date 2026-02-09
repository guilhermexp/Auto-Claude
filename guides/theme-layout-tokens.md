# Documentação Completa: Layout, Tokens e Temas (Light/Dark/System)

Este documento mapeia o sistema atual de aparência do Auto-Claude e mostra exatamente quais arquivos alterar para manter a base de UI/UX/tokens e alternância de temas.

## 1) Visão geral da arquitetura

O sistema de aparência tem 4 camadas:

1. Modelo e defaults de settings
- Define `theme` (`light|dark|system`) e IDs de tema (`themeId`, `systemLightThemeId`, `systemDarkThemeId`).

2. Persistência
- Salva/carrega preferências em `settings.json` (Electron `userData`).

3. Aplicação de tema em runtime
- `App.tsx` define classe `dark` no `<html>`.
- `App.tsx` resolve o tema builtin ativo e aplica CSS vars dinamicamente a partir do catálogo de temas.
- Se houver tema externo importado, ele sobrepõe as variáveis do builtin.

4. Tokens/CSS e componentes
- `globals.css` define base de tokens semânticos (`--background`, `--primary`, etc.) e estilo global.
- Componentes usam classes semânticas (`bg-background`, `text-foreground`, etc.).

## 2) Temas builtin implementados (NEW-UI/theme.md)

Temas ativos no app:
- `21st-dark`
- `21st-light`
- `cursor-dark`
- `cursor-light`
- `cursor-midnight`
- `claude-dark`
- `claude-light`
- `vesper-dark`
- `vitesse-dark`
- `vitesse-light`
- `min-dark`
- `min-light`

Defaults atuais:
- `DEFAULT_DARK_THEME_ID = 21st-dark`
- `DEFAULT_LIGHT_THEME_ID = 21st-light`
- `DEFAULT_THEME_ID = 21st-dark`

## 3) Arquivos principais

### 3.1 Tipos e catálogo de temas
- `apps/frontend/src/shared/types/settings.ts`
  - `BuiltinThemeId` com os 11 IDs.
  - `ColorThemeDefinition` com `type: 'light' | 'dark'`.

- `apps/frontend/src/shared/constants/themes.ts`
  - Catálogo completo (`BUILTIN_THEME_PALETTES`) com `colors` (VS Code keys) por tema.
  - Exposição de `COLOR_THEMES`, `BUILTIN_THEME_COLOR_SCHEMES`, `BUILTIN_THEME_IDS`.
  - Defaults (`DEFAULT_THEME_ID`, `DEFAULT_LIGHT_THEME_ID`, `DEFAULT_DARK_THEME_ID`).

- `apps/frontend/src/shared/constants/config.ts`
  - Defaults de settings:
    - `themeId: '21st-dark'`
    - `systemLightThemeId: '21st-light'`
    - `systemDarkThemeId: '21st-dark'`

### 3.2 Persistência e migração
- `apps/frontend/src/renderer/stores/settings-store.ts`
  - Migração `migrateThemeId`:
    - normaliza IDs inválidos para defaults.
    - converte legados (`21st` -> `21st-dark`, `claude` -> `claude-dark`).

- `apps/frontend/src/main/settings-utils.ts`
- `apps/frontend/src/main/ipc-handlers/settings-handlers.ts`
- `apps/frontend/src/preload/api/settings-api.ts`

### 3.3 Aplicação de tema em runtime
- `apps/frontend/src/renderer/App.tsx`
  - resolve tema efetivo considerando `theme`, `themeId`, `systemLightThemeId`, `systemDarkThemeId`.
  - aplica `dark` class.
  - aplica CSS vars do builtin via:
    - `generateCSSVariables()`
    - `applyThemeVariables()`
  - se houver `customThemeColors`, sobrepõe variáveis.

- `apps/frontend/src/renderer/lib/themes/vscode-to-css-mapping.ts`
  - converte mapa de cores VS Code para tokens CSS do app.

- `apps/frontend/src/renderer/lib/themes/theme-apply.ts`
  - aplica/remove variáveis CSS inline no root.

### 3.4 UI de seleção
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
  - toggle `system|light|dark`.
  - lista temas builtin por tipo (light/dark).
  - mapeamento separado para `systemLightThemeId` e `systemDarkThemeId`.
  - suporta importação de temas externos (VS Code/Cursor/Windsurf).

### 3.5 CSS base e tokens
- `apps/frontend/src/renderer/styles/globals.css`
  - define base `:root` e `.dark`.
  - não mantém blocos estáticos por tema builtin; os 11 temas são aplicados em runtime.

## 4) Fluxo fim a fim

1. Usuário muda modo/tema em `ThemeSelector`.
2. Store atualiza imediatamente (preview).
3. `App.tsx` recalcula tema efetivo e reaplica variáveis.
4. Se salvar: persiste em `settings.json`.
5. Se cancelar modal: `useSettings` reverte preview.

## 5) Mapa de alteração (o que mexer)

### 5.1 Trocar/adicionar temas builtin
- `apps/frontend/src/shared/types/settings.ts`
- `apps/frontend/src/shared/constants/themes.ts`
- `apps/frontend/src/shared/constants/config.ts` (se mudar defaults)
- `apps/frontend/src/renderer/stores/settings-store.ts` (migração legada)

### 5.2 Alterar lógica de alternância light/dark/system
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
- `apps/frontend/src/renderer/App.tsx`
- `apps/frontend/src/renderer/components/settings/hooks/useSettings.ts`

### 5.3 Alterar tokens de design global (tipografia/spacing/radius/estilos base)
- `apps/frontend/src/renderer/styles/globals.css`

### 5.4 Ajustar mapeamento de cores VS Code -> tokens do app
- `apps/frontend/src/renderer/lib/themes/vscode-to-css-mapping.ts`

### 5.5 Ajustar temas externos/importados
- `apps/frontend/src/main/themes/vscode-theme-loader.ts`
- `apps/frontend/src/main/ipc-handlers/theme-handlers.ts`
- `apps/frontend/src/preload/api/settings-api.ts`
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`

## 6) Checklist de validação

1. Testar modos: `light`, `dark`, `system`.
2. Testar os 11 temas builtin no seletor.
3. Em `system`, validar troca automática do SO entre tema light/dark mapeados.
4. Validar importar tema externo e voltar para builtin.
5. Fechar modal sem salvar e confirmar revert.
6. Reabrir app e confirmar persistência.

## 7) Observações

- O `data-theme` permanece para rastreabilidade/debug, mas os tokens dos builtins são definidos por runtime em `App.tsx`.
- O catálogo foi alinhado com `NEW-UI/theme.md`.
