/**
 * Curated synonym enrichment for TF-IDF vocabulary generation.
 *
 * Addresses two gaps in the auto-extracted vocabulary:
 * 1. SPARSE TYPES: Field types with ≤3 regex patterns get additional synonyms
 * 2. DISAMBIGUATION: Overlapping groups get tokens that distinguish siblings
 *
 * These tokens are merged into the vocabulary during generation.
 * Weight: 0.5x multiplier (lower than regex-derived tokens at 1.0x)
 */

export interface SynonymEntry {
  /** Additional tokens for this field type. */
  tokens: string[];
  /** Tokens that NEGATIVELY correlate (appear in sibling types). */
  antiTokens?: string[];
}

export const TFIDF_SYNONYMS: Record<string, SynonymEntry> = {
  // ─── Tier 1: Critical sparsity (0-1 regex patterns) ────────────────

  fax: {
    tokens: ['facsimile', 'faxnumber', 'faxline', 'telefax', 'faxnum', 'faxno'],
    antiTokens: ['phone', 'mobile', 'cell', 'tel', 'landline'],
  },
  domain: {
    tokens: ['domainname', 'hostname', 'webdomain', 'sitedomain', 'domainurl'],
    antiTokens: ['url', 'website', 'link', 'href'],
  },
  region: {
    tokens: ['geographic', 'area', 'district', 'zone', 'territory'],
    antiTokens: ['state', 'province', 'city', 'country'],
  },
  time: {
    tokens: ['hour', 'minute', 'clock', 'timeofday', 'schedule', 'wallclock'],
    antiTokens: ['date', 'datetime', 'month', 'year', 'day'],
  },
  ulid: {
    tokens: ['sortableid', 'lexicographic', 'universalid', 'ulidstring'],
    antiTokens: ['uuid', 'guid', 'nanoid', 'cuid'],
  },
  urlSlug: {
    tokens: [
      'permalink',
      'seo',
      'friendlyurl',
      'urlpath',
      'slugfield',
      'urlslug',
    ],
    antiTokens: ['url', 'domain', 'website', 'link'],
  },
  foodIngredient: {
    tokens: [
      'ingredientname',
      'fooditem',
      'recipe',
      'component',
      'foodingredient',
    ],
    antiTokens: ['dish', 'meal', 'cuisine', 'menu'],
  },
  bookPublisher: {
    tokens: [
      'publishername',
      'publishinghouse',
      'imprint',
      'press',
      'bookpublisher',
    ],
    antiTokens: ['author', 'title', 'genre', 'writer'],
  },
  catBreed: {
    tokens: ['felinebreed', 'cattype', 'catvariety', 'kittenbreed', 'catbreed'],
    antiTokens: ['dogbreed', 'animaltype', 'petname'],
  },

  // ─── Tier 2: Severe sparsity (2 regex patterns) ────────────────────

  countryCode: {
    tokens: ['dialcode', 'callingcode', 'phonecode', 'internationalcode'],
  },
  'creditCard.expMonth': {
    tokens: ['expirationmonth', 'cardmonth', 'validmonth', 'mmfield'],
    antiTokens: ['year', 'expyear', 'yy'],
  },
  'creditCard.expYear': {
    tokens: ['expirationyear', 'cardyear', 'validyear', 'yyfield'],
    antiTokens: ['month', 'expmonth', 'mm'],
  },
  accountNumber: {
    tokens: ['bankaccount', 'acctnum', 'accountid', 'depositaccount'],
  },
  routingNumber: {
    tokens: ['aba', 'transitnumber', 'banktransit', 'sortcode'],
  },
  bankName: {
    tokens: ['financialinstitution', 'bankingprovider', 'creditunion'],
  },
  postalCode: {
    tokens: ['zipcode', 'postcode', 'mailcode', 'postalzip'],
    antiTokens: ['phone', 'area', 'calling', 'dial'],
  },
  color: {
    tokens: ['hue', 'shade', 'pigment', 'colorpicker', 'swatch'],
  },
  guid: {
    tokens: ['globalid', 'globalidentifier', 'windowsid'],
    antiTokens: ['uuid', 'ulid', 'nanoid', 'cuid'],
  },
  ipv4: {
    tokens: ['ipaddressv4', 'internetprotocol4', 'ipfour'],
    antiTokens: ['ipv6', 'ipsix'],
  },
  ipv6: {
    tokens: ['ipaddressv6', 'internetprotocol6', 'ipsix'],
    antiTokens: ['ipv4', 'ipfour'],
  },
  imei: {
    tokens: ['deviceidentifier', 'mobileid', 'handsetid'],
  },
  nanoid: {
    tokens: ['nanoidtoken', 'compactid', 'shortid'],
    antiTokens: ['uuid', 'guid', 'ulid', 'cuid'],
  },
  vehicleModel: {
    tokens: ['carmodel', 'automodel', 'modelname'],
  },
  isbn: {
    tokens: ['booknumber', 'bookidentifier', 'isbncode'],
  },
  height: {
    tokens: ['stature', 'tallness', 'heightcm', 'heightft'],
    antiTokens: ['weight', 'mass', 'bodyweight'],
  },
  weight: {
    tokens: ['bodyweight', 'massbody', 'weightkg', 'weightlbs'],
    antiTokens: ['height', 'stature', 'tallness'],
  },
  bloodType: {
    tokens: ['bloodgroup', 'abogroup', 'rhfactor'],
  },
  airlineName: {
    tokens: ['carrier', 'airlinecarrier', 'flightcarrier'],
  },
  seatNumber: {
    tokens: ['seatassignment', 'seatposition', 'seatrow'],
  },
  bookAuthor: {
    tokens: ['writer', 'novelist', 'bookwriter', 'authorname'],
    antiTokens: ['publisher', 'genre', 'title'],
  },
  bookGenre: {
    tokens: ['literarygenre', 'booktype', 'bookcategory'],
    antiTokens: ['music', 'musicgenre', 'musicstyle'],
  },
  musicGenre: {
    tokens: ['musicstyle', 'genretype', 'musiccategory'],
    antiTokens: ['book', 'literary', 'bookcategory'],
  },
  chemicalElement: {
    tokens: ['periodictable', 'atomicelement', 'elementsymbol'],
  },
  scienceUnit: {
    tokens: ['measurementunit', 'physicsunit', 'metricunit'],
  },
  databaseColumn: {
    tokens: ['columnname', 'fieldname', 'dbfield', 'tablecolumn'],
    antiTokens: ['engine', 'dbms', 'database'],
  },
  databaseEngine: {
    tokens: ['dbms', 'databasesystem', 'storageengine'],
    antiTokens: ['column', 'field', 'table'],
  },
  dogBreed: {
    tokens: ['caninebreed', 'dogtype', 'dogvariety', 'puppybreed'],
    antiTokens: ['catbreed', 'felinebreed', 'petname'],
  },
  currencyCode: {
    tokens: ['isocurrency', 'moneysymbol', 'currencyiso'],
  },
  locale: {
    tokens: ['languageregion', 'localecode', 'i18nlocale'],
  },

  // ─── Tier 3: Disambiguation for overlapping groups ──────────────────

  // PASSWORD vs CONFIRM_PASSWORD
  password: {
    tokens: ['userpassword', 'loginpassword', 'accountpassword', 'secretkey'],
    antiTokens: ['confirm', 'verify', 'retype', 'again', 'repeat', 'match'],
  },
  confirmPassword: {
    tokens: [
      'passwordconfirm',
      'reenterpassword',
      'retypepassword',
      'passwordagain',
      'verifypassword',
      'repeatpassword',
      'passwordmatch',
      'secondpassword',
    ],
    antiTokens: ['current', 'old', 'new', 'login', 'user'],
  },

  // ADDRESS_LINE1 vs ADDRESS_LINE2
  'address.line1': {
    tokens: [
      'primaryaddress',
      'mailingaddress',
      'streetaddress',
      'mainaddress',
      'residence',
      'housenumber',
      'firstline',
    ],
    antiTokens: [
      'apt',
      'apartment',
      'suite',
      'unit',
      'floor',
      'building',
      'secondary',
    ],
  },
  'address.line2': {
    tokens: [
      'apartmentnumber',
      'suitenumber',
      'unitnumber',
      'floornumber',
      'roomnumber',
      'buildingnumber',
      'secondaryaddress',
      'addressdetails',
    ],
    antiTokens: ['street', 'primary', 'main', 'mailing', 'first'],
  },

  // NAME variants
  'name.given': {
    tokens: [
      'firstname',
      'forename',
      'primaryname',
      'christenname',
      'baptismalname',
    ],
    antiTokens: ['last', 'family', 'surname', 'middle', 'full', 'complete'],
  },
  'name.family': {
    tokens: ['lastname', 'surname', 'familyname', 'patronym', 'maternalname'],
    antiTokens: ['first', 'given', 'forename', 'middle', 'full', 'complete'],
  },
  fullName: {
    tokens: [
      'completename',
      'entirename',
      'legalname',
      'yourname',
      'displayname',
    ],
    antiTokens: ['first', 'last', 'given', 'family', 'middle'],
  },
  middleName: {
    tokens: ['middleinitial', 'secondname', 'additionalname', 'patronymic'],
    antiTokens: ['first', 'last', 'given', 'family', 'full', 'complete'],
  },

  // CREDIT_CARD variants
  'creditCard.number': {
    tokens: [
      'carddigits',
      'debitcard',
      'paymentcard',
      'cardnumberlong',
      'plasticcard',
      'visacard',
      'mastercard',
    ],
    antiTokens: ['cvv', 'cvc', 'csc', 'expir', 'month', 'year', 'security'],
  },
  'creditCard.cvv': {
    tokens: [
      'securitycode',
      'cardverification',
      'threedigit',
      'cardcode',
      'backofcard',
      'securitynumber',
    ],
    antiTokens: ['number', 'cardnumber', 'expir', 'month', 'year'],
  },
  'creditCard.expiry': {
    tokens: [
      'validuntil',
      'cardexpiry',
      'expirationdate',
      'validthrough',
      'goodthrough',
      'mmyy',
    ],
    antiTokens: ['number', 'cvv', 'cvc', 'cardnumber', 'security'],
  },

  // PHONE vs FAX
  phone: {
    tokens: [
      'mobilenumber',
      'cellphone',
      'contactphone',
      'directline',
      'dialin',
      'phoneline',
    ],
    antiTokens: ['fax', 'facsimile', 'telefax'],
  },
};
