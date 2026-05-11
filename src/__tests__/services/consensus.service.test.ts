import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    case: { findUnique: vi.fn(), update: vi.fn() },
    consensus: { create: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../utils/access.utils.js', () => ({
  assertSameInstitution: vi.fn(),
}));

import { submitConsensus } from '../../services/consensus.service.js';
import { prisma } from '../../config/prisma.js';
import { assertSameInstitution } from '../../utils/access.utils.js';
import { AppError } from '../../errors/app.error.js';

const mockCaseFindUnique = vi.mocked(prisma.case.findUnique);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockAssertSameInstitution = vi.mocked(assertSameInstitution);

const mockConsensus = {
  id: 'consensus-1',
  case_id: 'case-1',
  commentator_id: 'patolog-1',
  severity: 'SEDANG',
  comment: null,
  submitted_at: new Date(),
};

const makeCase = (
  status: string,
  images: { id: string; validation: { id: string } | null }[],
  consensus: object | null = null
) => ({
  id: 'case-1',
  status,
  created_by: 'op-1',
  consensus,
  images,
});

describe('submitConsensus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSameInstitution.mockResolvedValue(undefined);
  });

  test('throws 404 jika case tidak ditemukan', async () => {
    mockCaseFindUnique.mockResolvedValue(null);

    await expect(submitConsensus('nonexistent', 'patolog-1', { severity: 'SEDANG' })).rejects.toThrow(
      'Kasus tidak ditemukan'
    );
    await expect(
      submitConsensus('nonexistent', 'patolog-1', { severity: 'SEDANG' }).catch((e) => e.statusCode)
    ).resolves.toBe(404);
  });

  test('throws jika assertSameInstitution gagal', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('PENDING_VALIDATION', [{ id: 'img-1', validation: { id: 'val-1' } }]) as any
    );
    mockAssertSameInstitution.mockRejectedValue(
      new AppError('Akses ditolak: resource milik institusi lain', 403)
    );

    await expect(submitConsensus('case-1', 'patolog-lain', { severity: 'SEDANG' })).rejects.toThrow(
      'Akses ditolak: resource milik institusi lain'
    );
  });

  // --- Aturan create (belum ada consensus) ---

  test('throws 400 saat create jika status PENDING_UPLOAD', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('PENDING_UPLOAD', [{ id: 'img-1', validation: { id: 'val-1' } }], null) as any
    );

    await expect(submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' })).rejects.toThrow(
      'Kasus belum siap untuk consensus'
    );
  });

  test('throws 400 saat create jika status AI_PROCESSING', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('AI_PROCESSING', [{ id: 'img-1', validation: { id: 'val-1' } }], null) as any
    );

    await expect(submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' })).rejects.toThrow(
      'Kasus belum siap untuk consensus'
    );
  });

  test('throws 400 saat create jika ada image belum divalidasi', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase(
        'PENDING_VALIDATION',
        [
          { id: 'img-1', validation: { id: 'val-1' } },
          { id: 'img-2', validation: null },
        ],
        null
      ) as any
    );

    await expect(submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' })).rejects.toThrow(
      '1 citra belum divalidasi'
    );
  });

  test('throws 400 saat create dengan jumlah image yang belum divalidasi tepat', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase(
        'PENDING_VALIDATION',
        [
          { id: 'img-1', validation: null },
          { id: 'img-2', validation: null },
          { id: 'img-3', validation: { id: 'val-3' } },
        ],
        null
      ) as any
    );

    await expect(submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' })).rejects.toThrow(
      '2 citra belum divalidasi'
    );
  });

  // --- Aturan edit (sudah ada consensus) ---

  test('bisa edit meskipun case masih PENDING_UPLOAD (consensus sudah ada)', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('PENDING_UPLOAD', [], mockConsensus) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus] as any);

    await expect(
      submitConsensus('case-1', 'patolog-1', { severity: 'TINGGI' })
    ).resolves.toBeDefined();
  });

  test('bisa edit meskipun case sudah RESOLVED', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('RESOLVED', [], mockConsensus) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus] as any);

    await expect(
      submitConsensus('case-1', 'patolog-1', { severity: 'RENDAH' })
    ).resolves.toBeDefined();
  });

  test('tidak memeriksa validasi image saat edit consensus yang sudah ada', async () => {
    // Ada image yang belum divalidasi, tapi consensus sudah ada → boleh edit
    mockCaseFindUnique.mockResolvedValue(
      makeCase('RESOLVED', [{ id: 'img-1', validation: null }], mockConsensus) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus] as any);

    await expect(
      submitConsensus('case-1', 'patolog-1', { severity: 'TINGGI' })
    ).resolves.toBeDefined();
  });

  // --- Transaksi & transisi status ---

  test('case PENDING_VALIDATION: transaksi berisi 2 operasi (upsert + update status ke RESOLVED)', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('PENDING_VALIDATION', [{ id: 'img-1', validation: { id: 'val-1' } }], null) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus, {}] as any);

    await submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' });

    const txCall = (mockTransaction.mock.calls[0] as unknown as [any[]])[0];
    expect(txCall).toHaveLength(2);
  });

  test('case RESOLVED: transaksi hanya berisi 1 operasi (upsert saja)', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('RESOLVED', [], mockConsensus) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus] as any);

    await submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' });

    const txCall = (mockTransaction.mock.calls[0] as unknown as [any[]])[0];
    expect(txCall).toHaveLength(1);
  });

  test('mengembalikan consensus hasil upsert', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('PENDING_VALIDATION', [{ id: 'img-1', validation: { id: 'val-1' } }], null) as any
    );
    mockTransaction.mockResolvedValue([mockConsensus, {}] as any);

    const result = await submitConsensus('case-1', 'patolog-1', { severity: 'SEDANG' });

    expect(result.severity).toBe('SEDANG');
    expect(result.case_id).toBe('case-1');
  });

  test('meneruskan comment opsional ke upsert', async () => {
    mockCaseFindUnique.mockResolvedValue(
      makeCase('RESOLVED', [], mockConsensus) as any
    );
    mockTransaction.mockResolvedValue([{ ...mockConsensus, comment: 'Temuan sesuai.' }] as any);

    const result = await submitConsensus('case-1', 'patolog-1', {
      severity: 'TINGGI',
      comment: 'Temuan sesuai.',
    });

    expect(result.comment).toBe('Temuan sesuai.');
  });
});
