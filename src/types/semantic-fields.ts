/**
 * Semantic field type definitions and registry for form field detection.
 *
 * @remarks
 * Provides a comprehensive registry of semantic field types with detection patterns,
 * constraints, and metadata. This registry powers the FieldDetector to automatically
 * identify field types based on HTML attributes, labels, placeholders, and context.
 *
 * **Key Components:**
 * - `FieldCategory`: Organizes field types into logical categories
 * - `SemanticFieldType`: Enumeration of all supported field types (100+ types)
 * - `FieldTypeMetadata`: Metadata structure for each field type
 * - `FIELD_TYPE_REGISTRY`: Complete registry mapping types to metadata
 *
 * **Detection Strategy:**
 * Each field type includes patterns for:
 * - HTML input types (e.g., `email`, `tel`, `text`)
 * - Name/ID attributes (regex patterns)
 * - Placeholder text (regex patterns)
 * - Label text (regex patterns)
 *
 * **Supported Categories:**
 * - Personal: Names, SSN, national IDs
 * - Contact: Email, phone, fax
 * - Business: Company, job title, department
 * - Financial: Credit cards, bank accounts
 * - Location: Address, city, state, postal code
 * - Temporal: Dates, times, birth dates
 * - Technical: Passwords, UUIDs, IP addresses
 *
 * @example
 * Using the registry:
 * ```ts
 * import { FIELD_TYPE_REGISTRY, SemanticFieldType } from './semantic-fields';
 *
 * // Get metadata for email field
 * const emailMeta = FIELD_TYPE_REGISTRY[SemanticFieldType.EMAIL];
 * console.log(emailMeta.displayName); // "Email Address"
 * console.log(emailMeta.inputTypes); // Set {"email", "text"}
 *
 * // Check if a name matches email patterns
 * const isEmail = emailMeta.namePatterns.some(pattern =>
 *   pattern.test('user_email')
 * ); // true
 * ```
 */

/**
 * Semantic field type categories for organizing field types.
 *
 * @remarks
 * Each category groups related field types together for easier
 * management and lookup. Used for filtering and organizing the field registry.
 */
export const FieldCategory = {
  /** Personal information: names, SSN, national IDs */
  PERSONAL: 'personal',
  /** Business information: company, job title, department */
  BUSINESS: 'business',
  /** Financial information: credit cards, bank accounts */
  FINANCIAL: 'financial',
  /** Contact information: email, phone, fax */
  CONTACT: 'contact',
  /** Location information: address, city, state, postal code */
  LOCATION: 'location',
  /** Temporal information: dates, times, birth dates */
  TEMPORAL: 'temporal',
  /** Technical information: passwords, UUIDs, IP addresses */
  TECHNICAL: 'technical',
  /** Custom field types */
  CUSTOM: 'custom',
} as const;

export type FieldCategory = (typeof FieldCategory)[keyof typeof FieldCategory];

/**
 * Supported semantic field types enumeration.
 *
 * @remarks
 * Defines all field types that FillKit can detect and autofill.
 * Organized by category for easier reference. Includes 100+ field types
 * covering personal, business, financial, contact, location, temporal,
 * and technical data.
 *
 * **Naming Convention:**
 * - Dot notation for hierarchical types (e.g., `name.given`, `address.line1`)
 * - Descriptive names for standalone types (e.g., `email`, `phone`)
 * - Category prefixes for related types (e.g., `creditCard.number`, `creditCard.cvv`)
 */
export const SemanticFieldType = {
  // Personal Information
  NAME_GIVEN: 'name.given',
  NAME_FAMILY: 'name.family',
  FULL_NAME: 'fullName',
  MIDDLE_NAME: 'middleName',
  PREFIX: 'name.prefix',
  SUFFIX: 'name.suffix',
  SSN: 'ssn',
  TAX_ID: 'taxId',
  NATIONAL_ID: 'nationalId',

  // Contact Information
  EMAIL: 'email',
  USERNAME: 'username',
  PHONE: 'phone',
  COUNTRY_CODE: 'countryCode',
  FAX: 'fax',

  // Business Information
  COMPANY: 'company',
  JOB_TITLE: 'jobTitle',
  DEPARTMENT: 'department',
  WEBSITE: 'website',
  URL: 'url',
  DOMAIN: 'domain',

  // Financial Information
  CREDIT_CARD_NUMBER: 'creditCard.number',
  CREDIT_CARD_CVV: 'creditCard.cvv',
  CREDIT_CARD_EXP_MONTH: 'creditCard.expMonth',
  CREDIT_CARD_EXP_YEAR: 'creditCard.expYear',
  CREDIT_CARD_EXPIRY: 'creditCard.expiry',
  CURRENCY: 'currency',
  CURRENCY_CODE: 'currencyCode',
  ACCOUNT_NUMBER: 'accountNumber',
  ROUTING_NUMBER: 'routingNumber',
  BANK_NAME: 'bankName',
  IBAN: 'iban',
  BIC: 'bic',
  BITCOIN_ADDRESS: 'bitcoinAddress',
  ETHEREUM_ADDRESS: 'ethereumAddress',

  // Location Information
  ADDRESS_LINE1: 'address.line1',
  ADDRESS_LINE2: 'address.line2',
  CITY: 'city',
  STATE: 'state',
  PROVINCE: 'province',
  POSTAL_CODE: 'postalCode',
  ZIP_CODE: 'zipCode',
  COUNTRY: 'country',
  REGION: 'region',
  LATITUDE: 'latitude',
  LONGITUDE: 'longitude',

  // Temporal Information
  DATE: 'date',
  DATETIME: 'datetime',
  TIME: 'time',
  MONTH: 'month',
  WEEK: 'week',
  BIRTH_DATE: 'birthDate',
  AGE: 'age',
  WEEKDAY: 'weekday',
  MONTH_NAME: 'monthName',

  // Technical Information
  PASSWORD: 'password',
  CONFIRM_PASSWORD: 'confirmPassword',
  NUMBER_GENERIC: 'number.generic',
  INTEGER: 'integer',
  DECIMAL: 'decimal',
  PERCENTAGE: 'percentage',
  RANGE: 'range',
  TEXTAREA_GENERIC: 'textarea.generic',
  SELECT_GENERIC: 'select.generic',
  BOOLEAN: 'boolean',
  COLOR: 'color',
  FILE: 'file',
  IMAGE: 'image',
  UUID: 'uuid',
  GUID: 'guid',
  IP_ADDRESS: 'ipAddress',
  IPV4: 'ipv4',
  IPV6: 'ipv6',
  SLUG: 'slug',
  URL_SLUG: 'urlSlug',
  OTP_CODE: 'otpCode',
  PIN_CODE: 'pinCode',
  VERIFICATION_CODE: 'verificationCode',
  TIMEZONE: 'timezone',
  LANGUAGE: 'language',
  LOCALE: 'locale',

  // Location (granular)
  BUILDING_NUMBER: 'buildingNumber',
  STREET: 'street',
  CONTINENT: 'continent',

  // Vehicle Information
  VIN: 'vin',
  LICENSE_PLATE: 'licensePlate',
  VEHICLE_MAKE: 'vehicleMake',
  VEHICLE_MODEL: 'vehicleModel',
  VEHICLE_TYPE: 'vehicleType',
  VEHICLE_FUEL: 'vehicleFuel',
  VEHICLE_COLOR: 'vehicleColor',

  // Product Identifiers
  ISBN: 'isbn',
  UPC: 'upc',
  SKU: 'sku',

  // Biometric/Health
  HEIGHT: 'height',
  WEIGHT: 'weight',
  BLOOD_TYPE: 'bloodType',

  // Education
  DEGREE: 'degree',
  GPA: 'gpa',
  GRADUATION_YEAR: 'graduationYear',

  // Personal (extended)
  GENDER: 'gender',
  SEX: 'sex',

  // Text (semantic)
  BIO: 'bio',
  DESCRIPTION: 'description',

  // Network/Hardware
  MAC_ADDRESS: 'macAddress',
  IMEI: 'imei',

  // Tokens/Identifiers (technical)
  JWT: 'jwt',
  NANOID: 'nanoid',
  ULID: 'ulid',
  SEMVER: 'semver',

  // Internet (extended)
  DISPLAY_NAME: 'displayName',
  USER_AGENT: 'userAgent',

  // Airline
  AIRLINE_NAME: 'airlineName',
  FLIGHT_NUMBER: 'flightNumber',
  SEAT_NUMBER: 'seatNumber',
  AIRPORT_CODE: 'airportCode',
  RECORD_LOCATOR: 'recordLocator',

  // Food
  FOOD_DISH: 'foodDish',
  FOOD_INGREDIENT: 'foodIngredient',
  FOOD_DESCRIPTION: 'foodDescription',
  CUISINE_TYPE: 'cuisineType',

  // Book
  BOOK_TITLE: 'bookTitle',
  BOOK_AUTHOR: 'bookAuthor',
  BOOK_GENRE: 'bookGenre',
  BOOK_PUBLISHER: 'bookPublisher',

  // Music
  MUSIC_GENRE: 'musicGenre',
  SONG_NAME: 'songName',
  MUSIC_ARTIST: 'musicArtist',

  // Science
  CHEMICAL_ELEMENT: 'chemicalElement',
  SCIENCE_UNIT: 'scienceUnit',

  // DevTools
  MONGODB_ID: 'mongodbId',
  COMMIT_SHA: 'commitSha',
  GIT_BRANCH: 'gitBranch',
  COMMIT_MESSAGE: 'commitMessage',
  DATABASE_COLUMN: 'databaseColumn',
  DATABASE_TYPE: 'databaseType',
  DATABASE_ENGINE: 'databaseEngine',

  // Animal
  ANIMAL_TYPE: 'animalType',
  PET_NAME: 'petName',
  DOG_BREED: 'dogBreed',
  CAT_BREED: 'catBreed',

  // Special Types
  SEARCH: 'search',
  CAPTCHA: 'captcha',
  HIDDEN: 'hidden',
  SUBMIT: 'submit',
  RESET: 'reset',
  BUTTON: 'button',
} as const;

export type SemanticFieldType =
  (typeof SemanticFieldType)[keyof typeof SemanticFieldType];

/**
 * Field type metadata interface.
 *
 * @remarks
 * Contains all information needed to detect and validate a specific field type.
 * Used by FieldDetector to match DOM elements to semantic types based on
 * HTML attributes, patterns, and context.
 */
export interface FieldTypeMetadata {
  /** The semantic field type identifier */
  type: SemanticFieldType;

  /** Category this field belongs to */
  category: FieldCategory;

  /** Human-readable display name */
  displayName: string;

  /** Description of the field type */
  description: string;

  /**
   * Common HTML input types that map to this semantic type.
   *
   * @remarks
   * Used as a primary detection signal. For example, `type="email"`
   * strongly suggests an email field.
   */
  inputTypes: ReadonlySet<string>;

  /**
   * Common name/id patterns that indicate this type.
   *
   * @remarks
   * Regex patterns tested against element name and ID attributes.
   * Case-insensitive matching is typically used.
   */
  namePatterns: RegExp[];

  /**
   * Common placeholder patterns.
   *
   * @remarks
   * Regex patterns tested against placeholder attribute text.
   */
  placeholderPatterns: RegExp[];

  /**
   * Common label patterns.
   *
   * @remarks
   * Regex patterns tested against associated label text.
   */
  labelPatterns: RegExp[];

  /** Whether this field supports valid/invalid modes */
  supportsValidation: boolean;

  /**
   * Default constraints for this field type.
   *
   * @remarks
   * Used when generating values to ensure they meet typical requirements.
   */
  defaultConstraints?: {
    /** Minimum numeric value */
    min?: number;
    /** Maximum numeric value */
    max?: number;
    /** Minimum text length */
    minlength?: number;
    /** Maximum text length */
    maxlength?: number;
    /** Validation pattern regex */
    pattern?: string;
    /** Numeric step value */
    step?: number;
  };
}

/**
 * Complete field type registry mapping semantic types to their metadata.
 *
 * @remarks
 * This registry is used by the FieldDetector to detect field types based on
 * HTML attributes, patterns, and context. Each entry contains comprehensive
 * metadata for detection and validation.
 *
 * **Registry Structure:**
 * - Display name and description for each field type
 * - HTML input types that map to this semantic type
 * - Name/ID/placeholder/label patterns for detection
 * - Validation support flag
 * - Default constraints (min/max length, patterns, etc.)
 *
 * **Detection Process:**
 * 1. Check HTML input type for direct matches
 * 2. Test name/ID against namePatterns
 * 3. Test placeholder against placeholderPatterns
 * 4. Test label text against labelPatterns
 * 5. Combine signals to determine best match with confidence score
 *
 * @example
 * Accessing registry data:
 * ```ts
 * // Get email field metadata
 * const emailMeta = FIELD_TYPE_REGISTRY[SemanticFieldType.EMAIL];
 *
 * // Check if input type matches
 * const inputType = 'email';
 * const matches = emailMeta.inputTypes.has(inputType); // true
 *
 * // Test name pattern
 * const fieldName = 'user_email';
 * const nameMatches = emailMeta.namePatterns.some(p => p.test(fieldName)); // true
 * ```
 */
export const FIELD_TYPE_REGISTRY: Record<SemanticFieldType, FieldTypeMetadata> =
  {
    // Personal Information
    [SemanticFieldType.NAME_GIVEN]: {
      type: SemanticFieldType.NAME_GIVEN,
      category: FieldCategory.PERSONAL,
      displayName: 'First Name',
      description: 'Given or first name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^first[_-]?name$/i,
        /^given[_-]?name$/i,
        /^fname$/i,
        /^f[_-]?name$/i,
        /first$/i,
        /forename/i,
        /^prenom$/i, // French
        /^nombre$/i, // Spanish
        /^vorname$/i, // German
      ],
      placeholderPatterns: [/first name/i, /given name/i, /forename/i],
      labelPatterns: [/first name/i, /given name/i, /fname/i, /forename/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 50 },
    },

    [SemanticFieldType.NAME_FAMILY]: {
      type: SemanticFieldType.NAME_FAMILY,
      category: FieldCategory.PERSONAL,
      displayName: 'Last Name',
      description: 'Family or last name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^last[_-]?name$/i,
        /^family[_-]?name$/i,
        /^surname$/i,
        /^lname$/i,
        /^l[_-]?name$/i,
        /last$/i,
        /^nom$/i, // French
        /^apellido$/i, // Spanish
        /^nachname$/i, // German
      ],
      placeholderPatterns: [/last name/i, /family name/i, /surname/i],
      labelPatterns: [/last name/i, /family name/i, /surname/i, /lname/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 50 },
    },

    [SemanticFieldType.FULL_NAME]: {
      type: SemanticFieldType.FULL_NAME,
      category: FieldCategory.PERSONAL,
      displayName: 'Full Name',
      description: 'Complete name (first + last)',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^full[_-]?name$/i,
        /^name$/i,
        /^full_name$/i,
        /^complete[_-]?name$/i,
        /^display[_-]?name$/i,
        /^legal[_-]?name$/i,
        /^nom[_-]?complet$/i, // French
        /^nombre[_-]?completo$/i, // Spanish
        /^vollstandiger[_-]?name$/i, // German
      ],
      placeholderPatterns: [
        /full name/i,
        /your name/i,
        /complete name/i,
        /enter.*name/i,
        /john doe/i,
      ],
      labelPatterns: [/full name/i, /your name/i, /complete name/i, /name/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 2, maxlength: 100 },
    },

    [SemanticFieldType.MIDDLE_NAME]: {
      type: SemanticFieldType.MIDDLE_NAME,
      category: FieldCategory.PERSONAL,
      displayName: 'Middle Name',
      description: 'Middle name or initial',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^middle[_-]?name$/i,
        /^mname$/i,
        /^m[_-]?name$/i,
        /^middle[_-]?initial$/i,
        /^second[_-]?name$/i,
      ],
      placeholderPatterns: [/middle name/i, /middle initial/i, /optional/i],
      labelPatterns: [/middle name/i, /mname/i, /middle initial/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 50 },
    },

    [SemanticFieldType.PREFIX]: {
      type: SemanticFieldType.PREFIX,
      category: FieldCategory.PERSONAL,
      displayName: 'Name Prefix',
      description: 'Title or prefix (Mr., Mrs., Dr., etc.)',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [
        /prefix/i,
        /^title$/i,
        /[_-]title$/i,
        /^title[_-]/i,
        /salutation/i,
      ],
      placeholderPatterns: [/prefix/i, /\btitle\b/i],
      labelPatterns: [/prefix/i, /\btitle\b/i, /salutation/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 10 },
    },

    [SemanticFieldType.SUFFIX]: {
      type: SemanticFieldType.SUFFIX,
      category: FieldCategory.PERSONAL,
      displayName: 'Name Suffix',
      description: 'Name suffix (Jr., Sr., III, etc.)',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/suffix/i],
      placeholderPatterns: [/suffix/i],
      labelPatterns: [/suffix/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 10 },
    },

    // Contact Information
    [SemanticFieldType.EMAIL]: {
      type: SemanticFieldType.EMAIL,
      category: FieldCategory.CONTACT,
      displayName: 'Email Address',
      description: 'Email address',
      inputTypes: new Set(['email', 'text']),
      namePatterns: [
        /^email$/i,
        /^e[_-]?mail$/i,
        /email[_-]?address/i,
        /^mail$/i,
        /user[_-]?email/i,
        /contact[_-]?email/i,
        /work[_-]?email/i,
        /personal[_-]?email/i,
        /^courriel$/i, // French
        /^correo$/i, // Spanish
      ],
      placeholderPatterns: [
        /email/i,
        /your email/i,
        /enter.*email/i,
        /e-mail/i,
      ],
      labelPatterns: [/email/i, /e-mail/i, /email address/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 5, maxlength: 254 },
    },

    [SemanticFieldType.USERNAME]: {
      type: SemanticFieldType.USERNAME,
      category: FieldCategory.CONTACT,
      displayName: 'Username',
      description: 'Username or login name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^username$/i,
        /^user[_-]?name$/i,
        /^login$/i,
        /^login[_-]?name$/i,
        /^user[_-]?id$/i,
        /^account[_-]?name$/i,
        /^screen[_-]?name$/i,
        /^handle$/i,
      ],
      placeholderPatterns: [
        /username/i,
        /login/i,
        /account name/i,
        /your username/i,
      ],
      labelPatterns: [/username/i, /login/i, /user id/i, /account name/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 50 },
    },

    [SemanticFieldType.PHONE]: {
      type: SemanticFieldType.PHONE,
      category: FieldCategory.CONTACT,
      displayName: 'Phone Number',
      description: 'Phone number',
      inputTypes: new Set(['tel', 'text']),
      namePatterns: [
        /^phone$/i,
        /^tel$/i,
        /^telephone$/i,
        /phone[_-]?number/i,
        /mobile/i,
        /cell/i,
        /contact[_-]?number/i,
        /home[_-]?phone/i,
        /work[_-]?phone/i,
        /^telefono$/i, // Spanish
        /^telefon$/i, // German
      ],
      placeholderPatterns: [
        /phone/i,
        /telephone/i,
        /mobile/i,
        /cell/i,
        /\d{3}.*\d{3}.*\d{4}/,
      ],
      labelPatterns: [/phone/i, /telephone/i, /mobile/i, /contact number/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 10, maxlength: 20 },
    },

    [SemanticFieldType.COUNTRY_CODE]: {
      type: SemanticFieldType.COUNTRY_CODE,
      category: FieldCategory.CONTACT,
      displayName: 'Country Code',
      description: 'Phone country code',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/country[_-]?code/i, /dial[_-]?code/i],
      placeholderPatterns: [/country code/i],
      labelPatterns: [/country code/i, /dial code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 4 },
    },

    [SemanticFieldType.FAX]: {
      type: SemanticFieldType.FAX,
      category: FieldCategory.CONTACT,
      displayName: 'Fax Number',
      description: 'Fax number',
      inputTypes: new Set(['tel', 'text']),
      namePatterns: [/fax/i],
      placeholderPatterns: [/fax/i],
      labelPatterns: [/fax/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 10, maxlength: 20 },
    },

    // Business Information
    [SemanticFieldType.COMPANY]: {
      type: SemanticFieldType.COMPANY,
      category: FieldCategory.BUSINESS,
      displayName: 'Company',
      description: 'Company or organization name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^company$/i,
        /^company[_-]?name$/i,
        /^organization$/i,
        /^organization[_-]?name$/i,
        /^org$/i,
        /^business$/i,
        /^business[_-]?name$/i,
        /^employer$/i,
        /^entreprise$/i, // French
        /^empresa$/i, // Spanish
        /^firma$/i, // German
      ],
      placeholderPatterns: [
        /company/i,
        /organization/i,
        /employer/i,
        /business name/i,
      ],
      labelPatterns: [/company/i, /organization/i, /business/i, /employer/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 100 },
    },

    [SemanticFieldType.JOB_TITLE]: {
      type: SemanticFieldType.JOB_TITLE,
      category: FieldCategory.BUSINESS,
      displayName: 'Job Title',
      description: 'Job title or position',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^job[_-]?title$/i,
        /^position$/i,
        /^job[_-]?position$/i,
        /^occupation$/i,
        /^role$/i,
        /^job[_-]?role$/i,
        /^poste$/i, // French
        /^cargo$/i, // Spanish
        /^beruf$/i, // German
      ],
      placeholderPatterns: [
        /job title/i,
        /position/i,
        /occupation/i,
        /your role/i,
      ],
      labelPatterns: [/job title/i, /position/i, /role/i, /occupation/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 100 },
    },

    [SemanticFieldType.DEPARTMENT]: {
      type: SemanticFieldType.DEPARTMENT,
      category: FieldCategory.BUSINESS,
      displayName: 'Department',
      description: 'Department or division',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/department/i, /division/i, /dept/i],
      placeholderPatterns: [/department/i],
      labelPatterns: [/department/i, /division/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 100 },
    },

    [SemanticFieldType.WEBSITE]: {
      type: SemanticFieldType.WEBSITE,
      category: FieldCategory.BUSINESS,
      displayName: 'Website',
      description: 'Website URL',
      inputTypes: new Set(['url', 'text']),
      namePatterns: [
        /^website$/i,
        /^web[_-]?site$/i,
        /^site$/i,
        /^web[_-]?page$/i,
        /^homepage$/i,
        /^url$/i,
        /^web[_-]?address$/i,
        /^site[_-]?web$/i, // French
      ],
      placeholderPatterns: [
        /website/i,
        /your website/i,
        /https?:\/\//i,
        /www\./i,
        /example\.com/i,
      ],
      labelPatterns: [/website/i, /web site/i, /homepage/i, /\burl\b/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 200 },
    },

    [SemanticFieldType.URL]: {
      type: SemanticFieldType.URL,
      category: FieldCategory.TECHNICAL,
      displayName: 'URL',
      description: 'Uniform Resource Locator',
      inputTypes: new Set(['url', 'text']),
      namePatterns: [
        /^url$/i,
        /[_-]url$/i,
        /^url[_-]/i,
        /^link$/i,
        /[_-]link$/i,
        /^link[_-]/i,
      ],
      placeholderPatterns: [/\burl\b/i, /\blink\b/i],
      labelPatterns: [/\burl\b/i, /\blink\b/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 200 },
    },

    [SemanticFieldType.DOMAIN]: {
      type: SemanticFieldType.DOMAIN,
      category: FieldCategory.TECHNICAL,
      displayName: 'Domain',
      description: 'Domain name',
      inputTypes: new Set(['text']),
      namePatterns: [/domain/i],
      placeholderPatterns: [/domain/i],
      labelPatterns: [/domain/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 100 },
    },

    // Financial Information
    [SemanticFieldType.CREDIT_CARD_NUMBER]: {
      type: SemanticFieldType.CREDIT_CARD_NUMBER,
      category: FieldCategory.FINANCIAL,
      displayName: 'Credit Card Number',
      description: 'Credit card number',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^card[_-]?number$/i,
        /^credit[_-]?card$/i,
        /^cc[_-]?number$/i,
        /^ccnumber$/i,
        /^cardnumber$/i,
        /card[_-]?num$/i,
        /payment[_-]?card/i,
        /^numero[_-]?de[_-]?carte$/i, // French
        /^numero[_-]?de[_-]?tarjeta$/i, // Spanish
        /^kartennummer$/i, // German
      ],
      placeholderPatterns: [
        /card number/i,
        /credit card/i,
        /\d{4}.*\d{4}.*\d{4}.*\d{4}/,
      ],
      labelPatterns: [/card number/i, /credit card/i, /payment card/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 13, maxlength: 19 },
    },

    [SemanticFieldType.CREDIT_CARD_CVV]: {
      type: SemanticFieldType.CREDIT_CARD_CVV,
      category: FieldCategory.FINANCIAL,
      displayName: 'CVV',
      description: 'Credit card security code',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^cvv$/i,
        /^cvc$/i,
        /^csc$/i,
        /^cvv2$/i,
        /security[_-]?code/i,
        /card[_-]?code/i,
        /verification[_-]?code/i,
        /card[_-]?security/i,
      ],
      placeholderPatterns: [/cvv/i, /cvc/i, /security code/i, /\d{3}/],
      labelPatterns: [/cvv/i, /cvc/i, /security code/i, /card code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 4 },
    },

    [SemanticFieldType.CREDIT_CARD_EXP_MONTH]: {
      type: SemanticFieldType.CREDIT_CARD_EXP_MONTH,
      category: FieldCategory.FINANCIAL,
      displayName: 'Expiration Month',
      description: 'Credit card expiration month',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/exp[_-]?month/i, /expiry[_-]?month/i],
      placeholderPatterns: [/month/i],
      labelPatterns: [/expiration month/i, /expiry month/i],
      supportsValidation: true,
      defaultConstraints: { min: 1, max: 12 },
    },

    [SemanticFieldType.CREDIT_CARD_EXP_YEAR]: {
      type: SemanticFieldType.CREDIT_CARD_EXP_YEAR,
      category: FieldCategory.FINANCIAL,
      displayName: 'Expiration Year',
      description: 'Credit card expiration year',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/exp[_-]?year/i, /expiry[_-]?year/i],
      placeholderPatterns: [/year/i],
      labelPatterns: [/expiration year/i, /expiry year/i],
      supportsValidation: true,
      defaultConstraints: {
        min: new Date().getFullYear(),
        max: new Date().getFullYear() + 20,
      },
    },

    [SemanticFieldType.CREDIT_CARD_EXPIRY]: {
      type: SemanticFieldType.CREDIT_CARD_EXPIRY,
      category: FieldCategory.FINANCIAL,
      displayName: 'Card Expiry Date',
      description: 'Combined credit card expiration date (MM/YY)',
      inputTypes: new Set(['text']),
      namePatterns: [
        /credit[_-]?card[_-]?expir/i,
        /cc[_-]?expir/i,
        /card[_-]?expir/i,
        /expiry[_-]?date/i,
        /exp[_-]?date/i,
        /expiration[_-]?date/i,
        /^expiry$/i,
        /^expiration$/i,
      ],
      placeholderPatterns: [/mm\s*\/\s*yy/i, /expir/i],
      labelPatterns: [/expir/i, /mm\s*\/\s*yy/i],
      supportsValidation: true,
      defaultConstraints: {},
    },

    [SemanticFieldType.CURRENCY]: {
      type: SemanticFieldType.CURRENCY,
      category: FieldCategory.FINANCIAL,
      displayName: 'Currency Amount',
      description: 'Monetary amount',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [
        /amount/i,
        /price/i,
        /cost/i,
        /^fee$/i,
        /[_-]fee$/i,
        /^fee[_-]/i,
        /total/i,
      ],
      placeholderPatterns: [/amount/i, /price/i],
      labelPatterns: [/amount/i, /price/i, /cost/i],
      supportsValidation: true,
      defaultConstraints: { min: 0 },
    },

    [SemanticFieldType.ACCOUNT_NUMBER]: {
      type: SemanticFieldType.ACCOUNT_NUMBER,
      category: FieldCategory.FINANCIAL,
      displayName: 'Account Number',
      description: 'Bank account number',
      inputTypes: new Set(['text']),
      namePatterns: [/account[_-]?number/i, /acct[_-]?number/i],
      placeholderPatterns: [/account number/i],
      labelPatterns: [/account number/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 20 },
    },

    [SemanticFieldType.ROUTING_NUMBER]: {
      type: SemanticFieldType.ROUTING_NUMBER,
      category: FieldCategory.FINANCIAL,
      displayName: 'Routing Number',
      description: 'Bank routing number',
      inputTypes: new Set(['text']),
      namePatterns: [/routing[_-]?number/i, /routing/i],
      placeholderPatterns: [/routing number/i],
      labelPatterns: [/routing number/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 9, maxlength: 9 },
    },

    [SemanticFieldType.BANK_NAME]: {
      type: SemanticFieldType.BANK_NAME,
      category: FieldCategory.FINANCIAL,
      displayName: 'Bank Name',
      description: 'Bank or financial institution name',
      inputTypes: new Set(['text']),
      namePatterns: [/bank[_-]?name/i, /bank/i],
      placeholderPatterns: [/bank name/i],
      labelPatterns: [/bank name/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 100 },
    },

    [SemanticFieldType.IBAN]: {
      type: SemanticFieldType.IBAN,
      category: FieldCategory.FINANCIAL,
      displayName: 'IBAN',
      description: 'International Bank Account Number',
      inputTypes: new Set(['text']),
      namePatterns: [/iban/i, /international[_-]?bank/i],
      placeholderPatterns: [/iban/i, /DE\d{2}/i],
      labelPatterns: [/iban/i, /international bank/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 34 },
    },

    [SemanticFieldType.BIC]: {
      type: SemanticFieldType.BIC,
      category: FieldCategory.FINANCIAL,
      displayName: 'BIC/SWIFT',
      description: 'Bank Identifier Code / SWIFT code',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^bic$/i,
        /[_-]bic$/i,
        /^bic[_-]/i,
        /swift/i,
        /swift[_-]?code/i,
      ],
      placeholderPatterns: [/^bic$/i, /swift/i],
      labelPatterns: [/^bic$/i, /swift/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 11 },
    },

    [SemanticFieldType.BITCOIN_ADDRESS]: {
      type: SemanticFieldType.BITCOIN_ADDRESS,
      category: FieldCategory.FINANCIAL,
      displayName: 'Bitcoin Address',
      description: 'Bitcoin wallet address',
      inputTypes: new Set(['text']),
      namePatterns: [/bitcoin/i, /btc[_-]?address/i, /btc[_-]?wallet/i],
      placeholderPatterns: [/bitcoin/i, /\bbtc\b/i],
      labelPatterns: [/bitcoin/i, /\bbtc\b/i],
      supportsValidation: true,
    },

    [SemanticFieldType.ETHEREUM_ADDRESS]: {
      type: SemanticFieldType.ETHEREUM_ADDRESS,
      category: FieldCategory.FINANCIAL,
      displayName: 'Ethereum Address',
      description: 'Ethereum wallet address',
      inputTypes: new Set(['text']),
      namePatterns: [/ethereum/i, /eth[_-]?address/i, /eth[_-]?wallet/i],
      placeholderPatterns: [/ethereum/i, /\beth\b/i, /0x/i],
      labelPatterns: [/ethereum/i, /\beth\b/i],
      supportsValidation: true,
    },

    // Location Information
    [SemanticFieldType.ADDRESS_LINE1]: {
      type: SemanticFieldType.ADDRESS_LINE1,
      category: FieldCategory.LOCATION,
      displayName: 'Address Line 1',
      description: 'Primary address line',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^address$/i,
        /^address[_-]?1$/i,
        /^address[_-]?line[_-]?1$/i,
        /^street[_-]?address$/i,
        /^street$/i,
        /^addr$/i,
        /billing[_-]?address/i,
        /shipping[_-]?address/i,
        /^adresse$/i, // French/German
        /^direccion$/i, // Spanish
      ],
      placeholderPatterns: [
        /address/i,
        /street address/i,
        /street/i,
        /123 main st/i,
      ],
      labelPatterns: [/address/i, /street address/i, /address line 1/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 5, maxlength: 100 },
    },

    [SemanticFieldType.ADDRESS_LINE2]: {
      type: SemanticFieldType.ADDRESS_LINE2,
      category: FieldCategory.LOCATION,
      displayName: 'Address Line 2',
      description: 'Secondary address line (apartment, suite, etc.)',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^address[_-]?2$/i,
        /^address[_-]?line[_-]?2$/i,
        /^apt$/i,
        /^apartment$/i,
        /^suite$/i,
        /^unit$/i,
        /^floor$/i,
        /^building$/i,
        /appartement$/i, // French
        /piso$/i, // Spanish
      ],
      placeholderPatterns: [
        /\bapt\b/i,
        /suite/i,
        /unit/i,
        /apartment/i,
        /floor/i,
        /optional/i,
      ],
      labelPatterns: [
        /address line 2/i,
        /\bapt\b/i,
        /suite/i,
        /apartment/i,
        /unit/i,
      ],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.CITY]: {
      type: SemanticFieldType.CITY,
      category: FieldCategory.LOCATION,
      displayName: 'City',
      description: 'City name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /^city$/i,
        /^town$/i,
        /^locality$/i,
        /^ville$/i, // French
        /^ciudad$/i, // Spanish
        /^stadt$/i, // German
      ],
      placeholderPatterns: [/city/i, /town/i, /enter.*city/i],
      labelPatterns: [/city/i, /town/i, /locality/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 50 },
    },

    [SemanticFieldType.STATE]: {
      type: SemanticFieldType.STATE,
      category: FieldCategory.LOCATION,
      displayName: 'State',
      description: 'State or province',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [
        /^state$/i,
        /^state[_-]?province$/i,
        /^region$/i,
        /^etat$/i, // French
        /^estado$/i, // Spanish
        /^bundesland$/i, // German
      ],
      placeholderPatterns: [/state/i, /select.*state/i, /province/i],
      labelPatterns: [/state/i, /state\/province/i, /region/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.PROVINCE]: {
      type: SemanticFieldType.PROVINCE,
      category: FieldCategory.LOCATION,
      displayName: 'Province',
      description: 'Province or state',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/province/i],
      placeholderPatterns: [/province/i],
      labelPatterns: [/province/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.POSTAL_CODE]: {
      type: SemanticFieldType.POSTAL_CODE,
      category: FieldCategory.LOCATION,
      displayName: 'Postal Code',
      description: 'Postal or ZIP code',
      inputTypes: new Set(['text']),
      namePatterns: [/postal[_-]?code/i, /postcode/i],
      placeholderPatterns: [/postal code/i],
      labelPatterns: [/postal code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 10 },
    },

    [SemanticFieldType.ZIP_CODE]: {
      type: SemanticFieldType.ZIP_CODE,
      category: FieldCategory.LOCATION,
      displayName: 'ZIP Code',
      description: 'ZIP code (US)',
      inputTypes: new Set(['text']),
      namePatterns: [/^zip[_-]?code$/i, /^zip$/i, /^zipcode$/i, /postal$/i],
      placeholderPatterns: [/zip code/i, /zip/i, /\d{5}/],
      labelPatterns: [/zip code/i, /zip/i, /postal/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 5, maxlength: 10 },
    },

    [SemanticFieldType.COUNTRY]: {
      type: SemanticFieldType.COUNTRY,
      category: FieldCategory.LOCATION,
      displayName: 'Country',
      description: 'Country name',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [
        /^country$/i,
        /^country[_-]?name$/i,
        /^nation$/i,
        /^pays$/i, // French
        /^pais$/i, // Spanish
        /^land$/i, // German
      ],
      placeholderPatterns: [/country/i, /select.*country/i, /choose.*country/i],
      labelPatterns: [/country/i, /nation/i, /country name/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.REGION]: {
      type: SemanticFieldType.REGION,
      category: FieldCategory.LOCATION,
      displayName: 'Region',
      description: 'Geographic region',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/region/i],
      placeholderPatterns: [/region/i],
      labelPatterns: [/region/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.LATITUDE]: {
      type: SemanticFieldType.LATITUDE,
      category: FieldCategory.LOCATION,
      displayName: 'Latitude',
      description: 'Geographic latitude',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [/^lat$/i, /[_-]lat$/i, /^lat[_-]/i, /latitude/i],
      placeholderPatterns: [/latitude/i],
      labelPatterns: [/latitude/i],
      supportsValidation: true,
      defaultConstraints: { min: -90, max: 90 },
    },

    [SemanticFieldType.LONGITUDE]: {
      type: SemanticFieldType.LONGITUDE,
      category: FieldCategory.LOCATION,
      displayName: 'Longitude',
      description: 'Geographic longitude',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [
        /^lng$/i,
        /^lon$/i,
        /[_-]lng$/i,
        /[_-]lon$/i,
        /longitude/i,
      ],
      placeholderPatterns: [/longitude/i],
      labelPatterns: [/longitude/i],
      supportsValidation: true,
      defaultConstraints: { min: -180, max: 180 },
    },

    // Temporal Information
    [SemanticFieldType.DATE]: {
      type: SemanticFieldType.DATE,
      category: FieldCategory.TEMPORAL,
      displayName: 'Date',
      description: 'Date value',
      inputTypes: new Set(['date']),
      namePatterns: [
        /^date$/i,
        /^date[_-]?field$/i,
        /^event[_-]?date$/i,
        /^start[_-]?date$/i,
        /^end[_-]?date$/i,
        /^appointment[_-]?date$/i,
        /^fecha$/i, // Spanish
        /^datum$/i, // German
        /^date$/i, // French (same as English)
      ],
      placeholderPatterns: [
        /date/i,
        /select.*date/i,
        /choose.*date/i,
        /mm\/dd\/yyyy/i,
        /dd\/mm\/yyyy/i,
      ],
      labelPatterns: [/date/i, /event date/i, /appointment/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DATETIME]: {
      type: SemanticFieldType.DATETIME,
      category: FieldCategory.TEMPORAL,
      displayName: 'Date and Time',
      description: 'Date and time value',
      inputTypes: new Set(['datetime-local']),
      namePatterns: [/datetime/i, /date[_-]?time/i],
      placeholderPatterns: [/date and time/i],
      labelPatterns: [/date and time/i],
      supportsValidation: true,
    },

    [SemanticFieldType.TIME]: {
      type: SemanticFieldType.TIME,
      category: FieldCategory.TEMPORAL,
      displayName: 'Time',
      description: 'Time value',
      inputTypes: new Set(['time']),
      namePatterns: [/time/i],
      placeholderPatterns: [/time/i],
      labelPatterns: [/time/i],
      supportsValidation: true,
    },

    [SemanticFieldType.MONTH]: {
      type: SemanticFieldType.MONTH,
      category: FieldCategory.TEMPORAL,
      displayName: 'Month',
      description: 'Month and year input (YYYY-MM)',
      inputTypes: new Set(['month']),
      namePatterns: [/month/i, /month[_-]?year/i, /expir/i],
      placeholderPatterns: [/month/i, /select month/i, /mm\/yyyy/i],
      labelPatterns: [/month/i, /select month/i],
      supportsValidation: true,
    },

    [SemanticFieldType.WEEK]: {
      type: SemanticFieldType.WEEK,
      category: FieldCategory.TEMPORAL,
      displayName: 'Week',
      description: 'Year and week number input (YYYY-Wnn)',
      inputTypes: new Set(['week']),
      namePatterns: [/week/i, /week[_-]?number/i, /week[_-]?of[_-]?year/i],
      placeholderPatterns: [/week/i, /select week/i],
      labelPatterns: [/week/i, /week number/i],
      supportsValidation: true,
    },

    [SemanticFieldType.BIRTH_DATE]: {
      type: SemanticFieldType.BIRTH_DATE,
      category: FieldCategory.TEMPORAL,
      displayName: 'Birth Date',
      description: 'Date of birth',
      inputTypes: new Set(['date']),
      namePatterns: [
        /^birth[_-]?date$/i,
        /^dob$/i,
        /^date[_-]?of[_-]?birth$/i,
        /^birthday$/i,
        /^birthdate$/i,
        /^birth$/i,
        /^date[_-]?naissance$/i, // French
        /^fecha[_-]?nacimiento$/i, // Spanish
        /^geburtsdatum$/i, // German
      ],
      placeholderPatterns: [
        /birth date/i,
        /date of birth/i,
        /birthday/i,
        /\bdob\b/i,
        /mm\/dd\/yyyy/i,
      ],
      labelPatterns: [/birth date/i, /date of birth/i, /birthday/i, /\bdob\b/i],
      supportsValidation: true,
    },

    [SemanticFieldType.AGE]: {
      type: SemanticFieldType.AGE,
      category: FieldCategory.TEMPORAL,
      displayName: 'Age',
      description: 'Age in years',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [/^age$/i, /[_-]age$/i, /^age[_-]/i],
      placeholderPatterns: [/\bage\b/i],
      labelPatterns: [/\bage\b/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 150 },
    },

    [SemanticFieldType.WEEKDAY]: {
      type: SemanticFieldType.WEEKDAY,
      category: FieldCategory.TEMPORAL,
      displayName: 'Weekday',
      description: 'Day of the week name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /weekday/i,
        /day[_-]?of[_-]?week/i,
        /wochentag/i, // German
        /jour[_-]?semaine/i, // French
        /dia[_-]?semana/i, // Spanish
      ],
      placeholderPatterns: [/weekday/i, /day of week/i],
      labelPatterns: [/weekday/i, /day of the week/i],
      supportsValidation: true,
    },

    [SemanticFieldType.MONTH_NAME]: {
      type: SemanticFieldType.MONTH_NAME,
      category: FieldCategory.TEMPORAL,
      displayName: 'Month Name',
      description: 'Name of a month',
      inputTypes: new Set(['text']),
      namePatterns: [
        /month[_-]?name/i,
        /monat/i, // German
        /mois/i, // French
      ],
      placeholderPatterns: [/month name/i, /name of month/i],
      labelPatterns: [/month name/i],
      supportsValidation: true,
    },

    // Technical Information
    [SemanticFieldType.PASSWORD]: {
      type: SemanticFieldType.PASSWORD,
      category: FieldCategory.TECHNICAL,
      displayName: 'Password',
      description: 'Password field',
      inputTypes: new Set(['password']),
      namePatterns: [
        /^password$/i,
        /^passwd$/i,
        /^pwd$/i,
        /^pass$/i,
        /user[_-]?password/i,
        /current[_-]?password/i,
        /old[_-]?password/i,
        /new[_-]?password/i,
        /^mot[_-]?de[_-]?passe$/i, // French
        /^contrasena$/i, // Spanish
        /^passwort$/i, // German
      ],
      placeholderPatterns: [/password/i, /enter.*password/i, /your password/i],
      labelPatterns: [/password/i, /\bpass\b/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 8, maxlength: 128 },
    },

    [SemanticFieldType.CONFIRM_PASSWORD]: {
      type: SemanticFieldType.CONFIRM_PASSWORD,
      category: FieldCategory.TECHNICAL,
      displayName: 'Confirm Password',
      description: 'Password confirmation',
      inputTypes: new Set(['password']),
      namePatterns: [
        /confirm[_-]?password/i,
        /password[_-]?confirm/i,
        /verify[_-]?password/i,
      ],
      placeholderPatterns: [/confirm password/i],
      labelPatterns: [/confirm password/i, /verify password/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 8, maxlength: 128 },
    },

    [SemanticFieldType.NUMBER_GENERIC]: {
      type: SemanticFieldType.NUMBER_GENERIC,
      category: FieldCategory.TECHNICAL,
      displayName: 'Number',
      description: 'Generic numeric value',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [
        /^number$/i,
        /^num$/i,
        /^count$/i,
        /^quantity$/i,
        /^qty$/i,
        /^amount$/i,
        /^value$/i,
        /numero$/i, // French/Spanish
      ],
      placeholderPatterns: [
        /number/i,
        /enter.*number/i,
        /quantity/i,
        /amount/i,
      ],
      labelPatterns: [/number/i, /count/i, /quantity/i, /amount/i],
      supportsValidation: true,
    },

    [SemanticFieldType.INTEGER]: {
      type: SemanticFieldType.INTEGER,
      category: FieldCategory.TECHNICAL,
      displayName: 'Integer',
      description: 'Whole number',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [
        /integer/i,
        /^int$/i,
        /[_-]int$/i,
        /^int[_-]/i,
        /whole[_-]?number/i,
      ],
      placeholderPatterns: [/integer/i],
      labelPatterns: [/integer/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DECIMAL]: {
      type: SemanticFieldType.DECIMAL,
      category: FieldCategory.TECHNICAL,
      displayName: 'Decimal',
      description: 'Decimal number',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [/decimal/i, /float/i, /double/i],
      placeholderPatterns: [/decimal/i],
      labelPatterns: [/decimal/i],
      supportsValidation: true,
    },

    [SemanticFieldType.PERCENTAGE]: {
      type: SemanticFieldType.PERCENTAGE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Percentage',
      description: 'Percentage value',
      inputTypes: new Set(['number', 'text']),
      namePatterns: [
        /percent/i,
        /percentage/i,
        /^rate$/i,
        /[_-]rate$/i,
        /^rate[_-]/i,
      ],
      placeholderPatterns: [/percentage/i],
      labelPatterns: [/percentage/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 100 },
    },

    [SemanticFieldType.RANGE]: {
      type: SemanticFieldType.RANGE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Range Slider',
      description: 'Slider control for numeric input',
      inputTypes: new Set(['range']),
      namePatterns: [/range/i, /slider/i, /volume/i, /brightness/i, /opacity/i],
      placeholderPatterns: [],
      labelPatterns: [/range/i, /slider/i, /volume/i, /level/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 100, step: 1 },
    },

    [SemanticFieldType.TEXTAREA_GENERIC]: {
      type: SemanticFieldType.TEXTAREA_GENERIC,
      category: FieldCategory.TECHNICAL,
      displayName: 'Text Area',
      description: 'Multi-line text input',
      inputTypes: new Set(['textarea']),
      namePatterns: [
        /^message$/i,
        /^comment$/i,
        /^comments$/i,
        /^description$/i,
        /^notes$/i,
        /^details$/i,
        /^bio$/i,
        /^biography$/i,
        /^about$/i,
        /^feedback$/i,
        /^review$/i,
        /^text$/i,
        /^body$/i,
        /^content$/i,
        /comentario$/i, // Spanish
        /nachricht$/i, // German
        /message$/i, // French (same as English)
      ],
      placeholderPatterns: [
        /message/i,
        /comment/i,
        /enter.*text/i,
        /write.*here/i,
        /your.*message/i,
      ],
      labelPatterns: [
        /message/i,
        /comment/i,
        /description/i,
        /notes/i,
        /details/i,
        /feedback/i,
      ],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 1000 },
    },

    [SemanticFieldType.SELECT_GENERIC]: {
      type: SemanticFieldType.SELECT_GENERIC,
      category: FieldCategory.TECHNICAL,
      displayName: 'Select',
      description: 'Dropdown select element',
      inputTypes: new Set(['select']),
      namePatterns: [/select/i, /dropdown/i, /choice/i],
      placeholderPatterns: [/select/i, /choose/i, /pick/i],
      labelPatterns: [/select/i, /choose/i, /pick/i],
      supportsValidation: true,
      defaultConstraints: {},
    },

    [SemanticFieldType.BOOLEAN]: {
      type: SemanticFieldType.BOOLEAN,
      category: FieldCategory.TECHNICAL,
      displayName: 'Boolean',
      description: 'True/false value',
      inputTypes: new Set(['checkbox', 'radio']),
      namePatterns: [/agree/i, /accept/i, /terms/i, /newsletter/i],
      placeholderPatterns: [],
      labelPatterns: [/agree/i, /accept/i, /terms/i],
      supportsValidation: true,
    },

    [SemanticFieldType.COLOR]: {
      type: SemanticFieldType.COLOR,
      category: FieldCategory.TECHNICAL,
      displayName: 'Color',
      description: 'Color value',
      inputTypes: new Set(['color']),
      namePatterns: [/color/i, /colour/i],
      placeholderPatterns: [],
      labelPatterns: [/color/i, /colour/i],
      supportsValidation: true,
    },

    [SemanticFieldType.FILE]: {
      type: SemanticFieldType.FILE,
      category: FieldCategory.TECHNICAL,
      displayName: 'File',
      description: 'File upload',
      inputTypes: new Set(['file']),
      namePatterns: [/file/i, /upload/i, /attachment/i],
      placeholderPatterns: [],
      labelPatterns: [/file/i, /upload/i],
      supportsValidation: false,
    },

    [SemanticFieldType.IMAGE]: {
      type: SemanticFieldType.IMAGE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Image',
      description: 'Image upload',
      inputTypes: new Set(['file']),
      namePatterns: [/image/i, /photo/i, /picture/i, /avatar/i],
      placeholderPatterns: [],
      labelPatterns: [/image/i, /photo/i, /picture/i],
      supportsValidation: false,
    },

    // UUID/GUID
    [SemanticFieldType.UUID]: {
      type: SemanticFieldType.UUID,
      category: FieldCategory.TECHNICAL,
      displayName: 'UUID',
      description: 'Universally Unique Identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/uuid/i, /guid/i, /unique[_-]?id/i, /identifier/i],
      placeholderPatterns: [/uuid/i, /guid/i],
      labelPatterns: [/uuid/i, /guid/i, /unique.*id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 36, maxlength: 36 },
    },

    [SemanticFieldType.GUID]: {
      type: SemanticFieldType.GUID,
      category: FieldCategory.TECHNICAL,
      displayName: 'GUID',
      description: 'Globally Unique Identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/guid/i, /global[_-]?id/i],
      placeholderPatterns: [/guid/i],
      labelPatterns: [/guid/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 36, maxlength: 36 },
    },

    // IP Addresses
    [SemanticFieldType.IP_ADDRESS]: {
      type: SemanticFieldType.IP_ADDRESS,
      category: FieldCategory.TECHNICAL,
      displayName: 'IP Address',
      description: 'IP address (v4 or v6)',
      inputTypes: new Set(['text']),
      namePatterns: [/^ip$/i, /ip[_-]?address/i, /ip[_-]?addr/i],
      placeholderPatterns: [/ip address/i, /192\.168/i, /0\.0\.0\.0/i],
      labelPatterns: [/ip address/i, /\bip\b/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 7, maxlength: 45 },
    },

    [SemanticFieldType.IPV4]: {
      type: SemanticFieldType.IPV4,
      category: FieldCategory.TECHNICAL,
      displayName: 'IPv4 Address',
      description: 'IPv4 address',
      inputTypes: new Set(['text']),
      namePatterns: [/ipv4/i, /ip[_-]?v4/i],
      placeholderPatterns: [/ipv4/i, /192\.168/i],
      labelPatterns: [/ipv4/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 7, maxlength: 15 },
    },

    [SemanticFieldType.IPV6]: {
      type: SemanticFieldType.IPV6,
      category: FieldCategory.TECHNICAL,
      displayName: 'IPv6 Address',
      description: 'IPv6 address',
      inputTypes: new Set(['text']),
      namePatterns: [/ipv6/i, /ip[_-]?v6/i],
      placeholderPatterns: [/ipv6/i, /2001:0db8/i],
      labelPatterns: [/ipv6/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 45 },
    },

    [SemanticFieldType.MAC_ADDRESS]: {
      type: SemanticFieldType.MAC_ADDRESS,
      category: FieldCategory.TECHNICAL,
      displayName: 'MAC Address',
      description: 'Hardware MAC address',
      inputTypes: new Set(['text']),
      namePatterns: [/mac[_-]?address/i, /mac[_-]?addr/i, /hw[_-]?address/i],
      placeholderPatterns: [/mac address/i, /XX:XX:XX/i],
      labelPatterns: [/mac address/i, /hardware address/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 17, maxlength: 17 },
    },

    [SemanticFieldType.IMEI]: {
      type: SemanticFieldType.IMEI,
      category: FieldCategory.TECHNICAL,
      displayName: 'IMEI',
      description: 'International Mobile Equipment Identity',
      inputTypes: new Set(['text']),
      namePatterns: [/imei/i, /device[_-]?id/i],
      placeholderPatterns: [/imei/i],
      labelPatterns: [/imei/i, /device id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 15, maxlength: 15 },
    },

    [SemanticFieldType.JWT]: {
      type: SemanticFieldType.JWT,
      category: FieldCategory.TECHNICAL,
      displayName: 'JWT Token',
      description: 'JSON Web Token',
      inputTypes: new Set(['text', 'textarea']),
      namePatterns: [/jwt/i, /json[_-]?web[_-]?token/i, /auth[_-]?token/i],
      placeholderPatterns: [/jwt/i, /token/i, /eyJ/i],
      labelPatterns: [/jwt/i, /token/i],
      supportsValidation: true,
    },

    [SemanticFieldType.NANOID]: {
      type: SemanticFieldType.NANOID,
      category: FieldCategory.TECHNICAL,
      displayName: 'Nano ID',
      description: 'Nano ID unique identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/nanoid/i, /nano[_-]?id/i],
      placeholderPatterns: [/nanoid/i],
      labelPatterns: [/nanoid/i, /nano id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 21, maxlength: 21 },
    },

    [SemanticFieldType.ULID]: {
      type: SemanticFieldType.ULID,
      category: FieldCategory.TECHNICAL,
      displayName: 'ULID',
      description: 'Universally Unique Lexicographically Sortable Identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/ulid/i],
      placeholderPatterns: [/ulid/i],
      labelPatterns: [/ulid/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 26, maxlength: 26 },
    },

    [SemanticFieldType.SEMVER]: {
      type: SemanticFieldType.SEMVER,
      category: FieldCategory.TECHNICAL,
      displayName: 'Semantic Version',
      description: 'Semantic version string (e.g., 1.2.3)',
      inputTypes: new Set(['text']),
      namePatterns: [/semver/i, /version/i, /app[_-]?version/i],
      placeholderPatterns: [/version/i, /\d+\.\d+\.\d+/],
      labelPatterns: [/version/i, /semver/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 20 },
    },

    // Slug
    [SemanticFieldType.SLUG]: {
      type: SemanticFieldType.SLUG,
      category: FieldCategory.TECHNICAL,
      displayName: 'URL Slug',
      description: 'URL-friendly identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/slug/i, /permalink/i, /url[_-]?slug/i],
      placeholderPatterns: [/slug/i, /my-article/i],
      labelPatterns: [/slug/i, /permalink/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 100 },
    },

    [SemanticFieldType.URL_SLUG]: {
      type: SemanticFieldType.URL_SLUG,
      category: FieldCategory.TECHNICAL,
      displayName: 'URL Slug',
      description: 'URL-friendly slug',
      inputTypes: new Set(['text']),
      namePatterns: [/url[_-]?slug/i],
      placeholderPatterns: [/url.*slug/i],
      labelPatterns: [/url slug/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 1, maxlength: 100 },
    },

    // OTP/PIN/Verification
    [SemanticFieldType.OTP_CODE]: {
      type: SemanticFieldType.OTP_CODE,
      category: FieldCategory.TECHNICAL,
      displayName: 'OTP Code',
      description: 'One-time password code',
      inputTypes: new Set(['text', 'number']),
      namePatterns: [
        /^otp$/i,
        /[_-]otp$/i,
        /^otp[_-]/i,
        /one[_-]?time/i,
        /2fa/i,
        /mfa/i,
      ],
      placeholderPatterns: [/\botp\b/i, /123456/i, /enter.*code/i],
      labelPatterns: [
        /\botp\b/i,
        /one.*time.*password/i,
        /authentication code/i,
      ],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 8 },
    },

    [SemanticFieldType.PIN_CODE]: {
      type: SemanticFieldType.PIN_CODE,
      category: FieldCategory.TECHNICAL,
      displayName: 'PIN Code',
      description: 'Personal identification number',
      inputTypes: new Set(['text', 'number', 'password']),
      namePatterns: [/^pin$/i, /pin[_-]?code/i, /pin[_-]?number/i],
      placeholderPatterns: [/\bpin\b/i, /1234/i],
      labelPatterns: [/\bpin\b/i, /pin code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 6 },
    },

    [SemanticFieldType.VERIFICATION_CODE]: {
      type: SemanticFieldType.VERIFICATION_CODE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Verification Code',
      description: 'Verification or confirmation code',
      inputTypes: new Set(['text', 'number']),
      namePatterns: [/verification/i, /confirm.*code/i, /verify/i],
      placeholderPatterns: [/verification/i, /enter.*code/i],
      labelPatterns: [/verification code/i, /confirm.*code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 4, maxlength: 8 },
    },

    // Timezone & Language
    [SemanticFieldType.TIMEZONE]: {
      type: SemanticFieldType.TIMEZONE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Timezone',
      description: 'Timezone identifier',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/timezone/i, /time[_-]?zone/i, /tz/i],
      placeholderPatterns: [/timezone/i, /America\/New_York/i],
      labelPatterns: [/timezone/i, /time zone/i],
      supportsValidation: true,
    },

    [SemanticFieldType.LANGUAGE]: {
      type: SemanticFieldType.LANGUAGE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Language',
      description: 'Language code',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/^language$/i, /^lang$/i, /language[_-]?code/i],
      placeholderPatterns: [/language/i, /english/i],
      labelPatterns: [/language/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 2, maxlength: 10 },
    },

    [SemanticFieldType.LOCALE]: {
      type: SemanticFieldType.LOCALE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Locale',
      description: 'Locale identifier (language + region)',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/locale/i, /language[_-]?region/i],
      placeholderPatterns: [/locale/i, /en-US/i, /en_US/i],
      labelPatterns: [/locale/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 2, maxlength: 10 },
    },

    // SSN/Tax/National ID
    [SemanticFieldType.SSN]: {
      type: SemanticFieldType.SSN,
      category: FieldCategory.PERSONAL,
      displayName: 'Social Security Number',
      description: 'US Social Security Number',
      inputTypes: new Set(['text']),
      namePatterns: [/^ssn$/i, /social[_-]?security/i, /ss[_-]?number/i],
      placeholderPatterns: [/ssn/i, /xxx-xx-xxxx/i, /social security/i],
      labelPatterns: [/ssn/i, /social security/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 9, maxlength: 11 },
    },

    [SemanticFieldType.TAX_ID]: {
      type: SemanticFieldType.TAX_ID,
      category: FieldCategory.PERSONAL,
      displayName: 'Tax ID',
      description: 'Tax identification number',
      inputTypes: new Set(['text']),
      namePatterns: [
        /tax[_-]?id/i,
        /^ein$/i,
        /[_-]ein$/i,
        /^ein[_-]/i,
        /^vat$/i,
        /[_-]vat$/i,
        /^vat[_-]/i,
        /tax[_-]?number/i,
      ],
      placeholderPatterns: [/tax id/i, /\bein\b/i],
      labelPatterns: [/tax id/i, /\bein\b/i, /\bvat\b/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 9, maxlength: 20 },
    },

    [SemanticFieldType.NATIONAL_ID]: {
      type: SemanticFieldType.NATIONAL_ID,
      category: FieldCategory.PERSONAL,
      displayName: 'National ID',
      description: 'National identification number',
      inputTypes: new Set(['text']),
      namePatterns: [/national[_-]?id/i, /citizen[_-]?id/i, /govt[_-]?id/i],
      placeholderPatterns: [/national id/i],
      labelPatterns: [/national id/i, /citizen id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 5, maxlength: 20 },
    },

    // Currency Code
    [SemanticFieldType.CURRENCY_CODE]: {
      type: SemanticFieldType.CURRENCY_CODE,
      category: FieldCategory.FINANCIAL,
      displayName: 'Currency Code',
      description: 'ISO 4217 currency code',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/currency[_-]?code/i, /iso[_-]?currency/i],
      placeholderPatterns: [/USD/i, /EUR/i, /GBP/i],
      labelPatterns: [/currency code/i, /currency/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 3 },
    },

    // Vehicle
    [SemanticFieldType.VIN]: {
      type: SemanticFieldType.VIN,
      category: FieldCategory.CUSTOM,
      displayName: 'VIN',
      description: 'Vehicle Identification Number',
      inputTypes: new Set(['text']),
      namePatterns: [/^vin$/i, /vehicle[_-]?id/i, /chassis/i],
      placeholderPatterns: [/\bvin\b/i, /17 characters/i],
      labelPatterns: [/\bvin\b/i, /vehicle id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 17, maxlength: 17 },
    },

    [SemanticFieldType.LICENSE_PLATE]: {
      type: SemanticFieldType.LICENSE_PLATE,
      category: FieldCategory.CUSTOM,
      displayName: 'License Plate',
      description: 'Vehicle license plate number',
      inputTypes: new Set(['text']),
      namePatterns: [
        /license[_-]?plate/i,
        /plate[_-]?number/i,
        /registration/i,
      ],
      placeholderPatterns: [/license plate/i, /ABC123/i],
      labelPatterns: [/license plate/i, /plate number/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 2, maxlength: 10 },
    },

    [SemanticFieldType.VEHICLE_MAKE]: {
      type: SemanticFieldType.VEHICLE_MAKE,
      category: FieldCategory.CUSTOM,
      displayName: 'Vehicle Make',
      description: 'Vehicle manufacturer',
      inputTypes: new Set(['text']),
      namePatterns: [
        /vehicle[_-]?make/i,
        /car[_-]?make/i,
        /manufacturer/i,
        /^make$/i,
        /[_-]make$/i,
        /^make[_-]/i,
      ],
      placeholderPatterns: [/\bmake\b/i, /manufacturer/i, /toyota/i],
      labelPatterns: [/vehicle make/i, /\bmake\b/i, /manufacturer/i],
      supportsValidation: true,
    },

    [SemanticFieldType.VEHICLE_MODEL]: {
      type: SemanticFieldType.VEHICLE_MODEL,
      category: FieldCategory.CUSTOM,
      displayName: 'Vehicle Model',
      description: 'Vehicle model name',
      inputTypes: new Set(['text']),
      namePatterns: [/vehicle[_-]?model/i, /car[_-]?model/i],
      placeholderPatterns: [/model/i, /camry/i],
      labelPatterns: [/vehicle model/i, /model/i],
      supportsValidation: true,
    },

    [SemanticFieldType.VEHICLE_TYPE]: {
      type: SemanticFieldType.VEHICLE_TYPE,
      category: FieldCategory.CUSTOM,
      displayName: 'Vehicle Type',
      description: 'Vehicle type (sedan, SUV, etc.)',
      inputTypes: new Set(['text']),
      namePatterns: [/vehicle[_-]?type/i, /car[_-]?type/i, /body[_-]?style/i],
      placeholderPatterns: [/vehicle type/i, /sedan/i, /suv/i],
      labelPatterns: [/vehicle type/i, /body style/i],
      supportsValidation: true,
    },

    [SemanticFieldType.VEHICLE_FUEL]: {
      type: SemanticFieldType.VEHICLE_FUEL,
      category: FieldCategory.CUSTOM,
      displayName: 'Vehicle Fuel Type',
      description: 'Vehicle fuel type (gasoline, diesel, electric, etc.)',
      inputTypes: new Set(['text']),
      namePatterns: [/fuel[_-]?type/i, /fuel/i, /energy[_-]?source/i],
      placeholderPatterns: [/fuel/i, /gasoline/i, /diesel/i],
      labelPatterns: [/fuel type/i, /fuel/i],
      supportsValidation: true,
    },

    [SemanticFieldType.VEHICLE_COLOR]: {
      type: SemanticFieldType.VEHICLE_COLOR,
      category: FieldCategory.CUSTOM,
      displayName: 'Vehicle Color',
      description: 'Vehicle exterior color',
      inputTypes: new Set(['text']),
      namePatterns: [
        /vehicle[_-]?color/i,
        /car[_-]?color/i,
        /exterior[_-]?color/i,
      ],
      placeholderPatterns: [/vehicle color/i, /car color/i],
      labelPatterns: [/vehicle color/i, /car color/i, /exterior color/i],
      supportsValidation: true,
    },

    // Product Identifiers
    [SemanticFieldType.ISBN]: {
      type: SemanticFieldType.ISBN,
      category: FieldCategory.CUSTOM,
      displayName: 'ISBN',
      description: 'International Standard Book Number',
      inputTypes: new Set(['text']),
      namePatterns: [/isbn/i, /book[_-]?number/i],
      placeholderPatterns: [/isbn/i, /978-/i],
      labelPatterns: [/isbn/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 10, maxlength: 17 },
    },

    [SemanticFieldType.UPC]: {
      type: SemanticFieldType.UPC,
      category: FieldCategory.CUSTOM,
      displayName: 'UPC',
      description: 'Universal Product Code',
      inputTypes: new Set(['text']),
      namePatterns: [/^upc$/i, /barcode/i, /product[_-]?code/i],
      placeholderPatterns: [/upc/i, /barcode/i],
      labelPatterns: [/upc/i, /barcode/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 12, maxlength: 12 },
    },

    [SemanticFieldType.SKU]: {
      type: SemanticFieldType.SKU,
      category: FieldCategory.CUSTOM,
      displayName: 'SKU',
      description: 'Stock Keeping Unit',
      inputTypes: new Set(['text']),
      namePatterns: [/^sku$/i, /stock[_-]?code/i, /item[_-]?code/i],
      placeholderPatterns: [/sku/i, /item code/i],
      labelPatterns: [/sku/i, /stock code/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 30 },
    },

    // Biometric/Health
    [SemanticFieldType.HEIGHT]: {
      type: SemanticFieldType.HEIGHT,
      category: FieldCategory.PERSONAL,
      displayName: 'Height',
      description: 'Person height',
      inputTypes: new Set(['text', 'number']),
      namePatterns: [/height/i, /tall/i],
      placeholderPatterns: [/height/i, /cm/i, /inches/i],
      labelPatterns: [/height/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 300 },
    },

    [SemanticFieldType.WEIGHT]: {
      type: SemanticFieldType.WEIGHT,
      category: FieldCategory.PERSONAL,
      displayName: 'Weight',
      description: 'Person weight',
      inputTypes: new Set(['text', 'number']),
      namePatterns: [/weight/i, /mass/i],
      placeholderPatterns: [/weight/i, /kg/i, /lbs/i],
      labelPatterns: [/weight/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 500 },
    },

    [SemanticFieldType.BLOOD_TYPE]: {
      type: SemanticFieldType.BLOOD_TYPE,
      category: FieldCategory.PERSONAL,
      displayName: 'Blood Type',
      description: 'Blood type group',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/blood[_-]?type/i, /blood[_-]?group/i],
      placeholderPatterns: [/blood type/i, /A\+/i, /O-/i],
      labelPatterns: [/blood type/i, /blood group/i],
      supportsValidation: true,
    },

    // Education
    [SemanticFieldType.DEGREE]: {
      type: SemanticFieldType.DEGREE,
      category: FieldCategory.PERSONAL,
      displayName: 'Degree',
      description: 'Academic degree',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/degree/i, /education[_-]?level/i, /qualification/i],
      placeholderPatterns: [/degree/i, /bachelor/i, /master/i],
      labelPatterns: [/degree/i, /education/i],
      supportsValidation: true,
    },

    [SemanticFieldType.GPA]: {
      type: SemanticFieldType.GPA,
      category: FieldCategory.PERSONAL,
      displayName: 'GPA',
      description: 'Grade Point Average',
      inputTypes: new Set(['text', 'number']),
      namePatterns: [/^gpa$/i, /grade[_-]?point/i, /average[_-]?grade/i],
      placeholderPatterns: [/gpa/i, /3\.75/i, /4\.0/i],
      labelPatterns: [/gpa/i, /grade point/i],
      supportsValidation: true,
      defaultConstraints: { min: 0, max: 4, step: 0.01 },
    },

    [SemanticFieldType.GRADUATION_YEAR]: {
      type: SemanticFieldType.GRADUATION_YEAR,
      category: FieldCategory.PERSONAL,
      displayName: 'Graduation Year',
      description: 'Year of graduation',
      inputTypes: new Set(['text', 'number', 'select']),
      namePatterns: [
        /graduation[_-]?year/i,
        /grad[_-]?year/i,
        /year[_-]?graduated/i,
      ],
      placeholderPatterns: [/graduation/i, /2020/i],
      labelPatterns: [/graduation year/i, /year graduated/i],
      supportsValidation: true,
      defaultConstraints: { min: 1950, max: 2050 },
    },

    // Airline
    [SemanticFieldType.AIRLINE_NAME]: {
      type: SemanticFieldType.AIRLINE_NAME,
      category: FieldCategory.CUSTOM,
      displayName: 'Airline Name',
      description: 'Name of an airline',
      inputTypes: new Set(['text']),
      namePatterns: [/airline/i, /carrier/i],
      placeholderPatterns: [/airline/i],
      labelPatterns: [/airline/i, /carrier/i],
      supportsValidation: true,
    },

    [SemanticFieldType.FLIGHT_NUMBER]: {
      type: SemanticFieldType.FLIGHT_NUMBER,
      category: FieldCategory.CUSTOM,
      displayName: 'Flight Number',
      description: 'Flight number identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/flight[_-]?number/i, /flight[_-]?no/i, /flight/i],
      placeholderPatterns: [/flight/i, /AA\d+/i],
      labelPatterns: [/flight number/i, /flight/i],
      supportsValidation: true,
    },

    [SemanticFieldType.SEAT_NUMBER]: {
      type: SemanticFieldType.SEAT_NUMBER,
      category: FieldCategory.CUSTOM,
      displayName: 'Seat Number',
      description: 'Airplane seat assignment',
      inputTypes: new Set(['text']),
      namePatterns: [/seat[_-]?number/i, /seat/i],
      placeholderPatterns: [/seat/i, /\d+[A-F]/i],
      labelPatterns: [/seat/i],
      supportsValidation: true,
    },

    [SemanticFieldType.AIRPORT_CODE]: {
      type: SemanticFieldType.AIRPORT_CODE,
      category: FieldCategory.CUSTOM,
      displayName: 'Airport Code',
      description: 'IATA airport code',
      inputTypes: new Set(['text']),
      namePatterns: [/airport[_-]?code/i, /iata/i, /airport/i],
      placeholderPatterns: [/airport/i, /[A-Z]{3}/],
      labelPatterns: [/airport/i, /iata/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 3, maxlength: 4 },
    },

    [SemanticFieldType.RECORD_LOCATOR]: {
      type: SemanticFieldType.RECORD_LOCATOR,
      category: FieldCategory.CUSTOM,
      displayName: 'Record Locator',
      description: 'Booking confirmation code',
      inputTypes: new Set(['text']),
      namePatterns: [
        /record[_-]?locator/i,
        /confirmation[_-]?code/i,
        /booking[_-]?ref/i,
        /pnr/i,
      ],
      placeholderPatterns: [/confirmation/i, /booking/i],
      labelPatterns: [/record locator/i, /confirmation/i, /booking ref/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 6, maxlength: 6 },
    },

    // Food
    [SemanticFieldType.FOOD_DISH]: {
      type: SemanticFieldType.FOOD_DISH,
      category: FieldCategory.CUSTOM,
      displayName: 'Dish Name',
      description: 'Name of a food dish',
      inputTypes: new Set(['text']),
      namePatterns: [/dish/i, /meal/i, /food[_-]?name/i],
      placeholderPatterns: [/dish/i, /meal/i],
      labelPatterns: [/dish/i, /meal/i, /food/i],
      supportsValidation: true,
    },

    [SemanticFieldType.FOOD_INGREDIENT]: {
      type: SemanticFieldType.FOOD_INGREDIENT,
      category: FieldCategory.CUSTOM,
      displayName: 'Ingredient',
      description: 'Food ingredient name',
      inputTypes: new Set(['text']),
      namePatterns: [/ingredient/i],
      placeholderPatterns: [/ingredient/i],
      labelPatterns: [/ingredient/i],
      supportsValidation: true,
    },

    [SemanticFieldType.FOOD_DESCRIPTION]: {
      type: SemanticFieldType.FOOD_DESCRIPTION,
      category: FieldCategory.CUSTOM,
      displayName: 'Food Description',
      description: 'Description of a food item',
      inputTypes: new Set(['text', 'textarea']),
      namePatterns: [/food[_-]?description/i, /dish[_-]?description/i],
      placeholderPatterns: [/describe.*dish/i],
      labelPatterns: [/food description/i],
      supportsValidation: true,
    },

    [SemanticFieldType.CUISINE_TYPE]: {
      type: SemanticFieldType.CUISINE_TYPE,
      category: FieldCategory.CUSTOM,
      displayName: 'Cuisine Type',
      description: 'Type of cuisine (e.g., Italian, Chinese)',
      inputTypes: new Set(['text']),
      namePatterns: [/cuisine/i, /food[_-]?type/i],
      placeholderPatterns: [/cuisine/i],
      labelPatterns: [/cuisine/i, /food type/i],
      supportsValidation: true,
    },

    // Book
    [SemanticFieldType.BOOK_TITLE]: {
      type: SemanticFieldType.BOOK_TITLE,
      category: FieldCategory.CUSTOM,
      displayName: 'Book Title',
      description: 'Title of a book',
      inputTypes: new Set(['text']),
      namePatterns: [
        /book[_-]?title/i,
        /^title$/i,
        /[_-]title$/i,
        /^title[_-]/i,
      ],
      placeholderPatterns: [/book title/i],
      labelPatterns: [/book title/i, /\btitle\b/i],
      supportsValidation: true,
    },

    [SemanticFieldType.BOOK_AUTHOR]: {
      type: SemanticFieldType.BOOK_AUTHOR,
      category: FieldCategory.CUSTOM,
      displayName: 'Book Author',
      description: 'Author of a book',
      inputTypes: new Set(['text']),
      namePatterns: [/author/i, /writer/i],
      placeholderPatterns: [/author/i],
      labelPatterns: [/author/i, /writer/i],
      supportsValidation: true,
    },

    [SemanticFieldType.BOOK_GENRE]: {
      type: SemanticFieldType.BOOK_GENRE,
      category: FieldCategory.CUSTOM,
      displayName: 'Book Genre',
      description: 'Genre of a book',
      inputTypes: new Set(['text']),
      namePatterns: [/book[_-]?genre/i, /genre/i],
      placeholderPatterns: [/genre/i],
      labelPatterns: [/genre/i],
      supportsValidation: true,
    },

    [SemanticFieldType.BOOK_PUBLISHER]: {
      type: SemanticFieldType.BOOK_PUBLISHER,
      category: FieldCategory.CUSTOM,
      displayName: 'Publisher',
      description: 'Book publisher name',
      inputTypes: new Set(['text']),
      namePatterns: [/publisher/i],
      placeholderPatterns: [/publisher/i],
      labelPatterns: [/publisher/i],
      supportsValidation: true,
    },

    // Music
    [SemanticFieldType.MUSIC_GENRE]: {
      type: SemanticFieldType.MUSIC_GENRE,
      category: FieldCategory.CUSTOM,
      displayName: 'Music Genre',
      description: 'Genre of music',
      inputTypes: new Set(['text']),
      namePatterns: [/music[_-]?genre/i, /genre/i],
      placeholderPatterns: [/music genre/i],
      labelPatterns: [/music genre/i],
      supportsValidation: true,
    },

    [SemanticFieldType.SONG_NAME]: {
      type: SemanticFieldType.SONG_NAME,
      category: FieldCategory.CUSTOM,
      displayName: 'Song Name',
      description: 'Name of a song',
      inputTypes: new Set(['text']),
      namePatterns: [/song[_-]?name/i, /song/i, /track/i],
      placeholderPatterns: [/song/i, /track/i],
      labelPatterns: [/song/i, /track/i],
      supportsValidation: true,
    },

    [SemanticFieldType.MUSIC_ARTIST]: {
      type: SemanticFieldType.MUSIC_ARTIST,
      category: FieldCategory.CUSTOM,
      displayName: 'Music Artist',
      description: 'Name of a music artist or band',
      inputTypes: new Set(['text']),
      namePatterns: [/artist/i, /band/i, /musician/i],
      placeholderPatterns: [/artist/i, /band/i],
      labelPatterns: [/artist/i, /band/i],
      supportsValidation: true,
    },

    // Science
    [SemanticFieldType.CHEMICAL_ELEMENT]: {
      type: SemanticFieldType.CHEMICAL_ELEMENT,
      category: FieldCategory.CUSTOM,
      displayName: 'Chemical Element',
      description: 'Chemical element name or symbol',
      inputTypes: new Set(['text']),
      namePatterns: [/element/i, /chemical/i],
      placeholderPatterns: [/element/i],
      labelPatterns: [/element/i, /chemical/i],
      supportsValidation: true,
    },

    [SemanticFieldType.SCIENCE_UNIT]: {
      type: SemanticFieldType.SCIENCE_UNIT,
      category: FieldCategory.CUSTOM,
      displayName: 'Science Unit',
      description: 'Scientific unit of measurement',
      inputTypes: new Set(['text']),
      namePatterns: [/unit[_-]?of[_-]?measurement/i, /science[_-]?unit/i],
      placeholderPatterns: [/unit/i],
      labelPatterns: [/unit/i, /measurement/i],
      supportsValidation: true,
    },

    // DevTools
    [SemanticFieldType.MONGODB_ID]: {
      type: SemanticFieldType.MONGODB_ID,
      category: FieldCategory.TECHNICAL,
      displayName: 'MongoDB ObjectId',
      description: 'MongoDB ObjectId identifier',
      inputTypes: new Set(['text']),
      namePatterns: [/mongodb[_-]?id/i, /object[_-]?id/i, /mongo[_-]?id/i],
      placeholderPatterns: [/objectid/i],
      labelPatterns: [/mongodb id/i, /object id/i],
      supportsValidation: true,
      defaultConstraints: { minlength: 24, maxlength: 24 },
    },

    [SemanticFieldType.COMMIT_SHA]: {
      type: SemanticFieldType.COMMIT_SHA,
      category: FieldCategory.TECHNICAL,
      displayName: 'Commit SHA',
      description: 'Git commit SHA hash',
      inputTypes: new Set(['text']),
      namePatterns: [
        /commit[_-]?sha/i,
        /^sha$/i,
        /[_-]sha$/i,
        /^sha[_-]/i,
        /commit[_-]?hash/i,
      ],
      placeholderPatterns: [/^sha$/i, /commit/i],
      labelPatterns: [/commit sha/i, /^sha$/i],
      supportsValidation: true,
    },

    [SemanticFieldType.GIT_BRANCH]: {
      type: SemanticFieldType.GIT_BRANCH,
      category: FieldCategory.TECHNICAL,
      displayName: 'Git Branch',
      description: 'Git branch name',
      inputTypes: new Set(['text']),
      namePatterns: [/branch[_-]?name/i, /git[_-]?branch/i, /branch/i],
      placeholderPatterns: [/branch/i],
      labelPatterns: [/branch/i],
      supportsValidation: true,
    },

    [SemanticFieldType.COMMIT_MESSAGE]: {
      type: SemanticFieldType.COMMIT_MESSAGE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Commit Message',
      description: 'Git commit message',
      inputTypes: new Set(['text', 'textarea']),
      namePatterns: [/commit[_-]?message/i, /commit[_-]?msg/i],
      placeholderPatterns: [/commit message/i],
      labelPatterns: [/commit message/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DATABASE_COLUMN]: {
      type: SemanticFieldType.DATABASE_COLUMN,
      category: FieldCategory.TECHNICAL,
      displayName: 'Database Column',
      description: 'Database column name',
      inputTypes: new Set(['text']),
      namePatterns: [/column[_-]?name/i, /db[_-]?column/i],
      placeholderPatterns: [/column/i],
      labelPatterns: [/column/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DATABASE_TYPE]: {
      type: SemanticFieldType.DATABASE_TYPE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Database Type',
      description: 'Database column type',
      inputTypes: new Set(['text']),
      namePatterns: [
        /db[_-]?type/i,
        /database[_-]?type/i,
        /column[_-]?type/i,
        /data[_-]?type/i,
      ],
      placeholderPatterns: [/data type/i],
      labelPatterns: [/data type/i, /column type/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DATABASE_ENGINE]: {
      type: SemanticFieldType.DATABASE_ENGINE,
      category: FieldCategory.TECHNICAL,
      displayName: 'Database Engine',
      description: 'Database engine name',
      inputTypes: new Set(['text']),
      namePatterns: [/db[_-]?engine/i, /database[_-]?engine/i],
      placeholderPatterns: [/engine/i],
      labelPatterns: [/database engine/i, /engine/i],
      supportsValidation: true,
    },

    // Animal
    [SemanticFieldType.ANIMAL_TYPE]: {
      type: SemanticFieldType.ANIMAL_TYPE,
      category: FieldCategory.CUSTOM,
      displayName: 'Animal Type',
      description: 'Type of animal',
      inputTypes: new Set(['text']),
      namePatterns: [/animal[_-]?type/i, /animal/i, /species/i],
      placeholderPatterns: [/animal/i, /species/i],
      labelPatterns: [/animal/i, /species/i],
      supportsValidation: true,
    },

    [SemanticFieldType.PET_NAME]: {
      type: SemanticFieldType.PET_NAME,
      category: FieldCategory.CUSTOM,
      displayName: 'Pet Name',
      description: 'Name for a pet',
      inputTypes: new Set(['text']),
      namePatterns: [/pet[_-]?name/i, /^pet$/i, /[_-]pet$/i, /^pet[_-]/i],
      placeholderPatterns: [/pet name/i],
      labelPatterns: [/pet name/i, /^pet$/i],
      supportsValidation: true,
    },

    [SemanticFieldType.DOG_BREED]: {
      type: SemanticFieldType.DOG_BREED,
      category: FieldCategory.CUSTOM,
      displayName: 'Dog Breed',
      description: 'Dog breed name',
      inputTypes: new Set(['text']),
      namePatterns: [/dog[_-]?breed/i, /breed/i],
      placeholderPatterns: [/breed/i, /dog breed/i],
      labelPatterns: [/dog breed/i, /breed/i],
      supportsValidation: true,
    },

    [SemanticFieldType.CAT_BREED]: {
      type: SemanticFieldType.CAT_BREED,
      category: FieldCategory.CUSTOM,
      displayName: 'Cat Breed',
      description: 'Cat breed name',
      inputTypes: new Set(['text']),
      namePatterns: [/cat[_-]?breed/i],
      placeholderPatterns: [/cat breed/i],
      labelPatterns: [/cat breed/i],
      supportsValidation: true,
    },

    // Special Types
    [SemanticFieldType.SEARCH]: {
      type: SemanticFieldType.SEARCH,
      category: FieldCategory.TECHNICAL,
      displayName: 'Search',
      description: 'Search input',
      inputTypes: new Set(['search', 'text']),
      namePatterns: [/search/i, /query/i],
      placeholderPatterns: [/search/i],
      labelPatterns: [/search/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 200 },
    },

    [SemanticFieldType.CAPTCHA]: {
      type: SemanticFieldType.CAPTCHA,
      category: FieldCategory.TECHNICAL,
      displayName: 'CAPTCHA',
      description: 'CAPTCHA verification',
      inputTypes: new Set(['text']),
      namePatterns: [/captcha/i, /verification/i],
      placeholderPatterns: [/captcha/i],
      labelPatterns: [/captcha/i],
      supportsValidation: false,
    },

    [SemanticFieldType.HIDDEN]: {
      type: SemanticFieldType.HIDDEN,
      category: FieldCategory.TECHNICAL,
      displayName: 'Hidden',
      description: 'Hidden input field',
      inputTypes: new Set(['hidden']),
      namePatterns: [],
      placeholderPatterns: [],
      labelPatterns: [],
      supportsValidation: false,
    },

    [SemanticFieldType.SUBMIT]: {
      type: SemanticFieldType.SUBMIT,
      category: FieldCategory.TECHNICAL,
      displayName: 'Submit',
      description: 'Submit button',
      inputTypes: new Set(['submit']),
      namePatterns: [],
      placeholderPatterns: [],
      labelPatterns: [],
      supportsValidation: false,
    },

    [SemanticFieldType.RESET]: {
      type: SemanticFieldType.RESET,
      category: FieldCategory.TECHNICAL,
      displayName: 'Reset',
      description: 'Reset button',
      inputTypes: new Set(['reset']),
      namePatterns: [],
      placeholderPatterns: [],
      labelPatterns: [],
      supportsValidation: false,
    },

    [SemanticFieldType.BUTTON]: {
      type: SemanticFieldType.BUTTON,
      category: FieldCategory.TECHNICAL,
      displayName: 'Button',
      description: 'Generic button',
      inputTypes: new Set(['button']),
      namePatterns: [],
      placeholderPatterns: [],
      labelPatterns: [],
      supportsValidation: false,
    },

    // Location (granular)
    [SemanticFieldType.BUILDING_NUMBER]: {
      type: SemanticFieldType.BUILDING_NUMBER,
      category: FieldCategory.LOCATION,
      displayName: 'Building Number',
      description: 'Building or house number',
      inputTypes: new Set(['text']),
      namePatterns: [
        /building[_-]?n/i,
        /house[_-]?n/i,
        /street[_-]?n/i,
        /^bldg$/i,
      ],
      placeholderPatterns: [/building/i, /house no/i],
      labelPatterns: [/building/i, /house number/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 10 },
    },

    [SemanticFieldType.STREET]: {
      type: SemanticFieldType.STREET,
      category: FieldCategory.LOCATION,
      displayName: 'Street',
      description: 'Street name',
      inputTypes: new Set(['text']),
      namePatterns: [/^street$/i, /street[_-]?name/i, /^rue$/i, /^strasse$/i],
      placeholderPatterns: [/street name/i, /street$/i],
      labelPatterns: [/street name/i, /^street$/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 100 },
    },

    [SemanticFieldType.CONTINENT]: {
      type: SemanticFieldType.CONTINENT,
      category: FieldCategory.LOCATION,
      displayName: 'Continent',
      description: 'Continent name',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/continent/i],
      placeholderPatterns: [/continent/i],
      labelPatterns: [/continent/i],
      supportsValidation: true,
    },

    // Personal (extended)
    [SemanticFieldType.GENDER]: {
      type: SemanticFieldType.GENDER,
      category: FieldCategory.PERSONAL,
      displayName: 'Gender',
      description: 'Gender identity',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/^gender$/i, /geschlecht/i, /^genre$/i, /genero/i],
      placeholderPatterns: [/gender/i],
      labelPatterns: [/gender/i, /geschlecht/i],
      supportsValidation: true,
    },

    [SemanticFieldType.SEX]: {
      type: SemanticFieldType.SEX,
      category: FieldCategory.PERSONAL,
      displayName: 'Sex',
      description: 'Biological sex',
      inputTypes: new Set(['text', 'select']),
      namePatterns: [/^sex$/i, /^sexo$/i, /sex[_-]?type/i],
      placeholderPatterns: [/sex$/i],
      labelPatterns: [/^sex$/i, /biological sex/i],
      supportsValidation: true,
    },

    // Text (semantic)
    [SemanticFieldType.BIO]: {
      type: SemanticFieldType.BIO,
      category: FieldCategory.PERSONAL,
      displayName: 'Bio',
      description: 'Personal biography or about text',
      inputTypes: new Set(['text', 'textarea']),
      namePatterns: [/^bio$/i, /^about$/i, /^about[_-]?me$/i, /^biography$/i],
      placeholderPatterns: [/bio/i, /about you/i, /tell us/i],
      labelPatterns: [/bio/i, /about/i, /biography/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 500 },
    },

    [SemanticFieldType.DESCRIPTION]: {
      type: SemanticFieldType.DESCRIPTION,
      category: FieldCategory.BUSINESS,
      displayName: 'Description',
      description: 'Product or item description',
      inputTypes: new Set(['text', 'textarea']),
      namePatterns: [
        /^desc$/i,
        /^description$/i,
        /product[_-]?desc/i,
        /item[_-]?desc/i,
      ],
      placeholderPatterns: [/description/i, /describe/i],
      labelPatterns: [/description/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 1000 },
    },

    // Internet (extended)
    [SemanticFieldType.DISPLAY_NAME]: {
      type: SemanticFieldType.DISPLAY_NAME,
      category: FieldCategory.CONTACT,
      displayName: 'Display Name',
      description: 'User display name or screen name',
      inputTypes: new Set(['text']),
      namePatterns: [
        /display[_-]?name/i,
        /screen[_-]?name/i,
        /nick[_-]?name/i,
        /^nick$/i,
      ],
      placeholderPatterns: [/display name/i, /nickname/i],
      labelPatterns: [/display name/i, /nickname/i, /screen name/i],
      supportsValidation: true,
      defaultConstraints: { maxlength: 50 },
    },

    [SemanticFieldType.USER_AGENT]: {
      type: SemanticFieldType.USER_AGENT,
      category: FieldCategory.TECHNICAL,
      displayName: 'User Agent',
      description: 'Browser user agent string',
      inputTypes: new Set(['text']),
      namePatterns: [/user[_-]?agent/i, /^ua$/i],
      placeholderPatterns: [/user agent/i],
      labelPatterns: [/user agent/i],
      supportsValidation: false,
    },
  };

/**
 * Get field type metadata by semantic type.
 *
 * @param type - The semantic field type to look up
 * @returns The complete metadata for the field type
 *
 * @example
 * ```ts
 * const metadata = getFieldTypeMetadata(SemanticFieldType.EMAIL);
 * console.log(metadata.displayName); // "Email Address"
 * console.log(metadata.namePatterns); // [/email/i, /e[_-]?mail/i]
 * ```
 */
export function getFieldTypeMetadata(
  type: SemanticFieldType
): FieldTypeMetadata {
  return FIELD_TYPE_REGISTRY[type];
}

/**
 * Get all field types belonging to a specific category.
 *
 * @param category - The category to filter by
 * @returns Array of semantic field types in the category
 *
 * @example
 * ```ts
 * const contactFields = getFieldTypesByCategory(FieldCategory.CONTACT);
 * // Returns: ['email', 'username', 'phone', 'countryCode', 'fax']
 * ```
 */
export function getFieldTypesByCategory(
  category: FieldCategory
): SemanticFieldType[] {
  return Object.values(SemanticFieldType).filter(
    type => FIELD_TYPE_REGISTRY[type].category === category
  );
}

/**
 * Get all field types that support valid/invalid mode validation.
 *
 * @returns Array of semantic field types that can be validated
 *
 * @example
 * ```ts
 * const validatable = getValidatableFieldTypes();
 * // Includes email, phone, creditCard.number, etc.
 * // Excludes file, image, hidden, etc.
 * ```
 */
export function getValidatableFieldTypes(): SemanticFieldType[] {
  return Object.values(SemanticFieldType).filter(
    type => FIELD_TYPE_REGISTRY[type].supportsValidation
  );
}

/**
 * Check if a specific field type supports validation.
 *
 * @param type - The semantic field type to check
 * @returns True if the field type supports validation
 *
 * @example
 * ```ts
 * supportsValidation(SemanticFieldType.EMAIL); // true
 * supportsValidation(SemanticFieldType.FILE); // false
 * ```
 */
export function supportsValidation(type: SemanticFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type].supportsValidation;
}

/**
 * Get default constraints for a field type.
 * Returns undefined if no default constraints are defined.
 *
 * @param type - The semantic field type
 * @returns The default constraints or undefined
 *
 * @example
 * ```ts
 * const constraints = getDefaultConstraints(SemanticFieldType.PASSWORD);
 * // Returns: { minlength: 8, maxlength: 128 }
 * ```
 */
export function getDefaultConstraints(
  type: SemanticFieldType
): FieldTypeMetadata['defaultConstraints'] {
  return FIELD_TYPE_REGISTRY[type].defaultConstraints;
}
