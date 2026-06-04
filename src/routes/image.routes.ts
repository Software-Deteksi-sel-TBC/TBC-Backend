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

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Upload dan manajemen citra histopatologi
 */

/**
 * @swagger
 * /api/cases/{id}/images/presigned-urls:
 *   post:
 *     summary: Buat Image records dan dapatkan presigned URLs untuk upload langsung ke storage
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID kasus (harus berstatus PENDING_UPLOAD)
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required: [original_filename, mime_type, magnification]
 *                   properties:
 *                     original_filename:
 *                       type: string
 *                       example: sample_40x.tiff
 *                     mime_type:
 *                       type: string
 *                       enum: [image/tiff, image/jpeg, image/png, image/jpg]
 *                     magnification:
 *                       $ref: '#/components/schemas/Magnification'
 *                     staining:
 *                       $ref: '#/components/schemas/Staining'
 *     responses:
 *       201:
 *         description: Presigned URLs berhasil dibuat
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
 *                       image_id: { type: string, format: uuid }
 *                       presigned_url: { type: string }
 *                       file_path: { type: string }
 *       400:
 *         description: Kasus tidak dalam status PENDING_UPLOAD
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
caseImageRouter.post(
  "/images/presigned-urls",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  validate(requestPresignedUrlsSchema),
  imageController.requestPresignedUrls
);

/**
 * @swagger
 * /api/cases/{id}/images/confirm:
 *   post:
 *     summary: Konfirmasi upload selesai dan jalankan QC per citra
 *     tags: [Images]
 *     description: Setelah upload ke presigned URL selesai, panggil endpoint ini untuk menjalankan QC. Saat ini QC di-mock — semua citra otomatis PASSED.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_ids]
 *             properties:
 *               image_ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: QC selesai dijalankan
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
 *                       qc_status:
 *                         $ref: '#/components/schemas/QcStatus'
 *                       qc_failure_reason:
 *                         $ref: '#/components/schemas/QcFailureReason'
 *                       checked_at: { type: string, format: date-time }
 */
caseImageRouter.post(
  "/images/confirm",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  validate(confirmUploadSchema),
  imageController.confirmUpload
);

/**
 * @swagger
 * /api/cases/{id}/images:
 *   get:
 *     summary: List citra untuk ditampilkan di tabel review operator
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List citra berhasil diambil
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
 *                     $ref: '#/components/schemas/Image'
 */
caseImageRouter.get(
  "/images",
  authenticate,
  authorize(Role.OPERATOR_LAB, Role.DOKTER_PATOLOGI),
  imageController.listImages
);

/**
 * @swagger
 * /api/cases/{id}/submit:
 *   post:
 *     summary: Submit semua citra ke antrian review patolog
 *     tags: [Cases]
 *     description: Semua citra milik kasus harus berstatus PASSED. Berhasil → Case.status menjadi PENDING_VALIDATION.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Kasus berhasil disubmit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Masih ada citra berstatus PENDING atau FAILED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
caseImageRouter.post(
  "/submit",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  imageController.submitCase
);

// Mount di /api/images
export const standaloneImageRouter = express.Router();

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Hapus citra secara manual (DB + Storage)
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Gambar berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Gambar tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
standaloneImageRouter.delete(
  "/:id",
  authenticate,
  authorize(Role.OPERATOR_LAB),
  imageController.deleteImage
);
