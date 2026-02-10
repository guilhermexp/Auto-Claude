/**
 * VS Code theme color keys -> app CSS variable mapping.
 * Used to translate imported editor themes into UI tokens.
 */

export const VSCODE_TO_CSS_MAP: Record<string, string[]> = {
  '--background': ['editor.background', 'editorPane.background'],
  '--foreground': ['editor.foreground', 'foreground'],

  '--primary': ['button.background', 'focusBorder', 'textLink.foreground'],
  '--primary-foreground': ['button.foreground'],

  '--card': ['sideBar.background', 'panel.background', 'editor.background'],
  '--card-foreground': ['sideBar.foreground', 'foreground'],

  '--popover': ['dropdown.background', 'menu.background', 'editorWidget.background'],
  '--popover-foreground': ['dropdown.foreground', 'foreground'],

  '--secondary': ['button.secondaryBackground', 'tab.inactiveBackground'],
  '--secondary-foreground': ['button.secondaryForeground'],

  '--muted': ['tab.inactiveBackground', 'editorGroupHeader.tabsBackground'],
  '--muted-foreground': ['tab.inactiveForeground', 'descriptionForeground'],

  '--accent': ['list.hoverBackground', 'editor.selectionBackground'],

  '--border': ['panel.border', 'sideBar.border', 'input.border'],
  '--input': ['input.border', 'panel.border'],
  '--input-background': ['input.background'],

  '--ring': ['focusBorder', 'button.background'],

  '--destructive': ['errorForeground', 'editorError.foreground'],
  '--destructive-foreground': ['editorError.background'],

  '--success': ['terminal.ansiGreen', 'testing.iconPassed'],
  '--warning': ['terminal.ansiYellow', 'statusBarItem.warningBackground'],
  '--info': ['terminal.ansiBlue', 'activityBarBadge.background'],

  '--sidebar': ['sideBar.background', 'activityBar.background'],
  '--sidebar-foreground': ['sideBar.foreground', 'foreground']
};

interface ParsedHexColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseHexColor(input: string): ParsedHexColor | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    return null;
  }

  if (hex.length === 3) {
    const [r, g, b] = hex;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
      a: 1
    };
  }

  if (hex.length === 4) {
    const [r, g, b, a] = hex;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
      a: Number.parseInt(`${a}${a}`, 16) / 255
    };
  }

  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }

  if (hex.length === 8) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: Number.parseInt(hex.slice(6, 8), 16) / 255
    };
  }

  return null;
}

function compositeOverBase(fg: ParsedHexColor, base: ParsedHexColor): ParsedHexColor {
  const alpha = Math.max(0, Math.min(1, fg.a));
  return {
    r: Math.round(fg.r * alpha + base.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + base.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + base.b * (1 - alpha)),
    a: 1
  };
}

/**
 * Convert hex to HSL triplet string used by CSS vars, e.g. "240 10% 4%".
 */
export function hexToHslTriplet(hexColor: string, baseHexColor?: string): string {
  const parsed = parseHexColor(hexColor);
  if (!parsed) {
    return '0 0% 50%';
  }

  const color = parsed.a < 1
    ? compositeOverBase(parsed, parseHexColor(baseHexColor || '#111111') || { r: 17, g: 17, b: 17, a: 1 })
    : parsed;

  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  h = Math.round((h * 60 + 360) % 360);
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function isLightColor(hexColor: string): boolean {
  const parsed = parseHexColor(hexColor);
  if (!parsed) {
    return false;
  }

  const color = parsed.a < 1
    ? compositeOverBase(parsed, { r: 255, g: 255, b: 255, a: 1 })
    : parsed;

  const r = color.r;
  const g = color.g;
  const b = color.b;

  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance >= 0.55;
}

/**
 * Generate app CSS variables from a VS Code-like colors dictionary.
 */
export function generateCSSVariables(themeColors: Record<string, string>): Record<string, string> {
  const cssVariables: Record<string, string> = {};
  const baseBackground =
    themeColors['editor.background'] ??
    themeColors['editorPane.background'] ??
    themeColors['sideBar.background'] ??
    '#111111';

  for (const [cssVar, priorityKeys] of Object.entries(VSCODE_TO_CSS_MAP)) {
    const chosenKey = priorityKeys.find((key) => themeColors[key]);
    if (!chosenKey) continue;

    cssVariables[cssVar] = hexToHslTriplet(themeColors[chosenKey], baseBackground);
  }

  return cssVariables;
}

export function getThemeTypeFromColors(colors: Record<string, string>): 'light' | 'dark' {
  const bg =
    colors['editor.background'] ??
    colors['editorPane.background'] ??
    colors['sideBar.background'] ??
    '#111111';

  return isLightColor(bg) ? 'light' : 'dark';
}
