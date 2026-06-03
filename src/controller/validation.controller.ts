import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as validationService from "../services/validation.service.js";
import { type SubmitValidationInput } from "../validations/validation.validation.js";

export const submitValidation = async (req: Request, res: Response) => {
  try {
    const data = req.body as SubmitValidationInput;
    const validation = await validationService.submitValidation(
      req.params.id as string,
      req.user!.id,
      data
    );
    res.status(201).json({
      status: "success",
      message: "Validasi berhasil disubmit",
      data: validation,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
