/**
 * Handles all HTTP communication with the FillKit Cloud API.
 *
 * @remarks
 * This client provides a clean interface for making API requests with built-in
 * authentication, error handling, and retry logic. It abstracts away the low-level
 * `fetch` details and standardizes response handling.
 *
 * Supports an optional {@link TokenProvider} for async token retrieval
 * (e.g., from HTTP-only cookies, encrypted storage, or server-side stores).
 */

import { NetworkError, ProviderError } from '../types/index.js';
import type { TokenProvider } from '../types/token-provider.js';
import { isSafeUrl } from '../utils/dom-helpers.js';

/**
 * Configuration options for a single API request.
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * A standardized wrapper for API responses.
 *
 * @typeParam T - The expected type of the response data.
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Configuration parameters for initializing the CloudApiClient.
 */
export interface CloudApiClientConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  /**
   * Optional token provider for async token retrieval.
   *
   * @remarks
   * When set, the client calls `getToken()` before each request instead of
   * using the static `token` string. This allows integration with secure
   * storage backends that require async access.
   */
  tokenProvider?: TokenProvider;
}

/**
 * The main client class for interacting with the FillKit Cloud API.
 */
export class CloudApiClient {
  private config: Required<Omit<CloudApiClientConfig, 'tokenProvider'>> & {
    tokenProvider: TokenProvider | null;
  };

  /**
   * Initializes a new instance of the CloudApiClient.
   *
   * @param config - The configuration object containing the base URL and optional settings.
   */
  constructor(config: CloudApiClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      token: config.token || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      tokenProvider: config.tokenProvider ?? null,
    };
  }

  /**
   * Updates the authentication token used for requests.
   *
   * @param token - The new bearer token.
   */
  setToken(token: string): void {
    this.config.token = token;
  }

  /**
   * Retrieves the current static authentication token.
   *
   * @remarks
   * If a {@link TokenProvider} is set, prefer using {@link resolveToken} instead.
   *
   * @returns The current token string.
   */
  getToken(): string {
    return this.config.token;
  }

  /**
   * Sets or clears the token provider for async token retrieval.
   *
   * @param provider - The provider to use, or `null` to clear.
   */
  setTokenProvider(provider: TokenProvider | null): void {
    this.config.tokenProvider = provider;
  }

  /**
   * Updates the base URL for API requests.
   *
   * @param baseUrl - The new base URL.
   */
  setBaseUrl(baseUrl: string): void {
    if (!isSafeUrl(baseUrl)) {
      throw new ProviderError(
        'Invalid base URL: must be an absolute HTTP or HTTPS URL'
      );
    }
    this.config.baseUrl = baseUrl;
  }

  /**
   * Performs a GET request to the specified path.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path (relative to base URL).
   * @param options - Additional request options.
   * @returns A promise resolving to the API response.
   */
  async get<T = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * Performs a POST request to the specified path.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path.
   * @param body - The request payload.
   * @param options - Additional request options.
   * @returns A promise resolving to the API response.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  /**
   * Performs a PUT request to the specified path.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path.
   * @param body - The request payload.
   * @param options - Additional request options.
   * @returns A promise resolving to the API response.
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  /**
   * Performs a PATCH request to the specified path.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path.
   * @param body - The request payload.
   * @param options - Additional request options.
   * @returns A promise resolving to the API response.
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  /**
   * Performs a DELETE request to the specified path.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path.
   * @param options - Additional request options.
   * @returns A promise resolving to the API response.
   */
  async delete<T = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Resolves the current authentication token.
   *
   * @remarks
   * If a {@link TokenProvider} is set, delegates to `provider.getToken()`.
   * Otherwise, returns the static `config.token`.
   *
   * @returns The token string, or an empty string if none is available.
   */
  private async resolveToken(): Promise<string> {
    if (this.config.tokenProvider) {
      const token = await this.config.tokenProvider.getToken();
      return token ?? '';
    }
    return this.config.token;
  }

  /**
   * Executes a generic HTTP request with configured retry logic and error handling.
   *
   * @remarks
   * Handles request headers, authorization, timeouts, and exponential backoff for retries.
   * When a {@link TokenProvider} is set, the token is resolved asynchronously before
   * each request attempt.
   *
   * @typeParam T - The expected response data type.
   * @param path - The API endpoint path.
   * @param options - Full request options including method, body, etc.
   * @returns A promise resolving to the API response.
   * @throws {@link NetworkError} if the request fails after all retries.
   * @throws {@link ProviderError} for specific API error responses.
   */
  private async request<T = unknown>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.config.timeout,
      retries = this.config.retries,
      retryDelay = this.config.retryDelay,
    } = options;

    const url = `${this.config.baseUrl}${path}`;

    // Attempt request with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Resolve token (may be async via provider)
        const token = await this.resolveToken();

        // Build headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        // Add authorization header if token is available
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Build request options
        const requestInit: RequestInit = {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestInit,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for HTTP errors
        if (!response.ok) {
          await this.handleHttpError(response);
        }

        // Parse response
        const data = (await response.json()) as T;

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (
          error instanceof ProviderError ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          throw error;
        }

        // Retry if we have attempts left
        if (attempt < retries) {
          await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }

        // Out of retries
        break;
      }
    }

    // All retries failed
    throw new NetworkError(
      `Request failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Processes HTTP error responses and throws standardized exceptions.
   *
   * @param response - The failed Response object.
   * @throws {@link ProviderError} for 4xx client errors.
   * @throws {@link NetworkError} for 5xx server errors.
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    // Try to get error details from response body
    try {
      const errorBody = await response.json();
      if (errorBody.message) {
        errorMessage = errorBody.message;
      } else if (errorBody.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    // Map HTTP status codes to specific errors
    switch (response.status) {
      case 400:
        throw new ProviderError(`Bad request: ${errorMessage}`);
      case 401:
        throw new ProviderError(
          'Authentication failed: Invalid or expired token'
        );
      case 403:
        throw new ProviderError(
          'Permission denied: Insufficient access rights'
        );
      case 404:
        throw new ProviderError('Resource not found');
      case 422:
        throw new ProviderError(`Validation error: ${errorMessage}`);
      case 429:
        throw new ProviderError('Rate limit exceeded. Please try again later');
      case 500:
      case 502:
      case 503:
      case 504:
        throw new NetworkError(`Server error: ${errorMessage}`);
      default:
        throw new NetworkError(errorMessage);
    }
  }

  /**
   * Creates a promise that resolves after a specified delay.
   *
   * @param ms - The delay duration in milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks the health status of the API.
   *
   * @returns `true` if the API is reachable and healthy, `false` otherwise.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
