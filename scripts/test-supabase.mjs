/**
 * Prueba conexión Supabase + tabla collections.
 * Por defecto solo lee; no escribe datos de prueba (evita pisar tu colección real).
 * Uso: node --env-file=.env scripts/test-supabase.mjs [email] [password] [--sample]
 */
import {
  createSupabaseClient,
  loadEnv,
  login,
  mergeCollections,
  printCollectionSummary,
  pullRemote,
  pushRemote,
} from './supabase-utils.mjs';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('OK:', msg);
}

const args = process.argv.slice(2);
const writeSample = args.includes('--sample');
const positional = args.filter((a) => a !== '--sample');
const email = positional[0] || loadEnv().TEST_SUPABASE_EMAIL;
const password = positional[1] || loadEnv().TEST_SUPABASE_PASSWORD;

console.log('--- Supabase diagnostic ---\n');

const env = loadEnv();
let supabase;
try {
  supabase = createSupabaseClient(env);
} catch (e) {
  fail(e.message);
}

ok(`URL: ${env.PUBLIC_SUPABASE_URL || env.PRIVATE_SUPABASE_URL}`);

const { error: healthErr } = await supabase.auth.getSession();
if (healthErr) fail(`Auth client: ${healthErr.message}`);
ok('Cliente Supabase inicializado');

const { error: anonSelectErr } = await supabase.from('collections').select('user_id').limit(1);
if (anonSelectErr) {
  if (anonSelectErr.code === 'PGRST116' || anonSelectErr.message.includes('does not exist')) {
    fail('Tabla collections no existe. Ejecuta supabase/migrations/001_collections.sql');
  }
  if (anonSelectErr.code === '42501' || anonSelectErr.message.includes('permission')) {
    ok('RLS activo (lectura anónima bloqueada, esperado)');
  } else {
    console.warn('WARN select anónimo:', anonSelectErr.message);
  }
} else {
  ok('Tabla collections accesible');
}

if (!email || !password) {
  console.log('\n--- Colección (omitida) ---');
  console.log('Pasa email y password para ver tu colección en la nube:');
  console.log('  npm run test:supabase -- tu@email.com tuClave');
  process.exit(0);
}

console.log('\n--- Auth + lectura ---');

let userId;
try {
  userId = await login(supabase, email, password);
  ok(`Login: ${userId}`);
} catch (e) {
  if (e.message.includes('Invalid login credentials')) {
    fail(`${e.message}. Verifica email/contraseña o confirma el correo en Supabase.`);
  }
  if (e.message.toLowerCase().includes('email not confirmed')) {
    fail('Email sin confirmar. Confirma el correo o desactiva "Confirm email" en Supabase Auth.');
  }
  fail(e.message);
}

const { data: remote, updated_at } = await pullRemote(supabase, userId);
ok(`Pull OK — ${Object.keys(remote).length} figuritas en DB`);
if (updated_at) ok(`updated_at: ${updated_at}`);

const { data: userData } = await supabase.auth.getUser();
ok(`Usuario: ${userData.user?.email ?? email} (${userId})`);

printCollectionSummary(remote, 'Colección en Supabase');

if (writeSample) {
  console.log('\n--- Escritura de prueba (--sample) ---');
  const sample = { 'mexico-1': 1, 'mexico-2': 2, 'argentina-1': 1 };
  const merged = mergeCollections(sample, remote);
  await pushRemote(supabase, userId, merged);
  ok(`Merge + upsert (${Object.keys(sample).length} figuritas de prueba, sin pisar el resto)`);
  printCollectionSummary(merged, 'Colección tras merge');
} else {
  console.log('\n(Sin escritura. Para probar upsert sin perder datos: añade --sample)');
}

console.log('\n--- Todo listo ---');
