import { describe, test, expect } from 'vitest';
import { addCommentSchema } from '../../validations/comment.validation.js';

describe('addCommentSchema', () => {
  test('accepts content valid', () => {
    const result = addCommentSchema.safeParse({ content: 'Granuloma terlihat jelas.' });
    expect(result.success).toBe(true);
  });

  test('rejects content kosong', () => {
    const result = addCommentSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  test('rejects content > 2000 karakter', () => {
    const longContent = 'a'.repeat(2001);
    const result = addCommentSchema.safeParse({ content: longContent });
    expect(result.success).toBe(false);
  });

  test('rejects content yang bukan string', () => {
    const result = addCommentSchema.safeParse({ content: 123 });
    expect(result.success).toBe(false);
  });
});
