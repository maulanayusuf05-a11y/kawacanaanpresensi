import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const cleanNip = (value: unknown) => String(value || '').replace(/\D/g, '');
const cleanName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Metode permintaan tidak diizinkan.' });

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) return json(res, 500, { error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia di Vercel.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(res, 401, { error: 'Sesi login tidak ditemukan.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json(res, 401, { error: 'Sesi login tidak valid.' });

  const userId = authData.user.id;
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,school_id,name,username,role,teacher_id')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) return json(res, 400, { error: profileError.message });
  if (!profile) return json(res, 404, { error: 'Profil pengguna tidak ditemukan.' });
  if (profile.role !== 'WALI KELAS') return json(res, 403, { error: 'Endpoint ini hanya untuk akun WALI KELAS.' });
  if (!profile.school_id) return json(res, 400, { error: 'Akun WALI KELAS belum memiliki sekolah aktif.' });

  let teacher: any = null;
  if (profile.teacher_id) {
    const { data } = await admin.from('teachers')
      .select('id,school_id,nama,nip,tugas_utama')
      .eq('id', profile.teacher_id)
      .eq('school_id', profile.school_id)
      .maybeSingle();
    teacher = data;
  }

  if (!teacher) {
    const nip = cleanNip(profile.username);
    if (nip.length >= 8) {
      const { data } = await admin.from('teachers')
        .select('id,school_id,nama,nip,tugas_utama')
        .eq('school_id', profile.school_id)
        .eq('nip', profile.username.trim())
        .maybeSingle();
      teacher = data;
    }
  }

  if (!teacher && profile.name) {
    const normalized = cleanName(profile.name);
    const { data: teachers } = await admin.from('teachers')
      .select('id,school_id,nama,nip,tugas_utama')
      .eq('school_id', profile.school_id);
    teacher = (teachers || []).find((t: any) => cleanName(t.nama) === normalized) || null;
  }

  if (!teacher) return json(res, 422, { error: 'Data guru untuk akun WALI KELAS tidak ditemukan pada sekolah aktif.' });
  if (teacher.tugas_utama && String(teacher.tugas_utama).toLowerCase() !== 'wali kelas') {
    return json(res, 422, { error: 'Data guru yang ditemukan bukan berstatus Wali Kelas.' });
  }

  if (profile.teacher_id !== teacher.id) {
    const { error: linkError } = await admin.from('profiles')
      .update({ teacher_id: teacher.id })
      .eq('id', userId)
      .eq('school_id', profile.school_id);
    if (linkError) return json(res, 400, { error: `Gagal menghubungkan akun ke data guru: ${linkError.message}` });
  }

  return json(res, 200, { ok: true, teacherId: teacher.id, teacherName: teacher.nama });
}
