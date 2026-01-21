# Roadmap: Auto-Claude UI/UX Modernization

**Project:** Modernização completa do design system do Auto-Claude
**Core Value:** Consistência visual em todo o app
**Approach:** Migração incremental mantendo funcionalidades

---

## Phase 1: Design Tokens Foundation ✅
**Goal:** Criar sistema de tokens CSS centralizados com cores HSL

**What we built:**
- Arquivo de tokens CSS com paleta de cores HSL do ui.md (primary, secondary, accent, neutral, semantic)
- CSS variables para cores, sombras, bordas
- Sistema de temas base (light/dark)
- Configuração Tailwind para usar tokens

**Why this phase:**
Foundation para todas as outras fases - define a linguagem visual base

**Dependencies:** None
**Research needed:** No

**Status:** ✅ Complete
**Completed:** 2026-01-21
**Key achievements:**
- Reduced globals.css from 1711 to 906 lines (47% reduction)
- Simplified from 7 themes to 2 (light/dark base)
- 50+ HSL color tokens documented
- Zero breaking changes for existing components

---

## Phase 2: Typography System ✅
**Goal:** Implementar sistema de tipografia padronizado

**What we built:**
- Tokens de tipografia (font families, sizes, weights, line heights)
- Classes utilitárias Tailwind para tipografia
- Componentes Text/Heading com variantes
- Documentação completa (TYPOGRAPHY.md)

**Why this phase:**
Tipografia consistente é essencial para identidade visual profissional

**Dependencies:** Phase 1 (tokens foundation)
**Research needed:** No

**Status:** ✅ Complete
**Completed:** 2026-01-21
**Key achievements:**
- 22 typography tokens (9 sizes, 4 weights, 3 line heights)
- Text and Heading components with type-safe APIs
- 231-line comprehensive documentation
- Zero breaking changes for existing components

---

## Phase 3: Spacing & Layout System
**Goal:** Aplicar tokens de espaçamento em toda a aplicação

**What we'll build:**
- Escala de espaçamento padronizada (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- Tokens para margins, paddings, gaps
- Sistema de grid e layout utilities
- Refatoração de componentes para usar spacing tokens

**Why this phase:**
Espaçamento consistente cria hierarquia visual clara e ritmo visual harmonioso

**Dependencies:** Phase 1 (tokens foundation)
**Research needed:** No

---

## Phase 4: Core UI Components - Forms
**Goal:** Modernizar componentes de formulários com Radix UI

**What we'll build:**
- Button (variantes: primary, secondary, ghost, destructive)
- Input (text, number, email, password com estados de validação)
- Checkbox com estado indeterminate
- Radio Group com orientação horizontal/vertical
- Switch com label e descrição
- Textarea com resize control
- Form Field wrapper com label, error, hint

**Why this phase:**
Componentes de formulário são os mais usados - impacto visual imediato

**Dependencies:** Phases 1-3 (tokens, typography, spacing)
**Research needed:** No

---

## Phase 5: Core UI Components - Overlays
**Goal:** Modernizar componentes de overlay com Radix UI

**What we'll build:**
- Dialog/Modal com header, content, footer
- Tooltip com posicionamento inteligente
- Dropdown Menu com submenus
- Select com search e múltipla seleção
- Popover para contextos complexos
- Alert Dialog para ações destrutivas

**Why this phase:**
Overlays são críticos para UX - precisam de animações suaves e acessibilidade

**Dependencies:** Phases 1-4
**Research needed:** No

---

## Phase 6: Core UI Components - Navigation
**Goal:** Modernizar componentes de navegação

**What we'll build:**
- Tabs (horizontal/vertical) com indicador animado
- Navigation Menu com submenus
- Breadcrumbs com separadores customizáveis
- Pagination com ellipsis
- Sidebar com collapse/expand

**Why this phase:**
Navegação clara facilita descoberta de funcionalidades

**Dependencies:** Phases 1-4
**Research needed:** No

---

## Phase 7: Motion & Animation System
**Goal:** Integrar Framer Motion para animações suaves

**What we'll build:**
- Tokens de animação (durations, easings)
- Animações para transições de páginas
- Animações para modais (scale + fade)
- Animações para toasts (slide + fade)
- Hover states animados para interações
- Loading states com skeletons animados

**Why this phase:**
Animações criam sensação de fluidez e feedback visual imediato

**Dependencies:** Phases 1-6 (componentes base)
**Research needed:** No

---

## Phase 8: Dark Mode System
**Goal:** Aprimorar sistema de dark mode com tokens CSS

**What we'll build:**
- Tokens CSS para dark mode (override de cores)
- Toggle de tema (light/dark/system)
- Persistência de preferência do usuário
- Suporte a prefers-color-scheme
- Transição suave entre temas

**Why this phase:**
Dark mode é essencial para uso prolongado e conforto visual

**Dependencies:** Phase 1 (tokens foundation)
**Research needed:** No

---

## Phase 9: Component Migration Wave 1
**Goal:** Substituir 40+ componentes existentes com novos componentes

**What we'll build:**
- Migração gradual de componentes de features principais
- Substituição de 40-50 componentes antigos
- Testes de regressão visual
- Verificação de i18n em todos os componentes migrados

**Why this phase:**
Aplicar design system em componentes reais - impacto mensurável na consistência

**Dependencies:** Phases 1-8 (todos os componentes base)
**Research needed:** No

---

## Phase 10: Component Migration Wave 2 & Documentation
**Goal:** Completar migração e documentar biblioteca

**What we'll build:**
- Migração dos 40+ componentes restantes
- Storybook ou playground interno para componentes
- Documentação de uso para cada componente
- Guia de contribuição para novos componentes
- Audit final de consistência visual

**Why this phase:**
Completar migração e criar base sustentável para evolução futura

**Dependencies:** Phase 9 (primeira onda de migração)
**Research needed:** No

---

## Delivery Strategy

**Incremental rollout:** Cada fase entrega componentes funcionais que podem ser usados imediatamente

**Testing approach:**
- Unit tests (Vitest) para cada componente
- Visual regression testing para garantir consistência
- i18n validation em todos os componentes

**Risk mitigation:**
- Manter componentes antigos até migração completa
- Feature flags para habilitar novos componentes gradualmente
- Rollback fácil se necessário

---

*Roadmap created: 2026-01-21*
