import express from "express";
import { Role } from "@prisma/client";
import * as commentController from "../controller/comment.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { addCommentSchema } from "../validations/comment.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Diskusi per citra antar patolog
 */

/**
 * @swagger
 * /api/images/{id}/comments:
 *   post:
 *     summary: Tambah komentar diskusi pada satu citra
 *     tags: [Comments]
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Terlihat adanya nekrosis kaseosa yang signifikan pada area ini.
 *     responses:
 *       201:
 *         description: Komentar berhasil ditambahkan
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
 *                     content: { type: string }
 *                     submitted_at: { type: string, format: date-time }
 *       404:
 *         description: Citra tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/comments",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(addCommentSchema),
  commentController.addComment
);

/**
 * @swagger
 * /api/images/comments/{id}:
 *   delete:
 *     summary: Soft-delete komentar (konten di-mask, bukan dihapus dari DB)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID komentar
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Komentar berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Tidak berhak menghapus komentar orang lain
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Komentar tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/comments/:id",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  commentController.deleteComment
);

export default router;
