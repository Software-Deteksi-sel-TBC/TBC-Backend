-- AlterTable: tambah kolom is_deleted dengan default false
ALTER TABLE "comments" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;
