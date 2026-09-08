import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const ALLOWED_ROLES = ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SISWA'] as const;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/i;
const PASSWORD_MIN = 8;

type Role = typeof ALLOWED_ROLES[number];

async function reconcileTeacherAssignments(
  admin: any,
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

    for (const st of sta || []) {
      const matchedClasses = (sca || []).filter((sc: any) => sc.subject_id === st.subject_id);
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

    await admin.from('teacher_assignments').delete().eq('school_id', schoolId);
    if (unifiedRows.length > 0) {
      await admin.from('teacher_assignments').insert(unifiedRows);
    }
    return { ok: true, count: unifiedRows.length };
  } catch (err: any) {
    return { ok: false, count: 0, error: err?.message };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Metode permintaan tidak diizinkan.' });

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) return json(res, 500, { error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia di Vercel.' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(res, 401, { error: 'Sesi login tidak ditemukan.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller.user) return json(res, 401, { error: 'Sesi login tidak valid.' });

  const { data: profile } = await admin
    .from('profiles')
    .select('id,role,school_id,name,username')
    .eq('id', caller.user.id)
    .maybeSingle();

  // Role dapat bersumber dari profiles ataupun auth user_metadata jika sedang dalam sesi workspace sekolah
  const callerRole = String(
    profile?.role ||
    caller.user.user_metadata?.school_workspace_role ||
    caller.user.user_metadata?.role ||
    ''
  ).trim().toUpperCase();

  const isAuthorizedAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN SEKOLAH'].includes(callerRole);
  if (!isAuthorizedAdmin) {
    return json(res, 403, { error: 'Hanya ADMIN sekolah atau SUPER ADMIN yang dapat mengelola akun.' });
  }

  const body = req.body || {};
  const action = body.action;
  const role = body.role as Role | undefined;
  const callerSchoolId = profile?.school_id || caller.user.user_metadata?.school_workspace_id || caller.user.user_metadata?.school_id || null;
  const schoolId = callerRole === 'SUPER_ADMIN' ? (body.schoolId || body.school_id || callerSchoolId) : callerSchoolId;

  const getAcademicYear = async (id: string) => {
    const { data } = await admin.from('school_profile').select('tahun_pelajaran').eq('school_id', id).maybeSingle();
    return String(data?.tahun_pelajaran || '2026/2027').trim() || '2026/2027';
  };

  const targetSchool = async (id: string | null) => {
    if (!id) return null;
    const { data } = await admin.from('schools').select('id').eq('id', id).maybeSingle();
    return data;
  };

  const ensureSameSchool = async (targetId: string, allowSuperAdmin = true) => {
    if (callerRole === 'SUPER_ADMIN' && allowSuperAdmin) return true;
    const { data: targetProfile } = await admin.from('profiles').select('school_id').eq('id', targetId).maybeSingle();
    if (!targetProfile) return true;
    if (!callerSchoolId || !targetProfile.school_id) return true;
    return targetProfile.school_id === callerSchoolId;
  };

  try {
    if (action === 'create') {
      const name = String(body.name || '').trim();
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const email = String(body.email || '').trim().toLowerCase();
      const studentId = body.studentId || null;
      const classIds = [...new Set((Array.isArray(body.classIds) ? body.classIds : []).map((v: any) => String(v)).filter(Boolean))];
      const subjectId = body.subjectId ? String(body.subjectId) : null;
      const subjectName = body.subjectName ? String(body.subjectName).trim() : null;

      if (!name || !username || !password || !role) return json(res, 400, { error: 'Nama, username, password, dan role wajib diisi.' });
      if (!ALLOWED_ROLES.includes(role)) return json(res, 400, { error: 'Role pengguna tidak valid.' });
      if (!USERNAME_RE.test(username)) return json(res, 400, { error: 'Username harus 3-64 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.' });
      if (password.length < PASSWORD_MIN) return json(res, 400, { error: `Password minimal ${PASSWORD_MIN} karakter.` });
      if (!schoolId) return json(res, 400, { error: 'Sekolah pengguna belum ditentukan.' });
      if (profile.role !== 'SUPER_ADMIN' && role === 'ADMIN' && profile.school_id !== schoolId) return json(res, 403, { error: 'Akses sekolah tidak sesuai.' });

      if (role === 'SISWA') {
        if (!studentId) return json(res, 400, { error: 'Akun SISWA wajib terhubung dengan data siswa.' });
        const { data: student } = await admin.from('students').select('id,school_id').eq('id', studentId).maybeSingle();
        if (!student || student.school_id !== schoolId) return json(res, 400, { error: 'Data siswa tidak ditemukan di sekolah yang dipilih.' });
      } else if (studentId) {
        return json(res, 400, { error: 'studentId hanya boleh digunakan untuk akun SISWA.' });
      }

      if (classIds.length && !['WALI KELAS', 'GURU MAPEL'].includes(role)) return json(res, 400, { error: 'Penugasan kelas hanya untuk WALI KELAS/GURU MAPEL.' });
      if (role === 'WALI KELAS' && classIds.length > 1) return json(res, 400, { error: 'Wali Kelas hanya boleh memiliki 1 kelas.' });
      if (classIds.length) {
        const { data: classes, error: classErr } = await admin.from('classes').select('id').eq('school_id', schoolId).in('id', classIds);
        if (classErr) return json(res, 400, { error: classErr.message });
        if ((classes || []).length !== classIds.length) return json(res, 400, { error: 'Ada kelas yang bukan milik sekolah pengguna.' });
      }

      const { data: duplicate } = await admin.from('profiles').select('id,school_id').eq('username', username).maybeSingle();
      if (duplicate && duplicate.school_id !== schoolId) {
        return json(res, 409, { error: 'Username sudah digunakan oleh pengguna di sekolah lain.' });
      }

      const authEmail = email || `${username}@login.edushift.local`;
      let authUserId: string | null = null;
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { name, username, role, school_id: schoolId },
      });

      if (authErr || !authData?.user) {
        if (authErr && (authErr.message?.toLowerCase().includes('already') || authErr.message?.toLowerCase().includes('exists') || duplicate)) {
          if (duplicate) {
            authUserId = duplicate.id;
          } else {
            const { data: userList } = await admin.auth.admin.listUsers();
            const existingAuthUser = (userList?.users || []).find((u) => u.email === authEmail);
            if (existingAuthUser) {
              authUserId = existingAuthUser.id;
            }
          }
          if (authUserId) {
            await admin.auth.admin.updateUserById(authUserId, {
              password,
              user_metadata: { name, username, role, school_id: schoolId },
            });
          } else {
            return json(res, 400, { error: authErr?.message || 'Gagal membuat akun Auth Supabase.' });
          }
        } else {
          return json(res, 400, { error: authErr?.message || 'Gagal membuat akun Auth Supabase.' });
        }
      } else {
        authUserId = authData.user.id;
      }

      if (!authUserId) {
        return json(res, 400, { error: 'Gagal memperoleh ID pengguna autentikasi.' });
      }

      const { error: profileError } = await admin.from('profiles').upsert({
        id: authUserId,
        school_id: schoolId,
        name,
        username,
        email: authEmail,
        role,
        student_id: role === 'SISWA' ? studentId : null,
        is_active: true,
        must_change_password: true,
      });
      if (profileError) {
        return json(res, 400, { error: profileError.message });
      }

      let teacherId: string | null = body.teacherId || null;
      let teacher: any = null;
      if (role === 'WALI KELAS' || role === 'GURU MAPEL') {
        if (teacherId) {
          const { data: t } = await admin.from('teachers').select('id,tugas_utama,nama,nip').eq('school_id', schoolId).eq('id', teacherId).maybeSingle();
          teacher = t;
        }
        if (!teacher) {
          const normalizedNip = (username || '').trim();
          if (normalizedNip && normalizedNip !== '-') {
            const { data: existingTeacher } = await admin.from('teachers')
              .select('id,tugas_utama,nama,nip').eq('school_id', schoolId).eq('nip', normalizedNip).maybeSingle();
            teacher = existingTeacher;
          }
        }
        if (!teacher && name) {
          const { data: existingByName } = await admin.from('teachers')
            .select('id,tugas_utama,nama,nip').eq('school_id', schoolId).ilike('nama', name.trim()).maybeSingle();
          teacher = existingByName;
        }
        if (teacher) {
          teacherId = teacher.id;
          const desiredTugas = role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel';
          await admin.from('teachers').update({ tugas_utama: desiredTugas }).eq('id', teacherId).eq('school_id', schoolId);
        } else {
          const { data: insertedTeacher, error: teacherError } = await admin.from('teachers').insert({
            school_id: schoolId,
            nama: name,
            nip: (username && !username.startsWith('guru_') && !username.startsWith('ks_')) ? username : null,
            jenis_kelamin: 'L',
            tugas_utama: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel',
          }).select('id').single();
          if (teacherError || !insertedTeacher) {
            return json(res, 400, { error: teacherError?.message || 'Gagal membuat data guru.' });
          }
          teacher = insertedTeacher;
          teacherId = insertedTeacher.id;
        }
        const { error: teacherLinkError } = await admin.from('profiles').update({ teacher_id: teacherId }).eq('id', authUserId);
        if (teacherLinkError) return json(res, 400, { error: `Gagal menghubungkan akun ke data guru: ${teacherLinkError.message}` });
      }

      if (teacherId && role === 'WALI KELAS') {
        const year = await getAcademicYear(schoolId);
        const targetClassId = classIds[0] || null;
        try {
          await admin.rpc('assign_homeroom_teacher', {
            p_school_id: schoolId,
            p_teacher_id: teacherId,
            p_class_id: targetClassId,
            p_academic_year: year,
            p_actor_user_id: caller.user.id,
          });
        } catch (e: any) {
          console.warn('[admin-users] assign_homeroom_teacher warning:', e?.message);
        }

        if (targetClassId) {
          await admin.from('classes').update({
            wali_kelas_teacher_id: teacherId,
            wali_kelas_name: name,
          }).eq('id', targetClassId).eq('school_id', schoolId);

          // Lepaskan penugasan rombel lain jika guru ini sebelumnya terdaftar di rombel lain
          await admin.from('classes').update({
            wali_kelas_teacher_id: null,
            wali_kelas_name: null,
          }).eq('school_id', schoolId).neq('id', targetClassId).eq('wali_kelas_teacher_id', teacherId);

          const { data: otherCls } = await admin.from('classes').select('id, wali_kelas_name').eq('school_id', schoolId).neq('id', targetClassId);
          for (const oc of otherCls || []) {
            if (oc.wali_kelas_name && (
              oc.wali_kelas_name.trim().toLowerCase() === name.trim().toLowerCase() ||
              (teacher?.nama && oc.wali_kelas_name.trim().toLowerCase() === teacher.nama.trim().toLowerCase())
            )) {
              await admin.from('classes').update({ wali_kelas_teacher_id: null, wali_kelas_name: null }).eq('id', oc.id);
            }
          }
        }
        await admin.from('profiles').update({ class_ids: targetClassId ? [targetClassId] : [] }).eq('id', authUserId);
      }
      if (teacherId && role === 'GURU MAPEL' && (classIds.length || subjectId)) {
        const year = await getAcademicYear(schoolId);
        let effectiveSubjectIds: string[] = subjectId ? [subjectId] : [];
        if (!effectiveSubjectIds.length) {
          const { data: existingSubjects, error: subjectErr } = await admin.from('subject_teacher_assignments').select('subject_id').eq('school_id',schoolId).eq('teacher_id',teacherId).eq('academic_year',year);
          if (!subjectErr && existingSubjects) {
            effectiveSubjectIds = existingSubjects.map((x: any) => x.subject_id);
          }
        }
        if (effectiveSubjectIds.length > 0) {
          for (const effectiveSubjectId of effectiveSubjectIds) {
            const { data: subjectRow } = await admin.from('subjects').select('id').eq('id', effectiveSubjectId).eq('school_id', schoolId).maybeSingle();
            if (subjectRow) {
              try {
                await admin.rpc('replace_subject_assignment', {
                  p_school_id: schoolId,
                  p_subject_id: effectiveSubjectId,
                  p_teacher_id: teacherId,
                  p_class_ids: classIds,
                  p_academic_year: year,
                  p_actor_user_id: caller.user.id
                });
              } catch (e: any) {
                console.warn('[admin-users] replace_subject_assignment warning:', e?.message);
              }
            }
          }
        }
      }

      if (teacherId || role === 'WALI KELAS' || role === 'GURU MAPEL') {
        try {
          const year = await getAcademicYear(schoolId);
          await reconcileTeacherAssignments(admin, schoolId, year);
        } catch (e: any) {
          console.warn('[admin-users] reconcileTeacherAssignments create warning:', e?.message);
        }
      }

      await admin.from('audit_logs').insert({
        actor_id: caller.user.id,
        actor_name: profile.role,
        actor_role: profile.role,
        action: 'CREATE_USER',
        table_name: 'profiles',
        record_id: authUserId,
        school_id: schoolId,
        details: { username, email: authEmail, role },
      });

      return json(res, 200, { ok: true, userId: authUserId, teacherId });
    }

    if (action === 'list' || action === 'list_users' || action === 'list_admins') {
      const requestedSchool = body.schoolId || body.school_id || profile.school_id;
      if (profile.role !== 'SUPER_ADMIN' && requestedSchool !== profile.school_id) return json(res, 403, { error: 'Akses sekolah tidak sesuai.' });
      let query = admin.from('profiles').select('id,school_id,name,username,email,role,student_id,is_active,must_change_password,created_at').eq('school_id', requestedSchool);
      if (action === 'list_admins') query = query.in('role', ['ADMIN','KEPALA SEKOLAH','GURU MAPEL','WALI KELAS']);
      if (body.role) query = query.eq('role', body.role);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, { ok: true, users: data || [], admins: data || [] });
    }

    if (action === 'update') {
      const userId = body.userId || body.user_id;
      const name = String(body.name || '').trim();
      const username = String(body.username || '').trim().toLowerCase();
      const email = String(body.email || '').trim().toLowerCase();
      const studentId = body.studentId || null;
      const classIds = [...new Set((Array.isArray(body.classIds) ? body.classIds : []).map((v: any) => String(v)).filter(Boolean))];
      const subjectId = body.subjectId ? String(body.subjectId) : null;
      if (role === 'WALI KELAS' && classIds.length > 1) return json(res, 400, { error: 'Wali Kelas hanya boleh memiliki 1 kelas.' });
      if (!userId || !name || !username || !role || !ALLOWED_ROLES.includes(role)) return json(res, 400, { error: 'Data akun tidak lengkap atau role tidak valid.' });
      if (!(await ensureSameSchool(userId))) return json(res, 403, { error: 'Akun tersebut bukan bagian dari sekolah Anda.' });
      if (role === 'SISWA' && !studentId) return json(res, 400, { error: 'Akun SISWA wajib terhubung ke data siswa.' });

      const authEmail = email || `${username}@login.edushift.local`;
      const { data: duplicate } = await admin.from('profiles').select('id').eq('username', username).neq('id', userId).maybeSingle();
      if (duplicate) return json(res, 409, { error: 'Username sudah digunakan pengguna lain.' });

      const { data: target, error: targetErr } = await admin.from('profiles').select('school_id,teacher_id,name,username,email,role,student_id').eq('id', userId).single();
      if (targetErr || !target) return json(res, 404, { error: targetErr?.message || 'Profil pengguna tidak ditemukan.' });

      let teacherId: string | null = target.teacher_id || null;
      let teacher: any = null;
      if (teacherId) {
        const { data: t } = await admin.from('teachers').select('id, nama, nip, tugas_utama').eq('id', teacherId).eq('school_id', target.school_id).maybeSingle();
        teacher = t;
      }
      if (role === 'GURU MAPEL' || role === 'WALI KELAS') {
        const desiredTugas = role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel';
        if (teacherId) {
          await admin.from('teachers').update({ nama: name, nip: (username && !username.startsWith('guru_') && !username.startsWith('ks_')) ? username : null, tugas_utama: desiredTugas }).eq('id', teacherId).eq('school_id', target.school_id);
        } else {
          const normalizedNip = (username || '').trim();
          if (normalizedNip && normalizedNip !== '-') {
            const { data: existingTeacher } = await admin.from('teachers')
              .select('id,tugas_utama,nama,nip').eq('school_id', target?.school_id).eq('nip', normalizedNip).maybeSingle();
            teacher = existingTeacher;
          }
          if (!teacher && name) {
            const { data: existingByName } = await admin.from('teachers')
              .select('id,tugas_utama').eq('school_id', target?.school_id).ilike('nama', name.trim()).maybeSingle();
            teacher = existingByName;
          }
          if (teacher) {
            teacherId = teacher.id;
            await admin.from('teachers').update({ tugas_utama: desiredTugas }).eq('id', teacherId).eq('school_id', target.school_id);
          } else {
            const { data: insertedTeacher, error: teacherError } = await admin.from('teachers').insert({
              school_id: target?.school_id, nama: name, nip: (username && !username.startsWith('guru_') && !username.startsWith('ks_')) ? username : null, jenis_kelamin: 'L',
              tugas_utama: desiredTugas,
            }).select('id').single();
            if (teacherError || !insertedTeacher) return json(res, 400, { error: teacherError?.message || 'Gagal membuat data guru.' });
            teacher = insertedTeacher;
            teacherId = insertedTeacher.id;
          }
          const { error: teacherLinkError } = await admin.from('profiles').update({ teacher_id: teacherId }).eq('id', userId);
          if (teacherLinkError) return json(res, 400, { error: `Gagal menghubungkan akun ke data guru: ${teacherLinkError.message}` });
        }
      }

      if (teacherId && role === 'WALI KELAS') {
        const year = await getAcademicYear(target.school_id);
        const targetClassId = classIds[0] || null;
        try {
          await admin.rpc('assign_homeroom_teacher', {
            p_school_id: target.school_id,
            p_teacher_id: teacherId,
            p_class_id: targetClassId,
            p_academic_year: year,
            p_actor_user_id: caller.user.id
          });
        } catch (e: any) {
          console.warn('[admin-users] assign_homeroom_teacher update warning:', e?.message);
        }

        if (targetClassId) {
          // Tetapkan secara eksplisit pada tabel classes
          await admin.from('classes').update({
            wali_kelas_teacher_id: teacherId,
            wali_kelas_name: name,
          }).eq('id', targetClassId).eq('school_id', target.school_id);

          // Lepaskan penugasan rombel lain jika sebelumnya guru ini terdaftar di kelas lain
          await admin.from('classes').update({
            wali_kelas_teacher_id: null,
            wali_kelas_name: null,
          }).eq('school_id', target.school_id).neq('id', targetClassId).eq('wali_kelas_teacher_id', teacherId);

          // Bersihkan juga nama teks jika tersisa di rombel lain
          const { data: otherCls } = await admin.from('classes').select('id, wali_kelas_name').eq('school_id', target.school_id).neq('id', targetClassId);
          for (const oc of otherCls || []) {
            if (oc.wali_kelas_name && (
              oc.wali_kelas_name.trim().toLowerCase() === name.trim().toLowerCase() ||
              (teacher?.nama && oc.wali_kelas_name.trim().toLowerCase() === teacher.nama.trim().toLowerCase())
            )) {
              await admin.from('classes').update({ wali_kelas_teacher_id: null, wali_kelas_name: null }).eq('id', oc.id);
            }
          }
        }
      }
      if (teacherId && role !== 'WALI KELAS' && target.role === 'WALI KELAS') {
        // Jika peran berubah dari Wali Kelas menjadi non-Wali Kelas, lepaskan kelas binaan
        await admin.from('classes').update({
          wali_kelas_teacher_id: null,
          wali_kelas_name: null,
        }).eq('school_id', target.school_id).eq('wali_kelas_teacher_id', teacherId);
      }
      if (teacherId && role === 'GURU MAPEL' && classIds.length) {
        const year = await getAcademicYear(target.school_id);
        const { data: existingSubjects, error: existingSubjectsErr } = await admin.from('subject_teacher_assignments').select('subject_id').eq('school_id', target.school_id).eq('teacher_id', teacherId).eq('academic_year', year);
        const effectiveSubjectIds = subjectId ? [subjectId] : (!existingSubjectsErr && existingSubjects ? existingSubjects.map((x: any) => x.subject_id) : []);
        if (effectiveSubjectIds.length > 0) {
          for (const effectiveSubjectId of effectiveSubjectIds) {
            const { data: subjectRow } = await admin.from('subjects').select('id').eq('id', effectiveSubjectId).eq('school_id', target.school_id).maybeSingle();
            if (subjectRow) {
              await admin.rpc('replace_subject_assignment', {
                p_school_id: target.school_id,
                p_subject_id: effectiveSubjectId,
                p_teacher_id: teacherId,
                p_class_ids: classIds,
                p_academic_year: year,
                p_actor_user_id: caller.user.id
              });
            }
          }
        }
      }
      if (role !== 'GURU MAPEL' && role !== 'WALI KELAS') {
        const { error: unlinkTeacherErr } = await admin.from('profiles').update({ teacher_id: null }).eq('id', userId);
        if (unlinkTeacherErr) return json(res, 400, { error: unlinkTeacherErr.message });
        teacherId = null;
      }
      const effectiveClassIds = role === 'WALI KELAS'
        ? (classIds[0] ? [classIds[0]] : [])
        : (role === 'GURU MAPEL' || role === 'SISWA' ? classIds : []);
      const { error: profileUpdateErr } = await admin.from('profiles').update({
        name, username, email: authEmail, role, student_id: role === 'SISWA' ? studentId : null, teacher_id: teacherId,
        class_ids: effectiveClassIds,
      }).eq('id', userId);
      if (profileUpdateErr) return json(res, 400, { error: profileUpdateErr.message });

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        email: authEmail, user_metadata: { name, username, role }
      });
      if (authError) {
        await admin.from('profiles').update({
          name: target.name, username: target.username, email: target.email, role: target.role,
          student_id: target.student_id, teacher_id: target.teacher_id
        }).eq('id', userId);
        return json(res, 400, { error: `Perubahan database berhasil dibatalkan karena sinkronisasi Auth gagal: ${authError.message}` });
      }

      if (teacherId || role === 'WALI KELAS' || role === 'GURU MAPEL' || target.role === 'WALI KELAS' || target.role === 'GURU MAPEL') {
        try {
          const year = await getAcademicYear(target.school_id);
          await reconcileTeacherAssignments(admin, target.school_id, year);
        } catch (e: any) {
          console.warn('[admin-users] reconcileTeacherAssignments edit warning:', e?.message);
        }
      }

      return json(res, 200, { ok: true, teacherId });
    }

    if (action === 'password' || action === 'reset_admin_password') {
      const userId = body.userId || body.user_id;
      const password = String(body.password || '');
      if (!userId || password.length < PASSWORD_MIN) return json(res, 400, { error: `Password minimal ${PASSWORD_MIN} karakter.` });
      if (!(await ensureSameSchool(userId))) return json(res, 403, { error: 'Akun tersebut bukan bagian dari sekolah Anda.' });
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json(res, 400, { error: error.message });
      await admin.from('profiles').update({ must_change_password: true }).eq('id', userId);
      return json(res, 200, { ok: true });
    }

    if (action === 'toggle_admin') {
      const userId = body.userId || body.user_id;
      if (!userId || !(await ensureSameSchool(userId))) return json(res, 403, { error: 'Akun tidak dapat diubah.' });
      const { error } = await admin.from('profiles').update({ is_active: !!body.is_active }).eq('id', userId);
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, { ok: true });
    }

    if (action === 'delete') {
      const userId = body.userId || body.user_id;
      if (!userId) return json(res, 400, { error: 'ID akun pengguna wajib disertakan.' });
      if (userId === caller.user.id) return json(res, 400, { error: 'Akun yang sedang digunakan tidak dapat dihapus.' });
      if (!(await ensureSameSchool(userId))) return json(res, 403, { error: 'Akun tersebut bukan bagian dari sekolah Anda.' });

      const { data: target } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (target) {
        if (target.role === 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
          const { count } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', target.school_id || callerSchoolId)
            .eq('role', 'ADMIN')
            .eq('is_active', true);
          if ((count || 0) <= 1) {
            return json(res, 400, { error: 'Admin terakhir di sekolah tidak boleh dihapus.' });
          }
        }

        // 1. Lepas asosiasi teacher_id dan student_id pada profiles agar data master Guru dan Siswa tetap utuh
        await admin.from('profiles').update({ teacher_id: null, student_id: null }).eq('id', userId);

        // 2. Hapus baris dari tabel profiles
        const { error: delProfileError } = await admin.from('profiles').delete().eq('id', userId);
        if (delProfileError) {
          console.error('[admin-users] Gagal menghapus profil pengguna:', delProfileError);
          return json(res, 400, { error: `Gagal menghapus profil: ${delProfileError.message}` });
        }
      }

      // 3. Hapus user dari Supabase Auth
      const { error: delAuthError } = await admin.auth.admin.deleteUser(userId);
      if (delAuthError) {
        console.warn('[admin-users] Auth deleteUser warning:', delAuthError.message);
        if (!delAuthError.message.toLowerCase().includes('not found') && !target) {
          return json(res, 400, { error: delAuthError.message });
        }
      }

      // 4. Catat aktivitas ke audit_logs
      try {
        await admin.from('audit_logs').insert({
          actor_id: caller.user.id,
          actor_name: caller.user.user_metadata?.name || profile?.name || 'Admin',
          actor_role: callerRole,
          action: 'DELETE_USER',
          school_id: target?.school_id || callerSchoolId || null,
          details: {
            userId,
            deleted_username: target?.username,
            deleted_name: target?.name,
            deleted_role: target?.role,
          },
        });
      } catch (auditErr: any) {
        console.warn('[admin-users] Audit log warning:', auditErr?.message);
      }

      return json(res, 200, { ok: true, success: true, message: 'Akun pengguna berhasil dihapus.' });
    }

    if (action === 'import_students') {
      if (!['ADMIN', 'SUPER_ADMIN', 'KEPALA SEKOLAH'].includes(callerRole)) {
        return json(res, 403, { error: 'Hanya Admin atau Kepala Sekolah yang berwenang mengimpor data siswa.' });
      }
      if (!schoolId) {
        return json(res, 400, { error: 'ID sekolah tidak ditemukan.' });
      }

      const items = Array.isArray(body.items) ? body.items : [];
      const replaceExisting = Boolean(body.replaceExisting || body.replace_existing);
      const targetClassId = body.targetClassId || body.target_class_id || null;

      if (items.length === 0) {
        return json(res, 400, { error: 'Tidak ada data siswa yang dikirim.' });
      }

      // Coba panggil import_students_atomic via service role jika tersedia di database
      // 1. Validasi kelas yang disentuh dalam batch impor (touched classes)
      const touchedClassIds = new Set<string>();
      if (targetClassId) touchedClassIds.add(targetClassId);
      items.forEach((it: any) => {
        const cid = it.class_id || it.classId;
        if (cid) touchedClassIds.add(cid);
      });

      // Tentukan targetClassId tunggal jika semua item menuju kelas yang sama
      const effectiveTargetClassId = targetClassId || (touchedClassIds.size === 1 ? Array.from(touchedClassIds)[0] : null);

      // Smart in-place synchronization:
      // Selalu ambil seluruh data siswa sekolah untuk matching nama + nisn
      const { data: existingStudentsData, error: fetchErr } = await admin
        .from('students')
        .select('id, nisn, nama, class_id, gender')
        .eq('school_id', schoolId);

      if (fetchErr) {
        console.error('[admin-users] Error fetching existing students:', fetchErr.message);
        return json(res, 500, { error: `Gagal membaca data siswa: ${fetchErr.message}` });
      }

      const existingStudents = existingStudentsData || [];

      // Ambil ID siswa yang sudah terhubung dengan akun profiles
      const { data: linkedProfiles } = await admin
        .from('profiles')
        .select('student_id')
        .eq('school_id', schoolId)
        .not('student_id', 'is', null);
      const linkedStudentIds = new Set<string>((linkedProfiles || []).map((p: any) => String(p.student_id)));

      const usedExistingIds = new Set<string>();
      const toUpdate: Array<{ id: string; nama: string; nisn: string | null; gender: 'L' | 'P'; class_id: string | null }> = [];
      const toInsert: Array<{ school_id: string; nama: string; nisn: string | null; gender: 'L' | 'P'; class_id: string | null }> = [];

      for (const rawItem of items) {
        const itemNama = String(rawItem.nama || '').trim();
        const itemNisn = rawItem.nisn && String(rawItem.nisn).trim() !== '-' ? String(rawItem.nisn).trim() : null;
        const itemGender: 'L' | 'P' = rawItem.gender === 'P' ? 'P' : 'L';
        const itemClassId = rawItem.classId || rawItem.class_id || effectiveTargetClassId || null;

        let matchedExisting: any = null;
        const cleanItemNama = itemNama.toLowerCase();
        const cleanItemNisn = itemNisn ? itemNisn.toLowerCase() : '';

        // Aturan presisi:
        // - Jika terdapat siswa dengan nama dan NISN yang sama, otomatis gantikan data tersebut (update)
        // - Jika hanya nama yang sama (NISN berbeda atau belum ada) atau siswa baru, sistem harus tetap menambahkan datanya (insert)
        if (cleanItemNama && cleanItemNisn) {
          const candidate = existingStudents.find((st: any) => {
            if (usedExistingIds.has(st.id)) return false;
            const stNama = String(st.nama || '').trim().toLowerCase();
            const stNisn = String(st.nisn || '').trim().toLowerCase();
            return stNama === cleanItemNama && stNisn === cleanItemNisn;
          });
          if (candidate) {
            matchedExisting = candidate;
          }
        }

        if (matchedExisting) {
          usedExistingIds.add(matchedExisting.id);
          toUpdate.push({
            id: matchedExisting.id,
            nama: itemNama,
            nisn: itemNisn,
            gender: itemGender,
            class_id: itemClassId,
          });
        } else {
          toInsert.push({
            school_id: schoolId,
            nama: itemNama,
            nisn: itemNisn,
            gender: itemGender,
            class_id: itemClassId,
          });
        }
      }

        // 1. Perbarui data siswa yang cocok di database (ID tidak berubah sehingga profiles aman)
        for (const upd of toUpdate) {
          await admin
            .from('students')
            .update({
              nama: upd.nama,
              nisn: upd.nisn,
              gender: upd.gender,
              class_id: upd.class_id,
            })
            .eq('id', upd.id)
            .eq('school_id', schoolId);
        }

        // 2. Tambahkan siswa baru dalam batch
        if (toInsert.length > 0) {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + CHUNK_SIZE);
            const { error: insErr } = await admin.from('students').insert(chunk);
            if (insErr) {
              console.error('[admin-users] Error inserting students batch:', insErr.message);
              return json(res, 500, { error: `Gagal menyimpan data siswa: ${insErr.message}` });
            }
          }
        }

      // Auto-sinkronisasi relasi profil siswa (profiles.student_id) dengan data tabel students
      try {
        const { data: unlinkedProfiles } = await admin
          .from('profiles')
          .select('id, username, name')
          .eq('school_id', schoolId)
          .eq('role', 'SISWA')
          .is('student_id', null);

        if (unlinkedProfiles && unlinkedProfiles.length > 0) {
          const { data: allCurrentStudents } = await admin
            .from('students')
            .select('id, nisn, nama')
            .eq('school_id', schoolId);

          for (const p of unlinkedProfiles) {
            const matched = (allCurrentStudents || []).find(
              (st: any) =>
                (st.nisn && p.username && String(st.nisn).trim() === String(p.username).trim()) ||
                (st.nama && p.name && st.nama.trim().toLowerCase() === p.name.trim().toLowerCase())
            );
            if (matched) {
              await admin.from('profiles').update({ student_id: matched.id }).eq('id', p.id);
            }
          }
        }
      } catch (linkErr: any) {
        console.warn('[admin-users] Non-critical profile relink notice:', linkErr?.message);
      }

      // 4. Catat aktivitas ke audit_logs
      try {
        await admin.from('audit_logs').insert({
          actor_id: caller.user.id,
          actor_name: caller.user.user_metadata?.name || profile?.name || 'Admin',
          actor_role: callerRole,
          action: 'IMPORT_STUDENTS',
          school_id: schoolId,
          details: {
            count: items.length,
            replaceExisting,
            targetClassId,
          },
        });
      } catch (_) {}

      return json(res, 200, {
        ok: true,
        success: true,
        count: items.length,
        message: `Berhasil mengimpor ${items.length} data siswa.`,
      });
    }

    if (action === 'delete_student') {
      if (!['ADMIN', 'SUPER_ADMIN', 'KEPALA SEKOLAH'].includes(callerRole)) {
        return json(res, 403, { error: 'Tidak berwenang menghapus siswa.' });
      }
      const studentId = body.studentId || body.student_id;
      if (!studentId) return json(res, 400, { error: 'ID siswa wajib disertakan.' });

      try {
        await admin.from('profiles').update({ student_id: null }).eq('student_id', studentId);
      } catch (_) {}

      const { error: delErr } = await admin.from('students').delete().eq('id', studentId).eq('school_id', schoolId);
      if (delErr) {
        // Jika tertahan oleh trigger database profiles, lepaskan kelas siswa
        await admin.from('students').update({ class_id: null }).eq('id', studentId).eq('school_id', schoolId);
      }

      return json(res, 200, { ok: true, success: true });
    }

    if (action === 'delete_students_by_class') {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
        return json(res, 403, { error: 'Tidak berwenang menghapus siswa kelas.' });
      }
      const classId = body.classId || body.class_id;
      if (!classId) return json(res, 400, { error: 'ID kelas wajib disertakan.' });

      const { data: targetStudents } = await admin
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('school_id', schoolId);

      const sIds = (targetStudents || []).map((s: any) => s.id);
      if (sIds.length > 0) {
        try {
          await admin.from('profiles').update({ student_id: null }).eq('school_id', schoolId).in('student_id', sIds);
        } catch (_) {}

        const { error: delErr } = await admin.from('students').delete().eq('class_id', classId).eq('school_id', schoolId);
        if (delErr) {
          await admin.from('students').update({ class_id: null }).eq('class_id', classId).eq('school_id', schoolId);
        }
      }

      return json(res, 200, { ok: true, success: true });
    }

    if (action === 'delete_class') {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
        return json(res, 403, { error: 'Tidak berwenang menghapus kelas.' });
      }
      const classId = body.classId || body.class_id;
      if (!classId) return json(res, 400, { error: 'ID kelas wajib disertakan.' });

      // 1. Lepas penugasan kelas pada siswa agar tidak ada foreign key violation
      await admin.from('students').update({ class_id: null }).eq('class_id', classId).eq('school_id', schoolId);

      // 2. Bersihkan penugasan kelas mapel & user_class_assignments
      try {
        await admin.from('subject_class_assignments').delete().eq('class_id', classId).eq('school_id', schoolId);
        await admin.from('user_class_assignments').delete().eq('class_id', classId);
      } catch (_) {}

      // 3. Hapus kelas
      const { error: delErr } = await admin.from('classes').delete().eq('id', classId).eq('school_id', schoolId);
      if (delErr) {
        return json(res, 500, { error: `Gagal menghapus kelas: ${delErr.message}` });
      }

      return json(res, 200, { ok: true, success: true });
    }

    if (action === 'import_classes') {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
        return json(res, 403, { error: 'Tidak berwenang mengimpor kelas.' });
      }
      const items = Array.isArray(body.items) ? body.items : [];
      const replaceExisting = !!body.replaceExisting;
      const academicYear = body.academicYear || '2026/2027';

      const { data: existingClassesData } = await admin
        .from('classes')
        .select('id, name, grade, academic_year, wali_kelas_teacher_id')
        .eq('school_id', schoolId);
      const existingClasses = existingClassesData || [];

      const { data: teachersData } = await admin
        .from('teachers')
        .select('id, nama')
        .eq('school_id', schoolId);
      const teachersList = teachersData || [];

      const classByName = new Map<string, any>();
      for (const c of existingClasses) {
        classByName.set(String(c.name || '').trim().toLowerCase(), c);
      }

      const usedIds = new Set<string>();
      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      for (const item of items) {
        const rawName = String(item.name || '').trim();
        if (!rawName) continue;
        const matchNum = rawName.match(/\d+/);
        const grade = item.grade || (matchNum ? parseInt(matchNum[0], 10) : 1);
        let waliId = item.wali_kelas_teacher_id || item.waliKelasTeacherId || null;
        if (!waliId && item.waliKelasNameInput) {
          const cleanWali = String(item.waliKelasNameInput).trim();
          const cleanWaliLower = cleanWali.toLowerCase();
          const match = teachersList.find((t: any) => String(t.nama || '').trim().toLowerCase() === cleanWaliLower);
          if (match) {
            waliId = match.id;
          } else if (cleanWali) {
            const { data: newTeacher } = await admin
              .from('teachers')
              .insert({
                school_id: schoolId,
                nama: cleanWali,
                tugas_utama: 'Wali Kelas',
                jenis_kelamin: 'L',
              })
              .select('id, nama')
              .single();
            if (newTeacher?.id) {
              waliId = newTeacher.id;
              teachersList.push(newTeacher);
            }
          }
        }

        const existing = classByName.get(rawName.toLowerCase());
        if (existing) {
          usedIds.add(existing.id);
          toUpdate.push({
            id: existing.id,
            name: rawName,
            grade,
            academic_year: item.academic_year || academicYear,
            wali_kelas_teacher_id: waliId,
          });
        } else {
          toInsert.push({
            school_id: schoolId,
            name: rawName,
            grade,
            academic_year: item.academic_year || academicYear,
            wali_kelas_teacher_id: waliId,
          });
        }
      }

      for (const upd of toUpdate) {
        await admin.from('classes').update({
          name: upd.name,
          grade: upd.grade,
          academic_year: upd.academic_year,
          wali_kelas_teacher_id: upd.wali_kelas_teacher_id,
        }).eq('id', upd.id).eq('school_id', schoolId);
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await admin.from('classes').insert(toInsert);
        if (insErr) {
          return json(res, 500, { error: `Gagal menambahkan kelas: ${insErr.message}` });
        }
      }

      if (replaceExisting) {
        const leftovers = existingClasses.filter((c: any) => !usedIds.has(c.id));
        for (const l of leftovers) {
          await admin.from('students').update({ class_id: null }).eq('class_id', l.id).eq('school_id', schoolId);
          await admin.from('classes').delete().eq('id', l.id).eq('school_id', schoolId);
        }
      }

      return json(res, 200, { ok: true, success: true, count: toUpdate.length + toInsert.length });
    }

    if (action === 'generate_all_accounts') {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
        return json(res, 403, { error: 'Tidak berwenang mengenerate akun pengguna.' });
      }

      const resetExisting = !!body.resetExistingPasswords;
      const customPassword = body.customPassword ? String(body.customPassword).trim() : '';

      // Helper untuk password acak aman
      const createPassword = (): string => {
        if (customPassword && customPassword.length >= 6) return customPassword;
        const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lowers = "abcdefghijkmnopqrstuvwxyz";
        const digits = "23456789";
        const chars = uppers + lowers + digits;
        let pwd = uppers[Math.floor(Math.random() * uppers.length)] +
                  lowers[Math.floor(Math.random() * lowers.length)] +
                  digits[Math.floor(Math.random() * digits.length)];
        for (let i = 3; i < 8; i++) {
          pwd += chars[Math.floor(Math.random() * chars.length)];
        }
        return pwd.split('').sort(() => 0.5 - Math.random()).join('');
      };

      // Helper sanitasi username: wajib diawali huruf/angka, 3-45 karakter, karakter valid
      const sanitizeCandidate = (raw: string, prefix: string): string => {
        let clean = (raw || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
        // Pastikan karakter pertama adalah alfabet atau angka
        clean = clean.replace(/^[^a-z0-9]+/, '');
        if (clean.length < 3) {
          clean = `${prefix}${clean || Math.floor(100 + Math.random() * 900)}`;
        }
        return clean.slice(0, 45);
      };

      // Ambil seluruh data master secara komprehensif
      const [
        teachersRes,
        classesRes,
        subjectsRes,
        subjectTeacherScopeRes,
        subjectClassScopeRes,
        studentsRes,
        schoolProfileRes,
        profilesRes,
      ] = await Promise.all([
        admin.from('teachers').select('*').eq('school_id', schoolId).order('nama'),
        admin.from('classes').select('*, wali:wali_kelas_teacher_id(id,nama,nip)').eq('school_id', schoolId).order('grade').order('name'),
        admin.from('subjects').select('*').eq('school_id', schoolId),
        admin.from('subject_teacher_assignments').select('subject_id,teacher_id,academic_year').eq('school_id', schoolId),
        admin.from('subject_class_assignments').select('subject_id,class_id,academic_year').eq('school_id', schoolId),
        admin.from('students').select('*, classes:class_id(id,name,grade,academic_year)').eq('school_id', schoolId).order('nama'),
        admin.from('school_profile').select('*').eq('school_id', schoolId).maybeSingle(),
        admin.from('profiles').select('*').eq('school_id', schoolId),
      ]);

      const teachersList = teachersRes.data || [];
      const classesList = classesRes.data || [];
      const subjectsList = subjectsRes.data || [];
      const studentsList = studentsRes.data || [];
      const profilesList = profilesRes.data || [];
      const schoolProfileData = schoolProfileRes.data || {};
      const activeAcademicYear = String(schoolProfileData.tahun_pelajaran || '2026/2027').trim() || '2026/2027';

      // Scope pemetaan guru mapel
      const teacherSubjectScope = new Map<string, string[]>();
      const subjectClassScope = new Map<string, string[]>();

      (subjectTeacherScopeRes.data || [])
        .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
        .forEach((a: any) => {
          const ids = teacherSubjectScope.get(a.teacher_id) || [];
          if (!ids.includes(a.subject_id)) ids.push(a.subject_id);
          teacherSubjectScope.set(a.teacher_id, ids);
        });

      (subjectClassScopeRes.data || [])
        .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
        .forEach((a: any) => {
          const ids = subjectClassScope.get(a.subject_id) || [];
          if (!ids.includes(a.class_id)) ids.push(a.class_id);
          subjectClassScope.set(a.subject_id, ids);
        });

      // Kumpulan username yang sudah digunakan di seluruh profiles
      const usedUsernames = new Set<string>();
      for (const p of profilesList) {
        if (p.username) usedUsernames.add(String(p.username).trim().toLowerCase());
      }

      // Helper untuk mendapatkan username unik anti-kolisi
      const getUniqueUsername = (candidate: string, currentUserId?: string): string => {
        let u = candidate.toLowerCase();
        if (currentUserId) {
          const existingProfile = profilesList.find((p: any) => p.id === currentUserId);
          if (existingProfile && existingProfile.username) {
            return String(existingProfile.username).trim().toLowerCase();
          }
        }
        let counter = 2;
        while (usedUsernames.has(u)) {
          u = `${candidate}${counter}`.toLowerCase();
          counter++;
        }
        usedUsernames.add(u);
        return u;
      };

      // Helper pembuat / pembaru akun Supabase Auth
      const ensureAuthUser = async (
        email: string,
        password: string,
        meta: { name: string; username: string; role: string }
      ): Promise<string> => {
        const { data: newAuth, error: newAuthErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { ...meta, school_id: schoolId },
        });

        if (newAuth?.user?.id) {
          return newAuth.user.id;
        }

        // Jika email sudah pernah terdaftar, cari user auth dan perbarui password
        if (newAuthErr && (newAuthErr.message.toLowerCase().includes('already') || newAuthErr.message.toLowerCase().includes('exists'))) {
          const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existingAuth = (userList?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
          if (existingAuth) {
            await admin.auth.admin.updateUserById(existingAuth.id, {
              password,
              user_metadata: { ...meta, school_id: schoolId },
            });
            return existingAuth.id;
          }
        }

        throw new Error(newAuthErr?.message || `Gagal membuat akun autentikasi untuk ${email}`);
      };

      const results: Array<{
        id?: string;
        name: string;
        username: string;
        password?: string;
        role: string;
        category: 'KEPALA SEKOLAH' | 'GURU' | 'SISWA';
        className?: string;
        status: 'CREATED' | 'UPDATED' | 'ACTIVE';
        error?: string;
      }> = [];

      // ==========================================
      // 1. GENERATE AKUN KEPALA SEKOLAH
      // ==========================================
      const ksName = String(schoolProfileData.nama_kepala_sekolah || '').trim();
      const ksNip = String(schoolProfileData.nip_kepala_sekolah || '').trim();
      if (ksName) {
        const existingKs = profilesList.find((p: any) => p.role === 'KEPALA SEKOLAH' || (ksNip && p.username === ksNip));
        const ksUsername = existingKs?.username
          ? String(existingKs.username).trim().toLowerCase()
          : getUniqueUsername(sanitizeCandidate(ksNip || ksName, 'ks'), existingKs?.id);
        const ksEmail = `${ksUsername}@login.edushift.local`;
        const ksPassword = createPassword();

        try {
          if (!existingKs) {
            const authId = await ensureAuthUser(ksEmail, ksPassword, { name: ksName, username: ksUsername, role: 'KEPALA SEKOLAH' });
            await admin.from('profiles').upsert({
              id: authId,
              school_id: schoolId,
              name: ksName,
              username: ksUsername,
              email: ksEmail,
              role: 'KEPALA SEKOLAH',
              is_active: true,
              must_change_password: true,
            });
            results.push({
              id: authId,
              name: ksName,
              username: ksUsername,
              password: ksPassword,
              role: 'KEPALA SEKOLAH',
              category: 'KEPALA SEKOLAH',
              status: 'CREATED',
            });
          } else if (resetExisting) {
            await admin.auth.admin.updateUserById(existingKs.id, { password: ksPassword });
            await admin.from('profiles').update({
              name: ksName,
              role: 'KEPALA SEKOLAH',
              is_active: true,
            }).eq('id', existingKs.id);
            results.push({
              id: existingKs.id,
              name: ksName,
              username: ksUsername,
              password: ksPassword,
              role: 'KEPALA SEKOLAH',
              category: 'KEPALA SEKOLAH',
              status: 'UPDATED',
            });
          } else {
            results.push({
              id: existingKs.id,
              name: ksName,
              username: ksUsername,
              role: 'KEPALA SEKOLAH',
              category: 'KEPALA SEKOLAH',
              status: 'ACTIVE',
            });
          }
        } catch (ksErr: any) {
          console.warn('[generate_all_accounts] KS error:', ksErr.message);
          results.push({
            name: ksName,
            username: ksUsername,
            role: 'KEPALA SEKOLAH',
            category: 'KEPALA SEKOLAH',
            status: 'ACTIVE',
            error: ksErr.message,
          });
        }
      }

      // ==========================================
      // 2. GENERATE SELURUH AKUN GURU
      // ==========================================
      for (const teacher of teachersList) {
        const teacherName = String(teacher.nama || '').trim();
        if (!teacherName) continue;

        // Cari profil guru yang sudah ada berdasarkan teacher_id, NIP, atau nama
        const existingTeacherProfile = profilesList.find((p: any) =>
          (p.teacher_id && p.teacher_id === teacher.id) ||
          (teacher.nip && teacher.nip !== '-' && p.username && String(p.username).trim().toLowerCase() === String(teacher.nip).trim().toLowerCase()) ||
          (p.name && String(p.name).trim().toLowerCase() === teacherName.toLowerCase() && ['WALI KELAS', 'GURU MAPEL', 'ADMIN'].includes(p.role))
        );

        // Cari assignment Wali Kelas
        const linkedHomeroom = classesList.find((c: any) =>
          c.wali_kelas_teacher_id === teacher.id ||
          (c.wali?.nama && String(c.wali.nama).trim().toLowerCase() === teacherName.toLowerCase())
        );

        // Cari assignment Guru Mapel
        const assignedSubjectIds = teacherSubjectScope.get(teacher.id) || [];
        const directSubjects = subjectsList.filter((s: any) =>
          s.teacher_id === teacher.id ||
          (s.teacher_name && String(s.teacher_name).trim().toLowerCase() === teacherName.toLowerCase())
        );
        const combinedSubjectIds = Array.from(new Set([...assignedSubjectIds, ...directSubjects.map((s: any) => s.id)]));
        const teacherSubjects = combinedSubjectIds
          .map((sid) => subjectsList.find((s: any) => s.id === sid))
          .filter(Boolean);

        const isWali = !!linkedHomeroom || teacher.tugas_utama === 'Wali Kelas';
        const isMapel = teacherSubjects.length > 0 || teacher.tugas_utama === 'Guru Mapel';
        let role = 'GURU MAPEL';
        if (isWali && !isMapel) role = 'WALI KELAS';
        else if (isMapel && !isWali) role = 'GURU MAPEL';
        else if (isWali && isMapel) role = teacher.tugas_utama === 'Wali Kelas' ? 'WALI KELAS' : 'GURU MAPEL';
        else role = teacher.tugas_utama === 'Wali Kelas' ? 'WALI KELAS' : 'GURU MAPEL';

        let classIds: string[] = [];
        let assignmentDesc = '';
        if (role === 'WALI KELAS') {
          if (linkedHomeroom) {
            classIds = [linkedHomeroom.id];
            assignmentDesc = `Wali Kelas ${linkedHomeroom.name}`;
          } else {
            assignmentDesc = 'Wali Kelas';
          }
        } else {
          const mapelNames = teacherSubjects.map((s: any) => s.name).join(', ') || teacher.tugas_utama || 'Guru Mapel';
          const targetClassIds = Array.from(new Set(
            teacherSubjects.flatMap((s: any) => {
              const fromScope = subjectClassScope.get(s.id) || [];
              const fromDirect = (s.target_class_ids || []) as string[];
              return [...fromScope, ...fromDirect];
            })
          ));
          classIds = targetClassIds;
          const targetClassNames = targetClassIds
            .map((cid) => classesList.find((c: any) => c.id === cid)?.name || '')
            .filter(Boolean);
          assignmentDesc = `${mapelNames}${targetClassNames.length > 0 ? ` (${targetClassNames.join(', ')})` : ''}`;
        }

        const teacherUsername = existingTeacherProfile?.username
          ? String(existingTeacherProfile.username).trim().toLowerCase()
          : getUniqueUsername(sanitizeCandidate(teacher.nip && teacher.nip !== '-' ? teacher.nip : teacherName, 'guru'), existingTeacherProfile?.id);
        const teacherEmail = `${teacherUsername}@login.edushift.local`;
        const teacherPassword = createPassword();

        try {
          if (!existingTeacherProfile) {
            const authId = await ensureAuthUser(teacherEmail, teacherPassword, { name: teacherName, username: teacherUsername, role });
            await admin.from('profiles').upsert({
              id: authId,
              school_id: schoolId,
              name: teacherName,
              username: teacherUsername,
              email: teacherEmail,
              role,
              teacher_id: teacher.id,
              is_active: true,
              must_change_password: true,
            });

            // Sinkronkan penugasan kelas
            if (classIds.length > 0) {
              await admin.from('user_class_assignments').delete().eq('user_id', authId);
              const assignRows = classIds.map((cid) => ({ user_id: authId, class_id: cid }));
              await admin.from('user_class_assignments').insert(assignRows);
            }

            if (role === 'WALI KELAS' && linkedHomeroom) {
              await admin.from('classes').update({ wali_kelas_teacher_id: teacher.id }).eq('id', linkedHomeroom.id);
            }

            results.push({
              id: authId,
              name: teacherName,
              username: teacherUsername,
              password: teacherPassword,
              role,
              category: 'GURU',
              className: assignmentDesc,
              status: 'CREATED',
            });
          } else if (resetExisting) {
            await admin.auth.admin.updateUserById(existingTeacherProfile.id, { password: teacherPassword });
            await admin.from('profiles').update({
              name: teacherName,
              role,
              teacher_id: teacher.id,
              is_active: true,
            }).eq('id', existingTeacherProfile.id);

            if (classIds.length > 0) {
              await admin.from('user_class_assignments').delete().eq('user_id', existingTeacherProfile.id);
              const assignRows = classIds.map((cid) => ({ user_id: existingTeacherProfile.id, class_id: cid }));
              await admin.from('user_class_assignments').insert(assignRows);
            }

            if (role === 'WALI KELAS' && linkedHomeroom) {
              await admin.from('classes').update({ wali_kelas_teacher_id: teacher.id }).eq('id', linkedHomeroom.id);
            }

            results.push({
              id: existingTeacherProfile.id,
              name: teacherName,
              username: teacherUsername,
              password: teacherPassword,
              role,
              category: 'GURU',
              className: assignmentDesc,
              status: 'UPDATED',
            });
          } else {
            // Pastikan kaitan teacher_id selalu tersambung
            if (!existingTeacherProfile.teacher_id) {
              await admin.from('profiles').update({ teacher_id: teacher.id }).eq('id', existingTeacherProfile.id);
            }
            results.push({
              id: existingTeacherProfile.id,
              name: teacherName,
              username: teacherUsername,
              role,
              category: 'GURU',
              className: assignmentDesc,
              status: 'ACTIVE',
            });
          }
        } catch (tErr: any) {
          console.warn('[generate_all_accounts] Teacher error:', teacherName, tErr.message);
          results.push({
            name: teacherName,
            username: teacherUsername,
            password: teacherPassword,
            role,
            category: 'GURU',
            className: assignmentDesc,
            status: 'ACTIVE',
            error: tErr.message,
          });
        }
      }

      // ==========================================
      // 3. GENERATE SELURUH AKUN SISWA
      // ==========================================
      for (const student of studentsList) {
        const studentName = String(student.nama || '').trim();
        if (!studentName) continue;

        const studentClass = classesList.find((c: any) => c.id === student.class_id);
        const studentClassName = studentClass?.name || student.class_name || '-';

        // Cari profil siswa yang sudah ada berdasarkan student_id atau NISN
        const existingStudentProfile = profilesList.find((p: any) =>
          p.role === 'SISWA' &&
          ((p.student_id && p.student_id === student.id) ||
           (student.nisn && student.nisn !== '-' && p.username && String(p.username).trim().toLowerCase() === String(student.nisn).trim().toLowerCase()))
        );

        const studentUsername = existingStudentProfile?.username
          ? String(existingStudentProfile.username).trim().toLowerCase()
          : getUniqueUsername(sanitizeCandidate(student.nisn && student.nisn !== '-' ? student.nisn : studentName, 'sis'), existingStudentProfile?.id);
        const studentEmail = `${studentUsername}@login.edushift.local`;
        const studentPassword = createPassword();

        try {
          if (!existingStudentProfile) {
            const authId = await ensureAuthUser(studentEmail, studentPassword, { name: studentName, username: studentUsername, role: 'SISWA' });
            await admin.from('profiles').upsert({
              id: authId,
              school_id: schoolId,
              name: studentName,
              username: studentUsername,
              email: studentEmail,
              role: 'SISWA',
              student_id: student.id,
              is_active: true,
              must_change_password: true,
            });

            results.push({
              id: authId,
              name: studentName,
              username: studentUsername,
              password: studentPassword,
              role: 'SISWA',
              category: 'SISWA',
              className: studentClassName,
              status: 'CREATED',
            });
          } else if (resetExisting) {
            await admin.auth.admin.updateUserById(existingStudentProfile.id, { password: studentPassword });
            await admin.from('profiles').update({
              name: studentName,
              role: 'SISWA',
              student_id: student.id,
              is_active: true,
            }).eq('id', existingStudentProfile.id);

            results.push({
              id: existingStudentProfile.id,
              name: studentName,
              username: studentUsername,
              password: studentPassword,
              role: 'SISWA',
              category: 'SISWA',
              className: studentClassName,
              status: 'UPDATED',
            });
          } else {
            // Pastikan kaitan student_id selalu tersambung
            if (!existingStudentProfile.student_id) {
              await admin.from('profiles').update({ student_id: student.id }).eq('id', existingStudentProfile.id);
            }
            results.push({
              id: existingStudentProfile.id,
              name: studentName,
              username: studentUsername,
              role: 'SISWA',
              category: 'SISWA',
              className: studentClassName,
              status: 'ACTIVE',
            });
          }
        } catch (sErr: any) {
          console.warn('[generate_all_accounts] Student error:', studentName, sErr.message);
          results.push({
            name: studentName,
            username: studentUsername,
            password: studentPassword,
            role: 'SISWA',
            category: 'SISWA',
            className: studentClassName,
            status: 'ACTIVE',
            error: sErr.message,
          });
        }
      }

      return json(res, 200, {
        ok: true,
        success: true,
        total: results.length,
        results,
        message: `Berhasil memproses seluruh ${results.length} akun pengguna tanpa ada yang tertinggal.`,
      });
    }

    return json(res, 400, { error: 'Operasi akun tidak dikenali.' });
  } catch (error: any) {
    return json(res, 500, { error: error?.message || 'Terjadi kesalahan server.' });
  }
}
