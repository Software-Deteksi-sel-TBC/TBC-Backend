import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    image: { findUnique: vi.fn() },
    comment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../utils/access.utils.js', () => ({
  assertSameInstitution: vi.fn(),
}));

import { addComment, deleteComment, maskDeletedContent, DELETED_CONTENT } from '../../services/comment.service.js';
import { prisma } from '../../config/prisma.js';
import { assertSameInstitution } from '../../utils/access.utils.js';
import { AppError } from '../../errors/app.error.js';

const mockImageFindUnique = vi.mocked(prisma.image.findUnique);
const mockCommentCreate = vi.mocked(prisma.comment.create);
const mockCommentFindUnique = vi.mocked(prisma.comment.findUnique);
const mockCommentUpdate = vi.mocked(prisma.comment.update);
const mockAssertSameInstitution = vi.mocked(assertSameInstitution);

const mockImage = {
  id: 'image-1',
  case_id: 'case-1',
  case: { id: 'case-1', status: 'PENDING_VALIDATION', created_by: 'op-1' },
};

const mockComment = {
  id: 'comment-1',
  image_id: 'image-1',
  commentator_id: 'patolog-1',
  content: 'Granuloma terlihat jelas.',
  is_deleted: false,
  submitted_at: new Date(),
};

describe('addComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
  });

  test('throws 404 jika image tidak ditemukan', async () => {
    mockImageFindUnique.mockResolvedValue(null);
    await expect(addComment('nonexistent', 'patolog-1', 'isi')).rejects.toThrow('Gambar tidak ditemukan');
  });

  test('throws 400 jika case status bukan PENDING_VALIDATION', async () => {
    mockImageFindUnique.mockResolvedValue({
      ...mockImage,
      case: { ...mockImage.case, status: 'PENDING_UPLOAD' },
    } as any);
    await expect(addComment('image-1', 'patolog-1', 'isi')).rejects.toThrow('Kasus belum siap untuk direview');
  });

  test('throws jika assertSameInstitution gagal', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockAssertSameInstitution.mockRejectedValue(
      new AppError('Akses ditolak: resource milik institusi lain', 403)
    );
    await expect(addComment('image-1', 'patolog-lain', 'isi')).rejects.toThrow(
      'Akses ditolak: resource milik institusi lain'
    );
  });

  test('memanggil assertSameInstitution dengan commentatorId dan case.created_by', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockCommentCreate.mockResolvedValue(mockComment as any);
    await addComment('image-1', 'patolog-1', 'isi');
    expect(mockAssertSameInstitution).toHaveBeenCalledWith('patolog-1', 'op-1');
  });

  test('membuat comment dan mengembalikan data comment', async () => {
    mockImageFindUnique.mockResolvedValue(mockImage as any);
    mockCommentCreate.mockResolvedValue(mockComment as any);
    const result = await addComment('image-1', 'patolog-1', 'Granuloma terlihat jelas.');
    expect(mockCommentCreate).toHaveBeenCalledWith({
      data: { image_id: 'image-1', commentator_id: 'patolog-1', content: 'Granuloma terlihat jelas.' },
    });
    expect(result.content).toBe('Granuloma terlihat jelas.');
  });
});

describe('deleteComment', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika comment tidak ditemukan', async () => {
    mockCommentFindUnique.mockResolvedValue(null);
    await expect(deleteComment('nonexistent', 'patolog-1')).rejects.toThrow('Komentar tidak ditemukan');
    await expect(
      deleteComment('nonexistent', 'patolog-1').catch((e) => e.statusCode)
    ).resolves.toBe(404);
  });

  test('throws 409 jika comment sudah didelete sebelumnya', async () => {
    mockCommentFindUnique.mockResolvedValue({ ...mockComment, is_deleted: true } as any);
    await expect(deleteComment('comment-1', 'patolog-1')).rejects.toThrow('Komentar sudah dihapus');
    await expect(
      deleteComment('comment-1', 'patolog-1').catch((e) => e.statusCode)
    ).resolves.toBe(409);
  });

  test('throws 403 jika bukan penulis komentar', async () => {
    mockCommentFindUnique.mockResolvedValue(mockComment as any);
    await expect(deleteComment('comment-1', 'patolog-lain')).rejects.toThrow(
      'Akses ditolak: hanya penulis komentar yang dapat menghapusnya'
    );
    await expect(
      deleteComment('comment-1', 'patolog-lain').catch((e) => e.statusCode)
    ).resolves.toBe(403);
  });

  test('melakukan soft delete (update is_deleted = true)', async () => {
    mockCommentFindUnique.mockResolvedValue(mockComment as any);
    mockCommentUpdate.mockResolvedValue({ ...mockComment, is_deleted: true } as any);

    await deleteComment('comment-1', 'patolog-1');

    expect(mockCommentUpdate).toHaveBeenCalledWith({
      where: { id: 'comment-1' },
      data: { is_deleted: true },
    });
  });

  test('tidak melempar error jika penulis menghapus komentarnya sendiri', async () => {
    mockCommentFindUnique.mockResolvedValue(mockComment as any);
    mockCommentUpdate.mockResolvedValue({ ...mockComment, is_deleted: true } as any);
    await expect(deleteComment('comment-1', 'patolog-1')).resolves.toBeDefined();
  });
});

describe('maskDeletedContent', () => {
  test('mengembalikan comment asli jika is_deleted false', () => {
    const comment = { content: 'isi komentar', is_deleted: false };
    expect(maskDeletedContent(comment).content).toBe('isi komentar');
  });

  test('mengganti content dengan DELETED_CONTENT jika is_deleted true', () => {
    const comment = { content: 'isi komentar', is_deleted: true };
    expect(maskDeletedContent(comment).content).toBe(DELETED_CONTENT);
  });

  test('field lain tidak berubah setelah masking', () => {
    const comment = { id: 'c-1', content: 'isi', is_deleted: true, submitted_at: new Date() };
    const result = maskDeletedContent(comment) as typeof comment;
    expect(result.id).toBe('c-1');
    expect(result.is_deleted).toBe(true);
  });
});
