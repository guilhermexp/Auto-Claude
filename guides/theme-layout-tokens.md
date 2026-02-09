# Documentação Completa: Layout, Tokens e Tema (Light/Dark + Color Themes)

Este documento mapeia **como o sistema de aparência funciona hoje** no Auto-Claude (frontend), e **quais arquivos precisam ser alterados** em cada tipo de mudança.

## 1) Visão geral da arquitetura

O sistema de aparência tem 4 camadas:

1. **Modelo e defaults de settings**
- Define tipos (`theme`, `colorTheme`) e valores padrão.

2. **Persistência**
- Salva/carrega as escolhas em `settings.json` (Electron `userData`).

3. **Aplicação de tema em runtime**
- Aplica `class="dark"` no `<html>` para modo escuro.
- Aplica `data-theme="..."` no `<html>` para paleta de cores.

4. **Tokens/CSS e componentes**
- Tokens globais (cores, spacing, tipografia etc.) em CSS variables.
- Componentes usam classes semânticas (`bg-background`, `text-foreground`, etc.).

---

## 2) Arquivos fonte principais

### 2.1 Tipos e catálogo de temas
- `apps/frontend/src/shared/types/settings.ts`
  - Define `theme: 'light' | 'dark' | 'system'`
  - Define `ColorTheme` (`'default' | 'dusk' | 'lime' | 'ocean' | 'retro' | 'neo' | 'forest'`)
  - Define `AppSettings.colorTheme`

- `apps/frontend/src/shared/constants/themes.ts`
  - Catálogo `COLOR_THEMES` (id, nome, descrição e cores de preview).
  - Controla o que aparece no seletor de tema.

- `apps/frontend/src/shared/constants/config.ts`
  - `DEFAULT_APP_SETTINGS.theme` e `DEFAULT_APP_SETTINGS.colorTheme`.
  - Hoje: `theme: 'dark'`, `colorTheme: 'default'`.

### 2.2 Persistência (settings.json)
- `apps/frontend/src/main/settings-utils.ts`
  - Caminho do arquivo: `app.getPath('userData')/settings.json`
  - Helpers de leitura/escrita.

- `apps/frontend/src/main/ipc-handlers/settings-handlers.ts`
  - IPC `SETTINGS_GET` e `SETTINGS_SAVE`.
  - Faz merge com defaults e persiste mudanças.

- `apps/frontend/src/preload/api/settings-api.ts`
  - Ponte renderer -> main (`getSettings`, `saveSettings`).

- `apps/frontend/src/renderer/stores/settings-store.ts`
  - Estado global (`zustand`) de settings.
  - `loadSettings()` e `saveSettings()` no renderer.
  - Migração para dark por padrão (`migrateToDarkMode`).

### 2.3 Aplicação prática do tema
- `apps/frontend/src/renderer/App.tsx`
  - Efeito que aplica:
    - `document.documentElement.classList.add/remove('dark')`
    - `document.documentElement.setAttribute('data-theme', ...)`
  - Fallback para tema inválido -> `default`.
  - Escuta `prefers-color-scheme` quando `theme === 'system'`.

- `apps/frontend/src/renderer/components/settings/hooks/useSettings.ts`
  - Fluxo de preview/reversão no modal:
    - Preview imediato de tema/escala.
    - `revertTheme()` ao fechar sem salvar.
    - `commitTheme()` após salvar.

- `apps/frontend/src/renderer/components/settings/AppSettings.tsx`
  - Integra `useSettings` no modal.
  - Fecha modal sem salvar -> reverte preview.

### 2.4 UI do seletor de aparência
- `apps/frontend/src/renderer/components/settings/ThemeSettings.tsx`
  - Card da seção de aparência.

- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
  - Componente do toggle (`system/light/dark`) e grade de paletas.
  - Atualiza `settings` local + store para preview imediato.

- `apps/frontend/src/renderer/styles/globals.css`
  - **Base light** em `:root`
  - **Base dark** em `.dark`
  - Overrides por paleta com `:root[data-theme="..."]` e `:root.dark[data-theme="..."]`
  - Tokens semânticos e utilitários (`--background`, `--primary`, etc.)
  - Estilos visuais do seletor (`.settings-mode-button`, `.settings-theme-card`)

### 2.5 Traduções (texto da UI)
- `apps/frontend/src/shared/i18n/locales/pt/settings.json`
- `apps/frontend/src/shared/i18n/locales/en/settings.json`
- `apps/frontend/src/shared/i18n/locales/fr/settings.json`

---

## 3) Como o fluxo funciona (fim a fim)

1. Usuário muda modo/paleta em `ThemeSelector`.
2. `ThemeSelector` atualiza store imediatamente para preview.
3. `App.tsx` reage ao estado e aplica `dark`/`data-theme` no `<html>`.
4. `globals.css` recalcula CSS variables e a UI troca visual.
5. Se salvar: `saveSettings` persiste no `settings.json`.
6. Se fechar sem salvar: `revertTheme()` restaura valores originais.

---

## 4) Mapa de alteração: “o que quero mudar” -> “arquivos que mexem”

## 4.1 Mudar cores do tema padrão (default)
- Obrigatórios:
  - `apps/frontend/src/renderer/styles/globals.css`
    - bloco `:root` (light)
    - bloco `.dark` (dark)
- Recomendado:
  - `apps/frontend/src/shared/constants/themes.ts`
    - `previewColors` do `default`

## 4.2 Mudar só o modo claro ou só o escuro (global)
- `apps/frontend/src/renderer/styles/globals.css`
  - `:root` (claro)
  - `.dark` (escuro)

## 4.3 Criar uma nova paleta de cor
- Obrigatórios:
  - `apps/frontend/src/shared/types/settings.ts`
    - adicionar novo valor em `ColorTheme`
  - `apps/frontend/src/shared/constants/themes.ts`
    - adicionar tema em `COLOR_THEMES`
  - `apps/frontend/src/renderer/styles/globals.css`
    - criar 2 blocos:
      - `:root[data-theme="novo"]`
      - `:root.dark[data-theme="novo"]`
- Opcional:
  - ajustes de copy/descrição (se necessário) nos arquivos i18n

## 4.4 Remover/renomear uma paleta existente
- Obrigatórios:
  - `apps/frontend/src/shared/types/settings.ts`
  - `apps/frontend/src/shared/constants/themes.ts`
  - `apps/frontend/src/renderer/styles/globals.css`
- Atenção:
  - usuários podem ter valor antigo salvo; hoje `App.tsx` já faz fallback para `default` quando inválido.

## 4.5 Mudar comportamento do toggle light/dark/system
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
  - UI e ações dos botões
- `apps/frontend/src/renderer/App.tsx`
  - regra de aplicação no `<html>` + listener de `prefers-color-scheme`
- `apps/frontend/src/renderer/components/settings/hooks/useSettings.ts`
  - preview/revert no modal

## 4.6 Mudar padrão inicial da aplicação
- `apps/frontend/src/shared/constants/config.ts`
  - `DEFAULT_APP_SETTINGS.theme` / `colorTheme`
- `apps/frontend/src/renderer/stores/settings-store.ts`
  - revisar migração `migrateToDarkMode` (pode sobrescrever `system`/undefined para `dark`)

## 4.7 Mudar tokens de design (tipografia, espaçamento, radius, animações)
- `apps/frontend/src/renderer/styles/globals.css`
  - bloco `@theme` (tokens)

## 4.8 Mudar estilo visual do componente de seleção (cards/botões)
- `apps/frontend/src/renderer/components/settings/ThemeSelector.tsx`
- `apps/frontend/src/renderer/styles/globals.css`
  - classes:
    - `.settings-mode-button*`
    - `.settings-theme-card*`

## 4.9 Mudar textos da seção de aparência
- `apps/frontend/src/shared/i18n/locales/pt/settings.json`
- `apps/frontend/src/shared/i18n/locales/en/settings.json`
- `apps/frontend/src/shared/i18n/locales/fr/settings.json`

---

## 5) Tokens principais usados pela UI

Os componentes consomem tokens semânticos via classes Tailwind utilitárias ligadas a CSS vars:
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--border`, `--input`, `--ring`
- `--success`, `--warning`, `--info`

Arquivo fonte desses tokens:
- `apps/frontend/src/renderer/styles/globals.css`

---

## 6) Checklist rápido para alteração segura

1. Definir se a mudança é:
- comportamento (`ThemeSelector/App.tsx/useSettings`)
- catálogo de temas (`types + constants + css`)
- tokens globais (`globals.css`)

2. Atualizar arquivos obrigatórios do cenário (seção 4).

3. Validar no app:
- modo `light`, `dark`, `system`
- cada paleta no seletor
- fechar modal sem salvar (deve reverter)
- salvar e reabrir app (deve persistir)

4. Se houver mudança de texto, sincronizar i18n (`pt/en/fr`).

---

## 7) Observações importantes

- Não há suíte de testes dedicada ao `ThemeSelector`/`App.tsx` para tema no estado atual.
- O fallback para `colorTheme` inválido é tratado em `App.tsx` (retorna para `default`).
- Existe migração no store forçando dark em casos legados (`migrateToDarkMode`), então mudanças de default devem considerar essa função.
