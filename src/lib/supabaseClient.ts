import { supabase, usernameToEmail } from './supabase';

export { supabase };

export const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder') && key !== 'your-anon-key' && key !== 'placeholder-anon-key');
};

export const signInWithEmail = async (identifier: string, password: string) => {
  const value = identifier.trim().toLowerCase();
  if (value.includes('@')) return supabase.auth.signInWithPassword({ email: value, password });
  const first = await supabase.auth.signInWithPassword({ email: usernameToEmail(value), password });
  if (!first.error) return first;
  try {
    const resolved = await fetch('/api/resolve-login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:value}) });
    const body = await resolved.json();
    if (resolved.ok && body.email && body.email !== usernameToEmail(value)) return supabase.auth.signInWithPassword({ email: body.email, password });
  } catch (_) {}
  return first;
};

const appOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  return configured?.replace(/\/$/, '') || undefined;
};

export const signInWithGoogle = () => {
  const origin = appOrigin();
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin ? `${origin}?page=login` : undefined,
    },
  });
};

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: appOrigin() ? `${appOrigin()}/reset-password` : undefined,
  });


