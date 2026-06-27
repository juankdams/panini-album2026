import { stickers, teams, TOTAL_STICKERS } from '../lib/catalog';
import type { Collection } from '../lib/types';
import {
  getCount,
  increment,
  loadCollection,
  toggleSticker,
} from '../lib/collection';
import {
  globalProgress,
  missingBySection,
  teamProgress,
} from '../lib/progress';
import type { Sticker } from '../lib/types';
import {
  buildMissingGroups,
  copyToClipboard,
  formatDuplicatesMessage,
  formatMissingMessage,
  openWhatsApp,
} from '../lib/whatsapp';
import { initSyncSession, scheduleSync, signOut } from '../lib/sync';
import { isSupabaseConfigured } from '../lib/supabase';

let collection: Collection = loadCollection();

function stickerMap(): Map<string, Sticker> {
  return new Map(stickers.map((s) => [s.id, s]));
}

function refreshCollection() {
  collection = loadCollection();
}

function updateSlotEl(el: HTMLElement, count: number) {
  const stickerId = el.dataset.stickerId!;
  const sticker = stickerMap().get(stickerId);
  if (!sticker) return;

  const owned = count >= 1;
  el.dataset.stickerOwned = owned ? 'true' : 'false';
  el.dataset.stickerCount = String(count);

  if (owned) {
    const isFoil = sticker.kind === 'foil';
    el.className =
      'sticker-slot relative flex flex-col overflow-hidden high-contrast-border bg-surface-container-highest cursor-pointer';
    el.innerHTML = `
      <div class="sticker-gloss absolute inset-0 z-20"></div>
      <div class="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <span class="font-anton text-center text-lg uppercase text-primary">${sticker.code}</span>
      </div>
      <div class="relative z-30 flex items-center justify-between p-2 text-white ${isFoil ? 'bg-primary' : 'bg-secondary'}">
        <span class="font-anton text-sm">${sticker.code}</span>
        <span class="material-symbols-outlined material-symbols-filled text-lg">${isFoil ? 'stars' : 'check_circle'}</span>
      </div>
      ${count > 1 ? `<span class="absolute right-1 top-1 z-40 rounded bg-tertiary-fixed px-1.5 py-0.5 text-[10px] font-bold text-on-tertiary-fixed" data-duplicate-badge>×${count}</span>` : ''}
      <p class="sr-only">${sticker.label}</p>
    `;
  } else {
    el.className =
      'sticker-slot relative flex flex-col items-center justify-center overflow-hidden border-4 border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-container-high';
    el.innerHTML = `
      <div class="text-center">
        <p class="font-anton text-outline mb-3 text-sm">${sticker.code}</p>
        <p class="mb-3 line-clamp-2 px-2 text-[10px] text-on-surface-variant">${sticker.label}</p>
        <span class="inline-flex h-10 w-10 items-center justify-center bg-primary text-white high-contrast-border">
          <span class="material-symbols-outlined">add</span>
        </span>
      </div>
    `;
  }
}

function hydrateStickerSlots() {
  document.querySelectorAll<HTMLElement>('[data-sticker-id]').forEach((el) => {
    const id = el.dataset.stickerId!;
    updateSlotEl(el, getCount(collection, id));
  });
}

function updateTeamCard(teamId: string) {
  const progress = teamProgress(collection, teamId);
  if (!progress) return;

  const ownedEl = document.querySelector(`[data-team-owned="${teamId}"]`);
  if (ownedEl) ownedEl.textContent = `${progress.owned}/${progress.total}`;

  const miniOwned = document.querySelector(`[data-team-mini-owned="${teamId}"]`);
  if (miniOwned) miniOwned.textContent = `${progress.owned}/${progress.total}`;

  const bar = document.querySelector(`[data-progress-bar="${teamId}"]`) as HTMLElement | null;
  if (bar) bar.style.width = `${progress.percent}%`;

  const card = document.querySelector(`[data-team-card="${teamId}"]`);
  const existing = card?.querySelector(`[data-team-complete="${teamId}"]`);
  if (progress.percent >= 100 && !existing && card) {
    const badge = document.createElement('div');
    badge.className = 'mt-3 flex items-center gap-1 text-tertiary';
    badge.dataset.teamComplete = teamId;
    badge.innerHTML =
      '<span class="material-symbols-outlined material-symbols-filled text-base">workspace_premium</span><span class="text-xs font-bold">COMPLETADO</span>';
    card.querySelector('.relative.p-5')?.appendChild(badge);
  } else if (progress.percent < 100 && existing) {
    existing.remove();
  }
}

function updateGlobalStats() {
  const g = globalProgress(collection);

  document.querySelectorAll('[data-stat-percent="global"]').forEach((el) => {
    el.textContent = `${g.percent}%`;
  });
  document.querySelectorAll('[data-stat-sub="global"]').forEach((el) => {
    el.textContent = `${g.owned} / ${TOTAL_STICKERS} figuritas`;
  });
  document.querySelectorAll('[data-stat-sub="missing"]').forEach((el) => {
    el.textContent = `${g.missing.length} pendientes`;
  });
  document.querySelectorAll('[data-stat-sub="duplicates"]').forEach((el) => {
    const total = g.duplicates.reduce((s, d) => s + d.extra, 0);
    el.textContent = `${total} repetidas`;
  });
  document.querySelectorAll('[data-stat-percent="apertura"]').forEach((el) => {
    el.textContent = `${g.bySection.apertura.percent}%`;
  });
  document.querySelectorAll('[data-stat-sub="apertura"]').forEach((el) => {
    el.textContent = `${g.bySection.apertura.owned} / ${g.bySection.apertura.total}`;
  });
  document.querySelectorAll('[data-stat-percent="museum"]').forEach((el) => {
    el.textContent = `${g.bySection.museum.percent}%`;
  });
  document.querySelectorAll('[data-stat-sub="museum"]').forEach((el) => {
    el.textContent = `${g.bySection.museum.owned} / ${g.bySection.museum.total}`;
  });
  document.querySelectorAll('[data-stat-percent="teams"]').forEach((el) => {
    el.textContent = `${g.bySection.team.percent}%`;
  });
  document.querySelectorAll('[data-stat-sub="teams"]').forEach((el) => {
    el.textContent = `${g.bySection.team.owned} / ${g.bySection.team.total}`;
  });

  const teamHeader = document.querySelector('[data-team-header]');
  if (teamHeader) {
    const teamId = teamHeader.getAttribute('data-team-id');
    if (teamId) {
      const tp = teamProgress(collection, teamId);
      if (tp) {
        const pctEl = teamHeader.querySelector('[data-team-header-percent]');
        const bar = teamHeader.querySelector('[data-team-header-bar]') as HTMLElement | null;
        if (pctEl) pctEl.textContent = `${tp.percent}% Completo (${tp.owned} / ${tp.total})`;
        if (bar) bar.style.width = `${tp.percent}%`;
      }
    }
  }

  teams.forEach((t) => updateTeamCard(t.id));
}

function rebuildListPage(type: 'missing' | 'duplicates') {
  const container = document.querySelector(`[data-list-container="${type}"]`);
  if (!container) return;

  if (type === 'missing') {
    const { apertura, museum, teams: teamGroups } = missingBySection(collection);
    const groups = buildMissingGroups(apertura, museum, teamGroups);
    if (groups.length === 0) {
      container.innerHTML = '<p class="text-on-surface-variant">¡Álbum completo! No tienes figuritas faltantes.</p>';
      return;
    }
    container.innerHTML = groups
      .map(
        (g) => `
      <section class="mb-8">
        <h2 class="font-anton mb-3 text-xl uppercase text-primary">${g.title}</h2>
        <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          ${g.stickers.map((s) => `<li class="border-2 border-outline-variant/40 bg-white px-3 py-2 text-sm"><span class="font-bold">${s.code}</span> - ${s.label}</li>`).join('')}
        </ul>
      </section>`,
      )
      .join('');
  } else {
    const dups = globalProgress(collection).duplicates;
    if (dups.length === 0) {
      container.innerHTML = '<p class="text-on-surface-variant">No tienes figuritas repetidas registradas.</p>';
      return;
    }
    container.innerHTML = `
      <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        ${dups.map(({ sticker, extra }) => `<li class="border-2 border-outline-variant/40 bg-white px-3 py-2 text-sm"><span class="font-bold">${sticker.code}</span> - ${sticker.label} <span class="text-tertiary font-bold">(x${extra + 1})</span></li>`).join('')}
      </ul>`;
  }
}

function onCollectionChanged() {
  refreshCollection();
  hydrateStickerSlots();
  updateGlobalStats();
  const missingList = document.querySelector('[data-list-container="missing"]');
  const dupList = document.querySelector('[data-list-container="duplicates"]');
  if (missingList) rebuildListPage('missing');
  if (dupList) rebuildListPage('duplicates');
}

function handleStickerInteraction(el: HTMLElement, shiftKey: boolean) {
  const id = el.dataset.stickerId;
  if (!id) return;
  collection = toggleSticker(collection, id, shiftKey);
  updateSlotEl(el, getCount(collection, id));
  updateGlobalStats();
  scheduleSync();

  const sticker = stickerMap().get(id);
  if (sticker?.teamId) updateTeamCard(sticker.teamId);

  const listType = document.querySelector('[data-list-container]')?.getAttribute('data-list-container');
  if (listType === 'missing' || listType === 'duplicates') {
    rebuildListPage(listType);
  }
}

function handleQuickAdd(input: HTMLInputElement) {
  const teamCode = input.dataset.teamCode;
  const raw = input.value.trim();
  if (!raw) return;

  let sticker: Sticker | undefined;
  const upper = raw.toUpperCase();
  sticker = stickers.find((s) => s.code.toUpperCase() === upper);
  if (!sticker && teamCode) {
    const num = raw.replace(/\D/g, '');
    if (num) sticker = stickers.find((s) => s.code.toUpperCase() === `${teamCode}${num}`);
  }

  if (sticker) {
    collection = increment(collection, sticker.id);
    const el = document.querySelector(`[data-sticker-id="${sticker.id}"]`) as HTMLElement | null;
    if (el) updateSlotEl(el, getCount(collection, sticker.id));
    updateGlobalStats();
    scheduleSync();
    if (sticker.teamId) updateTeamCard(sticker.teamId);
    input.value = '';
  }
}

function applyTeamFilters() {
  const group = (document.querySelector('[data-filter-group]') as HTMLSelectElement | null)?.value ?? '';
  const conf = (document.querySelector('[data-filter-confederation]') as HTMLSelectElement | null)?.value ?? '';

  let visible = 0;
  document.querySelectorAll<HTMLElement>('[data-team-card]').forEach((card) => {
    const matchGroup = !group || card.dataset.group === group;
    const matchConf = !conf || card.dataset.confederation === conf;
    const show = matchGroup && matchConf;
    card.hidden = !show;
    if (show) visible++;
  });

  const counter = document.querySelector('[data-teams-visible]');
  if (counter) counter.textContent = `Mostrando ${visible} de ${teams.length} equipos`;
}

async function handleExport(type: 'missing' | 'duplicates', via: 'copy' | 'whatsapp') {
  let text = '';
  if (type === 'missing') {
    const { apertura, museum, teams: teamGroups } = missingBySection(collection);
    text = formatMissingMessage(buildMissingGroups(apertura, museum, teamGroups));
  } else {
    text = formatDuplicatesMessage(globalProgress(collection).duplicates);
  }

  const feedback = document.querySelector('[data-export-feedback]');
  if (via === 'whatsapp') {
    openWhatsApp(text);
    if (feedback) {
      feedback.textContent = 'Abriendo WhatsApp…';
      feedback.classList.remove('hidden');
    }
  } else {
    const ok = await copyToClipboard(text);
    if (feedback) {
      feedback.textContent = ok ? '¡Copiado al portapapeles!' : 'No se pudo copiar';
      feedback.classList.remove('hidden');
    }
  }
  setTimeout(() => feedback?.classList.add('hidden'), 2500);
}

function init() {
  refreshCollection();
  hydrateStickerSlots();
  updateGlobalStats();
  applyTeamFilters();

  if (isSupabaseConfigured()) {
    document.querySelector('[data-sync-status]')?.classList.remove('hidden');
    void initSyncSession(onCollectionChanged);
  }

  document.querySelector('[data-auth-logout]')?.addEventListener('click', () => {
    void signOut();
  });

  const missingList = document.querySelector('[data-list-container="missing"]');
  const dupList = document.querySelector('[data-list-container="duplicates"]');
  if (missingList) rebuildListPage('missing');
  if (dupList) rebuildListPage('duplicates');

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const slot = target.closest<HTMLElement>('[data-sticker-id]');
    if (slot) {
      e.preventDefault();
      handleStickerInteraction(slot, e.shiftKey);
      return;
    }

    const copyBtn = target.closest<HTMLElement>('[data-export-copy]');
    if (copyBtn) {
      handleExport(copyBtn.dataset.exportCopy as 'missing' | 'duplicates', 'copy');
      return;
    }

    const waBtn = target.closest<HTMLElement>('[data-export-whatsapp]');
    if (waBtn) {
      handleExport(waBtn.dataset.exportWhatsapp as 'missing' | 'duplicates', 'whatsapp');
      return;
    }

    const addBtn = target.closest<HTMLElement>('[data-quick-add-btn]');
    if (addBtn) {
      const input = document.querySelector<HTMLInputElement>('[data-quick-add-input]');
      if (input) handleQuickAdd(input);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = document.activeElement as HTMLInputElement;
      if (input?.matches('[data-quick-add-input]')) {
        e.preventDefault();
        handleQuickAdd(input);
      }
    }
    const slot = (e.target as HTMLElement).closest<HTMLElement>('[data-sticker-id]');
    if (slot && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      handleStickerInteraction(slot, e.shiftKey);
    }
  });

  document.querySelector('[data-filter-group]')?.addEventListener('change', applyTeamFilters);
  document.querySelector('[data-filter-confederation]')?.addEventListener('change', applyTeamFilters);

  document.querySelector('[data-quick-add-input]')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd(e.target as HTMLInputElement);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ponytail: smoke check — fails if catalog count drifts from 980
if (import.meta.env.DEV && stickers.length !== 980) {
  console.warn(`[tracker] expected 980 stickers, got ${stickers.length}`);
}
