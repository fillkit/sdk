/**
 * Cloud provider type definitions for FillKit Cloud integration.
 *
 * @remarks
 * Defines all types, interfaces, and constants related to cloud functionality including:
 * - URL scanning and schema extraction
 * - Schema upload to cloud
 * - Dataset synchronization
 * - Provider status tracking
 * - Project management
 *
 * **Cloud Workflow:**
 * 1. **Scan**: Extract schemas from URLs using PageScanner
 * 2. **Upload**: Send schemas to FillKit Cloud for dataset generation
 * 3. **Sync**: Download generated datasets and cache locally
 * 4. **Fill**: Use cached datasets for form filling with fallback to local provider
 *
 * @example
 * Typical cloud workflow:
 * ```ts
 * import type { ScanOptions, ScanResult, CloudProject } from './cloud';
 *
 * // Configure scanning
 * const options: ScanOptions = {
 *   timeout: 30000,
 *   maxConcurrent: 3,
 *   onProgress: (current, total) => console.log(`${current}/${total}`)
 * };
 *
 * // Scan URLs and get results
 * const results: ScanResult[] = await scanner.scanUrls(urls, options);
 * ```
 */

import type { PageSchema } from './index.js';

// ============================================================================
// SCANNING TYPES
// ============================================================================

/**
 * Configuration options for URL scanning operations.
 *
 * @remarks
 * Controls how PageScanner extracts schemas from multiple URLs including
 * timeout, concurrency, error handling, and progress tracking.
 */
export interface ScanOptions {
  /**
   * Progress callback function.
   *
   * @remarks
   * Called after each URL is scanned to report progress.
   *
   * @param current - Number of URLs scanned so far
   * @param total - Total number of URLs to scan
   */
  onProgress?: (current: number, total: number) => void;

  /**
   * Timeout per URL in milliseconds.
   *
   * @defaultValue 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Whether to continue scanning if individual URLs fail.
   *
   * @defaultValue true
   */
  continueOnError?: boolean;

  /**
   * Maximum number of concurrent scan operations.
   *
   * @remarks
   * Limits parallel scanning to avoid overwhelming the browser.
   *
   * @defaultValue 3
   */
  maxConcurrent?: number;
}

/**
 * Result of scanning a single URL.
 *
 * @remarks
 * Contains the extracted schema if successful, or error information if failed.
 * Includes timing information for performance monitoring.
 */
export interface ScanResult {
  /** The URL that was scanned */
  url: string;

  /** Whether the scan succeeded */
  success: boolean;

  /**
   * Extracted page schema.
   *
   * @remarks
   * Only present if `success` is true.
   */
  schema?: PageSchema;

  /**
   * Error message.
   *
   * @remarks
   * Only present if `success` is false.
   */
  error?: string;

  /** Time taken to scan in milliseconds */
  duration: number;
}

/**
 * Summary of batch scanning operation.
 *
 * @remarks
 * Aggregates results from scanning multiple URLs including success/failure
 * counts and extracted field/form statistics.
 */
export interface ScanSummary {
  /** Total URLs scanned */
  scanned: number;

  /** Number of successful scans */
  succeeded: number;

  /** Number of failed scans */
  failed: number;

  /** Total fields extracted across all pages */
  totalFields: number;

  /** Total forms extracted across all pages */
  totalForms: number;

  /** Individual scan results for each URL */
  results: ScanResult[];
}

// ============================================================================
// SCHEMA UPLOAD TYPES
// ============================================================================

/**
 * Result of uploading schemas to cloud
 */
export interface UploadResult {
  /**
   * Whether upload succeeded
   */
  success: boolean;

  /**
   * Number of schemas created
   */
  created: number;

  /**
   * Number of schemas updated
   */
  updated: number;

  /**
   * Total fields uploaded
   */
  totalFields: number;

  /**
   * Error message (if failed)
   */
  error?: string;
}

// ============================================================================
// DATASET SYNC TYPES
// ============================================================================

/**
 * Result of syncing datasets from cloud
 */
export interface SyncResult {
  /**
   * Whether sync succeeded
   */
  success: boolean;

  /**
   * Dataset version
   */
  version: string;

  /**
   * Total records synced
   */
  recordCount: number;

  /**
   * Timestamp of sync
   */
  lastSync: number;

  /**
   * Error message (if failed)
   */
  error?: string;
}

/**
 * Cached dataset in IndexedDB
 */
export interface CachedDataset {
  /**
   * Project ID this dataset belongs to
   */
  projectId: string;

  /**
   * Dataset version
   */
  version: string;

  /**
   * When dataset was last synced
   */
  lastSync: number;

  /**
   * Dataset data (field type -> values)
   */
  data: DatasetData;
}

/**
 * Dataset data structure
 */
export interface DatasetData {
  [semanticType: string]: Array<string | number | boolean>;
}

// ============================================================================
// PROVIDER STATUS TYPES
// ============================================================================

/**
 * Provider status indicating which data source is being used.
 *
 * @remarks
 * Tracks whether form filling is using cloud datasets, local generation (Faker.js),
 * or a mixed mode with fallback.
 */
export type ProviderStatus =
  /** Using local provider only (Faker.js) - no cloud connection */
  | 'local'
  /** Using cloud datasets only - all data from FillKit Cloud */
  | 'cloud'
  /** Using cloud with local fallback - mixed mode for missing field types */
  | 'cloud-degraded';

/**
 * Result of a fill operation with source tracking.
 *
 * @remarks
 * Tracks which fields were filled from cloud vs local providers,
 * useful for monitoring cloud dataset coverage.
 */
export interface FillResult {
  /** Total fields filled */
  filled: number;

  /** Fields filled from cloud datasets */
  cloudFilled: number;

  /** Fields filled from local provider (Faker.js) */
  localFilled: number;

  /** Current provider status after fill operation */
  providerStatus: ProviderStatus;
}

// ============================================================================
// CACHED SCHEMA TYPES
// ============================================================================

/**
 * Cached schema metadata in localStorage
 */
export interface CachedSchema {
  /**
   * URL of the scanned page
   */
  url: string;

  /**
   * When schema was cached
   */
  cachedAt: number;

  /**
   * Extracted schema
   */
  schema: PageSchema;
}

// ============================================================================
// CLOUD PROVIDER CONFIG
// ============================================================================

/**
 * Configuration for CloudProvider initialization.
 *
 * @remarks
 * Contains authentication credentials and connection settings for
 * FillKit Cloud API.
 */
export interface CloudProviderConfig {
  /** Project ID from FillKit Cloud dashboard */
  projectId: string;

  /**
   * API authentication token.
   *
   * @remarks
   * Format: `fk_live_xxx` for production or `fk_test_xxx` for testing.
   * Obtain from FillKit Cloud dashboard.
   */
  token: string;

  /**
   * Request timeout in milliseconds.
   *
   * @defaultValue 30000 (30 seconds)
   */
  timeout?: number;
}

// ============================================================================
// PROJECT TYPES (from API)
// ============================================================================

/**
 * Project information from FillKit Cloud.
 *
 * @remarks
 * Represents a cloud project with its metadata, settings, and statistics.
 */
export interface CloudProject {
  /** Unique project identifier */
  id: string;

  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Creation timestamp (Unix milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;

  /** Owner user ID */
  ownerId: string;

  /** Project settings */
  settings?: {
    /** Default locale for data generation */
    defaultLocale?: string;
    /** Default industry context */
    defaultIndustry?: string;
  };

  /** Number of datasets in this project */
  datasetCount: number;

  /** Number of schemas in this project */
  schemaCount: number;
}

/**
 * List of projects response
 */
export interface ProjectListResponse {
  projects: CloudProject[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================================================
// URLS
// ============================================================================

/**
 * FillKit Cloud API base URL.
 *
 * @remarks
 * Base URL for all FillKit Cloud API endpoints.
 */
export const fillkitApiBaseUrl = 'https://fillkit.dev/api/v1';

/**
 * FillKit homepage URL.
 *
 * @remarks
 * Main FillKit website for documentation and resources.
 */
export const fillkitHomeUrl = 'https://fillkit.dev';
