import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import type { ExternalThemeData, ExternalThemeInfo, ExternalThemeSource } from '../../shared/types';

interface PackageThemeContribution {
  label?: string;
  uiTheme?: string;
  path?: string;
}

function parseJsonLoose(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    // Best-effort parsing for theme files that include comments/trailing commas.
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const withoutTrailingCommas = withoutComments
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(withoutTrailingCommas);
  }
}

function getThemeTypeFromUiTheme(uiTheme?: string): 'light' | 'dark' {
  const value = (uiTheme ?? '').toLowerCase();
  if (value.includes('light')) return 'light';
  return 'dark';
}

function getExtensionDirectories(baseDir: string): string[] {
  if (!existsSync(baseDir)) {
    return [];
  }

  return readdirSync(baseDir)
    .map((name) => path.join(baseDir, name))
    .filter((fullPath) => existsSync(fullPath) && existsSync(path.join(fullPath, 'package.json')));
}

function getThemeBaseDirs(): Array<{ source: ExternalThemeSource; dir: string }> {
  const home = os.homedir();
  return [
    { source: 'vscode', dir: path.join(home, '.vscode', 'extensions') },
    { source: 'cursor', dir: path.join(home, '.cursor', 'extensions') },
    { source: 'windsurf', dir: path.join(home, '.windsurf', 'extensions') }
  ];
}

export function scanExternalThemes(): ExternalThemeInfo[] {
  const discovered: ExternalThemeInfo[] = [];
  const seenPaths = new Set<string>();

  for (const { source, dir } of getThemeBaseDirs()) {
    for (const extensionDir of getExtensionDirectories(dir)) {
      const packagePath = path.join(extensionDir, 'package.json');
      try {
        const packageJson = parseJsonLoose(readFileSync(packagePath, 'utf-8'));
        const extensionName = typeof packageJson.name === 'string'
          ? packageJson.name
          : path.basename(extensionDir);
        const contributes = packageJson.contributes as { themes?: PackageThemeContribution[] } | undefined;
        const themes = contributes?.themes ?? [];

        for (const theme of themes) {
          if (!theme.path) continue;
          const themePath = path.resolve(extensionDir, theme.path);
          if (!existsSync(themePath) || seenPaths.has(themePath)) continue;
          seenPaths.add(themePath);

          const label = theme.label || path.basename(theme.path, path.extname(theme.path));
          discovered.push({
            id: `${source}:${extensionName}:${label}`,
            name: label,
            path: themePath,
            source,
            type: getThemeTypeFromUiTheme(theme.uiTheme)
          });
        }
      } catch {
        // Ignore broken extension metadata and continue scanning.
      }
    }
  }

  return discovered.sort((a, b) => a.name.localeCompare(b.name));
}

function detectThemeTypeFromColors(colors: Record<string, string>): 'light' | 'dark' {
  const bg = (colors['editor.background'] || '').trim();
  const normalized = bg.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 'dark';
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance >= 0.55 ? 'light' : 'dark';
}

export function loadExternalTheme(theme: ExternalThemeInfo): ExternalThemeData {
  const content = readFileSync(theme.path, 'utf-8');
  const parsed = parseJsonLoose(content);
  const colors = (parsed.colors ?? {}) as Record<string, string>;

  return {
    id: theme.id,
    name: theme.name,
    source: theme.source,
    type: theme.type ?? detectThemeTypeFromColors(colors),
    colors
  };
}

