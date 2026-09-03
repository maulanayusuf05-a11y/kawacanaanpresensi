import { createClient } from '@supabase/supabase-js';
import { reconcileTeacherAssignments } from './sync-teacher-assignments';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const ALLOWED_ROLES = ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SISWA'] as const;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/i;
const PASSWORD_MIN = 8;

type Role = typeof ALLOWED_ROLES[number];

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

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id,role,school_id')
    .eq('id', caller.user.id)
    .single();
  if (profileErr || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return json(res, 403, { error: 'Hanya ADMIN sekolah atau SUPER ADMIN yang dapat mengelola akun.' });
  }

  const body = req.body || {};
  const action = body.action;
  const role = body.role as Role | undefined;
  const schoolId = profile.role === 'SUPER_ADMIN' ? (body.schoolId || body.school_id || null) : profile.school_id;

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
    if (profile.role === 'SUPER_ADMIN' && allowSuperAdmin) return true;
    const { data } = await admin.from('profiles').select('school_id').eq('id', targetId).maybeSingle();
    return !!data && data.school_id === profile.school_id;
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
      if (role === 'WALI KELAS' || role === 'GURU MAPEL') {
        let teacher: any = null;
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
        try {
          await admin.rpc('assign_homeroom_teacher', {
            p_school_id: schoolId,
            p_teacher_id: teacherId,
            p_class_id: classIds[0] || null,
            p_academic_year: year,
            p_actor_user_id: caller.user.id,
          });
        } catch (e: any) {
          console.warn('[admin-users] assign_homeroom_teacher warning:', e?.message);
        }
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
      if (role === 'GURU MAPEL' || role === 'WALI KELAS') {
        const desiredTugas = role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel';
        if (teacherId) {
          await admin.from('teachers').update({ nama: name, nip: (username && !username.startsWith('guru_') && !username.startsWith('ks_')) ? username : null, tugas_utama: desiredTugas }).eq('id', teacherId).eq('school_id', target.school_id);
        } else {
          let teacher: any = null;
          const normalizedNip = (username || '').trim();
          if (normalizedNip && normalizedNip !== '-') {
            const { data: existingTeacher } = await admin.from('teachers')
              .select('id,tugas_utama').eq('school_id', target?.school_id).eq('nip', normalizedNip).maybeSingle();
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
        const { error: assignErr } = await admin.rpc('assign_homeroom_teacher',{p_school_id:target.school_id,p_teacher_id:teacherId,p_class_id:classIds[0]||null,p_academic_year:year,p_actor_user_id:caller.user.id});
        if (assignErr) return json(res,400,{error:assignErr.message});
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
      const { error: profileUpdateErr } = await admin.from('profiles').update({
        name, username, email: authEmail, role, student_id: role === 'SISWA' ? studentId : null, teacher_id: teacherId
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
      if (!userId || userId === caller.user.id) return json(res, 400, { error: 'Akun yang sedang digunakan tidak dapat dihapus.' });
      if (!(await ensureSameSchool(userId))) return json(res, 403, { error: 'Akun tersebut bukan bagian dari sekolah Anda.' });
      const { data: target } = await admin.from('profiles').select('role,school_id').eq('id', userId).maybeSingle();
      if (!target) return json(res, 404, { error: 'Profil pengguna tidak ditemukan.' });
      if (target.role === 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
        const { count } = await admin.from('profiles').select('id', { count:'exact', head:true }).eq('school_id', target.school_id).eq('role','ADMIN').eq('is_active',true);
        if ((count || 0) <= 1) return json(res, 400, { error: 'Admin terakhir di sekolah tidak boleh dihapus.' });
      }
      // Menghapus AKUN tidak menghapus master GURU. Data guru tetap tersedia.
      const { error: unlinkError } = await admin.from('profiles').update({ teacher_id: null }).eq('id', userId);
      if (unlinkError) return json(res, 400, { error: unlinkError.message });
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json(res, 400, { error: error.message });
      await admin.from('audit_logs').insert({ actor_id:caller.user.id, actor_role:profile.role, action:'DELETE_USER', school_id:target.school_id, details:{userId} });
      return json(res, 200, { ok:true });
    }

    return json(res, 400, { error: 'Operasi akun tidak dikenali.' });
  } catch (error: any) {
    return json(res, 500, { error: error?.message || 'Terjadi kesalahan server.' });
  }
}
