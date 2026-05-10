import { describe, test, expect } from 'vitest';
import { loginSchema, updateCredentialSchema, resetPasswordSchema } from '../../validations/auth.validation.js';

describe('loginSchema', () => {
  test('accepts valid email dan password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  test('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'bukan-email', password: 'pass123' });
    expect(result.success).toBe(false);
  });

  test('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  test('email di-lowercase', () => {
    const result = loginSchema.safeParse({ email: 'USER@EXAMPLE.COM', password: 'pass123' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('user@example.com');
  });

  test('email dengan spasi ditolak oleh validator', () => {
    const result = loginSchema.safeParse({ email: '  USER@EXAMPLE.COM  ', password: 'pass123' });
    expect(result.success).toBe(false);
  });
});

describe('updateCredentialSchema', () => {
  const validData = {
    email: 'user@example.com',
    currentPassword: 'oldpass',
    newPassword: 'NewPass123',
    confirmPassword: 'NewPass123',
  };

  test('accepts valid input', () => {
    expect(updateCredentialSchema.safeParse(validData).success).toBe(true);
  });

  test('rejects newPassword kurang dari 8 karakter', () => {
    const result = updateCredentialSchema.safeParse({ ...validData, newPassword: 'Ab1', confirmPassword: 'Ab1' });
    expect(result.success).toBe(false);
  });

  test('rejects newPassword tanpa angka', () => {
    const result = updateCredentialSchema.safeParse({ ...validData, newPassword: 'Password', confirmPassword: 'Password' });
    expect(result.success).toBe(false);
  });

  test('rejects newPassword tanpa huruf', () => {
    const result = updateCredentialSchema.safeParse({ ...validData, newPassword: '12345678', confirmPassword: '12345678' });
    expect(result.success).toBe(false);
  });

  test('rejects saat newPassword !== confirmPassword', () => {
    const result = updateCredentialSchema.safeParse({ ...validData, confirmPassword: 'DifferentPass1' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  test('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({ token: '', newPassword: 'NewPass123' });
    expect(result.success).toBe(false);
  });

  test('accepts valid token dan password', () => {
    const result = resetPasswordSchema.safeParse({ token: 'valid-token', newPassword: 'NewPass123' });
    expect(result.success).toBe(true);
  });
});
