import albumData from '../data/album.json';
import teamsData from '../data/teams.json';
import type { Sticker, StickerSection, Team } from './types';

export const TOTAL_STICKERS = 980;
export const STORAGE_KEY = 'panini-2026-collection';

export const stickers = albumData as Sticker[];
export const teams = teamsData as Team[];

const stickerById = new Map(stickers.map((s) => [s.id, s]));
const stickerByCode = new Map(stickers.map((s) => [s.code.toUpperCase(), s]));
const teamBySlug = new Map(teams.map((t) => [t.slug, t]));
const teamById = new Map(teams.map((t) => [t.id, t]));
const teamByCode = new Map(teams.map((t) => [t.code, t]));

export function getSticker(id: string): Sticker | undefined {
  return stickerById.get(id);
}

export function getStickerByCode(code: string): Sticker | undefined {
  return stickerByCode.get(code.trim().toUpperCase());
}

export function getTeam(slug: string): Team | undefined {
  return teamBySlug.get(slug);
}

export function getTeamById(id: string): Team | undefined {
  return teamById.get(id);
}

export function getTeamByCode(code: string): Team | undefined {
  return teamByCode.get(code.toUpperCase());
}

export function getStickersBySection(section: StickerSection): Sticker[] {
  return stickers.filter((s) => s.section === section);
}

export function getStickersByTeam(teamId: string): Sticker[] {
  return stickers.filter((s) => s.teamId === teamId).sort((a, b) => a.number - b.number);
}

export function getGroups(): string[] {
  return [...new Set(teams.map((t) => t.group))].sort();
}

export function getTeamsByGroup(group: string): Team[] {
  return teams.filter((t) => t.group === group);
}

export function getFirstTeamInGroup(group: string): Team | undefined {
  return getTeamsByGroup(group)[0];
}

export function getConfederations(): string[] {
  return [...new Set(teams.map((t) => t.confederation))].sort();
}

export function parseStickerInput(input: string, teamCode?: string): Sticker | undefined {
  const raw = input.trim().toUpperCase();
  if (!raw) return undefined;

  const direct = getStickerByCode(raw);
  if (direct) return direct;

  if (teamCode) {
    const num = raw.replace(/\D/g, '');
    if (num) return getStickerByCode(`${teamCode}${num}`);
  }

  return undefined;
}
