import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../errors/app.error.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { createPatient, listPatients, getPatientById, updatePatient } from '../../services/patient.service.js';
import { prisma } from '../../config/prisma.js';

const mockPatient = {
  id: 'patient-123',
  name: 'Ahmad',
  no_induk: '3201010000000001',
  bpjs_number: null,
  sex: 'LAKI_LAKI',
  age: 45,
  created_by: 'operator-123',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('createPatient', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 409 jika NIK sudah terdaftar', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatient as any);
    await expect(
      createPatient({ name: 'Budi', no_induk: '3201010000000001', sex: 'LAKI_LAKI' as any, age: 30 }, 'op-1')
    ).rejects.toThrow('NIK sudah terdaftar');
  });

  test('throws 409 jika BPJS sudah terdaftar', async () => {
    vi.mocked(prisma.patient.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockPatient as any);
    await expect(
      createPatient({ name: 'Budi', no_induk: '9999999999999999', sex: 'LAKI_LAKI' as any, age: 30, bpjs_number: '0000111122221' }, 'op-1')
    ).rejects.toThrow('BPJS sudah terdaftar');
  });

  test('creates patient jika data valid', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue(mockPatient as any);
    const result = await createPatient({ name: 'Ahmad', no_induk: '3201010000000001', sex: 'LAKI_LAKI' as any, age: 45 }, 'op-1');
    expect(result).toEqual(mockPatient);
  });
});

describe('getPatientById', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika patient tidak ditemukan', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    await expect(getPatientById('nonexistent-id')).rejects.toThrow('Pasien tidak ditemukan');
  });

  test('returns patient jika ditemukan', async () => {
    const patientWithCases = { ...mockPatient, cases: [] };
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(patientWithCases as any);
    const result = await getPatientById('patient-123');
    expect(result.id).toBe('patient-123');
  });
});

describe('listPatients', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns data dan meta pagination', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([2, [mockPatient, mockPatient]] as any);
    const result = await listPatients({ page: '1', limit: '10' });
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
  });

  test('meta limit sesuai query', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([0, []] as any);
    const result = await listPatients({ page: '2', limit: '5' });
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });
});

describe('updatePatient', () => {
  beforeEach(() => vi.clearAllMocks());

  test('throws 404 jika patient tidak ditemukan', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    await expect(updatePatient('nonexistent-id', { name: 'Budi' })).rejects.toThrow('Pasien tidak ditemukan');
  });

  test('throws 409 jika NIK sudah terdaftar pada pasien lain', async () => {
    vi.mocked(prisma.patient.findUnique)
      .mockResolvedValueOnce(mockPatient as any) 
      .mockResolvedValueOnce({ id: 'other-id' } as any); 
    await expect(
      updatePatient('patient-123', { no_induk: '1111222233334444' })
    ).rejects.toThrow('NIK sudah terdaftar pada pasien lain');
  });

  test('throws 409 jika BPJS sudah terdaftar pada pasien lain', async () => {
    vi.mocked(prisma.patient.findUnique)
      .mockResolvedValueOnce(mockPatient as any) 
      .mockResolvedValueOnce({ id: 'other-id' } as any); 
      
    await expect(
      updatePatient('patient-123', { bpjs_number: '1111222233334' })
    ).rejects.toThrow('Nomor BPJS sudah terdaftar pada pasien lain');
  });

  test('updates patient jika data valid', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValueOnce(mockPatient as any);
    vi.mocked(prisma.patient.update).mockResolvedValue({ ...mockPatient, name: 'Budi' } as any);
    
    const result = await updatePatient('patient-123', { name: 'Budi' });
    expect(result.name).toBe('Budi');
  });
});
