/**
 * Tracks the current focused/visible form and watches for DOM changes.
 * Handles focus tracking, viewport detection, and dynamic form/field discovery.
 */

import type { FieldDetectionOptions } from './FormDetector.js';
import { logger } from '@/core/Logger.js';

/**
 * Callback invoked when new elements are detected in watch mode.
 *
 * @param elements - Array of newly detected HTML elements
 * @returns Promise that resolves when the callback completes
 */
export type WatchModeCallback = (elements: HTMLElement[]) => Promise<void>;

/**
 * Options for watch mode configuration.
 */
export interface WatchModeOptions {
  /** Callback to invoke when new elements are detected. */
  callback: WatchModeCallback;
  /** Field detection options for filtering new elements. */
  fieldOptions?: FieldDetectionOptions;
}

/**
 * Tracks the current focused/visible form and observes DOM mutations.
 *
 * @remarks
 * Provides three tracking strategies:
 * 1. **Focus tracking** - Monitors forms with focused inputs via click/focus events
 * 2. **Viewport tracking** - Identifies forms closest to viewport center using IntersectionObserver
 * 3. **Watch mode** - Automatically detects dynamically added forms/fields via MutationObserver
 *
 * The tracker maintains state about the current form and can notify callbacks when
 * new elements are added to the DOM, making it ideal for single-page applications
 * where forms may be dynamically rendered.
 *
 * @example
 * ```ts
 * const tracker = new FormTracker();
 * tracker.startTracking();
 *
 * // Get current form
 * const form = tracker.getCurrentForm();
 *
 * // Enable watch mode
 * tracker.enableWatchMode({
 *   callback: async (elements) => {
 *     console.log('New elements detected:', elements);
 *   }
 * });
 * ```
 */
export class FormTracker {
  private currentForm: HTMLFormElement | null = null;
  private previousForm: HTMLFormElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private watchMode = false;
  private watchModeOptions: WatchModeOptions | null = null;
  private trackingActive = false;
  private pendingMutations: MutationRecord[] = [];
  private mutationTimer: ReturnType<typeof setTimeout> | null = null;

  // Event listeners
  private clickListener: ((e: Event) => void) | null = null;
  private focusListener: ((e: Event) => void) | null = null;

  /**
   * Starts tracking form focus and viewport position.
   *
   * @remarks
   * Sets up event listeners for click and focus events, and initializes
   * IntersectionObserver for viewport tracking. Safe to call multiple times;
   * will not re-initialize if already tracking.
   */
  startTracking(): void {
    if (this.trackingActive) return;

    this.setupFormTracking();
    this.setupViewportTracking();
    this.trackingActive = true;
  }

  /**
   * Stops all tracking activities.
   *
   * @remarks
   * Disables watch mode, disconnects all observers (MutationObserver and
   * IntersectionObserver), and removes event listeners. Safe to call multiple
   * times; will not error if already stopped.
   */
  stopTracking(): void {
    if (!this.trackingActive) return;

    this.disableWatchMode();

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Remove event listeners
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    if (this.focusListener) {
      document.removeEventListener('focusin', this.focusListener, true);
      this.focusListener = null;
    }

    this.trackingActive = false;
  }

  /**
   * Gets the current focused or visible form.
   *
   * @remarks
   * Returns the form that is currently focused (has a focused input) or is
   * closest to the viewport center. May return `null` if no forms are detected
   * or if tracking has not been started.
   *
   * @returns The current form element, or `null` if none is detected.
   */
  getCurrentForm(): HTMLFormElement | null {
    return this.currentForm;
  }

  /**
   * Enables watch mode for dynamic form detection.
   *
   * @remarks
   * Sets up a MutationObserver to monitor the DOM for newly added forms and fields.
   * When new elements are detected, the provided callback is invoked with the list
   * of elements. The callback is debounced by 300ms to avoid excessive invocations.
   * Safe to call multiple times; will not re-enable if already active.
   *
   * @param options - Watch mode configuration with callback and optional field filters.
   *
   * @example
   * ```ts
   * tracker.enableWatchMode({
   *   callback: async (elements) => {
   *     // Auto-fill new elements
   *     for (const el of elements) {
   *       await fillElement(el);
   *     }
   *   },
   *   fieldOptions: {
   *     excludeSelectors: ['.ignore']
   *   }
   * });
   * ```
   */
  enableWatchMode(options: WatchModeOptions): void {
    if (this.watchMode) return;

    this.watchMode = true;
    this.watchModeOptions = options;

    this.mutationObserver = new MutationObserver(
      (mutations: MutationRecord[]) => {
        // Accumulate mutations instead of discarding during debounce
        this.pendingMutations.push(...mutations);
        if (this.mutationTimer) clearTimeout(this.mutationTimer);
        this.mutationTimer = setTimeout(() => {
          const batch = this.pendingMutations;
          this.pendingMutations = [];
          this.mutationTimer = null;
          this.handleDOMMutations(batch);
        }, 300);
      }
    );

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Disables watch mode.
   *
   * @remarks
   * Stops observing DOM mutations and disconnects the MutationObserver.
   * Safe to call multiple times; will not error if already disabled.
   */
  disableWatchMode(): void {
    this.watchMode = false;

    if (this.mutationTimer) {
      clearTimeout(this.mutationTimer);
      this.mutationTimer = null;
    }
    this.pendingMutations = [];

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.watchModeOptions = null;
  }

  /**
   * Checks if watch mode is currently enabled.
   *
   * @returns `true` if watch mode is active, `false` otherwise.
   */
  isWatchModeEnabled(): boolean {
    return this.watchMode;
  }

  /**
   * Sets up form focus tracking via click and focus events.
   *
   * @remarks
   * Attaches event listeners to track which form the user is interacting with.
   * Updates the current form when a user clicks or focuses on an element within a form.
   * This is an internal method called by {@link startTracking}.
   */
  private setupFormTracking(): void {
    // Track form focus via click events
    this.clickListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const form = target.closest('form');
      if (form) {
        this.currentForm = form;
        this.updateCurrentFormIndicator();
      }
    };

    document.addEventListener('click', this.clickListener, {
      capture: true,
      passive: true,
    });

    // Track form focus via focusin events
    this.focusListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const form = target.closest('form');
      if (form) {
        this.currentForm = form;
        this.updateCurrentFormIndicator();
      }
    };

    document.addEventListener('focusin', this.focusListener, {
      capture: true,
      passive: true,
    });
  }

  /**
   * Sets up viewport tracking to detect forms in the center of the viewport.
   *
   * @remarks
   * Uses IntersectionObserver to identify forms that are visible and closest to
   * the viewport center. Only updates the current form if no form is explicitly
   * focused. This is an internal method called by {@link startTracking}.
   */
  private setupViewportTracking(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        // Only update if no form is explicitly focused
        if (this.currentForm) return;

        // Find forms that are intersecting and closest to viewport center
        const centerY = window.innerHeight / 2;
        let closestForm: HTMLFormElement | null = null;
        let minDistance = Infinity;

        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target instanceof HTMLFormElement) {
            const rect = entry.boundingClientRect;
            const formCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(formCenterY - centerY);

            if (distance < minDistance) {
              minDistance = distance;
              closestForm = entry.target;
            }
          }
        });

        if (closestForm) {
          this.currentForm = closestForm;
          this.updateCurrentFormIndicator();
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    // Observe all existing forms
    this.observeForms();
  }

  /**
   * Observes all forms for intersection with the viewport.
   *
   * @remarks
   * Queries the DOM for all form elements and adds them to the IntersectionObserver.
   * Called during initial setup and when new forms are dynamically added to the page.
   */
  private observeForms(): void {
    if (!this.intersectionObserver) return;

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      this.intersectionObserver!.observe(form);
    });
  }

  /**
   * Updates the visual indicator for the current form.
   *
   * @remarks
   * Adds the `fillkit-current-form` class and `data-fillkit-current` attribute
   * to the current form for styling purposes. Removes these indicators from all
   * other forms to ensure only one form is marked as current.
   */
  private updateCurrentFormIndicator(): void {
    // Remove indicator from previous form only (avoids querying all forms)
    if (this.previousForm) {
      this.previousForm.classList.remove('fillkit-current-form');
      this.previousForm.removeAttribute('data-fillkit-current');
    }

    // Add indicator to current form
    if (this.currentForm) {
      this.currentForm.classList.add('fillkit-current-form');
      this.currentForm.setAttribute('data-fillkit-current', 'true');
    }

    this.previousForm = this.currentForm;
  }

  /**
   * Handles DOM mutations in watch mode.
   *
   * @remarks
   * Processes MutationRecords to detect newly added forms and fields. Filters out
   * ignored fields and invokes the watch mode callback with the list of new elements.
   * Also adds newly detected forms to the IntersectionObserver for viewport tracking.
   *
   * @param mutations - Array of mutation records from the MutationObserver.
   */
  private async handleDOMMutations(mutations: MutationRecord[]): Promise<void> {
    if (!this.watchModeOptions) return;

    // Use Set to deduplicate elements (e.g., when a <form> is added, its
    // children appear both from the FORM branch and the descendants scan)
    const newElementSet = new Set<HTMLElement>();

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // Check if it's a form element
        if (node.tagName === 'FORM') {
          const fields = node.querySelectorAll('input, select, textarea');
          for (const field of fields) {
            if (!this.isFieldIgnored(field as HTMLElement)) {
              newElementSet.add(field as HTMLElement);
            }
          }

          // Add to intersection observer
          if (this.intersectionObserver) {
            this.intersectionObserver.observe(node);
          }
        }

        // Check if it's a form control
        if (
          node.tagName === 'INPUT' ||
          node.tagName === 'SELECT' ||
          node.tagName === 'TEXTAREA'
        ) {
          if (!this.isFieldIgnored(node)) {
            newElementSet.add(node);
          }
        }

        // Check descendants
        const descendantFields = node.querySelectorAll(
          'input, select, textarea'
        );
        for (const field of descendantFields) {
          if (!this.isFieldIgnored(field as HTMLElement)) {
            newElementSet.add(field as HTMLElement);
          }
        }
      }
    }

    // Invoke callback with deduplicated elements
    if (newElementSet.size > 0) {
      try {
        await this.watchModeOptions.callback([...newElementSet]);
      } catch (error) {
        logger.error('Error in watch mode callback:', error);
      }
    }
  }

  /**
   * Checks if a field should be ignored based on its state and type.
   *
   * @remarks
   * Fields are ignored if they are:
   * - Hidden, disabled, or readonly
   * - Submit, reset, button, or image input types
   *
   * @param element - The element to check.
   * @returns `true` if the field should be ignored, `false` otherwise.
   */
  private isFieldIgnored(element: HTMLElement): boolean {
    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();
      return (
        element.hidden ||
        element.disabled ||
        element.readOnly ||
        ['hidden', 'submit', 'reset', 'button', 'image'].includes(type)
      );
    }

    if (element instanceof HTMLSelectElement) {
      return element.disabled;
    }

    if (element instanceof HTMLTextAreaElement) {
      return element.disabled || element.readOnly;
    }

    return false;
  }
}
