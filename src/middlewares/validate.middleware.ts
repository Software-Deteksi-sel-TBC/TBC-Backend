import { type Request, type Response, type NextFunction } from "express";
import { type ZodTypeAny, ZodError } from "zod";

export const validate =
  <TSchema extends ZodTypeAny>(schema: TSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        res.status(400).json({
          status: "error",
          message: firstIssue?.message ?? "Payload tidak valid",
        });
        return;
      }

      res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan internal saat validasi request",
      });
    }
  };
