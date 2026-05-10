import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { getPaginationParams } from "../utils/pagination.utils.js";
import { type CreatePatientInput, type ListPatientInput } from "../validations/patient.validation.js";

export const createPatient = async (data: CreatePatientInput, operatorId: string) => {
  const existingByNik = await prisma.patient.findUnique({ where: { no_induk: data.no_induk } });
  if (existingByNik) throw new AppError("NIK sudah terdaftar", 409);

  if (data.bpjs_number) {
    const existingByBpjs = await prisma.patient.findUnique({ where: { bpjs_number: data.bpjs_number } });
    if (existingByBpjs) throw new AppError("Nomor BPJS sudah terdaftar", 409);
  }

  return prisma.patient.create({
    data: {
      ...data,
      bpjs_number: data.bpjs_number ?? null,
      created_by: operatorId,
    },
  });
};

export const listPatients = async (query: ListPatientInput) => {
  const { skip, take, page, limit } = getPaginationParams(query.page, query.limit);

  const where = {
    ...(query.name && { name: { contains: query.name, mode: "insensitive" as const } }),
    ...(query.no_induk && { no_induk: { contains: query.no_induk } }),
  };

  const [total, data] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({ where, skip, take, orderBy: { created_at: "desc" } }),
  ]);

  return { data, meta: { total, page, limit } };
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
  return patient;
};
