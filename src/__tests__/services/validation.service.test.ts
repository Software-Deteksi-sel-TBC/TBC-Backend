import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    image: { findUnique: vi.fn() },
    validation: { upsert: vi.fn() },
  },
}));

vi.mock('../../utils/access.utils.js', () => ({
  assertSameInstitution: vi.fn(),
}));

import { submitValidation } from '../../services/validation.service.js';
import { prisma } from '../../config/prisma.js';
import { assertSameInstitution } from '../../utils/access.utils.js';
import { AppError } from '../../errors/app.error.js';

const mockImageFindUnique = vi.mocked(prisma.image.findUnique);
const mockValidationUpsert = vi.mocked(prisma.validation.upsert);
const mockAssertSameInstitution = vi.mocked(assertSameInstitution);

const validInput = {
  global_severity: 'SEDANG' as const,
  necrosis_severity: 'RENDAH' as const,
  granuloma_severity: 'TINGGI' as const,
  datia_count_level: 'JARANG' as const,
  epithelioid_count_level: 'CUKUP_BANYAK' as const,
};

const mockImage = {
  id: 'image-1',
  case_id: 'case-1',
  case: {
    id: 'case-1',
    status: 'PENDING_VALIDATION',
    created_by: 'op-1',
  },
};

const mockValidation = {
  id: 'validation-1',
  image_id: 'image-1',
  validator_id: 'patolog-1',
  ...validInput,
  validation_comment: null,
  submitted_at: new Date(),
};

describe('submitValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
  });

  test('throws 404 jika image tidak ditemukan', async () => {
    mockImageFindUnique.mockResolvedValue(null);

    await expect(submitValidation('nonexistent', 'patolog-1', validInput)).rejects.toThrow(
      'Gambar tidak ditemukan'
    );
    await expect(
      submitValidation('nonexistent', 'patolog-1', validInput).catch((e) => e.statusCode)
    ).resolves.toBe(404);
  });

  test('bisa submit validation meskipun case sudah RESOLVED', async () => {
    mockImageFindUnique.mockResolvedValue({
      ...mockImage,
      case: { ...mockImage.case, status: 'RESOLVED' },
    } as any);
    mockValidationUpsert.mockResolvedValue(mockValidation as any);

    await expect(submitValidation('image-1', 'patolog-1', validInput)).resolves.toBeDefined();
  });

  test('throws jika assertSameInstitution gagal', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockAssertSameInstitution.mockRejectedValue(
      new AppError('Akses ditolak: resource milik institusi lain', 403)
    );

    await expect(submitValidation('image-1', 'patolog-lain', validInput)).rejects.toThrow(
      'Akses ditolak: resource milik institusi lain'
    );
  });

  test('memanggil assertSameInstitution dengan validatorId dan case.created_by', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockValidationUpsert.mockResolvedValue(mockValidation as any);

    await submitValidation('image-1', 'patolog-1', validInput);

    expect(mockAssertSameInstitution).toHaveBeenCalledWith('patolog-1', 'op-1');
  });

  test('menggunakan upsert untuk mendukung re-submit', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockValidationUpsert.mockResolvedValue(mockValidation as any);

    await submitValidation('image-1', 'patolog-1', validInput);

    expect(mockValidationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { image_id: 'image-1' },
        create: expect.objectContaining({ image_id: 'image-1', validator_id: 'patolog-1' }),
        update: expect.objectContaining({ validator_id: 'patolog-1' }),
      })
    );
  });

  test('mengembalikan data validation setelah upsert', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockValidationUpsert.mockResolvedValue(mockValidation as any);

    const result = await submitValidation('image-1', 'patolog-1', validInput);

    expect(result.global_severity).toBe('SEDANG');
    expect(result.validator_id).toBe('patolog-1');
  });

  test('meneruskan validation_comment opsional ke upsert', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    const withComment = { ...mockValidation, validation_comment: 'AI overestimated.' };
    mockValidationUpsert.mockResolvedValue(withComment as any);

    const inputWithComment = { ...validInput, validation_comment: 'AI overestimated.' };
    const result = await submitValidation('image-1', 'patolog-1', inputWithComment);

    expect(result.validation_comment).toBe('AI overestimated.');
  });
});
