# Typography System - Auto-Claude

Sistema de tipografia padronizado baseado no ui.md de referência, integrado com Tailwind CSS v4.

---

## Font Families

| Token | Value | Usage |
|-------|-------|-------|
| --font-sans | 'Inter', system fonts | Texto de corpo, UI geral |
| --font-mono | 'JetBrains Mono', 'Fira Code' | Código, terminal, dados técnicos |

**Tailwind classes:**
- `font-sans` → var(--font-sans)
- `font-mono` → var(--font-mono)

---

## Font Sizes

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| --text-xs | 0.75rem | 12px | Labels pequenos, timestamps |
| --text-sm | 0.875rem | 14px | Texto secundário, captions |
| --text-base | 1rem | 16px | Texto de corpo padrão |
| --text-lg | 1.125rem | 18px | Texto de destaque |
| --text-xl | 1.25rem | 20px | Subtítulos |
| --text-2xl | 1.5rem | 24px | Títulos de seção |
| --text-3xl | 1.875rem | 30px | Títulos principais |
| --text-4xl | 2.25rem | 36px | Hero titles |
| --text-5xl | 3rem | 48px | Display titles |

**Tailwind classes:**
- `text-xs` → var(--text-xs)
- `text-sm` → var(--text-sm)
- `text-base` → var(--text-base)
- etc.

---

## Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| --font-normal | 400 | Texto de corpo |
| --font-medium | 500 | Texto de destaque |
| --font-semibold | 600 | Títulos, labels importantes |
| --font-bold | 700 | Enfatizado, headings |

**Tailwind classes:**
- `font-normal` → var(--font-normal)
- `font-medium` → var(--font-medium)
- `font-semibold` → var(--font-semibold)
- `font-bold` → var(--font-bold)

---

## Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| --leading-tight | 1.25 | Headings, títulos |
| --leading-normal | 1.5 | Texto de corpo padrão |
| --leading-relaxed | 1.75 | Texto longo, parágrafos |

**Tailwind classes:**
- `leading-tight` → var(--leading-tight)
- `leading-normal` → var(--leading-normal)
- `leading-relaxed` → var(--leading-relaxed)

---

## Componentes Typography

### Text Component

Componente para texto de corpo com variantes.

**Props:**
- `size`: 'xs' | 'sm' | 'base' | 'lg' | 'xl' (default: 'base')
- `weight`: 'normal' | 'medium' | 'semibold' | 'bold' (default: 'normal')
- `leading`: 'tight' | 'normal' | 'relaxed' (default: 'normal')
- `color`: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'destructive' (default: 'default')
- `asChild`: boolean (composição com Slot)

**Exemplos:**
```tsx
import { Text } from '@/renderer/components/ui/Text';

// Texto de corpo padrão
<Text>Este é um texto de corpo padrão</Text>

// Texto pequeno com peso médio
<Text size="sm" weight="medium">Texto de destaque</Text>

// Texto muted com line height relaxed
<Text color="muted" leading="relaxed">
  Texto secundário com espaçamento maior
</Text>

// Usando asChild para composição
<Text asChild size="lg" weight="bold">
  <a href="#">Link estilizado como texto</a>
</Text>
```

### Heading Component

Componente para títulos com níveis semânticos.

**Props:**
- `level`: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' (default: 'h2')
- `weight`: 'medium' | 'semibold' | 'bold' (default: 'semibold')
- `color`: 'default' | 'muted' | 'primary' (default: 'default')
- `as`: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' (override do elemento)
- `asChild`: boolean (composição com Slot)

**Exemplos:**
```tsx
import { Heading } from '@/renderer/components/ui/Heading';

// Título h1
<Heading level="h1">Título Principal</Heading>

// Título h2 com cor primary
<Heading level="h2" color="primary">Seção Importante</Heading>

// Título h3 com peso bold
<Heading level="h3" weight="bold">Subtítulo Destacado</Heading>

// Usar estilo de h2 mas renderizar como h3 (para SEO)
<Heading level="h2" as="h3">Título com estilo maior</Heading>
```

---

## Uso com Tailwind Direto

Para casos onde componentes não são necessários:

```tsx
// Texto de corpo
<p className="text-base font-normal leading-normal text-foreground">
  Texto padrão
</p>

// Título
<h2 className="text-3xl font-semibold leading-tight text-foreground">
  Título
</h2>

// Código
<code className="font-mono text-sm">npm install</code>
```

---

## Hierarquia Tipográfica Sugerida

| Elemento | Componente | Uso |
|----------|------------|-----|
| Page Title | Heading level="h1" | Título da página principal |
| Section Title | Heading level="h2" | Títulos de seções |
| Subsection Title | Heading level="h3" | Subtítulos |
| Card Title | Heading level="h4" | Títulos de cards |
| Body Text | Text size="base" | Texto de corpo |
| Caption | Text size="sm" color="muted" | Legendas, texto secundário |
| Label | Text size="sm" weight="medium" | Labels de formulário |
| Code | font-mono text-sm | Código inline ou blocos |

---

## Migração de Componentes Existentes

**Antes (estilo inline):**
```tsx
<p className="text-sm text-muted-foreground">Texto secundário</p>
```

**Depois (com componente):**
```tsx
<Text size="sm" color="muted">Texto secundário</Text>
```

**Benefícios:**
- Menos classes Tailwind repetidas
- Consistência automática via variantes
- Mais fácil de refatorar globalmente
- Type-safety com TypeScript

---

## Acessibilidade

**Contrast Ratios:**
- text-foreground sobre background: ~16:1 (AAA)
- text-muted-foreground sobre background: ~7:1 (AA)

**Semantic HTML:**
- Use Heading com níveis corretos (h1-h6) para hierarquia
- Não pule níveis (h1 → h3 ❌)
- Use Text com elemento apropriado (p, span, div)

**Font Sizes:**
- Mínimo recomendado: text-sm (14px)
- Corpo de texto: text-base (16px)
- Nunca use text-xs para texto longo

---

## Próximas Fases

Com o sistema de tipografia estabelecido, próximas fases podem:

1. **Phase 03**: Spacing & Layout
   - Aplicar espaçamento consistente entre elementos tipográficos
   - Margin/padding scales

2. **Phase 04-06**: Component Modernization
   - Migrar componentes existentes para usar Text/Heading
   - Aplicar hierarquia tipográfica consistente

3. **Phase 07**: Motion & Animations
   - Adicionar transições suaves em text color changes
   - Fade-in animations para títulos

---

*Typography system documentation - Phase 02*
*Created: 2026-01-21*
