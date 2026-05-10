import { describe, test, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../utils/hash.utils.js';

describe('Hash Utils', () => {
  test('hashPassword returns different string dari input', async () => {
    const hash = await hashPassword('password123');
    expect(hash).not.toBe('password123');
    expect(typeof hash).toBe('string');
  });

  test('comparePassword returns true untuk password yang benar', async () => {
    const hash = await hashPassword('password123');
    const result = await comparePassword('password123', hash);
    expect(result).toBe(true);
  });

  test('comparePassword returns false untuk password salah', async () => {
    const hash = await hashPassword('password123');
    const result = await comparePassword('wrongpassword', hash);
    expect(result).toBe(false);
  });

  test('dua hash dari password sama tidak identik (salt berbeda)', async () => {
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password123');
    expect(hash1).not.toBe(hash2);
  });
});
