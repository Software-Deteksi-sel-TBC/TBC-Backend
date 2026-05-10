import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../errors/app.error.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../utils/hash.utils.js', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
}));

import { loginUser, updateCredential, forgotPassword } from '../../services/auth.service.js';
import { prisma } from '../../config/prisma.js';
import { comparePassword } from '../../utils/hash.utils.js';

const mockUser = {
  id: 'user-123',
  email: 'operator@rumahsakit.com',
  password_hash: 'hashed_password',
  role: 'OPERATOR_LAB',
  is_active: true,
  is_first_login: false,
  name: 'Operator',
};

describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 401 jika user tidak ditemukan', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(loginUser('notfound@example.com', 'pass')).rejects.toThrow(AppError);
  });

  test('throws 401 jika user tidak aktif', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, is_active: false } as any);
    await expect(loginUser(mockUser.email, 'pass')).rejects.toThrow(AppError);
  });

  test('throws 401 jika password salah', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(comparePassword).mockResolvedValue(false);
    await expect(loginUser(mockUser.email, 'wrongpass')).rejects.toThrow(AppError);
  });

  test('returns user dan token jika kredensial valid', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(comparePassword).mockResolvedValue(true);
    const result = await loginUser(mockUser.email, 'correctpass');
    expect(result.user).toEqual(mockUser);
    expect(typeof result.token).toBe('string');
  });
});

describe('updateCredential', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 401 jika user tidak ditemukan', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(updateCredential('x@x.com', 'old', 'New1234', 'New1234')).rejects.toThrow(AppError);
  });

  test('throws 400 jika is_first_login = false', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, is_first_login: false } as any);
    vi.mocked(comparePassword).mockResolvedValue(true);
    await expect(updateCredential(mockUser.email, 'old', 'New1234', 'New1234')).rejects.toThrow('tidak memerlukan update credential');
  });

  test('throws 401 jika password lama salah', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, is_first_login: true } as any);
    vi.mocked(comparePassword).mockResolvedValueOnce(false);
    await expect(updateCredential(mockUser.email, 'wrongold', 'New1234', 'New1234')).rejects.toThrow(AppError);
  });

  test('throws 400 jika newPassword dan confirmPassword tidak cocok', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, is_first_login: true } as any);
    vi.mocked(comparePassword).mockResolvedValueOnce(true);
    await expect(updateCredential(mockUser.email, 'old', 'New1234', 'Different1')).rejects.toThrow('tidak cocok');
  });

  test('throws 400 jika newPassword sama dengan password lama', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, is_first_login: true } as any);
    vi.mocked(comparePassword)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    await expect(updateCredential(mockUser.email, 'old', 'SamePass1', 'SamePass1')).rejects.toThrow('tidak boleh sama');
  });
});

describe('forgotPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns undefined jika user tidak ditemukan (tidak throw)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(forgotPassword('notfound@example.com')).resolves.toBeUndefined();
  });

  test('tidak throw jika user ditemukan', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    await expect(forgotPassword(mockUser.email)).resolves.toBeUndefined();
  });
});
