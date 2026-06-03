import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    case: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    image: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../utils/access.utils.js', () => ({
  assertSameInstitution: vi.fn(),
}));

vi.mock('../../services/storage/index.js', () => ({
  storage: {
    createSignedViewUrl: vi.fn(),
  }
}));

vi.mock('../../utils/pagination.utils.js', () => ({
  getPaginationParams: vi.fn(() => ({ skip: 0, take: 10, page: 1, limit: 10 })),
}));

import { getReviewQueue, getResolvedQueue, getCaseImages, getImageDetailForReview } from '../../services/review.service.js';
import { prisma } from '../../config/prisma.js';
import { assertSameInstitution } from '../../utils/access.utils.js';
import { storage } from '../../services/storage/index.js';
import { AppError } from '../../errors/app.error.js';

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockCaseFindUnique = vi.mocked(prisma.case.findUnique);
const mockImageFindUnique = vi.mocked(prisma.image.findUnique);
const mockImageFindMany = vi.mocked(prisma.image.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockAssertSameInstitution = vi.mocked(assertSameInstitution);
const mockCreateSignedViewUrl = vi.mocked(storage.createSignedViewUrl);

const mockCase = {
  id: 'case-1',
  status: 'PENDING_VALIDATION',
  created_by: 'op-1',
  created_at: new Date(),
  patient: { id: 'patient-1', name: 'Ahmad', no_induk: '3201010000' },
  images: [
    { id: 'img-1', original_filename: 'slide1.tiff', magnification: 'X40', validation: null },
    { id: 'img-2', original_filename: 'slide2.tiff', magnification: 'X10', validation: { id: 'val-2' } },
  ],
};

const mockImage = {
  id: 'img-1',
  case_id: 'case-1',
  file_path: 'cases/case-1/img-1/slide1.tiff',
  case: { id: 'case-1', status: 'PENDING_VALIDATION', created_by: 'op-1' },
  ai_result: { id: 'air-1', findings: [] },
  validation: null,
  comments: [],
};

describe('getReviewQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
    mockCreateSignedViewUrl.mockResolvedValue('https://signed.url/file.tiff');
  });

  test('throws 403 jika patolog tidak punya institusi', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: null } as any);

    await expect(getReviewQueue('patolog-1')).rejects.toThrow(
      'Akses ditolak: institusi tidak terdaftar'
    );
    await expect(
      getReviewQueue('patolog-1').catch((e) => e.statusCode)
    ).resolves.toBe(403);
  });

  test('throws 403 jika user tidak ditemukan (institution undefined)', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(getReviewQueue('patolog-1')).rejects.toThrow(AppError);
  });

  test('mengembalikan data dan meta pagination', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [mockCase]] as any);

    const result = await getReviewQueue('patolog-1');

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  test('menambahkan images_total dan images_validated per kasus', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [mockCase]] as any);

    const result = await getReviewQueue('patolog-1');
    const kasus = result.data[0]!;

    expect(kasus.images_total).toBe(2);
    expect(kasus.images_validated).toBe(1);
  });

  test('menggunakan filter PENDING_VALIDATION dan institusi patolog', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([0, []] as any);

    await getReviewQueue('patolog-1');

    const txArgs = (mockTransaction.mock.calls[0] as unknown as [any[]])[0];
    expect(txArgs).toHaveLength(2);
  });
});

const mockResolvedCase = {
  id: 'case-2',
  status: 'RESOLVED',
  created_by: 'op-1',
  created_at: new Date(),
  completed_at: new Date(),
  patient: { name: 'Siti Rahayu' },
  consensus: {
    severity: 'SEDANG',
    user: { name: 'dr. Rina' },
  },
  images: [{ id: 'img-3' }, { id: 'img-4' }],
};

describe('getResolvedQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('throws 403 jika patolog tidak punya institusi', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: null } as any);

    await expect(getResolvedQueue('patolog-1')).rejects.toThrow(
      'Akses ditolak: institusi tidak terdaftar'
    );
    await expect(
      getResolvedQueue('patolog-1').catch((e) => e.statusCode)
    ).resolves.toBe(403);
  });

  test('throws 403 jika user tidak ditemukan', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(getResolvedQueue('patolog-1')).rejects.toThrow(AppError);
  });

  test('mengembalikan data dan meta pagination', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [mockResolvedCase]] as any);

    const result = await getResolvedQueue('patolog-1');

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  test('mengembalikan nama pasien, severity consensus, dan nama patolog validator', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [mockResolvedCase]] as any);

    const result = await getResolvedQueue('patolog-1');
    const kasus = result.data[0]!;

    expect(kasus.patient.name).toBe('Siti Rahayu');
    expect(kasus.consensus!.severity).toBe('SEDANG');
    expect(kasus.consensus!.user.name).toBe('dr. Rina');
  });

  test('mengembalikan image IDs untuk tombol view', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [mockResolvedCase]] as any);

    const result = await getResolvedQueue('patolog-1');
    const kasus = result.data[0]!;

    expect(kasus.images).toHaveLength(2);
    expect(kasus.images[0]).toEqual({ id: 'img-3' });
  });

  test('mengembalikan list kosong jika tidak ada kasus resolved', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([0, []] as any);

    const result = await getResolvedQueue('patolog-1');

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  test('menggunakan filter RESOLVED dan institusi patolog', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([0, []] as any);

    await getResolvedQueue('patolog-1');

    const txArgs = (mockTransaction.mock.calls[0] as unknown as [any[]])[0];
    expect(txArgs).toHaveLength(2);
  });

  test('kasus tanpa consensus dikembalikan dengan consensus null', async () => {
    mockUserFindUnique.mockResolvedValue({ institution: 'RS Harapan' } as any);
    mockTransaction.mockResolvedValue([1, [{ ...mockResolvedCase, consensus: null }]] as any);

    const result = await getResolvedQueue('patolog-1');
    const kasus = result.data[0]!;

    expect(kasus.consensus).toBeNull();
  });
});

const mockImageUnvalidated = {
  id: 'img-1',
  original_filename: 'slide1.svs',
  magnification: 'X40',
  ai_result: { global_severity: 'SEDANG', is_uncertain: true },
  validation: null,
};

const mockImageValidated = {
  id: 'img-2',
  original_filename: 'slide2.svs',
  magnification: 'X10',
  ai_result: { global_severity: 'RENDAH', is_uncertain: false },
  validation: {
    global_severity: 'TINGGI',
    validator: { name: 'dr. Rina' },
  },
};

describe('getCaseImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
  });

  test('throws 404 jika kasus tidak ditemukan', async () => {
    mockCaseFindUnique.mockResolvedValue(null);

    await expect(getCaseImages('nonexistent', 'patolog-1')).rejects.toThrow('Kasus tidak ditemukan');
    await expect(getCaseImages('nonexistent', 'patolog-1').catch((e) => e.statusCode)).resolves.toBe(404);
  });

  test('throws 403 jika kasus masih PENDING_UPLOAD', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_UPLOAD', created_by: 'op-1' } as any);

    await expect(getCaseImages('case-1', 'patolog-1')).rejects.toThrow('Kasus belum siap untuk direview');
    await expect(getCaseImages('case-1', 'patolog-1').catch((e) => e.statusCode)).resolves.toBe(403);
  });

  test('memanggil assertSameInstitution dengan patologId dan created_by', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([]);

    await getCaseImages('case-1', 'patolog-1');

    expect(mockAssertSameInstitution).toHaveBeenCalledWith('patolog-1', 'op-1');
  });

  test('gambar belum divalidasi: global_severity dari ai_result, is_ai_uncertain true, validated_by null', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([mockImageUnvalidated] as any);

    const result = await getCaseImages('case-1', 'patolog-1');
    const img = result[0]!;

    expect(img.is_validated).toBe(false);
    expect(img.global_severity).toBe('SEDANG');
    expect(img.is_ai_uncertain).toBe(true);
    expect(img.validated_by).toBeNull();
  });

  test('gambar sudah divalidasi: global_severity dari validation, is_ai_uncertain null, validated_by terisi', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([mockImageValidated] as any);

    const result = await getCaseImages('case-1', 'patolog-1');
    const img = result[0]!;

    expect(img.is_validated).toBe(true);
    expect(img.global_severity).toBe('TINGGI');
    expect(img.is_ai_uncertain).toBeNull();
    expect(img.validated_by).toBe('dr. Rina');
  });

  test('mengembalikan campuran validated dan unvalidated dengan benar', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([mockImageUnvalidated, mockImageValidated] as any);

    const result = await getCaseImages('case-1', 'patolog-1');

    expect(result).toHaveLength(2);
    expect(result[0]!.is_validated).toBe(false);
    expect(result[1]!.is_validated).toBe(true);
  });

  test('gambar tanpa ai_result: global_severity null', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([{ ...mockImageUnvalidated, ai_result: null }] as any);

    const result = await getCaseImages('case-1', 'patolog-1');

    expect(result[0]!.global_severity).toBeNull();
    expect(result[0]!.is_ai_uncertain).toBeNull();
  });

  test('mengembalikan list kosong jika tidak ada gambar QC passed', async () => {
    mockCaseFindUnique.mockResolvedValue({ status: 'PENDING_VALIDATION', created_by: 'op-1' } as any);
    mockImageFindMany.mockResolvedValue([]);

    const result = await getCaseImages('case-1', 'patolog-1');

    expect(result).toHaveLength(0);
  });
});

describe('getImageDetailForReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
    mockCreateSignedViewUrl.mockResolvedValue('https://signed.url/file.tiff');
  });

  test('throws 404 jika image tidak ditemukan', async () => {
    mockImageFindUnique.mockResolvedValue(null);

    await expect(
      getImageDetailForReview('case-1', 'nonexistent', 'patolog-1', 'DOKTER_PATOLOGI')
    ).rejects.toThrow('Gambar tidak ditemukan');
  });

  test('throws 400 jika image.case_id tidak cocok dengan caseId', async () => {
    mockImageFindUnique.mockResolvedValue({
      ...mockImage,
      case_id: 'case-lain',
    } as any);

    await expect(
      getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI')
    ).rejects.toThrow('Gambar tidak terkait dengan kasus ini');
  });

  test('throws 403 jika DOKTER_PATOLOGI akses case PENDING_UPLOAD', async () => {
    mockImageFindUnique.mockResolvedValue({
      ...mockImage,
      case: { ...mockImage.case, status: 'PENDING_UPLOAD' },
    } as any);

    await expect(
      getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI')
    ).rejects.toThrow('Kasus belum siap untuk direview');
    await expect(
      getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI').catch(
        (e) => e.statusCode
      )
    ).resolves.toBe(403);
  });

  test('memanggil assertSameInstitution untuk DOKTER_PATOLOGI', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);

    await getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI');

    expect(mockAssertSameInstitution).toHaveBeenCalledWith('patolog-1', 'op-1');
  });

  test('memanggil assertSameInstitution untuk OPERATOR_LAB', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);

    await getImageDetailForReview('case-1', 'img-1', 'op-2', 'OPERATOR_LAB');

    expect(mockAssertSameInstitution).toHaveBeenCalledWith('op-2', 'op-1');
  });

  test('mengembalikan image dengan view_url dari signed URL', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockCreateSignedViewUrl.mockResolvedValue('https://signed.url/file.tiff');

    const result = await getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI');

    expect(result.view_url).toBe('https://signed.url/file.tiff');
    expect(result.id).toBe('img-1');
  });

  test('view_url null jika file_path tidak ada', async () => {
    mockImageFindUnique.mockResolvedValue({ ...mockImage, file_path: null } as any);

    const result = await getImageDetailForReview('case-1', 'img-1', 'patolog-1', 'DOKTER_PATOLOGI');

    expect(result.view_url).toBeNull();
    expect(mockCreateSignedViewUrl).not.toHaveBeenCalled();
  });

  test('tidak throw jika assertSameInstitution dilewati untuk role lain (ADMIN_AI)', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);

    await expect(
      getImageDetailForReview('case-1', 'img-1', 'admin-1', 'ADMIN_AI')
    ).resolves.toBeDefined();

    expect(mockAssertSameInstitution).not.toHaveBeenCalled();
  });
});
