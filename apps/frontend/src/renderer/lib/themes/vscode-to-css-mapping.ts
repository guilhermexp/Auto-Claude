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

function normalizeHex(input: string): string | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    return null;
  }

  if (hex.length === 3 || hex.length === 4) {
    const [r, g, b] = hex;
    return `${r}${r}${g}${g}${b}${b}`;
  }

  if (hex.length === 6 || hex.length === 8) {
    return hex.slice(0, 6);
  }

  return null;
}

/**
 * Convert hex to HSL triplet string used by CSS vars, e.g. "240 10% 4%".
 */
export function hexToHslTriplet(hexColor: string): string {
  const normalized = normalizeHex(hexColor);
  if (!normalized) {
    return '0 0% 50%';
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

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
  const normalized = normalizeHex(hexColor);
  if (!normalized) {
    return false;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance >= 0.55;
}

/**
 * Generate app CSS variables from a VS Code-like colors dictionary.
 */
export function generateCSSVariables(themeColors: Record<string, string>): Record<string, string> {
  const cssVariables: Record<string, string> = {};

  for (const [cssVar, priorityKeys] of Object.entries(VSCODE_TO_CSS_MAP)) {
    const chosenKey = priorityKeys.find((key) => themeColors[key]);
    if (!chosenKey) continue;

    cssVariables[cssVar] = hexToHslTriplet(themeColors[chosenKey]);
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

