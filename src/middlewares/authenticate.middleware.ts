import { type Request, type Response, type NextFunction } from "express";
import { Role } from "@prisma/client";
import { type LoginTokenPayload } from "../types/auth.types.js";
import { verifyToken } from "../utils/jwt.utils.js";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ status: "error", message: "Token autentikasi tidak ditemukan" });
    return;
  }

  const token = authHeader.split(" ")[1]!;

  try {
    req.user = verifyToken<LoginTokenPayload>(token);
    next();
  } catch {
    res.status(401).json({ status: "error", message: "Token tidak valid atau kedaluwarsa" });
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ status: "error", message: "Anda tidak memiliki akses ke resource ini" });
      return;
    }
    next();
  };
