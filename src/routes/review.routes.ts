import express from "express";
import { Role } from "@prisma/client";
import * as reviewController from "../controller/review.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";

const router = express.Router();

router.get(
  "/queue",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getReviewQueue
);

router.get(
  "/resolved",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getResolvedQueue
);

router.get(
  "/cases/:caseId/images",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getCaseImages
);

router.get(
  "/cases/:caseId/images/:imageId",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI, Role.OPERATOR_LAB),
  reviewController.getImageDetailForReview
);

export default router;
