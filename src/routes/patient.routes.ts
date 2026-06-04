import express from "express";
import { Role } from "@prisma/client";
import * as patientController from "../controller/patient.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPatientSchema, listPatientSchema, updatePatientSchema } from "../validations/patient.validation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Manajemen data pasien (OPERATOR_LAB)
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: List pasien dengan filter dan pagination
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Filter berdasarkan nama pasien
 *       - in: query
 *         name: no_induk
 *         schema: { type: string }
 *         description: Filter berdasarkan NIK
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List pasien berhasil diambil
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
 *                     $ref: '#/components/schemas/Patient'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", authenticate, authorize(Role.OPERATOR_LAB), validate(listPatientSchema, "query"), patientController.listPatients);

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Daftarkan pasien baru
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, no_induk, sex, age]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Budi Santoso
 *               no_induk:
 *                 type: string
 *                 description: NIK 16 digit angka
 *                 example: "3201010101010001"
 *               bpjs_number:
 *                 type: string
 *                 nullable: true
 *               sex:
 *                 $ref: '#/components/schemas/Sex'
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 example: 45
 *     responses:
 *       201:
 *         description: Pasien berhasil didaftarkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       409:
 *         description: NIK atau nomor BPJS sudah terdaftar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, authorize(Role.OPERATOR_LAB), validate(createPatientSchema), patientController.createPatient);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Detail pasien beserta riwayat kasus
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail pasien berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Patient'
 *                     - type: object
 *                       properties:
 *                         cases:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Case'
 *       404:
 *         description: Pasien tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authenticate, authorize(Role.OPERATOR_LAB), patientController.getPatientById);

/**
 * @swagger
 * /api/patients/{id}:
 *   patch:
 *     summary: Update data pasien
 *     tags: [Patients]
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
 *             properties:
 *               name: { type: string }
 *               no_induk: { type: string }
 *               bpjs_number: { type: string }
 *               sex:
 *                 $ref: '#/components/schemas/Sex'
 *               age: { type: integer }
 *     responses:
 *       200:
 *         description: Data pasien berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Pasien tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id", authenticate, authorize(Role.OPERATOR_LAB), validate(updatePatientSchema), patientController.updatePatient);

export default router;
