import { z } from "zod";
import { SeverityLevel } from "@prisma/client";

export const createConsensusSchema = z.object({
  severity: z.nativeEnum(SeverityLevel, { error: "Nilai severity tidak valid" }),
  comment: z
    .string()
    .max(2000, "Komentar terlalu panjang (maks. 2000 karakter)")
    .optional(),
});

export type CreateConsensusInput = z.infer<typeof createConsensusSchema>;
