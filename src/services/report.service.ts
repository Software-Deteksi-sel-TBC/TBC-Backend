import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app.error.js";
import { assertSameInstitution } from "../utils/access.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { storage } from "./storage/index.js";
import { type GenerateReportInput } from "../validations/report.validation.js";

const buildReportFilePath = (caseId: string, reportId: string) =>
  `cases/${caseId}/reports/${reportId}.json`;

export const generateReport = async (
  patologId: string,
  data: GenerateReportInput
) => {
  const { case_id, pathologist_notes, diagnosis_summary } = data;

  const kasus = await prisma.case.findUnique({
    where: { id: case_id },
    include: {
      patient: true,
      consensus: { include: { user: { select: { id: true, name: true } } } },
      images: {
        where: { qc_status: "PASSED" },
        orderBy: { uploaded_at: "asc" },
        include: {
          ai_result: { include: { findings: true } },
          validation: true,
        },
      },
    },
  });

  if (!kasus) throw new AppError("Kasus tidak ditemukan", 404);
  await assertSameInstitution(patologId, kasus.created_by);

  if (kasus.status !== "RESOLVED" || !kasus.consensus) {
    throw new AppError("Kasus belum di-resolve atau belum ada consensus", 400);
  }

  // Periksa laporan lama untuk kasus ini
  const existingReport = await prisma.report.findFirst({ where: { case_id } });
  if (existingReport?.is_signed) {
    throw new AppError("Laporan sudah ditandatangani dan tidak dapat diperbarui", 400);
  }

  // Gunakan ID lama jika ada (agar file_path tetap konsisten), atau buat baru
  const reportId = existingReport?.id ?? crypto.randomUUID();
  const filePath = buildReportFilePath(case_id, reportId);

  // Buat snapshot JSON dari seluruh data laporan
  const snapshot = {
    report_id: reportId,
    generated_at: new Date().toISOString(),
    patient: {
      name: kasus.patient.name,
      no_induk: kasus.patient.no_induk,
      sex: kasus.patient.sex,
      age: kasus.patient.age,
    },
    case: {
      id: kasus.id,
      status: kasus.status,
      completed_at: kasus.completed_at,
      notes: kasus.notes,
    },
    consensus: {
      severity: kasus.consensus.severity,
      comment: kasus.consensus.comment,
      submitted_at: kasus.consensus.submitted_at,
      submitted_by: kasus.consensus.user.name,
    },
    pathologist_notes: pathologist_notes ?? null,
    diagnosis_summary: diagnosis_summary ?? null,
    images: kasus.images.map((img) => ({
      id: img.id,
      original_filename: img.original_filename,
      magnification: img.magnification,
      staining: img.staining,
      ai_result: img.ai_result
        ? {
            global_severity: img.ai_result.global_severity,
            total_necrosis_percent: img.ai_result.total_necrosis_percent,
            total_granuloma_percent: img.ai_result.total_granuloma_percent,
            total_datia_count: img.ai_result.total_datia_count,
            total_epiteloid_count: img.ai_result.total_epiteloid_count,
            mean_confidence: img.ai_result.mean_confidence,
            is_uncertain: img.ai_result.is_uncertain,
            findings: img.ai_result.findings.map((f) => ({
              finding_type: f.finding_type,
              confidence_score: f.confidence_score,
              area_percent: f.area_percent,
              count: f.count,
            })),
          }
        : null,
      validation: img.validation
        ? {
            global_severity: img.validation.global_severity,
            necrosis_severity: img.validation.necrosis_severity,
            granuloma_severity: img.validation.granuloma_severity,
            datia_count_level: img.validation.datia_count_level,
            epithelioid_count_level: img.validation.epithelioid_count_level,
            validation_comment: img.validation.validation_comment,
            submitted_at: img.validation.submitted_at,
          }
        : null,
    })),
  };

  const snapshotBytes = Buffer.from(JSON.stringify(snapshot, null, 2), "utf-8");
  await storage.uploadFile(filePath, snapshotBytes, "application/json");

  let report;
  if (existingReport) {
    report = await prisma.report.update({
      where: { id: reportId },
      data: {
        generated_by: patologId,
        severity: kasus.consensus.severity,
        pathologist_notes: pathologist_notes ?? null,
        diagnosis_summary: diagnosis_summary ?? null,
        file_path: filePath,
        generated_at: new Date(),
      },
    });
  } else {
    report = await prisma.report.create({
      data: {
        id: reportId,
        case_id,
        generated_by: patologId,
        severity: kasus.consensus.severity,
        pathologist_notes: pathologist_notes ?? null,
        diagnosis_summary: diagnosis_summary ?? null,
        file_path: filePath,
      },
    });
  }

  await writeAuditLog(patologId, "GENERATE_REPORT", "Report", report.id, { case_id });
  return report;
};

export const getReport = async (reportId: string, requesterId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      case: {
        include: { patient: { select: { name: true, no_induk: true } } },
      },
      user: { select: { id: true, name: true } },
    },
  });

  if (!report) throw new AppError("Laporan tidak ditemukan", 404);
  await assertSameInstitution(requesterId, report.case.created_by);

  const download_url = await storage.createSignedViewUrl(report.file_path, 900);

  return { ...report, download_url };
};

export const finalizeReport = async (reportId: string, patologId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { case: true },
  });

  if (!report) throw new AppError("Laporan tidak ditemukan", 404);
  await assertSameInstitution(patologId, report.case.created_by);

  if (report.is_signed) {
    throw new AppError("Laporan sudah ditandatangani sebelumnya", 400);
  }

  const signedAt = new Date();

  // Hash konten laporan untuk tamper-evidence
  const snapshotBytes = await storage.downloadFile(report.file_path);
  const contentHash = crypto.createHash("sha256").update(snapshotBytes).digest("hex");

  // Ikat hash konten + identitas penandatangan + waktu + ID laporan
  const signatureInput = [contentHash, report.id, patologId, signedAt.toISOString()].join("|");
  const digitalSignature = crypto.createHash("sha256").update(signatureInput).digest("hex");

  const signed = await prisma.report.update({
    where: { id: reportId },
    data: {
      is_signed: true,
      signed_at: signedAt,
      digital_signature: digitalSignature,
    },
  });

  await writeAuditLog(patologId, "SIGN_REPORT", "Report", reportId);
  return signed;
};
