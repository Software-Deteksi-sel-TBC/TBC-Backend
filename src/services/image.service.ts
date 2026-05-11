import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";
import {
  buildFilePath,
  createPresignedUploadUrl,
  createSignedViewUrl,
  deleteFile,
} from "../utils/supabase-storage.utils.js";
import { type RequestPresignedUrlsInput, type ConfirmUploadInput } from "../validations/image.validation.js";

const STALE_PENDING_TTL_MS = 2 * 60 * 60 * 1000; // 2 jam

const cleanupStalePendingImages = async (caseId: string) => {
  const staleImages = await prisma.image.findMany({
    where: {
      case_id: caseId,
      qc_status: "PENDING",
      uploaded_at: { lt: new Date(Date.now() - STALE_PENDING_TTL_MS) },
    },
    select: { id: true, file_path: true },
  });

  if (staleImages.length === 0) return;

  await Promise.allSettled(staleImages.map((img) => deleteFile(img.file_path)));
  await prisma.image.deleteMany({
    where: { id: { in: staleImages.map((img) => img.id) } },
  });
};

export const requestPresignedUrls = async (
  caseId: string,
  operatorId: string,
  images: RequestPresignedUrlsInput["images"]
) => {
  const kasus = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  await assertSameInstitution(operatorId, kasus.created_by);
  if (kasus.status !== "PENDING_UPLOAD") {
    throw new AppError("Kasus tidak dalam status upload", 400);
  }

  await cleanupStalePendingImages(caseId);

  const results = await Promise.all(
    images.map(async (item) => {
      const imageId = crypto.randomUUID();
      const filePath = buildFilePath(caseId, imageId, item.original_filename);

      const [image, presignedUrl] = await Promise.all([
        prisma.image.create({
          data: {
            id: imageId,
            case_id: caseId,
            uploaded_by: operatorId,
            file_path: filePath,
            original_filename: item.original_filename,
            mime_type: item.mime_type,
            file_size_bytes: 0,
            magnification: item.magnification,
            staining: item.staining,
          },
        }),
        createPresignedUploadUrl(filePath),
      ]);

      return { image_id: image.id, presigned_url: presignedUrl, file_path: filePath };
    })
  );

  return results;
};

export const confirmUpload = async (caseId: string, operatorId: string, data: ConfirmUploadInput) => {
  const kasus = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  await assertSameInstitution(operatorId, kasus.created_by);

  const images = await prisma.image.findMany({
    where: { id: { in: data.image_ids }, case_id: caseId },
  });

  if (images.length !== data.image_ids.length) {
    throw new AppError("Satu atau lebih gambar tidak ditemukan untuk kasus ini", 400);
  }

  const pendingImages = images.filter((img) => img.qc_status === "PENDING");
  if (pendingImages.length === 0) {
    throw new AppError("Tidak ada gambar berstatus PENDING untuk dikonfirmasi", 400);
  }

  const pendingIds = pendingImages.map((img) => img.id);
  await prisma.image.updateMany({
    where: { id: { in: pendingIds }, case_id: caseId },
    data: { qc_status: "PASSED", checked_at: new Date() },
  });

  return prisma.image.findMany({
    where: { id: { in: data.image_ids } },
    orderBy: { uploaded_at: "asc" },
  });
};

export const listImagesForCase = async (
  caseId: string,
  requesterId: string,
  requesterRole: Role
) => {
  const kasus = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);

  if (requesterRole === Role.OPERATOR_LAB) {
    await assertSameInstitution(requesterId, kasus.created_by);
  } else if (requesterRole === Role.DOKTER_PATOLOGI) {
    if (kasus.status === "PENDING_UPLOAD") {
      throw new AppError("Kasus belum siap untuk direview", 403);
    }
  }

  const images = await prisma.image.findMany({
    where: { case_id: caseId },
    orderBy: { uploaded_at: "asc" },
  });

  return Promise.all(
    images.map(async (image) => ({
      id: image.id,
      original_filename: image.original_filename,
      magnification: image.magnification,
      qc_status: image.qc_status,
      qc_failure_reason: image.qc_failure_reason,
      view_url: image.file_path ? await createSignedViewUrl(image.file_path) : null,
    }))
  );
};

export const deleteImage = async (imageId: string, operatorId: string) => {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { case: true },
  });
  if (!image) throw new AppError("Gambar tidak ditemukan", 404);
  await assertSameInstitution(operatorId, image.case.created_by);

  await deleteFile(image.file_path);
  await prisma.image.delete({ where: { id: imageId } });
};

export const submitCase = async (caseId: string, operatorId: string) => {
  const kasus = await prisma.case.findUnique({
    where: { id: caseId },
    include: { images: true },
  });

  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  await assertSameInstitution(operatorId, kasus.created_by);
  if (kasus.status !== "PENDING_UPLOAD") {
    throw new AppError("Kasus sudah diproses sebelumnya", 409);
  }
  if (kasus.images.length === 0) {
    throw new AppError("Kasus belum memiliki gambar", 400);
  }

  const notPassed = kasus.images.filter((img) => img.qc_status !== "PASSED");
  if (notPassed.length > 0) {
    throw new AppError("Semua gambar harus lulus QC sebelum submit", 400);
  }

  return prisma.case.update({
    where: { id: caseId },
    data: { status: "PENDING_VALIDATION" },
  });
};
