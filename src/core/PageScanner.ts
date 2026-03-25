/**
 * PageScanner - Client-side same-origin URL scanner
 *
 * Fetches and parses same-origin URLs to extract page schemas.
 * Uses credentials to access protected routes.
 */

import type { ScanOptions, ScanResult, ScanSummary } from '../types/cloud.js';
import { SchemaBuilder } from './SchemaBuilder.js';
import { FieldDetector } from './FieldDetector.js';
import { FormDetector } from './FormDetector.js';
import { logger } from '@/core/Logger.js';
import { isSafeNavigationUrl } from '../utils/dom-helpers.js';

/** Default maximum number of URLs that can be scanned in a single batch. */
const DEFAULT_MAX_URLS = 20;

/** Default maximum number of concurrent iframe scans. */
const DEFAULT_MAX_CONCURRENT = 3;

/** Default total scan timeout in milliseconds (60 seconds). */
const DEFAULT_TOTAL_TIMEOUT_MS = 60_000;

/**
 * Configuration options for PageScanner resource limits.
 */
export interface PageScannerConfig {
  /**
   * Maximum number of URLs to scan in a single batch.
   * URLs beyond this limit are silently truncated.
   *
   * @defaultValue 20
   */
  maxUrls?: number;

  /**
   * Maximum number of iframes to load concurrently.
   *
   * @defaultValue 3
   */
  maxConcurrent?: number;

  /**
   * Total timeout for the entire scan operation in milliseconds.
   * If exceeded, the scan rejects with a timeout error.
   *
   * @defaultValue 60000
   */
  totalTimeout?: number;
}

/**
 * Scans same-origin URLs to extract page schemas.
 *
 * @remarks
 * Fetches and parses same-origin URLs using hidden iframes to extract form schemas.
 * Supports authentication by using credentials for protected routes. Handles both
 * static HTML and single-page applications (SPAs) by waiting for forms to render.
 *
 * **Resource Limits:**
 * - `maxUrls` (default: 20) — truncates URL arrays beyond this limit
 * - `maxConcurrent` (default: 3) — limits parallel iframe scans
 * - `totalTimeout` (default: 60s) — rejects with timeout error if scanning takes too long
 * - Iframes use `sandbox="allow-same-origin"` to prevent script execution
 *
 * @example
 * ```ts
 * const scanner = new PageScanner({ maxUrls: 10, totalTimeout: 30_000 });
 * const summary = await scanner.scanUrls(
 *   ['/login', '/signup', '/profile'],
 *   {
 *     onProgress: (current, total) => console.log(`${current}/${total}`),
 *     maxConcurrent: 3
 *   }
 * );
 * console.log(`Scanned ${summary.succeeded} pages, found ${summary.totalForms} forms`);
 * ```
 */
export class PageScanner {
  private schemaBuilder: SchemaBuilder;
  private fieldDetector: FieldDetector;
  private formDetector: FormDetector;
  private maxUrls: number;
  private maxConcurrent: number;
  private totalTimeout: number;

  /**
   * Creates a new PageScanner instance.
   *
   * @param config - Optional resource limit configuration.
   */
  constructor(config: PageScannerConfig = {}) {
    this.schemaBuilder = new SchemaBuilder();
    this.fieldDetector = new FieldDetector();
    this.formDetector = new FormDetector();
    this.maxUrls = config.maxUrls ?? DEFAULT_MAX_URLS;
    this.maxConcurrent = config.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
    this.totalTimeout = config.totalTimeout ?? DEFAULT_TOTAL_TIMEOUT_MS;
  }

  /**
   * Scans multiple URLs in batch.
   *
   * @remarks
   * Processes URLs in batches to respect the `maxConcurrent` limit. For each URL,
   * loads the page in a hidden iframe, waits for forms to render, and extracts
   * the page schema with semantic field type detection.
   *
   * URLs beyond `maxUrls` are silently truncated. The entire operation is wrapped
   * in a `totalTimeout` guard that rejects with an error if exceeded.
   *
   * @param urls - Array of same-origin URLs to scan.
   * @param options - Scanning options including progress callback, timeout, and concurrency.
   * @returns Summary of scan results including success/failure counts and schemas.
   *
   * @throws Error if total scan timeout is exceeded.
   *
   * @example
   * ```ts
   * const summary = await scanner.scanUrls(
   *   ['/page1', '/page2'],
   *   {
   *     onProgress: (current, total) => console.log(`Progress: ${current}/${total}`),
   *     timeout: 30000,
   *     continueOnError: true,
   *     maxConcurrent: 3
   *   }
   * );
   * ```
   */
  async scanUrls(
    urls: string[],
    options: ScanOptions = {}
  ): Promise<ScanSummary> {
    // Truncate URLs beyond the configured limit
    const truncatedUrls =
      urls.length > this.maxUrls ? urls.slice(0, this.maxUrls) : urls;

    if (truncatedUrls.length < urls.length) {
      logger.warn(
        `PageScanner: Truncated URL list from ${urls.length} to ${this.maxUrls} (maxUrls limit)`
      );
    }

    const {
      onProgress,
      timeout = 30000,
      continueOnError = true,
      maxConcurrent = this.maxConcurrent,
    } = options;

    // Wrap the entire scan in a total timeout
    return new Promise<ScanSummary>((resolve, reject) => {
      let settled = false;

      const totalTimeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              `PageScanner: Total scan timeout exceeded (${this.totalTimeout}ms)`
            )
          );
        }
      }, this.totalTimeout);

      this.executeScan(truncatedUrls, {
        onProgress,
        timeout,
        continueOnError,
        maxConcurrent,
      })
        .then(summary => {
          if (!settled) {
            settled = true;
            clearTimeout(totalTimeoutId);
            resolve(summary);
          }
        })
        .catch(error => {
          if (!settled) {
            settled = true;
            clearTimeout(totalTimeoutId);
            reject(error);
          }
        });
    });
  }

  /**
   * Executes the scan across all batched URLs.
   *
   * @param urls - The (possibly truncated) URL list.
   * @param options - Scan options forwarded from `scanUrls`.
   * @returns The aggregated scan summary.
   */
  private async executeScan(
    urls: string[],
    options: Required<
      Pick<ScanOptions, 'timeout' | 'continueOnError' | 'maxConcurrent'>
    > &
      Pick<ScanOptions, 'onProgress'>
  ): Promise<ScanSummary> {
    const { onProgress, timeout, continueOnError, maxConcurrent } = options;

    const results: ScanResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let totalFields = 0;
    let totalForms = 0;

    // Process URLs in batches to respect maxConcurrent
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(url => this.scanUrl(url, timeout));

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Process results
      batchResults.forEach(result => {
        results.push(result);

        if (result.success) {
          succeeded++;
          if (result.schema) {
            totalForms += result.schema.forms.length;
            result.schema.forms.forEach(form => {
              totalFields += form.fields.length;
            });
          }
        } else {
          failed++;
          if (!continueOnError) {
            throw new Error(`Scan failed for ${result.url}: ${result.error}`);
          }
        }
      });

      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, urls.length);
      }
    }

    return {
      scanned: urls.length,
      succeeded,
      failed,
      totalFields,
      totalForms,
      results,
    };
  }

  /**
   * Scans a single URL.
   *
   * @remarks
   * Validates same-origin policy, loads the URL in a hidden iframe, extracts the
   * page schema, and enhances it with semantic field type detection using FieldDetector.
   *
   * @param url - URL to scan.
   * @param timeout - Timeout in milliseconds.
   * @returns Scan result containing success status, schema, duration, and any errors.
   */
  private async scanUrl(url: string, timeout: number): Promise<ScanResult> {
    const startTime = Date.now();

    try {
      // Validate same-origin
      this.validateSameOrigin(url);

      // Load URL in iframe to support SPAs (React, Vue, etc.)
      const doc = await this.loadUrlInIframe(url, timeout);

      // Extract schema with basic structure
      const schema = this.schemaBuilder.buildPageSchema(doc, url);

      // Enhance schema with proper semantic type detection
      for (const form of schema.forms) {
        const formElement = this.findFormElement(doc, form.formId);
        if (!formElement) continue;

        // Find all field elements
        const fieldElements = this.formDetector.findFields(formElement);

        for (const field of form.fields) {
          // Find the corresponding DOM element
          const fieldElement = fieldElements.find(el => {
            const name = el.getAttribute('name') || el.id || '';
            return name === field.name;
          });

          if (fieldElement) {
            // Detect semantic type using FieldDetector
            const detection = this.fieldDetector.detect(fieldElement);
            field.semanticType = detection.semanticType;
            field.confidence = detection.confidence;
          }
        }
      }

      const duration = Date.now() - startTime;

      return {
        url,
        success: true,
        schema,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  /**
   * Loads a URL in a hidden, sandboxed iframe and waits for content to render.
   *
   * @remarks
   * Creates a hidden iframe with `sandbox="allow-same-origin"` to prevent script
   * execution in scanned pages, loads the URL, and waits for forms to appear in the DOM.
   * Uses a polling interval to detect when forms are rendered, which is essential for
   * SPAs where forms may not be immediately available. Falls back to a timeout if
   * forms never appear.
   *
   * All timers (`setTimeout` and `setInterval`) are cleaned up in every exit path
   * (success, error, and timeout) to prevent resource leaks.
   *
   * @param url - URL to load.
   * @param timeout - Maximum time to wait in milliseconds.
   * @returns Document from the iframe.
   * @throws Error if the URL fails to load or times out.
   */
  private async loadUrlInIframe(
    url: string,
    timeout: number
  ): Promise<Document> {
    return new Promise((resolve, reject) => {
      // Create hidden iframe with sandbox for security
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('sandbox', 'allow-same-origin');

      let observer: MutationObserver | null = null;
      let checkInterval: ReturnType<typeof setInterval> | null = null;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout loading ${url}`));
      }, timeout);

      // Set up load handler
      const onLoad = () => {
        try {
          if (!iframe.contentDocument) {
            cleanup();
            reject(new Error(`Cannot access iframe document for ${url}`));
            return;
          }

          const iframeDoc = iframe.contentDocument;

          // Check if forms already exist (fast path)
          const existingForms = iframeDoc.querySelectorAll('form');
          if (existingForms.length > 0) {
            // Forms already rendered, resolve immediately
            cleanup();
            resolve(iframeDoc);
            return;
          }

          // No forms yet - poll until they appear or give up
          let checkAttempts = 0;
          const maxAttempts = 20; // Check for 2 seconds (20 * 100ms)

          checkInterval = setInterval(() => {
            checkAttempts++;
            const forms = iframeDoc.querySelectorAll('form');

            if (forms.length > 0 || checkAttempts >= maxAttempts) {
              // Either found forms or gave up
              cleanup();
              resolve(iframeDoc);
            }
          }, 100); // Check every 100ms
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      // Set up error handler
      const onError = () => {
        cleanup();
        reject(new Error(`Failed to load ${url}`));
      };

      // Cleanup function — clears ALL timers and removes DOM references
      const cleanup = () => {
        clearTimeout(timeoutId);
        if (checkInterval !== null) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      // Attach event listeners
      iframe.addEventListener('load', onLoad);
      iframe.addEventListener('error', onError);

      // Add to DOM and load URL
      document.body.appendChild(iframe);
      iframe.src = url;
    });
  }

  /**
   * Finds a form element in a document by ID or name.
   *
   * @remarks
   * Tries multiple strategies to locate the form:
   * 1. By ID attribute
   * 2. By name attribute
   * 3. By index if formId matches pattern "form-N"
   *
   * @param doc - Parsed HTML document.
   * @param formId - Form ID, name, or index-based identifier.
   * @returns Form element, or `null` if not found.
   */
  private findFormElement(
    doc: Document,
    formId: string
  ): HTMLFormElement | null {
    // Try by ID first
    const byId = doc.getElementById(formId);
    if (byId instanceof HTMLFormElement) {
      return byId;
    }

    // Try by name attribute
    const byName = doc.querySelector(`form[name="${formId}"]`);
    if (byName instanceof HTMLFormElement) {
      return byName;
    }

    // Try to extract index from formId (e.g., "form-0" → index 0)
    const match = formId.match(/^form-(\d+)$/);
    if (match) {
      const index = parseInt(match[1], 10);
      const forms = doc.querySelectorAll('form');
      if (forms[index] instanceof HTMLFormElement) {
        return forms[index] as HTMLFormElement;
      }
    }

    return null;
  }

  /**
   * Validates that a URL is same-origin.
   *
   * @remarks
   * Ensures the target URL has the same origin as the current page to comply with
   * browser security policies. Cross-origin scanning is not allowed.
   *
   * @param url - URL to validate.
   * @throws Error if the URL is cross-origin or invalid.
   */
  private validateSameOrigin(url: string): void {
    if (!isSafeNavigationUrl(url)) {
      throw new Error('URL uses a disallowed scheme');
    }

    try {
      const currentOrigin = window.location.origin;
      const targetUrl = new URL(url, currentOrigin);
      const targetOrigin = targetUrl.origin;

      if (currentOrigin !== targetOrigin) {
        throw new Error('Cross-origin scanning not allowed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid URL');
    }
  }
}
