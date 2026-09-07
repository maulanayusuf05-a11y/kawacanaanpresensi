import { createClient, SupabaseClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'KEPALA SEKOLAH', 'GURU MAPEL'];

async function reconcileTeacherAssignments(
  admin: SupabaseClient,
  schoolId: string,
  academicYear: string = '2026/2027'
) {
  if (!schoolId) return { ok: false, count: 0, error: 'school_id wajib diisi' };

  try {
    const { data: classes } = await admin
      .from('classes')
      .select('id, school_id, academic_year, wali_kelas_teacher_id')
      .eq('school_id', schoolId)
      .not('wali_kelas_teacher_id', 'is', null);

    const [{ data: sta }, { data: sca }] = await Promise.all([
      admin
        .from('subject_teacher_assignments')
        .select('school_id, subject_id, teacher_id, academic_year')
        .eq('school_id', schoolId),
      admin
        .from('subject_class_assignments')
        .select('school_id, subject_id, class_id, academic_year')
        .eq('school_id', schoolId),
    ]);

    const unifiedRows: Array<{
      school_id: string;
      teacher_id: string;
      role: 'WALI_KELAS' | 'GURU_MAPEL';
      class_id: string | null;
      subject_id: string | null;
      academic_year: string;
      is_active: boolean;
    }> = [];

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

    const scaBySubject = new Map<string, string[]>();
    for (const row of sca || []) {
      if (!row.subject_id || !row.class_id) continue;
      const list = scaBySubject.get(row.subject_id) || [];
      list.push(row.class_id);
      scaBySubject.set(row.subject_id, list);
    }

    for (const row of sta || []) {
      if (!row.teacher_id || !row.subject_id) continue;
      const targetClasses = scaBySubject.get(row.subject_id) || [];
      if (targetClasses.length === 0) {
        unifiedRows.push({
          school_id: row.school_id,
          teacher_id: row.teacher_id,
          role: 'GURU_MAPEL',
          class_id: null,
          subject_id: row.subject_id,
          academic_year: row.academic_year || academicYear,
          is_active: true,
        });
      } else {
        for (const classId of targetClasses) {
          unifiedRows.push({
            school_id: row.school_id,
            teacher_id: row.teacher_id,
            role: 'GURU_MAPEL',
            class_id: classId,
            subject_id: row.subject_id,
            academic_year: row.academic_year || academicYear,
            is_active: true,
          });
        }
      }
    }

    const uniqueMap = new Map<string, (typeof unifiedRows)[0]>();
    for (const r of unifiedRows) {
      const key = `${r.school_id}|${r.teacher_id}|${r.role}|${r.class_id || 'null'}|${r.subject_id || 'null'}|${r.academic_year}`;
      uniqueMap.set(key, r);
    }
    const dedupedRows = Array.from(uniqueMap.values());

    await admin.from('teacher_assignments').delete().eq('school_id', schoolId);
    if (dedupedRows.length > 0) {
      await admin.from('teacher_assignments').insert(dedupedRows);
    }

    return { ok: true, count: dedupedRows.length };
  } catch (err: any) {
    return { ok: false, count: 0, error: err?.message };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Metode permintaan tidak diizinkan. Gunakan POST.' });
  }

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) {
    return json(res, 500, { error: 'Konfigurasi SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum terpasang.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(res, 401, { error: 'Sesi login tidak ditemukan.' });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
  }

  const userId = authData.user.id;
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, role, school_id, teacher_id, username, name')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return json(res, 403, { error: 'Profil pengguna tidak ditemukan.' });
  }

  if (!ALLOWED_ROLES.includes(profile.role)) {
    return json(res, 403, { error: 'Role pengguna Anda tidak memiliki wewenang mengelola mata pelajaran.' });
  }

  const body = req.body || {};
  const action = body.action || 'save_subject';
  const schoolId = body.schoolId || profile.school_id;

  if (!schoolId) {
    return json(res, 400, { error: 'ID sekolah aktif tidak ditemukan.' });
  }

  if (profile.role !== 'SUPER_ADMIN' && profile.school_id && profile.school_id !== schoolId) {
    return json(res, 403, { error: 'Akses ke data sekolah tersebut tidak diizinkan.' });
  }

  const academicYear = String(body.academicYear || '2026/2027').trim();

  try {
    if (action === 'save_subject') {
      const subjectName = String(body.name || '').trim();
      if (!subjectName) {
        return json(res, 400, { error: 'Nama mata pelajaran wajib diisi.' });
      }

      const subjectCode = (String(body.code || '').trim() || subjectName.slice(0, 4)).toUpperCase();
      const targetClassIds: string[] = Array.isArray(body.targetClassIds) ? body.targetClassIds : [];
      const scheduleDays: string[] = Array.isArray(body.scheduleDays) ? body.scheduleDays : [];
      const classSchedules: Array<{ classId: string; className?: string; days: string[] }> =
        Array.isArray(body.classSchedules) ? body.classSchedules : [];

      let teacherId = body.teacherId || null;

      // Jika role Guru Mapel dan belum ada teacherId, hubungkan otomatis ke data guru miliknya
      if (!teacherId && profile.role === 'GURU MAPEL') {
        if (profile.teacher_id) {
          teacherId = profile.teacher_id;
        } else {
          // Cari data guru berdasarkan NIP (username) atau nama
          const { data: matchedTeachers } = await admin
            .from('teachers')
            .select('id, nama, nip')
            .eq('school_id', schoolId);

          const found = (matchedTeachers || []).find(
            (t) => (t.nip && t.nip === profile.username) || (t.nama && t.nama.toLowerCase() === profile.name.toLowerCase())
          );
          if (found) {
            teacherId = found.id;
            await admin.from('profiles').update({ teacher_id: found.id }).eq('id', profile.id);
          }
        }
      }

      let subjectId = body.id || null;

      if (subjectId) {
        // 1. Update data dasar subjek
        const { error: updErr } = await admin
          .from('subjects')
          .update({
            name: subjectName,
            code: subjectCode,
            is_specialized: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subjectId)
          .eq('school_id', schoolId);

        if (updErr) throw updErr;
      } else {
        // 1. Tambahkan subjek baru
        const { data: newSub, error: insErr } = await admin
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: subjectName,
            code: subjectCode,
            is_specialized: true,
          })
          .select('id')
          .single();

        if (insErr) throw insErr;
        subjectId = newSub.id;
      }

      // 2. Perbarui penugasan guru pengajar (subject_teacher_assignments)
      if (teacherId) {
        await admin
          .from('subject_teacher_assignments')
          .delete()
          .eq('school_id', schoolId)
          .eq('subject_id', subjectId)
          .eq('academic_year', academicYear);

        const { error: insTeacherErr } = await admin
          .from('subject_teacher_assignments')
          .insert({
            school_id: schoolId,
            subject_id: subjectId,
            teacher_id: teacherId,
            academic_year: academicYear,
          });

        if (insTeacherErr) {
          console.warn('[teacher-subject] Warning saat menyimpan subject_teacher_assignments:', insTeacherErr.message);
        }
      }

      // 3. Perbarui kelas sasaran KBM (subject_class_assignments)
      await admin
        .from('subject_class_assignments')
        .delete()
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId)
        .eq('academic_year', academicYear);

      if (targetClassIds.length > 0) {
        const scaRows = targetClassIds.map((cid) => ({
          school_id: schoolId,
          subject_id: subjectId,
          class_id: cid,
          academic_year: academicYear,
        }));

        const { error: insClassErr } = await admin
          .from('subject_class_assignments')
          .insert(scaRows);

        if (insClassErr) {
          console.warn('[teacher-subject] Warning saat menyimpan subject_class_assignments:', insClassErr.message);
        }
      }

      // 4. Perbarui jadwal hari (subject_schedule_days)
      await admin
        .from('subject_schedule_days')
        .delete()
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId);

      const scheduleInserts: Array<{
        school_id: string;
        subject_id: string;
        day_of_week: string;
        lesson_period: string | null;
      }> = [];

      if (classSchedules.length > 0) {
        classSchedules.forEach((cs) => {
          (cs.days || []).forEach((d) => {
            scheduleInserts.push({
              school_id: schoolId,
              subject_id: subjectId,
              day_of_week: d,
              lesson_period: `cls:${cs.classId}`,
            });
          });
        });
      } else if (scheduleDays.length > 0) {
        scheduleDays.forEach((d) => {
          scheduleInserts.push({
            school_id: schoolId,
            subject_id: subjectId,
            day_of_week: d,
            lesson_period: null,
          });
        });
      }

      if (scheduleInserts.length > 0) {
        const { error: insSchedErr } = await admin
          .from('subject_schedule_days')
          .insert(scheduleInserts);

        if (insSchedErr) {
          console.warn('[teacher-subject] Warning saat menyimpan subject_schedule_days:', insSchedErr.message);
        }
      }

      // 5. Rekonsiliasi tabel terpadu teacher_assignments di latar belakang
      try {
        await reconcileTeacherAssignments(admin, schoolId, academicYear);
      } catch (recErr: any) {
        console.warn('[teacher-subject] Warning saat rekonsiliasi penugasan:', recErr?.message);
      }

      return json(res, 200, {
        ok: true,
        subjectId,
        message: `Mata pelajaran ${subjectName} berhasil disimpan.`,
      });
    }

    if (action === 'delete_subject') {
      const subjectId = body.id;
      if (!subjectId) {
        return json(res, 400, { error: 'ID mata pelajaran wajib disertakan.' });
      }

      // Bersihkan seluruh data berelasi
      await admin.from('subject_schedule_days').delete().eq('subject_id', subjectId).eq('school_id', schoolId);
      await admin.from('subject_class_assignments').delete().eq('subject_id', subjectId).eq('school_id', schoolId);
      await admin.from('subject_teacher_assignments').delete().eq('subject_id', subjectId).eq('school_id', schoolId);

      const { error: delErr } = await admin
        .from('subjects')
        .delete()
        .eq('id', subjectId)
        .eq('school_id', schoolId);

      if (delErr) throw delErr;

      try {
        await reconcileTeacherAssignments(admin, schoolId, academicYear);
      } catch (recErr: any) {
        console.warn('[teacher-subject] Warning saat rekonsiliasi hapus:', recErr?.message);
      }

      return json(res, 200, {
        ok: true,
        message: 'Mata pelajaran berhasil dihapus.',
      });
    }

    return json(res, 400, { error: `Aksi ${action} tidak dikenali.` });
  } catch (err: any) {
    console.error('[teacher-subject] Error:', err);
    return json(res, 500, {
      error: err?.message || 'Terjadi kesalahan sistem saat menyimpan mata pelajaran.',
    });
  }
}
