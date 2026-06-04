import rateLimit from "express-rate-limit";

const rateLimitResponse = (_req: unknown, res: unknown, _next: unknown, options: { message: string }) => {
  (res as import("express").Response).status(429).json({
    status: "error",
    message: options.message,
  });
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Terlalu banyak permintaan, coba lagi dalam 15 menit",
  handler: rateLimitResponse,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Terlalu banyak percobaan login, coba lagi dalam 15 menit",
  handler: rateLimitResponse,
});
