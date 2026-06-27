import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { migrateOnAuth } from '../lib/sync';

function showError(msg: string) {
  const el = document.querySelector('[data-auth-error]');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function clearError() {
  const el = document.querySelector('[data-auth-error]');
  if (el) {
    el.textContent = '';
    el.classList.add('hidden');
  }
}

async function handleLogin(e: Event) {
  e.preventDefault();
  clearError();
  const form = e.target as HTMLFormElement;
  const email = (form.querySelector('[name="email"]') as HTMLInputElement).value.trim();
  const password = (form.querySelector('[name="password"]') as HTMLInputElement).value;

  const supabase = getSupabase();
  if (!supabase) {
    showError('Supabase no configurado. Revisa las variables de entorno.');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showError(error.message);
    return;
  }

  if (data.user) {
    await migrateOnAuth(data.user.id);
    window.location.href = '/';
  }
}

async function handleRegister(e: Event) {
  e.preventDefault();
  clearError();
  const form = e.target as HTMLFormElement;
  const email = (form.querySelector('[name="email"]') as HTMLInputElement).value.trim();
  const password = (form.querySelector('[name="password"]') as HTMLInputElement).value;

  const supabase = getSupabase();
  if (!supabase) {
    showError('Supabase no configurado. Revisa las variables de entorno.');
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showError(error.message);
    return;
  }

  const userId = data.session?.user?.id ?? (await trySignIn(supabase, email, password));
  if (userId) {
    await migrateOnAuth(userId);
    window.location.href = '/';
    return;
  }

  showError(
    'Cuenta creada. Revisa tu correo para confirmar, o desactiva "Confirm email" en Supabase → Auth → Email.',
  );
}

async function trySignIn(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  email: string,
  password: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return null;
  return data.user?.id ?? null;
}

function init() {
  if (!isSupabaseConfigured()) {
    showError('Configura PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY para usar la nube.');
  }

  document.querySelector('[data-auth-form="login"]')?.addEventListener('submit', handleLogin);
  document.querySelector('[data-auth-form="register"]')?.addEventListener('submit', handleRegister);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
