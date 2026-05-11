import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as imageService from "../services/image.service.js";
import {
  type RequestPresignedUrlsInput,
  type ConfirmUploadInput,
} from "../validations/image.validation.js";

export const requestPresignedUrls = async (req: Request, res: Response) => {
  try {
    const data = req.body as RequestPresignedUrlsInput;
    const result = await imageService.requestPresignedUrls(
      req.params.id as string,
      req.user!.id,
      data.images
    );
    res.status(201).json({
      status: "success",
      message: "Presigned URL berhasil dibuat",
      data: result,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const data = req.body as ConfirmUploadInput;
    const images = await imageService.confirmUpload(req.params.id as string, req.user!.id, data);
    res.status(200).json({
      status: "success",
      message: "Upload dikonfirmasi, QC selesai dijalankan",
      data: images,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const listImages = async (req: Request, res: Response) => {
  try {
    const images = await imageService.listImagesForCase(req.params.id as string, req.user!.id, req.user!.role);
    res.status(200).json({
      status: "success",
      message: "Data gambar berhasil diambil",
      data: images,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    await imageService.deleteImage(req.params.id as string, req.user!.id);
    res.status(200).json({ status: "success", message: "Gambar berhasil dihapus" });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const submitCase = async (req: Request, res: Response) => {
  try {
    const kasus = await imageService.submitCase(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: "success",
      message: "Kasus berhasil disubmit ke antrian patolog",
      data: kasus,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
