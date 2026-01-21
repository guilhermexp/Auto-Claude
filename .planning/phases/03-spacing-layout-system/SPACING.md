# Spacing & Layout System - Auto-Claude

Sistema de espaçamento padronizado e layout primitives baseados em escala de 4px, integrado com Tailwind CSS v4.

---

## Spacing Scale

Escala baseada em múltiplos de 4px para ritmo visual consistente.

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| --spacing-0 | 0 | 0px | Reset |
| --spacing-1 | 0.25rem | 4px | Micro spacing, borders |
| --spacing-2 | 0.5rem | 8px | Compact spacing |
| --spacing-3 | 0.75rem | 12px | Dense layouts |
| --spacing-4 | 1rem | 16px | Base spacing (default) |
| --spacing-5 | 1.25rem | 20px | Medium spacing |
| --spacing-6 | 1.5rem | 24px | Section spacing |
| --spacing-8 | 2rem | 32px | Large spacing |
| --spacing-10 | 2.5rem | 40px | Extra large spacing |
| --spacing-12 | 3rem | 48px | Section breaks |
| --spacing-16 | 4rem | 64px | Page sections |
| --spacing-20 | 5rem | 80px | Major sections |
| --spacing-24 | 6rem | 96px | Hero sections |

**Tailwind classes:**
- `p-4` → padding: var(--spacing-4) (16px)
- `m-8` → margin: var(--spacing-8) (32px)
- `gap-6` → gap: var(--spacing-6) (24px)
- `space-x-2` → horizontal spacing between children (8px)
- `space-y-4` → vertical spacing between children (16px)

---

## Container Widths

Responsive breakpoints para largura máxima de conteúdo.

| Token | Value | Usage |
|-------|-------|-------|
| --container-sm | 640px | Mobile landscape |
| --container-md | 768px | Tablet portrait |
| --container-lg | 1024px | Tablet landscape |
| --container-xl | 1280px | Desktop (default) |
| --container-2xl | 1536px | Large desktop |

**Tailwind classes:**
- `max-w-[640px]` → --container-sm
- `max-w-[1280px]` → --container-xl

---

## Layout Components

### Container Component

Componente para largura máxima responsiva com padding horizontal.

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' (default: 'xl')
- `padding`: 'none' | 'sm' | 'md' | 'lg' (default: 'sm')

**Exemplos:**
```tsx
import { Container } from '@/renderer/components/ui/Container';

// Container padrão (xl width, sm padding)
<Container>
  <h1>Conteúdo centralizado</h1>
</Container>

// Container full width sem padding
<Container size="full" padding="none">
  <div>Full bleed content</div>
</Container>

// Container pequeno com padding maior
<Container size="md" padding="lg">
  <form>...</form>
</Container>
```

---

### Stack Component

Componente para layouts flexbox com spacing consistente.

**Props:**
- `direction`: 'vertical' | 'horizontal' (default: 'vertical')
- `spacing`: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 (default: 4)
- `align`: 'start' | 'center' | 'end' | 'stretch' (default: 'stretch')
- `justify`: 'start' | 'center' | 'end' | 'between' | 'around' (default: 'start')
- `wrap`: true | false (default: false)

**Exemplos:**
```tsx
import { Stack } from '@/renderer/components/ui/Stack';

// Stack vertical com spacing padrão
<Stack>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Stack>

// Stack horizontal com items centralizados
<Stack direction="horizontal" align="center" justify="between">
  <button>Cancel</button>
  <button>Save</button>
</Stack>

// Stack vertical com spacing grande
<Stack spacing={8}>
  <section>Section 1</section>
  <section>Section 2</section>
</Stack>

// Stack horizontal com wrap
<Stack direction="horizontal" wrap spacing={4}>
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
  <Badge>Tag 3</Badge>
</Stack>
```

---

### Grid Component

Componente para CSS grid layouts.

**Props:**
- `cols`: 1 | 2 | 3 | 4 | 6 | 12 (default: 1)
- `gap`: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 (default: 4)
- `responsive`: true | false (default: false) - se true, usa 1 col mobile, 2 tablet, 3 desktop

**Exemplos:**
```tsx
import { Grid } from '@/renderer/components/ui/Grid';

// Grid de 3 colunas
<Grid cols={3} gap={6}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// Grid responsivo (1/2/3 cols)
<Grid responsive gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
  <Card>Item 4</Card>
</Grid>

// Grid de 12 colunas para layouts complexos
<Grid cols={12} gap={4}>
  <div className="col-span-8">Main content</div>
  <div className="col-span-4">Sidebar</div>
</Grid>
```

---

## Uso com Tailwind Direto

Para casos onde componentes não são necessários:

```tsx
// Padding e margin
<div className="p-4 m-8">
  Padding 16px, margin 32px
</div>

// Gap em flex
<div className="flex gap-6">
  <span>Item 1</span>
  <span>Item 2</span>
</div>

// Gap em grid
<div className="grid grid-cols-3 gap-4">
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>

// Space entre children
<div className="space-y-4">
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
</div>
```

---

## Padrões de Spacing

### Micro Spacing (1-3)
- Borders, icon-text gaps, tight layouts
- Ex: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px)

### Base Spacing (4-6)
- Default component spacing, form fields
- Ex: `gap-4` (16px), `p-4`, `m-6`

### Section Spacing (8-12)
- Between sections, cards, major elements
- Ex: `gap-8` (32px), `space-y-12` (48px)

### Page Spacing (16-24)
- Major page sections, hero areas
- Ex: `py-16` (64px), `mt-24` (96px)

---

## Composição de Layouts

**Antes (classes Tailwind inline):**
```tsx
<div className="flex flex-col gap-4 items-center justify-between">
  <h1 className="text-2xl">Title</h1>
  <p className="text-base">Content</p>
</div>
```

**Depois (com componentes):**
```tsx
<Stack spacing={4} align="center" justify="between">
  <Heading level="h2">Title</Heading>
  <Text>Content</Text>
</Stack>
```

**Benefícios:**
- Menos classes Tailwind repetidas
- Spacing consistente via variantes
- Mais fácil de refatorar globalmente
- Type-safety com TypeScript

---

## Hierarquia de Spacing Sugerida

| Elemento | Spacing | Componente | Uso |
|----------|---------|------------|-----|
| Page layout | 16-24 | Container | Wrapper de página |
| Sections | 12-16 | Stack spacing={12} | Entre seções principais |
| Cards/Blocks | 8 | Stack spacing={8} | Entre cards |
| Form fields | 6 | Stack spacing={6} | Entre inputs |
| Components | 4 | Stack spacing={4} | Dentro de componentes |
| Inline elements | 2-3 | Stack direction="horizontal" spacing={2} | Buttons, badges |
| Icon + text | 2 | gap-2 | Icons com labels |

---

## Acessibilidade

**Touch Targets:**
- Mínimo recomendado: 44x44px (spacing-11, não disponível → use p-3 = 12px padding = 44px total)
- Espaçamento entre botões: mínimo gap-2 (8px)

**Visual Hierarchy:**
- Maior spacing = maior separação conceitual
- Use spacing-8+ para separar seções distintas
- Use spacing-4-6 para agrupar elementos relacionados

**Responsive:**
- Container adapta automaticamente
- Stack/Grid funcionam em todos os tamanhos
- Use classes responsive quando necessário: `gap-4 md:gap-6 lg:gap-8`

---

## Migração de Componentes Existentes

**Passo 1: Identificar layouts repetidos**
```tsx
// ANTES: classes inline repetidas
<div className="flex flex-col gap-4">...</div>
<div className="flex flex-col gap-4">...</div>
```

**Passo 2: Substituir por Stack**
```tsx
// DEPOIS: componente reutilizável
<Stack spacing={4}>...</Stack>
<Stack spacing={4}>...</Stack>
```

**Passo 3: Aplicar Container onde apropriado**
```tsx
// ANTES: width management manual
<div className="max-w-[1280px] mx-auto px-4">...</div>

// DEPOIS: componente Container
<Container>...</Container>
```

---

## Próximas Fases

Com spacing e layout estabelecidos, próximas fases podem:

1. **Phase 04-06**: Component Modernization
   - Aplicar Container/Stack/Grid em componentes existentes
   - Garantir spacing consistente em toda UI

2. **Phase 07**: Motion & Animations
   - Adicionar transições em layout changes
   - Animações de entrada/saída

3. **Phase 08**: Dark Mode
   - Spacing permanece consistente em ambos os temas
   - Shadows já definidos por tema

---

*Spacing & Layout system documentation - Phase 03*
*Created: 2026-01-21*
