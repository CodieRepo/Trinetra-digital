import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = "https://suvuvxdasccmztbbpreg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dnV2eGRhc2NjbXp0YmJwcmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDk4NDAsImV4cCI6MjA5NjcyNTg0MH0.w1aTrWCTkjvfNv27bQvZ5A2U4isby7Zw6RXl5LX_q1A";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window !== 'undefined' && clientInstance) {
    return clientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const client = createBrowserClient(url, anonKey);

  if (typeof window !== 'undefined') {
    clientInstance = client;
  }

  return client;
}

