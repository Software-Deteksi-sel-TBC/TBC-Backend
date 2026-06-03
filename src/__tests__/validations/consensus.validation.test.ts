import { describe, test, expect } from 'vitest';
import { createConsensusSchema } from '../../validations/consensus.validation.js';

describe('createConsensusSchema', () => {
  test('accepts severity valid tanpa comment', () => {
    const result = createConsensusSchema.safeParse({ severity: 'SEDANG' });
    expect(result.success).toBe(true);
  });

  test('accepts severity valid dengan comment', () => {
    const result = createConsensusSchema.safeParse({
      severity: 'TINGGI',
      comment: 'Ditemukan granuloma luas pada semua citra.',
    });
    expect(result.success).toBe(true);
  });

  test('comment bersifat opsional', () => {
    const result = createConsensusSchema.safeParse({ severity: 'RENDAH' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.comment).toBeUndefined();
  });

  test('accepts semua nilai SeverityLevel', () => {
    const levels = ['SANGAT_RENDAH', 'RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_TINGGI'];
    for (const level of levels) {
      const result = createConsensusSchema.safeParse({ severity: level });
      expect(result.success).toBe(true);
    }
  });

  test('rejects severity tidak valid', () => {
    const result = createConsensusSchema.safeParse({ severity: 'INVALID' });
    expect(result.success).toBe(false);
  });

  test('rejects severity missing', () => {
    const result = createConsensusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('rejects comment > 2000 karakter', () => {
    const result = createConsensusSchema.safeParse({
      severity: 'SEDANG',
      comment: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  test('accepts comment tepat 2000 karakter', () => {
    const result = createConsensusSchema.safeParse({
      severity: 'SEDANG',
      comment: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});
