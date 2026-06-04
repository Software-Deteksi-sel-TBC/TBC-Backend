import express from "express";
import { Role } from "@prisma/client";
import * as validationController from "../controller/validation.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { submitValidationSchema } from "../validations/validation.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Validations
 *   description: Validasi prediksi AI oleh DOKTER_PATOLOGI
 */

/**
 * @swagger
 * /api/images/{id}/validate:
 *   post:
 *     summary: Submit atau revisi Validation per citra (upsert)
 *     tags: [Validations]
 *     description: Relasi 1:1 dengan Image. Submit ulang akan menimpa validasi sebelumnya.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID citra
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [global_severity, necrosis_severity, granuloma_severity, datia_count_level, epithelioid_count_level]
 *             properties:
 *               global_severity:
 *                 $ref: '#/components/schemas/SeverityLevel'
 *               necrosis_severity:
 *                 $ref: '#/components/schemas/SeverityLevel'
 *               granuloma_severity:
 *                 $ref: '#/components/schemas/SeverityLevel'
 *               datia_count_level:
 *                 $ref: '#/components/schemas/HpfCountLevel'
 *               epithelioid_count_level:
 *                 $ref: '#/components/schemas/HpfCountLevel'
 *               validation_comment:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 2000
 *                 example: AI overestimated necrosis area
 *     responses:
 *       200:
 *         description: Validasi berhasil disimpan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     image_id: { type: string, format: uuid }
 *                     global_severity:
 *                       $ref: '#/components/schemas/SeverityLevel'
 *                     submitted_at: { type: string, format: date-time }
 *       404:
 *         description: Citra tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/validate",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(submitValidationSchema),
  validationController.submitValidation
);

export default router;
