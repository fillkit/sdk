import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudProvider } from '@/providers/CloudProvider.js';
import { ProviderError } from '@/types/index.js';

describe('CloudProvider', () => {
  const validConfig = {
    projectId: 'proj_test_123',
    token: 'fk_live_abcdefghij',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor validation', () => {
    it('creates instance with valid config', () => {
      const provider = new CloudProvider(validConfig);
      expect(provider).toBeInstanceOf(CloudProvider);
    });

    it('throws ProviderError without projectId', () => {
      expect(
        () =>
          new CloudProvider({
            projectId: '',
            token: 'fk_live_abcdefghij',
          })
      ).toThrow(ProviderError);
    });

    it('throws ProviderError without token', () => {
      expect(
        () =>
          new CloudProvider({
            projectId: 'proj_123',
            token: '',
          })
      ).toThrow(ProviderError);
    });

    it('throws ProviderError when config is null', () => {
      expect(
        () =>
          new CloudProvider(
            null as unknown as { projectId: string; token: string }
          )
      ).toThrow(ProviderError);
    });
  });

  describe('token format validation', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('accepts fk_live_ tokens without warning', () => {
      new CloudProvider({
        projectId: 'proj_123',
        token: 'fk_live_abcdefghij',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts fk_test_ tokens without warning', () => {
      new CloudProvider({
        projectId: 'proj_123',
        token: 'fk_test_abcdefghij',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns on invalid token format', () => {
      new CloudProvider({
        projectId: 'proj_123',
        token: 'invalid_token_format',
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token format unexpected')
      );
    });

    it('warns on short token suffix', () => {
      new CloudProvider({
        projectId: 'proj_123',
        token: 'fk_live_short',
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token format unexpected')
      );
    });
  });

  describe('setAuthToken', () => {
    it('updates token successfully', () => {
      const provider = new CloudProvider(validConfig);
      provider.setAuthToken('fk_live_newtoken1234');
      expect(provider.getAuthToken()).toBe('fk_live_newtoken1234');
    });

    it('throws ProviderError for empty token', () => {
      const provider = new CloudProvider(validConfig);
      expect(() => provider.setAuthToken('')).toThrow(ProviderError);
    });

    it('throws ProviderError for whitespace-only token', () => {
      const provider = new CloudProvider(validConfig);
      expect(() => provider.setAuthToken('   ')).toThrow(ProviderError);
    });

    it('warns on unexpected token format', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const provider = new CloudProvider(validConfig);
      provider.setAuthToken('not_a_valid_format');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token format unexpected')
      );
    });
  });

  describe('getAuthToken', () => {
    it('returns current token', () => {
      const provider = new CloudProvider(validConfig);
      expect(provider.getAuthToken()).toBe('fk_live_abcdefghij');
    });
  });

  describe('getProjectId', () => {
    it('returns configured project ID', () => {
      const provider = new CloudProvider(validConfig);
      expect(provider.getProjectId()).toBe('proj_test_123');
    });
  });

  describe('default config values', () => {
    it('enables cache by default', async () => {
      const provider = new CloudProvider(validConfig);
      const stats = await provider.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('clears cache without error', async () => {
      const provider = new CloudProvider(validConfig);
      await expect(provider.clearCache()).resolves.toBeUndefined();
    });

    it('cache stats show zero after clear', async () => {
      const provider = new CloudProvider(validConfig);
      await provider.clearCache();
      const stats = await provider.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('destroy', () => {
    it('cleans up resources without error', async () => {
      const provider = new CloudProvider(validConfig);
      await expect(provider.destroy()).resolves.toBeUndefined();
    });
  });

  describe('getDatasetSyncStatus', () => {
    it('returns initial sync status', async () => {
      const provider = new CloudProvider(validConfig);
      const status = await provider.getDatasetSyncStatus();

      expect(status.lastSync).toBeNull();
      expect(status.version).toBeNull();
      expect(status.recordCount).toBe(0);
      expect(status.isStale).toBe(false);
    });
  });
});
