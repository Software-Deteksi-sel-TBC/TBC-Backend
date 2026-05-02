import jwt, { type SignOptions } from "jsonwebtoken";
import { AppError } from "../errors/app.error.js";

const getJwtSecret = (): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("Konfigurasi JWT belum tersedia", 500);
  }
  return jwtSecret;
};

export const generateToken = <TPayload extends object>(
  payload: TPayload,
  expiresIn: SignOptions["expiresIn"] = "1d"
): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyToken = <T>(token: string): T => {
  try {
    return jwt.verify(token, getJwtSecret()) as T;
  } catch {
    throw new AppError("Token tidak valid atau kedaluwarsa", 401);
  }
};