/**
 * Manages the language configuration section of the options sheet.
 *
 * @remarks
 * This component provides a UI for selecting the locale used for data generation.
 * It supports 74 languages/locales, allowing users to generate
 * localized data (e.g., names, addresses, phone numbers).
 */

import { createSectionGroup, createFormSection } from './form-helpers.js';
import type { OptionChangeHandler } from './types.js';

export class LanguageSection {
  private element: HTMLElement | null = null;
  private currentLocale: string = 'en';
  private onChange?: OptionChangeHandler;

  /**
   * Initializes a new instance of the LanguageSection class.
   *
   * @param currentLocale - The initial locale code (e.g., 'en', 'fr', 'es').
   * @param onChange - Callback function triggered when the locale is changed.
   */
  constructor(currentLocale: string = 'en', onChange?: OptionChangeHandler) {
    this.currentLocale = currentLocale;
    this.onChange = onChange;
  }

  /**
   * Creates and renders the language selection UI.
   *
   * @remarks
   * Constructs a dropdown menu containing all supported locales with their flags.
   *
   * @returns The HTMLElement containing the language selection section.
   */
  create(): HTMLElement {
    const section = createSectionGroup('Language');
    section.parentElement!.className = 'fillkit-language-section';

    const localeSection = createFormSection(
      'Language',
      'select',
      'locale',
      [
        { value: 'af_ZA', label: '🇿🇦 Afrikaans' },
        { value: 'ar', label: '🇸🇦 Arabic' },
        { value: 'hy', label: '🇦🇲 Armenian' },
        { value: 'az', label: '🇦🇿 Azerbaijani' },
        { value: 'bn_BD', label: '🇧🇩 Bengali' },
        { value: 'zh_CN', label: '🇨🇳 Chinese (Simplified)' },
        { value: 'zh_TW', label: '🇹🇼 Chinese (Traditional)' },
        { value: 'hr', label: '🇭🇷 Croatian' },
        { value: 'cs_CZ', label: '🇨🇿 Czech' },
        { value: 'da', label: '🇩🇰 Danish' },
        { value: 'dv', label: '🇲🇻 Dhivehi' },
        { value: 'nl', label: '🇳🇱 Dutch' },
        { value: 'nl_BE', label: '🇧🇪 Dutch (Belgium)' },
        { value: 'en', label: '🇺🇸 English' },
        { value: 'en_AU', label: '🇦🇺 English (Australia)' },
        { value: 'en_AU_ocker', label: '🇦🇺 English (Australia Ocker)' },
        { value: 'en_BORK', label: '🗣️ English (Bork)' },
        { value: 'en_CA', label: '🇨🇦 English (Canada)' },
        { value: 'en_GB', label: '🇬🇧 English (Great Britain)' },
        { value: 'en_GH', label: '🇬🇭 English (Ghana)' },
        { value: 'en_HK', label: '🇭🇰 English (Hong Kong)' },
        { value: 'en_IE', label: '🇮🇪 English (Ireland)' },
        { value: 'en_IN', label: '🇮🇳 English (India)' },
        { value: 'en_NG', label: '🇳🇬 English (Nigeria)' },
        { value: 'en_US', label: '🇺🇸 English (United States)' },
        { value: 'en_ZA', label: '🇿🇦 English (South Africa)' },
        { value: 'eo', label: '🌍 Esperanto' },
        { value: 'fi', label: '🇫🇮 Finnish' },
        { value: 'fr', label: '🇫🇷 French' },
        { value: 'fr_BE', label: '🇧🇪 French (Belgium)' },
        { value: 'fr_CA', label: '🇨🇦 French (Canada)' },
        { value: 'fr_CH', label: '🇨🇭 French (Switzerland)' },
        { value: 'fr_LU', label: '🇱🇺 French (Luxembourg)' },
        { value: 'fr_SN', label: '🇸🇳 French (Senegal)' },
        { value: 'ka_GE', label: '🇬🇪 Georgian' },
        { value: 'de', label: '🇩🇪 German' },
        { value: 'de_AT', label: '🇦🇹 German (Austria)' },
        { value: 'de_CH', label: '🇨🇭 German (Switzerland)' },
        { value: 'el', label: '🇬🇷 Greek' },
        { value: 'he', label: '🇮🇱 Hebrew' },
        { value: 'hu', label: '🇭🇺 Hungarian' },
        { value: 'id_ID', label: '🇮🇩 Indonesian' },
        { value: 'it', label: '🇮🇹 Italian' },
        { value: 'ja', label: '🇯🇵 Japanese' },
        { value: 'ko', label: '🇰🇷 Korean' },
        { value: 'ku_ckb', label: '🇮🇶 Kurdish (Sorani)' },
        { value: 'ku_kmr_latin', label: '🇹🇷 Kurdish (Kurmanji)' },
        { value: 'lv', label: '🇱🇻 Latvian' },
        { value: 'mk', label: '🇲🇰 Macedonian' },
        { value: 'ne', label: '🇳🇵 Nepali' },
        { value: 'nb_NO', label: '🇳🇴 Norwegian' },
        { value: 'fa', label: '🇮🇷 Persian' },
        { value: 'pl', label: '🇵🇱 Polish' },
        { value: 'pt_BR', label: '🇧🇷 Portuguese (Brazil)' },
        { value: 'pt_PT', label: '🇵🇹 Portuguese (Portugal)' },
        { value: 'ro', label: '🇷🇴 Romanian' },
        { value: 'ro_MD', label: '🇲🇩 Romanian (Moldova)' },
        { value: 'ru', label: '🇷🇺 Russian' },
        { value: 'sr_RS_latin', label: '🇷🇸 Serbian' },
        { value: 'sk', label: '🇸🇰 Slovak' },
        { value: 'sl_SI', label: '🇸🇮 Slovenian' },
        { value: 'es', label: '🇪🇸 Spanish' },
        { value: 'es_MX', label: '🇲🇽 Spanish (Mexico)' },
        { value: 'sv', label: '🇸🇪 Swedish' },
        { value: 'ta_IN', label: '🇮🇳 Tamil' },
        { value: 'th', label: '🇹🇭 Thai' },
        { value: 'tr', label: '🇹🇷 Turkish' },
        { value: 'uk', label: '🇺🇦 Ukrainian' },
        { value: 'ur', label: '🇵🇰 Urdu' },
        { value: 'uz_UZ_latin', label: '🇺🇿 Uzbek (Latin)' },
        { value: 'vi', label: '🇻🇳 Vietnamese' },
        { value: 'cy', label: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh' },
        { value: 'yo_NG', label: '🇳🇬 Yoruba' },
        { value: 'zu_ZA', label: '🇿🇦 Zulu' },
      ],
      this.currentLocale,
      undefined,
      value => this.handleChange(value)
    );

    section.appendChild(localeSection);

    this.element = section.parentElement as HTMLElement;
    return this.element;
  }

  /**
   * Handles changes to the locale selection.
   *
   * @param value - The new locale code selected by the user.
   */
  private handleChange(value: string): void {
    this.currentLocale = value;

    if (this.onChange) {
      this.onChange('locale', value);
    }
  }

  /**
   * Retrieves the currently selected locale.
   *
   * @returns The locale code (e.g., 'en').
   */
  getLocale(): string {
    if (!this.element) return this.currentLocale;

    const select = this.element.querySelector(
      '[name="locale"]'
    ) as HTMLSelectElement;
    return select?.value || this.currentLocale;
  }

  /**
   * Updates the selected locale in the UI.
   *
   * @param locale - The new locale code to select.
   */
  updateLocale(locale: string): void {
    this.currentLocale = locale;

    if (!this.element) return;

    const select = this.element.querySelector(
      '[name="locale"]'
    ) as HTMLSelectElement;
    if (select) {
      select.value = locale;
    }
  }

  /**
   * Makes the language section visible.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hides the language section.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }
}
