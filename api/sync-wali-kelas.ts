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
    .select('id,school_id,name,username,role,teacher_id,class_ids,nip')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) return json(res, 400, { error: profileError.message });
  if (!profile) return json(res, 404, { error: 'Profil pengguna tidak ditemukan.' });
  if (!profile.school_id) return json(res, 400, { error: 'Akun belum memiliki sekolah aktif.' });

  const targetClassId = req.body?.classId || (Array.isArray(profile.class_ids) && profile.class_ids.length > 0 ? profile.class_ids[0] : null);

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

  if (!teacher && profile.nip) {
    const profNip = cleanNip(profile.nip);
    if (profNip) {
      const { data } = await admin.from('teachers')
        .select('id,school_id,nama,nip,tugas_utama')
        .eq('school_id', profile.school_id)
        .eq('nip', profile.nip.trim())
        .maybeSingle();
      teacher = data;
    }
  }

  if (!teacher && profile.name) {
    const normalized = cleanName(profile.name);
    const { data: teachers } = await admin.from('teachers')
      .select('id,school_id,nama,nip,tugas_utama')
      .eq('school_id', profile.school_id);
    teacher = (teachers || []).find((t: any) => {
      const cleanT = cleanName(t.nama);
      return cleanT === normalized || (normalized.length >= 4 && (cleanT.includes(normalized) || normalized.includes(cleanT)));
    }) || null;
  }

  // Jika guru belum ada di database, auto-create agar relasi ID guru tidak pernah null
  if (!teacher) {
    const cleanUsernameNip = cleanNip(profile.username);
    const resolvedNip = cleanUsernameNip.length >= 8 ? profile.username.trim() : (profile.nip ? String(profile.nip).trim() : null);
    const { data: newTeacher, error: insertError } = await admin.from('teachers').insert({
      school_id: profile.school_id,
      nama: profile.name || profile.username || 'Wali Kelas',
      nip: resolvedNip,
      tugas_utama: profile.role === 'GURU MAPEL' ? 'Guru Mapel' : 'Wali Kelas',
      jenis_kelamin: 'L',
    }).select('id,school_id,nama,nip,tugas_utama').single();

    if (!insertError && newTeacher) {
      teacher = newTeacher;
    }
  }

  if (!teacher) {
    return json(res, 500, { error: 'Gagal membuat atau menemukan data guru untuk akun ini.' });
  }

  // Update profile jika teacher_id belum sinkron
  if (profile.teacher_id !== teacher.id) {
    await admin.from('profiles')
      .update({ teacher_id: teacher.id })
      .eq('id', userId)
      .eq('school_id', profile.school_id);
  }

  // Hubungkan kelas yang dipilih atau yang bersesuaian dengan guru wali kelas ini
  if (targetClassId) {
    await admin.from('classes')
      .update({
        wali_kelas_teacher_id: teacher.id,
        wali_kelas_name: teacher.nama || profile.name,
      })
      .eq('id', targetClassId)
      .eq('school_id', profile.school_id);
  }

  // Cek kelas lain yang mungkin ditugaskan ke guru ini
  const { data: allClasses } = await admin
    .from('classes')
    .select('id,name,wali_kelas_name,wali_kelas_teacher_id')
    .eq('school_id', profile.school_id);

  if (allClasses && allClasses.length > 0) {
    for (const cls of allClasses) {
      const nameMatch = cls.wali_kelas_name && (
        cleanName(cls.wali_kelas_name) === cleanName(profile.name) ||
        cleanName(cls.wali_kelas_name) === cleanName(teacher.nama)
      );
      const idMatch = Array.isArray(profile.class_ids) && profile.class_ids.includes(cls.id);
      if ((nameMatch || idMatch) && cls.wali_kelas_teacher_id !== teacher.id) {
        await admin.from('classes')
          .update({
            wali_kelas_teacher_id: teacher.id,
            wali_kelas_name: teacher.nama || profile.name,
          })
          .eq('id', cls.id)
          .eq('school_id', profile.school_id);
      }
    }
  }

  return json(res, 200, {
    ok: true,
    teacherId: teacher.id,
    teacherName: teacher.nama,
    classId: targetClassId || null,
  });
}
