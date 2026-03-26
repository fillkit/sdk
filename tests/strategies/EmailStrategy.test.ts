import { describe, it, expect } from 'vitest';
import { EmailStrategy } from '../../src/strategies/EmailStrategy.js';
import { faker } from '@faker-js/faker';

describe('EmailStrategy', () => {
  const strategy = new EmailStrategy();

  describe('valid mode', () => {
    it('should use RFC 2606 safe domains when no emailDomain', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/@/);
      // exampleEmail uses example.com, example.net, example.org
      const domain = result.split('@')[1];
      expect(domain).toMatch(/example\.(com|net|org)/);
    });

    it('should use custom emailDomain when provided', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        emailDomain: 'test.dev',
      });
      expect(result).toContain('@test.dev');
    });

    it('should generate valid email format', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('formIdentity correlation', () => {
    it('should generate email containing identity firstName', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        formIdentity: { firstName: 'John', lastName: 'Smith' },
      });
      expect(result.toLowerCase()).toContain('john');
    });

    it('should use identity with custom emailDomain', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        emailDomain: 'test.dev',
        formIdentity: { firstName: 'Alice', lastName: 'Wonder' },
      });
      expect(result).toContain('@test.dev');
      const localPart = result.split('@')[0].toLowerCase();
      expect(localPart.includes('alice') || localPart.includes('wonder')).toBe(
        true
      );
    });

    it('should work without formIdentity (backwards compatible)', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/@/);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid email', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid email', () => {
      expect(strategy.validate('user@example.com', { constraints: {} })).toBe(
        true
      );
    });

    it('should reject email without @', () => {
      expect(strategy.validate('userexample.com', { constraints: {} })).toBe(
        false
      );
    });
  });
});
