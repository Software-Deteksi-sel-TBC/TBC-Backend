import { Role, Sex, CaseStatus } from '@prisma/client';
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

  const klinis = await prisma.user.upsert({
    where: { email: 'dr.siti@rumahsakit.com' },
    update: {},
    create: {
      name: 'dr. Siti Aminah, Sp.P',
      email: 'dr.siti@rumahsakit.com',
      password_hash: defaultPasswordHash,
      role: Role.DOKTER_KLINIS,
      is_first_login: true,
      sip_number: 'SIP/98765/2026',
      institution: 'RS Pusat Medika',
    },
  });
  console.log(`✅ User dibuat: ${klinis.role} - ${klinis.email}`);

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
      address: 'Jl. Merdeka No. 1, Bogor, Jawa Barat',
      created_by: operator.id,
    },
    {
      name: 'Ibu Ratna',
      no_induk: '3201010000000002',
      bpjs_number: '0000111122222',
      sex: Sex.PEREMPUAN,
      age: 32,
      address: 'Jl. Sudirman No. 10, Bogor, Jawa Barat',
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
      created_by: admin.id, // Admin juga boleh membuat case (contoh kasus migrasi data)
      status: CaseStatus.RESOLVED,
      notes: 'Skrining pasif. Laporan sudah ditandatangani digital.',
    }
  ];

  for (const c of casesToCreate) {
    // Mencegah duplikasi Case jika seeding dijalankan ulang
    const existingCase = await prisma.case.findFirst({
      where: { patient_id: c.patient_id, status: c.status }
    });

    if (!existingCase) {
      const newCase = await prisma.case.create({ data: c });
      console.log(`✅ Kasus dibuat: ID ${newCase.id} | Status: ${newCase.status}`);
    } else {
      console.log(`ℹ️ Kasus untuk pasien ID ${c.patient_id} dengan status ${c.status} sudah ada, dilewati.`);
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