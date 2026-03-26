/**
 * Cloud-based dataset provider for FillKit Cloud integration.
 *
 * @remarks
 * Provides cloud-powered form filling with intelligent caching, automatic URL-based
 * routing, and comprehensive dataset management. Connects to FillKit Cloud API to
 * sync datasets and provide realistic, context-aware form data.
 *
 * **Workflow:**
 * 1. Scan pages (extract schema locally)
 * 2. Upload schemas to cloud for dataset generation
 * 3. Download and sync generated datasets
 * 4. Use cached datasets for form filling with automatic URL matching
 * 5. Manage projects, datasets, and authentication
 *
 * **Important:** Always call `destroy()` when done to prevent memory leaks.
 *
 * @example
 * ```ts
 * const provider = new CloudProvider({
 *   projectId: 'proj_123',
 *   token: 'fk_live_xxx',
 *   cache: true
 * });
 *
 * await provider.init();
 * const email = await provider.getValue('email');
 *
 * // Clean up when done
 * await provider.destroy();
 * ```
 */

import { logger } from '@/core/Logger.js';
import type {
  DatasetProvider,
  ValueOptions,
  ProfileOptions,
  StorageAdapter,
  PageSchema,
  SchemaUploadResult,
  CloudDataset,
  MergedDatasetCache,
  DatasetSyncStatus,
  DatasetSyncResult,
  CloudCredentialsValidation,
  // Project Management
  CloudProject,
  ProjectListResponse,
  // Dataset Management
  DatasetListResponse,
} from '../types/index.js';
import { ProviderError } from '../types/index.js';
import { LocalProvider, type LocalProviderConfig } from './LocalProvider.js';
import type { FeedbackManager } from '../core/FeedbackManager.js';
import { CloudApiClient } from '../core/CloudApiClient.js';
import type { TokenProvider } from '../types/token-provider.js';
import { fillkitApiBaseUrl } from '../types/cloud.js';
import { cloudDatasets } from '../state/atoms/index.js';
import { sanitizeObject } from '../utils/sanitize.js';

/**
 * Configuration options for CloudProvider.
 */
export interface CloudProviderConfig {
  /** Project ID for cloud API */
  projectId: string;
  /** Authentication token */
  token: string;
  /** Enable caching */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** @deprecated Will be removed in next major. Datasets are cached via the cloudDatasets atom. */
  cacheStorage?: StorageAdapter;
  /** LocalProvider configuration for fallback */
  localProviderConfig?: LocalProviderConfig;
  /** Dataset name to use */
  dataset?: string;
  /** Maximum cache size (number of field types) */
  maxCacheSize?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum retry attempts for failed downloads */
  maxRetries?: number;
  /** FeedbackManager for error/status notifications */
  feedbackManager?: FeedbackManager;
  /** Callback to retry cloud connection */
  onRetry?: () => void | Promise<void>;
  /** Callback to open cloud configuration */
  onConfigure?: () => void | Promise<void>;
  /**
   * Optional token provider for async token retrieval.
   * When set, the CloudApiClient resolves the token via this provider.
   */
  tokenProvider?: TokenProvider;
  /**
   * When cloud data is unavailable for a field type, fall back to local
   * (Faker.js) generation. Default: true
   */
  fallbackToLocal?: boolean;
}

/**
 * Result of a dataset download operation with retry metadata.
 */
interface DatasetDownloadResult {
  success: boolean;
  datasetMeta: { id: string; status: string };
  dataset?: CloudDataset;
  error?: Error;
}

/**
 * Cloud-powered dataset provider implementation.
 *
 * @remarks
 * Manages cloud-based datasets with intelligent caching, automatic URL-based routing,
 * and comprehensive project/dataset management. Uses LRU cache eviction, exponential
 * backoff retry logic, and parallel downloads for optimal performance.
 *
 * @example
 * ```ts
 * const provider = new CloudProvider({
 *   projectId: 'proj_123',
 *   token: 'fk_live_xxx',
 *   cache: true
 * });
 *
 * await provider.init();
 * const email = await provider.getValue('email');
 * await provider.destroy();
 * ```
 */
export class CloudProvider implements DatasetProvider {
  private config: Required<
    Omit<
      CloudProviderConfig,
      | 'feedbackManager'
      | 'onRetry'
      | 'onConfigure'
      | 'cacheStorage'
      | 'tokenProvider'
    >
  >;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private localProvider: LocalProvider;
  private feedbackManager: FeedbackManager | undefined;
  private onConfigure?: () => void | Promise<void>;

  // Merged dataset cache (combines all datasets for the project)
  private mergedCache: MergedDatasetCache | null = null;
  private datasetSyncTimestamp: number | null = null;

  // HTTP client for API communication
  private apiClient: CloudApiClient;

  // Cache eviction tracking (LRU) — Map preserves insertion order for O(1) ops
  private cacheAccessOrder: Map<string, true> = new Map();

  // Guard against concurrent background syncs
  private backgroundSyncInFlight = false;

  // Cached URL-matched dataset IDs (invalidated on navigation or sync)
  private routedDatasetIds: string[] | null = null;
  private routedDatasetUrl: string | null = null;

  // Guard against per-field warning spam when cache is empty
  private mergedCacheWarningShown = false;

  constructor(config: CloudProviderConfig) {
    // Validate config exists
    if (!config) {
      throw new ProviderError(
        'CloudProvider requires configuration object with projectId and token'
      );
    }

    // Validate required fields
    this.validateConfig(config);

    // Store feedbackManager and callbacks separately (not in config)
    this.feedbackManager = config.feedbackManager;
    this.onConfigure = config.onConfigure;

    this.config = {
      cache: true,
      cacheTtl: 86400000, // 24 hours
      maxCacheSize: 1000, // Maximum field types to cache
      debug: false,
      maxRetries: 3,
      fallbackToLocal: true,
      ...config,
      localProviderConfig: config.localProviderConfig || {},
      dataset: config.dataset || '',
    };

    // Initialize CloudApiClient
    this.apiClient = new CloudApiClient({
      baseUrl: fillkitApiBaseUrl,
      token: this.config.token,
      timeout: 30000,
      retries: 3,
      tokenProvider: config.tokenProvider,
    });

    // Initialize LocalProvider (kept for compatibility, but no automatic fallback)
    this.localProvider = new LocalProvider(this.config.localProviderConfig);
  }

  /**
   * Validates configuration object.
   *
   * @param config - Configuration to validate.
   * @throws {ProviderError} If configuration is invalid.
   */
  private validateConfig(config: CloudProviderConfig): void {
    if (!config.projectId || typeof config.projectId !== 'string') {
      throw new ProviderError(
        'CloudProvider requires valid projectId in configuration'
      );
    }

    if (!config.token || typeof config.token !== 'string') {
      throw new ProviderError(
        'CloudProvider requires valid token in configuration'
      );
    }

    // Validate token format
    const tokenPattern = /^fk_(live|test)_[a-zA-Z0-9]{10,}$/;
    if (!tokenPattern.test(config.token)) {
      logger.warn(
        'FillKit: Token format unexpected — expected fk_live_<id> or fk_test_<id>'
      );
    }
  }

  /**
   * Get a Faker instance for FormIdentity generation.
   * Delegates to the internal LocalProvider.
   */
  getFakerInstance(
    locale?: string
  ): ReturnType<LocalProvider['getFakerInstance']> {
    return this.localProvider.getFakerInstance(locale);
  }

  /**
   * Initializes the provider.
   *
   * @remarks
   * Sets up API connection, loads cached datasets, and initializes LocalProvider.
   * Uses promise pattern to prevent race conditions. Safe to call multiple times.
   *
   * @throws {ProviderError} If initialization fails (connection, auth, etc.).
   */
  async init(): Promise<void> {
    // Already initialized
    if (this.initialized) return;

    // Initialization in progress
    if (this.initPromise) return this.initPromise;

    // Start initialization
    this.initPromise = this._doInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal initialization implementation.
   *
   * @remarks
   * Performs actual initialization work: tests API connection, loads cached datasets,
   * and emits feedback messages. Errors are propagated to caller.
   */
  private async _doInit(): Promise<void> {
    try {
      // Initialize LocalProvider (kept for manual usage, but no automatic fallback)
      await this.localProvider.init();

      // Test API connection - errors will be thrown and caught below
      await this.testConnection();

      // Load cached dataset from storage
      await this.loadCachedDataset();

      this.initialized = true;

      // Emit success feedback if manager available
      if (this.feedbackManager) {
        this.feedbackManager.show({
          type: 'success',
          scope: 'cloud',
          message: 'Connected to FillKit Cloud',
          persistent: false,
        });
      }
    } catch (error) {
      // Emit error feedback
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (this.feedbackManager) {
        this.feedbackManager.show({
          type: 'error',
          scope: 'cloud',
          message: `Failed to connect to FillKit Cloud: ${errorMessage}`,
          persistent: true,
          ...(this.onConfigure && {
            action: {
              label: 'Configure',
              handler: () => {
                this.onConfigure?.();
              },
            },
          }),
        });
      }

      // Always throw errors - no automatic fallback
      throw new ProviderError(
        `Failed to initialize cloud provider: ${errorMessage}`
      );
    }
  }

  /**
   * Sanitizes error objects to prevent sensitive data exposure.
   *
   * @remarks
   * Extracts only safe error properties (message, code) to prevent token leakage in logs.
   *
   * @param error - Error to sanitize.
   * @returns Sanitized error object with message and optional code.
   */
  private sanitizeError(error: unknown): { message: string; code?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'code' in error ? String(error.code) : undefined,
      };
    }
    return { message: 'Unknown error' };
  }

  /**
   * Validates an API key.
   *
   * @remarks
   * Checks if the API key is valid and returns associated project information.
   * Can validate a different key than the one configured in the provider.
   *
   * @param apiKey - API key to validate. If not provided, uses the configured token.
   * @returns Validation result with project info if valid.
   */
  async validateApiKey(apiKey?: string): Promise<CloudCredentialsValidation> {
    try {
      // Use provided API key or current token
      const keyToValidate = apiKey || this.config.token;

      // Create temporary client if using different API key
      const client = apiKey
        ? new CloudApiClient({
            baseUrl: fillkitApiBaseUrl,
            token: apiKey,
            timeout: 30000,
            retries: 3,
          })
        : this.apiClient;

      // Validate API key using the public endpoint
      const validation = await client.post<{
        valid: boolean;
        project: { id: string; name: string } | null;
        environment: string;
      }>('/validate-key', { apiKey: keyToValidate });

      if (!validation?.data) {
        return {
          valid: false,
          error: 'Invalid API response',
          errorCode: 'NETWORK_ERROR',
        };
      }

      if (!validation.data.valid) {
        return {
          valid: false,
          error: 'Invalid or expired API key',
          errorCode: 'INVALID_TOKEN',
        };
      }

      return {
        valid: true,
        projectId: validation.data.project?.id ?? '',
        projectName: validation.data.project?.name ?? '',
        tokenExpiresAt: undefined,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        if (error.message.includes('Invalid or expired')) {
          return {
            valid: false,
            error: 'API key is invalid or expired',
            errorCode: 'EXPIRED_TOKEN',
          };
        }
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Validates cloud credentials (API key + project ID).
   *
   * @remarks
   * Primary method for checking if credentials are valid. Validates both the API key
   * and project access.
   *
   * @returns Validation result with project info if valid.
   */
  async validateCredentials(): Promise<CloudCredentialsValidation> {
    try {
      // Validate API key first
      const apiKeyValidation = await this.validateApiKey();

      if (!apiKeyValidation.valid) {
        return apiKeyValidation;
      }

      // If API key has a specific project, validate access to it
      if (this.config.projectId) {
        const projectResponse = await this.apiClient.get<{
          project: CloudProject;
        }>(`/projects/${this.config.projectId}`);

        const project = projectResponse.data.project;

        return {
          valid: true,
          projectId: project.id,
          projectName: project.name,
          tokenExpiresAt: apiKeyValidation.tokenExpiresAt,
        };
      }

      // Multi-project API key - return the validation result
      return apiKeyValidation;
    } catch (error) {
      if (error instanceof ProviderError) {
        if (error.message.includes('Invalid or expired')) {
          return {
            valid: false,
            error: 'API key is invalid or expired',
            errorCode: 'EXPIRED_TOKEN',
          };
        }
        if (error.message.includes('not found')) {
          return {
            valid: false,
            error: 'Project not found or access denied',
            errorCode: 'INVALID_PROJECT',
          };
        }
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Tests API connection.
   *
   * @throws {ProviderError} If connection fails.
   */
  private async testConnection(): Promise<void> {
    const validation = await this.validateCredentials();
    if (!validation.valid) {
      throw new ProviderError(
        validation.error || 'Failed to connect to cloud API'
      );
    }
  }

  /**
   * Gets a value for a specific field type.
   *
   * @remarks
   * Retrieves values from cached cloud datasets with automatic URL-based routing.
   * Triggers background refresh if cache is stale. Returns `null` if no cloud data available.
   *
   * @param fieldType - Semantic field type to generate.
   * @param options - Generation options including mode, constraints, and element.
   * @returns Generated value, or `null` if no cloud data available.
   */
  async getValue(
    fieldType: string,
    options: ValueOptions = {}
  ): Promise<string | number | boolean | null> {
    if (!this.initialized) {
      await this.init();
    }

    // Check cache staleness and trigger background refresh (at most one at a time)
    if (
      this.mergedCache &&
      this.datasetSyncTimestamp &&
      !this.backgroundSyncInFlight
    ) {
      const age = Date.now() - this.datasetSyncTimestamp;
      if (age > this.config.cacheTtl) {
        this.backgroundSyncInFlight = true;
        this.syncDatasets()
          .catch(err => {
            if (this.config.debug) {
              logger.warn(
                'FillKit: Background sync failed:',
                this.sanitizeError(err)
              );
            }
          })
          .finally(() => {
            this.backgroundSyncInFlight = false;
          });
      }
    }

    // Try cached cloud dataset first (synchronous — no I/O)
    const cloudValue = this.getValueFromCachedDataset(fieldType, options);
    if (cloudValue !== null) {
      return cloudValue;
    }

    // Fallback to local provider if configured (default: true)
    if (this.config.fallbackToLocal !== false) {
      return this.localProvider.getValue(fieldType, options);
    }

    return null;
  }

  /**
   * Gets a coherent profile of related fields.
   *
   * @remarks
   * CloudProvider in cached mode doesn't support profile generation.
   * Returns empty object. Use LocalProvider directly if profile generation is needed.
   *
   * @param _opts - Profile options (unused).
   * @returns Empty object.
   */
  async getProfile(
    opts: ProfileOptions = {}
  ): Promise<Record<string, unknown>> {
    if (!this.initialized) {
      await this.init();
    }

    // Delegate to LocalProvider for coherent profile generation
    return this.localProvider.getProfile(opts);
  }

  /**
   * Clears cache (memory and storage via atom).
   */
  async clearCache(): Promise<void> {
    // Clear merged cache
    this.mergedCache = null;
    this.cacheAccessOrder.clear();
    this.routedDatasetIds = null;
    this.routedDatasetUrl = null;
    this.mergedCacheWarningShown = false;

    // Clear cached datasets
    try {
      cloudDatasets.set({});
    } catch (error) {
      logger.warn(
        'FillKit: Failed to clear cache storage',
        this.sanitizeError(error)
      );
    }
  }

  /**
   * Gets cache statistics.
   *
   * @returns Cache statistics including size and entries.
   */
  async getCacheStats(): Promise<{
    size: number;
    entries: string[];
    storageSize?: number;
  }> {
    const stats = {
      size: this.mergedCache ? Object.keys(this.mergedCache.data).length : 0,
      entries: this.mergedCache ? Object.keys(this.mergedCache.data) : [],
      storageSize: undefined as number | undefined,
    };

    return stats;
  }

  /**
   * Uploads page schema to cloud for dataset generation.
   *
   * @remarks
   * Transforms schema to backend format (snake_case) and uploads to cloud API.
   * The cloud will process the schema and generate a dataset.
   *
   * @param pageSchema - Page schema to upload.
   * @returns Upload result with dataset ID and status.
   */
  async uploadPageSchema(pageSchema: PageSchema): Promise<SchemaUploadResult> {
    if (!this.initialized) {
      await this.init();
    }

    // Transform schema to backend format (snake_case)
    const transformedSchema = {
      projectId: this.config.projectId, // Include projectId for "all" API keys
      url: pageSchema.metadata.url,
      title: pageSchema.metadata.title,
      domain: pageSchema.metadata.domain,
      description: pageSchema.metadata.description,
      og_description: pageSchema.metadata.ogDescription,
      headings: pageSchema.metadata.headings,
      forms: pageSchema.forms.map(form => ({
        form_id: form.formId,
        form_name: form.formName || null,
        form_action: form.formAction || null,
        form_method: form.formMethod || null,
        fields: form.fields.map(field => ({
          name: field.name,
          input_type: field.inputType,
          semantic_type: field.semanticType,
          label: field.label || null,
          placeholder: field.placeholder || null,
          required: field.required || false,
          confidence: field.confidence || null,
          detected_by: field.detectedBy || 'sdk',
        })),
      })),
    };

    const response = await this.apiClient.post<SchemaUploadResult>(
      `/schemas`,
      transformedSchema
    );

    return response.data;
  }

  /**
   * Syncs all datasets from cloud to local storage.
   *
   * @remarks
   * Downloads all ready datasets for the project and merges them into a single cache.
   * Uses parallel downloads with retry logic and set-based deduplication for performance.
   * Allows data reuse across different pages via automatic URL matching.
   *
   * @returns Sync result with merged dataset info.
   * @throws {ProviderError} If no ready datasets found or download fails.
   */
  async syncDatasets(): Promise<DatasetSyncResult> {
    if (!this.initialized) {
      await this.init();
    }

    // List all ready datasets for the project
    const datasetsResponse = await this.apiClient.get<DatasetListResponse>(
      `/datasets?projectId=${this.config.projectId}&status=ready`
    );

    const readyDatasets = datasetsResponse.data.datasets.filter(
      d => d.status === 'ready'
    );

    if (readyDatasets.length === 0) {
      const totalDatasets = datasetsResponse.data.datasets.length;
      throw new ProviderError(
        `No ready datasets found for project ${this.config.projectId}. ` +
          `Total datasets: ${totalDatasets}. Generate a dataset first.`
      );
    }

    // Parallel downloads with Promise.all
    const downloadPromises = readyDatasets.map(datasetMeta =>
      this.downloadDatasetWithRetry(datasetMeta, this.config.maxRetries)
    );

    const downloadResults = await Promise.all(downloadPromises);

    // Process successful downloads
    const mergedData: {
      [semanticType: string]: Array<string | number | boolean>;
    } = {};
    // Parallel dedup Sets — avoids repeated Array→Set→Array round-trips
    const deduplicationSets: {
      [semanticType: string]: Set<string | number | boolean>;
    } = {};
    const dataByDataset: MergedDatasetCache['dataByDataset'] = {};
    const sourcePages: MergedDatasetCache['sourcePages'] = [];
    const datasetIds: string[] = [];

    for (const result of downloadResults) {
      if (!result.success || !result.dataset) {
        continue;
      }

      const dataset = result.dataset;
      datasetIds.push(dataset.id);

      // Store dataset data separately for automatic routing
      dataByDataset[dataset.id] = {
        data: { ...dataset.data },
        sourcePages: dataset.sourcePages.map(page => ({
          url: page.url,
          title: page.title,
          scannedAt: page.scannedAt,
        })),
      };

      // Merge values with dedup — parallel Set avoids Array→Set→Array round-trips
      for (const [semanticType, values] of Object.entries(dataset.data)) {
        if (!mergedData[semanticType]) {
          mergedData[semanticType] = [];
          deduplicationSets[semanticType] = new Set();
        } else if (!deduplicationSets[semanticType]) {
          deduplicationSets[semanticType] = new Set(mergedData[semanticType]);
        }
        const seen = deduplicationSets[semanticType];
        for (const value of values) {
          if (!seen.has(value)) {
            seen.add(value);
            mergedData[semanticType].push(value);
          }
        }
      }

      // Collect source pages
      for (const page of dataset.sourcePages) {
        sourcePages.push({
          ...page,
          datasetId: dataset.id,
        });
      }
    }

    // Create merged cache
    const mergedCache: MergedDatasetCache = {
      projectId: this.config.projectId,
      lastUpdated: Date.now(),
      datasetIds,
      data: mergedData,
      dataByDataset,
      sourcePages,
    };

    // Enforce cache size limits
    await this.evictCacheIfNeeded(mergedCache);

    // Persist merged cache to atom
    try {
      cloudDatasets.set({
        [`${this.config.projectId}:merged-cache`]: {
          name: 'merged-cache',
          data: Object.entries(mergedCache.data).map(([key, values]) => ({
            [key]: values,
          })),
          cachedAt: Date.now(),
          version: `merged-${datasetIds.length}`,
        },
      });
    } catch (error) {
      logger.warn(
        'FillKit: Failed to save cache to atom',
        this.sanitizeError(error)
      );
    }

    // Update in-memory cache and invalidate routed dataset cache
    this.mergedCache = mergedCache;
    this.datasetSyncTimestamp = Date.now();
    this.routedDatasetIds = null;
    this.routedDatasetUrl = null;

    // Calculate total record count
    const recordCount = Object.values(mergedData).reduce(
      (sum, values) => sum + values.length,
      0
    );

    return {
      synced: true,
      version: `merged-${datasetIds.length}`,
      recordCount,
      timestamp: this.datasetSyncTimestamp,
    };
  }

  /**
   * Downloads a single dataset with retry logic.
   *
   * @remarks
   * Uses exponential backoff retry (100ms, 200ms, 400ms, ...) for network errors.
   * Does not retry on permanent errors (404, auth errors).
   *
   * @param datasetMeta - Dataset metadata.
   * @param maxRetries - Maximum retry attempts.
   * @returns Download result with success status and dataset.
   */
  private async downloadDatasetWithRetry(
    datasetMeta: { id: string; status: string },
    maxRetries: number
  ): Promise<DatasetDownloadResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const datasetResponse = await this.apiClient.get<CloudDataset>(
          `/datasets/${datasetMeta.id}/data`
        );

        return {
          success: true,
          datasetMeta,
          dataset: datasetResponse.data,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on network errors, not on 404 or auth errors
        if (
          error instanceof ProviderError &&
          (error.message.includes('not found') ||
            error.message.includes('unauthorized'))
        ) {
          break; // Don't retry on permanent errors
        }

        // Exponential backoff: 100ms, 200ms, 400ms, ...
        if (attempt < maxRetries) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    logger.warn(
      `FillKit: Failed to download dataset ${datasetMeta.id} after ${maxRetries + 1} attempts`,
      this.sanitizeError(lastError)
    );

    return {
      success: false,
      datasetMeta,
      error: lastError,
    };
  }

  /**
   * Evicts cache entries if size exceeds limit.
   *
   * @remarks
   * Implements LRU (Least Recently Used) cache eviction strategy.
   *
   * @param cache - Cache to check and evict from.
   */
  private async evictCacheIfNeeded(cache: MergedDatasetCache): Promise<void> {
    const cacheSize = Object.keys(cache.data).length;

    if (cacheSize > this.config.maxCacheSize) {
      const excessCount = cacheSize - this.config.maxCacheSize;

      // Build O(1) position lookup from Map iteration order
      const positionMap = new Map<string, number>();
      let idx = 0;
      for (const key of this.cacheAccessOrder.keys()) {
        positionMap.set(key, idx++);
      }

      const fieldTypes = Object.keys(cache.data);
      const lruFieldTypes = fieldTypes
        .sort((a, b) => {
          // Keys absent from the Map sort first (never accessed = coldest)
          const ai = positionMap.get(a) ?? -1;
          const bi = positionMap.get(b) ?? -1;
          return ai - bi;
        })
        .slice(0, excessCount);

      // Evict LRU entries
      for (const fieldType of lruFieldTypes) {
        delete cache.data[fieldType];
      }
    }
  }

  /**
   * Tracks cache access for LRU eviction.
   *
   * @remarks
   * Uses Map's insertion-order guarantee for O(1) delete+re-insert instead
   * of O(n) indexOf+splice on an array.
   *
   * @param fieldType - Field type that was accessed.
   */
  private trackCacheAccess(fieldType: string): void {
    // Delete-then-set moves the key to the end (most recently used)
    this.cacheAccessOrder.delete(fieldType);
    this.cacheAccessOrder.set(fieldType, true);

    // Trim if needed (evict oldest entries from the front)
    if (this.cacheAccessOrder.size > this.config.maxCacheSize * 2) {
      const excess = this.cacheAccessOrder.size - this.config.maxCacheSize;
      let removed = 0;
      for (const key of this.cacheAccessOrder.keys()) {
        if (removed >= excess) break;
        this.cacheAccessOrder.delete(key);
        removed++;
      }
    }
  }

  /**
   * Gets dataset synchronization status.
   *
   * @returns Sync status with version, staleness, and record count info.
   */
  async getDatasetSyncStatus(): Promise<DatasetSyncStatus> {
    const status: DatasetSyncStatus = {
      lastSync: this.datasetSyncTimestamp,
      version: this.mergedCache
        ? `merged-${this.mergedCache.datasetIds.length}`
        : null,
      recordCount: 0,
      isStale: false,
      nextSync: null,
    };

    // Calculate record count if cache exists
    if (this.mergedCache) {
      status.recordCount = Object.values(this.mergedCache.data).reduce(
        (sum, values) => sum + values.length,
        0
      );

      // Check if cache is stale
      if (this.datasetSyncTimestamp) {
        const age = Date.now() - this.datasetSyncTimestamp;
        status.isStale = age > this.config.cacheTtl;
      }
    }

    return status;
  }

  /**
   * Loads merged dataset cache from atom.
   *
   * @remarks
   * Reconstructs MergedDatasetCache from the cloudDatasets atom.
   */
  private async loadCachedDataset(): Promise<void> {
    try {
      const datasets = cloudDatasets.get();
      const cacheKey = `${this.config.projectId}:merged-cache`;
      const cachedData = datasets[cacheKey];

      if (cachedData) {
        // Reconstruct MergedDatasetCache from atom data
        const mergedData: Record<string, Array<string | number | boolean>> = {};
        if (Array.isArray(cachedData.data)) {
          for (const item of cachedData.data) {
            Object.assign(
              mergedData,
              sanitizeObject(item as Record<string, unknown>)
            );
          }
        }

        this.mergedCache = {
          projectId: this.config.projectId,
          lastUpdated: cachedData.cachedAt,
          datasetIds: [],
          data: mergedData,
          dataByDataset: {},
          sourcePages: [],
        } as MergedDatasetCache;
        this.datasetSyncTimestamp = cachedData.cachedAt;

        if (this.config.debug) {
          logger.info(
            `FillKit: Loaded cache with ${Object.keys(mergedData).length} field types from atom`
          );
        }
      }
    } catch (error) {
      logger.warn(
        'FillKit: Failed to load merged cache from atom',
        this.sanitizeError(error)
      );
    }
  }

  /**
   * Finds datasets that match the current page URL.
   *
   * @remarks
   * Automatically routes to datasets based on their sourcePages. Uses priority matching:
   * 1. Exact full URL match (including query params)
   * 2. Exact pathname match (ignoring query params and hash)
   *
   * @returns Array of dataset IDs that match the current URL, or empty array if no match.
   */
  private findDatasetsForCurrentUrl(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    if (!this.mergedCache) {
      return [];
    }

    const currentUrl = window.location.href;
    const currentPathname = window.location.pathname;
    const currentOrigin = window.location.origin;

    const matchingDatasetIds: string[] = [];

    // Iterate through all datasets and check their sourcePages
    for (const [datasetId, datasetInfo] of Object.entries(
      this.mergedCache.dataByDataset
    )) {
      for (const sourcePage of datasetInfo.sourcePages) {
        try {
          const sourceUrl = new URL(sourcePage.url);
          const sourcePathname = sourceUrl.pathname;
          const sourceOrigin = sourceUrl.origin;

          // Match strategies in priority order:
          // 1. Exact full URL match (including query params)
          if (currentUrl === sourcePage.url) {
            matchingDatasetIds.push(datasetId);
            break;
          }

          // 2. Exact pathname match (ignoring query params and hash)
          if (
            currentOrigin === sourceOrigin &&
            currentPathname === sourcePathname
          ) {
            matchingDatasetIds.push(datasetId);
            break;
          }
        } catch (error) {
          // Invalid URL in sourcePages, skip it
          logger.warn(
            `FillKit: Invalid source page URL "${sourcePage.url}" in dataset ${datasetId}`,
            this.sanitizeError(error)
          );
        }
      }
    }

    return matchingDatasetIds;
  }

  /**
   * Gets value from merged dataset cache.
   *
   * @remarks
   * Tries page-matched datasets first, then falls back to merged cache.
   * Returns `null` if no cloud data available. Fully synchronous — no I/O.
   *
   * @param fieldType - Field type to get value for.
   * @param _options - Value options (unused).
   * @returns Generated value, or `null` if no cloud data.
   */
  private getValueFromCachedDataset(
    fieldType: string,
    _options: ValueOptions
  ): string | number | boolean | null {
    // Track cache access for LRU
    this.trackCacheAccess(fieldType);

    if (!this.mergedCache) {
      // Emit warning once (not per-field) to avoid feedback spam
      if (this.feedbackManager && !this.mergedCacheWarningShown) {
        this.mergedCacheWarningShown = true;
        this.feedbackManager.show({
          type: 'warning',
          scope: 'provider',
          message: 'No cloud data available — sync datasets first',
          persistent: false,
        });
      }
      return null;
    }

    // Try page-matched datasets first
    const valueFromRouted = this.tryGetFromRoutedDatasets(fieldType);
    if (valueFromRouted !== null) {
      return valueFromRouted;
    }

    // Try merged cache
    const valueFromMerged = this.tryGetFromMergedCache(fieldType);
    if (valueFromMerged !== null) {
      return valueFromMerged;
    }

    // No cloud data available - return null (no automatic fallback)
    return null;
  }

  /**
   * Tries to get value from page-matched datasets.
   *
   * @remarks
   * Uses URL matching to find datasets specific to the current page.
   * Caches matched dataset IDs per URL to avoid re-parsing on every field.
   *
   * @param fieldType - Field type to get value for.
   * @returns Generated value, or `null` if no match.
   */
  private tryGetFromRoutedDatasets(
    fieldType: string
  ): string | number | boolean | null {
    if (!this.mergedCache) return null;

    // Cache URL-matched dataset IDs — only recompute when URL changes
    const currentUrl =
      typeof window !== 'undefined' ? window.location.href : '';
    if (this.routedDatasetUrl !== currentUrl) {
      this.routedDatasetIds = this.findDatasetsForCurrentUrl();
      this.routedDatasetUrl = currentUrl;
    }

    const matchingDatasetIds = this.routedDatasetIds;
    if (!matchingDatasetIds || matchingDatasetIds.length === 0) {
      return null;
    }

    // Collect all values from matching datasets
    const matchedValues: Array<string | number | boolean> = [];

    for (const datasetId of matchingDatasetIds) {
      const datasetInfo = this.mergedCache.dataByDataset[datasetId];
      if (datasetInfo && datasetInfo.data[fieldType]) {
        for (const v of datasetInfo.data[fieldType]) {
          matchedValues.push(v);
        }
      }
    }

    if (matchedValues.length > 0) {
      const randomIndex = Math.floor(Math.random() * matchedValues.length);
      return matchedValues[randomIndex];
    }

    return null;
  }

  /**
   * Tries to get value from merged cache (all datasets combined).
   *
   * @remarks
   * Fallback when no page-specific datasets match.
   *
   * @param fieldType - Field type to get value for.
   * @returns Generated value, or `null` if not in cache.
   */
  private tryGetFromMergedCache(
    fieldType: string
  ): string | number | boolean | null {
    if (!this.mergedCache || !this.mergedCache.data[fieldType]) {
      return null;
    }

    const values = this.mergedCache.data[fieldType];
    if (values.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Updates authentication token.
   *
   * @remarks
   * Used by widget after user copies API key from SaaS dashboard.
   *
   * @param token - New authentication token (API key from dashboard).
   * @throws {ProviderError} If token is invalid.
   */
  setAuthToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new ProviderError('Invalid token: must be non-empty string');
    }

    const tokenPattern = /^fk_(live|test)_[a-zA-Z0-9]{10,}$/;
    if (!tokenPattern.test(token)) {
      logger.warn(
        'FillKit: Token format unexpected — expected fk_live_<id> or fk_test_<id>'
      );
    }

    this.config.token = token;
    this.apiClient.setToken(token);
  }

  /**
   * Gets current authentication token.
   *
   * @returns Current token.
   */
  getAuthToken(): string {
    return this.config.token;
  }

  // ============================================================================
  // Project Management Methods
  // ============================================================================

  /**
   * Gets project by ID.
   *
   * @param projectId - Project ID.
   * @returns Project details.
   */
  async getProject(projectId: string): Promise<CloudProject> {
    const response = await this.apiClient.get<CloudProject>(
      `/projects/${projectId}`
    );

    return response.data;
  }

  /**
   * Lists all projects for current user.
   *
   * @remarks
   * Used by widget to show project selection dropdown. Converts offset to page number
   * for backend compatibility.
   *
   * @param options - Pagination options.
   * @returns List of projects.
   */
  async listProjects(options?: {
    offset?: number;
    limit?: number;
  }): Promise<ProjectListResponse> {
    const params = new URLSearchParams();

    // Backend uses 'page' instead of 'offset' - convert offset to page number
    if (options?.offset !== undefined) {
      const limit = options.limit || 20;
      const page = Math.floor(options.offset / limit) + 1;
      params.set('page', String(page));
    }

    if (options?.limit !== undefined) {
      params.set('limit', String(options.limit));
    }

    const query = params.toString();
    const path = query ? `/projects?${query}` : '/projects';

    // Backend returns PaginateResult<ProjectWithRelations>
    const response = await this.apiClient.get<{
      results: Array<{
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
      }>;
      page: number;
      limit: number;
      totalPages: number;
      totalResults: number;
    }>(path);

    return {
      projects: response.data.results.map(project => ({
        id: project.id,
        name: project.name,
        createdAt: new Date(project.created_at).getTime(),
        updatedAt: new Date(project.updated_at).getTime(),
      })),
      total: response.data.totalResults,
      offset: (response.data.page - 1) * response.data.limit,
      limit: response.data.limit,
    };
  }

  // ============================================================================
  // Dataset Management Methods
  // ============================================================================

  /**
   * Lists datasets for a project.
   *
   * @remarks
   * This endpoint uses offset directly (unlike listProjects which uses page-based pagination).
   *
   * @param projectId - Project ID.
   * @param options - Pagination options.
   * @returns List of datasets.
   */
  async listDatasets(
    projectId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<DatasetListResponse> {
    const params = new URLSearchParams({ projectId });

    // This endpoint uses offset directly (not page-based)
    if (options?.offset !== undefined) {
      params.set('offset', String(options.offset));
    }
    if (options?.limit !== undefined) {
      params.set('limit', String(options.limit));
    }

    const response = await this.apiClient.get<DatasetListResponse>(
      `/datasets?${params.toString()}`
    );

    return response.data;
  }

  /**
   * Refreshes local dataset cache.
   *
   * @remarks
   * Alias for `syncDatasets()` for better UX.
   *
   * @returns Sync result.
   */
  async refreshDatasets(): Promise<DatasetSyncResult> {
    return this.syncDatasets();
  }

  /**
   * Returns the set of semantic field types available in the merged cache.
   *
   * @remarks
   * Used by ProviderManager to track which types have cloud data,
   * enabling degradation recovery after a successful sync.
   *
   * @returns Set of available field type strings.
   */
  getAvailableTypes(): Set<string> {
    if (!this.mergedCache) return new Set();
    return new Set(Object.keys(this.mergedCache.data));
  }

  /**
   * Cleans up resources.
   *
   * @remarks
   * **Important:** Always call this method when done with the provider to prevent memory leaks.
   * The LocalProvider and other resources will not be automatically garbage collected without
   * calling `destroy()`.
   */
  async destroy(): Promise<void> {
    // Clear caches
    await this.clearCache();

    // Destroy local provider
    await this.localProvider.destroy?.();

    // Clear merged cache
    this.mergedCache = null;
    this.datasetSyncTimestamp = null;
    this.cacheAccessOrder.clear();
    this.routedDatasetIds = null;
    this.routedDatasetUrl = null;
    this.mergedCacheWarningShown = false;

    this.initialized = false;
  }

  /**
   * Gets the current project ID.
   *
   * @returns Project ID.
   */
  getProjectId(): string {
    return this.config.projectId;
  }
}
