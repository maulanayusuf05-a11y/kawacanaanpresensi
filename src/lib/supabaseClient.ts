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

export const appOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  return configured?.replace(/\/$/, '') || undefined;
};

export const getAuthRedirectUrl = () => {
  const origin = appOrigin();
  if (!origin) return undefined;
  // Gunakan origin bersih agar cocok dengan whitelist Supabase Redirect URLs
  return `${origin}/`;
};

export const extractTokensFromUrl = (
  urlStringOrHash: string
): { accessToken: string; refreshToken: string } | null => {
  try {
    let clean = urlStringOrHash.trim();
    if (!clean) return null;

    // Jika user menempelkan full URL atau hash
    if (clean.includes('#')) {
      clean = clean.split('#')[1];
    } else if (clean.includes('?')) {
      clean = clean.split('?')[1];
    }

    const params = new URLSearchParams(clean);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      return {
        accessToken,
        refreshToken: refreshToken || accessToken,
      };
    }

    // Jika user menempelkan raw JWT token
    if (clean.startsWith('eyJ') && clean.length > 50) {
      return {
        accessToken: clean,
        refreshToken: clean,
      };
    }

    return null;
  } catch (_) {
    return null;
  }
};

export const setSessionFromTokenOrUrl = async (tokenOrUrl: string) => {
  const tokens = extractTokensFromUrl(tokenOrUrl);
  if (!tokens || !tokens.accessToken) {
    throw new Error('Token atau URL tidak valid. Pastikan Anda menyalin seluruh URL yang memuat access_token=');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) throw error;
  return data;
};

export const signInWithGoogle = () => {
  const redirectUrl = getAuthRedirectUrl();
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: appOrigin() ? `${appOrigin()}/reset-password` : undefined,
  });


