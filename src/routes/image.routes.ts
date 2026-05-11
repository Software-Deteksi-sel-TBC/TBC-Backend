import express from "express";
import { Role } from "@prisma/client";
import * as imageController from "../controller/image.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  requestPresignedUrlsSchema,
  confirmUploadSchema,
} from "../validations/image.validation.js";

// Mount di /api/cases/:id — mergeParams agar req.params.id (caseId) tersedia
export const caseImageRouter = express.Router({ mergeParams: true });

caseImageRouter.post(
  "/images/presigned-urls",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  validate(requestPresignedUrlsSchema),
  imageController.requestPresignedUrls
);

caseImageRouter.post(
  "/images/confirm",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  validate(confirmUploadSchema),
  imageController.confirmUpload
);

caseImageRouter.get(
  "/images",
  authenticate,
  authorize(Role.OPERATOR_LAB, Role.DOKTER_PATOLOGI),
  imageController.listImages
);

caseImageRouter.post(
  "/submit",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  imageController.submitCase
);

// Mount di /api/images
export const standaloneImageRouter = express.Router();

standaloneImageRouter.delete(
  "/:id",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  imageController.deleteImage
);
