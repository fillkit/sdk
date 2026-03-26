/**
 * The main entry point for the FillKit SDK.
 *
 * @remarks
 * This class orchestrates the entire SDK functionality, including initialization,
 * provider management, UI injection, form detection, and autofill operations.
 * It uses Nanostores for reactive state management and configuration persistence.
 */

import type { DatasetProvider } from '../types/index.js';
import { LocalProvider } from '../providers/LocalProvider.js';
import type {
  FillKitOptions,
  AutofillOptions,
  FillMode,
  FillKitEventName,
  FillKitEventHandler,
  UiPlacement,
  FieldDetection,
  ValuePreview,
  PageContext,
  FormContext,
  FieldContext,
  ValueOptions,
  PageSchema,
  FormSchema,
  SchemaExtractionOptions,
} from '../types/index.js';
import type { ScanOptions, ScanSummary, UploadResult } from '../types/cloud.js';
import { ConfigurationError, ProviderError } from '../types/index.js';
import { CloudProvider } from '../providers/CloudProvider.js';
import { UiInjector } from './UiInjector.js';
import { KeyboardShortcuts } from './KeyboardShortcuts.js';
import { ContextCollector } from './ContextCollector.js';
import { PageScanner } from './PageScanner.js';
import { SchemaCache } from '../storage/SchemaCache.js';
import { ProviderManager } from './ProviderManager.js';
import { FeedbackManager } from './FeedbackManager.js';
import { LocalStorageAdapter } from '../storage/StorageAdapter.js';
import { FormDetector } from './FormDetector.js';
import { FieldDetector } from './FieldDetector.js';
import { FormTracker } from './FormTracker.js';
import { ValueGenerator } from './ValueGenerator.js';
import { FieldFiller } from './FieldFiller.js';
import { FillOrchestrator } from './FillOrchestrator.js';
import { logger } from '@/core/Logger.js';
import { SchemaExtractor } from './SchemaExtractor.js';
import {
  CloudEventHandler,
  type CloudEventDelegate,
} from './CloudEventHandler.js';
import { UiEventBridge } from './UiEventBridge.js';
import { AriaAnnouncer } from './AriaAnnouncer.js';

import {
  sdkOptions,
  cloudConfig,
  uiConfig,
  widgetState,
  setTokenProvider,
  resolveVisibility,
  unresolveVisibility,
  type SdkOptionsState,
  type CloudConfigState,
} from '../state/atoms/index.js';
/**
 * Global instance key for tracking FillKit instances with UI enabled.
 * Used to prevent duplicate instances in the same DOM.
 */
const FILLKIT_UI_INSTANCE_KEY = '__fillkit_ui_instance__';

/**
 * Global instance key for the extension coexistence protocol.
 * Set synchronously in the constructor so extensions can detect page-embedded SDKs.
 */
const FILLKIT_INSTANCE_KEY = '__fillkit_instance__';

/**
 * Instance marker for extension coexistence.
 */
export interface FillKitInstanceMarker {
  source: 'page' | 'extension';
  instance: FillKit;
  timestamp: number;
}

/** Typed accessor for globalThis with string-keyed properties */
const globalRecord = globalThis as unknown as Record<string, unknown>;

/**
 * Checks if localStorage has persisted state for a given key.
 *
 * @remarks
 * Used to determine if constructor options should override persisted state.
 *
 * @param key - The localStorage key to check.
 * @returns `true` if valid persisted state exists, `false` otherwise.
 */
function hasPersistedState(key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const value = localStorage.getItem(key);
    return value !== null && value !== 'null' && value !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * The main FillKit SDK class.
 */
export class FillKit {
  // Atom subscriptions for reactive config changes
  private unsubscribeSdkOptions?: () => void;
  private unsubscribeCloudConfig?: () => void;
  private unsubscribeUiConfig?: () => void;

  private prevSdkOptions?: SdkOptionsState;
  private prevCloudConfig?: CloudConfigState;

  private hydrationComplete = false;
  private providerInitAttempts = 0;
  private initializationStartTime = 0;

  private initializationPromise: Promise<void>;
  public get ready(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * Initializes FillKit asynchronously and returns a ready instance.
   *
   * @remarks
   * Recommended over `new FillKit()` to ensure the SDK is fully ready (providers initialized,
   * state hydrated) before use.
   *
   * @param options - Configuration options for the SDK.
   * @returns A promise resolving to the initialized FillKit instance.
   * @throws Error if initialization fails.
   */
  private static pendingInit: Promise<FillKit> | null = null;

  static async init(options?: FillKitOptions): Promise<FillKit> {
    // Singleton guard: reuse pending init if one is already in progress
    if (FillKit.pendingInit) {
      return FillKit.pendingInit;
    }

    FillKit.pendingInit = (async () => {
      try {
        const instance = new FillKit(options);
        await instance.ready;
        if (!instance.initialized) {
          throw (
            instance.initError ?? new Error('FillKit initialization failed')
          );
        }
        return instance;
      } finally {
        FillKit.pendingInit = null;
      }
    })();

    return FillKit.pendingInit;
  }

  /**
   * Exposes internal state atoms for advanced usage and reactivity.
   */
  static atoms = {
    sdkOptions,
    cloudConfig,
    uiConfig,
    widgetState,
  };

  // Data provider
  private provider!: DatasetProvider;

  // Components
  private formDetector: FormDetector;
  private fieldDetector: FieldDetector;
  private formTracker: FormTracker;
  private valueGenerator: ValueGenerator;
  private fieldFiller: FieldFiller;
  private fillOrchestrator: FillOrchestrator;
  private uiInjector!: UiInjector;
  private keyboardShortcuts: KeyboardShortcuts;
  private contextCollector: ContextCollector;
  private pageScanner: PageScanner;
  private schemaCache: SchemaCache;
  private providerManager: ProviderManager;
  private feedbackManager: FeedbackManager;
  private schemaExtractor: SchemaExtractor;
  private cloudEventHandler!: CloudEventHandler;
  private uiEventBridge!: UiEventBridge;
  private ariaAnnouncer: AriaAnnouncer;

  // Constructor options (for non-persisted values like emailDomain)
  private constructorOptions: FillKitOptions;

  private eventHandlers: Map<FillKitEventName, FillKitEventHandler[]> =
    new Map();
  private initialized = false;

  /**
   * Contains the error if initialization failed.
   *
   * @remarks
   * When using `new FillKit()` + `await fk.ready`, `ready` resolves even on failure
   * to avoid unhandled rejections. Check this property to detect failures.
   * Prefer `FillKit.init()` which throws on failure.
   */
  public initError?: Error;
  private formsDetected: number = 0;
  private fieldCountsPerForm: Map<string, number> = new Map();

  /**
   * Cleans up orphaned FillKit UI elements from the DOM.
   *
   * @remarks
   * Removes existing widget containers, overlays, and injected styles to ensure a clean slate.
   */
  private static cleanupOrphanedUI(): void {
    // Remove existing widget containers
    const existingWidgets = document.querySelectorAll(
      '.fillkit-widget-container'
    );
    existingWidgets.forEach(widget => widget.remove());

    // Remove existing options overlay
    const existingOverlays = document.querySelectorAll(
      '.fillkit-options-overlay'
    );
    existingOverlays.forEach(overlay => overlay.remove());

    // Remove existing FillKit style elements
    const styleElements = Array.from(document.querySelectorAll('style'));
    for (const style of styleElements) {
      const content = style.textContent || '';
      if (
        content.includes('.fillkit-widget-container') ||
        content.includes('.fillkit-options-overlay')
      ) {
        style.remove();
      }
    }
  }

  /**
   * Creates a new FillKit instance.
   *
   * @param options - Configuration options for the SDK.
   */
  constructor(options: FillKitOptions = {}) {
    // Save constructor options for non-persisted values (emailDomain, dataset, cache, etc.)
    this.constructorOptions = options;

    // Validate seed early (before any async work)
    if (options.seed !== undefined && options.seed !== null) {
      if (
        typeof options.seed !== 'number' ||
        !Number.isInteger(options.seed) ||
        options.seed < 0
      ) {
        throw new ConfigurationError(
          'seed must be a non-negative integer',
        );
      }
    }

    // Set instance marker synchronously for extension coexistence detection
    globalRecord[FILLKIT_INSTANCE_KEY] = {
      source: options._source ?? 'page',
      instance: this,
      timestamp: Date.now(),
    } satisfies FillKitInstanceMarker;

    // Configure logger level (always applies, not persisted)
    if (options.logLevel) {
      logger.setLevel(options.logLevel);
    }

    // Check if atoms have persisted state
    const hasSdkOptionsState = hasPersistedState('fillkit:sdk-options');
    const hasUiConfigState = hasPersistedState('fillkit:ui-config');
    const hasCloudConfigState = hasPersistedState('fillkit:cloud-config');

    // Apply constructor options to atoms ONLY if no persisted state exists
    // This ensures persisted state takes priority over constructor defaults
    if (!hasSdkOptionsState) {
      // Only apply sdkOptions if localStorage is empty
      if (options.mode !== undefined) {
        sdkOptions.set({ ...sdkOptions.get(), mode: options.mode });
      }
      if (options.provider !== undefined) {
        sdkOptions.set({ ...sdkOptions.get(), provider: options.provider });
      }
      if (options.locale !== undefined) {
        sdkOptions.set({ ...sdkOptions.get(), locale: options.locale });
      }
      if (options.refill !== undefined) {
        sdkOptions.set({ ...sdkOptions.get(), refill: options.refill });
      }
      if (options.watchMode !== undefined) {
        sdkOptions.set({ ...sdkOptions.get(), watchMode: options.watchMode });
      }
      if (options.autofill?.includeOutsideForms !== undefined) {
        sdkOptions.set({
          ...sdkOptions.get(),
          includeOutsideForms: options.autofill.includeOutsideForms,
        });
      }
      if (options.autofill?.includeSelectors !== undefined) {
        sdkOptions.set({
          ...sdkOptions.get(),
          includeSelectors: options.autofill.includeSelectors,
        });
      }
      if (options.autofill?.excludeSelectors !== undefined) {
        sdkOptions.set({
          ...sdkOptions.get(),
          excludeSelectors: options.autofill.excludeSelectors,
        });
      }
    }

    // Apply UI config only if no persisted state
    if (!hasUiConfigState) {
      if (options.ui?.enabled !== undefined) {
        uiConfig.set({ ...uiConfig.get(), enabled: options.ui.enabled });
      }
      if (options.ui?.position !== undefined) {
        uiConfig.set({
          ...uiConfig.get(),
          position: { placement: options.ui.position },
        });
      }
    }

    // Visibility ALWAYS applies (not first-run-only) — extensions must
    // guarantee sections stay hidden regardless of persisted state
    if (options.ui?.visibility !== undefined) {
      const current = uiConfig.get();
      const currentProvider = sdkOptions.get().provider;
      uiConfig.set({
        ...current,
        visibility: resolveVisibility(
          {
            ...unresolveVisibility(current.visibility),
            ...options.ui.visibility,
          },
          currentProvider
        ),
      });
    }

    // Apply cloud config only if no persisted state
    if (!hasCloudConfigState && options.providerConfig) {
      const config = options.providerConfig as
        | { token?: string; projectId?: string }
        | undefined;
      if (config?.token && config?.projectId) {
        cloudConfig.set({
          ...cloudConfig.get(),
          token: config.token,
          projectId: config.projectId,
        });
      }
    }

    // Register custom token provider if supplied
    if (options.tokenProvider) {
      setTokenProvider(options.tokenProvider);
    }

    // Initialize FeedbackManager (session-only by default, no localStorage)
    this.feedbackManager = new FeedbackManager(new LocalStorageAdapter(), {
      persistent: false,
    });

    // Initialize AriaAnnouncer for screen reader announcements
    this.ariaAnnouncer = new AriaAnnouncer();
    this.ariaAnnouncer.init();

    // Initialize components
    const currentSdkOptions = sdkOptions.get();
    this.formDetector = new FormDetector();
    this.fieldDetector = new FieldDetector(currentSdkOptions.locale);
    this.formTracker = new FormTracker();
    this.valueGenerator = new ValueGenerator();
    this.fieldFiller = new FieldFiller();
    this.contextCollector = new ContextCollector();
    this.pageScanner = new PageScanner();
    this.schemaCache = new SchemaCache(
      undefined, // No storage adapter needed (atoms handle persistence)
      options.cache
    );
    this.providerManager = new ProviderManager();

    // Initialize orchestrator
    this.fillOrchestrator = new FillOrchestrator(
      this.formDetector,
      this.fieldDetector,
      this.formTracker,
      this.valueGenerator,
      this.fieldFiller,
      this.providerManager,
      undefined, // Provider will be set after initialization
      this.contextCollector
    );

    // Initialize schema extractor
    this.schemaExtractor = new SchemaExtractor({
      formDetector: this.formDetector,
      fieldDetector: this.fieldDetector,
    });

    // Create UiInjector (now uses atoms instead of Store)
    this.uiInjector = new UiInjector(
      this.feedbackManager,
      this.constructorOptions.cspNonce
    );

    // Initialize cloud event handler
    this.cloudEventHandler = new CloudEventHandler({
      uiInjector: this.uiInjector,
      feedbackManager: this.feedbackManager,
      providerManager: this.providerManager,
      valueGenerator: this.valueGenerator,
      fillOrchestrator: this.fillOrchestrator,
      delegate: this.createCloudEventDelegate(),
    });

    // Initialize UI event bridge
    this.uiEventBridge = new UiEventBridge({
      callbacks: {
        autofillAll: () => this.autofillAll(),
        autofillCurrent: () => this.autofillCurrent(),
        clear: (scope?: HTMLElement | Document) => this.clear(scope),
        clearCurrent: () => this.clearCurrent(),
        shufflePosition: () => this.shufflePosition(),
        autofill: (target: HTMLFormElement | HTMLElement) =>
          this.autofill(target),
      },
      uiInjector: this.uiInjector,
      cloudEventHandler: this.cloudEventHandler,
    });

    // Initialize keyboard shortcuts
    this.keyboardShortcuts = new KeyboardShortcuts({ enabled: true });

    // Start form tracking
    this.formTracker.startTracking();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup event listeners
    this.uiEventBridge.setup();

    // Subscribe to atom changes
    this.subscribeToAtoms();

    // Initialize provider asynchronously
    this.initializationPromise = this.performInitialization();

    this.initializationPromise
      .then(() => {
        const currentUiConfig = uiConfig.get();
        const currentSdkOpts = sdkOptions.get();

        // Initialize UI if enabled
        if (currentUiConfig.enabled) {
          const existingInstance = globalRecord[FILLKIT_UI_INSTANCE_KEY] as
            | FillKit
            | undefined;
          if (existingInstance && existingInstance !== this) {
            logger.warn(
              '[FillKit] Detected existing FillKit instance with UI enabled. Destroying previous instance...'
            );
            existingInstance.destroy().catch(err => {
              logger.warn('[FillKit] Error destroying existing instance:', err);
            });
            delete globalRecord[FILLKIT_UI_INSTANCE_KEY];
          }

          FillKit.cleanupOrphanedUI();
          globalRecord[FILLKIT_UI_INSTANCE_KEY] = this;
          this.initializeUi();

          // Update UI with provider state AFTER widgets are created
          // This ensures MainWidget and OptionsSheet exist before updating them
          this.updateProviderStatusUI();

          // Update dataset info if CloudProvider has cached data
          if (this.provider instanceof CloudProvider) {
            this.provider
              .getDatasetSyncStatus()
              .then(syncStatus => {
                if (syncStatus.lastSync && syncStatus.version) {
                  this.updateDatasetInfoUI(
                    syncStatus.version,
                    syncStatus.lastSync
                  );
                }
              })
              .catch(err =>
                logger.warn('FillKit: Failed to update dataset UI:', err)
              );
          }
        }

        // Enable watch mode if specified
        if (currentSdkOpts.watchMode) {
          this.enableWatchMode();
        }
      })
      .catch((error: unknown) => {
        this.initError =
          error instanceof Error ? error : new Error(String(error));
        logger.error('[FillKit] Initialization failed:', error);
      });
  }

  /**
   * Subscribes to atom changes to react to configuration updates.
   *
   * @remarks
   * Handles provider switching, locale changes, and watch mode toggling based on atom state updates.
   */
  private subscribeToAtoms(): void {
    // Initialize previous state tracking BEFORE subscribing
    this.prevSdkOptions = sdkOptions.get();
    this.prevCloudConfig = cloudConfig.get();

    // Subscribe to SDK options changes
    this.unsubscribeSdkOptions = sdkOptions.subscribe(opts => {
      const prev = this.prevSdkOptions;

      // Skip change detection if prev is DEFAULT (first mount from localStorage)
      // This prevents unwanted re-initialization when atoms load on page refresh
      const isFirstMount =
        prev &&
        prev.provider === 'local' &&
        prev.mode === 'valid' &&
        prev.locale === 'en';

      // Detect provider or locale changes (only after initialization)
      // Initial provider setup is handled by performInitialization()
      if (
        prev &&
        !isFirstMount &&
        (opts.provider !== prev.provider || opts.locale !== prev.locale)
      ) {
        // If switching to cloud, validate credentials first
        if (opts.provider === 'cloud') {
          const cloud = cloudConfig.get();
          if (cloud.token && cloud.projectId) {
            this.initializeProvider();
          } else {
            logger.warn(
              'FillKit: Provider switched to cloud but credentials not ready yet'
            );
          }
        } else {
          // Switching to local or locale changed - always initialize
          this.initializeProvider();
        }
      }

      // Detect watch mode changes
      if (prev && opts.watchMode !== prev.watchMode) {
        if (opts.watchMode) {
          this.enableWatchMode();
        } else {
          this.disableWatchMode();
        }
      }

      // Update locale in field detector
      if (prev && opts.locale !== prev.locale) {
        this.fieldDetector.setLocale(opts.locale);
      }

      this.prevSdkOptions = opts;
    });

    // Subscribe to cloud config changes
    this.unsubscribeCloudConfig = cloudConfig.subscribe(cfg => {
      // Reinitialize provider if credentials change
      const prev = this.prevCloudConfig;

      // Detect first hydration (transition from default null to actual values)
      const isFirstMount =
        prev && prev.token === null && prev.projectId === null;
      const isHydrating =
        isFirstMount && cfg.token !== null && cfg.projectId !== null;

      // Case 1: Late hydration detected - atoms loaded after provider initialization
      if (isHydrating) {
        const opts = sdkOptions.get();
        const isLocalProvider = this.provider instanceof LocalProvider;

        // If we have cloud credentials AND current provider is LocalProvider
        // This means provider was initialized before atoms hydrated
        if (opts.provider === 'cloud' && isLocalProvider) {
          this.initializeProvider();
        }
      }

      // Case 2: Credentials changed after initialization
      if (
        prev &&
        !isFirstMount &&
        (cfg.token !== prev.token || cfg.projectId !== prev.projectId)
      ) {
        const opts = sdkOptions.get();
        // Only initialize if provider is 'cloud' AND credentials are complete
        if (opts.provider === 'cloud' && cfg.token && cfg.projectId) {
          this.initializeProvider();
        }
      }

      this.prevCloudConfig = cfg;
    });

    // Subscribe to UI config changes
    this.unsubscribeUiConfig = uiConfig.subscribe(_cfg => {
      // UI updates are handled by UiInjector's own subscription
      // No action needed here - UiInjector subscribes directly
    });
  }

  /**
   * Waits for atoms to hydrate from localStorage before initializing the provider.
   *
   * @remarks
   * Prevents race conditions where the provider might be created with default values
   * before persisted state is loaded.
   */
  private async waitForAtomHydration(): Promise<void> {
    const maxWaitTime = 500; // 500ms max wait
    const checkInterval = 10; // Check every 10ms
    let elapsed = 0;

    const opts = sdkOptions.get();

    // If provider is not 'cloud', no need to wait for cloud config
    if (opts.provider !== 'cloud') {
      this.hydrationComplete = true;
      return;
    }

    // Check if we need to wait for cloud config hydration
    const hasPersistedCloudConfig = hasPersistedState('fillkit:cloud-config');

    if (!hasPersistedCloudConfig) {
      // No persisted cloud config, no need to wait
      this.hydrationComplete = true;
      return;
    }

    // Wait for cloud config to hydrate (token becomes non-null)
    while (elapsed < maxWaitTime) {
      const cfg = cloudConfig.get();

      // If atom has loaded non-null token from localStorage, we're done
      if (cfg.token !== null) {
        this.hydrationComplete = true;
        return;
      }

      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    // Timeout reached - atom didn't hydrate in time
    logger.warn(
      `FillKit: Atom hydration timeout after ${maxWaitTime}ms. ` +
        'Cloud config may not be available yet.'
    );
    this.hydrationComplete = true;
  }

  /**
   * Validates that the runtime provider instance matches the current atom state.
   *
   * @returns `true` if consistent, `false` otherwise.
   */
  private validateProviderStateConsistency(): boolean {
    const opts = sdkOptions.get();
    const isCloudProvider = this.provider instanceof CloudProvider;
    const isLocalProvider = this.provider instanceof LocalProvider;

    // Check for mismatch
    const mismatch =
      (opts.provider === 'cloud' && !isCloudProvider) ||
      (opts.provider === 'local' && !isLocalProvider);

    if (mismatch) {
      logger.warn('FillKit: Provider state mismatch detected', {
        atomProvider: opts.provider,
        runtimeProvider: this.provider?.constructor?.name,
        willReinitialize: true,
      });
      return false;
    }

    return true;
  }

  /**
   * Initializes the dataset provider based on current configuration.
   *
   * @remarks
   * Sets up either `LocalProvider` or `CloudProvider`. For cloud, it validates credentials
   * and handles initialization errors.
   */
  private async initializeProvider(): Promise<void> {
    try {
      const opts = sdkOptions.get();
      const cloud = cloudConfig.get();

      // No fallback needed - waitForAtomHydration() ensures atoms are ready
      // Atoms are guaranteed to have persisted values loaded at this point

      switch (opts.provider) {
        case 'local':
          this.provider = new LocalProvider({
            locale: opts.locale,
            emailDomain: this.constructorOptions.emailDomain,
            seed: this.constructorOptions.seed ?? undefined,
          });
          break;

        case 'cloud':
          // Check for cloud credentials (from constructor first, then atoms)
          const constructorConfig = this.constructorOptions.providerConfig as
            | { token?: string; projectId?: string }
            | undefined;
          const hasValidConstructorConfig =
            constructorConfig &&
            constructorConfig.projectId &&
            constructorConfig.token;

          const config = hasValidConstructorConfig
            ? constructorConfig
            : cloud.token && cloud.projectId
              ? {
                  token: cloud.token,
                  projectId: cloud.projectId,
                }
              : null;

          if (!config || !config.projectId || !config.token) {
            const errorMessage = !this.hydrationComplete
              ? 'Cloud provider selected but atoms not yet hydrated. This should not happen after waitForAtomHydration().'
              : !cloud.token
                ? 'Cloud provider selected but no token configured. Please configure cloud credentials in Options → Cloud Config.'
                : !cloud.projectId
                  ? 'Cloud provider selected but no projectId configured. Please configure cloud credentials in Options → Cloud Config.'
                  : 'Cloud provider requires both projectId and token.';

            throw new ConfigurationError(
              `${errorMessage} Configure via Options → Cloud Config or pass credentials to FillKit constructor.`
            );
          }

          // Create CloudProvider (projectId and token guaranteed non-null by guard above)
          this.provider = new CloudProvider({
            projectId: config.projectId,
            token: config.token,
            dataset: this.constructorOptions.dataset,
            cache: this.constructorOptions.cache,
            feedbackManager: this.feedbackManager,
            onConfigure: () => this.openCloudConfiguration(),
            onRetry: () => this.retryCloudConnection(),
            tokenProvider: this.constructorOptions.tokenProvider,
          });
          break;

        default:
          throw new ConfigurationError(`Unknown provider: ${opts.provider}`);
      }

      // Initialize provider
      if (this.provider.init) {
        await this.provider.init();
      }

      // Set provider on components
      this.valueGenerator.setProvider(this.provider);
      this.fillOrchestrator.setProvider(this.provider);

      // Update provider manager
      if (this.provider instanceof CloudProvider) {
        this.providerManager.setStatus('cloud');

        // Update ProviderManager with cached dataset info from CloudProvider
        // This ensures the stats reflect persisted sync information when UI is created
        const syncStatus = await this.provider.getDatasetSyncStatus();
        if (syncStatus.version) {
          this.providerManager.recordSync(syncStatus.version);
        }
      } else {
        this.providerManager.setStatus('local');
      }

      // Note: UI updates moved to .then() block after initializeUi()
      // to ensure widgets exist before updating them

      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize provider: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Performs the full initialization sequence.
   *
   * @remarks
   * 1. Waits for atom hydration.
   * 2. Initializes the provider.
   * 3. Updates UI status.
   */
  private async performInitialization(): Promise<void> {
    try {
      this.initializationStartTime = Date.now();

      // Wait for atoms to hydrate from localStorage before initializing provider
      await this.waitForAtomHydration();

      // Initialize provider (reads from atoms)
      this.providerInitAttempts++;
      await this.initializeProvider();
      this.initialized = true;

      // Update UI with current provider status
      this.updateProviderStatusUI();
    } catch (error: unknown) {
      logger.error('FillKit: Initialization failed', {
        provider: sdkOptions.get().provider,
        error: error instanceof Error ? error.message : String(error),
        attempts: this.providerInitAttempts,
      });
      this.initialized = false;
    }
  }

  /**
   * Ensures FillKit is initialized before proceeding with operations.
   *
   * @remarks
   * If not initialized, triggers initialization and waits for it to complete.
   */
  private async ensureInitialized(): Promise<void> {
    await this.ready;
    if (!this.initialized) {
      logger.warn('FillKit: Re-triggering initialization (unexpected state)');
      await this.performInitialization();
    }
  }

  /**
   * Initializes the UI injection system if enabled in configuration.
   */
  private async initializeUi(): Promise<void> {
    const cfg = uiConfig.get();
    if (cfg.enabled) {
      await this.uiInjector.init();
      this.uiEventBridge.setup();
    }
  }

  /**
   * Sets up keyboard shortcuts for FillKit actions.
   *
   * @remarks
   * Initializes the `KeyboardShortcuts` manager with handlers for common actions like
   * filling, clearing, toggling mode, and opening the options sheet.
   */
  private setupKeyboardShortcuts(): void {
    this.keyboardShortcuts.init({
      fillAll: () => this.autofillAll(),
      fillCurrent: () => this.autofillCurrent(),
      clearAll: () => this.clear(),
      clearCurrent: () => this.clearCurrent(),
      toggleMode: () => {
        const opts = sdkOptions.get();
        const newMode = opts.mode === 'valid' ? 'invalid' : 'valid';
        this.updateOptions({ mode: newMode });
      },
      toggleWidget: () => {
        this.uiInjector.toggleMainWidgetFab();
      },
      openSettings: () => {
        this.uiInjector.toggleOptionsSheet();
      },
      openHelp: () => {
        this.uiInjector.toggleHelpSheet();
      },
      shufflePosition: () => {
        this.shufflePosition();
      },
      rotateOrientation: () => {
        this.uiInjector.rotateWidget();
      },
      toggleFillMode: () => {
        const cfg = uiConfig.get();
        this.updateOptions({
          ui: {
            fillMode: cfg.fillMode === 'widget' ? 'inline' : 'widget',
          },
        });
      },
    });
  }

  // PUBLIC API METHODS (read from atoms instead of store)

  /**
   * Autofills all detected forms on the page.
   *
   * @remarks
   * Scans the document for forms and fills them based on the current configuration.
   * Updates form statistics after completion.
   *
   * @param options - Optional overrides for the autofill operation.
   */
  async autofillAll(options: AutofillOptions = {}): Promise<void> {
    await this.ensureInitialized();

    const opts = sdkOptions.get();
    const mergedOptions: AutofillOptions = {
      mode: options.mode ?? opts.mode,
      force: options.force ?? opts.refill,
      scope: options.scope ?? document,
      includeSelectors: options.includeSelectors ?? opts.includeSelectors,
      excludeSelectors: options.excludeSelectors ?? opts.excludeSelectors,
      overrides: options.overrides ?? opts.overrides,
      includeOutsideForms:
        options.includeOutsideForms ?? opts.includeOutsideForms,
      locale: options.locale ?? opts.locale,
      minConfidence:
        options.minConfidence ??
        this.constructorOptions?.autofill?.minConfidence,
    };

    const result = await this.fillOrchestrator.autofillAll(
      mergedOptions,
      this.eventHandlers
    );

    this.updateFormsStats(result.formsCount, result.fieldCountsPerForm);
    this.announceResult('fill', result.filledCount, result.skippedCount);
  }

  /**
   * Autofills a specific form or element.
   *
   * @param target - The form or element to fill.
   * @param options - Optional overrides for the autofill operation.
   */
  async autofill(
    target: HTMLFormElement | HTMLElement,
    options: AutofillOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const opts = sdkOptions.get();
    const mergedOptions: AutofillOptions = {
      mode: options.mode ?? opts.mode,
      force: options.force ?? opts.refill,
      scope: target,
      includeSelectors: options.includeSelectors ?? opts.includeSelectors,
      excludeSelectors: options.excludeSelectors ?? opts.excludeSelectors,
      overrides: options.overrides ?? opts.overrides,
      includeOutsideForms:
        options.includeOutsideForms ?? opts.includeOutsideForms,
      locale: options.locale ?? opts.locale,
      minConfidence:
        options.minConfidence ??
        this.constructorOptions?.autofill?.minConfidence,
    };

    const result = await this.fillOrchestrator.autofill(
      target,
      mergedOptions,
      this.eventHandlers
    );

    this.updateFormsStats(result.formsCount, result.fieldCountsPerForm);
    this.announceResult('fill', result.filledCount, result.skippedCount);
  }

  /**
   * Autofills the currently active form (the one currently being interacted with).
   *
   * @param options - Optional overrides for the autofill operation.
   */
  async autofillCurrent(options: AutofillOptions = {}): Promise<void> {
    await this.ensureInitialized();

    const opts = sdkOptions.get();
    const mergedOptions = {
      mode: options.mode ?? opts.mode,
      force: options.force ?? opts.refill,
      includeSelectors: options.includeSelectors ?? opts.includeSelectors,
      excludeSelectors: options.excludeSelectors ?? opts.excludeSelectors,
      overrides: options.overrides ?? opts.overrides,
      includeOutsideForms:
        options.includeOutsideForms ?? opts.includeOutsideForms,
      locale: options.locale ?? opts.locale,
    };

    const result = await this.fillOrchestrator.autofillCurrent(
      mergedOptions,
      this.eventHandlers
    );

    this.updateFormsStats(result.formsCount, result.fieldCountsPerForm);
    this.announceResult('fill', result.filledCount, result.skippedCount);
  }

  /**
   * Clears filled values from forms within the specified scope.
   *
   * @param scope - The element or document to clear. Defaults to `document`.
   */
  clear(scope?: HTMLElement | Document): void {
    const target = scope ?? document;
    const fieldCount = target.querySelectorAll(
      'input, select, textarea, [contenteditable="true"]'
    ).length;
    this.fillOrchestrator.clear(target);
    this.ariaAnnouncer.announce(`Cleared ${fieldCount} fields`);
  }

  /**
   * Clears filled values from the currently active form.
   */
  clearCurrent(): void {
    const currentForm = this.formTracker.getCurrentForm();
    const fieldCount = currentForm
      ? currentForm.querySelectorAll(
          'input, select, textarea, [contenteditable="true"]'
        ).length
      : 0;
    this.fillOrchestrator.clearCurrent();
    if (fieldCount > 0) {
      this.ariaAnnouncer.announce(`Cleared ${fieldCount} fields`);
    }
  }

  /**
   * Retrieves the currently active form being tracked.
   *
   * @returns The active HTMLFormElement or `null` if none.
   */
  getCurrentForm(): HTMLFormElement | null {
    return this.formTracker.getCurrentForm();
  }

  /**
   * Sets the fill mode (e.g., 'valid', 'invalid').
   *
   * @param mode - The new fill mode.
   */
  async setMode(mode: FillMode): Promise<void> {
    sdkOptions.set({ ...sdkOptions.get(), mode });
  }

  /**
   * Retrieves the current SDK configuration options.
   *
   * @remarks
   * Combines state from atoms (persisted) and constructor options (non-persisted).
   *
   * @returns The complete configuration object.
   */
  getOptions(): Required<FillKitOptions> {
    const opts = sdkOptions.get();
    const cfg = uiConfig.get();

    return {
      mode: opts.mode,
      provider: opts.provider,
      locale: opts.locale,
      refill: opts.refill,
      watchMode: opts.watchMode,
      ui: {
        enabled: cfg.enabled,
        position: cfg.position.placement,
      },
      autofill: {
        includeOutsideForms: opts.includeOutsideForms,
        includeSelectors: opts.includeSelectors,
        excludeSelectors: opts.excludeSelectors,
        overrides: {},
      },
      // Include constructor options for non-persisted values
      ...this.constructorOptions,
    } as Required<FillKitOptions>;
  }

  /**
   * Loads a specific dataset by name.
   *
   * @remarks
   * Only applicable if the current provider supports dataset loading.
   *
   * @param name - The name of the dataset to load.
   */
  async loadDataset(name: string): Promise<void> {
    await this.ensureInitialized();

    if (this.provider && 'loadDataset' in this.provider) {
      await (
        this.provider as unknown as {
          loadDataset: (name: string) => Promise<void>;
        }
      ).loadDataset(name);
    }
  }

  /**
   * Switches the active data provider.
   *
   * @remarks
   * Reinitializes the provider with the new configuration.
   *
   * @param provider - The provider type ('local' or 'cloud').
   * @param config - Optional configuration for the new provider.
   */
  async setProvider(
    provider: 'local' | 'cloud',
    config?: unknown
  ): Promise<void> {
    sdkOptions.set({ ...sdkOptions.get(), provider });

    // Store config in constructor options
    this.constructorOptions.providerConfig = config as
      | Record<string, unknown>
      | undefined;

    // Reinitialize provider
    this.initialized = false;
    await this.initializeProvider();
  }

  /**
   * Registers an event handler for FillKit events.
   *
   * @param event - The event name to listen for.
   * @param handler - The callback function.
   * @returns A function to unregister the handler.
   */
  on(event: FillKitEventName, handler: FillKitEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(handler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Removes an event handler.
   *
   * @param event - The event name.
   * @param handler - The callback function to remove.
   */
  off(event: FillKitEventName, handler: FillKitEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Updates SDK configuration options.
   *
   * @remarks
   * Updates the underlying atoms, which triggers reactivity and persistence.
   *
   * @param newOptions - Partial options object to merge with current state.
   */
  async updateOptions(
    newOptions: Partial<FillKitOptions> & { includeOutsideForms?: boolean }
  ): Promise<void> {
    // Update SDK options atom
    if (
      newOptions.mode !== undefined ||
      newOptions.provider !== undefined ||
      newOptions.locale !== undefined ||
      newOptions.refill !== undefined ||
      newOptions.watchMode !== undefined ||
      newOptions.includeOutsideForms !== undefined
    ) {
      sdkOptions.set({
        ...sdkOptions.get(),
        ...(newOptions.mode !== undefined && { mode: newOptions.mode }),
        ...(newOptions.provider !== undefined && {
          provider: newOptions.provider,
        }),
        ...(newOptions.locale !== undefined && { locale: newOptions.locale }),
        ...(newOptions.refill !== undefined && { refill: newOptions.refill }),
        ...(newOptions.watchMode !== undefined && {
          watchMode: newOptions.watchMode,
        }),
        ...(newOptions.includeOutsideForms !== undefined && {
          includeOutsideForms: newOptions.includeOutsideForms,
        }),
      });
    }

    // Update UI config atom
    if (newOptions.ui) {
      const currentUi = uiConfig.get();
      const currentProvider = sdkOptions.get().provider;
      uiConfig.set({
        ...currentUi,
        ...(newOptions.ui.enabled !== undefined && {
          enabled: newOptions.ui.enabled,
        }),
        ...(newOptions.ui.position !== undefined && {
          position: { placement: newOptions.ui.position },
        }),
        ...(newOptions.ui.visibility !== undefined && {
          visibility: resolveVisibility(
            {
              ...unresolveVisibility(currentUi.visibility),
              ...newOptions.ui.visibility,
            },
            currentProvider
          ),
        }),
        ...(newOptions.ui.fillMode !== undefined && {
          fillMode: newOptions.ui.fillMode,
        }),
      });
    }

    // Update locale in field detector (side effect)
    if (newOptions.locale) {
      this.fieldDetector.setLocale(newOptions.locale);
    }

    // Update emailDomain in constructor options (not persisted)
    if (newOptions.emailDomain) {
      this.constructorOptions.emailDomain = newOptions.emailDomain;
    }

    // Update seed in constructor options (not persisted) and reinitialize provider
    if ('seed' in newOptions) {
      const newSeed =
        newOptions.seed === null ? undefined : newOptions.seed;
      if (
        newSeed !== undefined &&
        (typeof newSeed !== 'number' ||
          !Number.isInteger(newSeed) ||
          newSeed < 0)
      ) {
        throw new ConfigurationError(
          'seed must be a non-negative integer',
        );
      }
      const seedChanged =
        this.constructorOptions.seed !== newSeed;
      this.constructorOptions.seed = newSeed;
      if (seedChanged) {
        await this.initializeProvider();
      }
    }

    // Update autofill defaults
    if (newOptions.autofill) {
      sdkOptions.set({
        ...sdkOptions.get(),
        ...(newOptions.autofill.includeSelectors !== undefined && {
          includeSelectors: newOptions.autofill.includeSelectors,
        }),
        ...(newOptions.autofill.excludeSelectors !== undefined && {
          excludeSelectors: newOptions.autofill.excludeSelectors,
        }),
        ...(newOptions.autofill.includeOutsideForms !== undefined && {
          includeOutsideForms: newOptions.autofill.includeOutsideForms,
        }),
      });
    }

    // Note: Atoms handle persistence automatically
    // Note: Provider reinitialization is handled by atom subscriptions
    // Note: Watch mode enabling/disabling is handled by atom subscriptions
  }

  /**
   * Cycles the UI widget position to the next available placement.
   *
   * @remarks
   * Rotates through: bottom-center -> top-center -> left-center -> right-center.
   */
  shufflePosition(): void {
    const positions: UiPlacement[] = [
      'bottom.center',
      'top.center',
      'left.center',
      'right.center',
    ];
    const cfg = uiConfig.get();
    const currentIndex = positions.indexOf(
      cfg.position.placement ?? 'bottom.center'
    );
    const nextIndex = (currentIndex + 1) % positions.length;
    const nextPosition = positions[nextIndex];

    uiConfig.set({
      ...cfg,
      position: { placement: nextPosition },
    });
  }

  /**
   * Enables watch mode to automatically fill new forms as they appear in the DOM.
   */
  enableWatchMode(): void {
    const opts = sdkOptions.get();

    const mergedOptions = {
      mode: opts.mode,
      force: opts.refill,
      includeOutsideForms: false,
    };

    this.formTracker.enableWatchMode({
      callback: async (elements: HTMLElement[]) => {
        const fillPromises = elements.map(element =>
          this.autofill(element, mergedOptions).catch(error => {
            logger.warn('Failed to auto-fill new element:', element, error);
          })
        );
        await Promise.all(fillPromises);
      },
    });
  }

  /**
   * Disables watch mode.
   */
  disableWatchMode(): void {
    this.formTracker.disableWatchMode();
  }

  /**
   * Alias for {@link updateOptions}.
   *
   * @param newOptions - Partial options object.
   */
  setOptions(
    newOptions: Partial<FillKitOptions> & { includeOutsideForms?: boolean }
  ): void {
    this.updateOptions(newOptions);
  }

  /**
   * Gets the total number of forms detected on the page.
   *
   * @returns The count of detected forms.
   */
  getFormsDetected(): number {
    return this.formsDetected;
  }

  /**
   * Gets a map of form IDs to their field counts.
   *
   * @returns A map where keys are form IDs and values are field counts.
   */
  getFieldCountsPerForm(): Map<string, number> {
    return new Map(this.fieldCountsPerForm);
  }

  /**
   * Gets the field count for a specific form.
   *
   * @param formId - The ID of the form.
   * @returns The number of fields in the form, or `undefined` if not found.
   */
  getFieldCountForForm(formId: string): number | undefined {
    return this.fieldCountsPerForm.get(formId);
  }

  /**
   * Updates internal statistics about detected forms and fields.
   *
   * @param formsCount - The total number of forms.
   * @param fieldCounts - A map of field counts per form.
   */
  updateFormsStats(formsCount: number, fieldCounts: Map<string, number>): void {
    this.formsDetected = formsCount;
    this.fieldCountsPerForm = new Map(fieldCounts);
  }

  /**
   * Announces fill/clear results to screen readers via the AriaAnnouncer.
   *
   * @param operation - The operation type ('fill' or 'clear').
   * @param successCount - Number of successfully processed fields.
   * @param errorCount - Number of fields that had errors or were skipped.
   */
  private announceResult(
    operation: 'fill' | 'clear',
    successCount: number,
    errorCount: number
  ): void {
    if (errorCount > 0) {
      this.ariaAnnouncer.announce(
        `${operation === 'fill' ? 'Fill' : 'Clear'} completed with ${errorCount} errors`
      );
    } else {
      this.ariaAnnouncer.announce(`Filled ${successCount} fields`);
    }
  }

  /**
   * Calculates the total number of fields detected across all forms.
   *
   * @returns The total field count.
   */
  getTotalFieldCount(): number {
    let total = 0;
    for (const count of this.fieldCountsPerForm.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Retrieves comprehensive statistics about the current page.
   *
   * @returns An object containing form counts, total field counts, and per-form breakdowns.
   */
  getPageStats(): {
    formsDetected: number;
    totalFields: number;
    fieldCountsPerForm: { formId: string; fieldCount: number }[];
  } {
    const fieldCountsArray = Array.from(this.fieldCountsPerForm.entries()).map(
      ([formId, fieldCount]) => ({
        formId,
        fieldCount,
      })
    );

    return {
      formsDetected: this.formsDetected,
      totalFields: this.getTotalFieldCount(),
      fieldCountsPerForm: fieldCountsArray,
    };
  }

  /**
   * Gets the keyboard shortcuts manager instance.
   *
   * @returns The `KeyboardShortcuts` instance.
   */
  getKeyboardShortcuts(): KeyboardShortcuts {
    return this.keyboardShortcuts;
  }

  /**
   * Enables keyboard shortcuts.
   */
  enableKeyboardShortcuts(): void {
    this.keyboardShortcuts.enable();
  }

  /**
   * Disables keyboard shortcuts.
   */
  disableKeyboardShortcuts(): void {
    this.keyboardShortcuts.disable();
  }

  /**
   * Retrieves a list of registered keyboard shortcuts and their descriptions.
   *
   * @returns An array of shortcut objects.
   */
  getKeyboardShortcutsList(): Array<{
    combination: string;
    description: string;
  }> {
    return this.keyboardShortcuts.getFormattedShortcuts();
  }

  /**
   * Analyzes a single element to detect its field type.
   *
   * @param element - The element to analyze.
   * @returns A promise resolving to the {@link FieldDetection} result.
   */
  async detectField(element: HTMLElement): Promise<FieldDetection> {
    await this.ensureInitialized();

    const detection = this.fieldDetector.detect(element);

    return {
      element: detection.element,
      descriptor: detection.descriptor,
      semanticType: detection.semanticType,
      confidence: detection.confidence,
      mapper: this.fieldDetector.name,
      constraints: detection.constraints,
      candidates: detection.metadata
        ? [
            {
              type: detection.semanticType,
              confidence: detection.confidence,
            },
          ]
        : undefined,
    };
  }

  /**
   * Gets the field detector instance.
   *
   * @returns The `FieldDetector` instance.
   */
  getFieldDetector(): FieldDetector {
    return this.fieldDetector;
  }

  /**
   * Detects all fields within a given scope.
   *
   * @param scope - The element or document to search within. Defaults to `document`.
   * @returns A promise resolving to an array of {@link FieldDetection} results.
   */
  async detectFields(
    scope: HTMLElement | Document = document
  ): Promise<FieldDetection[]> {
    await this.ensureInitialized();

    const selector =
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]), select, textarea';
    const elements = scope.querySelectorAll(selector);

    const detections: FieldDetection[] = [];
    for (const element of Array.from(elements)) {
      const detection = await this.detectField(element as HTMLElement);
      detections.push(detection);
    }

    return detections;
  }

  /**
   * Generates a preview value for a field without filling it.
   *
   * @param element - The element to generate a value for.
   * @param options - Optional value generation options.
   * @returns A promise resolving to the {@link ValuePreview}.
   */
  async previewValue(
    element: HTMLElement,
    options?: ValueOptions
  ): Promise<ValuePreview> {
    await this.ensureInitialized();

    const detection = await this.detectField(element);
    const opts = sdkOptions.get();

    const mergedOptions: ValueOptions = {
      mode: options?.mode ?? opts.mode,
      locale: options?.locale ?? opts.locale,
      constraints: options?.constraints ?? detection.constraints,
      element,
      fieldType: detection.semanticType,
    };

    try {
      const value = await this.provider.getValue(
        detection.semanticType,
        mergedOptions
      );

      return {
        value,
        strategy: detection.semanticType,
        mode: mergedOptions.mode || 'valid',
        transformers: [],
      };
    } catch {
      return {
        value: null,
        strategy: 'none',
        mode: mergedOptions.mode || 'valid',
        transformers: [],
      };
    }
  }

  /**
   * Retrieves the current page context.
   *
   * @returns The {@link PageContext} object.
   */
  getPageContext(): PageContext {
    return this.contextCollector.getPageContext();
  }

  /**
   * Retrieves context for a specific form.
   *
   * @param form - The form element.
   * @returns The {@link FormContext} object.
   */
  getFormContext(form: HTMLFormElement): FormContext {
    return this.contextCollector.getFormContext(form);
  }

  /**
   * Retrieves context for a specific field.
   *
   * @param element - The field element.
   * @returns The {@link FieldContext} object.
   */
  getFieldContext(element: HTMLElement): FieldContext {
    return this.contextCollector.getFieldContext(element);
  }

  /**
   * Clears the context collector's cache.
   */
  clearContextCache(): void {
    this.contextCollector.clearCache();
  }

  /**
   * Extracts a comprehensive schema of the current page.
   *
   * @remarks
   * Analyzes all forms and fields on the page, capturing their structure, types,
   * and metadata. This schema can be uploaded to the cloud or used for analysis.
   *
   * @param options - Extraction options.
   * @returns A promise resolving to the {@link PageSchema}.
   */
  async extractPageSchema(
    options: SchemaExtractionOptions = {}
  ): Promise<PageSchema> {
    await this.ensureInitialized();
    return this.schemaExtractor.extractPageSchema(options);
  }

  /**
   * Scans a list of URLs to extract their schemas.
   *
   * @remarks
   * Uses the `PageScanner` to visit each URL (if running in a capable environment)
   * and extract page schemas.
   *
   * @param urls - Array of URLs to scan.
   * @param options - Scan options.
   * @returns A promise resolving to the {@link ScanSummary}.
   */
  async scanUrls(
    urls: string[],
    options: ScanOptions = {}
  ): Promise<ScanSummary> {
    await this.ensureInitialized();

    const summary = await this.pageScanner.scanUrls(urls, {
      ...options,
      onProgress: (current, total) => {
        if (options.onProgress) {
          options.onProgress(current, total);
        }
      },
    });

    // Cache all successful scans
    for (const result of summary.results) {
      if (result.success && result.schema) {
        await this.schemaCache.store(result.url, result.schema);
      }
    }

    return summary;
  }

  /**
   * Uploads locally cached schemas to the cloud.
   *
   * @remarks
   * Requires the cloud provider to be active and authenticated.
   *
   * @returns A promise resolving to the {@link UploadResult}.
   * @throws Error if cloud provider is not configured.
   */
  async uploadScans(): Promise<UploadResult> {
    await this.ensureInitialized();

    if (!(this.provider instanceof CloudProvider)) {
      throw new Error(
        'Cloud provider not configured. Use provider: "cloud" to enable cloud features.'
      );
    }

    const cachedSchemas = await this.schemaCache.getAll();

    if (cachedSchemas.length === 0) {
      return {
        success: true,
        created: 0,
        updated: 0,
        totalFields: 0,
      };
    }

    let created = 0;
    const updated = 0;
    let totalFields = 0;
    const errors: string[] = [];

    for (const cached of cachedSchemas) {
      try {
        await this.provider.uploadPageSchema(cached.schema);
        created++;
        totalFields += cached.schema.forms.reduce(
          (sum: number, form: FormSchema) => sum + form.fields.length,
          0
        );
      } catch (error) {
        errors.push(
          `Failed to upload ${cached.url}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      totalFields,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Creates the delegate object that CloudEventHandler uses to call back
   * into FillKit methods.
   */
  private createCloudEventDelegate(): CloudEventDelegate {
    return {
      getProvider: () => this.provider,
      setProvider: (provider: CloudProvider) => {
        this.provider = provider;
      },
      setInitialized: (value: boolean) => {
        this.initialized = value;
      },
      incrementProviderInitAttempts: () => {
        this.providerInitAttempts++;
      },
      initializeProvider: () => this.initializeProvider(),
      validateProviderStateConsistency: () =>
        this.validateProviderStateConsistency(),
      extractPageSchema: (options?: SchemaExtractionOptions) =>
        this.extractPageSchema(options),
      scanUrls: (urls: string[], options?: ScanOptions) =>
        this.scanUrls(urls, options),
      uploadScans: () => this.uploadScans(),
      updateOptions: (newOptions: Record<string, unknown>) =>
        this.updateOptions(
          newOptions as Partial<FillKitOptions> & {
            includeOutsideForms?: boolean;
          }
        ),
      openCloudConfiguration: () => this.openCloudConfiguration(),
      retryCloudConnection: () => this.retryCloudConnection(),
    };
  }

  /**
   * Retrieves current statistics from the provider manager.
   *
   * @returns The provider statistics object.
   */
  getProviderStats() {
    return this.providerManager.getStats();
  }

  /**
   * Updates the UI with the current provider status.
   */
  updateProviderStatusUI(): void {
    const stats = this.providerManager.getStats();
    this.uiInjector.updateProviderStatus(stats);
  }

  /**
   * Updates the UI with dataset synchronization information.
   *
   * @param version - The current dataset version.
   * @param lastSync - The timestamp of the last sync.
   */
  updateDatasetInfoUI(version: string, lastSync: number | null): void {
    this.uiInjector.updateDatasetStatusDisplay({ version, lastSync });
  }

  /**
   * Retrieves debug information about the current SDK state.
   *
   * @remarks
   * Useful for troubleshooting initialization, provider configuration, and state consistency issues.
   *
   * @returns An object containing detailed state information.
   */
  getDebugInfo(): {
    initialized: boolean;
    hydrationComplete: boolean;
    providerInitAttempts: number;
    initializationTime: number;
    providerType: string;
    atomState: {
      provider: string;
      cloudToken: boolean;
      cloudProjectId: string | null;
    };
    stateConsistent: boolean;
  } {
    const opts = sdkOptions.get();
    const cloud = cloudConfig.get();

    return {
      initialized: this.initialized,
      hydrationComplete: this.hydrationComplete,
      providerInitAttempts: this.providerInitAttempts,
      initializationTime: this.initializationStartTime
        ? Date.now() - this.initializationStartTime
        : 0,
      providerType: this.provider?.constructor?.name || 'none',
      atomState: {
        provider: opts.provider,
        cloudToken: !!cloud.token,
        cloudProjectId: cloud.projectId,
      },
      stateConsistent: this.validateProviderStateConsistency(),
    };
  }

  /**
   * Destroys the FillKit instance and cleans up resources.
   *
   * **WARNING: Failing to call `destroy()` in single-page applications (SPAs)
   * causes memory leaks.** FillKit attaches DOM event listeners, MutationObservers,
   * keyboard shortcuts, and atom subscriptions that persist across route changes.
   * Always call `destroy()` when the component that owns the FillKit instance
   * unmounts or when navigating away.
   *
   * @remarks
   * - Removes global references.
   * - Unsubscribes from state atoms.
   * - Disables watch mode and form tracking.
   * - Destroys UI components and providers.
   * - Clears event handlers.
   *
   * @example React cleanup
   * ```tsx
   * import { useEffect } from 'react';
   * import { FillKit } from '@fillkit/core';
   *
   * function MyForm() {
   *   useEffect(() => {
   *     const fk = new FillKit({ ui: { enabled: true } });
   *
   *     return () => {
   *       fk.destroy(); // Prevent memory leak on unmount
   *     };
   *   }, []);
   *
   *   return <form>...</form>;
   * }
   * ```
   *
   * @example Vue cleanup
   * ```vue
   * <script setup>
   * import { onMounted, onUnmounted } from 'vue';
   * import { FillKit } from '@fillkit/core';
   *
   * let fk;
   * onMounted(async () => {
   *   fk = await FillKit.init({ ui: { enabled: true } });
   * });
   * onUnmounted(() => {
   *   fk?.destroy(); // Prevent memory leak on unmount
   * });
   * </script>
   * ```
   */
  /**
   * Returns the current FillKit instance marker, if any.
   * Used by browser extensions to detect a page-embedded SDK instance.
   */
  static getInstanceInfo(): FillKitInstanceMarker | null {
    return (
      (globalRecord[FILLKIT_INSTANCE_KEY] as
        | FillKitInstanceMarker
        | undefined) ?? null
    );
  }

  async destroy(): Promise<void> {
    // Remove from global tracking
    if (globalRecord[FILLKIT_UI_INSTANCE_KEY] === this) {
      delete globalRecord[FILLKIT_UI_INSTANCE_KEY];
    }

    // Remove instance marker if it belongs to this instance
    const marker = globalRecord[FILLKIT_INSTANCE_KEY] as
      | FillKitInstanceMarker
      | undefined;
    if (marker?.instance === this) {
      delete globalRecord[FILLKIT_INSTANCE_KEY];
    }

    // Unsubscribe from atoms
    if (this.unsubscribeSdkOptions) {
      this.unsubscribeSdkOptions();
    }
    if (this.unsubscribeCloudConfig) {
      this.unsubscribeCloudConfig();
    }
    if (this.unsubscribeUiConfig) {
      this.unsubscribeUiConfig();
    }

    // Disable watch mode
    this.disableWatchMode();

    // Stop form tracking
    if (this.formTracker) {
      this.formTracker.stopTracking();
    }

    // Destroy UI event bridge (removes all document listeners)
    if (this.uiEventBridge) {
      this.uiEventBridge.destroy();
    }

    // Destroy keyboard shortcuts
    if (this.keyboardShortcuts) {
      this.keyboardShortcuts.destroy();
    }

    // Destroy UI
    if (this.uiInjector) {
      this.uiInjector.destroy();
    }

    // Destroy AriaAnnouncer
    if (this.ariaAnnouncer) {
      this.ariaAnnouncer.destroy();
    }

    // Destroy FeedbackManager
    if (this.feedbackManager) {
      this.feedbackManager.destroy();
    }

    // Destroy context collector
    if (this.contextCollector) {
      this.contextCollector.destroy();
    }

    // Destroy provider
    if (this.provider && this.provider.destroy) {
      await this.provider.destroy();
    }

    this.eventHandlers.clear();
    this.initialized = false;
  }

  /**
   * Opens the cloud configuration sheet in the UI.
   */
  private openCloudConfiguration(): void {
    if (this.uiInjector) {
      this.uiInjector.openOptionsSheet();
    }
  }

  /**
   * Retries the connection to the cloud provider.
   */
  private async retryCloudConnection(): Promise<void> {
    if (this.provider instanceof CloudProvider) {
      try {
        await this.provider.init();
        this.feedbackManager.show({
          type: 'success',
          scope: 'cloud',
          message: 'Successfully connected to FillKit Cloud',
          persistent: false,
        });
      } catch (error) {
        logger.error('FillKit: Retry failed', error);
      }
    }
  }

  getFeedbackManager(): FeedbackManager {
    return this.feedbackManager;
  }
}
