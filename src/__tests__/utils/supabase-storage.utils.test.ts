import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../errors/app.error.js';

const mockCreateSignedUploadUrl = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../config/supabase.js', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl: mockCreateSignedUploadUrl,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      })),
    },
  },
  BUCKET: 'histopatologi',
}));

import {
  buildFilePath,
  createPresignedUploadUrl,
  createSignedViewUrl,
  deleteFile,
} from '../../utils/supabase-storage.utils.js';

describe('buildFilePath', () => {
  test('returns format cases/{caseId}/{imageId}/{filename}', () => {
    const result = buildFilePath('case-1', 'image-2', 'sample.jpg');
    expect(result).toBe('cases/case-1/image-2/sample.jpg');
  });
});

describe('createPresignedUploadUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns signedUrl saat sukses', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/upload' },
      error: null,
    });
    const result = await createPresignedUploadUrl('cases/c/i/file.jpg');
    expect(result).toBe('https://example.com/upload');
  });

  test('throws AppError saat error', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    });
    await expect(createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL upload');
  });

  test('throws AppError saat signedUrl tidak ada', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({ data: {}, error: null });
    await expect(createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL upload');
  });
});

describe('createSignedViewUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns signedUrl saat sukses', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/view' },
      error: null,
    });
    const result = await createSignedViewUrl('cases/c/i/file.jpg');
    expect(result).toBe('https://example.com/view');
  });

  test('throws AppError saat error', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not authorized' },
    });
    await expect(createSignedViewUrl('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(createSignedViewUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL view');
  });
});

describe('deleteFile', () => {
  beforeEach(() => vi.clearAllMocks());

  test('tidak throw saat sukses', async () => {
    mockRemove.mockResolvedValue({ error: null });
    await expect(deleteFile('cases/c/i/file.jpg')).resolves.toBeUndefined();
  });

  test('tidak throw saat error mengandung "Not Found"', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'Not Found' } });
    await expect(deleteFile('cases/c/i/file.jpg')).resolves.toBeUndefined();
  });

  test('throws AppError untuk error lain', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'Permission denied' } });
    await expect(deleteFile('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(deleteFile('cases/c/i/file.jpg')).rejects.toThrow('Gagal menghapus file dari storage');
  });
});
