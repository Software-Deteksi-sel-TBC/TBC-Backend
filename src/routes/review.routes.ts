import express from "express";
import { Role } from "@prisma/client";
import * as reviewController from "../controller/review.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Review
 *   description: Antrian dan alur review citra oleh DOKTER_PATOLOGI
 */

/**
 * @swagger
 * /api/review/queue:
 *   get:
 *     summary: Antrian kasus PENDING_VALIDATION beserta progress validasi
 *     tags: [Review]
 *     responses:
 *       200:
 *         description: Antrian berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       status:
 *                         $ref: '#/components/schemas/CaseStatus'
 *                       created_at: { type: string, format: date-time }
 *                       patient:
 *                         type: object
 *                         properties:
 *                           name: { type: string }
 *                           no_induk: { type: string }
 *                       images_total: { type: integer }
 *                       images_validated: { type: integer }
 */
router.get(
  "/queue",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getReviewQueue
);

/**
 * @swagger
 * /api/review/resolved:
 *   get:
 *     summary: Daftar kasus selesai (RESOLVED) beserta nama patolog dan severity consensus
 *     tags: [Review]
 *     responses:
 *       200:
 *         description: Daftar kasus resolved berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       status:
 *                         $ref: '#/components/schemas/CaseStatus'
 *                       completed_at: { type: string, format: date-time, nullable: true }
 *                       patient:
 *                         type: object
 *                         properties:
 *                           name: { type: string }
 *                       consensus:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           severity:
 *                             $ref: '#/components/schemas/SeverityLevel'
 *                           commentator:
 *                             type: object
 *                             properties:
 *                               name: { type: string }
 */
router.get(
  "/resolved",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getResolvedQueue
);

/**
 * @swagger
 * /api/review/cases/{caseId}/images:
 *   get:
 *     summary: Daftar citra satu kasus beserta status validasi
 *     tags: [Review]
 *     description: Menampilkan kolom nama file, is_validated, global_severity (dari AI atau Validation), is_ai_uncertain, validated_by.
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List citra review berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       original_filename: { type: string }
 *                       is_validated: { type: boolean }
 *                       global_severity:
 *                         $ref: '#/components/schemas/SeverityLevel'
 *                       is_ai_uncertain: { type: boolean }
 *                       validated_by: { type: string, nullable: true }
 */
router.get(
  "/cases/:caseId/images",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reviewController.getCaseImages
);

/**
 * @swagger
 * /api/review/cases/{caseId}/images/{imageId}:
 *   get:
 *     summary: Detail lengkap satu citra — foto, AI result, validasi existing, dan thread komentar
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail citra berhasil diambil
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
 *                     original_filename: { type: string }
 *                     magnification:
 *                       $ref: '#/components/schemas/Magnification'
 *                     staining:
 *                       $ref: '#/components/schemas/Staining'
 *                     view_url: { type: string }
 *                     ai_result:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         global_severity:
 *                           $ref: '#/components/schemas/SeverityLevel'
 *                         is_uncertain: { type: boolean }
 *                         total_necrosis_percent: { type: number, nullable: true }
 *                         total_granuloma_percent: { type: number, nullable: true }
 *                         findings:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               finding_type: { type: string }
 *                               confidence_score: { type: number }
 *                               area_percent: { type: number, nullable: true }
 *                     validation:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         global_severity:
 *                           $ref: '#/components/schemas/SeverityLevel'
 *                         validation_comment: { type: string, nullable: true }
 *                     comments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           content: { type: string }
 *                           submitted_at: { type: string, format: date-time }
 *                           commentator:
 *                             type: object
 *                             properties:
 *                               name: { type: string }
 *       404:
 *         description: Citra tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/cases/:caseId/images/:imageId",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI, Role.OPERATOR_LAB),
  reviewController.getImageDetailForReview
);

export default router;
