import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    case: {
      create: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { createCase, listCases, getCaseById } from '../../services/case.service.js';
import { prisma } from '../../config/prisma.js';

const mockPatient = { id: 'patient-123', name: 'Ahmad', no_induk: '3201010000000001' };
const mockCase = {
  id: 'case-123',
  patient_id: 'patient-123',
  created_by: 'op-123',
  status: 'PENDING_UPLOAD',
  notes: null,
  created_at: new Date(),
};

describe('createCase', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika patient tidak ditemukan', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    await expect(createCase({ patient_id: 'nonexistent' }, 'op-1')).rejects.toThrow('Pasien tidak ditemukan');
  });

  test('creates case jika patient ada', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatient as any);
    vi.mocked(prisma.case.create).mockResolvedValue(mockCase as any);
    const result = await createCase({ patient_id: 'patient-123' }, 'op-1');
    expect(result.patient_id).toBe('patient-123');
    expect(result.status).toBe('PENDING_UPLOAD');
  });
});

describe('getCaseById', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika case tidak ditemukan', async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    await expect(getCaseById('nonexistent-id')).rejects.toThrow('Kasus tidak ditemukan');
  });

  test('returns case jika ditemukan', async () => {
    const caseWithRelations = { ...mockCase, patient: mockPatient, images: [] };
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseWithRelations as any);
    const result = await getCaseById('case-123');
    expect(result.id).toBe('case-123');
  });
});

describe('listCases', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns data dan meta pagination', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([3, [mockCase]] as any);
    const result = await listCases({ page: '1', limit: '10' });
    expect(result.meta.total).toBe(3);
    expect(result.data).toHaveLength(1);
  });

  test('filter by status diterapkan pada hasil', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([1, [mockCase]] as any);
    const result = await listCases({ status: 'PENDING_UPLOAD' as any, page: '1', limit: '10' });
    expect(result.data[0]?.status).toBe('PENDING_UPLOAD');
  });
});
