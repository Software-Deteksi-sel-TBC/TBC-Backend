import { SupabaseStorage } from "./supabase.storage.js";
import type { StorageService } from "../../interfaces/storage.interface.js";

const provider = process.env.STORAGE_PROVIDER || "supabase";

let storage: StorageService;

if (provider === "supabase") {
  storage = new SupabaseStorage();
} else {
  throw new Error(`Storage provider '${provider}' belum didukung.`);
}

export { storage };
