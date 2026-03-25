/**
 * Manages value generation strategies for semantic field types.
 *
 * @remarks
 * Maps field types to strategy implementations for custom value generation.
 * Allows registration, retrieval, and removal of strategies for different
 * semantic field types.
 */

import type { Strategy } from '../types/index.js';
import { SemanticFieldType } from '../types/semantic-fields.js';

/**
 * Strategy registry for managing field type strategies.
 *
 * @example
 * ```ts
 * const registry = new StrategyRegistry();
 *
 * // Register a custom strategy
 * registry.registerStrategy(SemanticFieldType.EMAIL, {
 *   generate: (options) => 'user@example.com',
 *   validate: (value) => /^[^\s@]+@[^\s@]+$/.test(value)
 * });
 *
 * // Get and use a strategy
 * const strategy = registry.getStrategy(SemanticFieldType.EMAIL);
 * if (strategy) {
 *   const email = strategy.generate({ mode: 'valid' });
 * }
 * ```
 */
export class StrategyRegistry {
  private strategies: Map<SemanticFieldType, Strategy> = new Map();

  /**
   * Register a strategy for a semantic field type.
   * If a strategy already exists for this type, it will be replaced.
   *
   * @param type - The semantic field type
   * @param strategy - The strategy implementation
   */
  registerStrategy(type: SemanticFieldType, strategy: Strategy): void {
    this.strategies.set(type, strategy);
  }

  /**
   * Get the strategy for a semantic field type.
   *
   * @param type - The semantic field type
   * @returns The strategy instance, or null if not registered
   */
  getStrategy(type: SemanticFieldType): Strategy | null {
    return this.strategies.get(type) || null;
  }

  /**
   * Check if a strategy is registered for a field type.
   *
   * @param type - The semantic field type to check
   * @returns True if a strategy exists for this type
   */
  hasStrategy(type: SemanticFieldType): boolean {
    return this.strategies.has(type);
  }

  /**
   * Get all field types that have registered strategies.
   *
   * @returns Array of semantic field types with strategies
   */
  getRegisteredTypes(): SemanticFieldType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Clear all registered strategies.
   * Removes all strategy mappings from the registry.
   */
  clear(): void {
    this.strategies.clear();
  }

  /**
   * Remove the strategy for a specific field type.
   *
   * @param type - The semantic field type
   * @returns True if a strategy was removed, false if none existed
   */
  removeStrategy(type: SemanticFieldType): boolean {
    return this.strategies.delete(type);
  }
}
