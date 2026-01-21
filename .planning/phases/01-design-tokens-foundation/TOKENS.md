# Design Tokens - Auto-Claude

Sistema centralizado de design tokens usando valores HSL para máxima flexibilidade e consistência visual.

## Visão Geral

Este sistema de tokens CSS utiliza:
- **HSL (Hue, Saturation, Lightness)** para todas as cores
- **Dois temas base**: Light e Dark
- **CSS Variables** para fácil customização
- **Tailwind CSS v4** com configuração inline via `@theme`

## Cores (HSL System)

### Cores Base

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--background` | `0 0% 100%` | `240 10% 3.9%` | Background principal |
| `--foreground` | `240 10% 3.9%` | `240 4.8% 95.9%` | Texto principal |
| `--card` | `0 0% 100%` | `240 10% 3.9%` | Background de cards |
| `--card-foreground` | `240 10% 3.9%` | `0 0% 98%` | Texto em cards |
| `--popover` | `0 0% 100%` | `0 0% 9%` | Popovers e dropdowns |
| `--popover-foreground` | `240 10% 3.9%` | `0 0% 98%` | Texto em popovers |

### Cores de Marca

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--primary` | `228 100% 50%` | `228 100% 50%` | Cor de marca/ações principais |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Texto sobre primary |

### Cores Secundárias e Estados

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--secondary` | `240 4.8% 95.9%` | `240 3.7% 15.9%` | Elementos secundários |
| `--secondary-foreground` | `240 5.9% 10%` | `0 0% 98%` | Texto em secondary |
| `--muted` | `240 4.8% 95.9%` | `240 5.9% 10%` | Texto desabilitado, placeholder |
| `--muted-foreground` | `240 3.8% 46.1%` | `240 4.4% 58%` | Texto muted |
| `--accent` | `240 4.8% 95.9%` | `240 5.9% 10%` | Hover states, highlights |
| `--accent-foreground` | `240 5.9% 10%` | `0 0% 98%` | Texto em accent |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Ações destrutivas, erros |
| `--destructive-foreground` | `0 0% 98%` | `0 0% 98%` | Texto em destructive |

### Cores Semânticas

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--success` | `142 76% 36%` | `142 71% 45%` | Sucesso, aprovação |
| `--success-foreground` | `0 0% 100%` | `0 0% 98%` | Texto em success |
| `--warning` | `48 96% 53%` | `48 96% 53%` | Avisos, atenção |
| `--warning-foreground` | `240 10% 3.9%` | `240 10% 3.9%` | Texto em warning |
| `--info` | `221 83% 53%` | `221 83% 53%` | Informação |
| `--info-foreground` | `0 0% 100%` | `0 0% 98%` | Texto em info |

### Bordas e Inputs

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--border` | `240 5.9% 90%` | `240 3.7% 15.9%` | Bordas gerais |
| `--input` | `240 5.9% 90%` | `240 3.7% 15.9%` | Bordas de inputs |
| `--input-background` | `240 4.8% 95.9%` | `60 2% 18%` | Background de inputs |
| `--ring` | `228 100% 50%` | `228 100% 50%` | Focus ring |

### Sidebar

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--sidebar` | `0 0% 100%` | `240 10% 3.9%` | Background da sidebar |
| `--sidebar-foreground` | `240 10% 3.9%` | `240 4.8% 95.9%` | Texto na sidebar |

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius` | `0.5rem` (8px) | Base radius padrão |
| `--radius-sm` | `4px` | Small elements |
| `--radius-md` | `8px` | Medium elements |
| `--radius-lg` | `12px` | Large cards |
| `--radius-xl` | `16px` | Extra large |
| `--radius-2xl` | `20px` | 2X large |
| `--radius-3xl` | `24px` | 3X large |
| `--radius-full` | `9999px` | Pills, badges, círculos |

## Sombras

### Light Mode

| Token | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)` |
| `--shadow-focus` | `0 0 0 3px rgba(59, 130, 246, 0.2)` |

### Dark Mode

| Token | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.6)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.7)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.8)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.9)` |
| `--shadow-focus` | `0 0 0 2px rgba(59, 130, 246, 0.3)` |

## Uso no Tailwind CSS v4

O sistema usa Tailwind v4 com configuração inline via `@theme`:

```css
@theme {
  --color-primary: var(--primary);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... */
}
```

### Classes Disponíveis Automaticamente

```tsx
// Backgrounds
<div className="bg-primary">       {/* hsl(var(--primary)) */}
<div className="bg-background">    {/* hsl(var(--background)) */}
<div className="bg-card">          {/* hsl(var(--card)) */}

// Text Colors
<span className="text-foreground"> {/* hsl(var(--foreground)) */}
<span className="text-primary">    {/* hsl(var(--primary)) */}
<span className="text-muted-foreground"> {/* hsl(var(--muted-foreground)) */}

// Borders
<div className="border-border">    {/* hsl(var(--border)) */}
<div className="border-primary">   {/* hsl(var(--primary)) */}

// Semantic Colors
<div className="bg-success text-success-foreground">
<div className="bg-warning text-warning-foreground">
<div className="bg-destructive text-destructive-foreground">
```

## Adicionando Novos Temas

Para adicionar um tema customizado (ex: "ocean"):

### 1. Criar Seletor de Tema

```css
[data-theme="ocean"] {
  --primary: 221 83% 53%;           /* Blue */
  --background: 220 26% 14%;        /* Dark blue */
  --foreground: 0 0% 98%;           /* White */
  --card: 220 26% 18%;              /* Slightly lighter blue */
  --border: 220 20% 30%;            /* Border blue */
  /* ... outros tokens */
}
```

### 2. Aplicar no HTML/Body

```tsx
// No componente React
useEffect(() => {
  document.body.dataset.theme = "ocean";
}, []);

// Ou diretamente no HTML
<body data-theme="ocean">
```

### 3. Toggle Entre Temas

```tsx
const themes = ['light', 'dark', 'ocean'];
const [currentTheme, setCurrentTheme] = useState('light');

const toggleTheme = () => {
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  if (nextTheme === 'light') {
    document.body.classList.remove('dark');
    delete document.body.dataset.theme;
  } else if (nextTheme === 'dark') {
    document.body.classList.add('dark');
    delete document.body.dataset.theme;
  } else {
    document.body.classList.remove('dark');
    document.body.dataset.theme = nextTheme;
  }
  setCurrentTheme(nextTheme);
};
```

## Vantagens do Sistema HSL

### 1. Ajustes Dinâmicos

```css
/* Facilmente criar variantes de uma cor */
.hover-variant {
  background: hsl(var(--primary) / 0.8);  /* 80% opacity */
}

.lighten-variant {
  background: hsl(228 100% 70%);          /* Aumentar lightness */
}

.darken-variant {
  background: hsl(228 100% 30%);          /* Reduzir lightness */
}
```

### 2. Manipulação com CSS `calc()`

```css
/* Criar gradientes programaticamente */
.gradient-bg {
  background: linear-gradient(
    90deg,
    hsl(var(--primary)),
    hsl(calc(228 + 30) 100% 50%)  /* Shift hue */
  );
}
```

### 3. Acessibilidade

```css
/* Garantir contraste adequado */
:root {
  --text-on-primary: 0 0% 100%;  /* Branco para contraste máximo */
}

.dark {
  --text-on-primary: 0 0% 100%;  /* Ainda branco no dark mode */
}
```

## Migrando Componentes Existentes

Os componentes existentes continuam funcionando pois mantemos:

### ✅ Compatibilidade Garantida

- **Mesmas variáveis CSS** (`--primary`, `--background`, etc)
- **Mesmo mapeamento** no `@theme` do Tailwind
- **Mesmas classes** utilitárias (`bg-primary`, `text-foreground`)

### 🔄 Mudança Interna

A única mudança é **interna**: valores agora são HSL puros ao invés de HEX/RGB.

```css
/* Antes (HEX) */
--primary: #D6D876;

/* Agora (HSL) */
--primary: 228 100% 50%;
```

### 📝 Exemplo de Migração

```tsx
// Componente NÃO precisa mudar
export function Button() {
  return (
    <button className="bg-primary text-primary-foreground">
      Click Me
    </button>
  );
}

// Continua funcionando perfeitamente!
```

## UI Scale System

O sistema suporta escala de UI de 75% a 200%:

```tsx
// Aplicar escala global
document.documentElement.setAttribute('data-ui-scale', '125'); // 125%

// Disponível de 75 a 200 em incrementos de 5
// [75, 80, 85, 90, 95, 100, 105, ..., 195, 200]
```

Todos os elementos usando `rem` escalam automaticamente.

## Utilitários Customizados Preservados

Todos os utilitários customizados foram preservados:

- ✅ Card styles (`.card-surface`, `.card-interactive`)
- ✅ Task Card animations (`.task-card-glow`, `.task-running-pulse`)
- ✅ Progress animations (`.progress-working`, `.progress-animated-fill`)
- ✅ Drag and drop styles (`.drag-overlay-card`, `.drop-zone-highlight`)
- ✅ Kanban column colors (`.column-backlog`, `.column-done`)
- ✅ Electron utilities (`.electron-drag`, `.electron-no-drag`)
- ✅ Scrollbar customizado
- ✅ Focus ring styles
- ✅ UI scale system (75%-200%)

## Próximos Passos

Este sistema de tokens é a **foundation** para as próximas fases:

1. **Fase 02**: Typography System
2. **Fase 03**: Spacing & Layout
3. **Fase 04**: Component Modernization
4. **Fase 05**: Motion & Animations

Todos os componentes futuros usarão estes tokens como base.
