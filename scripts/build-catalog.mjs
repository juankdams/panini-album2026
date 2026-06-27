import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixEncoding(text) {
  if (!/[Ãâ€]/.test(text)) return text;
  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

const raw = readFileSync(join(__dirname, 'checklist-raw.txt'), 'utf8').replace(/^\uFEFF/, '');
const teams = JSON.parse(readFileSync(join(__dirname, 'teams-meta.json'), 'utf8'));
const codeToTeam = Object.fromEntries(teams.map((t) => [t.code, t]));

const APERTURA = [
  { number: 0, code: 'LOGO', label: 'Logo Panini' },
  { number: 1, code: 'FWC1', label: 'Emblema Oficial' },
  { number: 2, code: 'FWC2', label: 'Emblema Oficial' },
  { number: 3, code: 'FWC3', label: 'Mascotas Oficiales' },
  { number: 4, code: 'FWC4', label: 'Eslogan Oficial' },
  { number: 5, code: 'FWC5', label: 'Balón Oficial' },
  { number: 6, code: 'FWC6', label: 'Canada - Sedes y Ciudades' },
  { number: 7, code: 'FWC7', label: 'Mexico - Sedes y Ciudades' },
  { number: 8, code: 'FWC8', label: 'Estados Unidos - Sedes y Ciudades' },
];

const MUSEUM = [
  { number: 9, code: 'FWC9', label: 'Italia 1934' },
  { number: 10, code: 'FWC10', label: 'Uruguay 1950' },
  { number: 11, code: 'FWC11', label: 'Alemania Occidental 1954' },
  { number: 12, code: 'FWC12', label: 'Brasil 1962' },
  { number: 13, code: 'FWC13', label: 'Alemania Occidental 1974' },
  { number: 14, code: 'FWC14', label: 'Argentina 1986' },
  { number: 15, code: 'FWC15', label: 'Brasil 1994' },
  { number: 16, code: 'FWC16', label: 'Brasil 2002' },
  { number: 17, code: 'FWC17', label: 'Italia 2006' },
  { number: 18, code: 'FWC18', label: 'Alemania 2014' },
  { number: 19, code: 'FWC19', label: 'Argentina 2022' },
];

function stickerKind(num, label) {
  if (num === 1 || label.includes('Team Logo') || label.includes('Escudo')) return 'foil';
  if (num === 13 || label.includes('Team Photo') || label.includes('Foto')) return 'photo';
  return 'player';
}

function parseTeamStickers(text) {
  const entries = [];
  const codes = [...new Set(teams.map((t) => t.code))].sort((a, b) => b.length - a.length);
  const codePattern = `${codes.join('|')}|SWI|KAS`;
  const re = new RegExp(
    `(?:^|\\s)(${codePattern})(\\d{1,2})\\s+(.+?)(?=\\s+(?:${codePattern})\\d{1,2}\\s|\\s+FWC\\d|\\s*$)`,
    'gs',
  );
  let m;
  while ((m = re.exec(text)) !== null) {
    let code = m[1];
    if (code === 'SWI') code = 'SUI';
    if (code === 'KAS') code = 'KSA';
    const num = parseInt(m[2], 10);
    let label = fixEncoding(m[3].trim().replace(/\s+FOIL$/i, ''));
    label = label.replace(/\s+-\s+[^-]+$/, '').trim();
    if (label.startsWith('Team Logo')) label = 'Escudo del equipo';
    else if (label.startsWith('Team Photo')) label = 'Foto del equipo';
    entries.push({ code: `${code}${num}`, teamCode: code, number: num, label });
  }
  return entries;
}

const teamStickers = parseTeamStickers(raw);
const stickers = [];

for (const item of APERTURA) {
  stickers.push({
    id: `apertura-${item.number}`,
    code: item.code,
    label: item.label,
    section: 'apertura',
    number: item.number,
    kind: 'foil',
  });
}

for (const item of MUSEUM) {
  stickers.push({
    id: `museum-${item.number}`,
    code: item.code,
    label: item.label,
    section: 'museum',
    number: item.number,
    kind: 'foil',
  });
}

for (const entry of teamStickers) {
  const team = codeToTeam[entry.teamCode];
  if (!team) {
    console.warn(`Unknown team code: ${entry.teamCode}`);
    continue;
  }
  stickers.push({
    id: `${team.id}-${entry.number}`,
    code: entry.code,
    label: entry.label,
    section: 'team',
    teamId: team.id,
    number: entry.number,
    kind: stickerKind(entry.number, entry.label),
  });
}

const outDir = join(__dirname, '..', 'src', 'data');
writeFileSync(join(outDir, 'teams.json'), JSON.stringify(teams, null, 2));
writeFileSync(join(outDir, 'album.json'), JSON.stringify(stickers, null, 2));

console.log(`Generated ${stickers.length} stickers (${APERTURA.length} apertura, ${MUSEUM.length} museum, ${teamStickers.length} team)`);
if (stickers.length !== 980) {
  console.warn(`Expected 980 stickers, got ${stickers.length}`);
  process.exitCode = 1;
}
