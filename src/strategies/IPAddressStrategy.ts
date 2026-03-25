/**
 * IP Address Strategy
 *
 * Generates IPv4 and IPv6 addresses for network configuration fields.
 * Commonly used in server settings, networking, and security configurations.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class IPAddressStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid IP addresses
      const invalidTypes = [
        'out-of-range',
        'too-many-octets',
        'non-numeric',
        'wrong-format',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'out-of-range':
          return '999.999.999.999';
        case 'too-many-octets':
          return '192.168.1.1.1';
        case 'non-numeric':
          return 'abc.def.ghi.jkl';
        case 'wrong-format':
          return '192-168-1-1';
        default:
          return 'invalid-ip';
      }
    } else {
      // Generate valid IP address based on field type
      let ip: string;

      switch (fieldType) {
        case 'ipv4':
        case 'ipAddress':
          // Generate IPv4 address
          ip = fakerInstance.internet.ipv4();
          break;

        case 'ipv6':
          // Generate IPv6 address
          ip = fakerInstance.internet.ipv6();
          break;

        default:
          // Default to IPv4
          ip = fakerInstance.internet.ipv4();
      }

      // Respect pattern constraint if provided
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(ip); i++) {
          ip =
            fieldType === 'ipv6'
              ? fakerInstance.internet.ipv6()
              : fakerInstance.internet.ipv4();
        }
      }

      return ip;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const ip = value as string;
    const { constraints = {}, fieldType } = options;

    // Validate format based on field type
    if (fieldType === 'ipv4' || fieldType === 'ipAddress') {
      // IPv4 validation: xxx.xxx.xxx.xxx where xxx is 0-255
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4Regex.test(ip)) return false;
    } else if (fieldType === 'ipv6') {
      // IPv6 validation: basic format check
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      if (!ipv6Regex.test(ip)) return false;
    }

    // Check pattern if provided
    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(ip)) return false;
    }

    return true;
  }
}
