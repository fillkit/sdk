import { describe, it, expect } from 'vitest';
import { FIELD_TYPE_REGISTRY } from '@/types/semantic-fields.js';

/**
 * Comprehensive tests for pattern false positives in FIELD_TYPE_REGISTRY.
 *
 * Short/broad regex patterns can cause substring matching issues:
 * - /ip/i matches "Relationship", "Membership", "Recipe"
 * - /pin/i matches "Opinion", "Spinning", "Alpine"
 * - /vin/i matches "Province", "Saving", "Diving"
 *
 * These tests verify that patterns are properly anchored or use word
 * boundaries to prevent false positive field detection.
 */

const allTypes = Object.values(FIELD_TYPE_REGISTRY);

const findNameMatches = (name: string) =>
  allTypes.filter(t => t.namePatterns.some(p => p.test(name))).map(t => t.type);

const findLabelMatches = (label: string) =>
  allTypes
    .filter(t => t.labelPatterns.some(p => p.test(label)))
    .map(t => t.type);

const findPlaceholderMatches = (placeholder: string) =>
  allTypes
    .filter(t => t.placeholderPatterns.some(p => p.test(placeholder)))
    .map(t => t.type);

// ─── Section 1: Label False Positives ────────────────────────────

describe('label false positives', () => {
  it('"Relationship" should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Relationship')).not.toContain('ipAddress');
  });

  it('"Membership" should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Membership')).not.toContain('ipAddress');
  });

  it('"Recipe" should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Recipe')).not.toContain('ipAddress');
  });

  it('"Opinion" should NOT match PIN_CODE', () => {
    expect(findLabelMatches('Opinion')).not.toContain('pinCode');
  });

  it('"Spinning" should NOT match PIN_CODE', () => {
    expect(findLabelMatches('Spinning')).not.toContain('pinCode');
  });

  it('"Alpine" should NOT match PIN_CODE', () => {
    expect(findLabelMatches('Alpine')).not.toContain('pinCode');
  });

  it('"Private" should NOT match TAX_ID (vat)', () => {
    expect(findLabelMatches('Private')).not.toContain('taxId');
  });

  it('"Elevate" should NOT match TAX_ID (vat)', () => {
    expect(findLabelMatches('Elevate')).not.toContain('taxId');
  });

  it('"Being" should NOT match TAX_ID (ein)', () => {
    expect(findLabelMatches('Being')).not.toContain('taxId');
  });

  it('"Protein" should NOT match TAX_ID (ein)', () => {
    expect(findLabelMatches('Protein')).not.toContain('taxId');
  });

  it('"Province" should NOT match VIN', () => {
    expect(findLabelMatches('Province')).not.toContain('vin');
  });

  it('"Saving" should NOT match VIN', () => {
    expect(findLabelMatches('Saving')).not.toContain('vin');
  });

  it('"Diving" should NOT match VIN', () => {
    expect(findLabelMatches('Diving')).not.toContain('vin');
  });

  it('"Method" should NOT match ETHEREUM_ADDRESS', () => {
    expect(findLabelMatches('Method')).not.toContain('ethereumAddress');
  });

  it('"Whether" should NOT match ETHEREUM_ADDRESS', () => {
    expect(findLabelMatches('Whether')).not.toContain('ethereumAddress');
  });

  it('"Something" should NOT match ETHEREUM_ADDRESS', () => {
    expect(findLabelMatches('Something')).not.toContain('ethereumAddress');
  });

  it('"Passport" should NOT match PASSWORD', () => {
    expect(findLabelMatches('Passport')).not.toContain('password');
  });

  it('"Passenger" should NOT match PASSWORD', () => {
    expect(findLabelMatches('Passenger')).not.toContain('password');
  });

  it('"Bypass" should NOT match PASSWORD', () => {
    expect(findLabelMatches('Bypass')).not.toContain('password');
  });

  it('"Captain" should NOT match ADDRESS_LINE2', () => {
    expect(findLabelMatches('Captain')).not.toContain('address.line2');
  });

  it('"Subtitle" should NOT match PREFIX (title)', () => {
    expect(findLabelMatches('Subtitle')).not.toContain('name.prefix');
  });

  it('"Entitlement" should NOT match PREFIX (title)', () => {
    expect(findLabelMatches('Entitlement')).not.toContain('name.prefix');
  });

  it('"Blinking" should NOT match URL', () => {
    expect(findLabelMatches('Blinking')).not.toContain('url');
  });

  it('"curl" should NOT match URL', () => {
    expect(findLabelMatches('curl')).not.toContain('url');
  });

  it('"Adobe" should NOT match BIRTH_DATE', () => {
    expect(findLabelMatches('Adobe')).not.toContain('birthDate');
  });
});

// ─── Section 2: Name/ID False Positives ──────────────────────────

describe('name/ID false positives', () => {
  it('"coffeeType" should NOT match CURRENCY (fee)', () => {
    expect(findNameMatches('coffeeType')).not.toContain('currency');
  });

  it('"feeder" should NOT match CURRENCY (fee)', () => {
    expect(findNameMatches('feeder')).not.toContain('currency');
  });

  it('"protein" should NOT match TAX_ID (ein)', () => {
    expect(findNameMatches('protein')).not.toContain('taxId');
  });

  it('"caffeine" should NOT match TAX_ID (ein)', () => {
    expect(findNameMatches('caffeine')).not.toContain('taxId');
  });

  it('"privateKey" should NOT match TAX_ID (vat)', () => {
    expect(findNameMatches('privateKey')).not.toContain('taxId');
  });

  it('"activated" should NOT match TAX_ID (vat)', () => {
    expect(findNameMatches('activated')).not.toContain('taxId');
  });

  it('"curlCommand" should NOT match URL', () => {
    expect(findNameMatches('curlCommand')).not.toContain('url');
  });

  it('"unlink" should NOT match URL', () => {
    expect(findNameMatches('unlink')).not.toContain('url');
  });

  it('"symlink" should NOT match URL', () => {
    expect(findNameMatches('symlink')).not.toContain('url');
  });

  it('"blinking" should NOT match URL', () => {
    expect(findNameMatches('blinking')).not.toContain('url');
  });

  it('"generateReport" should NOT match PERCENTAGE (rate)', () => {
    expect(findNameMatches('generateReport')).not.toContain('percentage');
  });

  it('"moderate" should NOT match PERCENTAGE (rate)', () => {
    expect(findNameMatches('moderate')).not.toContain('percentage');
  });

  it('"decorate" should NOT match PERCENTAGE (rate)', () => {
    expect(findNameMatches('decorate')).not.toContain('percentage');
  });

  it('"subtitle" should NOT match PREFIX (title)', () => {
    expect(findNameMatches('subtitle')).not.toContain('name.prefix');
  });

  it('"jobTitle" should NOT match PREFIX (title)', () => {
    // jobTitle should match its own field type, not PREFIX
    expect(findNameMatches('jobTitle')).not.toContain('name.prefix');
  });

  it('"entitlement" should NOT match PREFIX (title)', () => {
    expect(findNameMatches('entitlement')).not.toContain('name.prefix');
  });

  it('"footprint" should NOT match OTP_CODE', () => {
    expect(findNameMatches('footprint')).not.toContain('otpCode');
  });

  it('"hotplate" should NOT match OTP_CODE', () => {
    expect(findNameMatches('hotplate')).not.toContain('otpCode');
  });

  it('"makefile" should NOT match VEHICLE_MAKE', () => {
    expect(findNameMatches('makefile')).not.toContain('vehicleMake');
  });

  it('"remake" should NOT match VEHICLE_MAKE', () => {
    expect(findNameMatches('remake')).not.toContain('vehicleMake');
  });
});

// ─── Section 3: Placeholder False Positives ──────────────────────

describe('placeholder false positives', () => {
  it('"Enter your opinion" should NOT match PIN_CODE', () => {
    expect(findPlaceholderMatches('Enter your opinion')).not.toContain(
      'pinCode'
    );
  });

  it('"Spinning wheel" should NOT match PIN_CODE', () => {
    expect(findPlaceholderMatches('Spinning wheel')).not.toContain('pinCode');
  });

  it('"Province or state" should NOT match VIN', () => {
    expect(findPlaceholderMatches('Province or state')).not.toContain('vin');
  });

  it('"Captain America" should NOT match ADDRESS_LINE2', () => {
    expect(findPlaceholderMatches('Captain America')).not.toContain(
      'address.line2'
    );
  });

  it('"Adapt to change" should NOT match ADDRESS_LINE2', () => {
    expect(findPlaceholderMatches('Adapt to change')).not.toContain(
      'address.line2'
    );
  });

  it('"Method of payment" should NOT match ETHEREUM_ADDRESS', () => {
    expect(findPlaceholderMatches('Method of payment')).not.toContain(
      'ethereumAddress'
    );
  });

  it('"Enter your tax id" SHOULD match TAX_ID', () => {
    expect(findPlaceholderMatches('Enter your tax id')).toContain('taxId');
  });

  it('"Enter EIN" SHOULD match TAX_ID', () => {
    expect(findPlaceholderMatches('Enter EIN')).toContain('taxId');
  });
});

// ─── Section 4: Positive Cases (legitimate matches) ──────────────

describe('positive cases — legitimate matches still work', () => {
  // Standalone matches
  it('"IP" label should match IP_ADDRESS', () => {
    expect(findLabelMatches('IP')).toContain('ipAddress');
  });

  it('"ip address" label should match IP_ADDRESS', () => {
    expect(findLabelMatches('ip address')).toContain('ipAddress');
  });

  it('"PIN" label should match PIN_CODE', () => {
    expect(findLabelMatches('PIN')).toContain('pinCode');
  });

  it('"pin code" label should match PIN_CODE', () => {
    expect(findLabelMatches('pin code')).toContain('pinCode');
  });

  it('"VIN" label should match VIN', () => {
    expect(findLabelMatches('VIN')).toContain('vin');
  });

  it('"vehicle id" label should match VIN', () => {
    expect(findLabelMatches('vehicle id')).toContain('vin');
  });

  it('"Title" label should match PREFIX', () => {
    expect(findLabelMatches('Title')).toContain('name.prefix');
  });

  it('"Password" label should match PASSWORD', () => {
    expect(findLabelMatches('Password')).toContain('password');
  });

  it('"Pass" label should match PASSWORD', () => {
    expect(findLabelMatches('Pass')).toContain('password');
  });

  it('"EIN" label should match TAX_ID', () => {
    expect(findLabelMatches('EIN')).toContain('taxId');
  });

  it('"VAT" label should match TAX_ID', () => {
    expect(findLabelMatches('VAT')).toContain('taxId');
  });

  it('"ETH" label should match ETHEREUM_ADDRESS', () => {
    expect(findLabelMatches('ETH')).toContain('ethereumAddress');
  });

  it('"BTC" label should match BITCOIN_ADDRESS', () => {
    expect(findLabelMatches('BTC')).toContain('bitcoinAddress');
  });

  it('"OTP" label should match OTP_CODE', () => {
    expect(findLabelMatches('OTP')).toContain('otpCode');
  });

  it('"DOB" label should match BIRTH_DATE', () => {
    expect(findLabelMatches('DOB')).toContain('birthDate');
  });

  // Separator-delimited name matches
  it('"user_fee" name should match CURRENCY', () => {
    expect(findNameMatches('user_fee')).toContain('currency');
  });

  it('"tax_ein" name should match TAX_ID', () => {
    expect(findNameMatches('tax_ein')).toContain('taxId');
  });

  it('"company_vat" name should match TAX_ID', () => {
    expect(findNameMatches('company_vat')).toContain('taxId');
  });

  it('"redirect_url" name should match URL', () => {
    expect(findNameMatches('redirect_url')).toContain('url');
  });

  it('"interest_rate" name should match PERCENTAGE', () => {
    expect(findNameMatches('interest_rate')).toContain('percentage');
  });

  it('"car_make" name should match VEHICLE_MAKE', () => {
    expect(findNameMatches('car_make')).toContain('vehicleMake');
  });

  it('"otp_code" name should match OTP_CODE', () => {
    expect(findNameMatches('otp_code')).toContain('otpCode');
  });

  it('"link_url" name should match URL', () => {
    expect(findNameMatches('link_url')).toContain('url');
  });

  // Exact name matches
  it('"ip" name should match IP_ADDRESS', () => {
    expect(findNameMatches('ip')).toContain('ipAddress');
  });

  it('"pin" name should match PIN_CODE', () => {
    expect(findNameMatches('pin')).toContain('pinCode');
  });

  it('"vin" name should match VIN', () => {
    expect(findNameMatches('vin')).toContain('vin');
  });

  it('"otp" name should match OTP_CODE', () => {
    expect(findNameMatches('otp')).toContain('otpCode');
  });

  it('"ein" name should match TAX_ID', () => {
    expect(findNameMatches('ein')).toContain('taxId');
  });

  it('"vat" name should match TAX_ID', () => {
    expect(findNameMatches('vat')).toContain('taxId');
  });

  it('"url" name should match URL', () => {
    expect(findNameMatches('url')).toContain('url');
  });

  it('"link" name should match URL', () => {
    expect(findNameMatches('link')).toContain('url');
  });

  it('"rate" name should match PERCENTAGE', () => {
    expect(findNameMatches('rate')).toContain('percentage');
  });

  it('"fee" name should match CURRENCY', () => {
    expect(findNameMatches('fee')).toContain('currency');
  });

  it('"make" name should match VEHICLE_MAKE', () => {
    expect(findNameMatches('make')).toContain('vehicleMake');
  });

  it('"title" name should match PREFIX or BOOK_TITLE', () => {
    const matches = findNameMatches('title');
    expect(
      matches.includes('name.prefix') || matches.includes('bookTitle')
    ).toBe(true);
  });

  // Apt/Suite positive cases
  it('"Apt" label should match ADDRESS_LINE2', () => {
    expect(findLabelMatches('Apt')).toContain('address.line2');
  });

  it('"Apt #" placeholder should match ADDRESS_LINE2', () => {
    expect(findPlaceholderMatches('Apt #')).toContain('address.line2');
  });

  // Make placeholder/label positive cases
  it('"Make" label should match VEHICLE_MAKE', () => {
    expect(findLabelMatches('Make')).toContain('vehicleMake');
  });

  it('"Make" placeholder should match VEHICLE_MAKE', () => {
    expect(findPlaceholderMatches('Make')).toContain('vehicleMake');
  });
});
