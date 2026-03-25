import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FabWidget } from '@/core/widgets/FabWidget.js';

describe('FabWidget', () => {
  let fab: FabWidget;

  beforeEach(() => {
    fab = new FabWidget();
  });

  afterEach(() => {
    fab.destroy();
  });

  it('create() returns element with correct classes and ARIA attributes', () => {
    const el = fab.create();
    expect(el.className).toBe('fillkit-fab-container');

    const button = el.querySelector('.fillkit-fab');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('role')).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe(
      'Show FillKit widget (Alt+H)'
    );
    expect(button?.getAttribute('title')).toBe('Show FillKit widget (Alt+H)');
  });

  it('create() starts hidden', () => {
    const el = fab.create();
    expect(el.style.display).toBe('none');
  });

  it('show() makes the container visible', () => {
    const el = fab.create();
    document.body.appendChild(el);

    fab.show();
    expect(el.style.display).toBe('');

    el.remove();
  });

  it('hide() hides the container', () => {
    const el = fab.create();
    document.body.appendChild(el);

    fab.show();
    fab.hide();
    expect(el.style.display).toBe('none');

    el.remove();
  });

  it('click dispatches fillkit:restoreWidget event', () => {
    const el = fab.create();
    document.body.appendChild(el);

    const handler = vi.fn();
    document.addEventListener('fillkit:restoreWidget', handler);

    const button = el.querySelector('.fillkit-fab') as HTMLElement;
    button.click();

    expect(handler).toHaveBeenCalledTimes(1);

    document.removeEventListener('fillkit:restoreWidget', handler);
    el.remove();
  });

  it('destroy() removes DOM element and cleans up', () => {
    const el = fab.create();
    document.body.appendChild(el);

    expect(document.querySelector('.fillkit-fab-container')).not.toBeNull();

    fab.destroy();

    expect(document.querySelector('.fillkit-fab-container')).toBeNull();
  });

  it('destroy() is safe to call multiple times', () => {
    fab.create();
    fab.destroy();
    expect(() => fab.destroy()).not.toThrow();
  });
});
