import {
  Role,
  Sex,
  CaseStatus,
  QcStatus,
  Magnification,
  Staining,
  QcFailureReason,
  SeverityLevel,
  HpfCountLevel,
  FindingType,
  ProcessingStatus,
  type Case,
  type Image,
} from '@prisma/client';
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

  const createdImages: Image[] = [];
  for (const img of imagesData) {
    const existing = await prisma.image.findFirst({ where: { file_path: img.file_path } });
    if (!existing) {
      const created = await prisma.image.create({ data: img });
      createdImages.push(created);
      console.log(`✅ Image dibuat: ${img.original_filename} (QC: ${img.qc_status})`);
    } else {
      createdImages.push(existing);
      console.log(`ℹ️ Image ${img.original_filename} sudah ada, dilewati.`);
    }
  }

  // =========================================================================
  // 5. SEEDING AI RESULTS + AI FINDINGS
  // AiResult untuk semua image PASSED di case selain PENDING_UPLOAD.
  // Variasi severity & finding type untuk testing UI patolog.
  // =========================================================================

  const aiResultsData = [
    // Case[1] PENDING_VALIDATION (3 image)
    {
      filePath: 'histopath/case2/sample_40x_1.tiff',
      total_necrosis_percent: 18.5,
      global_severity: SeverityLevel.RENDAH,
      total_granuloma_percent: 32.1,
      total_datia_count: 2,
      total_epiteloid_count: 8,
      mean_confidence: 0.84,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.NECROSIS, confidence_score: 0.82, area_percent: 18.5 },
        { finding_type: FindingType.GRANULOMA, confidence_score: 0.88, area_percent: 32.1 },
      ],
    },
    {
      filePath: 'histopath/case2/sample_10x_1.tiff',
      total_necrosis_percent: 8.0,
      global_severity: SeverityLevel.SANGAT_RENDAH,
      total_granuloma_percent: 12.5,
      total_datia_count: 1,
      total_epiteloid_count: 3,
      mean_confidence: 0.79,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.GRANULOMA, confidence_score: 0.79, area_percent: 12.5 },
      ],
    },
    {
      filePath: 'histopath/case2/sample_40x_2.tiff',
      total_necrosis_percent: 42.0,
      global_severity: SeverityLevel.TINGGI,
      total_granuloma_percent: 55.0,
      total_datia_count: 12,
      total_epiteloid_count: 25,
      mean_confidence: 0.91,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.NECROSIS, confidence_score: 0.93, area_percent: 42.0 },
        { finding_type: FindingType.DATIA_LANGHANS, confidence_score: 0.85, count: 12 },
        { finding_type: FindingType.EPITHELIOID, confidence_score: 0.90, count: 25 },
      ],
    },
    // Case[2] RESOLVED (2 image)
    {
      filePath: 'histopath/case3/sample_40x_1.tiff',
      total_necrosis_percent: 25.0,
      global_severity: SeverityLevel.SEDANG,
      total_granuloma_percent: 40.0,
      total_datia_count: 5,
      total_epiteloid_count: 15,
      mean_confidence: 0.87,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.NECROSIS, confidence_score: 0.87, area_percent: 25.0 },
        { finding_type: FindingType.GRANULOMA, confidence_score: 0.89, area_percent: 40.0 },
      ],
    },
    {
      filePath: 'histopath/case3/sample_40x_2.tiff',
      total_necrosis_percent: 28.5,
      global_severity: SeverityLevel.SEDANG,
      total_granuloma_percent: 38.0,
      total_datia_count: 6,
      total_epiteloid_count: 18,
      mean_confidence: 0.85,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.NECROSIS, confidence_score: 0.83, area_percent: 28.5 },
        { finding_type: FindingType.DATIA_LANGHANS, confidence_score: 0.88, count: 6 },
      ],
    },
    // Case[3] AI_PROCESSING (2 image) — AiResult belum complete
    {
      filePath: 'histopath/case4/sample_40x_1.tiff',
      processing_status: ProcessingStatus.PROCESSING,
      findings: [],
    },
    {
      filePath: 'histopath/case4/sample_10x_1.tiff',
      processing_status: ProcessingStatus.PROCESSING,
      findings: [],
    },
    // Case[4] RESOLVED (2 image)
    {
      filePath: 'histopath/case5/sample_40x_1.tiff',
      total_necrosis_percent: 5.0,
      global_severity: SeverityLevel.SANGAT_RENDAH,
      total_granuloma_percent: 10.0,
      total_datia_count: 0,
      total_epiteloid_count: 2,
      mean_confidence: 0.92,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [
        { finding_type: FindingType.GRANULOMA, confidence_score: 0.92, area_percent: 10.0 },
      ],
    },
    {
      filePath: 'histopath/case5/sample_40x_2.tiff',
      total_necrosis_percent: 3.0,
      global_severity: SeverityLevel.SANGAT_RENDAH,
      total_granuloma_percent: 8.0,
      total_datia_count: 0,
      total_epiteloid_count: 1,
      mean_confidence: 0.94,
      processing_status: ProcessingStatus.COMPLETED,
      findings: [],
    },
  ];

  for (const data of aiResultsData) {
    const image = createdImages.find((img) => img.file_path === data.filePath);
    if (!image) {
      console.log(`⚠️ Image tidak ditemukan untuk AiResult: ${data.filePath}`);
      continue;
    }

    const existing = await prisma.aiResult.findUnique({ where: { image_id: image.id } });
    if (existing) {
      console.log(`ℹ️ AiResult untuk ${data.filePath} sudah ada, dilewati.`);
      continue;
    }

    const { findings, filePath, ...resultFields } = data;
    const aiResult = await prisma.aiResult.create({
      data: {
        ...resultFields,
        image_id: image.id,
        processed_at: resultFields.processing_status === ProcessingStatus.COMPLETED ? now : null,
      },
    });

    for (const f of findings) {
      await prisma.aiFinding.create({
        data: {
          ai_result_id: aiResult.id,
          finding_type: f.finding_type,
          confidence_score: f.confidence_score,
          area_percent: 'area_percent' in f ? f.area_percent : null,
          count: 'count' in f ? f.count : null,
          segmentation_mask: { type: 'bbox', coords: [10, 10, 100, 100] },
        },
      });
    }
    console.log(`✅ AiResult + ${findings.length} finding dibuat untuk ${data.filePath}`);
  }

  // =========================================================================
  // 6. SEEDING COMMENTS (DISKUSI PATOLOG)
  // Beberapa contoh komentar diskusi di citra Case[1] PENDING_VALIDATION
  // =========================================================================

  const commentsData = [
    {
      filePath: 'histopath/case2/sample_40x_1.tiff',
      content: 'Granuloma terlihat cukup jelas di area sentral, perlu konfirmasi necrosis.',
      commentator_id: patolog.id,
    },
    {
      filePath: 'histopath/case2/sample_40x_1.tiff',
      content: 'Setuju, AI prediksi necrosis sepertinya overestimated. Mari kita validasi.',
      commentator_id: patolog2.id,
    },
  ];

  for (const c of commentsData) {
    const image = createdImages.find((img) => img.file_path === c.filePath);
    if (!image) continue;
    const existing = await prisma.comment.findFirst({
      where: { image_id: image.id, commentator_id: c.commentator_id, content: c.content },
    });
    if (existing) continue;
    await prisma.comment.create({
      data: { image_id: image.id, commentator_id: c.commentator_id, content: c.content },
    });
    console.log(`✅ Comment dibuat untuk ${c.filePath}`);
  }

  // =========================================================================
  // 7. SEEDING VALIDATIONS
  // Case[1] PENDING_VALIDATION: hanya 1 image divalidasi (sisanya pending)
  // Case[2] & Case[4] RESOLVED: semua image divalidasi
  // =========================================================================

  const validationsData = [
    // Case[1] — hanya 1 image divalidasi
    {
      filePath: 'histopath/case2/sample_40x_1.tiff',
      validator_id: patolog.id,
      global_severity: SeverityLevel.SEDANG,
      necrosis_severity: SeverityLevel.RENDAH, // patolog koreksi dari AI yang predict RENDAH
      granuloma_severity: SeverityLevel.SEDANG,
      datia_count_level: HpfCountLevel.JARANG,
      epithelioid_count_level: HpfCountLevel.JARANG,
      validation_comment: 'AI overestimated necrosis, sebenarnya lebih rendah.',
    },
    // Case[2] — semua 2 image divalidasi
    {
      filePath: 'histopath/case3/sample_40x_1.tiff',
      validator_id: patolog.id,
      global_severity: SeverityLevel.SEDANG,
      necrosis_severity: SeverityLevel.SEDANG,
      granuloma_severity: SeverityLevel.SEDANG,
      datia_count_level: HpfCountLevel.JARANG,
      epithelioid_count_level: HpfCountLevel.CUKUP_BANYAK,
    },
    {
      filePath: 'histopath/case3/sample_40x_2.tiff',
      validator_id: patolog.id,
      global_severity: SeverityLevel.SEDANG,
      necrosis_severity: SeverityLevel.SEDANG,
      granuloma_severity: SeverityLevel.SEDANG,
      datia_count_level: HpfCountLevel.JARANG,
      epithelioid_count_level: HpfCountLevel.CUKUP_BANYAK,
    },
    // Case[4] — semua 2 image divalidasi
    {
      filePath: 'histopath/case5/sample_40x_1.tiff',
      validator_id: patolog2.id,
      global_severity: SeverityLevel.SANGAT_RENDAH,
      necrosis_severity: SeverityLevel.SANGAT_RENDAH,
      granuloma_severity: SeverityLevel.SANGAT_RENDAH,
      datia_count_level: HpfCountLevel.TIDAK_ADA,
      epithelioid_count_level: HpfCountLevel.TIDAK_ADA,
      validation_comment: 'Pasien sembuh, tidak ada tanda aktif.',
    },
    {
      filePath: 'histopath/case5/sample_40x_2.tiff',
      validator_id: patolog2.id,
      global_severity: SeverityLevel.SANGAT_RENDAH,
      necrosis_severity: SeverityLevel.SANGAT_RENDAH,
      granuloma_severity: SeverityLevel.SANGAT_RENDAH,
      datia_count_level: HpfCountLevel.TIDAK_ADA,
      epithelioid_count_level: HpfCountLevel.TIDAK_ADA,
    },
  ];

  for (const v of validationsData) {
    const image = createdImages.find((img) => img.file_path === v.filePath);
    if (!image) continue;
    const existing = await prisma.validation.findUnique({ where: { image_id: image.id } });
    if (existing) continue;
    const { filePath, ...data } = v;
    await prisma.validation.create({ data: { ...data, image_id: image.id } });
    console.log(`✅ Validation dibuat untuk ${filePath}`);
  }

  // =========================================================================
  // 8. SEEDING CONSENSUS
  // Untuk case RESOLVED, buat 1 consensus akhir
  // =========================================================================

  const consensusData = [
    {
      case_id: createdCases[2].id, // Case[2] RESOLVED
      commentator_id: patolog.id,
      severity: SeverityLevel.SEDANG,
      comment: 'TBC aktif tingkat sedang, lanjutkan OAT lini pertama.',
    },
    {
      case_id: createdCases[4].id, // Case[4] RESOLVED
      commentator_id: patolog2.id,
      severity: SeverityLevel.SANGAT_RENDAH,
      comment: 'Tidak ada tanda TBC aktif. Pasien dinyatakan sembuh.',
    },
  ];

  for (const c of consensusData) {
    const existing = await prisma.consensus.findFirst({
      where: { case_id: c.case_id, commentator_id: c.commentator_id },
    });
    if (existing) continue;
    await prisma.consensus.create({ data: c });
    console.log(`✅ Consensus dibuat untuk case ${c.case_id}`);
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