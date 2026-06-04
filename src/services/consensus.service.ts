import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { type CreateConsensusInput } from "../validations/consensus.validation.js";

export const submitConsensus = async (
  caseId: string,
  commentatorId: string,
  data: CreateConsensusInput
) => {
  const kasus = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      consensus: true,
      images: {
        select: { id: true, validation: { select: { id: true } } },
      },
    },
  });

  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);

  await assertSameInstitution(commentatorId, kasus.created_by);

  // Validasi tambahan hanya saat pertama kali membuat consensus (belum ada sebelumnya)
  if (!kasus.consensus) {
    if (kasus.status === "PENDING_UPLOAD" || kasus.status === "AI_PROCESSING") {
      throw new AppError("Kasus belum siap untuk consensus", 400);
    }

    const unvalidatedImages = kasus.images.filter((img) => !img.validation);
    if (unvalidatedImages.length > 0) {
      throw new AppError(
        `${unvalidatedImages.length} citra belum divalidasi — selesaikan semua validasi terlebih dahulu`,
        400
      );
    }
  }

  // Upsert atomik: buat atau perbarui consensus + (opsional) transisi status case
  const [consensus] = await prisma.$transaction([
    prisma.consensus.upsert({
      where: { case_id: caseId },
      create: {
        case_id: caseId,
        commentator_id: commentatorId,
        severity: data.severity,
        comment: data.comment ?? null,
      },
      update: {
        commentator_id: commentatorId,
        severity: data.severity,
        comment: data.comment ?? null,
        submitted_at: new Date(),
      },
    }),
    ...(kasus.status === "PENDING_VALIDATION"
      ? [
          prisma.case.update({
            where: { id: caseId },
            data: { status: "RESOLVED", completed_at: new Date() },
          }),
        ]
      : []),
  ]);

  await writeAuditLog(commentatorId, "SUBMIT_CONSENSUS", "Consensus", consensus.id, {
    case_id: caseId,
  });
  return consensus;
};
