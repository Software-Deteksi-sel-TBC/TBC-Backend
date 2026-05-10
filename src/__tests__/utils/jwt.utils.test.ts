import { describe, test, expect } from 'vitest';
import { generateToken, verifyToken } from '../../utils/jwt.utils.js';
import { AppError } from '../../errors/app.error.js';

describe('JWT Utils', () => {
  const payload = { id: 'user-123', role: 'OPERATOR_LAB' };

  test('generateToken returns a string', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifyToken returns correct payload', () => {
    const token = generateToken(payload);
    const decoded = verifyToken<typeof payload>(token);
    expect(decoded.id).toBe('user-123');
    expect(decoded.role).toBe('OPERATOR_LAB');
  });

  test('verifyToken throws AppError on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(AppError);
    expect(() => verifyToken('invalid.token.here')).toThrow('Token tidak valid atau kedaluwarsa');
  });

  test('verifyToken throws AppError on expired token', async () => {
    const shortToken = generateToken(payload, '1ms');
    await new Promise(r => setTimeout(r, 10));
    expect(() => verifyToken(shortToken)).toThrow(AppError);
  });
});
