import { toggleArrayItem } from '../ramdaUtil';

/* eslint-env jest */
/* global describe, test, expect */

describe('ramdaUtil', () => {
  describe('toggleArrayItem', () => {
    test('adds item to array if not present', () => {
      const arr = [1, 2, 3];
      const result = toggleArrayItem(4, arr);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test('removes item from array if present', () => {
      const arr = [1, 2, 3, 4];
      const result = toggleArrayItem(3, arr);
      expect(result).toEqual([1, 2, 4]);
    });

    test('works with empty array', () => {
      const arr = [];
      const result = toggleArrayItem(1, arr);
      expect(result).toEqual([1]);
    });

    test('works with single item array', () => {
      const arr = [1];
      const result = toggleArrayItem(1, arr);
      expect(result).toEqual([]);
    });

    test('is curried', () => {
      const toggleFour = toggleArrayItem(4);
      const arr = [1, 2, 3];
      const result = toggleFour(arr);
      expect(result).toEqual([1, 2, 3, 4]);
    });
  });
});
