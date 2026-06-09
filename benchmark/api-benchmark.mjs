/**
 * api-benchmark.mjs
 * Mengukur response time end-to-end dari API lokal yang berjalan.
 * Jalankan SETELAH server aktif: node dist/index.js
 */

const BASE_URL = "http://localhost:3000";
const ITERATIONS = 10;

// Kredensial seeder default (sesuai prisma/seed.ts)
// admin@rumahsakit.com memiliki is_first_login: false — bisa login langsung tanpa redirect
const LOGIN_PAYLOAD = {
  email: "admin@rumahsakit.com",
  password: "password123",
};

async function measureEndpoint(label, fn) {
  const times = [];
  let token = null;

  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    const result = await fn(token);
    const elapsed = performance.now() - t0;
    times.push(elapsed);
    if (result?.token) token = result.token;
  }

  const avg = times.reduce((s, v) => s + v, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  return {
    label,
    avg: avg.toFixed(0),
    min: sorted[0].toFixed(0),
    max: sorted[sorted.length - 1].toFixed(0),
    p95: sorted[Math.floor(ITERATIONS * 0.95)].toFixed(0),
  };
}

async function main() {
  console.log("═".repeat(70));
  console.log("  TBC-Backend — API Response Time Benchmark (End-to-End)");
  console.log(`  Target: ${BASE_URL} | Iterasi: ${ITERATIONS} per endpoint`);
  console.log("═".repeat(70));
  console.log("\n⏳ Mengukur...\n");

  // 1. Login (mengandung bcrypt.compare + jwt.sign)
  let savedToken = null;
  const loginResult = await measureEndpoint("POST /api/auth/login (dengan bcrypt + JWT)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(LOGIN_PAYLOAD),
    });
    const data = await res.json();
    if (data?.data?.token) savedToken = data.data.token;
    return { token: data?.data?.token };
  });

  if (!savedToken) {
    console.error("❌ Login gagal. Pastikan data seed sudah ada (npm run seed).");
    process.exit(1);
  }

  // 2. GET /api/patients (hanya JWT verify — tidak ada bcrypt)
  const patientsResult = await measureEndpoint("GET /api/patients (hanya JWT verify)", async () => {
    await fetch(`${BASE_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    });
  });

  // 3. GET /api/cases (hanya JWT verify)
  const casesResult = await measureEndpoint("GET /api/cases (hanya JWT verify)", async () => {
    await fetch(`${BASE_URL}/api/cases`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    });
  });

  // 4. GET tanpa token (401 path — overhead minimal, baseline)
  const unauthResult = await measureEndpoint("GET /api/patients (tanpa token — baseline)", async () => {
    await fetch(`${BASE_URL}/api/patients`);
  });

  // ── Tampilkan tabel ──────────────────────────────────────────────
  const results = [loginResult, patientsResult, casesResult, unauthResult];

  console.log("\n📊 HASIL PENGUKURAN:\n");
  console.log(
    "  " +
      ["Endpoint", "Avg (ms)", "Min (ms)", "Max (ms)", "P95 (ms)"]
        .map((h) => h.padEnd(40))
        .join("")
  );
  console.log("  " + "─".repeat(160));
  results.forEach((r) => {
    console.log(
      "  " +
        [r.label, r.avg + " ms", r.min + " ms", r.max + " ms", r.p95 + " ms"]
          .map((v) => v.padEnd(40))
          .join("")
    );
  });

  console.log("\n📋 INTERPRETASI UNTUK SLIDE 12:");
  console.log("─".repeat(70));
  console.log(`  Endpoint Login (dengan bcrypt + JWT):  avg = ${loginResult.avg} ms`);
  console.log(`  Endpoint Data (hanya JWT verify):      avg = ${patientsResult.avg} ms`);
  console.log(`  Baseline (tanpa token, 401 path):      avg = ${unauthResult.avg} ms`);
  console.log(`\n  → Overhead bcrypt.compare per login:   ~${loginResult.avg - unauthResult.avg} ms`);
  console.log(`  → Overhead jwt.verify per request:     ~${patientsResult.avg - unauthResult.avg} ms`);
  console.log("\n  ⚠️  Catatan: Angka ini termasuk latency loopback (localhost).");
  console.log("  Untuk data deployed, ganti BASE_URL dengan URL produksi Anda.");
  console.log("═".repeat(70));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
