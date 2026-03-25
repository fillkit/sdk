/**
 * Locale support and multilingual field detection for FillKit SDK.
 *
 * @remarks
 * Manages Faker.js instances for 52 locales and provides multilingual field
 * detection patterns for semantic field type identification across languages.
 *
 * **Key Components:**
 * - `LocaleManager`: Manages Faker.js instances with locale normalization
 * - `SupportedLocale`: Type-safe locale codes for supported languages
 * - `LOCALE_PATTERNS`: Multilingual field detection patterns for 52 languages
 * - `getFieldPatterns`: Helper to retrieve patterns for a specific locale
 *
 * **Supported Languages:**
 * Includes patterns for all 52 supported locales covering European,
 * Asian, Middle Eastern, African, and other languages.
 *
 * **Use Cases:**
 * - Generate localized fake data using Faker.js
 * - Detect field types in multilingual forms
 * - Support international users with locale-specific patterns
 *
 * @example
 * Using LocaleManager:
 * ```ts
 * import { LocaleManager } from './locales';
 *
 * const manager = new LocaleManager('fr');
 * const faker = manager.getInstance('fr');
 * console.log(faker.person.firstName()); // French name
 *
 * // Check locale support
 * if (manager.isSupported('de')) {
 *   const germanFaker = manager.getInstance('de');
 * }
 * ```
 *
 * @example
 * Using multilingual patterns:
 * ```ts
 * import { getFieldPatterns } from './locales';
 *
 * const patterns = getFieldPatterns('es');
 * const emailPatterns = patterns.name.email;
 * // Test if field name matches Spanish email patterns
 * const isEmail = emailPatterns.some(p => p.test('correo'));
 * ```
 */

import { Faker, allFakers, en, base } from '@faker-js/faker';
import { logger } from '@/core/Logger.js';

/**
 * Supported locale codes.
 *
 * @remarks
 * Based on Faker.js available locales - one primary locale per language.
 * Includes 52 locales covering major world languages and regional variants.
 *
 * **Locale Format:**
 * - Language code only (e.g., `en`, `fr`, `de`)
 * - Language + region (e.g., `pt_BR`, `zh_CN`, `en_US`)
 *
 * **Coverage:**
 * - European languages: English, French, German, Spanish, Italian, etc.
 * - Asian languages: Chinese, Japanese, Korean, Thai, Vietnamese, etc.
 * - Middle Eastern: Arabic, Hebrew, Persian, Turkish
 * - African: Afrikaans, Yoruba
 * - Others: Russian, Polish, Portuguese, Dutch, etc.
 */
export type SupportedLocale =
  | 'af_ZA' // Afrikaans
  | 'ar' // Arabic
  | 'az' // Azerbaijani
  | 'bn_BD' // Bengali
  | 'zh_CN' // Chinese (Simplified)
  | 'zh_TW' // Chinese (Traditional)
  | 'hr' // Croatian
  | 'cs_CZ' // Czech
  | 'cy' // Welsh
  | 'da' // Danish
  | 'dv' // Dhivehi
  | 'nl' // Dutch
  | 'en' // English
  | 'eo' // Esperanto
  | 'fi' // Finnish
  | 'fr' // French
  | 'ka_GE' // Georgian
  | 'de' // German
  | 'el' // Greek
  | 'he' // Hebrew
  | 'hu' // Hungarian
  | 'hy' // Armenian
  | 'id_ID' // Indonesian
  | 'it' // Italian
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ku_ckb' // Kurdish (Sorani)
  | 'ku_kmr_latin' // Kurdish (Kurmanji, Latin)
  | 'lv' // Latvian
  | 'mk' // Macedonian
  | 'nb_NO' // Norwegian
  | 'ne' // Nepali
  | 'fa' // Persian
  | 'pl' // Polish
  | 'pt_BR' // Portuguese (Brazil)
  | 'pt_PT' // Portuguese (Portugal)
  | 'ro' // Romanian
  | 'ru' // Russian
  | 'sr_RS_latin' // Serbian
  | 'sk' // Slovak
  | 'sl_SI' // Slovenian
  | 'es' // Spanish
  | 'sv' // Swedish
  | 'ta_IN' // Tamil
  | 'th' // Thai
  | 'tr' // Turkish
  | 'uk' // Ukrainian
  | 'ur' // Urdu
  | 'uz_UZ_latin' // Uzbek (Latin)
  | 'vi' // Vietnamese
  | 'yo_NG' // Yoruba
  | 'zu_ZA'; // Zulu

/**
 * Locale-aware Faker instance manager.
 *
 * @remarks
 * Manages Faker.js instances for different locales with automatic normalization
 * and fallback handling. Uses singleton pattern to cache instances for performance.
 *
 * **Features:**
 * - Lazy instance creation (only created when requested)
 * - Locale normalization (e.g., `en_us` → `en_US`, `fr_ca` → `fr_CA`)
 * - Automatic fallback to English for unsupported locales
 * - Instance caching for performance
 *
 * @example
 * Basic usage:
 * ```ts
 * const manager = new LocaleManager('en');
 *
 * // Get Faker instance for French
 * const frFaker = manager.getInstance('fr');
 * console.log(frFaker.person.fullName()); // "Jean Dupont"
 *
 * // Get Faker instance for German
 * const deFaker = manager.getInstance('de');
 * console.log(deFaker.location.city()); // "Berlin"
 * ```
 */
export class LocaleManager {
  private instances: Map<string, Faker> = new Map();
  private defaultLocale: string = 'en';

  /**
   * Creates a new LocaleManager instance.
   *
   * @param defaultLocale - Default locale code (default: 'en')
   */
  constructor(defaultLocale: string = 'en') {
    this.defaultLocale = defaultLocale;
  }

  /**
   * Gets or creates a Faker instance for a locale.
   *
   * @remarks
   * Uses cached instance if available, otherwise creates a new one.
   * Automatically normalizes locale codes and falls back to English
   * if the locale is not supported.
   *
   * @param locale - Locale code (optional, uses default if not provided)
   *
   * @returns Faker instance for the specified locale
   *
   * @example
   * ```ts
   * const manager = new LocaleManager();
   *
   * // Get French Faker
   * const fr = manager.getInstance('fr');
   * console.log(fr.person.firstName()); // "Marie"
   *
   * // Locale normalization
   * const enUS = manager.getInstance('en_us'); // Returns 'en_US' instance
   * const frCA = manager.getInstance('fr_ca'); // Returns 'fr_CA' instance
   * ```
   */
  getInstance(locale?: string): Faker {
    const targetLocale = locale || this.defaultLocale;

    // Check if instance already exists
    if (this.instances.has(targetLocale)) {
      return this.instances.get(targetLocale)!;
    }

    // Try to get pre-built locale from allFakers
    const fakerLocale = (allFakers as Record<string, Faker | undefined>)[
      targetLocale
    ];
    if (fakerLocale) {
      this.instances.set(targetLocale, fakerLocale);
      return fakerLocale;
    }

    // Handle special cases - map common locale codes
    const normalizedLocale = this.normalizeLocale(targetLocale);
    const normalizedFaker = (allFakers as Record<string, Faker | undefined>)[
      normalizedLocale
    ];
    if (normalizedFaker) {
      this.instances.set(targetLocale, normalizedFaker);
      return normalizedFaker;
    }

    // Fallback to creating instance with en + base
    logger.warn(
      `[LocaleManager] Locale "${targetLocale}" not found, falling back to English`
    );
    const fallbackInstance = new Faker({ locale: [en, base] });
    this.instances.set(targetLocale, fallbackInstance);
    return fallbackInstance;
  }

  /**
   * Normalizes locale codes and maps variants to primary locales.
   *
   * @remarks
   * Converts locale codes to a standard format and maps regional variants
   * to their Faker.js locale keys. For example:
   * - `en_us` → `en_US`, `en_au` → `en_AU`
   * - `fr_ca` → `fr_CA`, `fr_be` → `fr_BE`
   * - `de_at` → `de_AT`, `de_ch` → `de_CH`
   *
   * Special cases:
   * - Portuguese: `pt` → `pt_BR`, `pt_PT` kept separate
   * - Chinese: `zh` → `zh_CN`, `zh_TW` kept separate
   * - BCP 47 fallback: `de_de` → `de`, `fr_fr` → `fr`
   *
   * @param locale - Locale code to normalize
   *
   * @returns Normalized locale code
   *
   * @internal
   */
  private normalizeLocale(locale: string): string {
    // Convert hyphen to underscore and lowercase
    const normalized = locale.replace(/-/g, '_').toLowerCase();

    // Map all variants to their primary locale
    const mappings: Record<string, string> = {
      // English — preserve regional Faker.js keys
      en: 'en',
      en_us: 'en_US',
      en_gb: 'en_GB',
      en_au: 'en_AU',
      en_au_ocker: 'en_AU_ocker',
      en_bork: 'en_BORK',
      en_ca: 'en_CA',
      en_gh: 'en_GH',
      en_hk: 'en_HK',
      en_ie: 'en_IE',
      en_in: 'en_IN',
      en_ng: 'en_NG',
      en_za: 'en_ZA',

      // German — preserve regional Faker.js keys
      de: 'de',
      de_de: 'de',
      de_at: 'de_AT',
      de_ch: 'de_CH',

      // French — preserve regional Faker.js keys
      fr: 'fr',
      fr_fr: 'fr',
      fr_be: 'fr_BE',
      fr_ca: 'fr_CA',
      fr_ch: 'fr_CH',
      fr_lu: 'fr_LU',
      fr_sn: 'fr_SN',

      // Spanish — preserve regional Faker.js keys
      es: 'es',
      es_es: 'es',
      es_mx: 'es_MX',

      // Dutch — preserve regional Faker.js keys
      nl: 'nl',
      nl_nl: 'nl',
      nl_be: 'nl_BE',

      // Portuguese — keep both variants
      pt: 'pt_BR',
      pt_br: 'pt_BR',
      pt_pt: 'pt_PT',

      // Chinese — keep both variants
      zh: 'zh_CN',
      zh_cn: 'zh_CN',
      zh_tw: 'zh_TW',

      // Romanian — preserve regional Faker.js keys
      ro: 'ro',
      ro_ro: 'ro',
      ro_md: 'ro_MD',

      // Serbian — mixed-case Faker.js key (sr_RS_latin)
      sr: 'sr_RS_latin',
      sr_rs: 'sr_RS_latin',
      sr_rs_latin: 'sr_RS_latin',

      // Uzbek — mixed-case Faker.js key (uz_UZ_latin)
      uz: 'uz_UZ_latin',
      uz_uz: 'uz_UZ_latin',
      uz_uz_latin: 'uz_UZ_latin',

      // Norwegian — nb_NO is the Faker.js key
      nb: 'nb_NO',
      no: 'nb_NO',
      no_no: 'nb_NO',

      // Czech — cs_CZ is the Faker.js key
      cs: 'cs_CZ',

      // Indonesian — id_ID is the Faker.js key
      id: 'id_ID',

      // Georgian — ka_GE is the Faker.js key
      ka: 'ka_GE',

      // Tamil — ta_IN is the Faker.js key
      ta: 'ta_IN',

      // Bengali — bn_BD is the Faker.js key
      bn: 'bn_BD',

      // Afrikaans — af_ZA is the Faker.js key
      af: 'af_ZA',

      // Yoruba — yo_NG is the Faker.js key
      yo: 'yo_NG',

      // Zulu — zu_ZA is the Faker.js key
      zu: 'zu_ZA',

      // Kurdish — ku_ckb is the Faker.js key
      ku: 'ku_ckb',
      ku_kmr_latin: 'ku_kmr_latin',

      // Slovenian — sl_SI is the Faker.js key
      sl: 'sl_SI',
      sl_si: 'sl_SI',
    };

    return mappings[normalized] || normalized;
  }

  /**
   * Sets the default locale.
   *
   * @param locale - Locale code to set as default
   *
   * @example
   * ```ts
   * manager.setDefaultLocale('fr');
   * const faker = manager.getInstance(); // Returns French Faker
   * ```
   */
  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  /**
   * Gets the current default locale.
   *
   * @returns Default locale code
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Checks if a locale is supported by Faker.js.
   *
   * @remarks
   * Automatically normalizes the locale code before checking.
   *
   * @param locale - Locale code to check
   *
   * @returns True if locale is supported, false otherwise
   *
   * @example
   * ```ts
   * manager.isSupported('fr'); // true
   * manager.isSupported('fr_CA'); // true (normalized to 'fr_CA')
   * manager.isSupported('xyz'); // false
   * ```
   */
  isSupported(locale: string): boolean {
    const normalized = this.normalizeLocale(locale);
    return (
      (allFakers as Record<string, Faker | undefined>)[normalized] !== undefined
    );
  }

  /**
   * Gets a list of all supported locales.
   *
   * @returns Array of supported locale codes
   *
   * @example
   * ```ts
   * const locales = manager.getSupportedLocales();
   * console.log(locales); // ['en', 'fr', 'de', 'es', ...]
   * ```
   */
  getSupportedLocales(): string[] {
    return Object.keys(allFakers);
  }
}

/**
 * Multilingual field patterns for semantic field detection.
 *
 * @remarks
 * Organizes detection patterns by pattern type (name, placeholder, label)
 * and then by field type. Used by FieldDetector to identify field types
 * in multilingual forms.
 */
export interface MultilingualPatterns {
  /** Patterns for name/id attributes */
  name: Record<string, RegExp[]>;
  /** Patterns for placeholder text */
  placeholder: Record<string, RegExp[]>;
  /** Patterns for label text */
  label: Record<string, RegExp[]>;
}

import { LOCALE_PATTERNS } from './patterns/index.js';
export { LOCALE_PATTERNS };

/**
 * Detects the page locale from DOM or browser settings.
 *
 * @remarks
 * Attempts to detect locale in order:
 * 1. `document.documentElement.lang` attribute
 * 2. `navigator.language` browser setting
 * 3. Falls back to `'en'`
 *
 * Normalizes the detected locale to a Faker.js-compatible code.
 *
 * @returns Detected locale code (e.g., 'en', 'fr', 'de')
 */
export function detectPageLocale(): string {
  // Try document.documentElement.lang first
  if (
    typeof document !== 'undefined' &&
    document.documentElement &&
    document.documentElement.lang
  ) {
    const lang = document.documentElement.lang;
    // Normalize: 'en-US' → 'en_us', 'fr-CA' → 'fr_ca', 'pt-BR' → 'pt_BR'
    return normalizeDetectedLocale(lang);
  }

  // Fall back to navigator.language
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeDetectedLocale(navigator.language);
  }

  return 'en';
}

/**
 * Normalizes a BCP 47 language tag to a Faker.js locale code.
 *
 * @param lang - BCP 47 tag (e.g., 'en-US', 'pt-BR', 'zh-Hans')
 * @returns Faker.js-compatible locale code
 *
 * @internal
 */
function normalizeDetectedLocale(lang: string): string {
  const lower = lang.toLowerCase().replace(/-/g, '_');

  // Chinese variants (must check before generic handling)
  if (lower.startsWith('zh_tw') || lower.startsWith('zh_hant')) return 'zh_TW';
  if (lower.startsWith('zh')) return 'zh_CN';

  // Portuguese variants
  if (lower.startsWith('pt_br') || lower === 'pt') return 'pt_BR';
  if (lower.startsWith('pt_')) return 'pt_PT';

  // Return full underscore-formatted code — LocaleManager handles normalization
  return lower;
}

/**
 * Gets field patterns for a specific locale.
 *
 * @remarks
 * Normalizes the locale code and returns appropriate patterns.
 * Falls back to English patterns if locale is not found.
 *
 * **Normalization:**
 * - Extracts base language code (e.g., `en_US` → `en`)
 * - Special handling for Portuguese and Chinese variants
 *
 * @param locale - Locale code (e.g., 'fr', 'en_US', 'pt_BR')
 *
 * @returns Multilingual patterns for the locale
 *
 * @example
 * ```ts
 * // Get French patterns
 * const frPatterns = getFieldPatterns('fr');
 * console.log(frPatterns.name.email); // French email patterns
 *
 * // Get patterns with normalization
 * const patterns = getFieldPatterns('en_US'); // Returns 'en' patterns
 * const ptPatterns = getFieldPatterns('pt'); // Returns 'pt_BR' patterns
 * ```
 */
export function getFieldPatterns(locale: string): MultilingualPatterns {
  // Try exact match first (e.g., 'cs_CZ', 'pt_BR', 'zh_CN')
  if (LOCALE_PATTERNS[locale]) {
    return LOCALE_PATTERNS[locale];
  }

  // Fall back to base language code (e.g., 'en_US' -> 'en', 'cs_CZ' -> 'cs')
  if (locale.includes('_')) {
    const languageCode = locale.split('_')[0];
    if (LOCALE_PATTERNS[languageCode]) {
      return LOCALE_PATTERNS[languageCode];
    }
  }

  return LOCALE_PATTERNS.en;
}
