import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { type SubmitValidationInput } from "../validations/validation.validation.js";

export const submitValidation = async (
  imageId: string,
  validatorId: string,
  data: SubmitValidationInput
) => {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { case: true },
  });
  if (!image) throw new AppError("Gambar tidak ditemukan", 404);

  await assertSameInstitution(validatorId, image.case.created_by);

  // Pisahkan validation_comment agar undefined → null (Prisma pakai exactOptionalPropertyTypes)
  const { validation_comment, ...coreData } = data;

  // Upsert: re-submit aman, validator_id di-update ke patolog terakhir
  const validation = await prisma.validation.upsert({
    where: { image_id: imageId },
    create: {
      image_id: imageId,
      validator_id: validatorId,
      ...coreData,
      validation_comment: validation_comment ?? null,
    },
    update: {
      validator_id: validatorId,
      ...coreData,
      validation_comment: validation_comment ?? null,
      submitted_at: new Date(),
    },
  });

  await writeAuditLog(validatorId, "SUBMIT_VALIDATION", "Validation", validation.id, {
    image_id: imageId,
  });
  return validation;
};
