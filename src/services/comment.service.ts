import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";

export const DELETED_CONTENT = "pesan ini telah dihapus";

export const maskDeletedContent = (comment: { content: string; is_deleted: boolean }) =>
  comment.is_deleted ? { ...comment, content: DELETED_CONTENT } : comment;

export const deleteComment = async (commentId: string, requesterId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Komentar tidak ditemukan", 404);

  if (comment.is_deleted) throw new AppError("Komentar sudah dihapus", 409);

  if (comment.commentator_id !== requesterId) {
    throw new AppError("Akses ditolak: hanya penulis komentar yang dapat menghapusnya", 403);
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { is_deleted: true },
  });
};

export const addComment = async (imageId: string, commentatorId: string, content: string) => {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { case: true },
  });
  if (!image) throw new AppError("Gambar tidak ditemukan", 404);

  if (image.case.status !== "PENDING_VALIDATION") {
    throw new AppError("Kasus belum siap untuk direview", 400);
  }

  await assertSameInstitution(commentatorId, image.case.created_by);

  return prisma.comment.create({
    data: {
      image_id: imageId,
      commentator_id: commentatorId,
      content,
    },
  });
};
