import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as consensusService from "../services/consensus.service.js";
import { type CreateConsensusInput } from "../validations/consensus.validation.js";

export const createConsensus = async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateConsensusInput;
    const consensus = await consensusService.submitConsensus(
      req.params.id as string,
      req.user!.id,
      data
    );
    res.status(201).json({
      status: "success",
      message: "Consensus berhasil disimpan",
      data: consensus,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
