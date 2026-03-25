/**
 * Orchestrates UI widget injection and manages their lifecycle.
 *
 * @remarks
 * Coordinates between MainWidget, FabWidget, InlineFillIndicator, OptionsSheet,
 * and HelpSheet. Manages widget creation, destruction, visibility, and state
 * synchronization with nanostores atoms. Handles theme detection and keyboard
 * shortcuts for sheet navigation.
 */

import { logger } from '@/core/Logger.js';
import type { UiPlacement } from '../types/index.js';
import { MainWidget } from './widgets/MainWidget.js';
import { FabWidget } from './widgets/FabWidget.js';
import { InlineFillIndicator } from './widgets/InlineFillIndicator.js';
import { OptionsSheet } from './widgets/OptionsSheet.js';
import { HelpSheet } from './widgets/HelpSheet.js';
import { generateStyles } from './widgets/styles.js';
import type { FeedbackManager } from './FeedbackManager.js';
import { uiConfig } from '../state/atoms/index.js';

/**
 * UI injection configuration
 */
export interface UiInjectionConfig {
  enabled: boolean;
  position: UiPlacement;
}

/**
 * Options for initializing UI with current state
 */
export interface UiInitOptions {
  mode?: 'valid' | 'invalid';
  provider?: 'local' | 'cloud';
  locale?: string;
  refill?: boolean;
  watchMode?: boolean;
  includeOutsideForms?: boolean;
}

/**
 * Orchestrates all UI widgets and manages their lifecycle.
 *
 * @remarks
 * Subscribes to UI config changes and automatically updates widget visibility and position.
 *
 * @example
 * ```ts
 * const injector = new UiInjector(feedbackManager);
 * await injector.init();
 * injector.openOptionsSheet();
 * ```
 */
export class UiInjector {
  private feedbackManager: FeedbackManager;
  private unsubscribeUiConfig?: () => void;
  private mainWidget: MainWidget | null = null;
  private fabWidget: FabWidget | null = null;
  private inlineFillIndicator: InlineFillIndicator | null = null;
  private optionsSheet: OptionsSheet | null = null;
  private helpSheet: HelpSheet | null = null;
  private optionsOverlay: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private initialized = false;
  private initRequested = false;
  private initPromise: Promise<void> | null = null;
  private themeObserver: MutationObserver | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
  private cspNonce: string | undefined;

  constructor(feedbackManager: FeedbackManager, cspNonce?: string) {
    this.feedbackManager = feedbackManager;
    this.cspNonce = cspNonce;

    // nanostores fires synchronously on subscribe; !initialized guard prevents premature init
    this.unsubscribeUiConfig = uiConfig.subscribe(cfg => {
      this.handleUiConfigChange(cfg);
    });
  }

  /**
   * Handle UI config changes from atom
   */
  private handleUiConfigChange(
    cfg: typeof uiConfig extends import('nanostores').Atom<infer T> ? T : never
  ): void {
    // Lazy initialization: if enabled becomes true and we haven't initialized
    // yet, trigger init(). Only applies after init() has been called at least
    // once (i.e., after FillKit.initializeUi()). This prevents the constructor's
    // initial subscription from triggering init() prematurely.
    if (cfg.enabled && !this.initialized && this.initRequested) {
      this.init();
      return;
    }

    if (!this.initialized || !this.mainWidget) {
      return;
    }

    // Handle visibility changes
    if (cfg.enabled) {
      if (cfg.mainWidgetVisible) {
        this.mainWidget.show();
        this.fabWidget?.hide();
      } else {
        this.mainWidget.hide();
        this.fabWidget?.show();
      }
    } else {
      this.mainWidget.hide();
      this.fabWidget?.hide();
    }

    // Handle fillMode changes
    if (cfg.fillMode === 'inline') {
      this.inlineFillIndicator?.activate();
    } else {
      this.inlineFillIndicator?.deactivate();
    }

    // OptionsSheet will handle its own atom subscription
  }

  /**
   * Initializes UI injection.
   *
   * @remarks
   * Waits for DOM to be ready, injects styles, creates widgets, and sets up
   * theme watcher and escape key handler. Always initializes widgets; hides them
   * if `uiConfig.enabled` is `false` so they can be shown later without a page
   * refresh.
   *
   * Safe to call multiple times; concurrent calls are coalesced via initPromise.
   */
  async init(): Promise<void> {
    this.initRequested = true;

    if (this.initialized) {
      return;
    }

    // Coalesce concurrent init() calls — return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal init implementation, called only once.
   */
  private async doInit(): Promise<void> {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    this.injectStyles();
    this.createWidgets();
    this.setupThemeWatcher();
    this.setupEscapeHandler();

    this.initialized = true;

    // Apply initial visibility state
    const cfg = uiConfig.get();
    if (!cfg.enabled) {
      this.mainWidget?.hide();
      this.fabWidget?.hide();
    } else if (!cfg.mainWidgetVisible) {
      this.mainWidget?.hide();
      this.fabWidget?.show();
    }

    // Apply initial fill mode
    if (cfg.fillMode === 'inline') {
      this.inlineFillIndicator?.activate();
    }
  }

  /**
   * Destroys injected UI and cleans up resources.
   *
   * @remarks
   * Unsubscribes from atoms, destroys all widgets, removes overlay and styles.
   * Safe to call multiple times.
   */
  destroy(): void {
    // Remove escape key handler
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }

    // Unsubscribe from atom
    if (this.unsubscribeUiConfig) {
      this.unsubscribeUiConfig();
    }

    // Disconnect theme observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }

    // Destroy widgets
    if (this.mainWidget) {
      this.mainWidget.destroy();
      this.mainWidget = null;
    }

    if (this.fabWidget) {
      this.fabWidget.destroy();
      this.fabWidget = null;
    }

    if (this.inlineFillIndicator) {
      this.inlineFillIndicator.destroy();
      this.inlineFillIndicator = null;
    }

    if (this.optionsSheet) {
      this.optionsSheet.destroy();
      this.optionsSheet = null;
    }

    if (this.helpSheet) {
      this.helpSheet.destroy();
      this.helpSheet = null;
    }

    // Remove overlay
    if (this.optionsOverlay) {
      this.optionsOverlay.remove();
      this.optionsOverlay = null;
    }

    // Remove styles
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    this.initialized = false;
    this.initRequested = false;
    this.initPromise = null;
  }

  /**
   * Shows the FAB and hides the main widget toolbar.
   */
  showFab(): void {
    if (!this.initialized) return;
    this.mainWidget?.hide();
    this.fabWidget?.show();
    uiConfig.set({
      ...uiConfig.get(),
      mainWidgetVisible: false,
    });
  }

  /**
   * Shows the main widget toolbar and hides the FAB.
   */
  showMainWidget(): void {
    if (!this.initialized) return;
    this.mainWidget?.show();
    this.fabWidget?.hide();
    uiConfig.set({
      ...uiConfig.get(),
      mainWidgetVisible: true,
    });
  }

  /**
   * Toggles between main widget toolbar and FAB minimized state.
   */
  toggleMainWidgetFab(): void {
    if (!this.initialized) {
      // If not initialized but UI is enabled, lazy-init then show
      const cfg = uiConfig.get();
      if (cfg.enabled) {
        this.init();
      }
      return;
    }

    const cfg = uiConfig.get();
    if (cfg.mainWidgetVisible) {
      this.showFab();
    } else {
      this.showMainWidget();
    }
  }

  /**
   * Updates UI configuration.
   *
   * @remarks
   * **Deprecated**: Use `uiConfig.set()` directly instead.
   * Updates the UI config atom and reinitializes widgets if position changes.
   *
   * @param config - Partial UI configuration to update.
   * @deprecated Use uiConfig.set() directly.
   */
  async updateConfig(config: Partial<UiInjectionConfig>): Promise<void> {
    const currentCfg = uiConfig.get();
    const needsReinit =
      config.position !== undefined &&
      config.position !== currentCfg.position.placement;

    const enabledChanged =
      config.enabled !== undefined && config.enabled !== currentCfg.enabled;

    // Update atom
    if (config.enabled !== undefined || config.position !== undefined) {
      uiConfig.set({
        ...currentCfg,
        ...(config.enabled !== undefined && { enabled: config.enabled }),
        ...(config.position !== undefined && {
          position: { placement: config.position },
        }),
      });
    }

    // If enabled is set to false, hide the widget but keep sheets available
    if (enabledChanged && !config.enabled && this.initialized) {
      this.mainWidget?.hide();
      this.fabWidget?.hide();
      return;
    }

    // If enabled is set to true and UI was hidden, show it again
    if (enabledChanged && config.enabled && this.initialized) {
      this.mainWidget?.show();
      return;
    }

    // If enabled is set to true and UI is not initialized, initialize it
    if (enabledChanged && config.enabled && !this.initialized) {
      await this.init();
      return;
    }

    if (this.initialized && needsReinit) {
      this.destroy();
      await this.init();
    }
  }

  /**
   * Updates current options state.
   *
   * @remarks
   * **Deprecated**: Options are now in Store, OptionsSheet subscribes directly.
   * Kept for backward compatibility but does nothing.
   *
   * @param _options - Options to update (ignored).
   * @deprecated Options are now in Store, OptionsSheet subscribes directly.
   */
  updateOptions(_options: UiInitOptions): void {
    // This method is deprecated - OptionsSheet now subscribes to store directly
    // Keeping it for backward compatibility but it does nothing
  }

  /**
   * Sets up theme watcher for page-level dark mode changes.
   *
   * @remarks
   * Watches for changes to the `class`, `data-theme`, and `data-mode` attributes
   * on the `html` element. Page-only strategy: the widget follows the host page's
   * explicit theme classes only, with no OS preference fallback.
   */
  private setupThemeWatcher(): void {
    // Watch for page-level theme changes on the html element
    const htmlElement = document.documentElement;
    this.themeObserver = new MutationObserver(() => {
      this.handleThemeChange();
    });

    // Watch for class and data-theme/data-mode attribute changes
    this.themeObserver.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-mode'],
    });
  }

  /**
   * Handles theme change events.
   *
   * @remarks
   * Re-injects styles to update theme-dependent CSS variables.
   */
  private handleThemeChange = (): void => {
    if (this.styleElement) {
      this.styleElement.textContent = generateStyles();
    }
  };

  /**
   * Injects CSS styles for widgets.
   *
   * @remarks
   * Removes any existing FillKit styles (defensive check for hot reload) before
   * injecting new styles. Styles are generated based on current theme.
   */
  private injectStyles(): void {
    if (this.styleElement) {
      return;
    }

    const existing = document.querySelectorAll('style[data-fillkit]');
    for (const style of existing) {
      style.remove();
    }

    this.styleElement = document.createElement('style');
    this.styleElement.setAttribute('data-fillkit', 'true');
    if (this.cspNonce) {
      this.styleElement.nonce = this.cspNonce;
    }
    this.styleElement.textContent = generateStyles();
    document.head.appendChild(this.styleElement);
  }

  /**
   * Creates all widgets.
   *
   * @remarks
   * Creates MainWidget, FabWidget, InlineFillIndicator, OptionsSheet, HelpSheet,
   * and shared overlay. Performs defensive checks to remove duplicate widgets from
   * DOM (for hot reload scenarios).
   *
   * @param sheetsOnly - If `true`, only create sheets (not main widget).
   */
  private createWidgets(sheetsOnly = false): void {
    if (!sheetsOnly) {
      const existingWidgets = document.querySelectorAll(
        '.fillkit-widget-container'
      );
      if (existingWidgets.length > 0) {
        logger.warn(
          '[FillKit] Found existing widget containers in DOM, removing them...'
        );
        existingWidgets.forEach(widget => widget.remove());
      }
    }

    // Check for existing overlay in DOM
    const existingOverlays = document.querySelectorAll(
      '.fillkit-options-overlay'
    );
    if (existingOverlays.length > 0) {
      // Reuse the first existing overlay if found, but remove others
      if (existingOverlays.length > 1) {
        for (let i = 1; i < existingOverlays.length; i++) {
          existingOverlays[i].remove();
        }
      }
      // Use the existing overlay if we don't have one yet
      if (!this.optionsOverlay && existingOverlays.length > 0) {
        this.optionsOverlay = existingOverlays[0] as HTMLElement;
      }
    }

    // Create shared overlay for sheets if it doesn't exist
    if (!this.optionsOverlay) {
      this.optionsOverlay = document.createElement('div');
      this.optionsOverlay.className = 'fillkit-options-overlay';
      document.body.appendChild(this.optionsOverlay);
    }

    // Create main widget (only if not sheets-only and doesn't exist)
    if (!sheetsOnly && !this.mainWidget) {
      const cfg = uiConfig.get();
      this.mainWidget = new MainWidget(
        cfg.position.placement,
        this.feedbackManager
      );
      const widgetElement = this.mainWidget.create();
      document.body.appendChild(widgetElement);

      // Hide widget if config says it should be hidden
      if (!cfg.enabled) {
        this.mainWidget.hide();
      }
    }

    // Create FAB widget (only if not sheets-only and doesn't exist)
    if (!sheetsOnly && !this.fabWidget) {
      this.fabWidget = new FabWidget();
      const fabElement = this.fabWidget.create();
      document.body.appendChild(fabElement);
      // FAB starts hidden; shown only when main widget is minimized
    }

    // Create inline fill indicator (only if not sheets-only and doesn't exist)
    if (!sheetsOnly && !this.inlineFillIndicator) {
      this.inlineFillIndicator = new InlineFillIndicator();
      // Activation happens in handleUiConfigChange based on fillMode
    }

    // Create options sheet if it doesn't exist
    if (!this.optionsSheet) {
      this.optionsSheet = new OptionsSheet(this.feedbackManager);
      const optionsElement = this.optionsSheet.create(this.optionsOverlay);
      document.body.appendChild(optionsElement);
    }

    // Create help sheet if it doesn't exist
    if (!this.helpSheet) {
      this.helpSheet = new HelpSheet();
      const helpElement = this.helpSheet.create(this.optionsOverlay);
      document.body.appendChild(helpElement);
    }
  }

  /**
   * Sets up Escape key handler to close sheets.
   *
   * @remarks
   * Listens for Escape key presses and closes any open sheets (help or options).
   */
  private setupEscapeHandler(): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const helpOpen = this.helpSheet?.isOpen();
        const optionsOpen = this.optionsSheet?.isOpen();

        if (helpOpen || optionsOpen) {
          e.preventDefault();
          e.stopPropagation();
          this.closeHelpSheet();
          this.closeOptionsSheet();
        }
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  /**
   * Rotates widget between horizontal and vertical orientations.
   */
  rotateWidget(): void {
    this.mainWidget?.rotate();
  }

  /**
   * Opens the options sheet.
   *
   * @remarks
   * Ensures styles are injected and recreates sheets if they don't exist.
   */
  async openOptionsSheet(): Promise<void> {
    // Block opening when visibility says optionsSheet is disabled
    if (!uiConfig.get().visibility.optionsSheet) return;

    // Ensure styles are injected
    if (!this.styleElement) {
      this.injectStyles();
    }

    // Recreate sheets if they don't exist (e.g., after destroy was called)
    if (!this.optionsSheet || !this.optionsOverlay) {
      this.createWidgets(true); // Only create sheets, not main widget
    }

    await this.optionsSheet?.open();
  }

  /**
   * Closes the options sheet.
   */
  closeOptionsSheet(): void {
    this.optionsSheet?.close();
  }

  /**
   * Toggles the options sheet (open if closed, close if open).
   *
   * @remarks
   * Ensures styles are injected and recreates sheets if they don't exist.
   */
  async toggleOptionsSheet(): Promise<void> {
    // Block toggling when visibility says optionsSheet is disabled
    if (!uiConfig.get().visibility.optionsSheet) return;

    // Ensure styles are injected
    if (!this.styleElement) {
      this.injectStyles();
    }

    // Recreate sheets if they don't exist (e.g., when widget is hidden)
    if (!this.optionsSheet || !this.optionsOverlay) {
      this.createWidgets(true); // Only create sheets, not main widget
    }

    await this.optionsSheet?.toggle();
  }

  /**
   * Opens the help sheet.
   *
   * @remarks
   * Ensures styles are injected, recreates sheets if they don't exist, and
   * closes the options sheet if it's open.
   */
  openHelpSheet(): void {
    // Ensure styles are injected
    if (!this.styleElement) {
      this.injectStyles();
    }

    // Recreate sheets if they don't exist (e.g., after destroy was called)
    if (!this.helpSheet || !this.optionsOverlay) {
      this.createWidgets(true); // Only create sheets, not main widget
    }

    // Close options sheet if open
    this.closeOptionsSheet();

    this.helpSheet?.open();
  }

  /**
   * Closes the help sheet.
   */
  closeHelpSheet(): void {
    this.helpSheet?.close();
  }

  /**
   * Toggles the help sheet (open if closed, close if open).
   *
   * @remarks
   * Ensures styles are injected and recreates sheets if they don't exist.
   */
  toggleHelpSheet(): void {
    // Ensure styles are injected
    if (!this.styleElement) {
      this.injectStyles();
    }

    // Recreate sheets if they don't exist (e.g., when widget is hidden)
    if (!this.helpSheet || !this.optionsOverlay) {
      this.createWidgets(true); // Only create sheets, not main widget
    }

    this.helpSheet?.toggle();
  }

  /**
   * Handles save and fetch projects result from cloud operations.
   *
   * @param result - Result object containing success status, API key, projects, and optional error.
   */
  public handleSaveAndFetchProjectsResult(result: {
    success: boolean;
    apiKey: string;
    projects: Array<{ id: string; name: string; description?: string }>;
    error?: string;
  }): void {
    this.optionsSheet?.handleSaveAndFetchProjectsResult(result);
  }

  /**
   * Handles projects list result from cloud operations.
   *
   * @param projects - Array of project objects with id, name, and optional description.
   */
  public handleProjectsList(
    projects: Array<{ id: string; name: string; description?: string }>
  ): void {
    this.optionsSheet?.handleProjectsList(projects);
  }

  /**
   * Shows cloud status message in the options sheet.
   *
   * @param type - Message type ('loading', 'success', or 'error').
   * @param message - Status message to display.
   * @param showSaaSLink - Whether to show a link to the SaaS platform.
   */
  public showCloudStatus(
    type: 'loading' | 'success' | 'error',
    message: string,
    showSaaSLink = false
  ): void {
    this.optionsSheet?.showCloudStatus(type, message, showSaaSLink);
  }

  /**
   * Updates dataset status display in the options sheet.
   *
   * @param stats - Dataset statistics including version and last sync time.
   */
  public updateDatasetStatusDisplay(stats: {
    version: string;
    lastSync: number | null;
  }): void {
    this.optionsSheet?.updateDatasetStatus(stats);
  }

  /**
   * Updates provider status display.
   *
   * @remarks
   * Updates the widget status indicator based on provider status.
   *
   * @param stats - Provider statistics including status, fill counts, and type availability.
   */
  public updateProviderStatus(stats: {
    status: 'local' | 'cloud' | 'cloud-degraded';
    cloudFills: number;
    localFills: number;
    availableTypes: Set<string>;
    missingTypes: Set<string>;
  }): void {
    // Update widget status indicator
    this.updateWidgetStatusIndicator(stats.status);
  }

  /**
   * Updates widget status indicator dot.
   *
   * @param status - Provider status ('local', 'cloud', or 'cloud-degraded').
   */
  public updateWidgetStatusIndicator(
    status: 'local' | 'cloud' | 'cloud-degraded'
  ): void {
    this.mainWidget?.updateStatusIndicator(status);
  }

  /**
   * Shows cloud actions section in the options sheet.
   */
  public showCloudActions(): void {
    this.optionsSheet?.showCloudActions();
  }

  /**
   * Hides cloud actions section in the options sheet.
   */
  public hideCloudActions(): void {
    this.optionsSheet?.hideCloudActions();
  }
}
