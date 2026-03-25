/**
 * Centralized feedback and notification management system for FillKit.
 * Manages error messages, warnings, progress indicators, and user notifications.
 *
 * @remarks
 * This service provides a centralized way to:
 * - Queue and display user-facing messages
 * - Optionally persist feedback across page reloads
 * - Track active operations (syncing, scanning)
 * - Provide UI components with real-time updates
 *
 * By default, messages are **session-only** (ephemeral). Set `persistent: true`
 * in {@link FeedbackManagerOptions} to enable localStorage persistence with
 * TTL-based cleanup.
 *
 * @example
 * ```typescript
 * const feedback = new FeedbackManager(storage);
 *
 * // Show error message
 * const id = feedback.show({
 *   type: 'error',
 *   scope: 'cloud',
 *   message: 'Failed to connect to Cloud API',
 *   persistent: true,
 *   action: {
 *     label: 'Retry',
 *     handler: () => retryConnection()
 *   }
 * });
 *
 * // Update progress
 * feedback.update(id, {
 *   progress: { current: 5, total: 10 }
 * });
 *
 * // Subscribe to changes
 * const unsubscribe = feedback.subscribe((messages) => {
 *   updateUI(messages);
 * });
 * ```
 */

import type { StorageAdapter } from '../storage/StorageAdapter.js';
import { logger } from '@/core/Logger.js';

/**
 * Defines the severity or nature of a feedback message.
 */
export type FeedbackType =
  | 'loading' // Operation in progress
  | 'success' // Operation completed successfully
  | 'error' // Error occurred
  | 'warning' // Warning or degraded state
  | 'info'; // Informational message

/**
 * Categorizes feedback messages by their functional domain.
 */
export type FeedbackScope =
  | 'global' // System-wide messages
  | 'cloud' // Cloud provider related
  | 'provider' // Data provider issues
  | 'scan' // Page scanning operations
  | 'fill' // Form filling operations
  | 'sync'; // Data synchronization

/**
 * Represents the status of a long-running operation.
 */
export interface FeedbackProgress {
  current: number;
  total: number;
  label?: string; // Optional label like "Scanning URLs" or "Syncing datasets"
}

/**
 * Defines an interactive action associated with a feedback message.
 */
export interface FeedbackAction {
  label: string; // Button text like "Retry" or "Configure"
  handler: () => void | Promise<void>; // Action callback
}

/**
 * Represents a single feedback item in the system.
 */
export interface FeedbackMessage {
  /** Unique identifier */
  id: string;
  /** Message type affects visual styling */
  type: FeedbackType;
  /** Categorizes message by domain */
  scope: FeedbackScope;
  /** User-facing message text */
  message: string;
  /** Unix timestamp when message was created */
  timestamp: number;
  /** Whether message has been dismissed by user */
  dismissed: boolean;
  /** If true, message persists until manually dismissed */
  persistent: boolean;
  /** Optional progress indicator for loading states */
  progress?: FeedbackProgress;
  /** Optional action button */
  action?: FeedbackAction;
  /** Optional detailed information (not shown in compact view) */
  details?: string;
}

/**
 * Configuration options for creating a new feedback message.
 *
 * @remarks
 * Excludes system-managed properties like `id`, `timestamp`, and `dismissed`.
 */
export type FeedbackOptions = Omit<
  FeedbackMessage,
  'id' | 'timestamp' | 'dismissed'
>;

/**
 * A callback function that receives updates when the feedback queue changes.
 */
export type FeedbackSubscriber = (messages: FeedbackMessage[]) => void;

/**
 * Options for FeedbackManager construction.
 */
export interface FeedbackManagerOptions {
  /**
   * Whether to persist messages to storage across page reloads.
   *
   * When `false` (default), messages are ephemeral and live only in memory
   * for the current session. `loadFromStorage()` and `persistToStorage()`
   * are skipped entirely.
   *
   * When `true`, the existing localStorage persistence behaviour is preserved.
   *
   * @defaultValue false
   */
  persistent?: boolean;

  /**
   * Maximum number of messages to retain in history.
   *
   * @defaultValue 50
   */
  maxMessages?: number;
}

/**
 * Storage key for persisted feedback queue
 */
const STORAGE_KEY = 'fillkit:feedback-queue';

/**
 * Maximum number of messages to keep in history
 */
const MAX_MESSAGES = 50;

/**
 * Time to keep dismissed messages (24 hours in milliseconds)
 */
const DISMISSED_MESSAGE_TTL = 24 * 60 * 60 * 1000;

/**
 * Centralized feedback and notification management system for FillKit.
 *
 * @remarks
 * Manages error messages, warnings, progress indicators, and user notifications.
 * It handles message queuing, optional persistence, deduplication, and real-time
 * updates to subscribers.
 *
 * By default messages are session-only. Pass `{ persistent: true }` to opt in
 * to localStorage persistence with automatic TTL cleanup.
 */
export class FeedbackManager {
  /** In-memory message queue */
  private messages: Map<string, FeedbackMessage> = new Map();

  /** Subscribers for real-time updates */
  private subscribers: Set<FeedbackSubscriber> = new Set();

  /** Counter for generating unique IDs */
  private messageIdCounter = 0;

  /** Storage adapter for persistence */
  private storage: StorageAdapter;

  /** Maximum messages to keep */
  private maxMessages: number;

  /** Whether to persist messages to storage */
  private readonly isPersistent: boolean;

  /**
   * Initializes a new instance of the FeedbackManager.
   *
   * @param storage - The storage adapter used for persisting messages.
   * @param options - Optional configuration. Accepts either a
   *   {@link FeedbackManagerOptions} object or a plain number for backward
   *   compatibility (interpreted as `maxMessages`).
   */
  constructor(
    storage: StorageAdapter,
    options?: FeedbackManagerOptions | number
  ) {
    this.storage = storage;

    // Support legacy numeric second argument (maxMessages)
    if (typeof options === 'number') {
      this.maxMessages = options;
      this.isPersistent = true; // legacy callers expect persistence
    } else {
      this.maxMessages = options?.maxMessages ?? MAX_MESSAGES;
      this.isPersistent = options?.persistent ?? false;
    }

    if (this.isPersistent) {
      this.loadFromStorage();
    }
  }

  /**
   * Displays a new feedback message.
   *
   * @remarks
   * If a duplicate message (same type, scope, and text) already exists and is not dismissed,
   * it updates the timestamp of the existing message instead of creating a new one.
   *
   * @param options - The configuration options for the message.
   * @returns The unique ID of the created or updated message.
   *
   * @example
   * ```typescript
   * const id = feedback.show({
   *   type: 'error',
   *   scope: 'cloud',
   *   message: 'Connection failed',
   *   persistent: true
   * });
   * ```
   */
  show(options: FeedbackOptions): string {
    // Check for duplicate message (same type, scope, message)
    const duplicate = this.findDuplicate(
      options.type,
      options.scope,
      options.message
    );
    if (duplicate) {
      // Update timestamp instead of creating duplicate
      this.update(duplicate.id, { timestamp: Date.now(), dismissed: false });
      return duplicate.id;
    }

    const id = this.generateId();
    const message: FeedbackMessage = {
      ...options,
      id,
      timestamp: Date.now(),
      dismissed: false,
    };

    this.messages.set(id, message);
    this.pruneOldMessages();
    this.maybePersist();
    this.notifySubscribers();

    return id;
  }

  /**
   * Updates an existing feedback message.
   *
   * @remarks
   * Useful for updating progress indicators or modifying message text without creating a new entry.
   *
   * @param id - The ID of the message to update.
   * @param updates - Partial message properties to apply.
   *
   * @example
   * ```typescript
   * feedback.update(id, {
   *   progress: { current: 5, total: 10 }
   * });
   * ```
   */
  update(id: string, updates: Partial<FeedbackMessage>): void {
    const message = this.messages.get(id);
    if (!message) {
      logger.warn(`FeedbackManager: Cannot update non-existent message ${id}`);
      return;
    }

    // Merge updates (but don't allow changing id)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...safeUpdates } = updates;
    Object.assign(message, safeUpdates);

    this.messages.set(id, message);
    this.maybePersist();
    this.notifySubscribers();
  }

  /**
   * Marks a feedback message as dismissed.
   *
   * @remarks
   * Dismissed messages are hidden from the active view but retained in history until pruned.
   *
   * @param id - The ID of the message to dismiss.
   *
   * @example
   * ```typescript
   * feedback.dismiss(messageId);
   * ```
   */
  dismiss(id: string): void {
    const message = this.messages.get(id);
    if (!message) return;

    message.dismissed = true;
    this.messages.set(id, message);
    this.maybePersist();
    this.notifySubscribers();
  }

  /**
   * Completely removes a message from the queue.
   *
   * @param id - The ID of the message to remove.
   */
  remove(id: string): void {
    this.messages.delete(id);
    this.maybePersist();
    this.notifySubscribers();
  }

  /**
   * Clears messages from the queue.
   *
   * @remarks
   * If a scope is provided, only messages matching that scope are removed.
   * Otherwise, all messages are cleared.
   *
   * @param scope - Optional scope to filter messages for removal.
   *
   * @example
   * ```typescript
   * // Clear all cloud-related messages
   * feedback.clear('cloud');
   *
   * // Clear all messages
   * feedback.clear();
   * ```
   */
  clear(scope?: FeedbackScope): void {
    if (scope) {
      // Clear messages matching scope
      for (const [id, message] of this.messages.entries()) {
        if (message.scope === scope) {
          this.messages.delete(id);
        }
      }
    } else {
      // Clear all messages
      this.messages.clear();
    }

    this.maybePersist();
    this.notifySubscribers();
  }

  /**
   * Retrieves messages from the queue based on filter criteria.
   *
   * @param options - Filter options for scope, type, and dismissal status.
   * @returns An array of matching messages, sorted by timestamp (newest first).
   *
   * @example
   * ```typescript
   * // Get all active messages
   * const active = feedback.getMessages({ dismissed: false });
   *
   * // Get error messages
   * const errors = feedback.getMessages({ type: 'error' });
   *
   * // Get cloud scope messages
   * const cloudMessages = feedback.getMessages({ scope: 'cloud' });
   * ```
   */
  getMessages(options?: {
    scope?: FeedbackScope;
    type?: FeedbackType;
    dismissed?: boolean;
  }): FeedbackMessage[] {
    let messages = Array.from(this.messages.values());

    if (options) {
      if (options.scope !== undefined) {
        messages = messages.filter(m => m.scope === options.scope);
      }
      if (options.type !== undefined) {
        messages = messages.filter(m => m.type === options.type);
      }
      if (options.dismissed !== undefined) {
        messages = messages.filter(m => m.dismissed === options.dismissed);
      }
    }

    // Sort by timestamp (newest first)
    return messages.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Counts the number of active (non-dismissed) messages matching the criteria.
   *
   * @param options - Filter options for scope and type.
   * @returns The count of matching active messages.
   *
   * @example
   * ```typescript
   * // Get error count for badge
   * const errorCount = feedback.getActiveCount({ type: 'error' });
   * ```
   */
  getActiveCount(options?: {
    scope?: FeedbackScope;
    type?: FeedbackType;
  }): number {
    return this.getMessages({
      ...options,
      dismissed: false,
    }).length;
  }

  /**
   * Subscribes to real-time updates of the feedback queue.
   *
   * @remarks
   * The callback is invoked immediately with the current state, and subsequently
   * whenever messages are added, updated, dismissed, or removed.
   *
   * @param callback - The function to call with the updated list of messages.
   * @returns A function to unsubscribe from updates.
   *
   * @example
   * ```typescript
   * const unsubscribe = feedback.subscribe((messages) => {
   *   console.log('Messages updated:', messages);
   * });
   *
   * // Later, unsubscribe
   * unsubscribe();
   * ```
   */
  subscribe(callback: FeedbackSubscriber): () => void {
    this.subscribers.add(callback);

    // Immediately call with current state
    callback(this.getMessages({ dismissed: false }));

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Conditionally persists to storage when `isPersistent` is true.
   */
  private maybePersist(): void {
    if (this.isPersistent) {
      this.persistToStorage();
    }
  }

  /**
   * Persists the current message queue to storage.
   *
   * @remarks
   * Strips non-serializable properties (like function handlers) before saving.
   * Handles potential serialization errors gracefully.
   * Only called when `isPersistent` is true.
   */
  private async persistToStorage(): Promise<void> {
    try {
      const messages = Array.from(this.messages.values());

      // Strip non-serializable properties (functions, DOM elements)
      // to prevent "Converting circular structure to JSON" errors
      const serializableMessages = messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        scope: msg.scope,
        message: msg.message,
        timestamp: msg.timestamp,
        dismissed: msg.dismissed,
        persistent: msg.persistent,
        // Keep action label for display, but omit handler (functions don't serialize)
        action: msg.action ? { label: msg.action.label } : undefined,
        // Keep progress metadata (numbers are safe to serialize)
        progress: msg.progress
          ? {
              current: msg.progress.current,
              total: msg.progress.total,
              label: msg.progress.label,
            }
          : undefined,
      }));

      await this.storage.set(STORAGE_KEY, serializableMessages);
    } catch (error) {
      // If serialization still fails, log detailed error and continue
      logger.error('FeedbackManager: Failed to persist to storage', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
      }
    }
  }

  /**
   * Loads persisted messages from storage.
   *
   * @remarks
   * Restores messages to the in-memory queue. Note that action handlers (functions)
   * cannot be restored from storage and will be undefined for loaded messages.
   * Only called when `isPersistent` is true.
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await this.storage.get<FeedbackMessage[]>(STORAGE_KEY);
      if (Array.isArray(stored)) {
        // Restore messages, but re-assign action handlers (functions don't serialize)
        for (const msg of stored) {
          this.messages.set(msg.id, {
            ...msg,
            action: undefined, // Actions don't persist across reloads
          });
        }

        // Prune old dismissed messages on load
        this.pruneOldMessages();
      }
    } catch (error) {
      logger.error('FeedbackManager: Failed to load from storage', error);
    }
  }

  /**
   * Notifies all registered subscribers with the current list of active messages.
   */
  private notifySubscribers(): void {
    const activeMessages = this.getMessages({ dismissed: false });
    for (const subscriber of this.subscribers) {
      try {
        subscriber(activeMessages);
      } catch (error) {
        logger.error('FeedbackManager: Subscriber error', error);
      }
    }
  }

  /**
   * Generates a unique identifier for a new message.
   *
   * @returns A unique string ID.
   */
  private generateId(): string {
    return `feedback-${Date.now()}-${++this.messageIdCounter}`;
  }

  /**
   * Checks for an existing active message with the same type, scope, and content.
   *
   * @param type - The message type.
   * @param scope - The message scope.
   * @param message - The message text.
   * @returns The existing message if found, otherwise `undefined`.
   */
  private findDuplicate(
    type: FeedbackType,
    scope: FeedbackScope,
    message: string
  ): FeedbackMessage | undefined {
    for (const msg of this.messages.values()) {
      if (
        msg.type === type &&
        msg.scope === scope &&
        msg.message === message &&
        !msg.dismissed
      ) {
        return msg;
      }
    }
    return undefined;
  }

  /**
   * Removes old dismissed messages and enforces the maximum queue size.
   *
   * @remarks
   * Dismissed messages older than the TTL are removed. If the queue size exceeds
   * the limit, the oldest messages are removed.
   */
  private pruneOldMessages(): void {
    const now = Date.now();

    // Remove dismissed messages older than TTL
    for (const [id, message] of this.messages.entries()) {
      if (
        message.dismissed &&
        now - message.timestamp > DISMISSED_MESSAGE_TTL
      ) {
        this.messages.delete(id);
      }
    }

    // Enforce max queue size
    if (this.messages.size > this.maxMessages) {
      const sorted = Array.from(this.messages.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      const toRemove = sorted.slice(0, this.messages.size - this.maxMessages);
      for (const message of toRemove) {
        this.messages.delete(message.id);
      }
    }
  }

  /**
   * Retrieves statistical data about the current feedback queue.
   *
   * @returns An object containing counts of total, active, and dismissed messages,
   * as well as breakdowns by type and scope.
   */
  getStats(): {
    total: number;
    active: number;
    dismissed: number;
    byType: Record<FeedbackType, number>;
    byScope: Record<FeedbackScope, number>;
  } {
    const messages = Array.from(this.messages.values());

    const stats = {
      total: messages.length,
      active: messages.filter(m => !m.dismissed).length,
      dismissed: messages.filter(m => m.dismissed).length,
      byType: {
        loading: 0,
        success: 0,
        error: 0,
        warning: 0,
        info: 0,
      } as Record<FeedbackType, number>,
      byScope: {
        global: 0,
        cloud: 0,
        provider: 0,
        scan: 0,
        fill: 0,
        sync: 0,
      } as Record<FeedbackScope, number>,
    };

    for (const message of messages) {
      stats.byType[message.type]++;
      stats.byScope[message.scope]++;
    }

    return stats;
  }

  /**
   * Cleans up resources and clears the message queue.
   *
   * @remarks
   * Should be called when the FeedbackManager is no longer needed to prevent memory leaks.
   */
  destroy(): void {
    this.subscribers.clear();
    this.messages.clear();
  }
}
