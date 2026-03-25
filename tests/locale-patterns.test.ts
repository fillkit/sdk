import { describe, it, expect } from 'vitest';
import { LOCALE_PATTERNS, getFieldPatterns } from '../src/locales/index.js';

/**
 * All locale codes that should have pattern entries.
 * Matches the SupportedLocale type in locales/index.ts.
 */
const ALL_LOCALES = [
  'af_ZA',
  'ar',
  'az',
  'bn_BD',
  'cs_CZ',
  'cy',
  'da',
  'de',
  'dv',
  'el',
  'en',
  'eo',
  'es',
  'fa',
  'fi',
  'fr',
  'he',
  'hr',
  'hu',
  'hy',
  'id_ID',
  'it',
  'ja',
  'ka_GE',
  'ko',
  'ku_ckb',
  'ku_kmr_latin',
  'lv',
  'mk',
  'nb_NO',
  'ne',
  'nl',
  'pl',
  'pt_BR',
  'pt_PT',
  'ro',
  'ru',
  'sk',
  'sl_SI',
  'sr_RS_latin',
  'sv',
  'ta_IN',
  'th',
  'tr',
  'uk',
  'ur',
  'uz_UZ_latin',
  'vi',
  'yo_NG',
  'zh_CN',
  'zh_TW',
  'zu_ZA',
] as const;

describe('LOCALE_PATTERNS', () => {
  it('contains all 52 supported locales', () => {
    expect(Object.keys(LOCALE_PATTERNS).sort()).toEqual(
      [...ALL_LOCALES].sort()
    );
  });

  describe('structure validation', () => {
    for (const locale of ALL_LOCALES) {
      describe(locale, () => {
        it('has name, placeholder, and label objects', () => {
          const patterns = LOCALE_PATTERNS[locale];
          expect(patterns).toBeDefined();
          expect(patterns.name).toBeDefined();
          expect(patterns.placeholder).toBeDefined();
          expect(patterns.label).toBeDefined();
        });

        it('has required fields in name patterns', () => {
          const { name } = LOCALE_PATTERNS[locale];
          expect(name.email).toBeDefined();
          expect(name.email.length).toBeGreaterThan(0);
          expect(name.phone).toBeDefined();
          expect(name.phone.length).toBeGreaterThan(0);
          expect(name['name.given']).toBeDefined();
          expect(name['name.given'].length).toBeGreaterThan(0);
          expect(name['name.family']).toBeDefined();
          expect(name['name.family'].length).toBeGreaterThan(0);
        });

        it('has required fields in placeholder patterns', () => {
          const { placeholder } = LOCALE_PATTERNS[locale];
          expect(placeholder.email).toBeDefined();
          expect(placeholder.email.length).toBeGreaterThan(0);
          expect(placeholder.phone).toBeDefined();
          expect(placeholder.phone.length).toBeGreaterThan(0);
          expect(placeholder.fullName).toBeDefined();
          expect(placeholder.fullName.length).toBeGreaterThan(0);
        });

        it('has required fields in label patterns', () => {
          const { label } = LOCALE_PATTERNS[locale];
          expect(label.email).toBeDefined();
          expect(label.email.length).toBeGreaterThan(0);
          expect(label.phone).toBeDefined();
          expect(label.phone.length).toBeGreaterThan(0);
          expect(label.fullName).toBeDefined();
          expect(label.fullName.length).toBeGreaterThan(0);
        });

        it('all patterns are valid RegExp instances', () => {
          const patterns = LOCALE_PATTERNS[locale];
          for (const category of ['name', 'placeholder', 'label'] as const) {
            for (const [, regexps] of Object.entries(patterns[category])) {
              for (const regexp of regexps) {
                expect(regexp).toBeInstanceOf(RegExp);
              }
            }
          }
        });
      });
    }
  });
});

describe('locale pattern spot checks', () => {
  // English
  it('English "email" matches en.name.email', () => {
    expect(LOCALE_PATTERNS.en.name.email.some(p => p.test('email'))).toBe(true);
  });

  it('English "firstName" matches en.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.en.name['name.given'].some(p => p.test('firstName'))
    ).toBe(true);
  });

  it('English "lastName" matches en.name["name.family"]', () => {
    expect(
      LOCALE_PATTERNS.en.name['name.family'].some(p => p.test('lastName'))
    ).toBe(true);
  });

  it('English "company" matches en.name.company', () => {
    expect(LOCALE_PATTERNS.en.name.company.some(p => p.test('company'))).toBe(
      true
    );
  });

  it('English "username" matches en.name.username', () => {
    expect(LOCALE_PATTERNS.en.name.username.some(p => p.test('username'))).toBe(
      true
    );
  });

  it('English "birthDate" matches en.name.birthDate', () => {
    expect(
      LOCALE_PATTERNS.en.name.birthDate.some(p => p.test('birthDate'))
    ).toBe(true);
  });

  it('English "creditCard" matches en.name["creditCard.number"]', () => {
    expect(
      LOCALE_PATTERNS.en.name['creditCard.number'].some(p =>
        p.test('creditCard')
      )
    ).toBe(true);
  });

  it('English "cvv" matches en.name["creditCard.cvv"]', () => {
    expect(
      LOCALE_PATTERNS.en.name['creditCard.cvv'].some(p => p.test('cvv'))
    ).toBe(true);
  });

  it('English "iban" matches en.name.iban', () => {
    expect(LOCALE_PATTERNS.en.name.iban.some(p => p.test('iban'))).toBe(true);
  });

  it('English "gender" matches en.name.gender', () => {
    expect(LOCALE_PATTERNS.en.name.gender.some(p => p.test('gender'))).toBe(
      true
    );
  });

  it('English "ssn" matches en.name.ssn', () => {
    expect(LOCALE_PATTERNS.en.name.ssn.some(p => p.test('ssn'))).toBe(true);
  });

  // French
  it('French "prénom" matches fr.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.fr.name['name.given'].some(p => p.test('prénom'))
    ).toBe(true);
  });

  it('French "courriel" matches fr.name.email', () => {
    expect(LOCALE_PATTERNS.fr.name.email.some(p => p.test('courriel'))).toBe(
      true
    );
  });

  // German
  it('German "Vorname" matches de.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.de.name['name.given'].some(p => p.test('Vorname'))
    ).toBe(true);
  });

  it('German "Nachname" matches de.name["name.family"]', () => {
    expect(
      LOCALE_PATTERNS.de.name['name.family'].some(p => p.test('Nachname'))
    ).toBe(true);
  });

  // Finnish
  it('Finnish "sukunimi" matches fi.name["name.family"]', () => {
    expect(
      LOCALE_PATTERNS.fi.name['name.family'].some(p => p.test('sukunimi'))
    ).toBe(true);
  });

  it('Finnish "sähköposti" matches fi.label.email', () => {
    expect(LOCALE_PATTERNS.fi.label.email.some(p => p.test('sähköposti'))).toBe(
      true
    );
  });

  // Swedish
  it('Swedish "förnamn" matches sv.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.sv.name['name.given'].some(p => p.test('förnamn'))
    ).toBe(true);
  });

  // Greek
  it('Greek "τηλέφωνο" matches el.name.phone', () => {
    expect(
      LOCALE_PATTERNS.el.name.phone.some(p =>
        p.test('\u03C4\u03B7\u03BB\u03AD\u03C6\u03C9\u03BD\u03BF')
      )
    ).toBe(true);
  });

  // Thai
  it('Thai "อีเมล" matches th.label.email', () => {
    expect(
      LOCALE_PATTERNS.th.label.email.some(p =>
        p.test('\u0E2D\u0E35\u0E40\u0E21\u0E25')
      )
    ).toBe(true);
  });

  // Japanese
  it('Japanese "名前" matches ja.name.fullName', () => {
    expect(LOCALE_PATTERNS.ja.name.fullName.some(p => p.test('名前'))).toBe(
      true
    );
  });

  // Korean
  it('Korean "이메일" matches ko.label.email', () => {
    expect(LOCALE_PATTERNS.ko.label.email.some(p => p.test('이메일'))).toBe(
      true
    );
  });

  // Arabic
  it('Arabic "الاسم" matches ar.name.fullName', () => {
    expect(LOCALE_PATTERNS.ar.name.fullName.some(p => p.test('الاسم'))).toBe(
      true
    );
  });

  // Chinese Simplified
  it('Chinese Simplified "邮箱" matches zh_CN.label.email', () => {
    expect(LOCALE_PATTERNS.zh_CN.label.email.some(p => p.test('邮箱'))).toBe(
      true
    );
  });

  // Chinese Traditional
  it('Chinese Traditional "電話" matches zh_TW.name.phone', () => {
    expect(LOCALE_PATTERNS.zh_TW.name.phone.some(p => p.test('電話'))).toBe(
      true
    );
  });

  // Vietnamese
  it('Vietnamese "điện thoại" matches vi.name.phone', () => {
    expect(
      LOCALE_PATTERNS.vi.name.phone.some(p =>
        p.test('\u0111i\u1EC7n tho\u1EA1i')
      )
    ).toBe(true);
  });

  // Indonesian
  it('Indonesian "nama depan" matches id_ID.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.id_ID.name['name.given'].some(p => p.test('nama depan'))
    ).toBe(true);
  });

  // Czech
  it('Czech "příjmení" matches cs_CZ.name["name.family"]', () => {
    expect(
      LOCALE_PATTERNS.cs_CZ.name['name.family'].some(p => p.test('příjmení'))
    ).toBe(true);
  });

  // Romanian
  it('Romanian "prenume" matches ro.name["name.given"]', () => {
    expect(
      LOCALE_PATTERNS.ro.name['name.given'].some(p => p.test('prenume'))
    ).toBe(true);
  });

  // Georgian
  it('Georgian "ტელეფონი" matches ka_GE.name.phone', () => {
    expect(LOCALE_PATTERNS.ka_GE.name.phone.some(p => p.test('ტელეფონი'))).toBe(
      true
    );
  });

  // Tamil
  it('Tamil "பெயர்" matches ta_IN.label.fullName', () => {
    expect(
      LOCALE_PATTERNS.ta_IN.label.fullName.some(p => p.test('பெயர்'))
    ).toBe(true);
  });

  // Portuguese (Portugal)
  it('Portuguese (PT) "morada" matches pt_PT.name["address.line1"]', () => {
    expect(
      LOCALE_PATTERNS.pt_PT.name['address.line1'].some(p => p.test('morada'))
    ).toBe(true);
  });

  // Portuguese (PT) - "apelido" instead of "sobrenome"
  it('Portuguese (PT) "apelido" matches pt_PT.name["name.family"]', () => {
    expect(
      LOCALE_PATTERNS.pt_PT.name['name.family'].some(p => p.test('apelido'))
    ).toBe(true);
  });
});

describe('getFieldPatterns', () => {
  it('returns exact locale patterns for known locale', () => {
    const patterns = getFieldPatterns('fr');
    expect(patterns).toBe(LOCALE_PATTERNS.fr);
  });

  it('returns exact locale for composite keys like cs_CZ', () => {
    const patterns = getFieldPatterns('cs_CZ');
    expect(patterns).toBe(LOCALE_PATTERNS.cs_CZ);
  });

  it('falls back to base language code for unknown regional variant', () => {
    const patterns = getFieldPatterns('en_US');
    expect(patterns).toBe(LOCALE_PATTERNS.en);
  });

  it('returns pt_BR patterns for pt_BR locale', () => {
    const patterns = getFieldPatterns('pt_BR');
    expect(patterns).toBe(LOCALE_PATTERNS.pt_BR);
  });

  it('returns pt_PT patterns for pt_PT locale', () => {
    const patterns = getFieldPatterns('pt_PT');
    expect(patterns).toBe(LOCALE_PATTERNS.pt_PT);
  });

  it('returns zh_CN patterns for zh_CN locale', () => {
    const patterns = getFieldPatterns('zh_CN');
    expect(patterns).toBe(LOCALE_PATTERNS.zh_CN);
  });

  it('returns zh_TW patterns for zh_TW locale', () => {
    const patterns = getFieldPatterns('zh_TW');
    expect(patterns).toBe(LOCALE_PATTERNS.zh_TW);
  });

  it('falls back to English for unknown locale', () => {
    const patterns = getFieldPatterns('xyz');
    expect(patterns).toBe(LOCALE_PATTERNS.en);
  });
});
