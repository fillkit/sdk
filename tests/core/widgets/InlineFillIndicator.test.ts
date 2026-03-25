import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InlineFillIndicator } from '@/core/widgets/InlineFillIndicator.js';

function createInput(
  type = 'text',
  attrs?: Record<string, string>
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      input.setAttribute(k, v);
    }
  }
  document.body.appendChild(input);
  return input;
}

function findIcons(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.fillkit-inline-fill-btn')
  );
}

describe('InlineFillIndicator', () => {
  let indicator: InlineFillIndicator;

  beforeEach(() => {
    indicator = new InlineFillIndicator();
  });

  afterEach(() => {
    indicator.destroy();
    // Clean up leftover DOM
    document
      .querySelectorAll('.fillkit-inline-fill-btn')
      .forEach(el => el.remove());
    document
      .querySelectorAll('input, textarea, select')
      .forEach(el => el.remove());
  });

  describe('activation', () => {
    it('activate() creates icons for existing eligible fields', () => {
      const input = createInput('text');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
      input.remove();
    });

    it('activate() creates icons for multiple fields', () => {
      const i1 = createInput('text');
      const i2 = createInput('email');
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);

      indicator.activate();
      expect(findIcons()).toHaveLength(3);

      i1.remove();
      i2.remove();
      ta.remove();
    });

    it('icons start hidden (no .visible class)', () => {
      createInput('text');
      indicator.activate();
      const icons = findIcons();
      expect(icons[0].classList.contains('visible')).toBe(false);
    });

    it('deactivate() removes all icons', () => {
      createInput('text');
      createInput('email');
      indicator.activate();
      expect(findIcons()).toHaveLength(2);

      indicator.deactivate();
      expect(findIcons()).toHaveLength(0);
    });

    it('destroy() removes all icons', () => {
      createInput('text');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);

      indicator.destroy();
      expect(findIcons()).toHaveLength(0);
    });

    it('double activate() is a no-op', () => {
      createInput('text');
      indicator.activate();
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
    });

    it('deactivate() then activate() re-creates icons', () => {
      createInput('text');
      indicator.activate();
      indicator.deactivate();
      expect(findIcons()).toHaveLength(0);

      indicator.activate();
      expect(findIcons()).toHaveLength(1);
    });
  });

  describe('field filtering', () => {
    it('creates icon for input[type="text"]', () => {
      createInput('text');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
    });

    it('creates icon for input[type="email"]', () => {
      createInput('email');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
    });

    it('creates icon for input[type="password"]', () => {
      createInput('password');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
    });

    it('creates icon for textarea', () => {
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      indicator.activate();
      expect(findIcons()).toHaveLength(1);
      ta.remove();
    });

    it('does NOT create icon for input[type="hidden"]', () => {
      createInput('hidden');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="submit"]', () => {
      createInput('submit');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="checkbox"]', () => {
      createInput('checkbox');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="radio"]', () => {
      createInput('radio');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="color"]', () => {
      createInput('color');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="range"]', () => {
      createInput('range');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input[type="file"]', () => {
      createInput('file');
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for select elements', () => {
      const select = document.createElement('select');
      document.body.appendChild(select);
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
      select.remove();
    });

    it('does NOT create icon for disabled input', () => {
      const input = createInput('text');
      input.disabled = true;
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for readonly input', () => {
      const input = createInput('text');
      input.readOnly = true;
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input with data-fillkit-ignore', () => {
      createInput('text', { 'data-fillkit-ignore': '' });
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
    });

    it('does NOT create icon for input inside .fillkit-widget-container', () => {
      const container = document.createElement('div');
      container.className = 'fillkit-widget-container';
      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);
      document.body.appendChild(container);

      indicator.activate();
      expect(findIcons()).toHaveLength(0);

      container.remove();
    });

    it('does NOT create icon for div (non-form element)', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      indicator.activate();
      expect(findIcons()).toHaveLength(0);
      div.remove();
    });
  });

  describe('focus does not reveal icons', () => {
    it('focus on tracked field does NOT reveal its icon', () => {
      const input = createInput('text');
      indicator.activate();
      const icon = findIcons()[0];

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(icon.classList.contains('visible')).toBe(false);
    });
  });

  describe('click behavior', () => {
    it('click on icon dispatches fillkit:fillInput with correct field', () => {
      const input = createInput('text');
      input.name = 'test-field';
      indicator.activate();
      const icon = findIcons()[0];

      const handler = vi.fn();
      document.addEventListener('fillkit:fillInput', handler);

      icon.click();

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.input).toBe(input);

      document.removeEventListener('fillkit:fillInput', handler);
    });

    it('multiple clicks dispatch multiple fill events (re-randomize)', () => {
      createInput('text');
      indicator.activate();
      const icon = findIcons()[0];

      const handler = vi.fn();
      document.addEventListener('fillkit:fillInput', handler);

      icon.click();
      icon.click();
      icon.click();

      expect(handler).toHaveBeenCalledTimes(3);

      document.removeEventListener('fillkit:fillInput', handler);
    });

    it('mousedown on icon calls preventDefault (preserves field focus)', () => {
      createInput('text');
      indicator.activate();
      const icon = findIcons()[0];

      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(mousedownEvent, 'preventDefault');
      icon.dispatchEvent(mousedownEvent);

      expect(preventSpy).toHaveBeenCalledTimes(1);
    });

    it('each field icon dispatches fill for the correct field', () => {
      const input1 = createInput('text');
      input1.name = 'field1';
      const input2 = createInput('email');
      input2.name = 'field2';

      indicator.activate();
      const icons = findIcons();

      const handler = vi.fn();
      document.addEventListener('fillkit:fillInput', handler);

      icons[0].click();
      expect((handler.mock.calls[0][0] as CustomEvent).detail.input).toBe(
        input1
      );

      icons[1].click();
      expect((handler.mock.calls[1][0] as CustomEvent).detail.input).toBe(
        input2
      );

      document.removeEventListener('fillkit:fillInput', handler);
    });
  });

  describe('DOM changes (MutationObserver)', () => {
    it('adds icon for dynamically inserted field', async () => {
      indicator.activate();
      expect(findIcons()).toHaveLength(0);

      const input = createInput('text');

      // Wait for MutationObserver debounce
      await vi.waitFor(() => expect(findIcons()).toHaveLength(1), {
        timeout: 300,
      });

      input.remove();
    });

    it('removes orphaned icon when field is removed from DOM', async () => {
      const input = createInput('text');
      indicator.activate();
      expect(findIcons()).toHaveLength(1);

      input.remove();

      // Wait for MutationObserver debounce
      await vi.waitFor(() => expect(findIcons()).toHaveLength(0), {
        timeout: 300,
      });
    });
  });

  describe('proximity detection', () => {
    it('mousemove near field reveals icon (within 50px radius)', () => {
      vi.useFakeTimers();
      const input = createInput('text');

      vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 300,
        top: 100,
        bottom: 130,
        width: 200,
        height: 30,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      indicator.activate();
      const icon = findIcons()[0];

      // Move mouse near the field (within 50px)
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 310,
          clientY: 115,
          bubbles: true,
        })
      );

      // Trigger rAF
      vi.advanceTimersByTime(16);

      expect(icon.classList.contains('visible')).toBe(true);

      vi.useRealTimers();
    });

    it('mousemove far from field does not reveal icon', () => {
      vi.useFakeTimers();
      const input = createInput('text');

      vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 300,
        top: 100,
        bottom: 130,
        width: 200,
        height: 30,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      indicator.activate();
      const icon = findIcons()[0];

      // Move mouse far from the field (>50px away)
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 500,
          bubbles: true,
        })
      );

      vi.advanceTimersByTime(16);

      expect(icon.classList.contains('visible')).toBe(false);

      vi.useRealTimers();
    });

    it('icon hides after cursor leaves proximity + HIDE_DELAY', () => {
      vi.useFakeTimers();
      const input = createInput('text');

      vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 300,
        top: 100,
        bottom: 130,
        width: 200,
        height: 30,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      indicator.activate();
      const icon = findIcons()[0];

      // Move near
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 310,
          clientY: 115,
          bubbles: true,
        })
      );
      vi.advanceTimersByTime(16);
      expect(icon.classList.contains('visible')).toBe(true);

      // Move far away
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 600,
          clientY: 600,
          bubbles: true,
        })
      );
      vi.advanceTimersByTime(16);

      // Still visible (HIDE_DELAY hasn't elapsed)
      expect(icon.classList.contains('visible')).toBe(true);

      // After HIDE_DELAY
      vi.advanceTimersByTime(300);
      expect(icon.classList.contains('visible')).toBe(false);

      vi.useRealTimers();
    });
  });
});
