import { Role, Sex, CaseStatus, QcStatus, Magnification, Staining, QcFailureReason, type Case } from '@prisma/client';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log(`[SEEDING] Memulai proses inisialisasi master data...`);

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('password123', salt);

  // =========================================================================
  // 1. SEEDING USERS (MASTER DATA)
  // Menyediakan semua jenis Role untuk kebutuhan pengujian alur kerja
  // =========================================================================
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rumahsakit.com' },
    update: {},
    create: {
      name: 'Administrator Sistem AI',
      email: 'admin@rumahsakit.com',
      password_hash: defaultPasswordHash,
      role: Role.ADMIN_AI,
      is_first_login: false,
      institution: 'RS Pusat Medika',
    },
  });
  console.log(`✅ User dibuat: ${admin.role} - ${admin.email}`);

  const operator = await prisma.user.upsert({
    where: { email: 'operator@rumahsakit.com' },
    update: {},
    create: {
      name: 'Petugas Laboratorium',
      email: 'operator@rumahsakit.com',
      password_hash: defaultPasswordHash,
      role: Role.OPERATOR_LAB,
      is_first_login: true,
      institution: 'RS Pusat Medika',
    },
  });
  console.log(`✅ User dibuat: ${operator.role} - ${operator.email}`);

  const patolog = await prisma.user.upsert({
    where: { email: 'dr.budi@rumahsakit.com' },
    update: {},
    create: {
      name: 'dr. Budi Santoso, Sp.PA',
      email: 'dr.budi@rumahsakit.com',
      password_hash: defaultPasswordHash,
      role: Role.DOKTER_PATOLOGI,
      is_first_login: true,
      sip_number: 'SIP/12345/2026',
      institution: 'RS Pusat Medika',
    },
  });
  console.log(`✅ User dibuat: ${patolog.role} - ${patolog.email}`);

  const patolog2 = await prisma.user.upsert({
    where: { email: 'dr.siti@rumahsakit.com' },
    update: {},
    create: {
      name: 'dr. Siti Aminah, Sp.PA',
      email: 'dr.siti@rumahsakit.com',
      password_hash: defaultPasswordHash,
      role: Role.DOKTER_PATOLOGI,
      is_first_login: true,
      sip_number: 'SIP/98765/2026',
      institution: 'RS Pusat Medika',
    },
  });
  console.log(`✅ User dibuat: ${patolog2.role} - ${patolog2.email}`);

  // =========================================================================
  // 2. SEEDING PATIENTS (TRANSACTIONAL DUMMY)
  // Diidentifikasi dengan no_induk sesuai schema.prisma
  // =========================================================================

  const patientsData = [
    {
      name: 'Bapak Ahmad',
      no_induk: '3201010000000001',
      bpjs_number: '0000111122221',
      sex: Sex.LAKI_LAKI,
      age: 45,
      created_by: operator.id,
    },
    {
      name: 'Ibu Ratna',
      no_induk: '3201010000000002',
      bpjs_number: '0000111122222',
      sex: Sex.PEREMPUAN,
      age: 32,
      created_by: operator.id,
    },
    {
      name: 'Pasien X',
      no_induk: '3201010000000003',
      sex: Sex.LAINNYA,
      age: 50,
      created_by: operator.id,
    }
  ];

  const createdPatients = [];
  for (const p of patientsData) {
    const patient = await prisma.patient.upsert({
      where: { no_induk: p.no_induk },
      update: {},
      create: p,
    });
    createdPatients.push(patient);
    console.log(`✅ Pasien dibuat: ${patient.name} (NIK: ${patient.no_induk})`);
  }

  // =========================================================================
  // 3. SEEDING CASES (TRANSACTIONAL DUMMY)
  // Variasi status untuk memudahkan frontend merender grafik/tabel
  // =========================================================================

  const casesToCreate = [
    {
      patient_id: createdPatients[0].id,
      created_by: operator.id,
      status: CaseStatus.PENDING_UPLOAD,
      notes: 'Pemeriksaan rujukan suspek TBC aktif, batuk > 2 minggu.',
    },
    {
      patient_id: createdPatients[1].id,
      created_by: operator.id,
      status: CaseStatus.PENDING_VALIDATION,
      notes: 'Kontrol bulan ke-2 pengobatan OAT.',
    },
    {
      patient_id: createdPatients[2].id,
      created_by: admin.id,
      status: CaseStatus.RESOLVED,
      notes: 'Skrining pasif. Laporan sudah ditandatangani digital.',
    },
    {
      patient_id: createdPatients[0].id,
      created_by: operator.id,
      status: CaseStatus.AI_PROCESSING,
      notes: 'Pemeriksaan lanjutan. Citra sudah diupload, menunggu hasil analisis AI.',
    },
    {
      patient_id: createdPatients[1].id,
      created_by: operator.id,
      status: CaseStatus.RESOLVED,
      notes: 'Kontrol bulan ke-6. Pasien dinyatakan sembuh.',
    },
  ];

  const createdCases: Case[] = [];
  for (const c of casesToCreate) {
    const existingCase = await prisma.case.findFirst({
      where: { patient_id: c.patient_id, status: c.status }
    });

    if (!existingCase) {
      const newCase = await prisma.case.create({ data: c });
      createdCases.push(newCase);
      console.log(`✅ Kasus dibuat: ID ${newCase.id} | Status: ${newCase.status}`);
    } else {
      createdCases.push(existingCase);
      console.log(`ℹ️ Kasus untuk pasien ID ${c.patient_id} dengan status ${c.status} sudah ada, dilewati.`);
    }
  }

  // =========================================================================
  // 4. SEEDING IMAGES (TRANSACTIONAL DUMMY)
  // Distribusi QC status sesuai alur kerja: FAILED hanya ada di PENDING_UPLOAD
  // =========================================================================

  const now = new Date();

  const imagesData = [
    // Case[0] PENDING_UPLOAD — 1 PASSED + 1 FAILED (operator sedang review QC)
    {
      case_id: createdCases[0].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case1/sample_40x_1.tiff',
      original_filename: 'sample_40x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2048000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    {
      case_id: createdCases[0].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case1/sample_blur_failed.tiff',
      original_filename: 'sample_blur_failed.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 1500000,
      qc_status: QcStatus.FAILED,
      qc_failure_reason: QcFailureReason.BLUR,
      qc_blur_score: 0.12,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    // Case[1] PENDING_VALIDATION — 3 PASSED (sudah submit)
    {
      case_id: createdCases[1].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case2/sample_40x_1.tiff',
      original_filename: 'sample_40x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2048000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    {
      case_id: createdCases[1].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case2/sample_10x_1.tiff',
      original_filename: 'sample_10x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 1024000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X10,
      staining: Staining.ZN,
      checked_at: now,
    },
    {
      case_id: createdCases[1].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case2/sample_40x_2.tiff',
      original_filename: 'sample_40x_2.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2100000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    // Case[2] RESOLVED (Patient X) — 2 PASSED
    {
      case_id: createdCases[2].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case3/sample_40x_1.tiff',
      original_filename: 'sample_40x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2048000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    {
      case_id: createdCases[2].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case3/sample_40x_2.tiff',
      original_filename: 'sample_40x_2.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 1900000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.ZN,
      checked_at: now,
    },
    // Case[3] AI_PROCESSING (Patient Ahmad) — 2 PASSED
    {
      case_id: createdCases[3].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case4/sample_40x_1.tiff',
      original_filename: 'sample_40x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2200000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    {
      case_id: createdCases[3].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case4/sample_10x_1.tiff',
      original_filename: 'sample_10x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 980000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X10,
      staining: Staining.HE,
      checked_at: now,
    },
    // Case[4] RESOLVED (Patient Ratna, kontrol ke-6) — 2 PASSED
    {
      case_id: createdCases[4].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case5/sample_40x_1.tiff',
      original_filename: 'sample_40x_1.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 2050000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.HE,
      checked_at: now,
    },
    {
      case_id: createdCases[4].id,
      uploaded_by: operator.id,
      file_path: 'histopath/case5/sample_40x_2.tiff',
      original_filename: 'sample_40x_2.tiff',
      mime_type: 'image/tiff',
      file_size_bytes: 1750000,
      qc_status: QcStatus.PASSED,
      magnification: Magnification.X40,
      staining: Staining.ZN,
      checked_at: now,
    },
  ];

  for (const img of imagesData) {
    const existing = await prisma.image.findFirst({ where: { file_path: img.file_path } });
    if (!existing) {
      await prisma.image.create({ data: img });
      console.log(`✅ Image dibuat: ${img.original_filename} (QC: ${img.qc_status})`);
    } else {
      console.log(`ℹ️ Image ${img.original_filename} sudah ada, dilewati.`);
    }
  }

  console.log(`\n🎉 [SEEDING SELESAI] Database siap digunakan untuk pengujian.`);
}

main()
  .catch((e) => {
    console.error(`❌ Terjadi kesalahan saat seeding:`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });