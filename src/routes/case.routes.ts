import express from "express";
import { Role } from "@prisma/client";
import * as caseController from "../controller/case.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCaseSchema, listCaseSchema } from "../validations/case.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cases
 *   description: Manajemen kasus histopatologi
 */

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: List kasus dengan filter status, tanggal, dan pagination
 *     tags: [Cases]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/CaseStatus'
 *         description: Filter berdasarkan status kasus
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *         description: Filter kasus mulai tanggal ini
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *         description: Filter kasus sampai tanggal ini
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List kasus berhasil diambil
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
 *                     $ref: '#/components/schemas/Case'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", authenticate, authorize(Role.OPERATOR_LAB), validate(listCaseSchema, "query"), caseController.listCases);

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Buat kasus baru untuk pasien yang sudah terdaftar
 *     tags: [Cases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id]
 *             properties:
 *               patient_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Kasus berhasil dibuat (status PENDING_UPLOAD)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Case'
 *       404:
 *         description: Pasien tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, authorize(Role.OPERATOR_LAB), validate(createCaseSchema), caseController.createCase);

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Detail kasus beserta daftar citra dan status QC
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail kasus berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Case'
 *                     - type: object
 *                       properties:
 *                         patient:
 *                           $ref: '#/components/schemas/Patient'
 *                         images:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Image'
 *       404:
 *         description: Kasus tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authenticate, authorize(Role.OPERATOR_LAB, Role.DOKTER_PATOLOGI), caseController.getCaseById);

export default router;
