/*
  Warnings:

  - The values [QC_PENDING] on the enum `CaseStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DONE] on the enum `ProcessingStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [NONE] on the enum `QcFailureReason` will be removed. If these variants are still used in the database, this will fail.
  - The values [NONE,FOKAL,LUAS] on the enum `SeverityLevel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `confidence_score` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `necrosis_area_percent` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `necrosis_detected` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `segmentation_mask` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `clinical_notes` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `referring_doctor` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `rm_number` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `sex_at_birth` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis_result` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `validations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[no_induk]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bpjs_number]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `severity` on the `consensus` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `age` to the `patients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bpjs_number` to the `patients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `no_induk` to the `patients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sex` to the `patients` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('NECROSIS', 'DATIA_LANGHANS', 'EPITHELIOID', 'GRANULOMA');

-- AlterEnum
BEGIN;
CREATE TYPE "CaseStatus_new" AS ENUM ('PENDING_UPLOAD', 'AI_PROCESSING', 'PENDING_VALIDATION', 'RESOLVED');
ALTER TABLE "public"."cases" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cases" ALTER COLUMN "status" TYPE "CaseStatus_new" USING ("status"::text::"CaseStatus_new");
ALTER TYPE "CaseStatus" RENAME TO "CaseStatus_old";
ALTER TYPE "CaseStatus_new" RENAME TO "CaseStatus";
DROP TYPE "public"."CaseStatus_old";
ALTER TABLE "cases" ALTER COLUMN "status" SET DEFAULT 'PENDING_UPLOAD';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProcessingStatus_new" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."ai_results" ALTER COLUMN "processing_status" DROP DEFAULT;
ALTER TABLE "ai_results" ALTER COLUMN "processing_status" TYPE "ProcessingStatus_new" USING ("processing_status"::text::"ProcessingStatus_new");
ALTER TYPE "ProcessingStatus" RENAME TO "ProcessingStatus_old";
ALTER TYPE "ProcessingStatus_new" RENAME TO "ProcessingStatus";
DROP TYPE "public"."ProcessingStatus_old";
ALTER TABLE "ai_results" ALTER COLUMN "processing_status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "QcFailureReason_new" AS ENUM ('BLUR', 'DARK', 'BRIGHT', 'NOISE');
ALTER TABLE "public"."images" ALTER COLUMN "qc_failure_reason" DROP DEFAULT;
ALTER TABLE "images" ALTER COLUMN "qc_failure_reason" TYPE "QcFailureReason_new" USING ("qc_failure_reason"::text::"QcFailureReason_new");
ALTER TYPE "QcFailureReason" RENAME TO "QcFailureReason_old";
ALTER TYPE "QcFailureReason_new" RENAME TO "QcFailureReason";
DROP TYPE "public"."QcFailureReason_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SeverityLevel_new" AS ENUM ('SANGAT_RENDAH', 'RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_INGGI');
ALTER TABLE "ai_results" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TABLE "validations" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TABLE "consensus" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TABLE "reports" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TYPE "SeverityLevel" RENAME TO "SeverityLevel_old";
ALTER TYPE "SeverityLevel_new" RENAME TO "SeverityLevel";
DROP TYPE "public"."SeverityLevel_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ai_results" DROP CONSTRAINT "ai_results_image_id_fkey";

-- DropIndex
DROP INDEX "patients_rm_number_key";

-- AlterTable
ALTER TABLE "ai_results" DROP COLUMN "confidence_score",
DROP COLUMN "necrosis_area_percent",
DROP COLUMN "necrosis_detected",
DROP COLUMN "segmentation_mask",
DROP COLUMN "severity",
ADD COLUMN     "global_severity" "SeverityLevel" NOT NULL DEFAULT 'SANGAT_RENDAH',
ADD COLUMN     "mean_confidence" DOUBLE PRECISION,
ADD COLUMN     "total_datia_count" INTEGER DEFAULT 0,
ADD COLUMN     "total_epiteloid_count" INTEGER DEFAULT 0,
ADD COLUMN     "total_granuloma_percent" DOUBLE PRECISION,
ADD COLUMN     "total_necrosis_percent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "cases" DROP COLUMN "clinical_notes";

-- AlterTable
ALTER TABLE "consensus" DROP COLUMN "severity",
ADD COLUMN     "severity" "SeverityLevel" NOT NULL;

-- AlterTable
ALTER TABLE "images" ALTER COLUMN "qc_failure_reason" DROP NOT NULL,
ALTER COLUMN "qc_failure_reason" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "referring_doctor",
DROP COLUMN "rm_number",
DROP COLUMN "sex_at_birth",
ADD COLUMN     "age" INTEGER NOT NULL,
ADD COLUMN     "bpjs_number" TEXT NOT NULL,
ADD COLUMN     "no_induk" TEXT NOT NULL,
ADD COLUMN     "sex" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "diagnosis_result";

-- AlterTable
ALTER TABLE "validations" DROP COLUMN "result";

-- DropEnum
DROP TYPE "ConsensusSeverity";

-- DropEnum
DROP TYPE "ReportResult";

-- DropEnum
DROP TYPE "ValidationResult";

-- CreateTable
CREATE TABLE "ai_findings" (
    "id" TEXT NOT NULL,
    "ai_result_id" TEXT NOT NULL,
    "finding_type" "FindingType" NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "area_percent" DOUBLE PRECISION,
    "count" INTEGER,
    "segmentation_mask" JSONB NOT NULL,

    CONSTRAINT "ai_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_no_induk_key" ON "patients"("no_induk");

-- CreateIndex
CREATE UNIQUE INDEX "patients_bpjs_number_key" ON "patients"("bpjs_number");

-- AddForeignKey
ALTER TABLE "ai_results" ADD CONSTRAINT "ai_results_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_findings" ADD CONSTRAINT "ai_findings_ai_result_id_fkey" FOREIGN KEY ("ai_result_id") REFERENCES "ai_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
