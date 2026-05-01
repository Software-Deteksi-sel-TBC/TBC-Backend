import { z } from "zod";

const emailSchema = z.email("Format email tidak valid").trim().toLowerCase();

const passwordSchema = z.string().min(1, "Password wajib diisi");

const newPasswordSchema = z
  .string()
  .min(8, "Password baru minimal 8 karakter");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const updateCredentialSchema = z.object({
  email: emailSchema,
  currentPassword: passwordSchema,
  newPassword: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token wajib diisi"),
  newPassword: newPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
