import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_client) {
    _client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export const supabase = typeof window !== "undefined" ? getSupabase() : null;
