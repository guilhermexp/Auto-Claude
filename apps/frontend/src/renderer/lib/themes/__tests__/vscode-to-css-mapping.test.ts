import { describe, expect, it } from 'vitest';
import {
  generateCSSVariables,
  getThemeTypeFromColors,
  hexToHslTriplet,
  isLightColor
} from '../vscode-to-css-mapping';

describe('vscode-to-css-mapping', () => {
  it('converts hex colors to HSL triplets', () => {
    expect(hexToHslTriplet('#ffffff')).toBe('0 0% 100%');
    expect(hexToHslTriplet('#000000')).toBe('0 0% 0%');
    expect(hexToHslTriplet('#0034ff')).toBe('228 100% 50%');
  });

  it('composites hex colors with alpha channel against a base color', () => {
    // White with ~7.5% alpha over dark base should remain a dark/muted tone, not bright white.
    expect(hexToHslTriplet('#E4E4E413', '#181818')).toBe('0 0% 15%');
  });

  it('detects light and dark colors', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#0a0e27')).toBe(false);
  });

  it('generates css variables from vscode-style colors', () => {
    const variables = generateCSSVariables({
      'editor.background': '#ffffff',
      'editor.foreground': '#0a0e27',
      'button.background': '#0034ff',
      'button.foreground': '#ffffff',
      'panel.border': '#e5e7eb'
    });

    expect(variables['--background']).toBe('0 0% 100%');
    expect(variables['--foreground']).toBe('232 59% 10%');
    expect(variables['--primary']).toBe('228 100% 50%');
    expect(variables['--primary-foreground']).toBe('0 0% 100%');
    expect(variables['--border']).toBe('220 13% 91%');
  });

  it('resolves theme type from background colors', () => {
    expect(getThemeTypeFromColors({ 'editor.background': '#ffffff' })).toBe('light');
    expect(getThemeTypeFromColors({ 'editor.background': '#111111' })).toBe('dark');
  });
});
