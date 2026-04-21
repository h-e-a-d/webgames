import { describe, it, expect, beforeEach } from 'vitest';
import { readList, writeList, addToList, removeFromList, isInList } from '../../src/lib/storage';

const KEY = 'kloopik.test.list';

describe('storage list helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('readList', () => {
    it('returns [] when nothing stored', () => {
      expect(readList(KEY)).toEqual([]);
    });

    it('returns [] when stored value is not an array', () => {
      localStorage.setItem(KEY, JSON.stringify({ not: 'array' }));
      expect(readList(KEY)).toEqual([]);
    });

    it('returns [] when stored value is malformed JSON', () => {
      localStorage.setItem(KEY, 'not-json');
      expect(readList(KEY)).toEqual([]);
    });

    it('filters to strings only', () => {
      localStorage.setItem(KEY, JSON.stringify(['a', 1, 'b', null, 'c']));
      expect(readList(KEY)).toEqual(['a', 'b', 'c']);
    });

    it('returns the stored array when valid', () => {
      localStorage.setItem(KEY, JSON.stringify(['x', 'y']));
      expect(readList(KEY)).toEqual(['x', 'y']);
    });
  });

  describe('writeList / addToList / removeFromList / isInList', () => {
    it('writeList persists', () => {
      writeList(KEY, ['a', 'b']);
      expect(readList(KEY)).toEqual(['a', 'b']);
    });

    it('addToList appends uniquely, preserving order', () => {
      addToList(KEY, 'a');
      addToList(KEY, 'b');
      addToList(KEY, 'a');
      expect(readList(KEY)).toEqual(['a', 'b']);
    });

    it('removeFromList removes by value', () => {
      writeList(KEY, ['a', 'b', 'c']);
      removeFromList(KEY, 'b');
      expect(readList(KEY)).toEqual(['a', 'c']);
    });

    it('removeFromList is a no-op when value is absent', () => {
      writeList(KEY, ['a']);
      removeFromList(KEY, 'x');
      expect(readList(KEY)).toEqual(['a']);
    });

    it('isInList reports membership', () => {
      writeList(KEY, ['a', 'b']);
      expect(isInList(KEY, 'a')).toBe(true);
      expect(isInList(KEY, 'z')).toBe(false);
    });
  });
});
