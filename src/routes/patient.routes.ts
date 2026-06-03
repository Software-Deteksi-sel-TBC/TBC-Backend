import express from "express";
import { Role } from "@prisma/client";
import * as patientController from "../controller/patient.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPatientSchema, listPatientSchema, updatePatientSchema } from "../validations/patient.validation.js";

const router = express.Router();

router.get("/", authenticate, authorize(Role.OPERATOR_LAB), validate(listPatientSchema, "query"), patientController.listPatients);
router.post("/", authenticate, authorize(Role.OPERATOR_LAB), validate(createPatientSchema), patientController.createPatient);
router.get("/:id", authenticate, authorize(Role.OPERATOR_LAB), patientController.getPatientById);
router.patch("/:id", authenticate, authorize(Role.OPERATOR_LAB), validate(updatePatientSchema), patientController.updatePatient);

export default router;
