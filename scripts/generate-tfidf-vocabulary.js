#!/usr/bin/env node

/**
 * TF-IDF Vocabulary Generator
 *
 * Extracts tokens from FIELD_TYPE_REGISTRY, LOCALE_PATTERNS, and TFIDF_SYNONYMS,
 * computes per-locale IDF weights, and outputs a vocabulary TypeScript file.
 *
 * Usage:
 *   node scripts/generate-tfidf-vocabulary.js
 *   npm run generate:tfidf
 *
 * Output:
 *   src/data/tfidf-vocabulary.ts (committed to VCS)
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SDK_ROOT = join(__dirname, '..');

// Use tsx to load TypeScript modules
async function loadModules() {
  // We must use dynamic import with tsx loader already active
  // This script should be run via: node --import tsx scripts/generate-tfidf-vocabulary.js
  // Or: npx tsx scripts/generate-tfidf-vocabulary.js
  const semanticFields = await import('../src/types/semantic-fields.js');
  const localePatterns = await import('../src/locales/patterns/index.js');
  const synonyms = await import('../src/data/tfidf-synonyms.js');
  const scorer = await import('../src/utils/tfidf-scorer.js');

  return {
    FIELD_TYPE_REGISTRY: semanticFields.FIELD_TYPE_REGISTRY,
    SemanticFieldType: semanticFields.SemanticFieldType,
    LOCALE_PATTERNS: localePatterns.LOCALE_PATTERNS,
    TFIDF_SYNONYMS: synonyms.TFIDF_SYNONYMS,
    tokenizeByScript: scorer.tokenizeByScript,
  };
}

// ─── Token extraction ─────────────────────────────────────────────────

// tokenizeByScript is imported from the scorer module (loaded in loadModules)
// to ensure build-time and runtime tokenization are identical.
let _tokenizeByScript;

/**
 * Extract tokens from a regex source string.
 */
function extractTokensFromRegex(regex) {
  let src = regex.source;
  // Strip anchors
  src = src.replace(/^\^|\$$/g, '');
  // Strip char classes → separator
  src = src.replace(/\[([^\]]*)\]/g, ' ');
  // Strip escape sequences
  src = src.replace(/\\[bBdDwWsS]/g, '');
  // Strip quantifiers/groups
  src = src.replace(/[?*+{}()]/g, '');
  // Remove remaining backslashes
  src = src.replace(/\\/g, '');

  // Split on alternation
  const alternatives = src.split('|');
  const tokens = [];

  for (const alt of alternatives) {
    // Split on common separators
    const segments = alt.split(/[_\-.\s/]+/).filter(Boolean);
    for (const seg of segments) {
      tokens.push(..._tokenizeByScript(seg));
    }
  }
  return tokens;
}

/**
 * Autocomplete map (duplicated from FieldDetector.ts lines 63-99
 * because it's module-scoped and not exported).
 */
function getAutocompleteMap(SemanticFieldType) {
  return {
    'given-name': SemanticFieldType.NAME_GIVEN,
    'additional-name': SemanticFieldType.MIDDLE_NAME,
    'family-name': SemanticFieldType.NAME_FAMILY,
    name: SemanticFieldType.FULL_NAME,
    'honorific-prefix': SemanticFieldType.PREFIX,
    'honorific-suffix': SemanticFieldType.SUFFIX,
    email: SemanticFieldType.EMAIL,
    tel: SemanticFieldType.PHONE,
    'tel-country-code': SemanticFieldType.COUNTRY_CODE,
    'street-address': SemanticFieldType.ADDRESS_LINE1,
    'address-line1': SemanticFieldType.ADDRESS_LINE1,
    'address-line2': SemanticFieldType.ADDRESS_LINE2,
    'address-level2': SemanticFieldType.CITY,
    'address-level1': SemanticFieldType.STATE,
    'postal-code': SemanticFieldType.POSTAL_CODE,
    'country-name': SemanticFieldType.COUNTRY,
    country: SemanticFieldType.COUNTRY,
    bday: SemanticFieldType.BIRTH_DATE,
    'bday-day': SemanticFieldType.DATE,
    'bday-month': SemanticFieldType.MONTH,
    'bday-year': SemanticFieldType.DATE,
    sex: SemanticFieldType.SEX,
    username: SemanticFieldType.USERNAME,
    'new-password': SemanticFieldType.PASSWORD,
    'current-password': SemanticFieldType.PASSWORD,
    'cc-name': SemanticFieldType.FULL_NAME,
    'cc-number': SemanticFieldType.CREDIT_CARD_NUMBER,
    'cc-exp': SemanticFieldType.CREDIT_CARD_EXPIRY,
    'cc-exp-month': SemanticFieldType.CREDIT_CARD_EXP_MONTH,
    'cc-exp-year': SemanticFieldType.CREDIT_CARD_EXP_YEAR,
    'cc-csc': SemanticFieldType.CREDIT_CARD_CVV,
    organization: SemanticFieldType.COMPANY,
    'organization-title': SemanticFieldType.JOB_TITLE,
    url: SemanticFieldType.URL,
    language: SemanticFieldType.LANGUAGE,
  };
}

// ─── Source weight multipliers ────────────────────────────────────────

const WEIGHT_NAME_PATTERN = 1.0;
const WEIGHT_PLACEHOLDER_PATTERN = 0.8;
const WEIGHT_LABEL_PATTERN = 0.7;
const WEIGHT_DISPLAY_NAME = 0.6;
const WEIGHT_AUTOCOMPLETE = 0.6;
const WEIGHT_SYNONYM = 0.5;
const ANTI_TOKEN_PENALTY = 0.3;

// ─── Main generation logic ────────────────────────────────────────────

async function main() {
  console.log('Loading TypeScript modules...');
  const {
    FIELD_TYPE_REGISTRY,
    SemanticFieldType,
    LOCALE_PATTERNS,
    TFIDF_SYNONYMS,
    tokenizeByScript,
  } = await loadModules();

  // Set module-level reference for use by extractTokensFromRegex
  _tokenizeByScript = tokenizeByScript;

  const AUTOCOMPLETE_MAP = getAutocompleteMap(SemanticFieldType);

  const allFieldTypes = Object.keys(FIELD_TYPE_REGISTRY);
  console.log(`Found ${allFieldTypes.length} field types in registry`);

  const localeKeys = Object.keys(LOCALE_PATTERNS);
  console.log(`Found ${localeKeys.length} locale patterns`);

  // Build per-locale vocabulary
  const vocabulary = {};
  const allLocales = ['en', ...localeKeys.filter(k => k !== 'en')];

  for (const locale of allLocales) {
    const localeVocab = buildLocaleVocabulary(
      locale,
      FIELD_TYPE_REGISTRY,
      LOCALE_PATTERNS,
      TFIDF_SYNONYMS,
      AUTOCOMPLETE_MAP,
      allFieldTypes
    );
    if (Object.keys(localeVocab).length > 0) {
      vocabulary[locale] = localeVocab;
    }
  }

  console.log(
    `Generated vocabulary for ${Object.keys(vocabulary).length} locales`
  );

  // Write output and format with Prettier
  const outputPath = join(SDK_ROOT, 'src', 'data', 'tfidf-vocabulary.ts');
  const content = generateOutputFile(vocabulary, allLocales);
  writeFileSync(outputPath, content, 'utf-8');
  console.log(`Written to ${outputPath}`);

  try {
    execSync(`npx prettier --write "${outputPath}"`, {
      cwd: SDK_ROOT,
      stdio: 'inherit',
    });
    console.log('Formatted with Prettier');
  } catch {
    console.warn('Prettier formatting skipped (not available)');
  }

  // Stats
  let totalEntries = 0;
  let totalTokens = 0;
  for (const locale of Object.keys(vocabulary)) {
    for (const fieldType of Object.keys(vocabulary[locale])) {
      totalEntries++;
      totalTokens += Object.keys(vocabulary[locale][fieldType]).length;
    }
  }
  console.log(`Total entries: ${totalEntries}, Total tokens: ${totalTokens}`);
}

/**
 * Build vocabulary for a single locale.
 */
function buildLocaleVocabulary(
  locale,
  FIELD_TYPE_REGISTRY,
  LOCALE_PATTERNS,
  TFIDF_SYNONYMS,
  AUTOCOMPLETE_MAP,
  allFieldTypes
) {
  // Collect raw token weights per field type: fieldType → Map<token, weight>
  const rawTokens = new Map();

  for (const fieldType of allFieldTypes) {
    const tokenWeights = new Map();
    const metadata = FIELD_TYPE_REGISTRY[fieldType];

    if (locale === 'en') {
      // Source A: FIELD_TYPE_REGISTRY patterns
      if (metadata.namePatterns) {
        for (const re of metadata.namePatterns) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_NAME_PATTERN);
          }
        }
      }
      if (metadata.placeholderPatterns) {
        for (const re of metadata.placeholderPatterns) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_PLACEHOLDER_PATTERN);
          }
        }
      }
      if (metadata.labelPatterns) {
        for (const re of metadata.labelPatterns) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_LABEL_PATTERN);
          }
        }
      }

      // Source A: displayName
      if (metadata.displayName) {
        const words = metadata.displayName
          .split(/\s+/)
          .filter(w => w.length >= 2);
        for (const word of words) {
          mergeWeight(tokenWeights, word.toLowerCase(), WEIGHT_DISPLAY_NAME);
        }
      }
    }

    // Source B: Autocomplete map (all locales, since autocomplete is HTML-standard)
    for (const [acKey, acFieldType] of Object.entries(AUTOCOMPLETE_MAP)) {
      if (acFieldType === fieldType) {
        const acTokens = acKey.split(/[-_]/).filter(t => t.length >= 2);
        for (const tok of acTokens) {
          mergeWeight(tokenWeights, tok.toLowerCase(), WEIGHT_AUTOCOMPLETE);
        }
      }
    }

    // Source C: Synonym enrichment (all locales, since synonyms are English-based)
    const synonymEntry = TFIDF_SYNONYMS[fieldType];
    if (synonymEntry) {
      for (const tok of synonymEntry.tokens) {
        mergeWeight(tokenWeights, tok.toLowerCase(), WEIGHT_SYNONYM);
      }
    }

    // Locale-specific patterns
    const localePatterns = LOCALE_PATTERNS[locale];
    if (localePatterns) {
      if (localePatterns.name && localePatterns.name[fieldType]) {
        for (const re of localePatterns.name[fieldType]) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_NAME_PATTERN);
          }
        }
      }
      if (localePatterns.placeholder && localePatterns.placeholder[fieldType]) {
        for (const re of localePatterns.placeholder[fieldType]) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_PLACEHOLDER_PATTERN);
          }
        }
      }
      if (localePatterns.label && localePatterns.label[fieldType]) {
        for (const re of localePatterns.label[fieldType]) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_LABEL_PATTERN);
          }
        }
      }
    }

    // For non-English locales, merge English tokens as fallback
    if (locale !== 'en') {
      const enPatterns = LOCALE_PATTERNS['en'];
      if (enPatterns) {
        if (enPatterns.name && enPatterns.name[fieldType]) {
          for (const re of enPatterns.name[fieldType]) {
            for (const tok of extractTokensFromRegex(re)) {
              mergeWeight(tokenWeights, tok, WEIGHT_NAME_PATTERN * 0.5); // Lower weight for fallback
            }
          }
        }
      }

      // Also merge English FIELD_TYPE_REGISTRY patterns for non-en locales
      if (metadata.namePatterns) {
        for (const re of metadata.namePatterns) {
          for (const tok of extractTokensFromRegex(re)) {
            mergeWeight(tokenWeights, tok, WEIGHT_NAME_PATTERN * 0.5);
          }
        }
      }
    }

    if (tokenWeights.size > 0) {
      rawTokens.set(fieldType, tokenWeights);
    }
  }

  // Compute IDF
  const N = rawTokens.size; // Number of field types with tokens
  if (N === 0) return {};

  // Document frequency: how many field types contain each token
  const df = new Map();
  for (const [, tokenWeights] of rawTokens) {
    for (const token of tokenWeights.keys()) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  // Compute TF-IDF vectors
  const result = {};

  for (const [fieldType, tokenWeights] of rawTokens) {
    const vector = {};
    const synonymEntry = TFIDF_SYNONYMS[fieldType];
    const antiTokens = new Set(
      synonymEntry?.antiTokens?.map(t => t.toLowerCase()) || []
    );

    let maxWeight = 0;

    for (const [token, rawWeight] of tokenWeights) {
      const idf = Math.log(N / (1 + (df.get(token) || 0)));

      // Apply anti-token penalty
      let penalty = 1.0;
      if (antiTokens.has(token)) {
        penalty = ANTI_TOKEN_PENALTY;
      }

      const weight = rawWeight * idf * penalty;
      if (weight > 0.05) {
        // Filter near-zero weights
        vector[token] = weight;
        if (weight > maxWeight) maxWeight = weight;
      }
    }

    // Normalize to 0.0-1.0 range
    if (maxWeight > 0 && Object.keys(vector).length > 0) {
      const normalized = {};
      for (const [token, weight] of Object.entries(vector)) {
        normalized[token] = Math.round((weight / maxWeight) * 1000) / 1000;
      }
      result[fieldType] = normalized;
    }
  }

  return result;
}

/**
 * Merge weight: keep maximum weight for each token.
 */
function mergeWeight(map, token, weight) {
  const existing = map.get(token) || 0;
  if (weight > existing) {
    map.set(token, weight);
  }
}

/**
 * Generate the output TypeScript file content.
 */
function generateOutputFile(vocabulary, allLocales) {
  const lines = [];

  lines.push('/** @generated — regenerate with: npm run generate:tfidf */');
  lines.push('');
  lines.push(
    '/** Per-locale TF-IDF token index: locale → fieldType → { token: weight } */'
  );
  lines.push('export const TFIDF_VOCABULARY: Readonly<');
  lines.push(
    '  Record<string, Readonly<Record<string, Readonly<Record<string, number>>>>>'
  );
  lines.push(`> = ${JSON.stringify(vocabulary, null, 2)} as const;`);
  lines.push('');
  lines.push('/** All locale codes present in the vocabulary. */');
  lines.push(
    `export const VOCABULARY_LOCALES: readonly string[] = ${JSON.stringify(Object.keys(vocabulary))} as const;`
  );
  lines.push('');
  lines.push('/** Vocabulary metadata for validation. */');

  // Count total unique field types across all locales
  const allTypes = new Set();
  for (const localeVocab of Object.values(vocabulary)) {
    for (const fieldType of Object.keys(localeVocab)) {
      allTypes.add(fieldType);
    }
  }
  const totalFieldTypes = allTypes.size;

  lines.push('export const VOCABULARY_META = {');
  lines.push(`  generatedAt: '${new Date().toISOString()}',`);
  lines.push(`  localeCount: ${Object.keys(vocabulary).length},`);
  lines.push(`  totalFieldTypes: ${totalFieldTypes},`);
  lines.push("  version: '1.0.0',");
  lines.push('} as const;');
  lines.push('');

  return lines.join('\n');
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
