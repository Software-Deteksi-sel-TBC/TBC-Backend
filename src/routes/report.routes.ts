import express from "express";
import { Role } from "@prisma/client";
import * as reportController from "../controller/report.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { generateReportSchema } from "../validations/report.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Laporan klinis per kasus oleh DOKTER_PATOLOGI
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Generate laporan klinis dari kasus RESOLVED
 *     tags: [Reports]
 *     description: |
 *       Menghasilkan snapshot JSON seluruh data kasus (pasien, consensus, AI result,
 *       validasi per citra) dan menguploadnya ke storage. Tanda tangan digital dihitung
 *       otomatis saat generate — mengikat identitas patolog, isi snapshot, dan waktu
 *       pembuatan. Setiap pemanggilan selalu membuat laporan baru; laporan lama tetap
 *       tersimpan sebagai jejak historis.
 *
 *       Syarat: kasus harus berstatus RESOLVED dan sudah memiliki consensus.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [case_id]
 *             properties:
 *               case_id:
 *                 type: string
 *                 format: uuid
 *               pathologist_notes:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 2000
 *               diagnosis_summary:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Laporan berhasil dibuat dan langsung ditandatangani
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
 *                     file_path: { type: string }
 *                     is_signed: { type: boolean, example: true }
 *                     digital_signature: { type: string }
 *                     generated_at: { type: string, format: date-time }
 *                     signed_at: { type: string, format: date-time }
 *       400:
 *         description: Kasus belum RESOLVED atau belum ada consensus
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
  "/",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(generateReportSchema),
  reportController.generateReport
);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Ambil laporan beserta signed URL untuk download snapshot JSON
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID laporan
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Laporan berhasil diambil
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
 *                     is_signed: { type: boolean }
 *                     digital_signature: { type: string, nullable: true }
 *                     generated_at: { type: string, format: date-time }
 *                     signed_at: { type: string, format: date-time, nullable: true }
 *                     download_url: { type: string, description: "Signed URL ke snapshot JSON (berlaku 15 menit)" }
 *       404:
 *         description: Laporan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  reportController.getReport
);

export default router;
