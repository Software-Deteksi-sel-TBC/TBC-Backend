import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    case: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    image: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../services/storage/index.js', () => ({
  storage: {
    createPresignedUploadUrl: vi.fn(),
    createSignedViewUrl: vi.fn(),
    deleteFile: vi.fn(),
    buildFilePath: vi.fn((caseId: string, imageId: string, filename: string) =>
      `cases/${caseId}/${imageId}/${filename}`
    ),
  }
}));

import {
  requestPresignedUrls,
  confirmUpload,
  listImagesForCase,
  deleteImage,
  submitCase,
} from '../../services/image.service.js';
import { prisma } from '../../config/prisma.js';
import { storage } from '../../services/storage/index.js';

const OPERATOR_ID = 'operator-1';
const CREATOR_ID = 'creator-1';
const CASE_ID = 'case-1';

const mockCase = {
  id: CASE_ID,
  patient_id: 'patient-1',
  created_by: CREATOR_ID,
  status: 'PENDING_UPLOAD',
  notes: null,
  created_at: new Date(),
  completed_at: null,
};

const mockImageInput = {
  original_filename: 'sample.jpg',
  mime_type: 'image/jpeg',
  magnification: 'X40' as const,
  staining: 'HE' as const,
};

const mockSameInstitution = () => {
  vi.mocked(prisma.user.findUnique)
    .mockResolvedValueOnce({ institution: 'RS A' } as any)
    .mockResolvedValueOnce({ institution: 'RS A' } as any);
};

const mockDifferentInstitution = () => {
  vi.mocked(prisma.user.findUnique)
    .mockResolvedValueOnce({ institution: 'RS A' } as any)
    .mockResolvedValueOnce({ institution: 'RS B' } as any);
};

const mockNullInstitution = () => {
  vi.mocked(prisma.user.findUnique)
    .mockResolvedValueOnce({ institution: null } as any)
    .mockResolvedValueOnce({ institution: 'RS A' } as any);
};

describe('requestPresignedUrls', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika case tidak ditemukan', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    await expect(
      requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput])
    ).rejects.toThrow('Kasus tidak ditemukan');
  });

  test('throws 403 jika institusi tidak match', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockDifferentInstitution();
    await expect(
      requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput])
    ).rejects.toThrow('institusi lain');
  });

  test('throws 403 jika institution null', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockNullInstitution();
    await expect(
      requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput])
    ).rejects.toThrow('institusi tidak terdaftar');
  });

  test('throws 400 jika case status bukan PENDING_UPLOAD', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      status: 'PENDING_VALIDATION',
    } as any);
    mockSameInstitution();
    await expect(
      requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput])
    ).rejects.toThrow('tidak dalam status upload');
  });

  test('returns array image_id, presigned_url, file_path saat sukses', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([]);
    vi.mocked(prisma.image.create).mockImplementation(
      ({ data }: any) => Promise.resolve({ id: data.id, file_path: data.file_path }) as any
    );
    vi.mocked(storage.createPresignedUploadUrl).mockResolvedValue('https://presigned.example.com/upload');

    const result = await requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput]);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('image_id');
    expect(result[0]).toHaveProperty('presigned_url', 'https://presigned.example.com/upload');
    expect(result[0]).toHaveProperty('file_path');
    expect(result[0]!.file_path).toContain('cases/');
  });

  test('memanggil cleanup untuk stale pending images', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      { id: 'stale-1', file_path: 'cases/case-1/stale-1/old.jpg' },
    ] as any);
    vi.mocked(prisma.image.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.image.create).mockImplementation(
      ({ data }: any) => Promise.resolve({ id: data.id, file_path: data.file_path }) as any
    );
    vi.mocked(storage.createPresignedUploadUrl).mockResolvedValue('https://presigned.example.com/upload');

    await requestPresignedUrls(CASE_ID, OPERATOR_ID, [mockImageInput]);

    expect(storage.deleteFile).toHaveBeenCalledWith('cases/case-1/stale-1/old.jpg');
    expect(prisma.image.deleteMany).toHaveBeenCalled();
  });
});

describe('confirmUpload', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika case tidak ditemukan', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    await expect(
      confirmUpload(CASE_ID, OPERATOR_ID, { image_ids: ['img-1'] })
    ).rejects.toThrow('Kasus tidak ditemukan');
  });

  test('throws 403 jika institusi tidak match', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockDifferentInstitution();
    await expect(
      confirmUpload(CASE_ID, OPERATOR_ID, { image_ids: ['img-1'] })
    ).rejects.toThrow('institusi lain');
  });

  test('throws 400 jika ada image_id tidak terkait case ini', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      { id: 'img-1', qc_status: 'PENDING' },
    ] as any);
    await expect(
      confirmUpload(CASE_ID, OPERATOR_ID, { image_ids: ['img-1', 'img-2'] })
    ).rejects.toThrow('tidak ditemukan untuk kasus ini');
  });

  test('throws 400 jika tidak ada image PENDING', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      { id: 'img-1', qc_status: 'PASSED' },
    ] as any);
    await expect(
      confirmUpload(CASE_ID, OPERATOR_ID, { image_ids: ['img-1'] })
    ).rejects.toThrow('berstatus PENDING');
  });

  test('updates qc_status ke PASSED dan returns images saat sukses', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany)
      .mockResolvedValueOnce([{ id: 'img-1', qc_status: 'PENDING' }] as any)
      .mockResolvedValueOnce([{ id: 'img-1', qc_status: 'PASSED' }] as any);
    vi.mocked(prisma.image.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await confirmUpload(CASE_ID, OPERATOR_ID, { image_ids: ['img-1'] });

    expect(prisma.image.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qc_status: 'PASSED' }),
      })
    );
    expect(result).toEqual([{ id: 'img-1', qc_status: 'PASSED' }]);
  });
});

describe('listImagesForCase', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika case tidak ditemukan', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    await expect(
      listImagesForCase(CASE_ID, OPERATOR_ID, Role.OPERATOR_LAB)
    ).rejects.toThrow('Kasus tidak ditemukan');
  });

  test('OPERATOR_LAB throws 403 jika institusi tidak match', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockDifferentInstitution();
    await expect(
      listImagesForCase(CASE_ID, OPERATOR_ID, Role.OPERATOR_LAB)
    ).rejects.toThrow('institusi lain');
  });

  test('DOKTER_PATOLOGI throws 403 jika case status PENDING_UPLOAD', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    await expect(
      listImagesForCase(CASE_ID, OPERATOR_ID, Role.DOKTER_PATOLOGI)
    ).rejects.toThrow('belum siap untuk direview');
  });

  test('DOKTER_PATOLOGI sukses jika case status bukan PENDING_UPLOAD', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      status: 'PENDING_VALIDATION',
    } as any);
    vi.mocked(prisma.image.findMany).mockResolvedValue([]);

    const result = await listImagesForCase(CASE_ID, OPERATOR_ID, Role.DOKTER_PATOLOGI);
    expect(result).toEqual([]);
  });

  test('returns image dengan view_url dari createSignedViewUrl', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      {
        id: 'img-1',
        original_filename: 'sample.jpg',
        magnification: 'X40',
        qc_status: 'PASSED',
        qc_failure_reason: null,
        file_path: 'cases/case-1/img-1/sample.jpg',
      },
    ] as any);
    vi.mocked(storage.createSignedViewUrl).mockResolvedValue('https://signed.example.com/view');

    const result = await listImagesForCase(CASE_ID, OPERATOR_ID, Role.OPERATOR_LAB);

    expect(result[0]!.view_url).toBe('https://signed.example.com/view');
    expect(storage.createSignedViewUrl).toHaveBeenCalledWith('cases/case-1/img-1/sample.jpg');
  });

  test('returns view_url null jika file_path kosong', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase as any);
    mockSameInstitution();
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      {
        id: 'img-1',
        original_filename: 'sample.jpg',
        magnification: 'X40',
        qc_status: 'PENDING',
        qc_failure_reason: null,
        file_path: '',
      },
    ] as any);

    const result = await listImagesForCase(CASE_ID, OPERATOR_ID, Role.OPERATOR_LAB);
    expect(result[0]!.view_url).toBeNull();
    expect(storage.createSignedViewUrl).not.toHaveBeenCalled();
  });
});

describe('deleteImage', () => {
  beforeEach(() => vi.clearAllMocks());

  const mockImageWithCase = {
    id: 'img-1',
    file_path: 'cases/case-1/img-1/sample.jpg',
    case: { ...mockCase },
  };

  test('throws 404 jika image tidak ditemukan', async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(null);
    await expect(deleteImage('img-1', OPERATOR_ID)).rejects.toThrow('Gambar tidak ditemukan');
  });

  test('throws 403 jika institusi tidak match', async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(mockImageWithCase as any);
    mockDifferentInstitution();
    await expect(deleteImage('img-1', OPERATOR_ID)).rejects.toThrow('institusi lain');
  });

  test('memanggil deleteFile dan prisma.image.delete saat sukses', async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(mockImageWithCase as any);
    mockSameInstitution();
    vi.mocked(storage.deleteFile).mockResolvedValue(undefined);
    vi.mocked(prisma.image.delete).mockResolvedValue({} as any);

    await deleteImage('img-1', OPERATOR_ID);

    expect(storage.deleteFile).toHaveBeenCalledWith('cases/case-1/img-1/sample.jpg');
    expect(prisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
  });
});

describe('submitCase', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika case tidak ditemukan', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    await expect(submitCase(CASE_ID, OPERATOR_ID)).rejects.toThrow('Kasus tidak ditemukan');
  });

  test('throws 403 jika institusi tidak match', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      images: [],
    } as any);
    mockDifferentInstitution();
    await expect(submitCase(CASE_ID, OPERATOR_ID)).rejects.toThrow('institusi lain');
  });

  test('throws 409 jika status bukan PENDING_UPLOAD', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      status: 'PENDING_VALIDATION',
      images: [],
    } as any);
    mockSameInstitution();
    await expect(submitCase(CASE_ID, OPERATOR_ID)).rejects.toThrow('sudah diproses sebelumnya');
  });

  test('throws 400 jika belum ada image', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      images: [],
    } as any);
    mockSameInstitution();
    await expect(submitCase(CASE_ID, OPERATOR_ID)).rejects.toThrow('belum memiliki gambar');
  });

  test('throws 400 jika ada image bukan PASSED', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      images: [
        { id: 'img-1', qc_status: 'PASSED' },
        { id: 'img-2', qc_status: 'PENDING' },
      ],
    } as any);
    mockSameInstitution();
    await expect(submitCase(CASE_ID, OPERATOR_ID)).rejects.toThrow('harus lulus QC');
  });

  test('updates case status ke PENDING_VALIDATION saat sukses', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...mockCase,
      images: [{ id: 'img-1', qc_status: 'PASSED' }],
    } as any);
    mockSameInstitution();
    vi.mocked(prisma.case.update).mockResolvedValue({
      ...mockCase,
      status: 'PENDING_VALIDATION',
    } as any);

    const result = await submitCase(CASE_ID, OPERATOR_ID);

    expect(prisma.case.update).toHaveBeenCalledWith({
      where: { id: CASE_ID },
      data: { status: 'PENDING_VALIDATION' },
    });
    expect(result.status).toBe('PENDING_VALIDATION');
  });
});
