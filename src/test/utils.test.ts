/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { describe, it, expect } from 'vitest';
import {
  generateUUID,
  createTimestamp as formatTimestamp,
  debounce,
  throttle,
  deepMerge,
} from '../utils';

describe('utils.ts', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp as ISO string', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime();
      const formatted = formatTimestamp();
      expect(formatted).toContain('T');
      expect(formatted).toContain('Z');
    });
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      return new Promise(resolve => {
        setTimeout(() => {
          expect(callCount).toBe(1);
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe('throttle', () => {
    it('should limit function calls', () => {
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);

      return new Promise(resolve => {
        setTimeout(() => {
          expect(callCount).toBeGreaterThanOrEqual(1);
          resolve(undefined);
        }, 200);
      });
    });
  });

  describe('deepMerge', () => {
    it('should merge two objects deeply', () => {
      const obj1 = { a: 1, b: { c: 2, d: 3 } };
      const obj2 = { b: { c: 5, e: 6 }, f: 7 };
      const result = deepMerge(obj1, obj2);

      expect(result).toEqual({
        a: 1,
        b: { c: 5, d: 3, e: 6 },
        f: 7,
      });
    });

    it('should not mutate original objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      deepMerge(obj1, obj2);

      expect(obj1).toEqual({ a: 1 });
      expect(obj2).toEqual({ b: 2 });
    });
  });
});
