import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env");
}

export const supabase = createClient(url, key);
export const BUCKET = process.env.SUPABASE_BUCKET ?? "histopatologi";
