import crypto from "crypto";

/**
 * Enkripsi field-level menggunakan AES-256-ECB (deterministik).
 *
 * Mengapa ECB untuk field @unique di database:
 * - AES-256-ECB menghasilkan ciphertext yang SAMA untuk plaintext yang sama
 *   selama key-nya sama. Hal ini diperlukan agar constraint @unique di
 *   PostgreSQL tetap bekerja (NIK/BPJS harus unik).
 * - Trade-off: ECB tidak menyembunyikan pola pada data yang identik, namun
 *   untuk field identifikasi pendek (NIK 16 digit, BPJS 13 digit) ini dapat
 *   diterima karena data tidak berulang secara sistematis.
 *
 * Format output: "aes256ecb:<hex ciphertext>"
 *
 * Environment variable:
 *   AES_SECRET_KEY — 64 hex chars (= 32 bytes untuk AES-256)
 */

const CIPHER_ALGORITHM = "aes-256-ecb";
const PREFIX = "aes256ecb:";

const getAesKey = (): Buffer => {
  const hexKey = process.env.AES_SECRET_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "AES_SECRET_KEY harus berupa string 64 hex chars (32 bytes) di environment variable"
    );
  }
  return Buffer.from(hexKey, "hex");
};

/**
 * Enkripsi plaintext dengan AES-256-ECB.
 * Mengembalikan string format: "aes256ecb:<hex>"
 * Jika input sudah terenkripsi (prefix cocok), dikembalikan apa adanya (idempoten).
 */
export const encryptField = (plaintext: string): string => {
  if (plaintext.startsWith(PREFIX)) {
    // Sudah terenkripsi — hindari double-encrypt
    return plaintext;
  }
  const key = getAesKey();
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, null);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  return `${PREFIX}${encrypted.toString("hex")}`;
};

/**
 * Dekripsi nilai yang sebelumnya dienkripsi dengan encryptField().
 * Mengembalikan plaintext asli.
 * Jika input bukan format ciphertext yang dikenal, dikembalikan apa adanya
 * (backward-compatible dengan data plaintext lama).
 */
export const decryptField = (ciphertext: string): string => {
  if (!ciphertext.startsWith(PREFIX)) {
    // Data plaintext lama (belum dimigrasi) — kembalikan apa adanya
    return ciphertext;
  }
  const key = getAesKey();
  const encryptedHex = ciphertext.slice(PREFIX.length);
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, null);
  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
};
