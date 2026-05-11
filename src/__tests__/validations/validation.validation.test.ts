import { describe, test, expect } from 'vitest';
import { submitValidationSchema } from '../../validations/validation.validation.js';

const validInput = {
  global_severity: 'SEDANG',
  necrosis_severity: 'RENDAH',
  granuloma_severity: 'TINGGI',
  datia_count_level: 'JARANG',
  epithelioid_count_level: 'CUKUP_BANYAK',
};

describe('submitValidationSchema', () => {
  test('accepts input lengkap dengan semua 5 field', () => {
    const result = submitValidationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test('accepts input dengan validation_comment', () => {
    const result = submitValidationSchema.safeParse({
      ...validInput,
      validation_comment: 'AI overestimated necrosis.',
    });
    expect(result.success).toBe(true);
  });

  test('validation_comment opsional', () => {
    const result = submitValidationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test('rejects global_severity missing', () => {
    const { global_severity, ...input } = validInput;
    const result = submitValidationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test('rejects necrosis_severity missing', () => {
    const { necrosis_severity, ...input } = validInput;
    const result = submitValidationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test('rejects granuloma_severity missing', () => {
    const { granuloma_severity, ...input } = validInput;
    const result = submitValidationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test('rejects datia_count_level missing', () => {
    const { datia_count_level, ...input } = validInput;
    const result = submitValidationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test('rejects epithelioid_count_level missing', () => {
    const { epithelioid_count_level, ...input } = validInput;
    const result = submitValidationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test('rejects SeverityLevel tidak valid', () => {
    const result = submitValidationSchema.safeParse({ ...validInput, global_severity: 'INVALID' });
    expect(result.success).toBe(false);
  });

  test('rejects HpfCountLevel tidak valid', () => {
    const result = submitValidationSchema.safeParse({ ...validInput, datia_count_level: 'INVALID' });
    expect(result.success).toBe(false);
  });

  test('rejects validation_comment > 2000 karakter', () => {
    const result = submitValidationSchema.safeParse({
      ...validInput,
      validation_comment: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
