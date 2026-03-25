/**
 * Vehicle Strategy
 *
 * Generates Vehicle Identification Numbers (VINs) and license plates.
 * Uses faker.vehicle.vin() for structurally valid VINs with check digits.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class VehicleStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'wrong-length',
        'invalid-chars',
        'all-zeros',
        'with-spaces',
      ]);

      switch (invalidType) {
        case 'wrong-length':
          return fakerInstance.string.alphanumeric(10).toUpperCase();
        case 'invalid-chars':
          return 'VIN-WITH-HYPHENS-123';
        case 'all-zeros':
          return '00000000000000000';
        case 'with-spaces':
          return fakerInstance.string
            .alphanumeric(17)
            .toUpperCase()
            .replace(/(.{5})/g, '$1 ');
        default:
          return 'INVALID';
      }
    } else {
      let identifier: string;

      switch (fieldType) {
        case 'vin':
          identifier = fakerInstance.vehicle.vin();
          break;

        case 'licensePlate':
          identifier = this.generateLicensePlate(fakerInstance);
          break;

        case 'vehicleMake':
          return fakerInstance.vehicle.manufacturer();

        case 'vehicleModel':
          return fakerInstance.vehicle.model();

        case 'vehicleType':
          return fakerInstance.vehicle.type();

        case 'vehicleFuel':
          return fakerInstance.vehicle.fuel();

        case 'vehicleColor':
          return fakerInstance.vehicle.color();

        default:
          identifier = fakerInstance.vehicle.vin();
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(identifier); i++) {
          identifier =
            fieldType === 'licensePlate'
              ? this.generateLicensePlate(fakerInstance)
              : fakerInstance.vehicle.vin();
        }
      }

      return identifier;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const vehicle = value as string;
    const { constraints = {}, fieldType } = options;

    if (fieldType === 'vin') {
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vehicle)) return false;
    }

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(vehicle)) return false;
    }

    return true;
  }

  /**
   * Generate a realistic license plate (Faker's vrm() is UK-only, keep manual)
   */
  private generateLicensePlate(fakerInstance: typeof faker): string {
    const formats = [
      () => {
        const letters = fakerInstance.string.alpha(3).toUpperCase();
        const numbers = fakerInstance.string.numeric(4);
        return `${letters}${numbers}`;
      },
      () => {
        const letters = fakerInstance.string.alpha(3).toUpperCase();
        const numbers = fakerInstance.string.numeric(4);
        return `${letters}-${numbers}`;
      },
      () => {
        const numbers = fakerInstance.string.numeric(3);
        const letters = fakerInstance.string.alpha(3).toUpperCase();
        return `${numbers}${letters}`;
      },
    ];

    const generator = fakerInstance.helpers.arrayElement(formats);
    return generator();
  }
}
