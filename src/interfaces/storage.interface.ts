export interface StorageService {
  buildFilePath(caseId: string, imageId: string, originalFilename: string): string;
  createPresignedUploadUrl(filePath: string, expiresInSeconds?: number): Promise<string>;
  createSignedViewUrl(filePath: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  uploadFile(filePath: string, body: string | Buffer, contentType: string): Promise<void>;
  downloadFile(filePath: string): Promise<Buffer>;
}
