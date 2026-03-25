/**
 * Bridges custom DOM events (`fillkit:*`) to SDK method calls.
 *
 * @remarks
 * Centralizes the `document.addEventListener('fillkit:*', ...)` registrations
 * that were previously inlined in {@link FillKit.setupUiEventListeners}.
 * Stores all listener references so they can be removed on {@link destroy}.
 */

import type { CloudEventHandler } from './CloudEventHandler.js';
import type { UiInjector } from './UiInjector.js';

/**
 * Callbacks interface for core SDK actions triggered by UI events.
 *
 * @remarks
 * Each callback maps to a public FillKit method that the bridge delegates to.
 */
export interface UiEventCallbacks {
  /** Autofill all forms on the page */
  autofillAll(): Promise<void>;
  /** Autofill the currently focused form */
  autofillCurrent(): Promise<void>;
  /** Clear all filled values */
  clear(scope?: HTMLElement | Document): void;
  /** Clear the currently focused form */
  clearCurrent(): void;
  /** Cycle the widget position */
  shufflePosition(): void;
  /** Autofill a specific form */
  autofill(target: HTMLFormElement | HTMLElement): Promise<void>;
}

/**
 * Dependencies required by UiEventBridge.
 */
export interface UiEventBridgeDeps {
  /** Callbacks for core SDK actions */
  callbacks: UiEventCallbacks;
  /** UI injector for opening the options sheet */
  uiInjector: UiInjector;
  /** Cloud event handler for cloud-specific events */
  cloudEventHandler: CloudEventHandler;
}

/** Stored listener entry for cleanup */
interface ListenerEntry {
  eventName: string;
  handler: EventListener;
}

/**
 * Bridges `fillkit:*` DOM custom events to SDK method calls.
 *
 * @remarks
 * Registers all UI event listeners on `document` and provides a
 * {@link destroy} method to cleanly remove them.
 */
export class UiEventBridge {
  private readonly callbacks: UiEventCallbacks;
  private readonly uiInjector: UiInjector;
  private readonly cloudEventHandler: CloudEventHandler;
  private readonly listeners: ListenerEntry[] = [];
  private attached = false;

  constructor(deps: UiEventBridgeDeps) {
    this.callbacks = deps.callbacks;
    this.uiInjector = deps.uiInjector;
    this.cloudEventHandler = deps.cloudEventHandler;
  }

  /**
   * Registers all `fillkit:*` event listeners on `document`.
   *
   * @remarks
   * Idempotent: calling multiple times has no effect after the first call.
   */
  setup(): void {
    if (this.attached) return;
    this.attached = true;

    // Core fill actions
    this.addListener('fillkit:fillAll', () => this.callbacks.autofillAll());
    this.addListener('fillkit:fillCurrent', () =>
      this.callbacks.autofillCurrent()
    );
    this.addListener('fillkit:clearAll', () => this.callbacks.clear());
    this.addListener('fillkit:clearCurrent', () =>
      this.callbacks.clearCurrent()
    );
    this.addListener('fillkit:shufflePosition', () =>
      this.callbacks.shufflePosition()
    );
    this.addListener('fillkit:openOptions', () =>
      this.uiInjector.openOptionsSheet()
    );

    // Form-specific fill/clear
    this.addListener('fillkit:fillForm', event => {
      const customEvent = event as CustomEvent<{
        form: HTMLFormElement;
      }>;
      this.callbacks.autofill(customEvent.detail.form);
    });
    this.addListener('fillkit:clearForm', event => {
      const customEvent = event as CustomEvent<{
        form: HTMLFormElement;
      }>;
      this.callbacks.clear(customEvent.detail.form);
    });
    this.addListener('fillkit:fillInput', event => {
      const customEvent = event as CustomEvent<{
        input: HTMLElement;
      }>;
      this.callbacks.autofill(customEvent.detail.input);
    });

    // Rotation handled by KeyboardShortcuts
    this.addListener('fillkit:rotateWidget', () => {});

    // Restore main widget from FAB minimized state
    this.addListener('fillkit:restoreWidget', () => {
      this.uiInjector.showMainWidget();
    });

    // Cloud provider event handlers
    this.addListener('fillkit:saveAndFetchProjects', async event => {
      await this.cloudEventHandler.handleSaveAndFetchProjects(
        event as CustomEvent
      );
    });
    this.addListener('fillkit:validateCloudCredentials', async event => {
      await this.cloudEventHandler.handleValidateCloudCredentials(
        event as CustomEvent
      );
    });
    this.addListener('fillkit:loadProjects', async event => {
      await this.cloudEventHandler.handleLoadProjects(event as CustomEvent);
    });
    this.addListener('fillkit:activateCloudProvider', async event => {
      await this.cloudEventHandler.handleActivateCloudProvider(
        event as CustomEvent
      );
    });
    this.addListener('fillkit:scanPage', async () => {
      await this.cloudEventHandler.handleScanPage();
    });
    this.addListener('fillkit:scanUrls', async event => {
      await this.cloudEventHandler.handleScanUrls(event as CustomEvent);
    });
    this.addListener('fillkit:syncDatasets', async () => {
      await this.cloudEventHandler.handleSyncDatasets();
    });
  }

  /**
   * Removes all registered event listeners and resets state.
   */
  destroy(): void {
    for (const { eventName, handler } of this.listeners) {
      document.removeEventListener(eventName, handler);
    }
    this.listeners.length = 0;
    this.attached = false;
  }

  /**
   * Registers a single event listener and stores it for later cleanup.
   */
  private addListener(eventName: string, handler: EventListener): void {
    document.addEventListener(eventName, handler);
    this.listeners.push({ eventName, handler });
  }
}
