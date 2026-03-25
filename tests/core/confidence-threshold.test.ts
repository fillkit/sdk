/**
 * Confidence Threshold Tests
 *
 * Tests that FillOrchestrator respects the minConfidence threshold
 * and fires the lowConfidence event for skipped fields.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillKit } from '@/index.js';

describe('Confidence Threshold', () => {
  let fk: FillKit;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('skips fields below the default confidence threshold (0.3)', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    // A bare input with only type="text" and a generic name has low confidence
    document.body.innerHTML = `
      <form>
        <input type="text" name="x" />
        <input type="email" name="email" />
      </form>`;

    await fk.autofillAll();

    const email = document.querySelector(
      'input[name="email"]'
    ) as HTMLInputElement;
    expect(email.value).not.toBe('');
  });

  it('fires lowConfidence event for fields below threshold', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
      autofill: {
        minConfidence: 0.99, // Very high threshold — only explicit types pass
      },
    });

    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
      </form>`;

    const handler = vi.fn();
    fk.on('lowConfidence', handler);

    await fk.autofillAll({ minConfidence: 0.99 });

    // email has confidence ~0.55 (type match 0.3 + name pattern 0.25)
    // which is below 0.99, so lowConfidence should fire
    expect(handler).toHaveBeenCalled();
    const data = handler.mock.calls[0][0] as Record<string, unknown>;
    expect(data).toHaveProperty('semanticType');
    expect(data).toHaveProperty('confidence');
  });

  it('fills fields when confidence meets threshold', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
      </form>`;

    await fk.autofillAll({ minConfidence: 0.3 });

    const email = document.querySelector(
      'input[name="email"]'
    ) as HTMLInputElement;
    expect(email.value).not.toBe('');
  });

  it('respects explicit data-fillkit-type even with high threshold', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    document.body.innerHTML = `
      <form>
        <input type="text" data-fillkit-type="email" />
      </form>`;

    await fk.autofillAll({ minConfidence: 0.99 });

    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.value).not.toBe('');
  });

  it('always fills select elements regardless of confidence threshold', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    document.body.innerHTML = `
      <form>
        <select name="subject">
          <option value="">Choose...</option>
          <option value="math">Math</option>
          <option value="science">Science</option>
          <option value="history">History</option>
        </select>
      </form>`;

    // Even with an impossibly high threshold, select should be filled
    await fk.autofillAll({ minConfidence: 0.99 });

    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).not.toBe('');
  });

  it('always fills textarea elements regardless of confidence threshold', async () => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    document.body.innerHTML = `
      <form>
        <textarea name="special_needs"></textarea>
      </form>`;

    // Even with an impossibly high threshold, textarea should be filled
    await fk.autofillAll({ minConfidence: 0.99 });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).not.toBe('');
  });
});
