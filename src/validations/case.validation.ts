import { z } from "zod";
import { CaseStatus } from "@prisma/client";

export const createCaseSchema = z.object({
  patient_id: z.string().uuid("ID pasien tidak valid"),
  notes: z.string().optional(),
});

export const listCaseSchema = z.object({
  status: z.nativeEnum(CaseStatus, { error: "Status kasus tidak valid" }).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCaseInput = z.infer<typeof listCaseSchema>;
