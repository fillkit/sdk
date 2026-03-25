import { describe, it, expect } from 'vitest';
import { generateStyles } from '@/core/widgets/styles.js';

describe('generateStyles', () => {
  const css = generateStyles();

  it('does NOT contain @layer fillkit', () => {
    expect(css).not.toContain('@layer fillkit');
  });

  it('contains :root variable declarations', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('--fk-bg:');
    expect(css).toContain('--fk-primary:');
  });

  it('contains dark mode variable declarations', () => {
    expect(css).toContain('html.dark');
    expect(css).not.toContain('html.dark :root');
  });

  it('contains core widget selectors', () => {
    expect(css).toContain('.fillkit-widget-container');
    expect(css).toContain('.fillkit-widget-btn');
    expect(css).toContain('.fillkit-widget');
    expect(css).toContain('.fillkit-options-sheet');
    expect(css).toContain('.fillkit-help-sheet');
  });

  it('contains FAB selectors', () => {
    expect(css).toContain('.fillkit-fab-container');
    expect(css).toContain('.fillkit-fab');
  });

  it('contains inline fill indicator selector', () => {
    expect(css).toContain('.fillkit-inline-fill-btn');
  });

  it('contains widget meta row selector', () => {
    expect(css).toContain('.fillkit-widget-meta');
  });
});
