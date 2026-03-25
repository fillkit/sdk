/**
 * Ephemeral widget state management (non-persistent).
 *
 * @remarks
 * Manages runtime-only UI state for widget visibility and sheet open/close states.
 * Unlike other atoms, this state is NOT persisted to localStorage and resets to
 * defaults on every page reload. Use this for temporary UI state that shouldn't
 * survive page refreshes.
 *
 * **Key Features:**
 * - Main widget visibility control
 * - Options sheet open/close state
 * - Help sheet open/close state
 * - First-time help tracking
 *
 * **Storage:**
 * - Location: Memory only (not persisted)
 * - Resets: On every page reload
 *
 * @example
 * Basic widget state management:
 * ```ts
 * import { widgetState } from './atoms/widget-state';
 *
 * // Open options sheet
 * widgetState.set({
 *   ...widgetState.get(),
 *   optionsSheetOpen: true
 * });
 * ```
 */

import { atom } from 'nanostores';

/**
 * Ephemeral widget state structure.
 *
 * @remarks
 * Stores temporary UI state that resets on page reload. This is intentionally
 * not persisted to avoid confusing users with sheets that remain open across
 * page loads.
 */
export interface WidgetState {
  /**
   * Whether the options sheet is open.
   *
   * @remarks
   * The options sheet contains SDK configuration settings.
   * Only one sheet (options or help) should be open at a time.
   */
  optionsSheetOpen: boolean;

  /**
   * Whether the help sheet is open.
   *
   * @remarks
   * The help sheet displays keyboard shortcuts and usage instructions.
   * Only one sheet (options or help) should be open at a time.
   */
  helpSheetOpen: boolean;

  /**
   * Whether the user has seen the help sheet.
   *
   * @remarks
   * Used to show first-time help automatically. Once set to true,
   * help won't be shown automatically again in the same session.
   */
  hasSeenHelp: boolean;
}

/**
 * Default widget state (all closed, visible)
 */
export const defaultWidgetState: WidgetState = {
  optionsSheetOpen: false,
  helpSheetOpen: false,
  hasSeenHelp: false,
};

/**
 * Non-persistent atom for ephemeral widget state.
 *
 * @remarks
 * This atom stores runtime-only UI state that resets on page reload.
 * Unlike persistent atoms, changes are NOT saved to localStorage.
 * Use this for temporary UI state that shouldn't survive page refreshes.
 *
 * **State Management:**
 * - Read: `widgetState.get()`
 * - Write: `widgetState.set(newState)`
 * - Subscribe: `widgetState.subscribe(callback)`
 *
 * **Persistence:**
 * - None - resets to defaults on page reload
 *
 * @example
 * Sheet management:
 * ```ts
 * import { widgetState } from './atoms/widget-state';
 *
 * // Open options sheet
 * widgetState.set({
 *   ...widgetState.get(),
 *   optionsSheetOpen: true,
 *   helpSheetOpen: false // Close help if open
 * });
 *
 * // Toggle help sheet
 * const current = widgetState.get();
 * widgetState.set({
 *   ...current,
 *   helpSheetOpen: !current.helpSheetOpen,
 *   optionsSheetOpen: false // Close options if open
 * });
 * ```
 *
 * @example
 * First-time help:
 * ```ts
 * import { widgetState } from './atoms/widget-state';
 *
 * // Check if help should be shown
 * const state = widgetState.get();
 * if (!state.hasSeenHelp) {
 *   widgetState.set({
 *     ...state,
 *     helpSheetOpen: true,
 *     hasSeenHelp: true
 *   });
 * }
 * ```
 *
 * @example
 * Reactive UI updates:
 * ```ts
 * import { widgetState } from './atoms/widget-state';
 *
 * // Subscribe to widget state changes
 * const unsubscribe = widgetState.subscribe((state) => {
 *   if (state.optionsSheetOpen) {
 *     console.log('Options sheet opened');
 *     renderOptionsSheet();
 *   }
 *
 *   if (state.helpSheetOpen) {
 *     console.log('Help sheet opened');
 *     renderHelpSheet();
 *   }
 *
 * });
 * ```
 */
export const widgetState = atom<WidgetState>(defaultWidgetState);
