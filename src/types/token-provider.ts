/**
 * Pluggable token storage interface for FillKit Cloud authentication.
 *
 * @remarks
 * Allows consumers to provide custom token storage backends (e.g., HTTP-only
 * cookies, secure server-side stores, or encrypted storage) instead of
 * relying on the default localStorage-based persistence.
 *
 * When a `TokenProvider` is set, the SDK will:
 * - Call {@link TokenProvider.getToken} before each authenticated request
 * - Strip the `token` field from the persisted cloud config atom
 * - Delegate token lifecycle entirely to the provider
 *
 * @example
 * ```ts
 * const provider: TokenProvider = {
 *   async getToken() {
 *     return sessionStorage.getItem('fk_token');
 *   },
 *   async setToken(token) {
 *     sessionStorage.setItem('fk_token', token);
 *   },
 *   async clearToken() {
 *     sessionStorage.removeItem('fk_token');
 *   },
 * };
 *
 * const fk = await FillKit.init({ tokenProvider: provider });
 * ```
 */
export interface TokenProvider {
  /** Retrieves the current authentication token, or `null` if none is stored. */
  getToken(): Promise<string | null>;

  /** Persists a new authentication token. */
  setToken(token: string): Promise<void>;

  /** Removes the stored authentication token. */
  clearToken(): Promise<void>;
}
