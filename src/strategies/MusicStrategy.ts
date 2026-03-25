/**
 * Music Strategy
 *
 * Generates music-related data using faker.music module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class MusicStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement(['', '12345', 'N/A']);
    }

    switch (fieldType) {
      case 'musicGenre':
        return fakerInstance.music.genre();

      case 'songName':
        return fakerInstance.music.songName();

      case 'musicArtist':
        return fakerInstance.music.artist();

      default:
        return fakerInstance.music.genre();
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
