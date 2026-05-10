import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as caseService from "../services/case.service.js";
import { type CreateCaseInput, type ListCaseInput } from "../validations/case.validation.js";

export const createCase = async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateCaseInput;
    const kasus = await caseService.createCase(data, req.user!.id);
    res.status(201).json({ status: "success", message: "Kasus berhasil dibuat", data: kasus });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const listCases = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as ListCaseInput;
    const result = await caseService.listCases(query);
    res.status(200).json({ status: "success", message: "Data kasus berhasil diambil", ...result });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const kasus = await caseService.getCaseById(req.params.id as string);
    res.status(200).json({ status: "success", message: "Detail kasus berhasil diambil", data: kasus });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
