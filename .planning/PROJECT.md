# Auto-Claude UI/UX Modernization

## What This Is

Modernização completa do design system do Auto-Claude, padronizando todos os componentes visuais com uma biblioteca UI/UX moderna baseada em Radix UI + Tailwind CSS v4 + Motion. O projeto aplica um sistema de design consistente (cores HSL, tipografia, espaçamento, animações) em toda a aplicação desktop Electron, mantendo a estrutura e funcionalidades existentes.

## Core Value

Consistência visual em todo o app — todos os componentes seguindo o mesmo design system, eliminando inconsistências de estilo e criando uma experiência visual coesa e profissional.

## Requirements

### Validated

- ✓ Electron 39.2.7 desktop app com React 19.2.3 — existing
- ✓ Multi-agent autonomous coding framework (Python backend + TypeScript frontend) — existing
- ✓ Spec creation pipeline com complexidade dinâmica — existing
- ✓ Workspace isolation via git worktrees — existing
- ✓ Internacionalização (i18n) com react-i18next 16.5.0 (português e francês) — existing
- ✓ Radix UI primitives parcialmente implementados (14+ componentes) — existing
- ✓ Tailwind CSS 4.1.17 configurado — existing
- ✓ Zustand 5.0.9 para state management — existing
- ✓ Integração com GitHub, GitLab, Linear — existing

### Active

- [ ] Sistema de cores HSL completo - Aplicar paleta de cores HSL do ui.md (primary, secondary, accent, neutral, semantic colors)
- [ ] Tipografia padronizada - Implementar sistema de fontes e tamanhos do ui.md
- [ ] Espaçamento consistente - Aplicar tokens de espaçamento em todos os componentes
- [ ] Componentes Radix UI modernizados - Padronizar Button, Input, Dialog, Select, Checkbox, Radio, Switch, Tabs, Tooltip, Dropdown usando referência ui.md
- [ ] Motion (Framer Motion) integrado - Adicionar animações suaves em transições, modais, toasts
- [ ] Dark mode aprimorado - Sistema de temas com tokens CSS variables
- [ ] Tokens CSS centralizados - Criar sistema de design tokens (cores, espaçamento, tipografia, sombras, bordas)
- [ ] Biblioteca de componentes documentada - Criar storybook ou playground interno para componentes
- [ ] Migração incremental - Substituir componentes gradualmente, mantendo app funcionando

### Out of Scope

- Redesign de layouts ou estrutura de páginas — manter arquitetura de telas atual, apenas modernizar componentes dentro delas
- Novos recursos ou funcionalidades — foco exclusivo em padronização visual do existente
- Otimizações de performance — não é objetivo primário (bundle size, renderização)
- Alterações no backend Python — apenas frontend (Electron/React)
- Modificações em lógica de negócio — UI/UX pura, sem mexer em agentes, spec pipeline, workspace logic

## Context

**Referência UI/UX:**
- Arquivo: `/Users/guilhermevarela/Documents/Projetos/Auto-Claude/ui.md`
- Contém: Sistema completo de UI/UX do 1Code Desktop (Radix UI + Tailwind v4 + Motion + tokens CSS)
- Tecnologias: React 19.2.1, TypeScript 5.4.5, Tailwind CSS 3.4.17 (base para upgrade para 4.1.17), Radix UI, Motion
- Design tokens: Cores HSL, sistema de tipografia, espaçamento, animações

**Codebase existente:**
- Mapeamento completo em `.planning/codebase/` (STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md)
- Frontend: `apps/frontend/` com 80+ componentes React
- Stack atual já tem Radix UI e Tailwind CSS 4.1.17, facilitando migração
- Convenções: i18n obrigatório (react-i18next), PascalCase para componentes, Biome para linting

**Motivação:**
- Eliminar inconsistências visuais entre diferentes partes do app
- Aplicar design moderno e profissional
- Aproveitar componentes acessíveis do Radix UI
- Criar base sólida para futuras evoluções visuais

## Constraints

- **i18n obrigatório**: Todos os componentes novos/modificados devem suportar internacionalização completa (português e francês) via react-i18next, conforme convenções existentes
- **Compatibilidade de stack**: Manter versões atuais - Electron 39.2.7, React 19.2.3, Tailwind CSS 4.1.17, Node.js 24+
- **Migração incremental**: Componentes devem ser substituídos gradualmente sem quebrar funcionalidades existentes
- **Cross-platform**: Componentes devem funcionar em Windows, macOS, Linux (requisito existente do Auto-Claude)
- **Design tokens centralizados**: Todo o sistema de cores, tipografia, espaçamento deve vir de tokens CSS reutilizáveis

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migração incremental vs. big bang | Manter app funcionando durante toda a modernização; reduzir risco de regressões | — Pending |
| Radix UI + Tailwind v4 + Motion | Stack do ui.md já alinhado com stack atual do Auto-Claude; aproveitar investimento existente | — Pending |
| Consistência visual como core value | Eliminar inconsistências é mais valioso que features novas no curto prazo | — Pending |
| Manter layouts atuais | Focar em polimento visual, não em redesign de UX/fluxos; reduzir escopo e risco | — Pending |

---
*Last updated: 2026-01-20 after initialization*
