/**
 * Creates a shared FormIdentity for correlated form data generation.
 *
 * @remarks
 * Scans a detection cache for person-related fields (name, email, username, etc.)
 * and generates a frozen identity (firstName, lastName, optionally sex) that
 * strategies can use to produce correlated values.
 */

import type { Faker } from '@faker-js/faker';
import type { FormIdentity } from '../types/index.js';
import type { FieldDetection } from './FieldDetector.js';
import { SemanticFieldType } from '../types/semantic-fields.js';

/** Semantic types that benefit from a shared person identity. */
const PERSON_RELATED_TYPES: ReadonlySet<string> = new Set([
  SemanticFieldType.NAME_GIVEN,
  SemanticFieldType.NAME_FAMILY,
  SemanticFieldType.FULL_NAME,
  SemanticFieldType.EMAIL,
  SemanticFieldType.USERNAME,
  SemanticFieldType.DISPLAY_NAME,
  SemanticFieldType.SEX,
  SemanticFieldType.GENDER,
]);

/**
 * Creates a FormIdentity when person-related fields are present.
 *
 * @param detectionCache - Map of elements to their detected field types.
 * @param fakerInstance - Faker instance for generating identity values.
 * @returns A frozen FormIdentity, or `undefined` if no person-related fields exist.
 */
export function createFormIdentity(
  detectionCache: Map<HTMLElement, FieldDetection>,
  fakerInstance: Faker
): FormIdentity | undefined {
  // Check if any detected field is person-related
  let hasPerson = false;
  let hasSexField = false;

  for (const detection of detectionCache.values()) {
    if (
      detection.semanticType &&
      PERSON_RELATED_TYPES.has(detection.semanticType)
    ) {
      hasPerson = true;
      if (
        detection.semanticType === SemanticFieldType.SEX ||
        detection.semanticType === SemanticFieldType.GENDER
      ) {
        hasSexField = true;
      }
      if (hasPerson && hasSexField) break;
    }
  }

  if (!hasPerson) {
    return undefined;
  }

  const sex = hasSexField
    ? fakerInstance.helpers.arrayElement(['female', 'male'] as const)
    : undefined;

  const firstName = fakerInstance.person.firstName(sex);
  const lastName = fakerInstance.person.lastName(sex);

  return Object.freeze({ firstName, lastName, sex });
}
