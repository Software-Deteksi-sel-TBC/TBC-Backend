import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { getPaginationParams } from "../utils/pagination.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { encryptField, decryptField } from "../utils/crypto.utils.js";
import { type CreatePatientInput, type ListPatientInput, type UpdatePatientInput } from "../validations/patient.validation.js";

// ---------------------------------------------------------------------------
// Helper: dekripsi field sensitif pada objek patient dari DB
// Dipanggil setelah setiap read dari database agar caller selalu menerima
// data plaintext, bukan ciphertext.
// ---------------------------------------------------------------------------
const decryptPatient = <T extends { no_induk: string; bpjs_number: string | null }>(
  patient: T
): T => ({
  ...patient,
  no_induk: decryptField(patient.no_induk),
  bpjs_number: patient.bpjs_number ? decryptField(patient.bpjs_number) : null,
});

export const createPatient = async (data: CreatePatientInput, operatorId: string) => {
  // Enkripsi sebelum pengecekan duplikat agar perbandingan via DB benar
  const encryptedNik = encryptField(data.no_induk);
  const encryptedBpjs = data.bpjs_number ? encryptField(data.bpjs_number) : undefined;

  const existingByNik = await prisma.patient.findUnique({ where: { no_induk: encryptedNik } });
  if (existingByNik) throw new AppError("NIK sudah terdaftar", 409);

  if (encryptedBpjs) {
    const existingByBpjs = await prisma.patient.findUnique({ where: { bpjs_number: encryptedBpjs } });
    if (existingByBpjs) throw new AppError("Nomor BPJS sudah terdaftar", 409);
  }

  const patient = await prisma.patient.create({
    data: {
      ...data,
      no_induk: encryptedNik,
      bpjs_number: encryptedBpjs ?? null,
      created_by: operatorId,
    },
  });

  await writeAuditLog(operatorId, "CREATE_PATIENT", "Patient", patient.id);
  return decryptPatient(patient);
};

export const listPatients = async (query: ListPatientInput) => {
  const { skip, take, page, limit } = getPaginationParams(query.page, query.limit);

  // Catatan: filter by name tetap berjalan normal karena 'name' tidak dienkripsi.
  // Filter by no_induk perlu enkripsi query terlebih dahulu agar match dengan
  // nilai ciphertext di DB (deterministik dengan ECB).
  const where = {
    ...(query.name && { name: { contains: query.name, mode: "insensitive" as const } }),
    ...(query.no_induk && { no_induk: { contains: encryptField(query.no_induk) } }),
  };

  const [total, data] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({ where, skip, take, orderBy: { created_at: "desc" } }),
  ]);

  return {
    data: data.map(decryptPatient),
    meta: { total, page, limit },
  };
};

export const getPatientById = async (id: string) => {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      cases: {
        select: { id: true, status: true, created_at: true, notes: true },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!patient) throw new AppError("Pasien tidak ditemukan", 404);
  return decryptPatient(patient);
};

export const updatePatient = async (id: string, data: UpdatePatientInput, operatorId: string) => {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new AppError("Pasien tidak ditemukan", 404);

  if (data.no_induk) {
    const encryptedNew = encryptField(data.no_induk);
    // Bandingkan ciphertext baru dengan ciphertext lama di DB
    if (encryptedNew !== patient.no_induk) {
      const existingByNik = await prisma.patient.findUnique({ where: { no_induk: encryptedNew } });
      if (existingByNik) throw new AppError("NIK sudah terdaftar pada pasien lain", 409);
    }
  }

  if (data.bpjs_number) {
    const encryptedNew = encryptField(data.bpjs_number);
    if (encryptedNew !== patient.bpjs_number) {
      const existingByBpjs = await prisma.patient.findUnique({ where: { bpjs_number: encryptedNew } });
      if (existingByBpjs) throw new AppError("Nomor BPJS sudah terdaftar pada pasien lain", 409);
    }
  }

  const updateData = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.no_induk !== undefined && { no_induk: encryptField(data.no_induk) }),
    ...(data.bpjs_number !== undefined && { bpjs_number: encryptField(data.bpjs_number) }),
    ...(data.sex !== undefined && { sex: data.sex }),
    ...(data.age !== undefined && { age: data.age }),
  };

  const updated = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  await writeAuditLog(operatorId, "UPDATE_PATIENT", "Patient", id);
  return decryptPatient(updated);
};
