/**
 * Template Helpers
 *
 * Utility wrapping faker.helpers.fake() for composite value templates.
 */

import type { faker as FakerType } from '@faker-js/faker';

/**
 * Generate a composite value from a Faker template string.
 *
 * @param template - Faker template (e.g., '{{person.fullName}} at {{company.name}}')
 * @param fakerInstance - Faker instance
 * @returns Resolved template string
 */
export function generateFromTemplate(
  template: string,
  fakerInstance: typeof FakerType
): string {
  try {
    return fakerInstance.helpers.fake(template);
  } catch {
    // If template parsing fails, return the raw template
    return template;
  }
}
