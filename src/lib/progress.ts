import { stickers, teams } from './catalog';
import type { Collection, GlobalProgress, SectionProgress, Sticker, StickerSection, TeamProgress } from './types';
import { getCount } from './collection';

function pct(owned: number, total: number): number {
  return total === 0 ? 0 : Math.round((owned / total) * 100);
}

function isOwned(collection: Collection, stickerId: string): boolean {
  return getCount(collection, stickerId) >= 1;
}

function extraCount(collection: Collection, stickerId: string): number {
  return Math.max(0, getCount(collection, stickerId) - 1);
}

export function sectionProgress(collection: Collection, section: StickerSection): SectionProgress {
  const list = stickers.filter((s) => s.section === section);
  const owned = list.filter((s) => isOwned(collection, s.id)).length;
  return { owned, total: list.length, percent: pct(owned, list.length) };
}

export function teamProgress(collection: Collection, teamId: string): TeamProgress | undefined {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return undefined;

  const list = stickers.filter((s) => s.teamId === teamId);
  const owned = list.filter((s) => isOwned(collection, s.id)).length;
  const missing = list.filter((s) => !isOwned(collection, s.id));
  const duplicates = list
    .map((sticker) => ({ sticker, extra: extraCount(collection, sticker.id) }))
    .filter((d) => d.extra > 0);

  return {
    team,
    owned,
    total: list.length,
    percent: pct(owned, list.length),
    missing,
    duplicates,
  };
}

export function globalProgress(collection: Collection): GlobalProgress {
  const owned = stickers.filter((s) => isOwned(collection, s.id)).length;
  const missing = stickers.filter((s) => !isOwned(collection, s.id));
  const duplicates = stickers
    .map((sticker) => ({ sticker, extra: extraCount(collection, sticker.id) }))
    .filter((d) => d.extra > 0);

  return {
    owned,
    total: stickers.length,
    percent: pct(owned, stickers.length),
    missing,
    duplicates,
    bySection: {
      apertura: sectionProgress(collection, 'apertura'),
      museum: sectionProgress(collection, 'museum'),
      team: sectionProgress(collection, 'team'),
    },
  };
}

export function allTeamProgress(collection: Collection) {
  return teams.map((team) => teamProgress(collection, team.id)!);
}

export function missingByTeam(collection: Collection): { team: (typeof teams)[0]; stickers: Sticker[] }[] {
  return teams
    .map((team) => ({
      team,
      stickers: stickers.filter((s) => s.teamId === team.id && !isOwned(collection, s.id)),
    }))
    .filter((g) => g.stickers.length > 0);
}

export function missingBySection(collection: Collection) {
  const apertura = stickers.filter((s) => s.section === 'apertura' && !isOwned(collection, s.id));
  const museum = stickers.filter((s) => s.section === 'museum' && !isOwned(collection, s.id));
  return { apertura, museum, teams: missingByTeam(collection) };
}

export function totalDuplicates(collection: Collection): number {
  return stickers.reduce((sum, s) => sum + extraCount(collection, s.id), 0);
}
