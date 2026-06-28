import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export function loadEnv() {
  const path = new URL('../.env', import.meta.url);
  if (!existsSync(path)) return process.env;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  return process.env;
}

export function mergeCollections(local, remote) {
  const merged = { ...remote };
  for (const [id, count] of Object.entries(local)) {
    merged[id] = Math.max(merged[id] ?? 0, count);
  }
  return merged;
}

export function printCollectionSummary(data, label) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  console.log(`\n--- ${label} ---`);
  if (entries.length === 0) {
    console.log('(vacía)');
    return;
  }
  for (const [id, count] of entries.slice(0, 10)) {
    console.log(`  ${id}: ${count}`);
  }
  if (entries.length > 10) console.log(`  ... +${entries.length - 10} más`);
  console.log(`Total figuritas con stock: ${entries.length}`);
  console.log(`Total unidades: ${entries.reduce((s, [, n]) => s + n, 0)}`);
}

export function createSupabaseClient(env) {
  const url = env.PUBLIC_SUPABASE_URL || env.PRIVATE_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en .env');
  if (key.startsWith('sb_secret_')) {
    throw new Error('Usa la clave anon public (eyJ...), no la secret key');
  }
  return createClient(url, key);
}

export async function login(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login: ${error.message}`);
  if (!data.session?.user) throw new Error('Login sin sesión');
  return data.session.user.id;
}

export async function pullRemote(supabase, userId) {
  const { data, error } = await supabase
    .from('collections')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Pull: ${error.message}`);
  return { data: data?.data ?? {}, updated_at: data?.updated_at ?? null };
}

export async function pushRemote(supabase, userId, collection) {
  const { error } = await supabase.from('collections').upsert({
    user_id: userId,
    data: collection,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Upsert: ${error.message}`);
}
