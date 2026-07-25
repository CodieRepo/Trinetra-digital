import { createClient, SupabaseClient } from '@supabase/supabase-js';

let dbClient: SupabaseClient | null = null;

export function initializeDatabase(url: string, key: string): SupabaseClient {
  dbClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return dbClient;
}

export function getDatabaseClient(): SupabaseClient {
  if (!dbClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-db-placeholder.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
    dbClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return dbClient;
}

export function getTenantScopedTable(tableName: string, tenantId: string) {
  const client = getDatabaseClient();
  return client.from(tableName).select('*').eq('tenant_id', tenantId);
}

