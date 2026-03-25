/**
 * Manages the display of feedback messages in the options sheet header.
 *
 * @remarks
 * This component subscribes to the `FeedbackManager` and renders real-time
 * messages, including errors, warnings, success notifications, and progress
 * indicators. It supports actions, dismissal, and scrollable overflow for
 * large message lists.
 *
 * **Error-priority sorting:** Error-level messages are always rendered at the
 * top regardless of timestamp, ensuring critical issues are immediately visible.
 */

import type {
  FeedbackManager,
  FeedbackMessage,
} from '../../FeedbackManager.js';

/** Default number of messages visible before scrolling. */
const DEFAULT_MAX_VISIBLE_MESSAGES = 5;

/**
 * Configuration options for FeedbackDisplay.
 */
export interface FeedbackDisplayOptions {
  /**
   * Maximum number of messages visible before the container scrolls.
   * All messages are rendered; the container uses CSS `overflow-y: auto`
   * with a `max-height` derived from this value.
   *
   * @defaultValue 5
   */
  maxVisibleMessages?: number;
}

/**
 * FeedbackDisplay component that shows messages in the OptionsSheet header.
 * Subscribes to FeedbackManager and renders messages in real-time.
 *
 * @remarks
 * - Error-level messages are always sorted to the top.
 * - The container uses scrollable overflow instead of "+N more" truncation.
 * - `maxVisibleMessages` controls the visible area height, not a hard cutoff.
 */
export class FeedbackDisplay {
  private container: HTMLElement;
  private feedbackManager: FeedbackManager;
  private unsubscribe: (() => void) | null = null;
  private maxVisibleMessages: number;

  /**
   * Initializes a new instance of the FeedbackDisplay class.
   *
   * @param feedbackManager - The manager instance to subscribe to for updates.
   * @param options - Optional display configuration.
   */
  constructor(
    feedbackManager: FeedbackManager,
    options?: FeedbackDisplayOptions
  ) {
    this.feedbackManager = feedbackManager;
    this.maxVisibleMessages =
      options?.maxVisibleMessages ?? DEFAULT_MAX_VISIBLE_MESSAGES;
    this.container = this.createContainer();
    this.subscribe();
  }

  /**
   * Creates the main container element for feedback messages.
   *
   * @remarks
   * Uses `overflow-y: auto` so the container scrolls when content exceeds
   * the visible height derived from `maxVisibleMessages`.
   *
   * @returns The HTMLElement that will hold the feedback messages.
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'fillkit-feedback-display';
    // Each message is roughly 60px tall; calculate max-height accordingly
    const maxHeight = this.maxVisibleMessages * 60;
    container.style.maxHeight = `${maxHeight}px`;
    container.style.overflowY = 'auto';
    return container;
  }

  /**
   * Subscribes to the FeedbackManager to receive message updates.
   */
  private subscribe(): void {
    this.unsubscribe = this.feedbackManager.subscribe(messages => {
      this.render(messages);
    });
  }

  /**
   * Sorts messages so error-level messages appear first, then by timestamp
   * descending within each group.
   *
   * @param messages - The unsorted list of messages.
   * @returns A new array with errors sorted to the top.
   */
  private sortWithErrorPriority(
    messages: FeedbackMessage[]
  ): FeedbackMessage[] {
    return [...messages].sort((a, b) => {
      // Errors first
      const aIsError = a.type === 'error' ? 0 : 1;
      const bIsError = b.type === 'error' ? 0 : 1;
      if (aIsError !== bIsError) {
        return aIsError - bIsError;
      }
      // Within same group, newest first
      return b.timestamp - a.timestamp;
    });
  }

  /**
   * Renders the current list of feedback messages.
   *
   * @remarks
   * Clears existing content and rebuilds the message list with error-priority
   * sorting. All messages are rendered; scrollable overflow handles long lists.
   *
   * @param messages - The list of messages to display.
   */
  private render(messages: FeedbackMessage[]): void {
    // Clear existing content
    this.container.innerHTML = '';

    // Show/hide container based on messages
    if (messages.length === 0) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';

    // Sort with error priority (errors always on top)
    const sorted = this.sortWithErrorPriority(messages);

    // Render all messages — scrollable overflow handles the rest
    for (const message of sorted) {
      const messageEl = this.createMessageElement(message);
      this.container.appendChild(messageEl);
    }
  }

  /**
   * Creates a DOM element for a single feedback message.
   *
   * @param message - The message data to render.
   * @returns The constructed message HTMLElement.
   */
  private createMessageElement(message: FeedbackMessage): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `fillkit-feedback-message fillkit-feedback-${message.type}`;

    const icon = this.getIcon(message.type);

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'fillkit-feedback-icon';
    iconEl.textContent = icon;
    messageEl.appendChild(iconEl);

    // Content
    const contentEl = document.createElement('div');
    contentEl.className = 'fillkit-feedback-content';

    // Message text
    const textEl = document.createElement('div');
    textEl.className = 'fillkit-feedback-text';
    textEl.textContent = message.message;
    contentEl.appendChild(textEl);

    // Progress bar if present
    if (message.progress) {
      const progressEl = this.createProgressBar(message.progress);
      contentEl.appendChild(progressEl);
    }

    // Action button if present
    if (message.action) {
      const actionEl = this.createActionButton(message.action, message.id);
      contentEl.appendChild(actionEl);
    }

    messageEl.appendChild(contentEl);

    // Dismiss button
    const dismissEl = this.createDismissButton(message.id);
    messageEl.appendChild(dismissEl);

    return messageEl;
  }

  /**
   * Creates a progress bar element for messages with progress data.
   *
   * @param progress - The progress data containing current and total values.
   * @returns The constructed progress bar HTMLElement.
   */
  private createProgressBar(progress: {
    current: number;
    total: number;
    label?: string;
  }): HTMLElement {
    const progressEl = document.createElement('div');

    if (progress.label) {
      const labelEl = document.createElement('div');
      labelEl.className = 'fillkit-feedback-progress-label';
      labelEl.textContent = `${progress.label} (${progress.current}/${progress.total})`;
      progressEl.appendChild(labelEl);
    }

    const barEl = document.createElement('div');
    barEl.className = 'fillkit-feedback-progress-track';

    const fillEl = document.createElement('div');
    fillEl.className = 'fillkit-feedback-progress-fill';
    const percentage = (progress.current / progress.total) * 100;
    fillEl.style.width = `${percentage}%`;

    barEl.appendChild(fillEl);
    progressEl.appendChild(barEl);

    return progressEl;
  }

  /**
   * Creates an action button for interactive messages.
   *
   * @param action - The action configuration containing label and handler.
   * @param _messageId - The ID of the message (unused but kept for potential future use).
   * @returns The constructed button HTMLElement.
   */
  private createActionButton(
    action: { label: string; handler: () => void },
    _messageId: string
  ): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fillkit-feedback-action';
    button.textContent = action.label;

    button.addEventListener('click', () => {
      action.handler();
    });

    return button;
  }

  /**
   * Creates a dismiss button for a message.
   *
   * @param messageId - The ID of the message to dismiss.
   * @returns The constructed dismiss button HTMLElement.
   */
  private createDismissButton(messageId: string): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fillkit-feedback-dismiss';
    button.innerHTML = '&times;';
    button.title = 'Dismiss';

    button.addEventListener('click', () => {
      this.feedbackManager.dismiss(messageId);
    });

    return button;
  }

  /**
   * Retrieves the appropriate icon character for a message type.
   *
   * @param type - The type of the message (e.g., 'success', 'error').
   * @returns The icon character as a string.
   */
  private getIcon(type: string): string {
    switch (type) {
      case 'loading':
        return '\u23F3';
      case 'success':
        return '\u2713';
      case 'error':
        return '\u2717';
      case 'warning':
        return '\u26A0';
      case 'info':
        return '\u2139';
      default:
        return '\u2022';
    }
  }

  /**
   * Retrieves the main container element.
   *
   * @returns The container HTMLElement.
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Cleans up resources and removes the component from the DOM.
   *
   * @remarks
   * Unsubscribes from the FeedbackManager and removes the container element.
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container.remove();
  }
}
