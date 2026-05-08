import { AppError } from "../errors/app.error.js";
import {
  type LoginTokenPayload,
  type PasswordResetTokenPayload,
  RESET_PASSWORD_PURPOSE,
} from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { comparePassword, hashPassword } from "../utils/hash.utils.js";
import { generateToken, verifyToken } from "../utils/jwt.utils.js";

export const loginUser = async (email: string, passwordInput: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.is_active || !(await comparePassword(passwordInput, user.password_hash))) {
    throw new AppError("Email atau password tidak valid", 401);
  }

  const payload: LoginTokenPayload = {
    id: user.id,
    role: user.role,
    is_first_login: user.is_first_login,
  };

  const token = generateToken(payload, "1d");

  return { user, token };
};

export const updateCredential = async (
  email: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("Email atau password tidak valid", 401);
  }

  if (!user.is_first_login) {
    throw new AppError("Akun ini tidak memerlukan update credential awal", 400);
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError("Email atau password tidak valid", 401);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("Konfirmasi password tidak cocok", 400);
  }

  if (await comparePassword(newPassword, user.password_hash)) {
    throw new AppError("Password baru tidak boleh sama dengan password saat ini", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
      is_first_login: false,
    },
  });

  return updatedUser;
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  const payload: PasswordResetTokenPayload = {
    id: user.id,
    purpose: RESET_PASSWORD_PURPOSE,
  };

  const resetToken = generateToken(payload, "15m");
  console.log(`Reset token untuk ${email}: ${resetToken}`);
};

export const resetPassword = async (token: string, newPassword: string) => {
  const decoded = verifyToken<PasswordResetTokenPayload>(token);

  if (decoded.purpose !== RESET_PASSWORD_PURPOSE) {
    throw new AppError("Token reset password tidak valid", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) {
    throw new AppError("Token reset password tidak valid", 401);
  }

  if (await comparePassword(newPassword, user.password_hash)) {
    throw new AppError("Password baru tidak boleh sama dengan password saat ini", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: decoded.id },
    data: { password_hash: hashedPassword },
  });
};