import { z } from "zod";
import { SeverityLevel, HpfCountLevel } from "@prisma/client";

export const submitValidationSchema = z.object({
  global_severity: z.nativeEnum(SeverityLevel, { error: "Nilai global_severity tidak valid" }),
  necrosis_severity: z.nativeEnum(SeverityLevel, { error: "Nilai necrosis_severity tidak valid" }),
  granuloma_severity: z.nativeEnum(SeverityLevel, { error: "Nilai granuloma_severity tidak valid" }),
  datia_count_level: z.nativeEnum(HpfCountLevel, { error: "Nilai datia_count_level tidak valid" }),
  epithelioid_count_level: z.nativeEnum(HpfCountLevel, { error: "Nilai epithelioid_count_level tidak valid" }),
  validation_comment: z
    .string()
    .max(2000, "Komentar terlalu panjang (maks. 2000 karakter)")
    .optional(),
});

export type SubmitValidationInput = z.infer<typeof submitValidationSchema>;
