/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { applyThemeVariables, removeThemeVariables } from '../theme-apply';

describe('theme-apply', () => {
  it('applies and removes inline theme variables', () => {
    const root = document.documentElement;

    applyThemeVariables({
      '--background': '0 0% 100%',
      '--primary': '228 100% 50%'
    }, root);

    expect(root.style.getPropertyValue('--background')).toBe('0 0% 100%');
    expect(root.style.getPropertyValue('--primary')).toBe('228 100% 50%');

    removeThemeVariables(root);

    expect(root.style.getPropertyValue('--background')).toBe('');
    expect(root.style.getPropertyValue('--primary')).toBe('');
  });
});

