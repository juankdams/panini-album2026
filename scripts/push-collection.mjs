/**
 * Sube una colección JSON a Supabase (merge max con lo que ya hay en la nube).
 * Uso: node --env-file=.env scripts/push-collection.mjs coleccion.json email password
 */
import { readFileSync } from 'node:fs';
import {
  createSupabaseClient,
  loadEnv,
  login,
  mergeCollections,
  printCollectionSummary,
  pullRemote,
  pushRemote,
} from './supabase-utils.mjs';

const [filePath, email, password] = process.argv.slice(2);
if (!filePath || !email || !password) {
  console.error('Uso: node --env-file=.env scripts/push-collection.mjs <coleccion.json> <email> <password>');
  process.exit(1);
}

let incoming;
try {
  incoming = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error('FAIL: no se pudo leer el JSON:', e.message);
  process.exit(1);
}

if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
  console.error('FAIL: el JSON debe ser un objeto { "sticker-id": cantidad }');
  process.exit(1);
}

const env = loadEnv();
const supabase = createSupabaseClient(env);
const userId = await login(supabase, email, password);

console.log('OK: Login', userId);

const { data: remote } = await pullRemote(supabase, userId);
const merged = mergeCollections(incoming, remote);

printCollectionSummary(incoming, 'Archivo local');
printCollectionSummary(remote, 'Remoto (antes)');
printCollectionSummary(merged, 'Resultado merge (max)');

await pushRemote(supabase, userId, merged);
console.log('\n--- Colección subida a Supabase ---');
