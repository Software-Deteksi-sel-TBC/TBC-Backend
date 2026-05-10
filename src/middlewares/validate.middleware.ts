import { type Request, type Response, type NextFunction } from "express";
import { type ZodType, z } from "zod";

export const validate =
  <TSchema extends ZodType>(schema: TSchema, source: "body" | "query" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "body") {
        req.body = parsed;
      } else {
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
        });
      }
      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
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
