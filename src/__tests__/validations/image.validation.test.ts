import { describe, test, expect } from 'vitest';
import {
  requestPresignedUrlsSchema,
  confirmUploadSchema,
} from '../../validations/image.validation.js';

const validImage = {
  original_filename: 'sample.jpg',
  mime_type: 'image/jpeg',
  magnification: 'X40',
  staining: 'HE',
};

describe('requestPresignedUrlsSchema', () => {
  test('accepts valid single image dengan field lengkap', () => {
    const result = requestPresignedUrlsSchema.safeParse({ images: [validImage] });
    expect(result.success).toBe(true);
  });

  test('staining default ke HE jika tidak diisi', () => {
    const { staining, ...imageWithoutStaining } = validImage;
    const result = requestPresignedUrlsSchema.safeParse({ images: [imageWithoutStaining] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0]!.staining).toBe('HE');
    }
  });

  test('rejects empty images array', () => {
    const result = requestPresignedUrlsSchema.safeParse({ images: [] });
    expect(result.success).toBe(false);
  });

  test('rejects array > 20 images', () => {
    const manyImages = Array.from({ length: 21 }, () => validImage);
    const result = requestPresignedUrlsSchema.safeParse({ images: manyImages });
    expect(result.success).toBe(false);
  });

  test('rejects filename dengan karakter ilegal', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, original_filename: 'bad<name>.jpg' }],
    });
    expect(result.success).toBe(false);
  });

  test('rejects filename dengan slash', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, original_filename: 'path/to/file.jpg' }],
    });
    expect(result.success).toBe(false);
  });

  test('rejects filename > 255 karakter', () => {
    const longName = 'a'.repeat(256) + '.jpg';
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, original_filename: longName }],
    });
    expect(result.success).toBe(false);
  });

  test('rejects mime_type tidak valid', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, mime_type: 'application/pdf' }],
    });
    expect(result.success).toBe(false);
  });

  test('accepts mime_type uppercase (di-transform ke lowercase)', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, mime_type: 'IMAGE/JPEG' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0]!.mime_type).toBe('image/jpeg');
    }
  });

  test('rejects magnification tidak valid', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, magnification: 'X999' }],
    });
    expect(result.success).toBe(false);
  });

  test('rejects staining tidak valid', () => {
    const result = requestPresignedUrlsSchema.safeParse({
      images: [{ ...validImage, staining: 'INVALID' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('confirmUploadSchema', () => {
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  test('accepts array UUID valid', () => {
    const result = confirmUploadSchema.safeParse({ image_ids: [validUuid] });
    expect(result.success).toBe(true);
  });

  test('rejects empty image_ids', () => {
    const result = confirmUploadSchema.safeParse({ image_ids: [] });
    expect(result.success).toBe(false);
  });

  test('rejects array > 20 IDs', () => {
    const manyIds = Array.from({ length: 21 }, () => validUuid);
    const result = confirmUploadSchema.safeParse({ image_ids: manyIds });
    expect(result.success).toBe(false);
  });

  test('rejects ID non-UUID', () => {
    const result = confirmUploadSchema.safeParse({ image_ids: ['bukan-uuid'] });
    expect(result.success).toBe(false);
  });
});
