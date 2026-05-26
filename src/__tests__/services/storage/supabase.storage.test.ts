import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../errors/app.error.js';

const mockCreateSignedUploadUrl = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../../config/supabase.js', () => ({
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

import { SupabaseStorage } from '../../../services/storage/supabase.storage.js';

const storage = new SupabaseStorage();

describe('buildFilePath', () => {
  test('returns format cases/{caseId}/{imageId}/{filename}', () => {
    const result = storage.buildFilePath('case-1', 'image-2', 'sample.jpg');
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
    const result = await storage.createPresignedUploadUrl('cases/c/i/file.jpg');
    expect(result).toBe('https://example.com/upload');
  });

  test('throws AppError saat error', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    });
    await expect(storage.createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(storage.createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL upload');
  });

  test('throws AppError saat signedUrl tidak ada', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({ data: {}, error: null });
    await expect(storage.createPresignedUploadUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL upload');
  });
});

describe('createSignedViewUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns signedUrl saat sukses', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/view' },
      error: null,
    });
    const result = await storage.createSignedViewUrl('cases/c/i/file.jpg');
    expect(result).toBe('https://example.com/view');
  });

  test('throws AppError saat error', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not authorized' },
    });
    await expect(storage.createSignedViewUrl('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(storage.createSignedViewUrl('cases/c/i/file.jpg')).rejects.toThrow('Gagal membuat URL view');
  });
});

describe('deleteFile', () => {
  beforeEach(() => vi.clearAllMocks());

  test('tidak throw saat sukses', async () => {
    mockRemove.mockResolvedValue({ error: null });
    await expect(storage.deleteFile('cases/c/i/file.jpg')).resolves.toBeUndefined();
  });

  test('tidak throw saat error mengandung "Not Found"', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'Not Found' } });
    await expect(storage.deleteFile('cases/c/i/file.jpg')).resolves.toBeUndefined();
  });

  test('throws AppError untuk error lain', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'Permission denied' } });
    await expect(storage.deleteFile('cases/c/i/file.jpg')).rejects.toThrow(AppError);
    await expect(storage.deleteFile('cases/c/i/file.jpg')).rejects.toThrow('Gagal menghapus file dari storage');
  });
});
