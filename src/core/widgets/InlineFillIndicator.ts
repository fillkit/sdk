/**
 * Per-field inline fill indicator with proximity reveal.
 *
 * @remarks
 * Creates a hidden icon for each eligible form field. Icons fade in when the
 * cursor approaches a field (within {@link PROXIMITY_RADIUS} px) and fade out
 * after {@link HIDE_DELAY} ms once the cursor leaves proximity. Focus events
 * are intentionally ignored to prevent icon clutter during bulk fills.
 * Dispatches `fillkit:fillInput` on click, which is handled by
 * `UiEventBridge`. Supports multiple clicks to re-randomize values.
 *
 * Performance design:
 * - mousemove is rAF-throttled (at most 1 `checkProximity()` per frame)
 * - IntersectionObserver gates off-viewport fields out of the hot loop
 * - Field rects are cached on scroll/resize and reused in proximity checks
 * - CSS transitions use compositor-only properties (opacity, transform)
 */

import { FillKitIcons } from '../icons.js';
import { setSvgContent } from '../../utils/dom-helpers.js';

/** Input types that should NOT show the inline fill icon. */
const IGNORED_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'file',
  'image',
  'checkbox',
  'radio',
  'color',
  'range',
]);

/** Proximity radius in pixels — icon fades in when cursor is within this distance. */
const PROXIMITY_RADIUS = 50;

/** Delay before hiding icon after cursor leaves proximity (ms). */
const HIDE_DELAY = 300;

/** Debounce delay for MutationObserver-triggered field rescans (ms). */
const SCAN_DEBOUNCE = 100;

/** State tracked per field. */
interface FieldEntry {
  icon: HTMLElement;
  hideTimer: ReturnType<typeof setTimeout> | null;
  isNear: boolean;
  /** Whether the field is visible in the viewport (set by IntersectionObserver). */
  inViewport: boolean;
}

/**
 * Multi-icon inline fill indicator with proximity reveal.
 */
export class InlineFillIndicator {
  /** Map of tracked field -> entry state. */
  private fieldEntries: Map<HTMLElement, FieldEntry> = new Map();
  private active = false;

  // Observers
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  // Batched repositioning
  private repositionRafId: number | null = null;
  private scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Proximity tracking
  private readonly boundMouseMove: (e: MouseEvent) => void;
  private readonly boundScroll: () => void;
  private readonly boundResize: () => void;
  private mouseMoveRafId: number | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;

  /** Cached field rects — updated on scroll/resize, reused in proximity checks. */
  private fieldRects: Map<HTMLElement, DOMRect> = new Map();

  constructor() {
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundScroll = this.scheduleReposition.bind(this);
    this.boundResize = this.scheduleReposition.bind(this);
  }

  /**
   * Activates the indicator: scans for fields, creates icons, starts listeners.
   */
  activate(): void {
    if (this.active) return;
    this.active = true;

    this.setupIntersectionObserver();
    this.scanFields();
    this.setupMutationObserver();

    document.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('scroll', this.boundScroll, true);
    window.addEventListener('resize', this.boundResize);
  }

  /**
   * Deactivates the indicator: removes all icons, disconnects observers/listeners.
   */
  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    document.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('scroll', this.boundScroll, true);
    window.removeEventListener('resize', this.boundResize);

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.mouseMoveRafId !== null) {
      cancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = null;
    }

    if (this.repositionRafId !== null) {
      cancelAnimationFrame(this.repositionRafId);
      this.repositionRafId = null;
    }

    if (this.scanDebounceTimer !== null) {
      clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = null;
    }

    // Remove all icons and clear timers
    for (const [, entry] of this.fieldEntries) {
      if (entry.hideTimer !== null) clearTimeout(entry.hideTimer);
      entry.icon.remove();
    }
    this.fieldEntries.clear();
    this.fieldRects.clear();
  }

  /**
   * Full cleanup: alias for deactivate.
   */
  destroy(): void {
    this.deactivate();
  }

  // ── Field scanning ──────────────────────────────────────────────

  /**
   * Scans the DOM for eligible fields, attaches icons to new ones, removes orphans.
   */
  private scanFields(): void {
    const fields = document.querySelectorAll<HTMLElement>('input, textarea');
    const currentFields = new Set<HTMLElement>();

    fields.forEach(field => {
      if (!this.isRelevantField(field)) return;
      currentFields.add(field);

      // Already tracked — skip
      if (this.fieldEntries.has(field)) return;

      this.attachIcon(field);
    });

    // Clean up orphaned entries (fields removed from DOM or no longer relevant)
    for (const [field, entry] of this.fieldEntries) {
      if (!currentFields.has(field) || !document.body.contains(field)) {
        if (entry.hideTimer !== null) clearTimeout(entry.hideTimer);
        entry.icon.remove();
        if (this.intersectionObserver) {
          this.intersectionObserver.unobserve(field);
        }
        this.fieldEntries.delete(field);
        this.fieldRects.delete(field);
      }
    }
  }

  /**
   * Creates an icon for a field, appends it to body, starts observing visibility.
   */
  private attachIcon(field: HTMLElement): void {
    const icon = this.createIconElement(field);
    document.body.appendChild(icon);

    const entry: FieldEntry = {
      icon,
      hideTimer: null,
      isNear: false,
      inViewport: true, // assume visible until IO says otherwise
    };
    this.fieldEntries.set(field, entry);

    // Position immediately
    this.positionIcon(field, icon);

    // Observe the FIELD (not the icon) for viewport visibility
    this.observeFieldVisibility(field);
  }

  /**
   * Creates the icon button element for a field.
   */
  private createIconElement(field: HTMLElement): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'fillkit-inline-fill-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Fill this field with FillKit');
    btn.setAttribute('tabindex', '-1');
    setSvgContent(btn, FillKitIcons.brandSquare);

    // Prevent focus steal from the target field
    btn.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
    });

    btn.addEventListener('click', () => {
      this.dispatchFillEvent(field);
    });

    return btn;
  }

  // ── Positioning ─────────────────────────────────────────────────

  /**
   * Positions an icon to the right of its field, with inside-right fallback.
   */
  private positionIcon(field: HTMLElement, icon: HTMLElement): void {
    const rect = field.getBoundingClientRect();
    const iconSize = 28;
    const gap = 4;

    let left = rect.right + gap;
    const top = rect.top + (rect.height - iconSize) / 2;

    // Fall back to inside-right if icon would be off-screen
    if (left + iconSize > window.innerWidth) {
      left = rect.right - iconSize - gap;
    }

    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
  }

  /**
   * Positions an icon using a pre-computed rect (avoids extra getBoundingClientRect).
   */
  private positionIconFromRect(icon: HTMLElement, rect: DOMRect): void {
    const iconSize = 28;
    const gap = 4;

    let left = rect.right + gap;
    const top = rect.top + (rect.height - iconSize) / 2;

    if (left + iconSize > window.innerWidth) {
      left = rect.right - iconSize - gap;
    }

    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
  }

  /**
   * Batched rAF repositioning of all icons + rect cache update.
   */
  private scheduleReposition(): void {
    if (this.repositionRafId !== null) return;
    this.repositionRafId = requestAnimationFrame(() => {
      this.repositionRafId = null;
      this.fieldRects.clear();

      for (const [field, entry] of this.fieldEntries) {
        if (!document.body.contains(field)) {
          entry.icon.remove();
          if (entry.hideTimer !== null) clearTimeout(entry.hideTimer);
          if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(field);
          }
          this.fieldEntries.delete(field);
          continue;
        }

        // Skip off-viewport fields
        if (!entry.inViewport) continue;

        const rect = field.getBoundingClientRect();
        this.fieldRects.set(field, rect);
        this.positionIconFromRect(entry.icon, rect);
      }
    });
  }

  // ── Proximity detection ─────────────────────────────────────────

  private handleMouseMove(e: MouseEvent): void {
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    if (this.mouseMoveRafId !== null) return;
    this.mouseMoveRafId = requestAnimationFrame(() => {
      this.mouseMoveRafId = null;
      this.checkProximity();
    });
  }

  private checkProximity(): void {
    for (const [field, entry] of this.fieldEntries) {
      // Skip off-viewport fields
      if (!entry.inViewport) continue;

      const rect = this.fieldRects.get(field) ?? field.getBoundingClientRect();
      const dist = this.distanceToRect(this.lastMouseX, this.lastMouseY, rect);

      if (dist <= PROXIMITY_RADIUS) {
        if (!entry.isNear) this.revealIcon(field);
      } else {
        if (entry.isNear) {
          this.scheduleHideIcon(field);
        }
      }
    }
  }

  /** Point-to-rect distance (0 if inside rect). */
  private distanceToRect(x: number, y: number, rect: DOMRect): number {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Reveal / Hide ──────────────────────────────────────────────

  private revealIcon(field: HTMLElement): void {
    const entry = this.fieldEntries.get(field);
    if (!entry) return;

    entry.isNear = true;

    // Cancel any pending hide
    if (entry.hideTimer !== null) {
      clearTimeout(entry.hideTimer);
      entry.hideTimer = null;
    }

    entry.icon.classList.add('visible');
  }

  private scheduleHideIcon(field: HTMLElement): void {
    const entry = this.fieldEntries.get(field);
    if (!entry) return;

    // Don't double-schedule
    if (entry.hideTimer !== null) return;

    entry.hideTimer = setTimeout(() => {
      entry.hideTimer = null;
      entry.isNear = false;
      entry.icon.classList.remove('visible');
    }, HIDE_DELAY);
  }

  // ── Observers ──────────────────────────────────────────────────

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(mutations => {
      // Lightweight check: only rescan if an added node is/contains
      // input/textarea, or a removed node was tracked
      let needsScan = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.matches('input, textarea') ||
            node.querySelector('input, textarea')
          ) {
            needsScan = true;
            break;
          }
        }
        if (needsScan) break;

        for (const node of mutation.removedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (this.fieldEntries.has(node)) {
            needsScan = true;
            break;
          }
        }
        if (needsScan) break;
      }

      if (!needsScan) return;

      if (this.scanDebounceTimer !== null) {
        clearTimeout(this.scanDebounceTimer);
      }
      this.scanDebounceTimer = setTimeout(() => {
        this.scanDebounceTimer = null;
        this.scanFields();
      }, SCAN_DEBOUNCE);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private setupIntersectionObserver(): void {
    // Guard for jsdom (no IntersectionObserver)
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        for (const ioEntry of entries) {
          const field = ioEntry.target as HTMLElement;
          const entry = this.fieldEntries.get(field);
          if (!entry) continue;
          entry.inViewport = ioEntry.isIntersecting;
        }
      },
      { threshold: 0 }
    );
  }

  private observeFieldVisibility(field: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(field);
    }
  }

  // ── Field filtering ─────────────────────────────────────────────

  private isRelevantField(el: HTMLElement): boolean {
    const tagName = el.tagName.toLowerCase();
    if (!['input', 'textarea'].includes(tagName)) return false;

    // Skip non-fillable input types
    if (tagName === 'input') {
      const type = (el as HTMLInputElement).type.toLowerCase();
      if (IGNORED_INPUT_TYPES.has(type)) return false;
    }

    // Skip disabled or readonly
    if (
      (el as HTMLInputElement).disabled ||
      (el as HTMLInputElement).readOnly
    ) {
      return false;
    }

    // Skip elements inside FillKit's own widgets
    if (
      el.closest(
        '.fillkit-widget-container, .fillkit-options-sheet, .fillkit-help-sheet, .fillkit-fab-container'
      )
    ) {
      return false;
    }

    // Skip elements marked with data-fillkit-ignore
    if (el.hasAttribute('data-fillkit-ignore')) return false;

    return true;
  }

  // ── Event dispatch ──────────────────────────────────────────────

  private dispatchFillEvent(el: HTMLElement): void {
    document.dispatchEvent(
      new CustomEvent('fillkit:fillInput', {
        detail: { input: el },
        bubbles: true,
        cancelable: true,
      })
    );
  }
}
