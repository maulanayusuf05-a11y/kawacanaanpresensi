import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/i;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  const setupSecret = process.env.SUPERADMIN_SETUP_SECRET || '';
  if (!url || !serviceKey || !setupSecret) return json(res, 500, { error: 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SUPERADMIN_SETUP_SECRET wajib dikonfigurasi di server.' });

  const { setupSecret: suppliedSecret, name, username, email, password } = req.body || {};
  if (!suppliedSecret || suppliedSecret !== setupSecret) return json(res, 403, { error: 'Setup secret tidak valid.' });
  if (!name || !username || !password) return json(res, 400, { error: 'Nama, username, dan password wajib diisi.' });
  if (!USERNAME_RE.test(String(username).trim())) return json(res, 400, { error: 'Username tidak valid.' });
  if (String(password).length < 12) return json(res, 400, { error: 'Password Super Admin minimal 12 karakter.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession:false, autoRefreshToken:false } });
  const { count, error: countError } = await admin.from('profiles').select('id', { count:'exact', head:true }).eq('role','SUPER_ADMIN');
  if (countError) return json(res, 500, { error: countError.message });
  if ((count || 0) > 0) return json(res, 409, { error: 'SUPER ADMIN sudah pernah dibuat. Endpoint setup telah dikunci.' });

  const cleanUsername = String(username).trim().toLowerCase();
  const authEmail = String(email || '').trim().toLowerCase() || `${cleanUsername}@login.edushift.local`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: String(password),
    email_confirm: true,
    user_metadata: { name:String(name).trim(), username:cleanUsername, role:'SUPER_ADMIN' },
  });
  if (authError || !authData.user) return json(res, 400, { error: authError?.message || 'Gagal membuat akun Auth.' });

  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    name:String(name).trim(), username:cleanUsername, email:authEmail,
    role:'SUPER_ADMIN', school_id:null, is_active:true, must_change_password:false,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    if ((profileError as any).code === '23505') return json(res, 409, { error: 'SUPER ADMIN sudah dibuat atau username/email sudah digunakan.' });
    return json(res, 400, { error: profileError.message });
  }

  await admin.from('audit_logs').insert({ actor_id:authData.user.id, actor_name:String(name).trim(), actor_role:'SUPER_ADMIN', action:'BOOTSTRAP_SUPER_ADMIN', details:{username:cleanUsername,email:authEmail} });
  return json(res, 200, { ok:true, message:'SUPER ADMIN berhasil dibuat. Endpoint setup sekarang terkunci.', userId:authData.user.id });
}
