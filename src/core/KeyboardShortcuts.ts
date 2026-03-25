/**
 * Manages keyboard shortcuts for FillKit operations.
 *
 * @remarks
 * Provides customizable keyboard shortcuts with modifier key support (Ctrl, Alt, Shift, Meta).
 * Includes default shortcuts for common operations and allows custom shortcut registration.
 * Automatically prevents conflicts with browser shortcuts by using hybrid approach (Ctrl where
 * safe, Alt for potential conflicts).
 */

import { logger } from '@/core/Logger.js';

/**
 * Configuration for a single keyboard shortcut.
 */
export interface ShortcutConfig {
  /** The key to press (e.g., 'k', 'f', ','). */
  key: string;
  /** Whether Ctrl key must be pressed. */
  ctrl?: boolean;
  /** Whether Alt key must be pressed. */
  alt?: boolean;
  /** Whether Shift key must be pressed. */
  shift?: boolean;
  /** Whether Meta key must be pressed (Command on Mac, Windows key on Windows). */
  meta?: boolean;
  /** Human-readable description of what the shortcut does. */
  description: string;
  /** The action to execute when the shortcut is triggered. */
  action: () => void | Promise<void>;
  /**
   * If `true`, this shortcut fires even when focus is inside form fields
   * (input, textarea, select, contenteditable). Use for UI-level toggles
   * (e.g., show/hide widget) that are not fill actions.
   */
  allowInFormFields?: boolean;
}

/**
 * Options for initializing keyboard shortcuts.
 */
export interface KeyboardShortcutsOptions {
  /** Whether shortcuts are enabled. Defaults to `true`. */
  enabled?: boolean;
  /** Custom shortcut configurations to override defaults. */
  shortcuts?: Partial<KeyboardShortcutsConfig>;
}

/**
 * Configuration for all default keyboard shortcuts.
 *
 * @remarks
 * Each property represents a shortcut action and contains the key combination
 * and description. The `action` callback is added when registering the shortcut.
 */
export interface KeyboardShortcutsConfig {
  /** Fill all forms on the page. */
  fillAll: Omit<ShortcutConfig, 'action'>;
  /** Fill the current focused form. */
  fillCurrent: Omit<ShortcutConfig, 'action'>;
  /** Clear all filled data. */
  clearAll: Omit<ShortcutConfig, 'action'>;
  /** Clear the current form. */
  clearCurrent: Omit<ShortcutConfig, 'action'>;
  /** Toggle between valid/invalid mode. */
  toggleMode: Omit<ShortcutConfig, 'action'>;
  /** Show/hide the widget. */
  toggleWidget: Omit<ShortcutConfig, 'action'>;
  /** Open settings sheet. */
  openSettings: Omit<ShortcutConfig, 'action'>;
  /** Open help sheet. */
  openHelp: Omit<ShortcutConfig, 'action'>;
  /** Shuffle widget position. */
  shufflePosition: Omit<ShortcutConfig, 'action'>;
  /** Rotate widget orientation. */
  rotateOrientation: Omit<ShortcutConfig, 'action'>;
  /** Toggle fill mode (widget/inline). */
  toggleFillMode: Omit<ShortcutConfig, 'action'>;
}

export class KeyboardShortcuts {
  private enabled: boolean;
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private domReadyHandler: (() => void) | null = null;

  // Default shortcuts configuration (hybrid approach - Ctrl where safe, Alt for conflicts)
  private static readonly DEFAULT_SHORTCUTS: KeyboardShortcutsConfig = {
    fillAll: {
      key: 'k',
      ctrl: true,
      shift: true,
      description: 'Fill all forms on page',
    },
    fillCurrent: {
      key: 'k',
      alt: true, // Alt+K instead of Ctrl+F (conflicts with browser search)
      description: 'Fill current form',
    },
    clearAll: {
      key: 'l',
      ctrl: true,
      shift: true,
      description: 'Clear all filled data',
    },
    clearCurrent: {
      key: 'l',
      alt: true, // Alt+L instead of Ctrl+D (conflicts with browser bookmark)
      description: 'Clear current form',
    },
    toggleMode: {
      key: 'm',
      ctrl: true, // Ctrl+M is safe (no browser conflict)
      description: 'Toggle between valid/invalid mode',
    },
    toggleWidget: {
      key: 'h',
      alt: true, // Alt+H instead of Ctrl+W (conflicts with close tab)
      description: 'Show/hide widget',
      allowInFormFields: true,
    },
    openSettings: {
      key: ',',
      ctrl: true, // Ctrl+, is common for settings (like VS Code, Slack)
      description: 'Toggle settings',
    },
    openHelp: {
      key: '/',
      ctrl: true, // Ctrl+/ is common for help/shortcuts
      description: 'Toggle help',
    },
    shufflePosition: {
      key: 'm',
      ctrl: true,
      shift: true, // Ctrl+Shift+M — avoids Ctrl+Shift+P (Chrome DevTools Command Palette)
      description: 'Shuffle widget position',
    },
    rotateOrientation: {
      key: 'e',
      alt: true, // Alt+E instead of Ctrl+R (conflicts with browser refresh)
      description: 'Rotate widget orientation',
    },
    toggleFillMode: {
      key: 'i',
      alt: true, // Alt+I to toggle between widget and inline fill modes
      description: 'Toggle fill mode (widget/inline)',
      allowInFormFields: true,
    },
  };

  constructor(options: KeyboardShortcutsOptions = {}) {
    this.enabled = options.enabled ?? true;
  }

  /**
   * Initializes keyboard shortcuts with action callbacks.
   *
   * @remarks
   * Registers all default shortcuts with their corresponding actions and sets up
   * the global keydown event listener. Shortcuts are only active when not typing
   * in form fields. Safe to call multiple times; will not re-initialize.
   *
   * @param actions - Object containing callback functions for each shortcut action.
   *
   * @example
   * ```ts
   * shortcuts.init({
   *   fillAll: async () => await fillKit.fillAll(),
   *   fillCurrent: async () => await fillKit.fillCurrent(),
   *   clearAll: () => fillKit.clearAll(),
   *   // ... other actions
   * });
   * ```
   */
  init(actions: {
    fillAll: () => void | Promise<void>;
    fillCurrent: () => void | Promise<void>;
    clearAll: () => void | Promise<void>;
    clearCurrent: () => void | Promise<void>;
    toggleMode: () => void | Promise<void>;
    toggleWidget: () => void | Promise<void>;
    openSettings: () => void | Promise<void>;
    openHelp: () => void | Promise<void>;
    shufflePosition: () => void | Promise<void>;
    rotateOrientation: () => void | Promise<void>;
    toggleFillMode: () => void | Promise<void>;
  }): void {
    if (!this.enabled) return;

    // Register default shortcuts with actions
    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.fillAll,
      action: actions.fillAll,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.fillCurrent,
      action: actions.fillCurrent,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.clearAll,
      action: actions.clearAll,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.clearCurrent,
      action: actions.clearCurrent,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.toggleMode,
      action: actions.toggleMode,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.toggleWidget,
      action: actions.toggleWidget,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.openSettings,
      action: actions.openSettings,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.openHelp,
      action: actions.openHelp,
    });

    // Also register Ctrl+Shift+/ for keyboards where / requires Shift
    this.registerShortcut({
      key: '/',
      ctrl: true,
      shift: true,
      description: 'Toggle help (alternative)',
      action: actions.openHelp,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.shufflePosition,
      action: actions.shufflePosition,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.rotateOrientation,
      action: actions.rotateOrientation,
    });

    this.registerShortcut({
      ...KeyboardShortcuts.DEFAULT_SHORTCUTS.toggleFillMode,
      action: actions.toggleFillMode,
    });

    // Bind keyboard event listener
    this.boundHandler = this.handleKeyDown.bind(this);

    // Ensure DOM is ready before attaching event listener
    if (document.readyState === 'loading') {
      this.domReadyHandler = () => {
        if (this.boundHandler) {
          document.addEventListener('keydown', this.boundHandler);
        }
      };
      document.addEventListener('DOMContentLoaded', this.domReadyHandler);
    } else {
      if (this.boundHandler) {
        document.addEventListener('keydown', this.boundHandler);
      }
    }
  }

  /**
   * Registers a keyboard shortcut.
   *
   * @remarks
   * Adds a new shortcut to the registry. If a shortcut with the same key combination
   * already exists, it will be replaced.
   *
   * @param config - The shortcut configuration including key, modifiers, description, and action.
   */
  registerShortcut(config: ShortcutConfig): void {
    const key = this.getShortcutKey(config);
    this.shortcuts.set(key, config);
  }

  /**
   * Unregisters a keyboard shortcut.
   *
   * @remarks
   * Removes a shortcut from the registry based on its key combination.
   *
   * @param config - The shortcut configuration (without action and description).
   */
  unregisterShortcut(
    config: Omit<ShortcutConfig, 'action' | 'description'>
  ): void {
    const key = this.getShortcutKey(config as ShortcutConfig);
    this.shortcuts.delete(key);
  }

  /**
   * Generates a unique key identifier for a shortcut.
   *
   * @remarks
   * Creates a string key from the shortcut configuration in the format:
   * `[ctrl+][alt+][shift+][meta+]key` (e.g., "ctrl+shift+k").
   *
   * @param config - The shortcut configuration.
   * @returns A unique string identifier for the shortcut.
   */
  private getShortcutKey(config: ShortcutConfig): string {
    const parts: string[] = [];
    if (config.ctrl) parts.push('ctrl');
    if (config.alt) parts.push('alt');
    if (config.shift) parts.push('shift');
    if (config.meta) parts.push('meta');
    parts.push(config.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handles keydown events and executes matching shortcuts.
   *
   * @remarks
   * Checks if the pressed key combination matches any registered shortcut.
   * Prevents execution when typing in form fields (input, textarea, select, contenteditable).
   * Prevents default browser behavior and stops propagation when a shortcut is matched.
   *
   * @param event - The keyboard event.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Build shortcut key from event
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());

    const shortcutKey = parts.join('+');

    // Find matching shortcut
    const shortcut = this.shortcuts.get(shortcutKey);
    if (!shortcut) return;

    // Check if typing in form fields — block unless shortcut allows it
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = ['input', 'textarea', 'select'].includes(tagName);

    if ((isInput || isEditable) && !shortcut.allowInFormFields) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Execute action
    const result = shortcut.action();
    if (result instanceof Promise) {
      result.catch(error => {
        logger.error('[FillKit] Error executing shortcut:', error);
      });
    }
  }

  /**
   * Enables keyboard shortcuts.
   *
   * @remarks
   * Shortcuts will be active and respond to key presses.
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disables keyboard shortcuts.
   *
   * @remarks
   * Shortcuts will not respond to key presses, but remain registered.
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Checks if keyboard shortcuts are enabled.
   *
   * @returns `true` if shortcuts are enabled, `false` otherwise.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gets all registered shortcuts.
   *
   * @returns A copy of the shortcuts map.
   */
  getShortcuts(): Map<string, ShortcutConfig> {
    return new Map(this.shortcuts);
  }

  /**
   * Gets the description for a specific shortcut.
   *
   * @param key - The shortcut key identifier (e.g., "ctrl+k").
   * @returns The shortcut description, or `undefined` if not found.
   */
  getDescription(key: string): string | undefined {
    return this.shortcuts.get(key)?.description;
  }

  /**
   * Gets all shortcuts formatted for display.
   *
   * @remarks
   * Formats shortcuts with platform-appropriate symbols (e.g., ⌘ on Mac, Ctrl on Windows).
   * Useful for displaying shortcuts in help menus or documentation.
   *
   * @returns Array of objects containing formatted key combinations and descriptions.
   *
   * @example
   * ```ts
   * const shortcuts = keyboardShortcuts.getFormattedShortcuts();
   * // On Mac: [{ combination: '⌃⇧K', description: 'Fill all forms on page' }, ...]
   * // On Windows: [{ combination: 'Ctrl+Shift+K', description: 'Fill all forms on page' }, ...]
   * ```
   */
  getFormattedShortcuts(): Array<{ combination: string; description: string }> {
    const formatted: Array<{ combination: string; description: string }> = [];

    for (const [, config] of this.shortcuts.entries()) {
      const parts: string[] = [];

      // Use platform-appropriate symbols (navigator.platform is deprecated)
      const isMac =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).userAgentData?.platform === 'macOS' ||
        /mac/i.test(navigator.platform ?? navigator.userAgent);

      if (config.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
      if (config.alt) parts.push(isMac ? '⌥' : 'Alt');
      if (config.shift) parts.push(isMac ? '⇧' : 'Shift');
      if (config.meta) parts.push(isMac ? '⌘' : 'Win');
      parts.push(config.key.toUpperCase());

      formatted.push({
        combination: parts.join(isMac ? '' : '+'),
        description: config.description,
      });
    }

    return formatted;
  }

  /**
   * Destroys the keyboard shortcuts manager and cleans up resources.
   *
   * @remarks
   * Removes event listeners and clears all registered shortcuts.
   * Should be called when FillKit is destroyed.
   */
  destroy(): void {
    if (this.domReadyHandler) {
      document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
      this.domReadyHandler = null;
    }
    if (this.boundHandler) {
      document.removeEventListener('keydown', this.boundHandler);
      this.boundHandler = null;
    }
    this.shortcuts.clear();
  }
}
