import { type Role } from "@prisma/client";

export interface LoginTokenPayload {
  id: string;
  role: Role;
  is_first_login: boolean;
}

export const RESET_PASSWORD_PURPOSE = "reset_password" as const;

export interface PasswordResetTokenPayload {
  id: string;
  purpose: typeof RESET_PASSWORD_PURPOSE;
}
