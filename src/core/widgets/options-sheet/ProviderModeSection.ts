/**
 * Manages the data source and validation mode configuration.
 *
 * @remarks
 * This component allows users to switch between 'local' (generated on-device)
 * and 'cloud' (custom datasets) data sources. It also provides a toggle for
 * generating valid vs. invalid data for testing error states.
 */

import { createSectionGroup, createFormSection } from './form-helpers.js';
import type { OptionChangeHandler } from './types.js';
import type { ProviderModeVisibility } from '../../../types/index.js';

export class ProviderModeSection {
  private element: HTMLElement | null = null;
  private currentProvider: 'local' | 'cloud' = 'local';
  private currentMode: 'valid' | 'invalid' = 'valid';
  private onChange?: OptionChangeHandler;
  private fieldVisibility: Required<ProviderModeVisibility>;

  /**
   * Initializes a new instance of the ProviderModeSection class.
   *
   * @param provider - The initial data provider ('local' or 'cloud').
   * @param mode - The initial validation mode ('valid' or 'invalid').
   * @param onChange - Callback function triggered when any value changes.
   * @param fieldVisibility - Per-field visibility overrides.
   */
  constructor(
    provider: 'local' | 'cloud' = 'local',
    mode: 'valid' | 'invalid' = 'valid',
    onChange?: OptionChangeHandler,
    fieldVisibility?: Required<ProviderModeVisibility>
  ) {
    this.currentProvider = provider;
    this.currentMode = mode;
    this.onChange = onChange;
    this.fieldVisibility = fieldVisibility ?? { provider: true, mode: true };
  }

  /**
   * Creates and renders the provider and mode selection UI.
   *
   * @remarks
   * Constructs dropdowns for selecting the data source and validation mode.
   *
   * @returns The HTMLElement containing the configuration section.
   */
  create(): HTMLElement {
    const section = createSectionGroup('Data Source & Validation');

    // Provider Selection
    const providerSection = createFormSection(
      'Data Source',
      'select',
      'provider',
      [
        { value: 'local', label: 'Local (Fast, no network)' },
        { value: 'cloud', label: 'Cloud (Custom datasets)' },
      ],
      this.currentProvider,
      undefined,
      value => this.handleProviderChange(value)
    );

    // Mode Selection
    const modeSection = createFormSection(
      'Validation Mode',
      'select',
      'mode',
      [
        { value: 'valid', label: 'Valid data (for production demos)' },
        { value: 'invalid', label: 'Invalid data (for testing error states)' },
      ],
      this.currentMode,
      undefined,
      value => this.handleModeChange(value)
    );

    if (this.fieldVisibility.provider) {
      section.appendChild(providerSection);
    }
    if (this.fieldVisibility.mode) {
      section.appendChild(modeSection);
    }

    this.element = section.parentElement as HTMLElement;
    return this.element;
  }

  /**
   * Makes the provider/mode section visible.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hides the provider/mode section.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Handles changes to the provider selection.
   *
   * @param value - The new provider value ('local' or 'cloud').
   */
  private handleProviderChange(value: string): void {
    this.currentProvider = value as 'local' | 'cloud';

    if (this.onChange) {
      this.onChange('provider', value);
    }
  }

  /**
   * Handles changes to the validation mode selection.
   *
   * @param value - The new mode value ('valid' or 'invalid').
   */
  private handleModeChange(value: string): void {
    this.currentMode = value as 'valid' | 'invalid';

    if (this.onChange) {
      this.onChange('mode', value);
    }
  }

  /**
   * Retrieves the currently selected data provider.
   *
   * @returns The provider mode ('local' or 'cloud').
   */
  getProvider(): 'local' | 'cloud' {
    if (!this.element) return this.currentProvider;

    const select = this.element.querySelector(
      '[name="provider"]'
    ) as HTMLSelectElement;
    return (select?.value as 'local' | 'cloud') || this.currentProvider;
  }

  /**
   * Retrieves the currently selected validation mode.
   *
   * @returns The validation mode ('valid' or 'invalid').
   */
  getMode(): 'valid' | 'invalid' {
    if (!this.element) return this.currentMode;

    const select = this.element.querySelector(
      '[name="mode"]'
    ) as HTMLSelectElement;
    return (select?.value as 'valid' | 'invalid') || this.currentMode;
  }

  /**
   * Updates the selected values in the UI.
   *
   * @param provider - The new provider to select (optional).
   * @param mode - The new mode to select (optional).
   */
  updateValues(provider?: 'local' | 'cloud', mode?: 'valid' | 'invalid'): void {
    if (provider !== undefined) {
      this.currentProvider = provider;
    }
    if (mode !== undefined) {
      this.currentMode = mode;
    }

    if (!this.element) return;

    const providerSelect = this.element.querySelector(
      '[name="provider"]'
    ) as HTMLSelectElement;
    const modeSelect = this.element.querySelector(
      '[name="mode"]'
    ) as HTMLSelectElement;

    if (providerSelect && provider !== undefined) {
      providerSelect.value = provider;
    }
    if (modeSelect && mode !== undefined) {
      modeSelect.value = mode;
    }
  }

  /**
   * Retrieves the provider select element.
   *
   * @remarks
   * Useful for external control of visibility or state.
   *
   * @returns The HTMLSelectElement for the provider, or null if not created.
   */
  getProviderElement(): HTMLSelectElement | null {
    if (!this.element) return null;
    return this.element.querySelector('[name="provider"]');
  }
}
