# CLAUDE.md — Backend TBC Detection System

> Panduan teknis untuk AI assistant. Dokumen ini bersifat "living document" — perbarui setiap kali ada perubahan arsitektur, skema, atau konvensi baru.

---

## 1. Project Overview

Backend untuk sistem **manajemen lab dan skrining awal Tuberkulosis (TBC)** dari citra histopatologi. Sistem ini adalah capstone dan kerja nyata, sehingga prioritas utamanya adalah **kebenaran arsitektur dan kelengkapan infrastruktur**, bukan optimasi produksi.

### Aktor & Peran

| Role             | Tugas Utama                                                                  |
|------------------|------------------------------------------------------------------------------|
| `OPERATOR_LAB`   | Upload citra histopatologi, kelola data kasus dan pasien                     |
| `DOKTER_PATOLOGI`| Review & validasi hasil skrining AI, beri komentar klinis per citra          |
| `ADMIN_AI`       | Monitoring sistem AI (belum diimplementasi)                                  |

### Alur Kerja Utama (High-Level)

```
[OPERATOR_LAB] Daftarkan Pasien → Buat Kasus (Case)
        ↓
[OPERATOR_LAB] Upload banyak citra sekaligus ke Kasus
        ↓
Sistem jalankan QC per citra → qc_status: PASSED | FAILED
        ↓
[OPERATOR_LAB] Review tabel citra + status QC
   ├─ Ada FAILED? → Hapus citra buruk (manual) → Upload pengganti → Ulangi QC
   └─ Semua PASSED? → Submit ke antrian patolog (Case: PENDING_UPLOAD → PENDING_VALIDATION)
        ↓
[Sistem, belum ada] → AI Model proses citra → simpan AiResult + AiFinding
        ↓
[DOKTER_PATOLOGI] buka Antrian Review → validasi AiResult → beri Validation/Comment
        ↓
Consensus dibentuk (jika multi-patolog)
        ↓
[DOKTER_PATOLOGI] generate Report → [DOKTER_KLINIS] unduh laporan PDF
```

> **STATUS AI**: Integrasi AI **belum ada**. Semua data `AiResult` dan `AiFinding` saat ini diisi via seeding untuk keperluan pengembangan infrastruktur.
>
> **STATUS QC**: Logika QC saat ini di-**mock** — otomatis `PASSED` untuk semua citra. Endpoint dan state machine sudah tersedia untuk integrasi QC nyata di masa depan.

---

## 2. Tech Stack

| Layer           | Teknologi                              | Versi       |
|-----------------|----------------------------------------|-------------|
| Runtime         | Node.js (ES Modules)                   | LTS         |
| Language        | TypeScript (strict mode)               | ^6.0        |
| Framework       | Express                                | ^5.2        |
| ORM             | Prisma                                 | ^6.19       |
| Database        | PostgreSQL via **Supabase**            | —           |
| Auth            | JWT (`jsonwebtoken`) + bcrypt          | —           |
| Validation      | Zod                                    | ^4.3         |
| Dev Server      | `tsx watch`                            | ^4.19       |

### Environment Variables (`.env`)

```env
PORT=3000
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true"   # Connection pooling (Prisma runtime)
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"                    # Direct connection (migrations)
JWT_SECRET="..."
```

> `DATABASE_URL` menggunakan PgBouncer untuk pooling. `DIRECT_URL` digunakan Prisma untuk menjalankan migrasi.

---

## 3. Struktur Direktori

```
backend-tbc/
├── prisma/
│   ├── schema.prisma           # Sumber kebenaran skema DB
│   ├── seed.ts                 # Data dummy untuk development
│   └── migrations/             # Riwayat migrasi SQL
├── src/
│   ├── index.ts                # Entry point, Express setup
│   ├── config/
│   │   └── prisma.ts           # Prisma Client singleton
│   ├── routes/                 # Definisi endpoint (1 file = 1 domain)
│   ├── controller/             # Handler HTTP — hanya baca req, panggil service, kirim res
│   ├── services/               # Business logic — semua logika domain di sini
│   ├── validations/            # Zod schemas per domain
│   ├── middlewares/            # validate.middleware, error-handler, auth guard (belum ada)
│   ├── utils/                  # Fungsi stateless: jwt.utils, hash.utils
│   ├── types/                  # TypeScript interfaces dan type definitions
│   ├── errors/                 # Custom AppError class
│   └── constants/              # Konstanta string/config per domain
├── .env                        # Secret — JANGAN di-commit
├── package.json
└── tsconfig.json
```

### Aturan Lapisan (Layering Rules)

- **Route** → hanya mendaftarkan path + middleware + controller
- **Controller** → parse `req`, panggil `service`, kirim `res`. Tidak boleh ada logika bisnis.
- **Service** → semua logika domain. Panggil Prisma. Lempar `AppError` jika ada masalah.
- **Validation** → Zod schema. Dipanggil via `validate.middleware` sebelum controller.

---

## 4. Database Schema

> **Sumber kebenaran**: `prisma/schema.prisma`. Bagian ini adalah ringkasan — selalu cek schema jika ada keraguan nama field.

### Enum Penting

| Enum               | Nilai                                                     |
|--------------------|-----------------------------------------------------------|
| `Role`             | `OPERATOR_LAB \| DOKTER_PATOLOGI \| ADMIN_AI` |
| `CaseStatus`       | `PENDING_UPLOAD \| AI_PROCESSING \| PENDING_VALIDATION \| RESOLVED` |
| `QcStatus`         | `PENDING \| PASSED \| FAILED`                             |
| `QcFailureReason`  | `BLUR \| DARK \| BRIGHT \| NOISE` (enum, bukan free text) |
| `ProcessingStatus` | `QUEUED \| PROCESSING \| COMPLETED \| FAILED`             |
| `SeverityLevel`    | `SANGAT_RENDAH \| RENDAH \| SEDANG \| TINGGI \| SANGAT_TINGGI` |
| `HpfCountLevel`    | `TIDAK_ADA \| JARANG \| CUKUP_BANYAK \| SANGAT_BANYAK` (count cell per HPF) |
| `Magnification`    | `X10 \| X40 \| X100`                                     |
| `Staining`         | `HE \| ZN`                                               |
| `FindingType`      | `NECROSIS \| DATIA_LANGHANS \| EPITHELIOID \| GRANULOMA`  |
| `Sex`              | `LAKI_LAKI \| PEREMPUAN \| LAINNYA`                       |

### Model Utama

#### `User`
```prisma
id, name, email, password_hash, role (Role), is_first_login,
is_active, sip_number?, institution?, created_at, updated_at
```
- `is_first_login = true` → user wajib ganti password setelah login pertama.
- Password reset menggunakan token JWT stateless — **tidak disimpan di DB**.
- Jangan hapus user yang punya jejak klinis — nonaktifkan via `is_active = false`.

#### `Patient`
```prisma
id, name, no_induk (unique), bpjs_number? (unique),
sex (Sex), age (Int), created_by (FK → User), created_at
```
- `created_by` → ID operator yang mendaftarkan pasien.
- Tidak ada `date_of_birth` — umur disimpan sebagai integer saat pendaftaran.

#### `Case`
```prisma
id, patient_id (FK), created_by (FK → User), status (CaseStatus),
notes? (Text), created_at, completed_at?
```
- `created_by` → operator yang membuat kasus (bukan field `operator_id`).
- Status flow: `PENDING_UPLOAD → AI_PROCESSING → PENDING_VALIDATION → RESOLVED`
- Saat operator submit dan AI belum ada: `PENDING_UPLOAD → PENDING_VALIDATION` langsung.

#### `Image`
```prisma
id, case_id (FK), uploaded_by (FK → User), file_path (String),
original_filename, mime_type, file_size_bytes (Int),
qc_status (QcStatus = PENDING), qc_failure_reason? (QcFailureReason),
qc_blur_score? (Float), qc_exposure_score? (Float),
magnification (Magnification), staining (Staining = HE),
uploaded_at, checked_at?
```
- `file_path` → path file di Supabase Storage bucket.
- `qc_failure_reason` adalah **enum** `QcFailureReason`, bukan string bebas.
- `qc_blur_score` dan `qc_exposure_score` → skor teknis hasil QC (opsional).
- `processing_status` **tidak ada** di Image — ada di `AiResult`.

#### `AiResult`
```prisma
id, image_id (FK, unique), total_necrosis_percent? (Float),
global_severity (SeverityLevel = SANGAT_RENDAH),
total_granuloma_percent? (Float), total_datia_count? (Int),
total_epiteloid_count? (Int), mean_confidence? (Float),
is_uncertain (Boolean), processing_status (ProcessingStatus = QUEUED),
processed_at?
```
- Relasi 1:1 dengan `Image`.
- `processing_status` di sini (bukan di `Image`).

#### `AiFinding`
```prisma
id, ai_result_id (FK), finding_type (FindingType),
confidence_score (Float), area_percent? (Float),
count? (Int), segmentation_mask (JsonB)
```
- `segmentation_mask` (bukan `bounding_box`) — berformat JsonB, bisa polygon atau bbox.

#### `Comment`
```prisma
id, image_id (FK), commentator_id (FK → User),
content (Text), is_deleted (Boolean = false), submitted_at
```
- `commentator_id` (bukan `author_id`).
- Soft-delete via `is_deleted`. Konten yang dihapus di-mask oleh `maskDeletedContent()` di `comment.service.ts` sebelum dikirim ke client.
- Untuk diskusi terbuka antar patolog pada tingkat citra (banyak komentar per citra).
- Validasi terstruktur ada di model `Validation` (terpisah).

#### `Validation`
```prisma
id, image_id (FK, unique), validator_id (FK → User),
global_severity (SeverityLevel),
necrosis_severity? (SeverityLevel), granuloma_severity? (SeverityLevel),
datia_count_level? (HpfCountLevel), epithelioid_count_level? (HpfCountLevel),
validation_comment? (Text), submitted_at
```
- **Model mandiri** — bukan ekstensi dari `Comment` lagi.
- Relasi 1:1 dengan `Image` (unique constraint pada `image_id`) — hanya 1 validasi final per citra.
- Patolog memvalidasi prediksi AI menggunakan label kategorikal (bukan angka eksak):
  - Persentase area (necrosis, granuloma) → `SeverityLevel` (5 level)
  - Count cell (datia, epithelioid) → `HpfCountLevel` (4 level standar 0/1+/2+/3+)
  - Severity global → `SeverityLevel`
- `validation_comment` → free-text, juga tempat catat error AI signifikan untuk training development.
- **Tracking error AI untuk training**: dihitung implisit via JOIN antara `AiResult` (nilai eksak prediksi AI) dan `Validation` (bracket dari patolog). Tidak ada model atau enum terpisah untuk ini.

#### `Consensus`
```prisma
id, case_id (FK, unique), commentator_id (FK → User),
severity (SeverityLevel), comment? (Text), submitted_at
```
- `commentator_id` (bukan `created_by`).
- **1:1 dengan Case** (`case_id` unique). Submit ulang menggunakan upsert — consensus bisa direvisi kapan saja.
- Membuat consensus pertama kali pada kasus `PENDING_VALIDATION` secara atomik mengubah `Case.status → RESOLVED` dan mengisi `completed_at`.

#### `Report`
```prisma
id, case_id (FK), generated_by (FK → User), file_path (String),
severity (SeverityLevel), pathologist_notes? (Text),
diagnosis_summary? (Text), is_signed (Boolean = false),
digital_signature? (String), generated_at, signed_at?
```
- `file_path` → path file laporan (PDF/lainnya) di storage.
- `is_signed` (bukan `is_finalized`).

#### `AuditLog`
```prisma
id, user_id (FK), action (String), entity_type (String),
entity_id (String), payload? (JsonB), created_at
```
- `payload` (bukan `metadata`).
- Append-only. **Jangan pernah hapus atau update** entri audit log.

---

## 5. Fitur & Alur Logika

### 5.1 Auth (`/api/auth`)

**Kebijakan Akun — Tidak Ada Fitur Register:**
Untuk menjaga kerahasiaan data pasien, akun user tidak bisa dibuat sendiri. Alurnya:
1. Admin mengumpulkan data user (nama, email, role) dan memasukkan akun langsung ke database dengan password unik per user.
2. Admin mengirim email ke user berisi link sistem + credential awal.
3. User login pertama kali → karena `is_first_login = true`, diarahkan ke halaman **ganti password**.
4. User mengisi: email, password lama, password baru, konfirmasi password baru.
5. Setelah berhasil, `is_first_login` di-set `false` → user login ulang → masuk ke sistem.

**Endpoint:**

| Endpoint              | Method | Deskripsi                                                          |
|-----------------------|--------|--------------------------------------------------------------------|
| `/login`              | POST   | Email + password → JWT token                                       |
| `/update-credentials` | POST   | Ganti password saat first login: email + oldPassword + newPassword + confirmPassword |
| `/forgot-password`    | POST   | Generate reset token (response langsung, no email SMTP)            |
| `/reset-password`     | POST   | Token + newPassword → update password                              |

**JWT Payload**: `{ id, role, is_first_login }`

> `/update-credentials` hanya berlaku saat `is_first_login = true`. Jika user sudah pernah login, gunakan alur forgot/reset password.

### 5.2 Dashboard Operator (BELUM DIIMPLEMENTASI)

> Semua endpoint di bagian ini **hanya bisa diakses oleh `OPERATOR_LAB`** (kecuali yang ditandai khusus).

**Manajemen Pasien:**

| Endpoint              | Method | Deskripsi                                            |
|-----------------------|--------|------------------------------------------------------|
| `GET /api/patients`   | GET    | List pasien dengan filter nama/NIK, pagination       |
| `POST /api/patients`  | POST   | Daftarkan pasien baru                                |
| `GET /api/patients/:id` | GET  | Detail pasien + riwayat kasus                        |

**Manajemen Kasus:**

| Endpoint              | Method | Deskripsi                                            |
|-----------------------|--------|------------------------------------------------------|
| `GET /api/cases`      | GET    | List kasus dengan filter status, tanggal, pagination |
| `POST /api/cases`     | POST   | Buat kasus baru untuk pasien yang sudah terdaftar    |
| `GET /api/cases/:id`  | GET    | Detail kasus + daftar citra + status QC per citra    |

**Stats:**

| Endpoint                  | Method | Deskripsi                                          |
|---------------------------|--------|----------------------------------------------------|
| `GET /api/dashboard/stats`| GET    | Ringkasan: total kasus hari ini, pending upload, dll. |

### 5.3 Upload Citra (BELUM DIIMPLEMENTASI)

> Hanya `OPERATOR_LAB` yang dapat mengakses semua endpoint di bagian ini.

**Alur Upload Multi-Citra:**

```
Fase 1 — Request Presigned URLs (batch)
POST /api/cases/:id/images/presigned-urls
Body: [{ original_filename, mime_type, magnification, staining }, ...]
→ Backend buat Image records (qc_status: PENDING)
→ Backend request presigned URL per file ke Supabase Storage
→ Return: [{ image_id, presigned_url, file_path }, ...]

Fase 2 — Upload langsung ke Supabase Storage (client-side, bisa paralel)
→ Client upload setiap file ke presigned URL masing-masing

Fase 3 — Konfirmasi Upload (batch)
POST /api/cases/:id/images/confirm
Body: [{ image_id }, ...]
→ Backend jalankan QC per citra (saat ini: mock, semua → PASSED)
→ Image.qc_status → PASSED | FAILED
→ Image.qc_failure_reason diisi (enum: BLUR|DARK|BRIGHT|NOISE) jika FAILED
→ Image.checked_at diisi

Fase 4 — Operator review tabel citra (GET /api/cases/:id/images)
→ Setiap baris tabel menampilkan kolom:
   - Nama citra     (original_filename)  ← diinput operator saat upload
   - Magnification  (X10 | X40)
   - Status QC      : "PASSED" atau "FAILED — <qc_failure_reason>"
   - Aksi           : icon trash (hapus manual) + tombol view citra (signed URL)
   * ID citra tidak ditampilkan di UI, tapi tetap ada di response untuk keperluan DELETE & view

Fase 5a — Jika ada FAILED (tindakan manual operator)
DELETE /api/images/:id
→ Hapus record Image dari DB + hapus file dari Supabase Storage
→ Operator upload citra pengganti → kembali ke Fase 1

Fase 5b — Jika semua PASSED
POST /api/cases/:id/submit
→ Service validasi: semua Image milik kasus ini harus ber-qc_status PASSED
  (tolak AppError 400 jika masih ada PENDING atau FAILED)
→ Case.status: PENDING_UPLOAD → PENDING_VALIDATION
  (jika AI sudah terintegrasi: PENDING_UPLOAD → AI_PROCESSING dulu)
→ Semua citra kasus ini muncul di antrian review patolog
```

**Endpoint ringkasan:**

| Endpoint                                    | Method | Deskripsi                                           |
|---------------------------------------------|--------|-----------------------------------------------------|
| `POST /api/cases/:id/images/presigned-urls` | POST   | Buat Image records + dapatkan presigned URLs        |
| `POST /api/cases/:id/images/confirm`        | POST   | Konfirmasi upload selesai + jalankan QC             |
| `GET  /api/cases/:id/images`                | GET    | List citra + status QC untuk ditampilkan di tabel   |
| `DELETE /api/images/:id`                    | DELETE | Hapus citra secara manual (DB + Storage)            |
| `POST /api/cases/:id/submit`                | POST   | Submit semua citra ke antrian patolog               |

**Response `GET /api/cases/:id/images` (data per baris tabel):**
```json
{
  "id": "uuid",
  "original_filename": "sample_40x.tiff",
  "magnification": "X40",
  "qc_status": "FAILED",
  "qc_failure_reason": "BLUR",
  "view_url": "https://...supabase.co/storage/v1/object/sign/..."
}
```

> **Catatan desain**: Penghapusan citra adalah tindakan **manual operator** — sistem tidak otomatis membuang citra yang gagal QC. Operator yang memutuskan apakah citra perlu diganti.
>
> **Upload strategy**: Client upload langsung ke Supabase Storage via presigned URL untuk menghindari bottleneck bandwidth di server backend.

### 5.4 Dashboard Patolog ✅

> Citra masuk ke antrian patolog setelah operator menekan **Submit** pada kasus (Case.status → `PENDING_VALIDATION`). Sebelum itu, citra tidak terlihat di dashboard patolog.

**Alur lengkap:**

1. Patolog buka antrian → `GET /api/review/queue` — daftar kasus `PENDING_VALIDATION` beserta progress validasi (`images_validated / images_total`)
2. Klik "view images" pada satu kasus → `GET /api/review/cases/:caseId/images` — daftar citra QC-passed dengan kolom: nama file, `is_validated`, `global_severity` (dari AI jika belum divalidasi, dari Validation jika sudah), `is_ai_uncertain`, `validated_by`
3. Klik satu citra → `GET /api/review/cases/:caseId/images/:imageId` — detail lengkap: foto (signed URL), AiResult + AiFinding, validasi existing, thread komentar
4. Isi form validasi → `POST /api/images/:id/validate` — upsert, bisa direvisi
5. Ulangi langkah 3–4 untuk semua citra
6. Setelah semua citra tervalidasi → `POST /api/cases/:id/consensus` — jika masih ada citra belum divalidasi, tolak 400. Berhasil → Case otomatis `RESOLVED`
7. Kasus pindah ke `GET /api/review/resolved` — daftar kasus selesai beserta nama patolog dan severity consensus

**Endpoint:**

| Endpoint                                    | Method | Akses                             | Deskripsi |
|---------------------------------------------|--------|-----------------------------------|-----------|
| `GET /api/review/queue`                     | GET    | `DOKTER_PATOLOGI`                 | Antrian kasus `PENDING_VALIDATION` |
| `GET /api/review/resolved`                  | GET    | `DOKTER_PATOLOGI`                 | Daftar kasus selesai (`RESOLVED`) |
| `GET /api/review/cases/:caseId/images`      | GET    | `DOKTER_PATOLOGI`                 | Daftar citra satu kasus + status validasi |
| `GET /api/review/cases/:caseId/images/:id`  | GET    | `DOKTER_PATOLOGI`, `OPERATOR_LAB` | Detail citra (foto, AI, validasi, komentar) |
| `POST /api/images/:id/validate`             | POST   | `DOKTER_PATOLOGI`                 | Submit/revisi Validation per citra |
| `POST /api/images/:id/comments`             | POST   | `DOKTER_PATOLOGI`, `OPERATOR_LAB` | Tambah komentar diskusi |
| `POST /api/cases/:id/consensus`             | POST   | `DOKTER_PATOLOGI`                 | Buat/revisi Consensus → Case `RESOLVED` |

**Logika `global_severity` di daftar citra:**
- Belum divalidasi → ambil dari `ai_result.global_severity`
- Sudah divalidasi → ambil dari `validation.global_severity` (override AI)

**Payload `POST /api/images/:id/validate`:**
```json
{
  "global_severity": "SEDANG",
  "necrosis_severity": "RENDAH",
  "granuloma_severity": "TINGGI",
  "datia_count_level": "JARANG",
  "epithelioid_count_level": "CUKUP_BANYAK",
  "validation_comment": "AI overestimated necrosis area"
}
```

### 5.5 Generator Laporan Klinis (BELUM DIIMPLEMENTASI)

- `POST /api/reports` — generate laporan dari data Case + AiResult + Consensus
- `GET /api/reports/:id` — ambil laporan (format JSON, konversi PDF di frontend atau via lib)
- `PATCH /api/reports/:id/finalize` — tandatangani laporan secara digital

---

## 6. Development Commands

```bash
# Jalankan dev server dengan hot-reload
npm run dev

# Build TypeScript ke JavaScript
npm run build

# Jalankan build hasil kompilasi
npm start

# Jalankan semua test — wajib dijalankan setelah setiap fitur selesai
npm run test

# Coverage report
npm run test:coverage

# Jalankan database seeding
npm run seed
# atau secara langsung:
npx prisma db seed

# Generate Prisma Client setelah ubah schema.prisma
npx prisma generate

# Buat migrasi baru (setelah ubah schema.prisma)
npx prisma migrate dev --name <nama_migrasi>

# Lihat state database secara visual
npx prisma studio

# Push schema langsung ke DB tanpa membuat file migrasi (HATI-HATI, hanya dev)
npx prisma db push

# Reset database dan jalankan ulang semua migrasi + seed
npx prisma migrate reset
```

> **Penting**: Selalu gunakan `migrate dev` (bukan `db push`) untuk perubahan skema yang perlu dilacak. `db push` hanya untuk eksperimen cepat.

---

## 7. Seeding Data

File: `prisma/seed.ts`

Data yang di-seed:
- **4 User** (satu per role): admin, operator, patolog, dokter klinis
  - Default password: `password123` (di-hash dengan bcrypt)
  - Email format: `{role}@tbclab.com`
- **3 Patient**: dengan NIK dan nomor BPJS berbeda
- **3 Case**: dengan status bervariasi (PENDING_UPLOAD, IN_REVIEW, RESOLVED)

Untuk menambah data seed baru (misalnya Image + AiResult dummy):
1. Tambahkan blok `await prisma.image.create({...})` di `seed.ts`
2. Jalankan `npx prisma migrate reset` (reset + seed ulang) atau buat script seed tambahan

---

## 8. Coding Conventions

### Penamaan File
- Gunakan format: `{domain}.{layer}.ts`
- Contoh: `case.service.ts`, `image.controller.ts`, `patient.routes.ts`

### Response Format
Semua response API harus konsisten:
```typescript
// Success — respons umum
{ status: "success", message: "Pesan sukses" }

// Success — dengan data tunggal
{ status: "success", message: "Pesan sukses", data: {...} }

// Success — dengan data list + pagination
{ status: "success", message: "Pesan sukses", data: [...], meta: { total, page, limit } }

// Error (via AppError → sendErrorResponse di error-handler middleware)
{ status: "error", message: "Pesan error yang jelas" }
```

### Error Handling
- Lempar `new AppError("pesan", statusCode)` di dalam service.
- Controller menggunakan `try/catch` dan memanggil `sendErrorResponse(res, error)` secara eksplisit.
- Jangan taruh logika bisnis di dalam `catch` block controller — cukup teruskan ke `sendErrorResponse`.

### Validasi
- Semua input wajib divalidasi dengan Zod schema sebelum masuk controller.
- Gunakan `validate(schema)` middleware di route definition.
- Jangan validasi ulang di service — percayai bahwa data sudah bersih.

### TypeScript
- Gunakan `strict: true` — tidak ada `any` kecuali benar-benar terpaksa.
- Definisikan semua payload type di `src/types/{domain}.types.ts`.
- Gunakan Prisma-generated types (`Prisma.UserGetPayload`) untuk type safety DB.

### Bahasa
- Komentar kode: **Bahasa Indonesia** (sesuai konteks proyek akademik).
- Nama variabel/fungsi: **camelCase**, **bahasa Inggris**.
- Pesan error untuk user: **Bahasa Indonesia**.
- Nama field DB (Prisma): **snake_case**.

### Auth Guard ✅

`authenticate` middleware memverifikasi JWT dari header `Authorization: Bearer <token>`, lalu menempel payload ke `req.user`. `authorize(...roles)` dirantai setelahnya untuk membatasi akses per role. Keduanya ada di `middlewares/authenticate.middleware.ts`.

### Aturan Akses Institusi (OPERATOR_LAB)

`OPERATOR_LAB` dapat mengakses dan mengedit kasus/citra milik operator lain **selama masih satu institusi** (field `institution` di model `User`).

- Pengecekan dilakukan di **service layer** via helper `assertSameInstitution(operatorId, caseCreatorId)`
- Jika salah satu operator memiliki `institution = null` → **tolak akses (403)**
- Jangan cek `created_by === operatorId` — itu terlalu ketat dan melanggar aturan bisnis ini

```typescript
// Pola yang benar di setiap service function yang mutable:
const kasus = await prisma.case.findUnique({ where: { id: caseId } });
if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
await assertSameInstitution(operatorId, kasus.created_by);
```

---

## 9. Yang Belum Ada (Backlog)

**Infrastruktur:**
- [ ] AuditLog writer utility (dipanggil di setiap service yang mutasi data)
- [ ] `.env.example` file
- [ ] Rate limiting middleware
- [ ] Request logging (morgan atau custom)

**Domain: Laporan Klinis (DOKTER_PATOLOGI)**
- [ ] `POST /api/reports` — generate laporan dari Case + AiResult + Consensus
- [ ] `GET  /api/reports/:id` — ambil laporan (JSON)
- [ ] `PATCH /api/reports/:id/finalize` — finalisasi + tanda tangan digital

**Domain: Stats**
- [ ] `GET /api/dashboard/stats` — ringkasan harian untuk operator

**Integrasi AI**
- [ ] Koneksi ke AI model untuk inferensi AiResult + AiFinding (saat ini data AI diisi via seeding)