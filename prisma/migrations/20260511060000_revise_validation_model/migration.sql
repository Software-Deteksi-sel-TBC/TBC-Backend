-- CreateEnum
CREATE TYPE "HpfCountLevel" AS ENUM ('TIDAK_ADA', 'JARANG', 'CUKUP_BANYAK', 'SANGAT_BANYAK');

-- DropForeignKey
ALTER TABLE "validations" DROP CONSTRAINT "validations_comment_id_fkey";

-- DropIndex
DROP INDEX "comments_type_idx";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "validations" DROP CONSTRAINT "validations_pkey",
DROP COLUMN "bacteria_present",
DROP COLUMN "comment_id",
DROP COLUMN "severity",
ADD COLUMN     "datia_count_level" "HpfCountLevel",
ADD COLUMN     "epithelioid_count_level" "HpfCountLevel",
ADD COLUMN     "global_severity" "SeverityLevel" NOT NULL,
ADD COLUMN     "granuloma_severity" "SeverityLevel",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "image_id" TEXT NOT NULL,
ADD COLUMN     "necrosis_severity" "SeverityLevel",
ADD COLUMN     "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "validation_comment" TEXT,
ADD COLUMN     "validator_id" TEXT NOT NULL,
ADD CONSTRAINT "validations_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "CommentType";

-- CreateIndex
CREATE UNIQUE INDEX "validations_image_id_key" ON "validations"("image_id");

-- CreateIndex
CREATE INDEX "validations_validator_id_idx" ON "validations"("validator_id");

-- CreateIndex
CREATE INDEX "validations_submitted_at_idx" ON "validations"("submitted_at");

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
