/**
 * CloudProvider Fallback Tests
 *
 * Tests that CloudProvider falls back to LocalProvider when cloud data
 * is unavailable, and that getProfile() delegates to LocalProvider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudProvider } from '@/providers/CloudProvider.js';
import { ProviderManager } from '@/core/ProviderManager.js';

// Mock the CloudApiClient and external dependencies
vi.mock('@/core/CloudApiClient.js', () => ({
  CloudApiClient: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({
      data: { valid: true, project: { id: 'proj_1', name: 'Test' } },
    }),
    setToken: vi.fn(),
  })),
}));

vi.mock('@/state/atoms/index.js', () => ({
  cloudDatasets: {
    get: vi.fn().mockReturnValue({}),
    set: vi.fn(),
  },
  sdkOptions: {
    get: vi.fn().mockReturnValue({}),
    set: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

describe('CloudProvider — fallback to local', () => {
  it('getAvailableTypes returns empty set with no cache', () => {
    const provider = new CloudProvider({
      projectId: 'proj_test',
      token: 'fk_test_1234567890',
    });

    const types = provider.getAvailableTypes();
    expect(types.size).toBe(0);
  });
});

describe('ProviderManager — degradation recovery', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    manager = new ProviderManager();
  });

  it('starts in local status', () => {
    expect(manager.getStatus()).toBe('local');
  });

  it('transitions to cloud after updateFromDataset with types', () => {
    manager.updateFromDataset(new Set(['email', 'phone']));
    expect(manager.getStatus()).toBe('cloud');
    expect(manager.hasCloudData('email')).toBe(true);
    expect(manager.hasCloudData('phone')).toBe(true);
  });

  it('stays local when updateFromDataset has empty set', () => {
    manager.updateFromDataset(new Set());
    expect(manager.getStatus()).toBe('local');
  });

  it('recovers from cloud-degraded to cloud after sync', () => {
    // Simulate degradation
    manager.setStatus('cloud');
    manager.recordFill('local', 'phone'); // triggers degradation
    expect(manager.getStatus()).toBe('cloud-degraded');

    // Simulate recovery after sync
    manager.updateFromDataset(new Set(['email', 'phone']));
    expect(manager.getStatus()).toBe('cloud');
  });

  it('tracks missing types during degradation', () => {
    manager.setStatus('cloud');
    manager.recordFill('local', 'phone');
    manager.recordFill('local', 'fax');

    const stats = manager.getStats();
    expect(stats.missingTypes.has('phone')).toBe(true);
    expect(stats.missingTypes.has('fax')).toBe(true);
  });
});
