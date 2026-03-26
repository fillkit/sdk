/**
 * Offline dataset provider using Faker.js for generating realistic data.
 *
 * @remarks
 * Implements the DatasetProvider interface for local, offline data generation.
 * Uses a strategy-based architecture where each semantic field type has a dedicated
 * strategy for value generation. Supports multiple locales via Faker.js and provides
 * coherent profile generation for related fields.
 *
 * @example
 * ```ts
 * const provider = new LocalProvider({
 *   locale: 'en',
 *   emailDomain: 'example.com'
 * });
 *
 * await provider.init();
 * const email = await provider.getValue('email');
 * const profile = await provider.getProfile({ locale: 'fr' });
 * await provider.destroy();
 * ```
 *
 * cspell:ignore maxlength minlength
 */

import { logger } from '@/core/Logger.js';
import type {
  DatasetProvider,
  ValueOptions,
  ProfileOptions,
} from '../types/index.js';
import { SemanticFieldType } from '../types/semantic-fields.js';
import { faker } from '@faker-js/faker';
import { LocaleManager } from '../locales/index.js';
import { StrategyRegistry } from '../core/StrategyRegistry.js';
import { sdkOptions } from '../state/atoms/index.js';
import {
  EmailStrategy,
  PhoneStrategy,
  PasswordStrategy,
  NameStrategy,
  AddressStrategy,
  CreditCardStrategy,
  DateTimeStrategy,
  NumberStrategy,
  UrlStrategy,
  TextStrategy,
  SelectStrategy,
  RadioCheckboxStrategy,
  RangeStrategy,
  ColorStrategy,
  OTPPinStrategy,
  SSNStrategy,
  TimezoneStrategy,
  LanguageStrategy,
  IPAddressStrategy,
  UUIDStrategy,
  SlugStrategy,
  CurrencyCodeStrategy,
  VehicleStrategy,
  IdentifierStrategy,
  BiometricStrategy,
  EducationStrategy,
  CountryCodeStrategy,
  GenderStrategy,
  FileStrategy,
  ImageStrategy,
  SearchStrategy,
  FinancialStrategy,
  NetworkStrategy,
  TokenStrategy,
  AirlineStrategy,
  FoodStrategy,
  BookStrategy,
  MusicStrategy,
  ScienceStrategy,
  DevToolsStrategy,
  AnimalStrategy,
} from '../strategies/index.js';

/**
 * Configuration options for LocalProvider.
 */
export interface LocalProviderConfig {
  /** Locale for Faker.js data generation (e.g., 'en', 'fr', 'de'). */
  locale?: string;
  /** Email domain to use for generated email addresses. */
  emailDomain?: string;
  /** Seed for deterministic value generation. When set, produces reproducible fills. */
  seed?: number;
}

/**
 * Local dataset provider implementation using Faker.js.
 *
 * @remarks
 * Provides offline form filling using Faker.js for realistic data generation.
 * Uses a strategy registry pattern where each semantic field type is mapped to
 * a specific generation strategy. Supports multiple locales and coherent profile
 * generation.
 *
 * @example
 * ```ts
 * const provider = new LocalProvider({ locale: 'en' });
 * await provider.init();
 *
 * // Generate single value
 * const email = await provider.getValue('email', { mode: 'valid' });
 *
 * // Generate coherent profile
 * const profile = await provider.getProfile();
 * console.log(profile.fullName, profile.email);
 *
 * await provider.destroy();
 * ```
 */
export class LocalProvider implements DatasetProvider {
  private config: LocalProviderConfig;
  private initialized = false;
  private localeManager: LocaleManager;
  private strategyRegistry: StrategyRegistry;
  private unsubscribe?: () => void;
  private seededInstances = new WeakSet<object>();

  constructor(config: LocalProviderConfig = {}) {
    // Read emailDomain from atom if not provided in config
    const opts = sdkOptions.get();

    this.config = {
      ...config,
      locale: config.locale || 'en',
      emailDomain: config.emailDomain || opts.emailDomain || 'example.com',
    };
    this.localeManager = new LocaleManager(this.config.locale);
    this.strategyRegistry = new StrategyRegistry();
    this.registerDefaultStrategies();

    // Subscribe to emailDomain changes from atom
    this.unsubscribe = sdkOptions.subscribe(opts => {
      if (opts.emailDomain && !config.emailDomain) {
        // Only update if emailDomain wasn't explicitly set in constructor
        this.config.emailDomain = opts.emailDomain;
      }
    });
  }

  /**
   * Initializes the provider.
   *
   * @remarks
   * Locale is handled by LocaleManager getInstance() calls.
   * Seed is applied once per Faker instance, not per call.
   */
  async init(): Promise<void> {
    // Apply seed to default locale instance
    if (this.config.seed !== undefined) {
      const defaultInstance = this.localeManager.getInstance(
        this.config.locale
      );
      defaultInstance.seed(this.config.seed);
      this.seededInstances.add(defaultInstance);
    }

    this.initialized = true;
  }

  /**
   * Registers default strategies for all supported field types.
   *
   * @remarks
   * Sets up strategy mappings for 80+ semantic field types including email, phone,
   * names, addresses, credit cards, dates, numbers, and more. Each strategy knows
   * how to generate valid and invalid values for its field type.
   */
  private registerDefaultStrategies(): void {
    // Email strategy
    const emailStrategy = new EmailStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.EMAIL,
      emailStrategy
    );

    // Phone strategy
    const phoneStrategy = new PhoneStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PHONE,
      phoneStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FAX,
      phoneStrategy
    );

    // Password strategy
    const passwordStrategy = new PasswordStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PASSWORD,
      passwordStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CONFIRM_PASSWORD,
      passwordStrategy
    );

    // Name strategy
    const nameStrategy = new NameStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.NAME_GIVEN,
      nameStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.NAME_FAMILY,
      nameStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FULL_NAME,
      nameStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MIDDLE_NAME,
      nameStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PREFIX,
      nameStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SUFFIX,
      nameStrategy
    );

    // Address strategy
    const addressStrategy = new AddressStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ADDRESS_LINE1,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ADDRESS_LINE2,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CITY,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.STATE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PROVINCE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.POSTAL_CODE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ZIP_CODE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COUNTRY,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.REGION,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.LATITUDE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.LONGITUDE,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BUILDING_NUMBER,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.STREET,
      addressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CONTINENT,
      addressStrategy
    );

    // Credit card strategy
    const creditCardStrategy = new CreditCardStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CREDIT_CARD_NUMBER,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CREDIT_CARD_CVV,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CREDIT_CARD_EXP_MONTH,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CREDIT_CARD_EXP_YEAR,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CREDIT_CARD_EXPIRY,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CURRENCY,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ACCOUNT_NUMBER,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ROUTING_NUMBER,
      creditCardStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BANK_NAME,
      creditCardStrategy
    );

    // DateTime strategy
    const dateTimeStrategy = new DateTimeStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DATE,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DATETIME,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.TIME,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MONTH,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.WEEK,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BIRTH_DATE,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.AGE,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.WEEKDAY,
      dateTimeStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MONTH_NAME,
      dateTimeStrategy
    );

    // Number strategy
    const numberStrategy = new NumberStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.NUMBER_GENERIC,
      numberStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.INTEGER,
      numberStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DECIMAL,
      numberStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PERCENTAGE,
      numberStrategy
    );

    // Range strategy
    const rangeStrategy = new RangeStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.RANGE,
      rangeStrategy
    );

    // URL strategy
    const urlStrategy = new UrlStrategy();
    this.strategyRegistry.registerStrategy(SemanticFieldType.URL, urlStrategy);
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.WEBSITE,
      urlStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DOMAIN,
      urlStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DISPLAY_NAME,
      urlStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.USER_AGENT,
      urlStrategy
    );

    // Text strategy
    const textStrategy = new TextStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.TEXTAREA_GENERIC,
      textStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COMPANY,
      textStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.JOB_TITLE,
      textStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DEPARTMENT,
      textStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.USERNAME,
      textStrategy
    );
    this.strategyRegistry.registerStrategy(SemanticFieldType.BIO, textStrategy);
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DESCRIPTION,
      textStrategy
    );

    // Select strategy
    const selectStrategy = new SelectStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SELECT_GENERIC,
      selectStrategy
    );

    // RadioCheckbox strategy
    const radioCheckboxStrategy = new RadioCheckboxStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BOOLEAN,
      radioCheckboxStrategy
    );

    // Color strategy
    const colorStrategy = new ColorStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COLOR,
      colorStrategy
    );

    // OTPPin strategy
    const otpPinStrategy = new OTPPinStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.OTP_CODE,
      otpPinStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PIN_CODE,
      otpPinStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VERIFICATION_CODE,
      otpPinStrategy
    );

    // SSN strategy
    const ssnStrategy = new SSNStrategy();
    this.strategyRegistry.registerStrategy(SemanticFieldType.SSN, ssnStrategy);
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.TAX_ID,
      ssnStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.NATIONAL_ID,
      ssnStrategy
    );

    // Timezone strategy
    const timezoneStrategy = new TimezoneStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.TIMEZONE,
      timezoneStrategy
    );

    // Language strategy
    const languageStrategy = new LanguageStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.LANGUAGE,
      languageStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.LOCALE,
      languageStrategy
    );

    // IP Address strategy
    const ipAddressStrategy = new IPAddressStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IP_ADDRESS,
      ipAddressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IPV4,
      ipAddressStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IPV6,
      ipAddressStrategy
    );

    // UUID strategy
    const uuidStrategy = new UUIDStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.UUID,
      uuidStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.GUID,
      uuidStrategy
    );

    // Slug strategy
    const slugStrategy = new SlugStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SLUG,
      slugStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.URL_SLUG,
      slugStrategy
    );

    // Currency Code strategy
    const currencyCodeStrategy = new CurrencyCodeStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CURRENCY_CODE,
      currencyCodeStrategy
    );

    // Vehicle strategy
    const vehicleStrategy = new VehicleStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VIN,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.LICENSE_PLATE,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VEHICLE_MAKE,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VEHICLE_MODEL,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VEHICLE_TYPE,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VEHICLE_FUEL,
      vehicleStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.VEHICLE_COLOR,
      vehicleStrategy
    );

    // Financial strategy
    const financialStrategy = new FinancialStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IBAN,
      financialStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BIC,
      financialStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BITCOIN_ADDRESS,
      financialStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ETHEREUM_ADDRESS,
      financialStrategy
    );

    // Network strategy
    const networkStrategy = new NetworkStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MAC_ADDRESS,
      networkStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IMEI,
      networkStrategy
    );

    // Token strategy
    const tokenStrategy = new TokenStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.JWT,
      tokenStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.NANOID,
      tokenStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ULID,
      tokenStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SEMVER,
      tokenStrategy
    );

    // Identifier strategy
    const identifierStrategy = new IdentifierStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ISBN,
      identifierStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.UPC,
      identifierStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SKU,
      identifierStrategy
    );

    // Biometric strategy
    const biometricStrategy = new BiometricStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.HEIGHT,
      biometricStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.WEIGHT,
      biometricStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BLOOD_TYPE,
      biometricStrategy
    );

    // Education strategy
    const educationStrategy = new EducationStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DEGREE,
      educationStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.GPA,
      educationStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.GRADUATION_YEAR,
      educationStrategy
    );

    // Country code strategy
    const countryCodeStrategy = new CountryCodeStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COUNTRY_CODE,
      countryCodeStrategy
    );

    // Gender strategy
    const genderStrategy = new GenderStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.GENDER,
      genderStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SEX,
      genderStrategy
    );

    // File strategy
    const fileStrategy = new FileStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FILE,
      fileStrategy
    );

    // Image strategy
    const imageStrategy = new ImageStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.IMAGE,
      imageStrategy
    );

    // Search strategy
    const searchStrategy = new SearchStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SEARCH,
      searchStrategy
    );

    // Airline strategy
    const airlineStrategy = new AirlineStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.AIRLINE_NAME,
      airlineStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FLIGHT_NUMBER,
      airlineStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SEAT_NUMBER,
      airlineStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.AIRPORT_CODE,
      airlineStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.RECORD_LOCATOR,
      airlineStrategy
    );

    // Food strategy
    const foodStrategy = new FoodStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FOOD_DISH,
      foodStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FOOD_INGREDIENT,
      foodStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.FOOD_DESCRIPTION,
      foodStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CUISINE_TYPE,
      foodStrategy
    );

    // Book strategy
    const bookStrategy = new BookStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BOOK_TITLE,
      bookStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BOOK_AUTHOR,
      bookStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BOOK_GENRE,
      bookStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.BOOK_PUBLISHER,
      bookStrategy
    );

    // Music strategy
    const musicStrategy = new MusicStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MUSIC_GENRE,
      musicStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SONG_NAME,
      musicStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MUSIC_ARTIST,
      musicStrategy
    );

    // Science strategy
    const scienceStrategy = new ScienceStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CHEMICAL_ELEMENT,
      scienceStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.SCIENCE_UNIT,
      scienceStrategy
    );

    // DevTools strategy
    const devToolsStrategy = new DevToolsStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.MONGODB_ID,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COMMIT_SHA,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.GIT_BRANCH,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.COMMIT_MESSAGE,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DATABASE_COLUMN,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DATABASE_TYPE,
      devToolsStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DATABASE_ENGINE,
      devToolsStrategy
    );

    // Animal strategy
    const animalStrategy = new AnimalStrategy();
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.ANIMAL_TYPE,
      animalStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.PET_NAME,
      animalStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.DOG_BREED,
      animalStrategy
    );
    this.strategyRegistry.registerStrategy(
      SemanticFieldType.CAT_BREED,
      animalStrategy
    );
  }

  /**
   * Gets a value for a specific field type.
   *
   * @remarks
   * Uses the strategy registry to find and execute the appropriate generation strategy.
   * Falls back to generic text if no strategy is registered for the field type.
   *
   * @param fieldType - Semantic field type to generate.
   * @param options - Generation options including mode, locale, and constraints.
   * @returns Generated value, or `null` if generation fails.
   */
  async getValue(
    fieldType: string,
    options: ValueOptions = {}
  ): Promise<string | number | boolean | null> {
    if (!this.initialized) {
      await this.init();
    }

    const { mode = 'valid', locale } = options;

    // Get locale-specific Faker instance
    const targetLocale = locale || this.config.locale;
    const fakerInstance = this.localeManager.getInstance(targetLocale);

    // Apply seed once per Faker instance for deterministic generation
    if (
      this.config.seed !== undefined &&
      !this.seededInstances.has(fakerInstance)
    ) {
      fakerInstance.seed(this.config.seed);
      this.seededInstances.add(fakerInstance);
    }

    try {
      return this.generateValue(
        fieldType as SemanticFieldType,
        mode,
        options,
        fakerInstance
      );
    } catch (error) {
      logger.warn(`Failed to generate value for ${fieldType}:`, error);
      return null;
    }
  }

  /**
   * Gets multiple unique values for a field type using faker.helpers.uniqueArray().
   *
   * @remarks
   * Useful when filling multiple fields of the same type (e.g., multiple email fields)
   * to prevent duplicate values. Falls back to non-unique generation if uniqueArray fails.
   *
   * @param fieldType - Semantic field type to generate.
   * @param count - Number of unique values to generate.
   * @param options - Generation options.
   * @returns Array of unique generated values.
   */
  async getBatchValues(
    fieldType: string,
    count: number,
    options: ValueOptions = {}
  ): Promise<Array<string | number | boolean | null>> {
    if (!this.initialized) {
      await this.init();
    }

    const { locale } = options;
    const targetLocale = locale || this.config.locale;
    const fakerInstance = this.localeManager.getInstance(targetLocale);

    if (
      this.config.seed !== undefined &&
      !this.seededInstances.has(fakerInstance)
    ) {
      fakerInstance.seed(this.config.seed);
      this.seededInstances.add(fakerInstance);
    }

    try {
      const generator = () =>
        this.generateValue(
          fieldType as SemanticFieldType,
          options.mode || 'valid',
          options,
          fakerInstance
        );

      const results = fakerInstance.helpers.uniqueArray(generator, count);
      return results;
    } catch {
      // Fall back to individual generation if uniqueArray fails
      const results: Array<string | number | boolean | null> = [];
      for (let i = 0; i < count; i++) {
        const value = await this.getValue(fieldType, options);
        results.push(value);
      }
      return results;
    }
  }

  /**
   * Gets a coherent profile of related fields.
   *
   * @remarks
   * Generates a complete person profile with consistent data across all fields.
   * Useful for filling entire forms with realistic, related information.
   *
   * @param opts - Profile options including locale.
   * @returns Object containing generated profile data (name, email, phone, address, etc.).
   *
   * @example
   * ```ts
   * const profile = await provider.getProfile({ locale: 'en' });
   * // Returns: { fullName: 'John Doe', email: 'john@example.com', phone: '+1...', ... }
   * ```
   */
  async getProfile(
    opts: ProfileOptions = {}
  ): Promise<Record<string, unknown>> {
    if (!this.initialized) {
      await this.init();
    }

    const { locale } = opts;

    // Get locale-specific Faker instance
    const targetLocale = locale || this.config.locale;
    const fakerInstance = this.localeManager.getInstance(targetLocale);

    // Generate a coherent person profile
    const person = {
      [SemanticFieldType.FULL_NAME]: fakerInstance.person.fullName(),
      [SemanticFieldType.NAME_GIVEN]: fakerInstance.person.firstName(),
      [SemanticFieldType.NAME_FAMILY]: fakerInstance.person.lastName(),
      [SemanticFieldType.EMAIL]: fakerInstance.internet.email(),
      [SemanticFieldType.PHONE]: fakerInstance.phone.number(),
      [SemanticFieldType.COMPANY]: fakerInstance.company.name(),
      [SemanticFieldType.JOB_TITLE]: fakerInstance.person.jobTitle(),
      [SemanticFieldType.ADDRESS_LINE1]: fakerInstance.location.streetAddress(),
      [SemanticFieldType.CITY]: fakerInstance.location.city(),
      [SemanticFieldType.STATE]: fakerInstance.location.state(),
      [SemanticFieldType.POSTAL_CODE]: fakerInstance.location.zipCode(),
      [SemanticFieldType.COUNTRY]: fakerInstance.location.country(),
      [SemanticFieldType.WEBSITE]: fakerInstance.internet.url(),
      [SemanticFieldType.DATE]: fakerInstance.date
        .past()
        .toISOString()
        .split('T')[0],
      [SemanticFieldType.AGE]: fakerInstance.number.int({ min: 18, max: 80 }),
    };

    return person;
  }

  /**
   * Generates value for specific field type using registered strategy.
   *
   * @remarks
   * Looks up the strategy for the field type and delegates generation to it.
   * Returns `null` if strategy fails or is not registered.
   *
   * @param fieldType - Semantic field type.
   * @param mode - Generation mode ('valid' or 'invalid').
   * @param _options - Value options.
   * @param fakerInstance - Locale-specific Faker instance.
   * @returns Generated value, or `null` on error.
   */
  private generateValue(
    fieldType: SemanticFieldType,
    mode: 'valid' | 'invalid',
    _options: ValueOptions,
    fakerInstance: typeof faker
  ): string | number | boolean | null {
    const { constraints = {}, element } = _options;

    // Try to use a registered strategy
    const strategy = this.strategyRegistry.getStrategy(fieldType);
    if (strategy) {
      // Build options for the strategy with the field type
      const strategyOptions: ValueOptions = {
        mode,
        constraints,
        element,
        fieldType: fieldType,
        faker: fakerInstance,
        emailDomain: this.config.emailDomain,
      };

      try {
        return strategy.generate(strategyOptions);
      } catch (error) {
        logger.warn(`Strategy failed for ${fieldType}:`, error);
        // Return null on error instead of falling back
        return null;
      }
    }

    // No strategy registered - return generic fallback
    logger.warn(`No strategy registered for field type: ${fieldType}`);

    // Return generic text as fallback
    return mode === 'invalid'
      ? fakerInstance.string.alpha(7)
      : fakerInstance.lorem.word();
  }

  /**
   * Cleans up resources.
   *
   * @remarks
   * Unsubscribes from atom changes and resets initialization state.
   */
  async destroy(): Promise<void> {
    this.initialized = false;

    // Unsubscribe from atom changes
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}
