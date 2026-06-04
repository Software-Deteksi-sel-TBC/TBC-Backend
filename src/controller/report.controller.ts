import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as reportService from "../services/report.service.js";
import { type GenerateReportInput } from "../validations/report.validation.js";

export const generateReport = async (req: Request, res: Response) => {
  try {
    const data = req.body as GenerateReportInput;
    const report = await reportService.generateReport(req.user!.id, data);
    res.status(201).json({
      status: "success",
      message: "Laporan berhasil dibuat",
      data: report,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getReport = async (req: Request, res: Response) => {
  try {
    const report = await reportService.getReport(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: "success",
      message: "Laporan berhasil diambil",
      data: report,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const finalizeReport = async (req: Request, res: Response) => {
  try {
    const report = await reportService.finalizeReport(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: "success",
      message: "Laporan berhasil ditandatangani",
      data: report,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
