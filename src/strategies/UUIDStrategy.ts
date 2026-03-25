/**
 * UUID/GUID Strategy
 *
 * Generates universally unique identifiers (UUIDs) and globally unique identifiers (GUIDs).
 * Commonly used for unique keys, session IDs, and database identifiers.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class UUIDStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid UUIDs
      const invalidTypes = [
        'wrong-length',
        'missing-hyphens',
        'invalid-chars',
        'wrong-version',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'wrong-length':
          return fakerInstance.string.uuid().substring(0, 30);
        case 'missing-hyphens':
          return fakerInstance.string.uuid().replace(/-/g, '');
        case 'invalid-chars':
          return 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz';
        case 'wrong-version':
          return fakerInstance.string.uuid().replace(/^(.{14})./, '$19'); // Invalid version digit
        default:
          return 'invalid-uuid';
      }
    } else {
      // Generate valid UUID
      let uuid = fakerInstance.string.uuid();

      // GUID is just Microsoft's term for UUID - same format
      // Both use the standard UUID v4 format

      // Respect pattern constraint if provided
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(uuid); i++) {
          uuid = fakerInstance.string.uuid();
        }
      }

      return uuid;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const uuid = value as string;
    const { constraints = {} } = options;

    // Standard UUID v4 format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) return false;

    // Check pattern if provided
    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(uuid)) return false;
    }

    return true;
  }
}
