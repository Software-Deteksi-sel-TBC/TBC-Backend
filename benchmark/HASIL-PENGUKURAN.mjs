/**
 * Hasil pengukuran nyata dari TBC-Backend
 * Tanggal benchmark: 2026-06-09
 * Environment: localhost, Node.js, PostgreSQL via Supabase (Singapore region)
 *
 * ══════════════════════════════════════════════════════════
 * SUMBER DATA 1: security-overhead.mjs (isolasi komponen)
 * ══════════════════════════════════════════════════════════
 *
 * bcrypt.hash (cost 10):   avg = 72.86 ms | min = 71.2ms | max = 76.1ms
 * bcrypt.compare (cost 10): avg = 72.72 ms | min = 71.1ms | max = 75.4ms
 * jwt.sign:                 avg = 0.08 ms
 * jwt.verify:               avg = 0.07 ms
 * Iterasi: 50 (bcrypt), 500 (JWT)
 *
 * ══════════════════════════════════════════════════════════
 * SUMBER DATA 2: morgan log server (end-to-end, 10 request)
 * Endpoint: POST /api/auth/login — HTTP 200 OK
 * Catatan: termasuk network roundtrip localhost + DB query Supabase
 * ══════════════════════════════════════════════════════════
 *
 * Request | Response Time
 * --------|---------------
 *   #1    | 713 ms  (cold start + DB cold connection)
 *   #2    | 224 ms
 *   #3    | 236 ms
 *   #4    | 438 ms
 *   #5    | 242 ms
 *   #6    | 232 ms
 *   #7    | 358 ms
 *   #8    | 272 ms
 *   #9    | 358 ms
 *  #10    | 566 ms
 *
 * Avg (semua):   363.9 ms  — termasuk cold start
 * Avg (tanpa #1 cold start): 325.1 ms
 * Min:  224 ms
 * Max:  713 ms (cold start)
 * P90:  566 ms
 *
 * ══════════════════════════════════════════════════════════
 * ESTIMASI "TANPA KEAMANAN" (baseline simulasi)
 * ══════════════════════════════════════════════════════════
 * Dari bcrypt benchmark: overhead bcrypt.compare = ~72.7 ms
 * Dari jwt benchmark:    overhead jwt.sign       = ~0.08 ms
 * Total security overhead per login              = ~72.8 ms
 *
 * Estimasi waktu login tanpa bcrypt/JWT:
 * avg_with - overhead = 325 ms - 73 ms ≈ 252 ms (murni DB query + network)
 *
 * ══════════════════════════════════════════════════════════
 * CATATAN PENTING UNTUK SLIDE
 * ══════════════════════════════════════════════════════════
 * Angka tinggi (224–713ms) disebabkan oleh:
 * 1. Database di Supabase Singapore — latency network ~80-150ms per query
 * 2. bcrypt.compare ~72ms (overhead keamanan yang disengaja)
 * 3. PgBouncer connection pooling — ada overhead handshake
 *
 * Angka yang relevan untuk SLIDE 12 (fokus pada overhead keamanan):
 * - Overhead bcrypt per login:  +73 ms  (diukur, valid)
 * - Overhead JWT per request:   +0.07 ms (diukur, valid)
 * - Total RT login (real):      ~325 ms avg (valid, includes network)
 * - RT tanpa security layer:    ~252 ms  (estimasi berbasis pengukuran)
 */
