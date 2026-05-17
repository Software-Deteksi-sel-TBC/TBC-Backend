import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { assertSameInstitution } from '../../utils/access.utils.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';

const mockFindUnique = vi.mocked(prisma.user.findUnique);

describe('assertSameInstitution', () => {
  beforeEach(() => vi.clearAllMocks());

  test('tidak throw jika dua user ada di institusi yang sama', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: 'RS Harapan' } as any)
      .mockResolvedValueOnce({ institution: 'RS Harapan' } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).resolves.toBeUndefined();
  });

  test('throw 403 jika institusi berbeda', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: 'RS Harapan' } as any)
      .mockResolvedValueOnce({ institution: 'RS Sejahtera' } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).rejects.toThrow(AppError);
    await expect(
      assertSameInstitution('user-a', 'user-b').catch((e) => e.statusCode)
    ).resolves.toBe(403);
  });

  test('throw 403 jika userA institution null', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: null } as any)
      .mockResolvedValueOnce({ institution: 'RS Harapan' } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).rejects.toThrow(
      'Akses ditolak: institusi tidak terdaftar'
    );
  });

  test('throw 403 jika userB institution null', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: 'RS Harapan' } as any)
      .mockResolvedValueOnce({ institution: null } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).rejects.toThrow(
      'Akses ditolak: institusi tidak terdaftar'
    );
  });

  test('throw 403 jika kedua user tidak punya institusi', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: null } as any)
      .mockResolvedValueOnce({ institution: null } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).rejects.toThrow(AppError);
  });

  test('pesan error spesifik saat institusi berbeda', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ institution: 'RS A' } as any)
      .mockResolvedValueOnce({ institution: 'RS B' } as any);

    await expect(assertSameInstitution('user-a', 'user-b')).rejects.toThrow(
      'Akses ditolak: resource milik institusi lain'
    );
  });
});
