import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('[FATAL] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable is required for admin operations.');
  }
  if (!key) {
    throw new Error('[FATAL] SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations. Never use anon key as a replacement.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
