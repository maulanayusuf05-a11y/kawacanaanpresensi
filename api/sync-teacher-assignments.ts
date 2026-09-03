import { createClient, SupabaseClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

export async function reconcileTeacherAssignments(
  admin: SupabaseClient,
  schoolId: string,
  academicYear: string = '2026/2027'
) {
  if (!schoolId) return { ok: false, count: 0, error: 'school_id wajib diisi' };

  // 1. Ambil seluruh kelas yang memiliki wali kelas
  const { data: classes, error: classErr } = await admin
    .from('classes')
    .select('id, school_id, academic_year, wali_kelas_teacher_id')
    .eq('school_id', schoolId)
    .not('wali_kelas_teacher_id', 'is', null);

  if (classErr) return { ok: false, count: 0, error: classErr.message };

  // 2. Ambil penugasan Guru Mapel (guru <-> mapel dan mapel <-> kelas)
  const [{ data: sta, error: staErr }, { data: sca, error: scaErr }] = await Promise.all([
    admin
      .from('subject_teacher_assignments')
      .select('school_id, subject_id, teacher_id, academic_year')
      .eq('school_id', schoolId),
    admin
      .from('subject_class_assignments')
      .select('school_id, subject_id, class_id, academic_year')
      .eq('school_id', schoolId),
  ]);

  if (staErr) return { ok: false, count: 0, error: staErr.message };
  if (scaErr) return { ok: false, count: 0, error: scaErr.message };

  const unifiedRows: Array<{
    school_id: string;
    teacher_id: string;
    role: 'WALI_KELAS' | 'GURU_MAPEL';
    class_id: string | null;
    subject_id: string | null;
    academic_year: string;
    is_active: boolean;
  }> = [];

  // Baris penugasan Wali Kelas
  for (const c of classes || []) {
    if (c.wali_kelas_teacher_id) {
      unifiedRows.push({
        school_id: c.school_id,
        teacher_id: c.wali_kelas_teacher_id,
        role: 'WALI_KELAS',
        class_id: c.id,
        subject_id: null,
        academic_year: c.academic_year || academicYear,
        is_active: true,
      });
    }
  }

  // Baris penugasan Guru Mapel
  for (const st of sta || []) {
    const matchedClasses = (sca || []).filter((sc) => sc.subject_id === st.subject_id);
    if (matchedClasses.length > 0) {
      for (const mc of matchedClasses) {
        unifiedRows.push({
          school_id: st.school_id,
          teacher_id: st.teacher_id,
          role: 'GURU_MAPEL',
          class_id: mc.class_id,
          subject_id: st.subject_id,
          academic_year: st.academic_year || academicYear,
          is_active: true,
        });
      }
    } else {
      unifiedRows.push({
        school_id: st.school_id,
        teacher_id: st.teacher_id,
        role: 'GURU_MAPEL',
        class_id: null,
        subject_id: st.subject_id,
        academic_year: st.academic_year || academicYear,
        is_active: true,
      });
    }
  }

  // Hapus data penugasan lama di teacher_assignments untuk sekolah ini
  const { error: delErr } = await admin
    .from('teacher_assignments')
    .delete()
    .eq('school_id', schoolId);

  if (delErr) {
    console.warn('[syncTeacherAssignments] Gagal menghapus data lama di teacher_assignments:', delErr.message);
  }

  let insertedCount = 0;
  if (unifiedRows.length > 0) {
    const { data: inserted, error: insErr } = await admin
      .from('teacher_assignments')
      .insert(unifiedRows)
      .select('id');

    if (insErr) {
      console.error('[syncTeacherAssignments] Gagal insert ke teacher_assignments:', insErr.message);
      return { ok: false, count: 0, error: insErr.message };
    }
    insertedCount = inserted?.length || 0;
  }

  return { ok: true, count: insertedCount, error: null };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Metode permintaan tidak diizinkan.' });
  }

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) {
    return json(res, 500, { error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(res, 401, { error: 'Sesi login tidak ditemukan.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json(res, 401, { error: 'Sesi login tidak valid.' });

  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role')
    .eq('id', authData.user.id)
    .maybeSingle();

  const schoolId = req.body.schoolId || req.body.school_id || profile?.school_id;
  if (!schoolId) {
    return json(res, 400, { error: 'ID sekolah tidak ditemukan.' });
  }

  const academicYear = req.body.academicYear || req.body.academic_year || '2026/2027';
  const result = await reconcileTeacherAssignments(admin, schoolId, academicYear);

  if (!result.ok) {
    return json(res, 400, { error: result.error || 'Gagal merekonsiliasi penugasan guru.' });
  }

  return json(res, 200, {
    ok: true,
    message: `Berhasil merekonsiliasi ${result.count} penugasan guru ke tabel terpadu teacher_assignments.`,
    count: result.count,
  });
}
