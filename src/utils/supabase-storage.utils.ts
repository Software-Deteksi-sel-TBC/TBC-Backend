import { supabase, BUCKET } from "../config/supabase.js";
import { AppError } from "../errors/app.error.js";

export const buildFilePath = (caseId: string, imageId: string, originalFilename: string): string =>
  `cases/${caseId}/${imageId}/${originalFilename}`;

export const createPresignedUploadUrl = async (
  filePath: string,
  expiresInSeconds = 3600
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath, { upsert: false });

  if (error || !data?.signedUrl) {
    throw new AppError("Gagal membuat URL upload", 500);
  }
  return data.signedUrl;
};

export const createSignedViewUrl = async (
  filePath: string,
  expiresInSeconds = 900
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new AppError("Gagal membuat URL view", 500);
  }
  return data.signedUrl;
};

export const deleteFile = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error && !error.message.includes("Not Found")) {
    throw new AppError("Gagal menghapus file dari storage", 500);
  }
};
