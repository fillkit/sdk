/**
 * Slug Strategy
 *
 * Generates URL-friendly slugs for permalinks, routes, and identifiers.
 * Commonly used in CMS, blogs, e-commerce product URLs, and routing.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class SlugStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid slugs
      const invalidTypes = [
        'with-spaces',
        'with-uppercase',
        'with-special-chars',
        'starts-with-hyphen',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'with-spaces':
          return fakerInstance.lorem.words(3);
        case 'with-uppercase':
          return fakerInstance.lorem.slug().toUpperCase();
        case 'with-special-chars':
          return fakerInstance.lorem.slug() + '!@#$%';
        case 'starts-with-hyphen':
          return '-' + fakerInstance.lorem.slug();
        default:
          return 'invalid slug';
      }
    } else {
      // Generate valid URL slug
      let slug = fakerInstance.lorem.slug();

      // Apply length constraints
      const minLength = constraints.minlength || 0;
      const maxLength = constraints.maxlength || Infinity;

      // If too short, add more words
      if (slug.length < minLength) {
        while (slug.length < minLength) {
          slug += '-' + fakerInstance.lorem.word().toLowerCase();
        }
      }

      // If too long, truncate at word boundary
      if (slug.length > maxLength && maxLength !== Infinity) {
        slug = slug.substring(0, maxLength);
        // Remove trailing hyphen if present
        if (slug.endsWith('-')) {
          slug = slug.substring(0, slug.length - 1);
        }
      }

      // Respect pattern constraint if provided
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(slug); i++) {
          slug = fakerInstance.lorem.slug();

          // Reapply length constraints
          if (slug.length < minLength) {
            while (slug.length < minLength) {
              slug += '-' + fakerInstance.lorem.word().toLowerCase();
            }
          }
          if (slug.length > maxLength && maxLength !== Infinity) {
            slug = slug.substring(0, maxLength);
            if (slug.endsWith('-')) {
              slug = slug.substring(0, slug.length - 1);
            }
          }
        }
      }

      return slug;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const slug = value as string;
    const { constraints = {} } = options;

    // Valid slug format: lowercase letters, numbers, and hyphens only
    // Cannot start or end with hyphen
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) return false;

    // Check length constraints
    if (constraints.minlength && slug.length < constraints.minlength)
      return false;
    if (constraints.maxlength && slug.length > constraints.maxlength)
      return false;

    // Check pattern if provided
    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(slug)) return false;
    }

    return true;
  }
}
