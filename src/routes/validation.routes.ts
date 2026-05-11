import express from "express";
import { Role } from "@prisma/client";
import * as validationController from "../controller/validation.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { submitValidationSchema } from "../validations/validation.validation.js";

const router = express.Router();

router.post(
  "/:id/validate",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(submitValidationSchema),
  validationController.submitValidation
);

export default router;
