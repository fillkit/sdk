import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FillKit, ConfigurationError } from '@/index.js';

const FILLKIT_INSTANCE_KEY = '__fillkit_instance__';

/**
 * Stub `window.location.protocol` to the given value.
 * jsdom defaults to 'about:' so we must explicitly set http:/https: for success cases.
 */
function stubProtocol(protocol: string): void {
  vi.stubGlobal('location', new URL(`${protocol}//localhost`));
}

describe('Protocol guard', () => {
  let instance: FillKit | null = null;

  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[FILLKIT_INSTANCE_KEY];
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (instance) {
      try {
        await instance.destroy();
      } catch {
        // best effort
      }
      instance = null;
    }
    // Reset singleton
    (FillKit as unknown as Record<string, unknown>)['pendingInit'] = null;
  });

  describe('FillKit.init() throws on unsupported protocols', () => {
    it.each(['file:', 'data:', 'blob:', 'about:'])(
      'throws ConfigurationError for %s',
      async protocol => {
        stubProtocol(protocol);
        await expect(FillKit.init({ ui: { enabled: false } })).rejects.toThrow(
          ConfigurationError
        );
      }
    );

    it('includes the protocol in the error message', async () => {
      stubProtocol('file:');
      await expect(FillKit.init({ ui: { enabled: false } })).rejects.toThrow(
        /file:/
      );
    });
  });

  describe('FillKit.init() succeeds on supported protocols', () => {
    it.each(['http:', 'https:'])('succeeds for %s', async protocol => {
      stubProtocol(protocol);
      instance = await FillKit.init({ ui: { enabled: false } });
      expect(instance).toBeInstanceOf(FillKit);
    });
  });

  describe('new FillKit() on unsupported protocol', () => {
    it('sets initError and initialized=false after ready resolves', async () => {
      stubProtocol('file:');
      instance = new FillKit({ ui: { enabled: false } });

      // ready should resolve (not reject) to avoid unhandled rejections
      await instance.ready;

      expect(instance.initError).toBeInstanceOf(ConfigurationError);
      const debug = instance.getDebugInfo();
      expect(debug.initialized).toBe(false);
    });
  });
});
