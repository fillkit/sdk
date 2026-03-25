/**
 * TF-IDF text similarity scorer for field detection.
 *
 * Provides continuous similarity signals (0.0–1.0) between input text tokens
 * and pre-computed vocabulary vectors for each semantic field type.
 * Script-aware tokenization handles Latin, CJK, RTL (Arabic, Hebrew,
 * Persian, Thaana), Cyrillic, Thai, Devanagari, Bengali, Tamil, Georgian,
 * and Armenian scripts.
 */

import { TFIDF_VOCABULARY } from '../data/tfidf-vocabulary.js';

/** Unicode script detection ranges. */
const SCRIPT_RANGES: ReadonlyArray<readonly [string, RegExp]> = [
  ['cjk', /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/],
  [
    'rtl',
    /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u0780-\u07BF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/,
  ],
  ['cyrillic', /[\u0400-\u04FF\u0500-\u052F]/],
  ['thai', /[\u0E00-\u0E7F]/],
  ['devanagari', /[\u0900-\u097F]/],
  ['bengali', /[\u0980-\u09FF]/],
  ['tamil', /[\u0B80-\u0BFF]/],
  ['georgian', /[\u10A0-\u10FF\u2D00-\u2D2F]/],
  ['armenian', /[\u0530-\u058F]/],
] as const;

/** Pre-compiled separator regex for splitting input text. */
const SEPARATOR_RE = /[_\-./\\:,;|+@#\s]+/;

/** CJK script detection for substring matching. */
const CJK_RE = /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

export interface TfidfScorerOptions {
  /** Minimum cosine similarity to include. Default: 0.1 */
  minScore?: number;
  /** Maximum number of results. Default: 5 */
  maxResults?: number;
}

/**
 * Pre-computed vocabulary entry for a single field type.
 * Avoids repeated Object.entries(), CJK regex tests, and magnitude
 * calculations on every scoreAll() call.
 */
interface VocabEntry {
  fieldType: string;
  tokens: ReadonlyArray<readonly [string, number]>;
  /** Indices into `tokens` where the token contains CJK characters. */
  cjkTokenIndices: ReadonlyArray<number>;
  /** Pre-computed sqrt(sum of weight²) for the vocab vector. */
  magnitude: number;
}

/** Per-locale cache of pre-computed VocabEntry arrays. */
const VOCAB_CACHE = new Map<string, VocabEntry[]>();

/**
 * Resolve and cache vocabulary entries for a locale.
 * Falls back: exact locale → base language → 'en'.
 */
function getVocabEntries(locale: string): VocabEntry[] {
  const cached = VOCAB_CACHE.get(locale);
  if (cached) return cached;

  let vocab = TFIDF_VOCABULARY[locale];
  if (!vocab && locale.includes('_')) {
    vocab = TFIDF_VOCABULARY[locale.split('_')[0]];
  }
  if (!vocab) vocab = TFIDF_VOCABULARY['en'];
  if (!vocab) return [];

  const entries: VocabEntry[] = [];
  for (const [fieldType, vocabVector] of Object.entries(vocab)) {
    const tokens = Object.entries(vocabVector) as Array<
      readonly [string, number]
    >;
    const cjkTokenIndices: number[] = [];
    let magnitudeSq = 0;
    for (let i = 0; i < tokens.length; i++) {
      magnitudeSq += tokens[i][1] * tokens[i][1];
      if (CJK_RE.test(tokens[i][0])) {
        cjkTokenIndices.push(i);
      }
    }
    entries.push({
      fieldType,
      tokens,
      cjkTokenIndices,
      magnitude: Math.sqrt(magnitudeSq),
    });
  }

  VOCAB_CACHE.set(locale, entries);
  return entries;
}

/**
 * Script-aware tokenization of input text.
 *
 * 1. Splits on common separators: `_-./\:,;|+@#` and whitespace
 * 2. For each segment, detects Unicode script:
 *    - Latin: camelCase split, lowercase, filter < 2 chars
 *    - Non-Latin: keep contiguous script runs as single tokens
 * 3. Deduplicates output tokens
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  const segments = text.split(SEPARATOR_RE).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const segment of segments) {
    const tokens = tokenizeByScript(segment);
    for (const token of tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        result.push(token);
      }
    }
  }

  return result;
}

/**
 * Compute cosine similarity between input tokens and all field type
 * vocabulary vectors for the given locale.
 *
 * Returns a Map of fieldType → similarity score, filtered by minScore
 * and capped at maxResults, sorted descending.
 */
export function scoreAll(
  tokens: string[],
  locale: string,
  options?: TfidfScorerOptions
): Map<string, number> {
  const minScore = options?.minScore ?? 0.1;
  const maxResults = options?.maxResults ?? 5;

  const entries = getVocabEntries(locale);
  if (entries.length === 0) return new Map();

  const inputSet = new Set(tokens);
  if (inputSet.size === 0) return new Map();

  // Top-N collection: maintain a small result map and a rising floor.
  const result = new Map<string, number>();
  let minKept = minScore;

  for (const entry of entries) {
    const score = cosineSimilarity(inputSet, entry);
    if (score < minKept) continue;

    result.set(entry.fieldType, score);

    // If we exceed maxResults, evict the lowest and raise the floor.
    if (result.size > maxResults) {
      let lowestKey = '';
      let lowestScore = Infinity;
      for (const [key, val] of result) {
        if (val < lowestScore) {
          lowestScore = val;
          lowestKey = key;
        }
      }
      result.delete(lowestKey);
      // Future entries must beat the new minimum to be considered.
      lowestScore = Infinity;
      for (const [, val] of result) {
        if (val < lowestScore) lowestScore = val;
      }
      minKept = lowestScore;
    }
  }

  return result;
}

/**
 * Script-aware tokenization of a single text segment.
 *
 * Exported for use by the vocabulary generation script to ensure
 * build-time and runtime tokenization are identical.
 */
export function tokenizeByScript(segment: string): string[] {
  const trimmed = segment.trim();
  if (!trimmed) return [];

  // Detect non-Latin script
  for (const [, re] of SCRIPT_RANGES) {
    if (re.test(trimmed)) {
      return [trimmed];
    }
  }

  // Latin: camelCase split + lowercase + filter < 2 chars
  return trimmed
    .replace(/([a-z])([A-Z])/g, '$1\0$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1\0$2')
    .split('\0')
    .map(t => t.toLowerCase())
    .filter(t => t.length >= 2);
}

/**
 * Cosine similarity between input token set (binary vector) and
 * a pre-computed vocabulary entry.
 *
 * For CJK tokens, substring matching is used: if an input token contains
 * a vocabulary token (or vice versa), it counts as a match. This handles
 * cases like input "メールアドレス" matching vocabulary token "メール".
 *
 * Input magnitude is capped at the number of matching tokens to avoid
 * penalizing longer field names that happen to contain more tokens.
 */
function cosineSimilarity(inputTokens: Set<string>, entry: VocabEntry): number {
  let dotProduct = 0;
  let matchCount = 0;

  // Fast path: exact Set.has() for all tokens (no allocation)
  for (const [token, weight] of entry.tokens) {
    if (inputTokens.has(token)) {
      dotProduct += weight;
      matchCount++;
    }
  }

  // CJK substring matching: only check pre-flagged CJK tokens
  if (entry.cjkTokenIndices.length > 0) {
    for (const idx of entry.cjkTokenIndices) {
      const [vocabToken, weight] = entry.tokens[idx];
      // Skip if already matched by exact lookup
      if (inputTokens.has(vocabToken)) continue;
      for (const inputToken of inputTokens) {
        if (
          inputToken.includes(vocabToken) ||
          vocabToken.includes(inputToken)
        ) {
          dotProduct += weight;
          matchCount++;
          break;
        }
      }
    }
  }

  if (dotProduct === 0) return 0;

  // Use matchCount instead of total inputTokens.size to avoid penalizing
  // longer field names with non-matching tokens
  const inputMagnitude = Math.sqrt(Math.max(matchCount, 1));
  return dotProduct / (inputMagnitude * entry.magnitude);
}
