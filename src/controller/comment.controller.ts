import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as commentService from "../services/comment.service.js";
import { type AddCommentInput } from "../validations/comment.validation.js";

export const deleteComment = async (req: Request, res: Response) => {
  try {
    await commentService.deleteComment(req.params.id as string, req.user!.id);
    res.status(200).json({ status: "success", message: "Komentar berhasil dihapus" });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { content } = req.body as AddCommentInput;
    const comment = await commentService.addComment(req.params.id as string, req.user!.id, content);
    res.status(201).json({
      status: "success",
      message: "Komentar berhasil ditambahkan",
      data: comment,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
