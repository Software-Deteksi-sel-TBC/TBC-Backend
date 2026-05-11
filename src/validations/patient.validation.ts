import { z } from "zod";
import { Sex } from "@prisma/client";

export const createPatientSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong"),
  no_induk: z
    .string()
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK harus berupa angka"),
  bpjs_number: z.string().optional(),
  sex: z.nativeEnum(Sex, { error: "Jenis kelamin tidak valid" }),
  age: z
    .number({ error: "Umur harus berupa angka" })
    .int("Umur harus berupa bilangan bulat")
    .min(0, "Umur tidak valid")
    .max(200, "Umur tidak valid"),
});

export const listPatientSchema = z.object({
  name: z.string().optional(),
  no_induk: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type ListPatientInput = z.infer<typeof listPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
