import { emptyCollection, loadCollection, saveCollection } from './collection';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Collection } from './types';

export const MIGRATED_KEY = 'panini-2026-migrated';

export type SyncStatus = 'offline' | 'local' | 'pending' | 'synced' | 'error';

let currentStatus: SyncStatus = 'local';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

function setStatus(status: SyncStatus) {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
  updateSyncUI(status);
}

function updateSyncUI(status: SyncStatus) {
  const el = document.querySelector('[data-sync-status]');
  if (!el) return;
  const labels: Record<SyncStatus, string> = {
    offline: 'Sin conexión',
    local: 'Solo local',
    pending: 'Sincronizando…',
    synced: 'Sincronizado',
    error: 'Error de sync',
  };
  el.textContent = labels[status];
  el.setAttribute('data-sync-state', status);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(cb: (status: SyncStatus) => void): () => void {
  statusListeners.add(cb);
  cb(currentStatus);
  return () => statusListeners.delete(cb);
}

export function mergeCollections(local: Collection, remote: Collection): Collection {
  const merged = { ...remote };
  for (const [id, count] of Object.entries(local)) {
    merged[id] = Math.max(merged[id] ?? 0, count);
  }
  return merged;
}

async function pullRemote(userId: string): Promise<Collection> {
  const supabase = getSupabase();
  if (!supabase) return emptyCollection();

  const { data, error } = await supabase
    .from('collections')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.data as Collection) ?? emptyCollection();
}

async function pushRemote(userId: string, collection: Collection): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('collections').upsert({
    user_id: userId,
    data: collection,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function migrateOnAuth(userId: string): Promise<Collection> {
  const local = loadCollection();
  const remote = await pullRemote(userId);

  const localKeys = Object.keys(local).length;
  const remoteKeys = Object.keys(remote).length;

  let merged: Collection;
  if (localKeys === 0 && remoteKeys === 0) merged = emptyCollection();
  else if (localKeys > 0 && remoteKeys === 0) merged = local;
  else if (localKeys === 0 && remoteKeys > 0) merged = remote;
  else merged = mergeCollections(local, remote);

  saveCollection(merged);
  await pushRemote(userId, merged);
  localStorage.setItem(MIGRATED_KEY, 'true');
  setStatus('synced');
  return merged;
}

export function scheduleSync(): void {
  if (!isSupabaseConfigured()) return;
  setStatus('pending');
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void flushSync(), 800);
}

async function flushSync(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    setStatus('local');
    return;
  }

  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    setStatus('local');
    return;
  }

  try {
    const local = loadCollection();
    const remote = await pullRemote(session.user.id);
    const merged = mergeCollections(local, remote);
    if (Object.keys(merged).length !== Object.keys(local).length ||
        Object.entries(merged).some(([id, n]) => local[id] !== n)) {
      saveCollection(merged);
      window.dispatchEvent(new CustomEvent('collection-synced'));
    }
    await pushRemote(session.user.id, merged);
    setStatus('synced');
  } catch {
    setStatus('error');
  }
}

export async function updateAuthUI(): Promise<void> {
  const supabase = getSupabase();
  const loginEl = document.querySelector('[data-auth-login]');
  const userEl = document.querySelector('[data-auth-user]');
  const emailEl = document.querySelector('[data-auth-email]');
  const banner = document.querySelector('[data-sync-banner]');

  if (!supabase) {
    banner?.classList.add('hidden');
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const loggedIn = Boolean(session?.user);

  loginEl?.classList.toggle('hidden', loggedIn);
  userEl?.classList.toggle('hidden', !loggedIn);
  banner?.classList.toggle('hidden', loggedIn || !isSupabaseConfigured());

  if (session?.user && emailEl) {
    emailEl.textContent = session.user.email ?? '';
  }
}

export async function initSyncSession(onCollectionUpdated?: () => void): Promise<void> {
  if (!isSupabaseConfigured()) {
    setStatus('local');
    await updateAuthUI();
    return;
  }

  const supabase = getSupabase()!;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      await migrateOnAuth(session.user.id);
      onCollectionUpdated?.();
    } catch {
      setStatus('error');
    }
  } else {
    setStatus('local');
  }

  await updateAuthUI();

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    if (event === 'SIGNED_IN' && newSession?.user) {
      try {
        await migrateOnAuth(newSession.user.id);
        onCollectionUpdated?.();
      } catch {
        setStatus('error');
      }
    } else if (event === 'SIGNED_OUT') {
      setStatus('local');
    }
    await updateAuthUI();
  });

  window.addEventListener('online', () => {
    if (getSyncStatus() === 'offline') scheduleSync();
  });
  window.addEventListener('offline', () => setStatus('offline'));
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
  await updateAuthUI();
}
