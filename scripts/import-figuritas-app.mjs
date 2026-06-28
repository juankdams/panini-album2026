/**
 * Importa export de Figuritas App → colección StickerSync → Supabase.
 * Uso: node --env-file=.env scripts/import-figuritas-app.mjs [archivo.txt] [email] [password]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import album from '../src/data/album.json' with { type: 'json' };
import teams from '../src/data/teams.json' with { type: 'json' };
import {
  createSupabaseClient,
  loadEnv,
  login,
  printCollectionSummary,
  pushRemote,
} from './supabase-utils.mjs';

const teamCodeToId = Object.fromEntries(teams.map((t) => [t.code, t.id]));

function parseNums(raw) {
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

function parseExport(text) {
  const missing = new Map();
  const duplicates = new Map();
  let mode = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === 'me faltan') {
      mode = 'missing';
      continue;
    }
    if (trimmed.toLowerCase() === 'repetidas') {
      mode = 'duplicates';
      continue;
    }
    if (!mode) continue;

    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const head = trimmed.slice(0, colon).trim();
    const nums = parseNums(trimmed.slice(colon + 1));
    if (nums.length === 0) continue;

    let key;
    if (head.startsWith('FWC')) {
      if (head.includes('📜')) key = 'FWC_SCROLL';
      else key = 'FWC_TROPHY'; // 🏆 y 🌎 comparten apertura 0-8
    } else if (head.startsWith('CC')) {
      key = 'CC';
    } else {
      const m = head.match(/^([A-Z]{3})/);
      if (!m) continue;
      key = m[1];
    }

    const bucket = mode === 'missing' ? missing : duplicates;
    if (!bucket.has(key)) bucket.set(key, new Set());
    for (const n of nums) bucket.get(key).add(n);
  }

  return { missing, duplicates };
}

function stickerKey(sticker) {
  if (sticker.section === 'apertura') return { key: 'FWC_TROPHY', num: sticker.number };
  if (sticker.section === 'museum') return { key: 'FWC_SCROLL', num: sticker.number };
  if (sticker.section === 'team' && sticker.teamId) {
    const team = teams.find((t) => t.id === sticker.teamId);
    return { key: team?.code ?? '', num: sticker.number };
  }
  return null;
}

function buildCollection(missing, duplicates) {
  const collection = {};
  let skippedCc = 0;

  for (const sticker of album) {
    const sk = stickerKey(sticker);
    if (!sk) continue;

    const miss = missing.get(sk.key)?.has(sk.num) ?? false;
    if (miss) continue;

    const dup = duplicates.get(sk.key)?.has(sk.num) ?? false;
    collection[sticker.id] = dup ? 2 : 1;
  }

  for (const [key, nums] of missing) {
    if (key === 'CC') skippedCc += nums.size;
  }
  for (const [key, nums] of duplicates) {
    if (key === 'CC') skippedCc += nums.size;
  }

  return { collection, skippedCc };
}

const defaultFile = fileURLToPath(new URL('./data/figuritas-export.txt', import.meta.url));
const args = process.argv.slice(2);
const env = loadEnv();

let filePath = defaultFile;
let email;
let password;

if (args[0] && !args[0].includes('@')) {
  filePath = args[0];
  email = args[1];
  password = args[2];
} else {
  email = args[0] ?? env.TEST_SUPABASE_EMAIL;
  password = args[1] ?? env.TEST_SUPABASE_PASSWORD;
}

if (!email || !password) {
  console.error('Uso: node --env-file=.env scripts/import-figuritas-app.mjs [archivo.txt] <email> <password>');
  process.exit(1);
}

const text = readFileSync(filePath, 'utf8');
const { missing, duplicates } = parseExport(text);
const { collection, skippedCc } = buildCollection(missing, duplicates);

const owned = Object.keys(collection).length;
const units = Object.values(collection).reduce((s, n) => s + n, 0);
const dups = Object.values(collection).filter((n) => n > 1).length;

console.log('--- Import Figuritas App ---');
console.log(`Figuritas en catálogo: ${owned} / ${album.length}`);
console.log(`Unidades totales: ${units} (${dups} repetidas)`);
if (skippedCc > 0) {
  console.log(`WARN: ${skippedCc} figuritas CC (Coca-Cola) omitidas — no están en el álbum de 980`);
}

printCollectionSummary(collection, 'Colección generada');

const exportPath = fileURLToPath(new URL('./data/collection-export.json', import.meta.url));
writeFileSync(exportPath, JSON.stringify(collection));
console.log(`\nBackup local: ${exportPath}`);

const env2 = loadEnv();
const supabase = createSupabaseClient(env2);
const userId = await login(supabase, email, password);
console.log('\nOK: Login', userId);

await pushRemote(supabase, userId, collection);
console.log('--- Colección reemplazada en Supabase ---');
