/**
 * Centralized logger for the FillKit SDK.
 *
 * @remarks
 * Provides level-filtered logging to prevent noisy output in production.
 * Default level is `'warn'` so only warnings and errors are shown.
 * Set to `'silent'` to suppress all output, or `'debug'` for verbose tracing.
 */

/** Supported log levels ordered from most to least restrictive. */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'warn') {
    this.level = level;
  }

  /** Updates the active log level. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** Returns the current log level. */
  getLevel(): LogLevel {
    return this.level;
  }

  /** Logs an error message (shown when level >= `'error'`). */
  error(message: string, ...args: unknown[]): void {
    if (LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY.error) {
      // eslint-disable-next-line no-console
      console.error(message, ...args);
    }
  }

  /** Logs a warning message (shown when level >= `'warn'`). */
  warn(message: string, ...args: unknown[]): void {
    if (LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY.warn) {
      // eslint-disable-next-line no-console
      console.warn(message, ...args);
    }
  }

  /** Logs an informational message (shown when level >= `'info'`). */
  info(message: string, ...args: unknown[]): void {
    if (LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY.info) {
      // eslint-disable-next-line no-console
      console.info(message, ...args);
    }
  }

  /** Logs a debug message (shown when level >= `'debug'`). */
  debug(message: string, ...args: unknown[]): void {
    if (LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY.debug) {
      // eslint-disable-next-line no-console
      console.debug(message, ...args);
    }
  }
}

/** Singleton logger instance used throughout the SDK. */
export const logger = new Logger();
