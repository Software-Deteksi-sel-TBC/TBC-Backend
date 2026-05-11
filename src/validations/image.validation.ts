import { z } from "zod";
import { Magnification, Staining } from "@prisma/client";

const ALLOWED_MIME_TYPES = ["image/tiff", "image/jpeg", "image/png", "image/jpg"];

export const requestPresignedUrlsSchema = z.object({
  images: z
    .array(
      z.object({
        original_filename: z
          .string()
          .min(1, "Nama file wajib diisi")
          .max(255, "Nama file terlalu panjang (maks. 255 karakter)")
          .regex(
            /^[\w\-. ]+$/,
            "Nama file hanya boleh mengandung huruf, angka, spasi, underscore, dash, atau titik"
          ),
        mime_type: z
          .string()
          .transform((val) => val.toLowerCase())
          .refine(
            (val) => ALLOWED_MIME_TYPES.includes(val),
            `MIME type tidak valid — hanya diizinkan: ${ALLOWED_MIME_TYPES.join(", ")}`
          ),
        magnification: z.nativeEnum(Magnification, { error: "Nilai magnifikasi tidak valid" }),
        staining: z.nativeEnum(Staining, { error: "Nilai staining tidak valid" }).default("HE"),
      })
    )
    .min(1, "Minimal 1 gambar harus diunggah")
    .max(20, "Maksimal 20 gambar per batch"),
});

export const confirmUploadSchema = z.object({
  image_ids: z
    .array(z.string().uuid("ID gambar tidak valid"))
    .min(1, "Minimal 1 ID gambar wajib diisi")
    .max(20, "Maksimal 20 ID gambar per konfirmasi"),
});

export type RequestPresignedUrlsInput = z.infer<typeof requestPresignedUrlsSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
