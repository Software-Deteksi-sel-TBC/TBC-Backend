import express from "express";
import { Role } from "@prisma/client";
import * as consensusController from "../controller/consensus.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createConsensusSchema } from "../validations/consensus.validation.js";

const router = express.Router();

router.post(
  "/:id/consensus",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(createConsensusSchema),
  consensusController.createConsensus
);

export default router;
