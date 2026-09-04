import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const ALLOWED_ROLES = ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SUPER_ADMIN'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Metode permintaan tidak diizinkan. Gunakan POST.' });

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) {
    return json(res, 500, { error: 'Konfigurasi server SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum terpasang di Vercel/lingkungan.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(res, 401, { error: 'Sesi login tidak ditemukan.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });

  const userId = authData.user.id;
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, role, school_id, teacher_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return json(res, 403, { error: 'Profil pengguna tidak ditemukan.' });
  }

  const body = req.body || {};
  const action = body.action || 'save_daily';
  const targetSchoolId = body.schoolId || profile.school_id;

  if (profile.role !== 'SUPER_ADMIN' && targetSchoolId && profile.school_id && profile.school_id !== targetSchoolId) {
    return json(res, 403, { error: 'Akses ke data sekolah tidak diizinkan.' });
  }

  try {
    if (action === 'save_daily') {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        return json(res, 403, { error: 'Role pengguna Anda tidak memiliki hak akses mencatat absensi.' });
      }

      const { date, type, subjectId, targetStudentIds, payload } = body;
      if (!date) return json(res, 400, { error: 'Tanggal absensi wajib disertakan.' });

      // 1. Bersihkan record absensi lama untuk siswa target pada tanggal & moda tersebut
      if (Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
        let del = admin
          .from('attendance_records')
          .delete()
          .eq('date', date)
          .eq('type', type || 'DAILY')
          .in('student_id', targetStudentIds);

        if (targetSchoolId) {
          del = del.eq('school_id', targetSchoolId);
        }
        if (type === 'SUBJECT' && subjectId) {
          del = del.eq('subject_id', subjectId);
        }
        const { error: delError } = await del;
        if (delError) {
          return json(res, 500, { error: `Gagal membersihkan data lama: ${delError.message}` });
        }
      }

      // 2. Simpan record absensi baru
      if (Array.isArray(payload) && payload.length > 0) {
        const normalizedPayload = payload.map((r: any) => ({
          ...r,
          school_id: targetSchoolId || r.school_id || profile.school_id,
          updated_by: userId,
        }));

        const { data: inserted, error: insertError } = await admin
          .from('attendance_records')
          .insert(normalizedPayload)
          .select('id');

        if (insertError) {
          return json(res, 500, { error: `Gagal menyimpan data absensi: ${insertError.message}` });
        }

        return json(res, 200, { ok: true, count: inserted?.length || normalizedPayload.length });
      }

      return json(res, 200, { ok: true, count: 0, message: 'Data absensi berhasil direset.' });
    }

    if (action === 'submit_student') {
      const { payload, existingId } = body;
      if (!payload) return json(res, 400, { error: 'Payload absensi wajib disertakan.' });

      const normalizedPayload = {
        ...payload,
        school_id: targetSchoolId || payload.school_id || profile.school_id,
        updated_by: userId,
      };

      if (existingId) {
        const { data, error } = await admin
          .from('attendance_records')
          .update(normalizedPayload)
          .eq('id', existingId)
          .select()
          .single();
        if (error) return json(res, 500, { error: error.message });
        return json(res, 200, { ok: true, record: data });
      } else {
        const { data, error } = await admin
          .from('attendance_records')
          .insert(normalizedPayload)
          .select()
          .single();
        if (error) return json(res, 500, { error: error.message });
        return json(res, 200, { ok: true, record: data });
      }
    }

    return json(res, 400, { error: 'Aksi tidak dikenali.' });
  } catch (err: any) {
    return json(res, 500, { error: err?.message || 'Terjadi kesalahan pada server saat memproses absensi.' });
  }
}
