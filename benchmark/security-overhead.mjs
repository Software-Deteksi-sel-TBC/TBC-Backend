/**
 * security-overhead.mjs
 * ─────────────────────────────────────────────────────────────────
 * Script benchmark untuk mengukur overhead nyata dari lapisan
 * keamanan yang diimplementasikan di TBC-Backend.
 *
 * Cara menjalankan:
 *   node benchmark/security-overhead.mjs
 *
 * Output: tabel perbandingan "Tanpa Keamanan" vs "Dengan Keamanan"
 * yang bisa langsung dipakai sebagai data Slide 12.
 * ─────────────────────────────────────────────────────────────────
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { performance } from "perf_hooks";

const ITERATIONS = 50; // jumlah pengulangan per pengujian
const JWT_SECRET = "benchmark-secret-key-for-testing-only";
const BCRYPT_COST = 10; // sama dengan implementasi di hash.utils.ts

// ─── Utilitas ────────────────────────────────────────────────────

/**
 * Hitung rata-rata, min, dan max dari array angka
 */
function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
  return {
    avg: avg.toFixed(2),
    min: sorted[0].toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
  };
}

/**
 * Cetak tabel hasil dengan format rapi
 */
function printTable(rows) {
  const header = ["Operasi", "Tanpa Keamanan (ms)", "Dengan Keamanan (ms)", "Overhead (ms)", "Keterangan"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));

  const line = widths.map((w) => "─".repeat(w + 2)).join("┼");
  const fmt = (row) => row.map((cell, i) => ` ${String(cell).padEnd(widths[i])} `).join("│");

  console.log("\n┌" + widths.map((w) => "─".repeat(w + 2)).join("┬") + "┐");
  console.log("│" + fmt(header) + "│");
  console.log("├" + line + "┤");
  rows.forEach((row) => console.log("│" + fmt(row) + "│"));
  console.log("└" + widths.map((w) => "─".repeat(w + 2)).join("┴") + "┘");
}

// ─── Benchmark 1: bcrypt hash (simulasi saat staf CREATE akun) ───

async function benchmarkBcryptHash() {
  const password = "TestPassword123!";

  // "Tanpa keamanan" = SHA-256 standar (cepat, tidak dipakai di prod)
  // Disimulasikan dengan hash trivial (1 iterasi)
  const trivialTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    // Simulasi operasi hash tanpa cost (MD5-level speed)
    Buffer.from(password).toString("base64");
    trivialTimes.push(performance.now() - t0);
  }

  // "Dengan keamanan" = bcrypt cost 10 (implementasi nyata)
  const bcryptTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await bcrypt.hash(password, BCRYPT_COST);
    bcryptTimes.push(performance.now() - t0);
  }

  return { trivial: stats(trivialTimes), secure: stats(bcryptTimes) };
}

// ─── Benchmark 2: bcrypt compare (saat login) ────────────────────

async function benchmarkBcryptCompare() {
  const password = "TestPassword123!";
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  // "Tanpa keamanan" = string comparison biasa
  const trivialTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    const _ = password === "TestPassword123!";
    trivialTimes.push(performance.now() - t0);
  }

  // "Dengan keamanan" = bcrypt.compare
  const bcryptTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await bcrypt.compare(password, hash);
    bcryptTimes.push(performance.now() - t0);
  }

  return { trivial: stats(trivialTimes), secure: stats(bcryptTimes) };
}

// ─── Benchmark 3: JWT sign (saat login berhasil) ─────────────────

function benchmarkJwtSign() {
  const payload = { id: "user-uuid-1234", role: "OPERATOR_LAB", is_first_login: false };

  // "Tanpa keamanan" = JSON.stringify biasa
  const trivialTimes = [];
  for (let i = 0; i < ITERATIONS * 10; i++) {
    const t0 = performance.now();
    JSON.stringify(payload);
    trivialTimes.push(performance.now() - t0);
  }

  // "Dengan keamanan" = jwt.sign
  const jwtTimes = [];
  for (let i = 0; i < ITERATIONS * 10; i++) {
    const t0 = performance.now();
    jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
    jwtTimes.push(performance.now() - t0);
  }

  return { trivial: stats(trivialTimes), secure: stats(jwtTimes) };
}

// ─── Benchmark 4: JWT verify (setiap request API) ────────────────

function benchmarkJwtVerify() {
  const payload = { id: "user-uuid-1234", role: "OPERATOR_LAB", is_first_login: false };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

  // "Tanpa keamanan" = langsung parse JSON (tidak ada verifikasi)
  const trivialTimes = [];
  for (let i = 0; i < ITERATIONS * 10; i++) {
    const t0 = performance.now();
    JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    trivialTimes.push(performance.now() - t0);
  }

  // "Dengan keamanan" = jwt.verify (signature check)
  const jwtTimes = [];
  for (let i = 0; i < ITERATIONS * 10; i++) {
    const t0 = performance.now();
    jwt.verify(token, JWT_SECRET);
    jwtTimes.push(performance.now() - t0);
  }

  return { trivial: stats(trivialTimes), secure: stats(jwtTimes) };
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(80));
  console.log("  TBC-Backend — Security Overhead Benchmark");
  console.log(`  Iterasi per uji: ${ITERATIONS} (bcrypt) / ${ITERATIONS * 10} (JWT)`);
  console.log(`  bcrypt cost factor: ${BCRYPT_COST} (sesuai hash.utils.ts)`);
  console.log("═".repeat(80));

  console.log("\n⏳ Menjalankan benchmark... (bcrypt membutuhkan ~30 detik)\n");

  const [hashResult, compareResult] = await Promise.all([
    benchmarkBcryptHash(),
    benchmarkBcryptCompare(),
  ]);

  const signResult = benchmarkJwtSign();
  const verifyResult = benchmarkJwtVerify();

  const rows = [
    [
      "bcrypt.hash (buat password)",
      `${hashResult.trivial.avg} ms`,
      `${hashResult.secure.avg} ms`,
      `+${(hashResult.secure.avg - hashResult.trivial.avg).toFixed(0)} ms`,
      "Terjadi 1x saat pembuatan akun",
    ],
    [
      "bcrypt.compare (login)",
      `${compareResult.trivial.avg} ms`,
      `${compareResult.secure.avg} ms`,
      `+${(compareResult.secure.avg - compareResult.trivial.avg).toFixed(0)} ms`,
      "Terjadi setiap login (1x/sesi)",
    ],
    [
      "jwt.sign (generate token)",
      `${signResult.trivial.avg} ms`,
      `${signResult.secure.avg} ms`,
      `+${(signResult.secure.avg - signResult.trivial.avg).toFixed(3)} ms`,
      "Terjadi setiap login berhasil",
    ],
    [
      "jwt.verify (setiap request)",
      `${verifyResult.trivial.avg} ms`,
      `${verifyResult.secure.avg} ms`,
      `+${(verifyResult.secure.avg - verifyResult.trivial.avg).toFixed(3)} ms`,
      "Terjadi di setiap request API",
    ],
  ];

  printTable(rows);

  console.log("\n📋 KESIMPULAN UNTUK SLIDE 12:");
  console.log("─".repeat(60));
  console.log(`  • Overhead LOGIN  ≈ bcrypt.compare avg + jwt.sign avg`);
  console.log(`    = ~${compareResult.secure.avg} ms + ~${signResult.secure.avg} ms`);
  console.log(`    ≈ ${(parseFloat(compareResult.secure.avg) + parseFloat(signResult.secure.avg)).toFixed(0)} ms total overhead per login`);
  console.log(`\n  • Overhead per REQUEST API ≈ jwt.verify avg`);
  console.log(`    = ~${verifyResult.secure.avg} ms per request`);
  console.log("\n  ⚠️  CATATAN:");
  console.log("  Untuk data Response Time end-to-end (termasuk network latency),");
  console.log("  jalankan perintah curl berikut ke API yang sudah deploy:\n");
  console.log('  curl -o /dev/null -s -w "\\nDNS: %{time_namelookup}s\\nConnect: %{time_connect}s\\nTLS: %{time_appconnect}s\\nTotal: %{time_total}s\\n" \\');
  console.log("    -X POST https://YOUR-DEPLOYED-URL/api/auth/login \\");
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"email":"operator@tbclab.com","password":"password123"}\'');
  console.log("\n═".repeat(80));
}

main().catch(console.error);
