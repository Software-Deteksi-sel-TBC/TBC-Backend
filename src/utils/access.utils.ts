import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";

/**
 * Verifikasi dua user berada di institusi yang sama.
 * Lempar AppError 403 jika salah satu institusi null atau institusinya berbeda.
 */
export const assertSameInstitution = async (userAId: string, userBId: string) => {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId }, select: { institution: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { institution: true } }),
  ]);

  if (!userA?.institution || !userB?.institution) {
    throw new AppError("Akses ditolak: institusi tidak terdaftar", 403);
  }
  if (userA.institution !== userB.institution) {
    throw new AppError("Akses ditolak: resource milik institusi lain", 403);
  }
};
