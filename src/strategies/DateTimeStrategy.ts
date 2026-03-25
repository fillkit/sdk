/**
 * DateTime Strategy
 *
 * Generates date, time, datetime, month, and week values using Faker.js date API.
 * Uses faker.date.birthdate() for realistic birth dates.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class DateTimeStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'invalid-format',
        'future-date',
        'past-date',
        'leap-year',
      ]);

      switch (invalidType) {
        case 'invalid-format':
          return fakerInstance.lorem.word();
        case 'future-date':
          return fakerInstance.date.future().toISOString();
        case 'past-date':
          return fakerInstance.date.past({ years: 200 }).toISOString();
        case 'leap-year':
          return '2023-02-29';
        default:
          return 'invalid-date';
      }
    } else {
      switch (fieldType) {
        case 'birthDate':
          return this.generateBirthDate(mode, constraints, fakerInstance);

        case 'age':
          return fakerInstance.number.int({ min: 18, max: 100 }).toString();

        case 'datetime':
          return this.generateDateTime(mode, constraints, fakerInstance);

        case 'time':
          return this.generateTime(mode, constraints, fakerInstance);

        case 'month':
          return this.generateMonth(mode, constraints, fakerInstance);

        case 'week':
          return this.generateWeek(mode, constraints, fakerInstance);

        case 'weekday':
          return fakerInstance.date.weekday({
            abbreviated: constraints.maxlength
              ? constraints.maxlength <= 3
              : false,
          });

        case 'monthName':
          return fakerInstance.date.month({
            abbreviated: constraints.maxlength
              ? constraints.maxlength <= 3
              : false,
          });

        case 'date':
        default:
          return this.generateDate(mode, constraints, fakerInstance);
      }
    }
  }

  private generateDate(
    mode: 'valid' | 'invalid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    const minDate = constraints.min
      ? new Date(constraints.min)
      : new Date('1970-01-01');
    const maxDate = constraints.max
      ? new Date(constraints.max)
      : new Date('2100-12-31');

    if (mode === 'invalid') {
      const outOfRange = fakerInstance.helpers.arrayElement([
        new Date(minDate.getTime() - 365 * 24 * 60 * 60 * 1000),
        new Date(maxDate.getTime() + 365 * 24 * 60 * 60 * 1000),
      ]);
      return outOfRange.toISOString().split('T')[0];
    }

    const date = fakerInstance.date.between({
      from: minDate,
      to: maxDate,
    });

    return date.toISOString().split('T')[0];
  }

  private generateBirthDate(
    _mode: 'valid' | 'invalid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    if (constraints.min || constraints.max) {
      const minDate = constraints.min
        ? new Date(constraints.min)
        : new Date(
            new Date().getFullYear() - 80,
            new Date().getMonth(),
            new Date().getDate()
          );
      const maxDate = constraints.max
        ? new Date(constraints.max)
        : new Date(
            new Date().getFullYear() - 18,
            new Date().getMonth(),
            new Date().getDate()
          );

      return fakerInstance.date
        .between({ from: minDate, to: maxDate })
        .toISOString()
        .split('T')[0];
    }

    return fakerInstance.date
      .birthdate({ mode: 'age', min: 18, max: 65 })
      .toISOString()
      .split('T')[0];
  }

  generateMonth(
    mode: 'valid' | 'invalid' = 'valid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'invalid-month',
        'month-too-high',
        'month-too-low',
        'wrong-format',
      ]);

      switch (invalidType) {
        case 'invalid-month':
          return 'not-a-month';
        case 'month-too-high':
          return `${fakerInstance.date.future().getFullYear()}-13`;
        case 'month-too-low':
          return `${fakerInstance.date.past().getFullYear()}-00`;
        case 'wrong-format': {
          const d = fakerInstance.date.recent();
          return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        }
        default:
          return 'invalid-month';
      }
    }

    const minDate = constraints.min
      ? new Date(constraints.min)
      : new Date('2020-01-01');
    const maxDate = constraints.max
      ? new Date(constraints.max)
      : new Date('2030-12-31');

    const date = fakerInstance.date.between({
      from: minDate,
      to: maxDate,
    });
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  generateWeek(
    mode: 'valid' | 'invalid' = 'valid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'invalid-week',
        'week-too-high',
        'week-too-low',
        'missing-hyphen',
      ]);

      switch (invalidType) {
        case 'invalid-week':
          return 'not-a-week';
        case 'week-too-high':
          return `${fakerInstance.date.future().getFullYear()}-W54`;
        case 'week-too-low':
          return `${fakerInstance.date.past().getFullYear()}-W00`;
        case 'missing-hyphen': {
          const year = fakerInstance.date.recent().getFullYear();
          return `${year}W${fakerInstance.number.int({ min: 1, max: 52 })}`;
        }
        default:
          return 'invalid-week';
      }
    }

    const minDate = constraints.min
      ? new Date(constraints.min)
      : new Date('2020-01-01');
    const maxDate = constraints.max
      ? new Date(constraints.max)
      : new Date('2030-12-31');

    const date = fakerInstance.date.between({
      from: minDate,
      to: maxDate,
    });
    const year = date.getFullYear();

    const startOfYear = new Date(year, 0, 1);
    const daysSinceStart = Math.floor(
      (date.getTime() - startOfYear.getTime()) / 86400000
    );
    const weekNum = Math.min(
      53,
      Math.max(1, Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7))
    );

    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  generateTime(
    mode: 'valid' | 'invalid' = 'valid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'hour-too-high',
        'minute-too-high',
        'wrong-format',
      ]);

      switch (invalidType) {
        case 'hour-too-high':
          return '25:30';
        case 'minute-too-high':
          return '12:60';
        case 'wrong-format':
          return fakerInstance.lorem.word();
        default:
          return 'invalid-time';
      }
    }

    const parseTime = (
      timeStr?: string | number
    ): { hours: number; minutes: number } => {
      if (!timeStr) return { hours: 0, minutes: 0 };
      const str = typeof timeStr === 'number' ? timeStr.toString() : timeStr;
      const parts = str.split(':');
      return {
        hours: parseInt(parts[0]) || 0,
        minutes: parseInt(parts[1]) || 0,
      };
    };

    const min = parseTime(constraints.min);
    const max = parseTime(constraints.max ?? '23:59');

    const minMinutes = min.hours * 60 + min.minutes;
    const maxMinutes = max.hours * 60 + max.minutes;
    const totalMinutes = fakerInstance.number.int({
      min: minMinutes,
      max: maxMinutes,
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  generateDateTime(
    mode: 'valid' | 'invalid' = 'valid',
    constraints: ValueOptions['constraints'] = {},
    fakerInstance: typeof faker
  ): string {
    if (mode === 'invalid') {
      const outOfRangeDate = this.generateDate(
        'invalid',
        constraints,
        fakerInstance
      );
      const outOfRangeTime = this.generateTime(
        'invalid',
        constraints,
        fakerInstance
      );
      return `${outOfRangeDate}T${outOfRangeTime}`;
    }

    const minDate = constraints.min
      ? new Date(constraints.min)
      : new Date('1970-01-01T00:00');
    const maxDate = constraints.max
      ? new Date(constraints.max)
      : new Date('2100-12-31T23:59');

    const date = fakerInstance.date.between({
      from: minDate,
      to: maxDate,
    });

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const dateStr = value as string;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;

    return true;
  }
}
