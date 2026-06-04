import { supabase, BUCKET } from "../../config/supabase.js";
import { AppError } from "../../errors/app.error.js";
import type { StorageService } from "../../interfaces/storage.interface.js";

export class SupabaseStorage implements StorageService {
  buildFilePath(caseId: string, imageId: string, originalFilename: string): string {
    return `cases/${caseId}/${imageId}/${originalFilename}`;
  }

  async createPresignedUploadUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath, { upsert: false });

    if (error || !data?.signedUrl) {
      throw new AppError("Gagal membuat URL upload", 500);
    }
    return data.signedUrl;
  }

  async createSignedViewUrl(filePath: string, expiresInSeconds = 900): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new AppError("Gagal membuat URL view", 500);
    }
    return data.signedUrl;
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error && !error.message.includes("Not Found")) {
      throw new AppError("Gagal menghapus file dari storage", 500);
    }
  }

  async uploadFile(filePath: string, body: string | Buffer, contentType: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, body, { contentType, upsert: true });

    if (error) {
      throw new AppError("Gagal mengupload file ke storage", 500);
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

    if (error || !data) {
      throw new AppError("Gagal mengunduh file dari storage", 500);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
