import { describe, test, expect } from 'vitest';
import { createCaseSchema, listCaseSchema } from '../../validations/case.validation.js';

describe('createCaseSchema', () => {
  test('accepts valid UUID sebagai patient_id', () => {
    const result = createCaseSchema.safeParse({ patient_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(result.success).toBe(true);
  });

  test('rejects non-UUID patient_id', () => {
    const result = createCaseSchema.safeParse({ patient_id: 'bukan-uuid' });
    expect(result.success).toBe(false);
  });

  test('notes bersifat optional', () => {
    const result = createCaseSchema.safeParse({ patient_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(result.success).toBe(true);
  });
});

describe('listCaseSchema', () => {
  test('semua field optional — empty object valid', () => {
    expect(listCaseSchema.safeParse({}).success).toBe(true);
  });

  test('accepts valid status PENDING_UPLOAD', () => {
    expect(listCaseSchema.safeParse({ status: 'PENDING_UPLOAD' }).success).toBe(true);
  });

  test('accepts valid status RESOLVED', () => {
    expect(listCaseSchema.safeParse({ status: 'RESOLVED' }).success).toBe(true);
  });

  test('rejects invalid status', () => {
    expect(listCaseSchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
  });
});
