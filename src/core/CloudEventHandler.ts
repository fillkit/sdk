/**
 * Handles cloud-related UI events dispatched from the options sheet.
 *
 * @remarks
 * Encapsulates the logic for saving credentials, validating them,
 * loading projects, activating the cloud provider, scanning pages/URLs,
 * and syncing datasets. These methods were previously inline in {@link FillKit}.
 */

import type { PageSchema, SchemaExtractionOptions } from '../types/index.js';
import type { ScanOptions, ScanSummary, UploadResult } from '../types/cloud.js';
import { CloudProvider } from '../providers/CloudProvider.js';
import type { UiInjector } from './UiInjector.js';
import type { FeedbackManager } from './FeedbackManager.js';
import type { ProviderManager } from './ProviderManager.js';
import type { ValueGenerator } from './ValueGenerator.js';
import type { FillOrchestrator } from './FillOrchestrator.js';
import { logger } from '@/core/Logger.js';
import { sdkOptions, cloudConfig } from '../state/atoms/index.js';

/**
 * Delegate interface for operations that remain in FillKit but are needed
 * by cloud event handlers.
 */
export interface CloudEventDelegate {
  /** Returns the current runtime data provider */
  getProvider(): CloudProvider | unknown;

  /** Sets the runtime data provider */
  setProvider(provider: CloudProvider): void;

  /** Marks the SDK as initialized */
  setInitialized(value: boolean): void;

  /** Increments provider init attempts counter */
  incrementProviderInitAttempts(): void;

  /** Re-initializes the provider from current atom state */
  initializeProvider(): Promise<void>;

  /** Validates provider state consistency (atom vs runtime) */
  validateProviderStateConsistency(): boolean;

  /** Extracts a page schema from the DOM */
  extractPageSchema(options?: SchemaExtractionOptions): Promise<PageSchema>;

  /** Scans URLs via iframe and returns summary */
  scanUrls(urls: string[], options?: ScanOptions): Promise<ScanSummary>;

  /** Uploads cached schemas to the cloud */
  uploadScans(): Promise<UploadResult>;

  /** Updates SDK options reactively */
  updateOptions(newOptions: Record<string, unknown>): Promise<void>;

  /** Opens the cloud configuration UI */
  openCloudConfiguration(): void;

  /** Retries cloud connection */
  retryCloudConnection(): Promise<void>;
}

/**
 * Dependencies required by CloudEventHandler.
 */
export interface CloudEventHandlerDeps {
  /** UI injection layer for showing status messages and actions */
  uiInjector: UiInjector;
  /** Feedback manager for notifications */
  feedbackManager: FeedbackManager;
  /** Provider manager for status tracking */
  providerManager: ProviderManager;
  /** Value generator to update with new provider */
  valueGenerator: ValueGenerator;
  /** Fill orchestrator to update with new provider */
  fillOrchestrator: FillOrchestrator;
  /** Delegate back to FillKit for operations that stay there */
  delegate: CloudEventDelegate;
}

/**
 * Handles cloud UI events emitted from the options sheet.
 *
 * @remarks
 * Each `handle*` method corresponds to a `fillkit:*` custom DOM event.
 * They coordinate between the cloud API, UI layer, and state atoms.
 */
export class CloudEventHandler {
  private readonly uiInjector: UiInjector;
  private readonly feedbackManager: FeedbackManager;
  private readonly providerManager: ProviderManager;
  private readonly valueGenerator: ValueGenerator;
  private readonly fillOrchestrator: FillOrchestrator;
  private readonly delegate: CloudEventDelegate;

  constructor(deps: CloudEventHandlerDeps) {
    this.uiInjector = deps.uiInjector;
    this.feedbackManager = deps.feedbackManager;
    this.providerManager = deps.providerManager;
    this.valueGenerator = deps.valueGenerator;
    this.fillOrchestrator = deps.fillOrchestrator;
    this.delegate = deps.delegate;
  }

  /**
   * Handles saving a cloud API key and fetching available projects.
   *
   * @remarks
   * Creates a temporary CloudProvider to validate the key, fetches the project list,
   * auto-selects the first project, and saves credentials to state atoms.
   *
   * @param event - Custom event containing the API key.
   */
  async handleSaveAndFetchProjects(
    event: CustomEvent<{ apiKey: string }>
  ): Promise<void> {
    const { apiKey } = event.detail;

    try {
      const tempProvider = new CloudProvider({
        projectId: 'temp',
        token: apiKey,
      });

      const response = await tempProvider.listProjects();

      if (!response || !response.projects) {
        this.uiInjector.handleSaveAndFetchProjectsResult({
          success: false,
          apiKey,
          projects: [],
          error: 'Invalid response from server',
        });
        return;
      }

      if (response.projects.length === 0) {
        this.uiInjector.handleSaveAndFetchProjectsResult({
          success: false,
          apiKey,
          projects: [],
          error: 'No projects found. Create one in the SaaS dashboard.',
        });
        return;
      }

      // Auto-select first project and save credentials atomically
      if (response.projects.length > 0) {
        const firstProject = response.projects[0];

        // Save credentials and projects to cloudConfig atom in single atomic operation
        // This prevents multiple subscription fires with incomplete data
        cloudConfig.set({
          ...cloudConfig.get(),
          token: apiKey,
          projects: response.projects,
          projectId: firstProject.id, // Set together with token/projects
          savedAt: Date.now(),
        });

        // Switch to cloud provider
        sdkOptions.set({
          ...sdkOptions.get(),
          provider: 'cloud',
        });
      } else {
        // No projects available - save token and projects only
        cloudConfig.set({
          ...cloudConfig.get(),
          token: apiKey,
          projects: response.projects,
          savedAt: Date.now(),
        });
      }

      this.uiInjector.handleSaveAndFetchProjectsResult({
        success: true,
        apiKey,
        projects: response.projects,
      });
    } catch (error) {
      this.uiInjector.handleSaveAndFetchProjectsResult({
        success: false,
        apiKey,
        projects: [],
        error:
          error instanceof Error ? error.message : 'Failed to fetch projects',
      });
    }
  }

  /**
   * Validates cloud credentials (API key + project ID).
   *
   * @remarks
   * Creates a temporary CloudProvider, initializes it, and validates credentials.
   * On success, saves credentials to atoms and switches to cloud mode.
   *
   * @param event - Custom event containing API key and project ID.
   */
  async handleValidateCloudCredentials(
    event: CustomEvent<{ apiKey: string; projectId: string }>
  ): Promise<void> {
    const { apiKey, projectId } = event.detail;

    try {
      const tempProvider = new CloudProvider({
        projectId,
        token: apiKey,
      });

      await tempProvider.init();
      const validation = await tempProvider.validateCredentials();

      if (validation.valid) {
        // Save credentials to atom
        cloudConfig.set({
          ...cloudConfig.get(),
          token: apiKey,
          projectId: projectId,
          savedAt: Date.now(),
        });

        this.uiInjector.showCloudStatus(
          'success',
          `\u2713 Connected to project: ${validation.projectName || projectId}`
        );
        this.uiInjector.showCloudActions();

        await this.delegate.updateOptions({
          provider: 'cloud',
          providerConfig: { projectId, token: apiKey },
        });

        try {
          const syncStatus = await tempProvider.getDatasetSyncStatus();
          this.uiInjector.updateDatasetStatusDisplay({
            version: syncStatus.version || '-',
            lastSync: syncStatus.lastSync,
          });
        } catch (error) {
          logger.warn('Failed to load dataset stats:', error);
        }
      } else {
        this.uiInjector.showCloudStatus(
          'error',
          validation.error || 'Invalid credentials',
          true
        );
        this.uiInjector.hideCloudActions();
      }
    } catch (error) {
      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error ? error.message : 'Validation failed',
        true
      );
      this.uiInjector.hideCloudActions();
    }
  }

  /**
   * Loads available projects for a given API key.
   *
   * @param event - Custom event containing the API key.
   */
  async handleLoadProjects(
    event: CustomEvent<{ apiKey: string }>
  ): Promise<void> {
    const { apiKey } = event.detail;

    try {
      const tempProvider = new CloudProvider({
        projectId: 'temp',
        token: apiKey,
      });

      const response = await tempProvider.listProjects();

      if (!response || !response.projects) {
        this.uiInjector.showCloudStatus(
          'error',
          'Invalid response from server',
          true
        );
        return;
      }

      if (response.projects.length === 0) {
        this.uiInjector.showCloudStatus(
          'error',
          'No projects found. Create one in the SaaS dashboard.',
          true
        );
        return;
      }

      this.uiInjector.handleProjectsList(response.projects);
    } catch (error) {
      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to load projects',
        true
      );
    }
  }

  /**
   * Activates the cloud provider with the given credentials.
   *
   * @remarks
   * Creates and initializes a CloudProvider, updates all component references,
   * saves credentials to atoms, and refreshes the UI.
   *
   * @param event - Custom event containing API key and project ID.
   */
  async handleActivateCloudProvider(
    event: CustomEvent<{ apiKey: string; projectId: string }>
  ): Promise<void> {
    const { apiKey, projectId } = event.detail;

    try {
      const cloudProvider = new CloudProvider({
        projectId,
        token: apiKey,
        cache: true,
        feedbackManager: this.feedbackManager,
        onConfigure: () => this.delegate.openCloudConfiguration(),
        onRetry: () => this.delegate.retryCloudConnection(),
      });

      await cloudProvider.init();

      this.delegate.setProvider(cloudProvider);
      this.delegate.setInitialized(true);
      this.delegate.incrementProviderInitAttempts();

      // Save credentials to atom
      const currentCreds = cloudConfig.get();
      if (
        !currentCreds.token ||
        currentCreds.token !== apiKey ||
        currentCreds.projectId !== projectId
      ) {
        cloudConfig.set({
          token: apiKey,
          projectId,
          projects: currentCreds.projects, // Preserve existing projects array
          dataset: null,
          savedAt: Date.now(),
        });
      }

      // Update components
      this.valueGenerator.setProvider(cloudProvider);
      this.fillOrchestrator.setProvider(cloudProvider);
      this.providerManager.setStatus('cloud');

      // Update provider in SDK options
      const currentProvider = sdkOptions.get().provider;
      if (currentProvider !== 'cloud') {
        await this.delegate.updateOptions({
          provider: 'cloud',
        });
      }

      // Load dataset stats
      try {
        const syncStatus = await cloudProvider.getDatasetSyncStatus();
        this.uiInjector.updateDatasetStatusDisplay({
          version: syncStatus.version || '-',
          lastSync: syncStatus.lastSync,
        });
      } catch (error) {
        logger.warn('Failed to load dataset stats:', error);
      }

      this.uiInjector.showCloudActions();
      this.uiInjector.showCloudStatus(
        'success',
        'Cloud provider activated successfully'
      );
    } catch (error) {
      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to activate cloud provider',
        true
      );
    }
  }

  /**
   * Scans the current page for forms and uploads the schema to the cloud.
   */
  async handleScanPage(): Promise<void> {
    try {
      const provider = this.delegate.getProvider();
      if (!(provider instanceof CloudProvider)) {
        this.uiInjector.showCloudStatus(
          'error',
          'Cloud provider not configured'
        );
        return;
      }

      const schema = await this.delegate.extractPageSchema();

      if (!schema.forms || schema.forms.length === 0) {
        this.uiInjector.showCloudStatus(
          'error',
          'No forms found on this page. Navigate to a page with forms to scan.'
        );
        return;
      }

      await provider.uploadPageSchema(schema);

      this.uiInjector.showCloudStatus(
        'success',
        `\u2713 Scanned ${schema.forms.length} forms with ${schema.forms.reduce((sum, f) => sum + f.fields.length, 0)} fields`
      );
    } catch (error) {
      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to scan page'
      );
    }
  }

  /**
   * Scans specified URLs via iframe and uploads their schemas.
   *
   * @param event - Custom event containing URLs and optional progress callback.
   */
  async handleScanUrls(
    event: CustomEvent<{
      urls: string[];
      onProgress?: (current: number, total: number) => void;
    }>
  ): Promise<void> {
    const { urls, onProgress } = event.detail;

    try {
      const provider = this.delegate.getProvider();
      if (!(provider instanceof CloudProvider)) {
        this.uiInjector.showCloudStatus(
          'error',
          'Cloud provider not configured'
        );
        return;
      }

      const summary = await this.delegate.scanUrls(urls, {
        maxConcurrent: 3,
        timeout: 30000,
        onProgress,
      });

      if (summary.succeeded > 0) {
        await this.delegate.uploadScans();
        this.uiInjector.showCloudStatus(
          'success',
          `\u2713 Scanned ${summary.succeeded} pages with ${summary.totalFields} fields`
        );
      } else {
        this.uiInjector.showCloudStatus(
          'error',
          `Failed to scan pages: ${summary.failed} failures`
        );
      }
    } catch (error) {
      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to scan URLs'
      );
    }
  }

  /**
   * Syncs datasets from the cloud provider.
   *
   * @remarks
   * Validates provider state consistency before syncing.
   * Updates UI with sync results or error status.
   */
  async handleSyncDatasets(): Promise<void> {
    try {
      const opts = sdkOptions.get();

      // Validate provider state consistency
      if (!this.delegate.validateProviderStateConsistency()) {
        this.uiInjector.showCloudStatus(
          'error',
          'Provider state mismatch detected. Re-initializing...'
        );
        await this.delegate.initializeProvider();
      }

      const provider = this.delegate.getProvider();
      if (!(provider instanceof CloudProvider)) {
        logger.error('FillKit: Sync failed - not a CloudProvider', {
          currentProvider: (provider as { constructor?: { name?: string } })
            ?.constructor?.name,
          atomProvider: opts.provider,
        });
        this.uiInjector.showCloudStatus(
          'error',
          'Cloud provider not configured. Please configure in Options \u2192 Cloud Config.'
        );
        return;
      }

      this.uiInjector.showCloudStatus('loading', 'Syncing datasets...');

      const result = await provider.syncDatasets();

      // Update ProviderManager with available types for degradation recovery
      const availableTypes = provider.getAvailableTypes();
      this.providerManager.updateFromDataset(availableTypes);

      this.fillOrchestrator.setProvider(provider);

      this.uiInjector.showCloudStatus(
        'success',
        `\u2713 Synced ${result.recordCount} values from ${result.version}`
      );

      this.uiInjector.updateDatasetStatusDisplay({
        version: result.version,
        lastSync: result.timestamp,
      });
    } catch (error) {
      this.providerManager.setStatus('cloud-degraded');

      this.uiInjector.showCloudStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to sync datasets'
      );

      logger.error('FillKit: Dataset sync failed', error);
    }
  }
}
