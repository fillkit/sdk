/**
 * UI configuration state management for widget display and positioning.
 *
 * @remarks
 * Manages all UI-related configuration including widget visibility and positioning settings.
 * All configuration is persisted to localStorage and synchronized across browser tabs.
 *
 * **Key Features:**
 * - Widget enable/disable control
 * - Flexible positioning system
 * - Custom position support (drag-and-drop)
 *
 * **Storage:**
 * - Key: `fillkit:ui-config`
 * - Location: localStorage
 * - Format: JSON
 *
 * @example
 * Basic UI configuration:
 * ```ts
 * import { uiConfig } from './atoms/ui-config';
 *
 * // Position widget at top-right
 * uiConfig.set({
 *   ...uiConfig.get(),
 *   position: { placement: 'top.right' }
 * });
 * ```
 */

import { persistentAtom } from '@nanostores/persistent';
import type {
  UiPlacement,
  UiVisibilityConfig,
  ProviderModeVisibility,
  CloudConfigVisibility,
  BehaviorVisibility,
} from '../../types/index.js';
import { safeJsonParse } from '../../utils/sanitize.js';

/**
 * Widget position configuration.
 *
 * @remarks
 * Defines where the widget appears on the page. Supports both predefined
 * placements and custom positions from drag-and-drop.
 */
export interface WidgetPosition {
  /**
   * Predefined placement location.
   *
   * @remarks
   * Format: `{vertical}.{horizontal}` (e.g., 'bottom.center', 'top.right').
   * Used as the default position before any custom positioning.
   */
  placement: UiPlacement;

  /**
   * Custom position coordinates.
   *
   * @remarks
   * Set when user drags the widget to a custom location.
   * Overrides the placement value when present.
   */
  custom?: {
    /** Horizontal position in pixels from left edge */
    x: number;
    /** Vertical position in pixels from top edge */
    y: number;
  };
}

/**
 * Resolved visibility — sections are always objects or false (never plain booleans).
 * The resolver normalizes user input (`boolean | object`) into this form.
 */
export interface ResolvedUiVisibility {
  optionsSheet: boolean;
  providerMode: false | Required<ProviderModeVisibility>;
  cloudConfig: false | Required<CloudConfigVisibility>;
  language: boolean;
  behavior: false | Required<BehaviorVisibility>;
}

/** Default resolved visibility — cloud hidden until SaaS launch */
export const defaultVisibility: ResolvedUiVisibility = {
  optionsSheet: true,
  providerMode: { provider: false, mode: true },
  cloudConfig: false,
  language: true,
  behavior: {
    refill: true,
    watchMode: true,
    includeOutsideForms: true,
    emailDomain: true,
    includeSelectors: true,
    excludeSelectors: true,
    overrides: true,
  },
};

/**
 * Normalizes a section value (`boolean | object | undefined`) into the
 * resolved form (`false | Required<FieldVisibility>`).
 */
function resolveSection<T>(
  input: boolean | Partial<T> | undefined,
  defaults: Required<T>
): false | Required<T> {
  if (input === undefined || input === true) return { ...defaults };
  if (input === false) return false;
  return { ...defaults, ...input } as Required<T>;
}

/**
 * Applies logical dependency constraints to the resolved visibility.
 * Re-runs on every resolve call to enforce invariants.
 */
export function enforceVisibilityConstraints(
  vis: ResolvedUiVisibility,
  currentProvider?: 'local' | 'cloud'
): ResolvedUiVisibility {
  const result = { ...vis };

  const providerSelectorHidden =
    result.providerMode === false ||
    (typeof result.providerMode === 'object' && !result.providerMode.provider);

  // Rule: If provider selector hidden + cloud active → cloudConfig must be
  // visible with apiKey, language must be hidden
  if (providerSelectorHidden && currentProvider === 'cloud') {
    if (result.cloudConfig === false) {
      result.cloudConfig = {
        ...defaultVisibility.cloudConfig,
      } as Required<CloudConfigVisibility>;
    } else if (
      typeof result.cloudConfig === 'object' &&
      !result.cloudConfig.apiKey
    ) {
      result.cloudConfig = { ...result.cloudConfig, apiKey: true };
    }
    result.language = false;
  }

  // Rule: Cloud active → apiKey must be visible
  if (currentProvider === 'cloud' && typeof result.cloudConfig === 'object') {
    if (!result.cloudConfig.apiKey) {
      result.cloudConfig = { ...result.cloudConfig, apiKey: true };
    }
  }

  // Rule: All fields hidden → collapse section to false
  if (
    typeof result.providerMode === 'object' &&
    !result.providerMode.provider &&
    !result.providerMode.mode
  ) {
    result.providerMode = false;
  }
  if (
    typeof result.behavior === 'object' &&
    !result.behavior.refill &&
    !result.behavior.watchMode &&
    !result.behavior.includeOutsideForms &&
    !result.behavior.emailDomain &&
    !result.behavior.includeSelectors &&
    !result.behavior.excludeSelectors &&
    !result.behavior.overrides
  ) {
    result.behavior = false;
  }
  if (
    typeof result.cloudConfig === 'object' &&
    !result.cloudConfig.apiKey &&
    !result.cloudConfig.projectSelector &&
    !result.cloudConfig.datasetStatus &&
    !result.cloudConfig.actions
  ) {
    result.cloudConfig = false;
  }

  return result;
}

/**
 * Resolves user-facing `UiVisibilityConfig` into `ResolvedUiVisibility`.
 */
export function resolveVisibility(
  input?: UiVisibilityConfig,
  currentProvider?: 'local' | 'cloud'
): ResolvedUiVisibility {
  if (!input) return { ...defaultVisibility };

  const resolved: ResolvedUiVisibility = {
    optionsSheet: input.optionsSheet ?? true,
    providerMode: resolveSection(
      input.providerMode,
      defaultVisibility.providerMode as Required<ProviderModeVisibility>
    ),
    cloudConfig: resolveSection(
      input.cloudConfig,
      defaultVisibility.cloudConfig as Required<CloudConfigVisibility>
    ),
    language: input.language ?? true,
    behavior: resolveSection(
      input.behavior,
      defaultVisibility.behavior as Required<BehaviorVisibility>
    ),
  };

  return enforceVisibilityConstraints(resolved, currentProvider);
}

/**
 * Converts resolved visibility back to user-facing form for merging.
 */
export function unresolveVisibility(
  resolved: ResolvedUiVisibility
): UiVisibilityConfig {
  return {
    optionsSheet: resolved.optionsSheet,
    providerMode:
      resolved.providerMode === false ? false : { ...resolved.providerMode },
    cloudConfig:
      resolved.cloudConfig === false ? false : { ...resolved.cloudConfig },
    language: resolved.language,
    behavior: resolved.behavior === false ? false : { ...resolved.behavior },
  };
}

/**
 * UI configuration state structure.
 *
 * @remarks
 * Stores all UI-related settings including widget visibility and position
 */
export interface UiConfigState {
  /**
   * Whether UI widgets are enabled.
   *
   * @remarks
   * When false, all UI widgets are hidden and keyboard shortcuts are disabled.
   */
  enabled: boolean;

  /**
   * Widget position configuration.
   *
   * @remarks
   * Controls where the main widget appears on the page.
   */
  position: WidgetPosition;

  /**
   * OptionsSheet visibility configuration.
   *
   * @remarks
   * Controls which sections and fields are visible in the OptionsSheet.
   */
  visibility: ResolvedUiVisibility;

  /**
   * Fill mode for the UI.
   *
   * @remarks
   * - `'widget'` (default): Full toolbar widget with action buttons.
   * - `'inline'`: Per-field inline fill icons that appear when focusing form fields,
   *   similar to password manager autofill icons.
   *
   * Toggle via `Alt+I` shortcut or `updateOptions({ ui: { fillMode: 'inline' } })`.
   */
  fillMode: 'widget' | 'inline';

  /**
   * Whether the main widget toolbar is visible (vs the minimized FAB).
   *
   * @remarks
   * When `true`, the full toolbar widget is shown. When `false` and
   * `enabled` is `true`, the compact FAB button is shown instead.
   * Persisted to localStorage so the toggle survives page refreshes.
   * Toggled via `Alt+H` keyboard shortcut or `UiInjector.toggleMainWidgetFab()`.
   */
  mainWidgetVisible: boolean;
}

/**
 * Default UI config
 */
export const defaultUiConfig: UiConfigState = {
  enabled: true,
  position: {
    placement: 'bottom.center',
  },
  visibility: { ...defaultVisibility },
  fillMode: 'widget',
  mainWidgetVisible: true,
};

/**
 * Persistent atom for UI configuration state.
 *
 * @remarks
 * This atom automatically persists to localStorage and restores on page load.
 * Changes are synchronized across all browser tabs. Use this as the single
 * source of truth for UI configuration.
 *
 * **Persistence:**
 * - Storage key: `fillkit:ui-config`
 * - Encoding: JSON.stringify
 * - Decoding: JSON.parse
 *
 * **State Management:**
 * - Read: `uiConfig.get()`
 * - Write: `uiConfig.set(newState)`
 * - Subscribe: `uiConfig.subscribe(callback)`
 *
 * @example
 * Widget visibility:
 * ```ts
 * import { uiConfig } from './atoms/ui-config';
 *
 * // Show UI
 * uiConfig.set({ ...uiConfig.get(), enabled: true });
 *
 * // Hide UI
 * uiConfig.set({ ...uiConfig.get(), enabled: false });
 * ```
 */
export const uiConfig = persistentAtom<UiConfigState>(
  'fillkit:ui-config',
  defaultUiConfig,
  {
    encode: JSON.stringify,
    decode: (raw: string): UiConfigState => {
      const parsed = safeJsonParse(
        raw,
        defaultUiConfig
      ) as Partial<UiConfigState>;
      // Merge with defaults so persisted state missing `visibility`/`fillMode` still works
      return {
        ...defaultUiConfig,
        ...parsed,
        visibility: parsed.visibility
          ? { ...defaultVisibility, ...parsed.visibility }
          : { ...defaultVisibility },
        fillMode: parsed.fillMode ?? 'widget',
        mainWidgetVisible: parsed.mainWidgetVisible ?? true,
      };
    },
  }
);
