import express from "express";
import { Role } from "@prisma/client";
import * as caseController from "../controller/case.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCaseSchema, listCaseSchema } from "../validations/case.validation.js";

const router = express.Router();

router.get("/", authenticate, authorize(Role.OPERATOR_LAB), validate(listCaseSchema, "query"), caseController.listCases);
router.post("/", authenticate, authorize(Role.OPERATOR_LAB), validate(createCaseSchema), caseController.createCase);
router.get("/:id", authenticate, authorize(Role.OPERATOR_LAB, Role.DOKTER_PATOLOGI), caseController.getCaseById);

export default router;
