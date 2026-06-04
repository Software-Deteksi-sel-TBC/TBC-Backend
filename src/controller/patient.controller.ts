import { type Request, type Response } from "express";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as patientService from "../services/patient.service.js";
import { type CreatePatientInput, type ListPatientInput, type UpdatePatientInput } from "../validations/patient.validation.js";

export const createPatient = async (req: Request, res: Response) => {
  try {
    const data = req.body as CreatePatientInput;
    const patient = await patientService.createPatient(data, req.user!.id);
    res.status(201).json({ status: "success", message: "Pasien berhasil didaftarkan", data: patient });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const listPatients = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as ListPatientInput;
    const result = await patientService.listPatients(query);
    res.status(200).json({ status: "success", message: "Data pasien berhasil diambil", ...result });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  try {
    const patient = await patientService.getPatientById(req.params.id as string);
    res.status(200).json({ status: "success", message: "Detail pasien berhasil diambil", data: patient });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  try {
    const data = req.body as UpdatePatientInput;
    const patient = await patientService.updatePatient(req.params.id as string, data, req.user!.id);
    res.status(200).json({ status: "success", message: "Data pasien berhasil diperbarui", data: patient });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
