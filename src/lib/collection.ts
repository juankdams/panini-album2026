import type { Collection } from './types';
import { STORAGE_KEY } from './catalog';

export function emptyCollection(): Collection {
  return {};
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function loadLocal(): Collection {
  if (!isBrowser()) return emptyCollection();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCollection();
    const parsed = JSON.parse(raw) as Collection;
    return typeof parsed === 'object' && parsed !== null ? parsed : emptyCollection();
  } catch {
    return emptyCollection();
  }
}

export function saveLocal(collection: Collection): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

/** @alias loadLocal */
export const loadCollection = loadLocal;

/** @alias saveLocal */
export const saveCollection = saveLocal;

export function getCount(collection: Collection, stickerId: string): number {
  return collection[stickerId] ?? 0;
}

export function setCount(collection: Collection, stickerId: string, count: number): Collection {
  const next = { ...collection };
  if (count <= 0) {
    delete next[stickerId];
  } else {
    next[stickerId] = count;
  }
  saveLocal(next);
  return next;
}

export function increment(collection: Collection, stickerId: string): Collection {
  return setCount(collection, stickerId, getCount(collection, stickerId) + 1);
}

export function decrement(collection: Collection, stickerId: string): Collection {
  return setCount(collection, stickerId, getCount(collection, stickerId) - 1);
}

export function toggleSticker(collection: Collection, stickerId: string, shiftKey = false): Collection {
  const count = getCount(collection, stickerId);
  if (shiftKey) {
    return count > 0 ? decrement(collection, stickerId) : collection;
  }
  if (count === 0) return setCount(collection, stickerId, 1);
  return increment(collection, stickerId);
}
