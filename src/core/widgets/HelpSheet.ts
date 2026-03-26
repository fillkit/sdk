/**
 * Manages the Help popover widget.
 *
 * @remarks
 * This component renders a compact popover displaying keyboard shortcuts and a link
 * to external documentation. It handles opening, closing, and toggling visibility,
 * focus trapping, and updating the global widget state.
 */

import { fillkitHomeUrl } from '../../types/cloud.js';
import { widgetState } from '../../state/atoms/index.js';
import { FillKitIcons } from '../icons.js';
import { setSvgContent } from '../../utils/dom-helpers.js';

/**
 * Creates and manages the help documentation popover.
 */
export class HelpSheet {
  private helpSheet: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private handleOverlayClick: () => void = () => {};
  private previousFocus: Element | null = null;
  private handleFocusTrap: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Creates a styled keyboard shortcut element.
   *
   * @param keys - The key combination string to parse (e.g., "Ctrl+Shift+K").
   * @returns The constructed HTMLElement representing the keyboard shortcut.
   */
  private createKbd(keys: string): HTMLElement {
    const kbd = document.createElement('kbd');
    kbd.className = 'fillkit-kbd';

    const parts = keys.split('+');
    parts.forEach((key, index) => {
      const keySpan = document.createElement('span');
      keySpan.className = 'fillkit-kbd-key';
      keySpan.textContent = key;
      kbd.appendChild(keySpan);

      if (index < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'fillkit-kbd-sep';
        sep.textContent = '+';
        kbd.appendChild(sep);
      }
    });

    return kbd;
  }

  /**
   * Creates and initializes the help popover DOM structure.
   *
   * @param overlay - The background overlay element to attach to.
   * @returns The constructed help popover HTMLElement.
   */
  create(overlay: HTMLElement): HTMLElement {
    this.overlay = overlay;
    this.helpSheet = document.createElement('div');
    this.helpSheet.className = 'fillkit-help-sheet';
    this.helpSheet.setAttribute('role', 'dialog');
    this.helpSheet.setAttribute('aria-modal', 'true');
    this.helpSheet.setAttribute('aria-label', 'Keyboard shortcuts');

    // Header
    const header = document.createElement('div');
    header.className = 'fillkit-help-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'fillkit-help-title-group';

    const brandLogo = document.createElement('span');
    brandLogo.className = 'fillkit-sheet-brand';
    setSvgContent(brandLogo, FillKitIcons.brandRect);

    const subtitle = document.createElement('p');
    subtitle.className = 'fillkit-help-subtitle';
    subtitle.textContent = 'Keyboard shortcuts';

    titleGroup.appendChild(brandLogo);
    titleGroup.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fillkit-help-close';
    setSvgContent(closeBtn, FillKitIcons.close);
    closeBtn.setAttribute('aria-label', 'Close shortcuts');
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(titleGroup);
    header.appendChild(closeBtn);

    // Grid of shortcuts
    const grid = document.createElement('div');
    grid.className = 'fillkit-help-grid';

    const shortcuts = [
      { keys: 'Ctrl+Shift+K', desc: 'Fill all' },
      { keys: 'Alt+K', desc: 'Fill current' },
      { keys: 'Ctrl+Shift+L', desc: 'Clear all' },
      { keys: 'Alt+L', desc: 'Clear current' },
      { keys: 'Ctrl+M', desc: 'Toggle mode' },
      { keys: 'Alt+H', desc: 'Show/hide' },
      { keys: 'Ctrl+,', desc: 'Settings' },
      { keys: 'Ctrl+/', desc: 'Help' },
      { keys: 'Ctrl+Shift+M', desc: 'Position' },
      { keys: 'Alt+E', desc: 'Rotate' },
      { keys: 'Esc', desc: 'Close' },
    ];

    shortcuts.forEach(({ keys, desc }) => {
      const item = document.createElement('div');
      item.className = 'fillkit-help-item';

      const kbdElement = this.createKbd(keys);

      const label = document.createElement('span');
      label.className = 'fillkit-help-label';
      label.textContent = desc;

      item.appendChild(kbdElement);
      item.appendChild(label);
      grid.appendChild(item);
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'fillkit-help-footer';

    const link = document.createElement('a');
    link.href = fillkitHomeUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'fillkit-help-link';
    link.textContent = 'Docs \u2192';

    footer.appendChild(link);

    // Assemble
    this.helpSheet.appendChild(header);
    this.helpSheet.appendChild(grid);
    this.helpSheet.appendChild(footer);

    return this.helpSheet;
  }

  /**
   * Opens the help popover and shows the overlay.
   *
   * @remarks
   * Stores the currently focused element for restoration on close.
   * Updates the global widget state to reflect that the help sheet is open.
   */
  async open(): Promise<void> {
    if (!this.helpSheet || !this.overlay) return;

    this.previousFocus = document.activeElement;

    this.overlay.classList.add('visible');
    this.helpSheet.classList.add('visible');

    // Update widget state atom (mark as opened and seen)
    widgetState.set({
      ...widgetState.get(),
      helpSheetOpen: true,
      hasSeenHelp: true,
    });

    // Setup overlay click to close (remove old listener to prevent stacking)
    this.overlay.removeEventListener('click', this.handleOverlayClick);
    this.handleOverlayClick = () => {
      this.close();
    };
    this.overlay.addEventListener('click', this.handleOverlayClick);

    // Mark background as inert for accessibility
    document.body.inert = true;
    if (this.helpSheet.parentElement) {
      this.helpSheet.parentElement.inert = false;
    }
    this.helpSheet.inert = false;
    this.overlay.inert = false;

    // Setup focus trap
    this.setupFocusTrap();

    // Focus the close button for keyboard users
    const closeBtn = this.helpSheet.querySelector<HTMLElement>(
      '.fillkit-help-close'
    );
    closeBtn?.focus();
  }

  /**
   * Closes the help popover and hides the overlay.
   *
   * @remarks
   * Restores focus to the previously focused element.
   * Updates the global widget state to reflect that the help sheet is closed.
   */
  async close(): Promise<void> {
    if (!this.helpSheet || !this.overlay) return;

    this.overlay.classList.remove('visible');
    this.helpSheet.classList.remove('visible');

    // Update widget state atom
    widgetState.set({ ...widgetState.get(), helpSheetOpen: false });

    // Remove inert from background
    document.body.inert = false;

    // Remove focus trap
    this.removeFocusTrap();

    // Restore focus to previously focused element
    if (this.previousFocus instanceof HTMLElement) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  /**
   * Toggles the visibility of the help popover.
   */
  toggle(): void {
    const isOpen = this.helpSheet?.classList.contains('visible');
    if (isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Checks if the help popover is currently visible.
   *
   * @returns `true` if the help sheet is open, `false` otherwise.
   */
  isOpen(): boolean {
    return this.helpSheet?.classList.contains('visible') || false;
  }

  /**
   * Sets up a focus trap within the help sheet dialog.
   *
   * @remarks
   * Traps Tab and Shift+Tab within the dialog, cycling between the first and last
   * focusable elements. Also handles Escape key to close the dialog.
   */
  private setupFocusTrap(): void {
    this.removeFocusTrap();

    this.handleFocusTrap = (e: KeyboardEvent) => {
      if (!this.helpSheet) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = this.helpSheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab from first element wraps to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab from last element wraps to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', this.handleFocusTrap);
  }

  /**
   * Removes the focus trap event listener.
   */
  private removeFocusTrap(): void {
    if (this.handleFocusTrap) {
      document.removeEventListener('keydown', this.handleFocusTrap);
      this.handleFocusTrap = null;
    }
  }

  /**
   * Destroys the help popover and removes it from the DOM.
   */
  destroy(): void {
    this.removeFocusTrap();

    if (this.helpSheet) {
      this.helpSheet.remove();
      this.helpSheet = null;
    }
    this.previousFocus = null;
  }
}
