import express from 'express';
import * as authController from '../controller/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateCredentialSchema,
} from '../validations/auth.validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autentikasi dan manajemen kredensial
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login dan dapatkan JWT token
 *     tags: [Auth]
 *     security: []
 *     description: |
 *       Akun yang tersedia dari seed (semua password: `password123`):
 *       - `admin@rumahsakit.com` — ADMIN_AI (is_first_login: false)
 *       - `operator@rumahsakit.com` — OPERATOR_LAB (is_first_login: true)
 *       - `dr.budi@rumahsakit.com` — DOKTER_PATOLOGI (is_first_login: true)
 *       - `dr.siti@rumahsakit.com` — DOKTER_PATOLOGI (is_first_login: true)
 *
 *       Akun dengan `is_first_login: true` tetap mengembalikan token, tetapi wajib
 *       ganti password lewat `/api/auth/update-credentials` sebelum dipakai normal.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: operator@rumahsakit.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login berhasil
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
 *                     token: { type: string }
 *                     is_first_login: { type: boolean }
 *       401:
 *         description: Email atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/update-credentials:
 *   post:
 *     summary: Ganti password saat first login
 *     tags: [Auth]
 *     security: []
 *     description: Hanya berlaku saat `is_first_login = true`. Setelah berhasil, user harus login ulang.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, currentPassword, newPassword, confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: operator@rumahsakit.com
 *               currentPassword:
 *                 type: string
 *                 example: password123
 *               newPassword:
 *                 type: string
 *                 description: Minimal 8 karakter, harus kombinasi huruf & angka
 *                 example: passwordBaru123
 *               confirmPassword:
 *                 type: string
 *                 example: passwordBaru123
 *     responses:
 *       200:
 *         description: Password berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validasi gagal atau user bukan first-login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/update-credentials', validate(updateCredentialSchema), authController.updateCredential);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Generate token reset password
 *     tags: [Auth]
 *     security: []
 *     description: Token dikembalikan langsung di response (tidak dikirim via email SMTP).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dr.budi@rumahsakit.com
 *     responses:
 *       200:
 *         description: Token berhasil digenerate
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
 *                     reset_token: { type: string }
 *       404:
 *         description: Email tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password menggunakan token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token dari endpoint forgot-password
 *               newPassword:
 *                 type: string
 *                 description: Minimal 8 karakter, harus kombinasi huruf & angka
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Token tidak valid atau kadaluarsa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
