-- Hapus duplikat case_id di tabel consensus sebelum menambahkan unique constraint.
-- Pertahankan record terbaru (submitted_at terbesar) per case_id.
DELETE FROM "consensus"
WHERE id NOT IN (
  SELECT DISTINCT ON (case_id) id
  FROM "consensus"
  ORDER BY case_id, submitted_at DESC
);

-- AlterTable: tambahkan UNIQUE constraint pada case_id
ALTER TABLE "consensus" ADD CONSTRAINT "consensus_case_id_key" UNIQUE ("case_id");

-- DropIndex: index case_id tidak lagi diperlukan (unique constraint sudah meng-cover lookup by case_id)
DROP INDEX IF EXISTS "consensus_case_id_idx";
