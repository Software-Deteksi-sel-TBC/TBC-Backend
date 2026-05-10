/*
  Warnings:

  - The values [DOKTER_KLINIS] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The values [SANGAT_INGGI] on the enum `SeverityLevel` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `sex` on the `patients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('LAKI_LAKI', 'PEREMPUAN', 'LAINNYA');

-- AlterEnum
ALTER TYPE "Magnification" ADD VALUE 'X100';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OPERATOR_LAB', 'DOKTER_PATOLOGI', 'ADMIN_AI');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SeverityLevel_new" AS ENUM ('SANGAT_RENDAH', 'RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_TINGGI');
ALTER TABLE "public"."ai_results" ALTER COLUMN "global_severity" DROP DEFAULT;
ALTER TABLE "ai_results" ALTER COLUMN "global_severity" TYPE "SeverityLevel_new" USING ("global_severity"::text::"SeverityLevel_new");
ALTER TABLE "validations" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TABLE "consensus" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TABLE "reports" ALTER COLUMN "severity" TYPE "SeverityLevel_new" USING ("severity"::text::"SeverityLevel_new");
ALTER TYPE "SeverityLevel" RENAME TO "SeverityLevel_old";
ALTER TYPE "SeverityLevel_new" RENAME TO "SeverityLevel";
DROP TYPE "public"."SeverityLevel_old";
ALTER TABLE "ai_results" ALTER COLUMN "global_severity" SET DEFAULT 'SANGAT_RENDAH';
COMMIT;

-- AlterEnum
ALTER TYPE "Staining" ADD VALUE 'ZN';

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_image_id_fkey";

-- DropForeignKey
ALTER TABLE "consensus" DROP CONSTRAINT "consensus_case_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_case_id_fkey";

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address" TEXT,
ALTER COLUMN "bpjs_number" DROP NOT NULL,
DROP COLUMN "sex",
ADD COLUMN     "sex" "Sex" NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "validations" ADD COLUMN     "bacteria_present" BOOLEAN;

-- CreateIndex
CREATE INDEX "ai_findings_ai_result_id_idx" ON "ai_findings"("ai_result_id");

-- CreateIndex
CREATE INDEX "ai_findings_finding_type_idx" ON "ai_findings"("finding_type");

-- CreateIndex
CREATE INDEX "ai_findings_segmentation_mask_idx" ON "ai_findings" USING GIN ("segmentation_mask" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "ai_results_processing_status_idx" ON "ai_results"("processing_status");

-- CreateIndex
CREATE INDEX "ai_results_global_severity_idx" ON "ai_results"("global_severity");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_payload_idx" ON "audit_logs" USING GIN ("payload" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "cases_patient_id_idx" ON "cases"("patient_id");

-- CreateIndex
CREATE INDEX "cases_created_by_idx" ON "cases"("created_by");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_created_at_idx" ON "cases"("created_at");

-- CreateIndex
CREATE INDEX "cases_patient_id_status_idx" ON "cases"("patient_id", "status");

-- CreateIndex
CREATE INDEX "comments_image_id_idx" ON "comments"("image_id");

-- CreateIndex
CREATE INDEX "comments_commentator_id_idx" ON "comments"("commentator_id");

-- CreateIndex
CREATE INDEX "comments_type_idx" ON "comments"("type");

-- CreateIndex
CREATE INDEX "comments_submitted_at_idx" ON "comments"("submitted_at");

-- CreateIndex
CREATE INDEX "consensus_case_id_idx" ON "consensus"("case_id");

-- CreateIndex
CREATE INDEX "consensus_commentator_id_idx" ON "consensus"("commentator_id");

-- CreateIndex
CREATE INDEX "consensus_submitted_at_idx" ON "consensus"("submitted_at");

-- CreateIndex
CREATE INDEX "images_case_id_idx" ON "images"("case_id");

-- CreateIndex
CREATE INDEX "images_uploaded_by_idx" ON "images"("uploaded_by");

-- CreateIndex
CREATE INDEX "images_qc_status_idx" ON "images"("qc_status");

-- CreateIndex
CREATE INDEX "images_uploaded_at_idx" ON "images"("uploaded_at");

-- CreateIndex
CREATE INDEX "images_case_id_qc_status_idx" ON "images"("case_id", "qc_status");

-- CreateIndex
CREATE INDEX "patients_created_by_idx" ON "patients"("created_by");

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "reports_case_id_idx" ON "reports"("case_id");

-- CreateIndex
CREATE INDEX "reports_generated_by_idx" ON "reports"("generated_by");

-- CreateIndex
CREATE INDEX "reports_is_signed_idx" ON "reports"("is_signed");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus" ADD CONSTRAINT "consensus_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
