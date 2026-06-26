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

  const reportId = crypto.randomUUID();
  const generatedAt = new Date();
  const filePath = buildReportFilePath(case_id, reportId);

  const snapshot = {
    report_id: reportId,
    generated_at: generatedAt.toISOString(),
    generated_by: patologId,
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

  // Tanda tangan digital dihitung langsung saat generate: ikat isi snapshot +
  // identitas penandatangan + waktu + ID laporan agar tamper-evident sejak awal.
  const contentHash = crypto.createHash("sha256").update(snapshotBytes).digest("hex");
  const signatureInput = [contentHash, reportId, patologId, generatedAt.toISOString()].join("|");
  const digitalSignature = crypto.createHash("sha256").update(signatureInput).digest("hex");

  const report = await prisma.report.create({
    data: {
      id: reportId,
      case_id,
      generated_by: patologId,
      severity: kasus.consensus.severity,
      pathologist_notes: pathologist_notes ?? null,
      diagnosis_summary: diagnosis_summary ?? null,
      file_path: filePath,
      generated_at: generatedAt,
      is_signed: true,
      digital_signature: digitalSignature,
      signed_at: generatedAt,
    },
  });

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

