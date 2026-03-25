/**
 * Airline Strategy
 *
 * Generates airline-related data using faker.airline module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class AirlineStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement([
        '',
        'XX',
        '0000',
        'INVALID_FLIGHT',
      ]);
    }

    switch (fieldType) {
      case 'airlineName':
        return fakerInstance.airline.airline().name;

      case 'flightNumber': {
        const flight = fakerInstance.airline.flightNumber();
        return flight;
      }

      case 'seatNumber':
        return fakerInstance.airline.seat();

      case 'airportCode':
        return fakerInstance.airline.airport().iataCode;

      case 'recordLocator':
        return fakerInstance.airline.recordLocator();

      default:
        return fakerInstance.airline.airline().name;
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
