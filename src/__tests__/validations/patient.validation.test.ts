import { describe, test, expect } from 'vitest';
import { createPatientSchema } from '../../validations/patient.validation.js';

describe('createPatientSchema', () => {
  const validData = {
    name: 'Ahmad',
    no_induk: '3201010000000001',
    sex: 'LAKI_LAKI',
    age: 45,
  };

  test('accepts valid patient data', () => {
    expect(createPatientSchema.safeParse(validData).success).toBe(true);
  });

  test('rejects NIK kurang dari 16 digit', () => {
    const result = createPatientSchema.safeParse({ ...validData, no_induk: '123' });
    expect(result.success).toBe(false);
  });

  test('rejects NIK lebih dari 16 digit', () => {
    const result = createPatientSchema.safeParse({ ...validData, no_induk: '32010100000000011' });
    expect(result.success).toBe(false);
  });

  test('rejects NIK yang mengandung huruf', () => {
    const result = createPatientSchema.safeParse({ ...validData, no_induk: '320101000000000A' });
    expect(result.success).toBe(false);
  });

  test('rejects sex yang tidak valid', () => {
    const result = createPatientSchema.safeParse({ ...validData, sex: 'PRIA' });
    expect(result.success).toBe(false);
  });

  test('accepts semua nilai sex yang valid', () => {
    for (const sex of ['LAKI_LAKI', 'PEREMPUAN', 'LAINNYA']) {
      expect(createPatientSchema.safeParse({ ...validData, sex }).success).toBe(true);
    }
  });

  test('accepts age 0 (bayi baru lahir)', () => {
    expect(createPatientSchema.safeParse({ ...validData, age: 0 }).success).toBe(true);
  });

  test('rejects age di bawah 0', () => {
    const result = createPatientSchema.safeParse({ ...validData, age: -1 });
    expect(result.success).toBe(false);
  });

  test('accepts age 200 (batas maksimum)', () => {
    expect(createPatientSchema.safeParse({ ...validData, age: 200 }).success).toBe(true);
  });

  test('rejects age di atas 200', () => {
    const result = createPatientSchema.safeParse({ ...validData, age: 201 });
    expect(result.success).toBe(false);
  });

  test('bpjs_number bersifat optional', () => {
    expect(createPatientSchema.safeParse(validData).success).toBe(true);
  });
});