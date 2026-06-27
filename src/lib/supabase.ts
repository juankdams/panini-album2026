import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.PRIVATE_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('xxxxxxxx')) return null;
  if (key.startsWith('sb_secret_')) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function getSupabase(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  if (!client) {
    client = createClient(env.url, env.key);
  }
  return client;
}
