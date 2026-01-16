import { describe, it, expect } from 'vitest';
import { isLogLevel, getLogLevelPriority, LogLevel } from '../types';

describe('types.ts', () => {
  describe('isLogLevel', () => {
    it('should return true for valid log levels', () => {
      expect(isLogLevel('debug')).toBe(true);
      expect(isLogLevel('info')).toBe(true);
      expect(isLogLevel('warn')).toBe(true);
      expect(isLogLevel('error')).toBe(true);
      expect(isLogLevel('fatal')).toBe(true);
    });

    it('should return false for invalid log levels', () => {
      expect(isLogLevel('invalid')).toBe(false);
      expect(isLogLevel('trace')).toBe(false);
      expect(isLogLevel('')).toBe(false);
      expect(isLogLevel('DEBUG')).toBe(false);
    });
  });

  describe('getLogLevelPriority', () => {
    it('should return correct priority for each level', () => {
      expect(getLogLevelPriority('debug')).toBe(0);
      expect(getLogLevelPriority('info')).toBe(1);
      expect(getLogLevelPriority('warn')).toBe(2);
      expect(getLogLevelPriority('error')).toBe(3);
      expect(getLogLevelPriority('fatal')).toBe(4);
    });
  });

  describe('LogLevel type', () => {
    it('should accept valid log levels', () => {
      const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
      validLevels.forEach(level => {
        expect(isLogLevel(level)).toBe(true);
      });
    });
  });
});
