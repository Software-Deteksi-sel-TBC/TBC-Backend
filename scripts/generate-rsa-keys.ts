/**
 * Script satu kali untuk generate pasangan kunci RSA-2048.
 *
 * Cara menjalankan (dari direktori backend/):
 *   npx tsx scripts/generate-rsa-keys.ts
 *
 * Output: private key dan public key dalam format .env-ready (newline → \n literal).
 * Salin output ke file .env Anda.
 *
 * PENTING: Jangan pernah commit private key ke Git!
 * File .env sudah ada di .gitignore.
 */

import crypto from "crypto";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Konversi newline nyata → \n literal agar bisa dimasukkan ke .env dalam satu baris
const toEnvFormat = (pem: string): string =>
  pem.replace(/\n/g, "\\n");

console.log("=".repeat(70));
console.log("RSA-2048 Key Pair Generated Successfully!");
console.log("=".repeat(70));
console.log("\nSalin dua baris berikut ke file .env Anda:\n");
console.log(`RSA_PRIVATE_KEY="${toEnvFormat(privateKey)}"`);
console.log(`RSA_PUBLIC_KEY="${toEnvFormat(publicKey)}"`);
console.log("\n" + "=".repeat(70));
console.log("PERINGATAN: Jangan pernah commit PRIVATE KEY ke Git!");
console.log("=".repeat(70));
