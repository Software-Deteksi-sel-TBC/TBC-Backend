import { describe, test, expect } from 'vitest';
import { getPaginationParams } from '../../utils/pagination.utils.js';

describe('getPaginationParams', () => {
  test('returns defaults when no args', () => {
    const result = getPaginationParams();
    expect(result).toEqual({ skip: 0, take: 10, page: 1, limit: 10 });
  });

  test('calculates skip correctly for page 2', () => {
    const result = getPaginationParams('2', '10');
    expect(result).toEqual({ skip: 10, take: 10, page: 2, limit: 10 });
  });

  test('caps limit at 100', () => {
    const result = getPaginationParams('1', '999');
    expect(result.limit).toBe(100);
    expect(result.take).toBe(100);
  });

  test('minimum page is 1 for negative input', () => {
    const result = getPaginationParams('-5', '10');
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  test('limit 0 dianggap tidak valid, fallback ke default 10', () => {
    const result = getPaginationParams('1', '0');
    expect(result.limit).toBe(10);
  });

  test('invalid string defaults to page 1 limit 10', () => {
    const result = getPaginationParams('abc', 'xyz');
    expect(result).toEqual({ skip: 0, take: 10, page: 1, limit: 10 });
  });
});
