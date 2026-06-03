import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";
import { getPaginationParams } from "../utils/pagination.utils.js";
import { storage } from "./storage/index.js";
import { maskDeletedContent } from "./comment.service.js";

export const getReviewQueue = async (patologId: string, page?: string, limit?: string) => {
  const { skip, take, page: p, limit: l } = getPaginationParams(page, limit);

  // Filter case by institusi patolog
  const patolog = await prisma.user.findUnique({
    where: { id: patologId },
    select: { institution: true },
  });
  if (!patolog?.institution) {
    throw new AppError("Akses ditolak: institusi tidak terdaftar", 403);
  }

  const where = {
    status: "PENDING_VALIDATION" as const,
    user: { institution: patolog.institution },
  };

  const [total, data] = await prisma.$transaction([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        patient: { select: { id: true, name: true, no_induk: true } },
        images: {
          where: { qc_status: "PASSED" },
          select: {
            id: true,
            original_filename: true,
            magnification: true,
            validation: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  // Tambahkan ringkasan progress validasi per case
  const enriched = data.map((kasus) => ({
    ...kasus,
    images_total: kasus.images.length,
    images_validated: kasus.images.filter((img) => img.validation).length,
  }));

  return { data: enriched, meta: { total, page: p, limit: l } };
};

export const getCaseImages = async (caseId: string, patologId: string) => {
  const kasus = await prisma.case.findUnique({
    where: { id: caseId },
    select: { status: true, created_by: true },
  });

  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  if (kasus.status === "PENDING_UPLOAD") {
    throw new AppError("Kasus belum siap untuk direview", 403);
  }

  await assertSameInstitution(patologId, kasus.created_by);

  const images = await prisma.image.findMany({
    where: { case_id: caseId, qc_status: "PASSED" },
    orderBy: { uploaded_at: "asc" },
    select: {
      id: true,
      original_filename: true,
      magnification: true,
      ai_result: {
        select: { global_severity: true, is_uncertain: true },
      },
      validation: {
        select: {
          global_severity: true,
          validator: { select: { name: true } },
        },
      },
    },
  });

  return images.map((img) => ({
    id: img.id,
    original_filename: img.original_filename,
    magnification: img.magnification,
    is_validated: img.validation !== null,
    global_severity: img.validation?.global_severity ?? img.ai_result?.global_severity ?? null,
    is_ai_uncertain: img.validation ? null : (img.ai_result?.is_uncertain ?? null),
    validated_by: img.validation?.validator.name ?? null,
  }));
};

export const getResolvedQueue = async (patologId: string, page?: string, limit?: string) => {
  const { skip, take, page: p, limit: l } = getPaginationParams(page, limit);

  const patolog = await prisma.user.findUnique({
    where: { id: patologId },
    select: { institution: true },
  });
  if (!patolog?.institution) {
    throw new AppError("Akses ditolak: institusi tidak terdaftar", 403);
  }

  const where = {
    status: "RESOLVED" as const,
    user: { institution: patolog.institution },
  };

  const [total, data] = await prisma.$transaction([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { completed_at: "desc" },
      include: {
        patient: { select: { name: true } },
        consensus: {
          select: {
            severity: true,
            user: { select: { name: true } },
          },
        },
        images: {
          where: { qc_status: "PASSED" },
          select: { id: true },
        },
      },
    }),
  ]);

  return { data, meta: { total, page: p, limit: l } };
};

export const getImageDetailForReview = async (
  caseId: string,
  imageId: string,
  requesterId: string,
  requesterRole: Role
) => {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: {
      case: true,
      ai_result: { include: { findings: true } },
      validation: true,
      comments: {
        orderBy: { submitted_at: "asc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!image) throw new AppError("Gambar tidak ditemukan", 404);
  if (image.case_id !== caseId) {
    throw new AppError("Gambar tidak terkait dengan kasus ini", 400);
  }

  // Auth: same institution untuk OPERATOR_LAB dan DOKTER_PATOLOGI
  if (requesterRole === Role.OPERATOR_LAB || requesterRole === Role.DOKTER_PATOLOGI) {
    await assertSameInstitution(requesterId, image.case.created_by);
  }

  // Patolog tidak boleh akses case yang masih PENDING_UPLOAD
  if (requesterRole === Role.DOKTER_PATOLOGI && image.case.status === "PENDING_UPLOAD") {
    throw new AppError("Kasus belum siap untuk direview", 403);
  }

  const view_url = image.file_path ? await storage.createSignedViewUrl(image.file_path) : null;

  return {
    ...image,
    comments: image.comments.map(maskDeletedContent),
    view_url,
  };
};
