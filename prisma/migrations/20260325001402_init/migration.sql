-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERATOR_LAB', 'DOKTER_PATOLOGI', 'DOKTER_KLINIS', 'ADMIN_AI');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('PENDING_UPLOAD', 'QC_PENDING', 'AI_PROCESSING', 'PENDING_VALIDATION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('NONE', 'FOKAL', 'SEDANG', 'LUAS');

-- CreateEnum
CREATE TYPE "ConsensusSeverity" AS ENUM ('NONE', 'RENDAH', 'SEDANG', 'TINGGI');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "QcFailureReason" AS ENUM ('BLUR', 'DARK', 'BRIGHT', 'NONE');

-- CreateEnum
CREATE TYPE "Magnification" AS ENUM ('X10', 'X40');

-- CreateEnum
CREATE TYPE "Staining" AS ENUM ('HE');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('COMMENT', 'VALIDATION');

-- CreateEnum
CREATE TYPE "ValidationResult" AS ENUM ('NEKROSIS_ADA', 'BUKAN_NEKROSIS', 'RAGU');

-- CreateEnum
CREATE TYPE "ReportResult" AS ENUM ('PRESENT', 'ABSENT', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "sip_number" TEXT,
    "institution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex_at_birth" TEXT NOT NULL,
    "rm_number" TEXT NOT NULL,
    "referring_doctor" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "notes" TEXT,
    "clinical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "qc_status" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "qc_failure_reason" "QcFailureReason" NOT NULL DEFAULT 'NONE',
    "qc_blur_score" DOUBLE PRECISION,
    "qc_exposure_score" DOUBLE PRECISION,
    "magnification" "Magnification" NOT NULL,
    "staining" "Staining" NOT NULL DEFAULT 'HE',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_at" TIMESTAMP(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_results" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "necrosis_detected" BOOLEAN NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "severity" "SeverityLevel" NOT NULL,
    "necrosis_area_percent" DOUBLE PRECISION,
    "segmentation_mask" JSONB NOT NULL,
    "is_uncertain" BOOLEAN NOT NULL DEFAULT false,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "ai_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "commentator_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CommentType" NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "comment_id" TEXT NOT NULL,
    "result" "ValidationResult" NOT NULL,
    "severity" "SeverityLevel" NOT NULL,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "consensus" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "commentator_id" TEXT NOT NULL,
    "severity" "ConsensusSeverity" NOT NULL,
    "comment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consensus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "diagnosis_result" "ReportResult" NOT NULL,
    "severity" "SeverityLevel" NOT NULL,
    "pathologist_notes" TEXT,
    "diagnosis_summary" TEXT,
    "is_signed" BOOLEAN NOT NULL DEFAULT false,
    "digital_signature" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signed_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_rm_number_key" ON "patients"("rm_number");

-- CreateIndex
CREATE UNIQUE INDEX "ai_results_image_id_key" ON "ai_results"("image_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_results" ADD CONSTRAINT "ai_results_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_commentator_id_fkey" FOREIGN KEY ("commentator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus" ADD CONSTRAINT "consensus_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus" ADD CONSTRAINT "consensus_commentator_id_fkey" FOREIGN KEY ("commentator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
