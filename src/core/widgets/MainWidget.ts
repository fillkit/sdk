/**
 * Manages the main floating widget of the FillKit SDK.
 *
 * @remarks
 * This component renders the draggable widget containing the primary action buttons
 * (Fill All, Fill Current, Clear All, Clear Current). It also displays the current
 * provider status and handles drag-and-drop positioning, orientation switching,
 * and integration with the FeedbackManager.
 */

import type { UiPlacement } from '../../types/index.js';
import { FillKitIcons, type IconName } from '../icons.js';
import type { FeedbackManager } from '../FeedbackManager.js';
import { sdkOptions, uiConfig } from '../../state/atoms/index.js';

/**
 * Manages the core FillKit toolbar UI.
 */
export class MainWidget {
  private widgetContainer: HTMLElement | null = null;
  private widgetElement: HTMLElement | null = null;
  private position: UiPlacement;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private currentOrientation: 'horizontal' | 'vertical' = 'horizontal';
  private customPosition: { x: number; y: number } | null = null;
  private scrollListenerAdded = false;
  private dragMoveHandler: ((e: MouseEvent) => void) | null = null;
  private dragEndHandler: (() => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private touchEndHandler: (() => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private feedbackManager: FeedbackManager | null = null;
  private unsubscribeFeedback?: () => void;
  private unsubscribeProvider?: () => void;
  private unsubscribeUiConfig?: () => void;
  private currentErrorCount = 0;
  private currentStatus: 'local' | 'cloud' | 'cloud-degraded' = 'local';
  private optionsSheetVisible = true;

  /**
   * Initializes a new instance of the MainWidget class.
   *
   * @param position - The initial screen placement (e.g., 'bottom-right').
   * @param feedbackManager - Optional manager for handling feedback events.
   */
  constructor(position: UiPlacement, feedbackManager?: FeedbackManager) {
    this.position = position;
    this.feedbackManager = feedbackManager || null;

    if (this.feedbackManager) {
      this.unsubscribeFeedback = this.feedbackManager.subscribe(messages => {
        const errorMessages = messages.filter(
          m => m.type === 'error' && !m.dismissed
        );
        this.currentErrorCount = errorMessages.length;
        this.updateStatusBadge();
      });
    }

    this.unsubscribeProvider = sdkOptions.subscribe(opts => {
      const status = opts.provider === 'cloud' ? 'cloud' : 'local';
      this.updateStatusIndicator(status);
    });

    const initialOpts = sdkOptions.get();
    this.currentStatus = initialOpts.provider === 'cloud' ? 'cloud' : 'local';

    // Subscribe to uiConfig for optionsSheet visibility changes
    this.optionsSheetVisible = uiConfig.get().visibility.optionsSheet;
    this.unsubscribeUiConfig = uiConfig.subscribe(cfg => {
      this.optionsSheetVisible = cfg.visibility.optionsSheet;
      this.updateSettingsBadgeVisibility();
    });
  }

  /**
   * Creates and injects the widget into the DOM.
   *
   * @remarks
   * Constructs the widget container, action buttons, status badge, and initializes
   * draggable behavior.
   *
   * @returns The constructed widget container HTMLElement.
   */
  create(): HTMLElement {
    // Create container
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.className = `fillkit-widget-container ${this.position.replace('.', '-')}`;
    this.widgetContainer.setAttribute('role', 'toolbar');
    this.widgetContainer.setAttribute('aria-label', 'FillKit form autofill');

    // Create widget
    const widget = document.createElement('div');
    widget.className = 'fillkit-widget';
    this.widgetElement = widget;

    // Initialize orientation based on position
    this.currentOrientation = this.position.includes('center')
      ? this.position.includes('top') || this.position.includes('bottom')
        ? 'horizontal'
        : 'vertical'
      : 'horizontal';

    // Add informative text (only for horizontal layouts)
    const widgetInfo = document.createElement('p');
    widgetInfo.className = 'fillkit-widget-info';
    widgetInfo.textContent =
      'Drag or \u2190\u2191\u2193\u2192 to move \u2022 Ctrl+/ help \u2022 Ctrl+, settings';

    // Tooltip for vertical mode where the info text is hidden
    widget.title =
      'Drag or \u2190\u2191\u2193\u2192 to move \u2022 Ctrl+/ help \u2022 Ctrl+, settings';

    // Add enhanced provider status badge
    const statusBadge = this.createStatusBadge();

    // Wrap info + badge in meta container for single-row layout on large screens
    const metaContainer = document.createElement('div');
    metaContainer.className = 'fillkit-widget-meta';
    metaContainer.appendChild(widgetInfo);
    metaContainer.appendChild(statusBadge);
    widget.appendChild(metaContainer);

    setTimeout(() => {
      this.updateStatusBadge();
      this.updateSettingsBadgeVisibility();
    }, 0);

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'fillkit-widget-buttons';

    // Essential widget buttons (fill/clear actions)
    // Help, Settings, Shuffle, Rotate accessible via keyboard shortcuts
    const buttons: Array<{
      icon: IconName;
      title: string;
      event: string;
      label: string;
    }> = [
      {
        icon: 'fillAll',
        title: 'Fill all forms (Ctrl+Shift+K)',
        event: 'fillAll',
        label: 'Fill All',
      },
      {
        icon: 'fillCurrent',
        title: 'Fill current form (Alt+K)',
        event: 'fillCurrent',
        label: 'Fill this form',
      },
      {
        icon: 'clearAll',
        title: 'Clear all (Ctrl+Shift+L)',
        event: 'clearAll',
        label: 'Clear All',
      },
      {
        icon: 'clearCurrent',
        title: 'Clear current (Alt+L)',
        event: 'clearCurrent',
        label: 'Clear this form',
      },
    ];

    buttons.forEach(btn => {
      const button = this.createButton(
        btn.icon,
        btn.event,
        btn.title,
        btn.label
      );
      buttonsContainer.appendChild(button);
    });

    widget.appendChild(buttonsContainer);

    this.widgetContainer.appendChild(widget);

    // Setup draggable functionality
    this.setupDraggable(widget);

    // Setup keyboard repositioning for accessibility
    this.setupKeyboardRepositioning();

    return this.widgetContainer;
  }

  /**
   * Creates the status badge element.
   *
   * @remarks
   * The badge displays the current provider status (local/cloud) and any active error counts.
   * It serves as the entry point for opening the options sheet.
   *
   * @returns The constructed status badge HTMLElement.
   */
  private createStatusBadge(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'fillkit-widget-status-badge';
    badge.id = 'fillkit-widget-status-badge';
    badge.title = 'Click to open settings';
    badge.setAttribute('role', 'button');
    badge.setAttribute('aria-label', 'Open settings');

    // Brand icon
    const brandIcon = document.createElement('span');
    brandIcon.className = 'fillkit-widget-brand-icon';
    brandIcon.innerHTML = FillKitIcons.brandSquare;

    // Status dot
    const statusDot = document.createElement('span');
    statusDot.className = 'fillkit-widget-status-dot fillkit-status-local';
    statusDot.id = 'fillkit-status-dot';

    // Provider label
    const providerLabel = document.createElement('span');
    providerLabel.className = 'fillkit-widget-status-label';
    providerLabel.id = 'fillkit-status-label';
    providerLabel.textContent = 'Settings \u2192';

    // Error count badge (hidden by default)
    const errorBadge = document.createElement('span');
    errorBadge.className = 'fillkit-widget-error-badge';
    errorBadge.id = 'fillkit-error-badge';
    errorBadge.textContent = '0';

    badge.appendChild(brandIcon);
    badge.appendChild(statusDot);
    badge.appendChild(providerLabel);
    badge.appendChild(errorBadge);

    // Make clickable to open OptionsSheet
    badge.addEventListener('click', e => {
      e.stopPropagation();
      this.dispatchEvent('openOptions');
    });

    return badge;
  }

  /**
   * Updates the status badge UI to reflect the current state.
   *
   * @remarks
   * Updates the dot color, label text, and error count based on `currentStatus`
   * and `currentErrorCount`.
   */
  private updateStatusBadge(): void {
    const label = document.getElementById('fillkit-status-label');
    const dot = document.getElementById('fillkit-status-dot');
    const errorBadge = document.getElementById('fillkit-error-badge');
    const badge = document.getElementById('fillkit-widget-status-badge');

    if (!label || !dot) return;

    dot.className = 'fillkit-widget-status-dot';
    switch (this.currentStatus) {
      case 'cloud':
        dot.classList.add('fillkit-status-cloud');
        label.textContent = 'Settings \u2192';
        break;
      case 'cloud-degraded':
        dot.classList.add('fillkit-status-cloud-degraded');
        label.textContent = 'Settings \u2192';
        break;
      case 'local':
        dot.classList.add('fillkit-status-local');
        label.textContent = 'Settings \u2192';
        break;
    }

    if (badge) {
      badge.title = 'Click to open settings';
    }

    if (errorBadge) {
      if (this.currentErrorCount > 0) {
        errorBadge.textContent = this.currentErrorCount.toString();
        errorBadge.classList.add('visible');
        errorBadge.title = `${this.currentErrorCount} error${this.currentErrorCount > 1 ? 's' : ''}`;
      } else {
        errorBadge.classList.remove('visible');
      }
    }
  }

  /**
   * Creates a standard widget button.
   *
   * @param iconName - The name of the icon to display.
   * @param event - The event name to dispatch when clicked.
   * @param title - The tooltip text.
   * @param label - The visible label text (for horizontal layout).
   * @returns The constructed button HTMLElement.
   */
  private createButton(
    iconName: IconName,
    event: string,
    title: string,
    label: string
  ): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fillkit-widget-btn';
    button.setAttribute('data-fillkit-event', event);
    button.title = title;
    button.setAttribute('aria-label', title);

    // Add SVG icon
    const iconContainer = document.createElement('span');
    iconContainer.className = 'fillkit-widget-icon';
    iconContainer.setAttribute('aria-hidden', 'true');
    iconContainer.innerHTML = FillKitIcons[iconName];

    // Add label for horizontal layouts
    const labelSpan = document.createElement('span');
    labelSpan.className = 'fillkit-widget-btn-label';
    labelSpan.textContent = label;

    button.appendChild(iconContainer);
    button.appendChild(labelSpan);

    button.addEventListener('click', () => {
      this.dispatchEvent(event);
    });

    return button;
  }

  /**
   * Initializes drag-and-drop functionality for the widget.
   *
   * @remarks
   * Allows the widget to be dragged anywhere on the screen. Updates the widget's
   * position and orientation class based on its location. Handles both mouse and
   * touch events.
   *
   * @param widget - The widget element to make draggable.
   */
  private setupDraggable(widget: HTMLElement): void {
    if (!this.widgetContainer) return;

    const handleStart = (
      clientX: number,
      clientY: number,
      target: EventTarget | null
    ) => {
      // Don't start dragging if clicking on a button
      const element = target as HTMLElement;
      if (
        element &&
        (element.tagName === 'BUTTON' || element.closest('button'))
      ) {
        return;
      }

      this.isDragging = true;
      widget.classList.add('dragging');

      const rect = this.widgetContainer!.getBoundingClientRect();
      this.dragOffsetX = clientX - rect.left;
      this.dragOffsetY = clientY - rect.top;

      document.body.style.userSelect = 'none';
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!this.isDragging || !this.widgetContainer) return;

      let x = clientX - this.dragOffsetX;
      let y = clientY - this.dragOffsetY;

      const rect = this.widgetContainer.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      // Allow free movement in all directions - just clamp to viewport
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));

      this.widgetContainer.style.left = `${x}px`;
      this.widgetContainer.style.top = `${y}px`;
      this.widgetContainer.style.transform = 'none';
      this.widgetContainer.style.right = 'auto';
      this.widgetContainer.style.bottom = 'auto';

      // Store custom position
      this.customPosition = { x, y };

      // Determine orientation class based on position
      // This helps maintain the right layout (horizontal vs vertical)
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      const centerX = x + rect.width / 2;
      const centerY = y + rect.height / 2;

      let positionClass: string;

      if (this.currentOrientation === 'horizontal') {
        // For horizontal orientation, determine if closer to top or bottom
        positionClass = centerY < midY ? 'top-center' : 'bottom-center';
      } else {
        // For vertical orientation, determine if closer to left or right
        positionClass = centerX < midX ? 'left-center' : 'right-center';
      }

      this.widgetContainer.className = `fillkit-widget-container ${positionClass} custom-position`;
    };

    const handleEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      widget.classList.remove('dragging');
      document.body.style.userSelect = '';

      // Setup scroll listener to maintain position
      if (!this.scrollListenerAdded) {
        this.setupScrollListener();
      }
    };

    // Mouse events on entire widget
    widget.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // preventDefault() blocks native focus, so focus explicitly
      widget.focus();
      handleStart(e.clientX, e.clientY, e.target);
    });

    // Store references for cleanup in destroy()
    this.dragMoveHandler = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    this.dragEndHandler = handleEnd;
    this.touchMoveHandler = (e: TouchEvent) => {
      if (this.isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };
    this.touchEndHandler = handleEnd;

    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);

    // Touch events on entire widget
    widget.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e.target);
      },
      { passive: true }
    );

    document.addEventListener('touchmove', this.touchMoveHandler, {
      passive: false,
    });
    document.addEventListener('touchend', this.touchEndHandler);
  }

  /**
   * Sets up a scroll listener to maintain the widget's fixed position.
   *
   * @remarks
   * Ensures the widget stays in its custom position relative to the viewport
   * even when the page is scrolled.
   */
  private setupScrollListener(): void {
    if (this.scrollListenerAdded) return;

    this.scrollHandler = () => {
      if (this.customPosition && this.widgetContainer) {
        // Maintain the fixed position relative to viewport
        this.widgetContainer.style.left = `${this.customPosition.x}px`;
        this.widgetContainer.style.top = `${this.customPosition.y}px`;
      }
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.scrollListenerAdded = true;
  }

  /**
   * Sets up keyboard-based repositioning for accessibility.
   *
   * @remarks
   * Arrow keys move the widget by 20px. Shift+Arrow moves by 50px.
   * The widget is clamped to viewport boundaries. Position is persisted
   * to the uiConfig atom. Satisfies WCAG 2.1 AA for operable UI.
   */
  private setupKeyboardRepositioning(): void {
    if (!this.widgetContainer || !this.widgetElement) return;

    // Attach to the inner widget element (container has pointer-events: none)
    this.widgetElement.setAttribute('tabindex', '0');
    this.widgetElement.setAttribute('aria-roledescription', 'draggable widget');

    this.widgetElement.addEventListener('keydown', (e: KeyboardEvent) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      const step = e.shiftKey ? 50 : 20;
      const containerRect = this.widgetContainer!.getBoundingClientRect();
      let x = containerRect.left;
      let y = containerRect.top;

      switch (e.key) {
        case 'ArrowUp':
          y -= step;
          break;
        case 'ArrowDown':
          y += step;
          break;
        case 'ArrowLeft':
          x -= step;
          break;
        case 'ArrowRight':
          x += step;
          break;
      }

      // Clamp to viewport
      x = Math.max(0, Math.min(x, window.innerWidth - containerRect.width));
      y = Math.max(0, Math.min(y, window.innerHeight - containerRect.height));

      // Apply position to the container
      this.customPosition = { x, y };
      this.widgetContainer!.style.left = `${x}px`;
      this.widgetContainer!.style.top = `${y}px`;
      this.widgetContainer!.style.transform = 'none';
      this.widgetContainer!.style.right = 'auto';
      this.widgetContainer!.style.bottom = 'auto';

      // Update position class for layout orientation
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      const centerX = x + containerRect.width / 2;
      const centerY = y + containerRect.height / 2;

      let positionClass: string;
      if (this.currentOrientation === 'horizontal') {
        positionClass = centerY < midY ? 'top-center' : 'bottom-center';
      } else {
        positionClass = centerX < midX ? 'left-center' : 'right-center';
      }

      this.widgetContainer!.className = `fillkit-widget-container ${positionClass} custom-position`;

      // Persist to uiConfig atom
      uiConfig.set({
        ...uiConfig.get(),
        position: {
          ...uiConfig.get().position,
          custom: { x, y },
        },
      });

      // Setup scroll listener to maintain position
      if (!this.scrollListenerAdded) {
        this.setupScrollListener();
      }
    });
  }

  /**
   * Rotates the widget orientation between horizontal and vertical.
   *
   * @remarks
   * Adjusts the widget's CSS class to switch layout modes while maintaining
   * its approximate position on screen.
   */
  rotate(): void {
    if (!this.widgetContainer) return;

    // Toggle orientation
    this.currentOrientation =
      this.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';

    // Determine new position class based on current location and new orientation
    const rect = this.widgetContainer.getBoundingClientRect();
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let newPositionClass: string;

    if (this.currentOrientation === 'horizontal') {
      // Switched to horizontal - determine if closer to top or bottom
      newPositionClass = centerY < midY ? 'top-center' : 'bottom-center';
    } else {
      // Switched to vertical - determine if closer to left or right
      newPositionClass = centerX < midX ? 'left-center' : 'right-center';
    }

    // Keep widget in same position, just update the class for layout orientation
    this.widgetContainer.className = `fillkit-widget-container ${newPositionClass} custom-position`;
  }

  /**
   * Shows or hides the settings badge based on optionsSheet visibility.
   */
  private updateSettingsBadgeVisibility(): void {
    const badge = this.widgetContainer?.querySelector(
      '#fillkit-widget-status-badge'
    ) as HTMLElement | null;
    if (!badge) return;
    badge.style.display = this.optionsSheetVisible ? '' : 'none';
  }

  /**
   * Makes the widget visible.
   */
  show(): void {
    if (this.widgetContainer) {
      this.widgetContainer.style.display = '';
    }
  }

  /**
   * Hides the widget.
   */
  hide(): void {
    if (this.widgetContainer) {
      this.widgetContainer.style.display = 'none';
    }
  }

  /**
   * Updates the widget's internal status state and refreshes the UI.
   *
   * @param status - The new status ('local', 'cloud', or 'cloud-degraded').
   */
  updateStatusIndicator(status: 'local' | 'cloud' | 'cloud-degraded'): void {
    this.currentStatus = status;

    // Only update DOM if widget container exists
    if (this.widgetContainer) {
      this.updateStatusBadge();
    }
  }

  /**
   * Destroys the widget and cleans up resources.
   *
   * @remarks
   * Unsubscribes from all listeners and removes the widget from the DOM.
   */
  destroy(): void {
    // Unsubscribe from feedback
    if (this.unsubscribeFeedback) {
      this.unsubscribeFeedback();
      this.unsubscribeFeedback = undefined;
    }

    // Unsubscribe from provider changes
    if (this.unsubscribeProvider) {
      this.unsubscribeProvider();
      this.unsubscribeProvider = undefined;
    }

    // Unsubscribe from UI config changes
    if (this.unsubscribeUiConfig) {
      this.unsubscribeUiConfig();
      this.unsubscribeUiConfig = undefined;
    }

    // Remove global event listeners to prevent leaks in SPA init/destroy cycles
    if (this.dragMoveHandler) {
      document.removeEventListener('mousemove', this.dragMoveHandler);
      this.dragMoveHandler = null;
    }
    if (this.dragEndHandler) {
      document.removeEventListener('mouseup', this.dragEndHandler);
      this.dragEndHandler = null;
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
      this.touchMoveHandler = null;
    }
    if (this.touchEndHandler) {
      document.removeEventListener('touchend', this.touchEndHandler);
      this.touchEndHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    if (this.widgetContainer) {
      this.widgetContainer.remove();
      this.widgetContainer = null;
    }
    this.widgetElement = null;
  }

  /**
   * Dispatches a custom event to the document.
   *
   * @param eventType - The specific event type (prefixed with 'fillkit:').
   * @param detail - Optional data to pass with the event.
   */
  private dispatchEvent(eventType: string, detail?: unknown): void {
    const event = new CustomEvent(`fillkit:${eventType}`, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  }
}
