/**
 * DevTools Strategy
 *
 * Generates developer-oriented data using faker.database and faker.git modules.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class DevToolsStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement([
        '',
        'not-a-valid-id',
        '!!invalid!!',
      ]);
    }

    switch (fieldType) {
      case 'mongodbId':
        return fakerInstance.database.mongodbObjectId();

      case 'commitSha':
        return fakerInstance.git.commitSha();

      case 'gitBranch':
        return fakerInstance.git.branch();

      case 'commitMessage':
        return fakerInstance.git.commitMessage();

      case 'databaseColumn':
        return fakerInstance.database.column();

      case 'databaseType':
        return fakerInstance.database.type();

      case 'databaseEngine':
        return fakerInstance.database.engine();

      default:
        return fakerInstance.database.mongodbObjectId();
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
