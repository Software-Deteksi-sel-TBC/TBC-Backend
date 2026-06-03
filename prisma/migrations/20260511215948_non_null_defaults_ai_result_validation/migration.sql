/*
  Warnings:

  - Made the column `total_datia_count` on table `ai_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_epiteloid_count` on table `ai_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_granuloma_percent` on table `ai_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_necrosis_percent` on table `ai_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `datia_count_level` on table `validations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `epithelioid_count_level` on table `validations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `granuloma_severity` on table `validations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `necrosis_severity` on table `validations` required. This step will fail if there are existing NULL values in that column.

*/
-- Isi NULL dengan default sebelum set NOT NULL
UPDATE "ai_results" SET "total_necrosis_percent" = 0 WHERE "total_necrosis_percent" IS NULL;
UPDATE "ai_results" SET "total_granuloma_percent" = 0 WHERE "total_granuloma_percent" IS NULL;
UPDATE "ai_results" SET "total_datia_count" = 0 WHERE "total_datia_count" IS NULL;
UPDATE "ai_results" SET "total_epiteloid_count" = 0 WHERE "total_epiteloid_count" IS NULL;

UPDATE "validations" SET "necrosis_severity" = 'SANGAT_RENDAH' WHERE "necrosis_severity" IS NULL;
UPDATE "validations" SET "granuloma_severity" = 'SANGAT_RENDAH' WHERE "granuloma_severity" IS NULL;
UPDATE "validations" SET "datia_count_level" = 'TIDAK_ADA' WHERE "datia_count_level" IS NULL;
UPDATE "validations" SET "epithelioid_count_level" = 'TIDAK_ADA' WHERE "epithelioid_count_level" IS NULL;

-- AlterTable
ALTER TABLE "ai_results" ALTER COLUMN "total_datia_count" SET NOT NULL,
ALTER COLUMN "total_epiteloid_count" SET NOT NULL,
ALTER COLUMN "total_granuloma_percent" SET NOT NULL,
ALTER COLUMN "total_granuloma_percent" SET DEFAULT 0,
ALTER COLUMN "total_necrosis_percent" SET NOT NULL,
ALTER COLUMN "total_necrosis_percent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "validations" ALTER COLUMN "datia_count_level" SET NOT NULL,
ALTER COLUMN "datia_count_level" SET DEFAULT 'TIDAK_ADA',
ALTER COLUMN "epithelioid_count_level" SET NOT NULL,
ALTER COLUMN "epithelioid_count_level" SET DEFAULT 'TIDAK_ADA',
ALTER COLUMN "granuloma_severity" SET NOT NULL,
ALTER COLUMN "granuloma_severity" SET DEFAULT 'SANGAT_RENDAH',
ALTER COLUMN "necrosis_severity" SET NOT NULL,
ALTER COLUMN "necrosis_severity" SET DEFAULT 'SANGAT_RENDAH';
