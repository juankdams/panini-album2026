/**
 * Prueba conexión Supabase + tabla collections + flujo migrate (upsert/pull).
 * Uso: node --env-file=.env scripts/test-supabase.mjs [email] [password]
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
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

const env = loadEnv();
const url = env.PUBLIC_SUPABASE_URL || env.PRIVATE_SUPABASE_URL;
const key = env.PUBLIC_SUPABASE_ANON_KEY;

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('OK:', msg);
}

console.log('--- Supabase diagnostic ---\n');

if (!url) fail('Falta PUBLIC_SUPABASE_URL (o PRIVATE_SUPABASE_URL) en .env');
if (!key) fail('Falta PUBLIC_SUPABASE_ANON_KEY en .env');

ok(`URL: ${url}`);

if (key.startsWith('sb_secret_')) {
  fail(
    'PUBLIC_SUPABASE_ANON_KEY parece una secret key (sb_secret_...). ' +
      'Usa la clave "anon public" (JWT eyJ...) en Supabase → Settings → API.',
  );
}

if (key.includes('REEMPLAZA') || key.length < 50) {
  fail('PUBLIC_SUPABASE_ANON_KEY no configurada. Pega la anon key (eyJ...) en .env');
}

if (!key.startsWith('eyJ')) {
  console.warn('WARN: la anon key normalmente empieza con eyJ (JWT). Verifica en el dashboard.');
}

const supabase = createClient(url, key);

// 1) Health: auth settings (no requiere login)
const { data: health, error: healthErr } = await supabase.auth.getSession();
if (healthErr) fail(`Auth client: ${healthErr.message}`);
ok('Cliente Supabase inicializado');

// 2) Tabla collections sin auth → RLS debe bloquear o devolver vacío
const { error: anonSelectErr } = await supabase.from('collections').select('user_id').limit(1);
if (anonSelectErr) {
  if (anonSelectErr.code === 'PGRST116' || anonSelectErr.message.includes('does not exist')) {
    fail(`Tabla collections no existe. Ejecuta supabase/migrations/001_collections.sql en el SQL Editor.`);
  }
  if (anonSelectErr.code === '42501' || anonSelectErr.message.includes('permission')) {
    ok('RLS activo (lectura anónima bloqueada, esperado)');
  } else {
    console.warn('WARN select anónimo:', anonSelectErr.message);
  }
} else {
  ok('Tabla collections accesible');
}

const email = process.argv[2] || env.TEST_SUPABASE_EMAIL;
const password = process.argv[3] || env.TEST_SUPABASE_PASSWORD;

if (!email || !password) {
  console.log('\n--- Migración (omitida) ---');
  console.log('Pasa email y password para probar migrate:');
  console.log('  node --env-file=.env scripts/test-supabase.mjs tu@email.com tuClave');
  process.exit(0);
}

console.log('\n--- Auth + migración ---');

async function resolveSession(email, password) {
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInErr && signIn.session?.user) {
    ok(`Login: ${signIn.user.id}`);
    return signIn.session.user.id;
  }

  if (signInErr && !signInErr.message.includes('Invalid login credentials')) {
    if (signInErr.message.toLowerCase().includes('email not confirmed')) {
      fail(
        'Email sin confirmar. Abre el enlace del correo de Supabase, o desactiva ' +
          '"Confirm email" en Supabase → Authentication → Providers → Email.',
      );
    }
  }

  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({ email, password });
  if (signUpErr) {
    fail(`Login: ${signInErr?.message ?? 'unknown'} / Register: ${signUpErr.message}`);
  }

  if (signUp.session?.user) {
    ok(`Registro con sesión: ${signUp.user.id}`);
    return signUp.session.user.id;
  }

  if (signUp.user) {
    ok(`Usuario registrado: ${signUp.user.id}`);
    const { data: retry, error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
    if (retry.session?.user) {
      ok(`Login tras registro: ${retry.user.id}`);
      return retry.session.user.id;
    }
    if (retryErr?.message.toLowerCase().includes('email not confirmed')) {
      fail(
        'Cuenta creada pero requiere confirmar email antes de sincronizar. ' +
          'Confirma el correo o desactiva "Confirm email" en Supabase → Auth → Email.',
      );
    }
    fail(`Sin sesión tras registro: ${retryErr?.message ?? 'confirma tu email en Supabase'}`);
  }

  fail('Registro sin usuario');
}

const userId = await resolveSession(email, password);
if (!userId) fail('Sin sesión tras login');

const sampleLocal = { 'mexico-1': 1, 'mexico-2': 2, 'argentina-1': 1 };

const { error: upsertErr } = await supabase.from('collections').upsert({
  user_id: userId,
  data: sampleLocal,
  updated_at: new Date().toISOString(),
});
if (upsertErr) fail(`Upsert migrate: ${upsertErr.message}`);
ok(`Upsert ${Object.keys(sampleLocal).length} figuritas`);

const { data: row, error: pullErr } = await supabase
  .from('collections')
  .select('data, updated_at')
  .eq('user_id', userId)
  .maybeSingle();
if (pullErr) fail(`Pull: ${pullErr.message}`);

const remote = row?.data ?? {};
const merged = { ...remote };
for (const [id, n] of Object.entries(sampleLocal)) {
  merged[id] = Math.max(merged[id] ?? 0, n);
}

if (merged['mexico-2'] !== 2) fail(`Merge incorrecto: mexico-2=${merged['mexico-2']}`);
ok(`Pull OK — ${Object.keys(remote).length} keys en DB, merge max verificado`);
ok(`updated_at: ${row?.updated_at}`);

const { data: userData } = await supabase.auth.getUser();
ok(`Usuario: ${userData.user?.email ?? email} (${userId})`);

console.log('\n--- Colección en Supabase ---');
const entries = Object.entries(remote).sort(([a], [b]) => a.localeCompare(b));
if (entries.length === 0) {
  console.log('(vacía)');
} else {
  for (const [id, count] of entries.slice(0, 10)) {
    console.log(`  ${id}: ${count}`);
  }
  if (entries.length > 10) console.log(`  ... +${entries.length - 10} más`);
  console.log(`Total figuritas con stock: ${entries.length}`);
  console.log(`Total unidades: ${entries.reduce((s, [, n]) => s + n, 0)}`);
}

console.log('\n--- Todo listo ---');
