import { createClient, SupabaseClient } from '@supabase/supabase-js';

let dbClient: SupabaseClient | null = null;

export function initializeDatabase(url: string, key: string) {
  dbClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function getDatabaseClient(): SupabaseClient {
  if (!dbClient) {
    // Return empty client mock to allow static typing verification
    return createClient("https://mock-db-placeholder.supabase.co", "mock-key");
  }
  return dbClient;
}
