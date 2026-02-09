import { VSCODE_TO_CSS_MAP } from './vscode-to-css-mapping';

/**
 * Apply CSS variable values directly to the root element.
 * Inline vars override stylesheet defaults without mutating global CSS files.
 */
export function applyThemeVariables(
  variables: Record<string, string>,
  element: HTMLElement = document.documentElement
): void {
  for (const [name, value] of Object.entries(variables)) {
    element.style.setProperty(name, value);
  }
}

/**
 * Remove previously applied imported-theme variables and restore stylesheet defaults.
 */
export function removeThemeVariables(
  element: HTMLElement = document.documentElement
): void {
  for (const variableName of Object.keys(VSCODE_TO_CSS_MAP)) {
    element.style.removeProperty(variableName);
  }
}

