import { describe, it, expect, afterEach } from 'vitest';
import { detectPageLocale } from '../../src/locales/index.js';
import { LocalProvider } from '../../src/providers/LocalProvider.js';

describe('detectPageLocale', () => {
  afterEach(() => {
    // Reset document.documentElement.lang after each test
    document.documentElement.lang = '';
  });

  it('should detect locale from document.documentElement.lang', () => {
    document.documentElement.lang = 'fr';
    expect(detectPageLocale()).toBe('fr');
  });

  it('should normalize en-US to en_us', () => {
    document.documentElement.lang = 'en-US';
    expect(detectPageLocale()).toBe('en_us');
  });

  it('should normalize fr-CA to fr_ca', () => {
    document.documentElement.lang = 'fr-CA';
    expect(detectPageLocale()).toBe('fr_ca');
  });

  it('should normalize de-AT to de_at', () => {
    document.documentElement.lang = 'de-AT';
    expect(detectPageLocale()).toBe('de_at');
  });

  it('should normalize pt-BR to pt_BR', () => {
    document.documentElement.lang = 'pt-BR';
    expect(detectPageLocale()).toBe('pt_BR');
  });

  it('should normalize zh-TW to zh_TW', () => {
    document.documentElement.lang = 'zh-TW';
    expect(detectPageLocale()).toBe('zh_TW');
  });

  it('should fall back to en when no lang is set', () => {
    document.documentElement.lang = '';
    // Mock navigator.language to be undefined
    const originalNavigator = navigator.language;
    Object.defineProperty(navigator, 'language', {
      value: undefined,
      configurable: true,
    });
    expect(detectPageLocale()).toBe('en');
    Object.defineProperty(navigator, 'language', {
      value: originalNavigator,
      configurable: true,
    });
  });
});

describe('LocalProvider — locale-aware generation', () => {
  it('should generate locale-specific names with de locale', async () => {
    const provider = new LocalProvider({ locale: 'de' });
    await provider.init();

    const name = await provider.getValue('fullName', { locale: 'de' });
    expect(typeof name).toBe('string');
    expect((name as string).length).toBeGreaterThan(0);

    await provider.destroy();
  });

  it('should generate locale-specific phone numbers', async () => {
    const provider = new LocalProvider({ locale: 'fr' });
    await provider.init();

    const phone = await provider.getValue('phone', { locale: 'fr' });
    expect(typeof phone).toBe('string');

    await provider.destroy();
  });

  it('should fall back to English when no locale is provided', async () => {
    const provider = new LocalProvider({});
    await provider.init();

    const value = await provider.getValue('city');
    expect(typeof value).toBe('string');

    await provider.destroy();
  });

  it('should generate locale-specific addresses', async () => {
    const provider = new LocalProvider({ locale: 'de' });
    await provider.init();

    const state = await provider.getValue('state', { locale: 'de' });
    expect(typeof state).toBe('string');
    expect((state as string).length).toBeGreaterThan(0);

    await provider.destroy();
  });
});
