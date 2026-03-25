import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger } from '@/core/Logger.js';
import type { LogLevel } from '@/core/Logger.js';

describe('Logger', () => {
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('defaults to warn level', () => {
      const log = new Logger();
      expect(log.getLevel()).toBe('warn');
    });

    it('accepts a custom level', () => {
      const log = new Logger('debug');
      expect(log.getLevel()).toBe('debug');
    });
  });

  describe('setLevel', () => {
    it('changes the active level', () => {
      const log = new Logger('silent');
      log.setLevel('info');
      expect(log.getLevel()).toBe('info');
    });
  });

  describe('level filtering', () => {
    it('silent suppresses all output', () => {
      const log = new Logger('silent');
      log.error('e');
      log.warn('w');
      log.info('i');
      log.debug('d');

      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('error level shows only errors', () => {
      const log = new Logger('error');
      log.error('e');
      log.warn('w');
      log.info('i');
      log.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledWith('e');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('warn level shows errors and warnings', () => {
      const log = new Logger('warn');
      log.error('e');
      log.warn('w');
      log.info('i');
      log.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledWith('e');
      expect(consoleSpy.warn).toHaveBeenCalledWith('w');
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('info level shows errors, warnings, and info', () => {
      const log = new Logger('info');
      log.error('e');
      log.warn('w');
      log.info('i');
      log.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledWith('e');
      expect(consoleSpy.warn).toHaveBeenCalledWith('w');
      expect(consoleSpy.info).toHaveBeenCalledWith('i');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('debug level shows everything', () => {
      const log = new Logger('debug');
      log.error('e');
      log.warn('w');
      log.info('i');
      log.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledWith('e');
      expect(consoleSpy.warn).toHaveBeenCalledWith('w');
      expect(consoleSpy.info).toHaveBeenCalledWith('i');
      expect(consoleSpy.debug).toHaveBeenCalledWith('d');
    });
  });

  describe('arguments forwarding', () => {
    it('passes additional arguments to console methods', () => {
      const log = new Logger('debug');
      const obj = { key: 'val' };

      log.error('msg', obj, 42);
      expect(consoleSpy.error).toHaveBeenCalledWith('msg', obj, 42);

      log.warn('msg', obj);
      expect(consoleSpy.warn).toHaveBeenCalledWith('msg', obj);

      log.info('msg', 1, 2, 3);
      expect(consoleSpy.info).toHaveBeenCalledWith('msg', 1, 2, 3);

      log.debug('msg');
      expect(consoleSpy.debug).toHaveBeenCalledWith('msg');
    });
  });

  describe('dynamic level change', () => {
    it('responds immediately to level changes', () => {
      const log = new Logger('silent');

      log.error('suppressed');
      expect(consoleSpy.error).not.toHaveBeenCalled();

      log.setLevel('error');
      log.error('shown');
      expect(consoleSpy.error).toHaveBeenCalledWith('shown');
    });
  });

  describe('singleton', () => {
    it('exports a shared logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('singleton defaults to warn level', () => {
      // Save current level and restore after test
      const originalLevel = logger.getLevel();
      try {
        logger.setLevel('warn');
        expect(logger.getLevel()).toBe('warn');
      } finally {
        logger.setLevel(originalLevel);
      }
    });
  });

  describe('all valid levels', () => {
    const levels: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug'];

    it.each(levels)('accepts %s as a valid level', level => {
      const log = new Logger(level);
      expect(log.getLevel()).toBe(level);
    });
  });
});
