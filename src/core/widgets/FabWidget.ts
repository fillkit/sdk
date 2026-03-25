/**
 * Floating Action Button (FAB) widget for FillKit.
 *
 * @remarks
 * A compact 44x44px circular button that appears when the main widget is hidden
 * via `Alt+H`. Clicking the FAB dispatches a `fillkit:restoreWidget` event to
 * restore the main widget. Uses the `brandSquare` logo icon for brand recognition.
 */

import { FillKitIcons } from '../icons.js';

/**
 * Compact FAB widget that serves as a minimized state for the main widget.
 *
 * @remarks
 * Follows the same lifecycle pattern as `MainWidget`:
 * - `create()` builds and returns the DOM element
 * - `show()` / `hide()` toggle visibility
 * - `destroy()` removes the element and cleans up listeners
 */
export class FabWidget {
  private container: HTMLElement | null = null;
  private clickHandler: (() => void) | null = null;

  /**
   * Creates the FAB DOM element.
   *
   * @returns The FAB container element ready for appending to `document.body`.
   */
  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'fillkit-fab-container';
    this.container.style.display = 'none';

    const button = document.createElement('button');
    button.className = 'fillkit-fab';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Show FillKit widget (Alt+H)');
    button.setAttribute('title', 'Show FillKit widget (Alt+H)');
    button.innerHTML = FillKitIcons.brandSquare;

    this.clickHandler = () => {
      document.dispatchEvent(
        new CustomEvent('fillkit:restoreWidget', {
          bubbles: true,
          cancelable: true,
        })
      );
    };
    button.addEventListener('click', this.clickHandler);

    this.container.appendChild(button);
    return this.container;
  }

  /**
   * Shows the FAB.
   */
  show(): void {
    if (this.container) {
      this.container.style.display = '';
    }
  }

  /**
   * Hides the FAB.
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Destroys the FAB and cleans up resources.
   */
  destroy(): void {
    if (this.container) {
      const button = this.container.querySelector('.fillkit-fab');
      if (button && this.clickHandler) {
        button.removeEventListener('click', this.clickHandler);
      }
      this.container.remove();
      this.container = null;
    }
    this.clickHandler = null;
  }
}
