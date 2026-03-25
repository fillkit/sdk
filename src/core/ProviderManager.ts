/**
 * Manages provider status and fallback logic.
 *
 * @remarks
 * Tracks whether the cloud provider is available, degraded, or unavailable.
 * Coordinates fallback between cloud and local (Faker.js) providers based on
 * dataset availability and field type coverage. Maintains statistics about
 * provider usage for monitoring and debugging.
 *
 * @example
 * ```ts
 * const manager = new ProviderManager();
 * manager.setStatus('cloud');
 * manager.recordFill('cloud', 'email');
 * const stats = manager.getStats();
 * console.log(`Cloud fill percentage: ${manager.getCloudFillPercentage()}%`);
 * ```
 */

import type { ProviderStatus } from '../types/cloud.js';

/**
 * Statistics about provider usage and status.
 */
export interface ProviderStats {
  /** Current provider status. */
  status: ProviderStatus;
  /** Number of fills from cloud provider. */
  cloudFills: number;
  /** Number of fills from local provider (Faker.js). */
  localFills: number;
  /** Timestamp of last successful dataset sync. */
  lastSyncTime: number | null;
  /** Version of the current dataset. */
  datasetVersion: string | null;
  /** Field types available in cloud dataset. */
  availableTypes: Set<string>;
  /** Field types that required local fallback. */
  missingTypes: Set<string>;
}

export class ProviderManager {
  private status: ProviderStatus = 'local';
  private cloudFills = 0;
  private localFills = 0;
  private lastSyncTime: number | null = null;
  private datasetVersion: string | null = null;
  private availableTypes: Set<string> = new Set();
  private missingTypes: Set<string> = new Set();

  /**
   * Gets the current provider status.
   *
   * @returns The current provider status ('local', 'cloud', or 'cloud-degraded').
   */
  getStatus(): ProviderStatus {
    return this.status;
  }

  /**
   * Sets the provider status.
   *
   * @param status - The new provider status.
   */
  setStatus(status: ProviderStatus): void {
    this.status = status;
  }

  /**
   * Updates status based on dataset availability.
   *
   * @remarks
   * Sets status to 'cloud' if dataset has types, otherwise 'local'.
   * Updates the internal set of available field types.
   *
   * @param datasetTypes - Field types available in the cloud dataset.
   */
  updateFromDataset(datasetTypes: Set<string>): void {
    // Accept the Set directly — callers (getAvailableTypes) already
    // create a fresh Set, so a defensive copy is unnecessary.
    this.availableTypes = datasetTypes;

    if (datasetTypes.size === 0) {
      this.status = 'local';
    } else {
      this.status = 'cloud';
    }
  }

  /**
   * Checks if cloud provider has data for a specific field type.
   *
   * @param fieldType - Semantic field type to check.
   * @returns `true` if the type is available in the cloud dataset, `false` otherwise.
   */
  hasCloudData(fieldType: string): boolean {
    return this.availableTypes.has(fieldType);
  }

  /**
   * Records a fill operation.
   *
   * @remarks
   * Increments the appropriate counter (cloud or local) and tracks missing types
   * when local fallback is used. Automatically updates status to 'cloud-degraded'
   * if local fallback is used while in cloud mode.
   *
   * @param source - Source of data ('cloud' or 'local').
   * @param fieldType - Field type that was filled.
   */
  recordFill(source: 'cloud' | 'local', fieldType: string): void {
    if (source === 'cloud') {
      this.cloudFills++;
    } else {
      this.localFills++;
      this.missingTypes.add(fieldType);

      // Update status to degraded if we're using local fallback
      if (this.status === 'cloud' && this.localFills > 0) {
        this.status = 'cloud-degraded';
      }
    }
  }

  /**
   * Records a successful dataset sync.
   *
   * @param version - Dataset version identifier.
   */
  recordSync(version: string): void {
    this.lastSyncTime = Date.now();
    this.datasetVersion = version;
  }

  /**
   * Gets detailed provider statistics.
   *
   * @returns Object containing status, fill counts, sync info, and type availability.
   */
  getStats(): ProviderStats {
    return {
      status: this.status,
      cloudFills: this.cloudFills,
      localFills: this.localFills,
      lastSyncTime: this.lastSyncTime,
      datasetVersion: this.datasetVersion,
      availableTypes: new Set(this.availableTypes),
      missingTypes: new Set(this.missingTypes),
    };
  }

  /**
   * Calculates the percentage of fills from cloud provider.
   *
   * @returns Percentage (0-100) of fills from cloud vs total fills.
   */
  getCloudFillPercentage(): number {
    const total = this.cloudFills + this.localFills;
    if (total === 0) return 0;
    return Math.round((this.cloudFills / total) * 100);
  }

  /**
   * Resets fill statistics.
   *
   * @remarks
   * Clears fill counters and missing types, but preserves status, sync time,
   * dataset version, and available types. Useful for testing or reinitialization.
   */
  resetStats(): void {
    this.cloudFills = 0;
    this.localFills = 0;
    this.missingTypes.clear();

    // Keep status, lastSyncTime, datasetVersion, and availableTypes
    // Only reset fill counters
  }

  /**
   * Gets a human-readable status message.
   *
   * @returns Descriptive message about the current provider status.
   */
  getStatusMessage(): string {
    switch (this.status) {
      case 'cloud':
        return 'Using cloud datasets';
      case 'cloud-degraded':
        return `Using cloud datasets with ${this.missingTypes.size} fallback types`;
      case 'local':
        return 'Using local data (Faker.js)';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Gets the appropriate badge variant for UI display.
   *
   * @returns Badge variant ('success' for cloud, 'warning' for degraded, 'default' for local).
   */
  getStatusBadgeVariant(): 'success' | 'warning' | 'default' {
    switch (this.status) {
      case 'cloud':
        return 'success';
      case 'cloud-degraded':
        return 'warning';
      case 'local':
        return 'default';
      default:
        return 'default';
    }
  }
}
