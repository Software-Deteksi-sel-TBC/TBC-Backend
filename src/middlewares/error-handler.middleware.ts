import { type Response } from "express";
import { AppError } from "../errors/app.error.js";

export const sendErrorResponse = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    status: "error",
    message: "Terjadi kesalahan internal",
  });
};
