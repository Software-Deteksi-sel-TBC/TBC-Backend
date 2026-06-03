import { z } from "zod";

export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Komentar tidak boleh kosong")
    .max(2000, "Komentar terlalu panjang (maks. 2000 karakter)"),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
