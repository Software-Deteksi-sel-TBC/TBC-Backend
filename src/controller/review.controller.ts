import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as reviewService from "../services/review.service.js";

export const getReviewQueue = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await reviewService.getReviewQueue(req.user!.id, page, limit);
    res.status(200).json({
      status: "success",
      message: "Antrian review berhasil diambil",
      data: result.data,
      meta: result.meta,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getCaseImages = async (req: Request, res: Response) => {
  try {
    const images = await reviewService.getCaseImages(
      req.params.caseId as string,
      req.user!.id
    );
    res.status(200).json({
      status: "success",
      message: "Daftar citra kasus berhasil diambil",
      data: images,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getResolvedQueue = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await reviewService.getResolvedQueue(req.user!.id, page, limit);
    res.status(200).json({
      status: "success",
      message: "Daftar kasus resolved berhasil diambil",
      data: result.data,
      meta: result.meta,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getImageDetailForReview = async (req: Request, res: Response) => {
  try {
    const image = await reviewService.getImageDetailForReview(
      req.params.caseId as string,
      req.params.imageId as string,
      req.user!.id,
      req.user!.role
    );
    res.status(200).json({
      status: "success",
      message: "Detail citra berhasil diambil",
      data: image,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
