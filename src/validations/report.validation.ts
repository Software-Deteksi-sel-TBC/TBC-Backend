import { z } from "zod";

export const generateReportSchema = z.object({
  case_id: z.string().uuid("Format case_id tidak valid"),
  pathologist_notes: z.string().max(2000, "Catatan patolog terlalu panjang (maks. 2000 karakter)").optional(),
  diagnosis_summary: z.string().max(2000, "Ringkasan diagnosis terlalu panjang (maks. 2000 karakter)").optional(),
});

export const finalizeReportSchema = z.object({});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type FinalizeReportInput = z.infer<typeof finalizeReportSchema>;