/**
 * Provides screen reader announcements via a hidden live region.
 *
 * @remarks
 * Creates a visually hidden `aria-live="polite"` element that screen readers
 * will announce when its content changes. Used to inform assistive technology
 * users about the results of fill and clear operations.
 */
export class AriaAnnouncer {
  private liveRegion: HTMLElement | null = null;

  /**
   * Initializes the announcer by creating the hidden live region.
   *
   * @param container - The parent element to append the live region to.
   *   Defaults to `document.body`.
   */
  init(container: HTMLElement | Document = document.body): void {
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;';

    const parent = container instanceof Document ? container.body : container;
    parent.appendChild(this.liveRegion);
  }

  /**
   * Announces a message to screen readers.
   *
   * @param message - The text to announce.
   */
  announce(message: string): void {
    if (!this.liveRegion) return;

    // Clear first to ensure re-announcement of identical messages
    this.liveRegion.textContent = '';
    // Use requestAnimationFrame to ensure the DOM clears before setting new content
    requestAnimationFrame(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    });
  }

  /**
   * Removes the live region from the DOM and cleans up.
   */
  destroy(): void {
    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }
  }
}
