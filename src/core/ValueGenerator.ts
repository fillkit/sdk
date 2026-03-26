/**
 * Generates values for semantic field types using DatasetProvider.
 *
 * @remarks
 * Coordinates value generation, profiles, and overrides. Acts as a facade
 * for the underlying DatasetProvider, adding support for override values
 * and batch generation.
 */

import type {
  DatasetProvider,
  ValueOptions,
  ProfileOptions,
} from '../types/index.js';
import { SemanticFieldType } from '../types/semantic-fields.js';
import { logger } from '@/core/Logger.js';

/**
 * Options for value generation with overrides
 */
export interface GenerateOptions extends ValueOptions {
  /** Override values for specific field types */
  overrides?: Record<string, string | number | boolean | null>;
}

/**
 * Generates values for semantic field types using a DatasetProvider.
 *
 * Responsibilities:
 * - Coordinate with DatasetProvider for value generation
 * - Handle override values
 * - Generate coherent profiles
 *
 * @example
 * ```ts
 * const generator = new ValueGenerator();
 * generator.setProvider(localProvider);
 *
 * // Generate single value
 * const email = await generator.generate('email', {
 *   mode: 'valid',
 *   constraints: { maxlength: 50 }
 * });
 *
 * // Generate with override
 * const phone = await generator.generate('phone', {
 *   overrides: { phone: '+1234567890' }
 * });
 *
 * // Generate profile
 * const profile = await generator.generateProfile({
 *   locale: 'en'
 * });
 * ```
 */
export class ValueGenerator {
  private provider: DatasetProvider | null = null;

  /**
   * Set the data provider.
   * The provider handles actual value generation.
   *
   * @param provider - The dataset provider to use
   */
  setProvider(provider: DatasetProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current data provider.
   *
   * @returns The current provider, or null if not set
   */
  getProvider(): DatasetProvider | null {
    return this.provider;
  }

  /**
   * Generate value for a specific field type.
   * Checks for override values first, then delegates to provider.
   *
   * @param fieldType - The semantic field type to generate
   * @param options - Generation options including mode, constraints, and overrides
   * @returns The generated value, or null if generation fails
   * @throws Error if provider is not set
   *
   * @example
   * ```ts
   * // Generate valid email
   * const email = await generator.generate('email', {
   *   mode: 'valid',
   *   constraints: { maxlength: 50 }
   * });
   *
   * // Generate with override
   * const phone = await generator.generate('phone', {
   *   overrides: { phone: '+1234567890' }
   * });
   * ```
   */
  async generate(
    fieldType: SemanticFieldType | string,
    options: GenerateOptions = {}
  ): Promise<string | number | boolean | null> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    // Check for override values
    if (options.overrides) {
      // First, check selector-based overrides (if element is provided)
      if (options.element) {
        for (const [key, value] of Object.entries(options.overrides)) {
          if (this.isSelector(key)) {
            try {
              if (options.element.matches(key)) {
                return value as string | number | boolean | null;
              }
            } catch {
              logger.warn(`[FillKit] Invalid selector in overrides: "${key}"`);
            }
          }
        }
      }

      // Then, check semantic type override
      if (fieldType in options.overrides) {
        const overrideValue = options.overrides[fieldType];
        return overrideValue as string | number | boolean | null;
      }
    }

    // Generate from provider
    try {
      return await this.provider.getValue(fieldType, options);
    } catch (error) {
      logger.error(`Failed to generate value for ${fieldType}:`, error);
      return null;
    }
  }

  /**
   * Check if a key is a CSS selector (vs semantic type).
   * Selectors contain special characters like #, ., [, ], >, +, ~, or spaces.
   *
   * @param key - The key to check
   * @returns True if the key appears to be a CSS selector
   *
   * @example
   * ```ts
   * isSelector('#email')           // true - ID selector
   * isSelector('.special-field')   // true - class selector
   * isSelector('input[name="x"]')  // true - attribute selector
   * isSelector('email')            // false - semantic type
   * isSelector('firstName')        // false - semantic type
   * ```
   */
  private isSelector(key: string): boolean {
    return /[#.\[\]>+~\s]/.test(key);
  }

  /**
   * Generate a coherent profile of related fields.
   * Useful for generating consistent user data across multiple fields.
   *
   * @param options - Profile generation options
   * @returns Object containing generated profile data
   * @throws Error if provider is not set or doesn't support profiles
   *
   * @example
   * ```ts
   * const profile = await generator.generateProfile({
   *   locale: 'en',
   *   seed: 12345
   * });
   *
   * // Profile contains:
   * // - fullName, givenName, familyName
   * // - email, phone
   * // - address, city, state, postalCode
   * // - company, jobTitle
   * // - etc.
   * ```
   */
  async generateProfile(
    options: ProfileOptions = {}
  ): Promise<Record<string, unknown>> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    if (!this.provider.getProfile) {
      throw new Error('Provider does not support profile generation');
    }

    try {
      return await this.provider.getProfile(options);
    } catch (error) {
      logger.error('Failed to generate profile:', error);
      throw error;
    }
  }

  /**
   * Check if provider is set and ready.
   *
   * @returns True if provider is configured
   */
  isReady(): boolean {
    return this.provider !== null;
  }

  /**
   * Check if current provider supports profile generation.
   *
   * @returns True if getProfile() is available
   */
  supportsProfiles(): boolean {
    return this.provider !== null && 'getProfile' in this.provider;
  }

  /**
   * Generate multiple values at once.
   * Useful for bulk generation with consistent options.
   *
   * @param fieldTypes - Array of field types to generate
   * @param options - Shared generation options
   * @returns Map of field types to generated values
   *
   * @example
   * ```ts
   * const values = await generator.generateBatch(
   *   ['email', 'phone', 'fullName'],
   *   { mode: 'valid', locale: 'en' }
   * );
   *
   * console.log(values.get('email')); // generated@email.com
   * console.log(values.get('phone')); // +1234567890
   * ```
   */
  async generateBatch(
    fieldTypes: (SemanticFieldType | string)[],
    options: GenerateOptions = {}
  ): Promise<Map<string, string | number | boolean | null>> {
    const results = new Map<string, string | number | boolean | null>();

    await Promise.all(
      fieldTypes.map(async fieldType => {
        const value = await this.generate(fieldType, options);
        results.set(fieldType, value);
      })
    );

    return results;
  }

  /**
   * Validate if a generated value would be valid for the given options.
   * Delegates to provider's validate method if available.
   *
   * @param fieldType - The field type to validate for
   * @param value - The value to validate
   * @param options - Validation options
   * @returns True if value is valid
   */
  async validate(
    fieldType: SemanticFieldType | string,
    value: string | number | boolean,
    options: ValueOptions = {}
  ): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    // If provider has validate method, use it
    if (
      'validate' in this.provider &&
      typeof this.provider.validate === 'function'
    ) {
      try {
        return await (
          this.provider as {
            validate: (
              fieldType: string,
              value: string | number | boolean,
              options: ValueOptions
            ) => Promise<boolean>;
          }
        ).validate(fieldType, value, options);
      } catch {
        return false;
      }
    }

    // Basic validation fallback
    return value !== null && value !== undefined && value !== '';
  }
}
