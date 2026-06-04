import express from "express";
import { Role } from "@prisma/client";
import * as consensusController from "../controller/consensus.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createConsensusSchema } from "../validations/consensus.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Consensus
 *   description: Consensus akhir per kasus oleh DOKTER_PATOLOGI
 */

/**
 * @swagger
 * /api/cases/{id}/consensus:
 *   post:
 *     summary: Buat atau revisi Consensus untuk kasus (upsert) → Case otomatis RESOLVED
 *     tags: [Consensus]
 *     description: |
 *       Relasi 1:1 dengan Case. Submit ulang akan menimpa consensus sebelumnya.
 *       Semua citra milik kasus harus sudah tervalidasi sebelum consensus bisa dibuat.
 *       Membuat consensus pertama kali secara atomik mengubah Case.status → RESOLVED.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID kasus
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [severity]
 *             properties:
 *               severity:
 *                 $ref: '#/components/schemas/SeverityLevel'
 *               comment:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Consensus berhasil disimpan dan kasus menjadi RESOLVED
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
 *                     case_id: { type: string, format: uuid }
 *                     severity:
 *                       $ref: '#/components/schemas/SeverityLevel'
 *                     submitted_at: { type: string, format: date-time }
 *       400:
 *         description: Masih ada citra yang belum divalidasi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kasus tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/consensus",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(createConsensusSchema),
  consensusController.createConsensus
);

export default router;
