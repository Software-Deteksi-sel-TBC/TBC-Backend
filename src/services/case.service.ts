import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { getPaginationParams } from "../utils/pagination.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { type CreateCaseInput, type ListCaseInput } from "../validations/case.validation.js";

export const createCase = async (data: CreateCaseInput, operatorId: string) => {
  const patient = await prisma.patient.findUnique({ where: { id: data.patient_id } });
  if (!patient) throw new AppError("Pasien tidak ditemukan", 404);

  const kasus = await prisma.case.create({
    data: {
      patient_id: data.patient_id,
      created_by: operatorId,
      notes: data.notes ?? null,
    },
  });

  await writeAuditLog(operatorId, "CREATE_CASE", "Case", kasus.id);
  return kasus;
};

export const listCases = async (query: ListCaseInput) => {
  const { skip, take, page, limit } = getPaginationParams(query.page, query.limit);

  const where = {
    ...(query.status && { status: query.status }),
  };

  const [total, data] = await prisma.$transaction([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: { patient: { select: { id: true, name: true, no_induk: true } } },
    }),
  ]);

  return { data, meta: { total, page, limit } };
};

export const getCaseById = async (id: string) => {
  const kasus = await prisma.case.findUnique({
    where: { id },
    include: {
      patient: true,
      images: {
        select: {
          id: true,
          original_filename: true,
          magnification: true,
          qc_status: true,
          qc_failure_reason: true,
          uploaded_at: true,
        },
      },
    },
  });

  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  return kasus;
};
