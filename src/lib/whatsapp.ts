import { getTeamById } from './catalog';
import type { Sticker, Team } from './types';

type DuplicateEntry = { sticker: Sticker; extra: number };

/** UTF-8 interpretado como Latin-1 (ej. MalagÃ³n → Malagón) */
export function fixEncoding(text: string): string {
  if (!/[Ãâ€]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return text;
  }
}

function cleanLabel(label: string): string {
  return fixEncoding(label).replace(/\s+/g, ' ').trim();
}

function sectionEmoji(title: string): string {
  if (title === 'Apertura') return '🏟️';
  if (title === 'FIFA Museum') return '🏛️';
  return '⚽';
}

function formatStickerLine(sticker: Sticker, suffix = ''): string {
  return `▫️ ${sticker.code} - ${cleanLabel(sticker.label)}${suffix}`;
}

function formatGroupHeader(title: string, count: number): string {
  return `${sectionEmoji(title)} *${title}* (${count})`;
}

export function formatMissingMessage(
  groups: { title: string; stickers: Sticker[] }[],
  _title?: string,
): string {
  const lines = ['⚽ *FIGURITAS FALTANTES*', '🏆 Panini Mundial FIFA 2026', ''];
  let total = 0;

  for (const group of groups) {
    if (group.stickers.length === 0) continue;
    lines.push(formatGroupHeader(group.title, group.stickers.length));
    for (const sticker of group.stickers) {
      lines.push(formatStickerLine(sticker));
      total++;
    }
    lines.push('');
  }

  lines.push(`📊 Total: *${total}* figuritas faltantes`);
  lines.push('', '🤝 ¿Intercambiamos?');
  return lines.join('\n').trim();
}

function groupDuplicates(entries: DuplicateEntry[]): { title: string; items: DuplicateEntry[] }[] {
  const map = new Map<string, { title: string; items: DuplicateEntry[] }>();

  for (const entry of entries) {
    let key: string;
    let title: string;

    if (entry.sticker.section === 'apertura') {
      key = 'apertura';
      title = 'Apertura';
    } else if (entry.sticker.section === 'museum') {
      key = 'museum';
      title = 'FIFA Museum';
    } else {
      const team = entry.sticker.teamId ? getTeamById(entry.sticker.teamId) : undefined;
      key = team?.id ?? entry.sticker.code.slice(0, 3);
      title = team?.name ?? key;
    }

    if (!map.has(key)) map.set(key, { title, items: [] });
    map.get(key)!.items.push(entry);
  }

  return [...map.values()];
}

export function formatDuplicatesMessage(entries: DuplicateEntry[]): string {
  const lines = ['🔄 *FIGURITAS REPETIDAS*', '🏆 Panini Mundial FIFA 2026', ''];
  let totalExtras = 0;

  for (const group of groupDuplicates(entries)) {
    lines.push(formatGroupHeader(group.title, group.items.length));
    for (const { sticker, extra } of group.items) {
      const total = extra + 1;
      lines.push(formatStickerLine(sticker, ` (tengo x${total})`));
      totalExtras += extra;
    }
    lines.push('');
  }

  lines.push(`📊 Total: *${totalExtras}* repetidas para intercambiar`);
  lines.push('', '🤝 ¿Te sirven para cambio?');
  return lines.join('\n').trim();
}

export function buildMissingGroups(
  apertura: Sticker[],
  museum: Sticker[],
  teamGroups: { team: Team; stickers: Sticker[] }[],
): { title: string; stickers: Sticker[] }[] {
  const groups: { title: string; stickers: Sticker[] }[] = [];
  if (apertura.length) groups.push({ title: 'Apertura', stickers: apertura });
  if (museum.length) groups.push({ title: 'FIFA Museum', stickers: museum });
  for (const { team, stickers: list } of teamGroups) {
    if (list.length) groups.push({ title: team.name, stickers: list });
  }
  return groups;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export function openWhatsApp(text: string): void {
  window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer');
}
