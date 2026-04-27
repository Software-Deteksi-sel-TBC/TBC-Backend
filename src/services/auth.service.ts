import { PrismaClient } from "@prisma/client";
import { comparePassword, hashPassword } from "../utils/hash.utils.js";
import { generateToken, verifyToken } from "../utils/jwt.utils.js";

const prisma = new PrismaClient();

export const loginUser = async (email: string, password_input: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("Email tidak ditemukan");
  }

  // Panggil pengecekan hash dari utils
  const isMatch = await comparePassword(password_input, user.password_hash);
  if (!isMatch) {
    throw new Error("Password salah");
  }

  // Generate token jadi lebih rapi
  const token = generateToken(
    { id: user.id, role: user.role, is_first_login: user.is_first_login },
    "1d"
  );

  return { user, token };
};

export const setupNewPassword = async (token: string, newPassword: string) => {
  // Verifikasi token dengan utils.
  const decoded = verifyToken(token) as { id: string };

  // Hash password baru dengan utils
  const hashedPassword = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: decoded.id },
    data: {
      password_hash: hashedPassword,
      is_first_login: false,
    },
  });

  return updatedUser;
};