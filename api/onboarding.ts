import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

/**
 * Menghasilkan 8 karakter alfanumerik huruf besar tanpa awalan SCH- (contoh: 9B3366AB)
 */
function generateSchoolInviteCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Menghitung masa aktif trial Guru Pro untuk ruang kerja individu baru.
 * Aturan: Jika mendaftar di bulan X pada tanggal berapa pun, masa aktif trial
 * berlaku sampai dengan akhir tanggal di bulan (X + 1).
 * Contoh: Daftar di bulan Agustus pada tanggal berapa pun -> masa aktif sampai 30 September.
 */
function calculateGuruProTrialPeriod(now: Date = new Date()) {
  const startedAt = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 7 = Aug, 11 = Dec
  // Hari terakhir di bulan berikutnya: new Date(year, month + 2, 0)
  const endOfNextMonth = new Date(year, month + 2, 0);
  const expiresAt = endOfNextMonth.toISOString().slice(0, 10);

  return {
    plan: 'teacher', // Paket Guru Pro
    status: 'trial',
    startedAt,
    expiresAt,
    notes: `[Guru Pro Trial Otomatis: Masa aktif s.d akhir bulan berikutnya (${expiresAt})]`,
    maxTeachers: 2,
    maxStudents: 100,
    maxClasses: 5,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Metode permintaan tidak diizinkan. Gunakan POST.' });
  }

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  const body = req.body || {};
  const action = body.action;

  // Fallback jika kredensial server belum tersedia (mode simulasi/preview)
  if (!url || !serviceKey) {
    if (action === 'lookup_school') {
      return json(res, 200, {
        ok: true,
        schools: [
          {
            id: 'mock-school-1',
            name: 'SDN Cibubur 01',
            npsn: '20100123',
            jenjang: 'SD',
            alamat: 'Jl. Raya Lapangan Tembak No. 1, Jakarta Timur',
            classes: [
              { id: 'mock-cls-1', name: 'Kelas 1A', grade: 1 },
              { id: 'mock-cls-2', name: 'Kelas 2A', grade: 2 },
              { id: 'mock-cls-3', name: 'Kelas 3A', grade: 3 },
              { id: 'mock-cls-4', name: 'Kelas 4A', grade: 4 },
              { id: 'mock-cls-5', name: 'Kelas 5A', grade: 5 },
              { id: 'mock-cls-6', name: 'Kelas 6A', grade: 6 },
            ],
          },
        ],
      });
    }
    return json(res, 200, {
      ok: true,
      success: true,
      message: 'Onboarding berhasil diselesaikan (Mode Preview).',
      userId: body.userId || 'mock-user-id',
      schoolId: body.schoolId || 'mock-school-id',
    });
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const normalizeTeacherRole = (value: unknown): 'WALI KELAS' | 'GURU MAPEL' | 'OTHER' => {
    const v = String(value || '').trim().toUpperCase();
    if (v.includes('WALI KELAS')) return 'WALI KELAS';
    if (v.includes('GURU MAPEL')) return 'GURU MAPEL';
    return 'OTHER';
  };

  // Guru dan Akun sengaja dipisahkan. profiles.id adalah ID akun/Auth,
  // sedangkan teachers.id adalah ID master guru yang independen.
  const getAcademicYear = async (schoolId: string, fallback = '2026/2027') => {
    const { data } = await db.from('school_profile').select('tahun_pelajaran').eq('school_id', schoolId).maybeSingle();
    return String(data?.tahun_pelajaran || fallback).trim() || fallback;
  };
  const assignHomeroom = async (schoolId: string, teacherId: string, classId: string | null, actorUserId: string) => {
    const academicYear = await getAcademicYear(schoolId);
    const { error } = await db.rpc('assign_homeroom_teacher', {
      p_school_id: schoolId, p_teacher_id: teacherId, p_class_id: classId,
      p_academic_year: academicYear, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return academicYear;
  };
  const assignSubject = async (schoolId: string, subjectId: string, teacherId: string, classIds: string[], actorUserId: string) => {
    const academicYear = await getAcademicYear(schoolId);
    const { error } = await db.rpc('replace_subject_assignment', {
      p_school_id: schoolId, p_subject_id: subjectId, p_teacher_id: teacherId,
      p_class_ids: [...new Set(classIds)], p_academic_year: academicYear, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return academicYear;
  };

  const ensureTeacherForAccount = async (opts: {
    profileId: string;
    schoolId: string;
    nama: string;
    nip?: string | null;
    jenisKelamin?: 'L' | 'P';
    tugasUtama?: string;
    tugas_utama?: string;
    jabatan?: string;
    mataPelajaran?: string | null;
    statusKepegawaian?: string | null;
    noHp?: string | null;
  }) => {
    const { data: profile, error: profileReadError } = await db
      .from('profiles')
      .select('id,teacher_id')
      .eq('id', opts.profileId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    let teacherId = profile?.teacher_id || null;
    if (teacherId) {
      const { data: existingTeacher, error: teacherReadError } = await db
        .from('teachers').select('*').eq('id', teacherId).maybeSingle();
      if (teacherReadError) throw teacherReadError;
      if (existingTeacher) {
        const { data: updatedTeacher, error } = await db.from('teachers').update({
          school_id: opts.schoolId,
          nama: opts.nama,
          nip: (opts.nip || existingTeacher.nip || '').trim() || null,
          jenis_kelamin: opts.jenisKelamin || existingTeacher.jenis_kelamin || 'L',
          // Role assignment is deliberately NOT stored on teachers.
          tugas_utama: opts.tugas_utama || opts.tugasUtama || opts.jabatan || null,
          mata_pelajaran: opts.mataPelajaran ?? existingTeacher.mata_pelajaran ?? null,
          status_kepegawaian: opts.statusKepegawaian ?? existingTeacher.status_kepegawaian ?? null,
          no_hp: opts.noHp ?? existingTeacher.no_hp ?? null,
        }).eq('id', teacherId).select().single();
        if (error) throw error;
        return updatedTeacher;
      }
    }

    // Reuse master guru yang sudah ada berdasarkan school_id + NIP.
    // Ini mencegah bentrok UNIQUE(school_id, nip).
    const normalizedNip = String(opts.nip || '').trim();
    if (normalizedNip && normalizedNip !== '-') {
      const { data: existingByNip, error: nipLookupError } = await db
        .from('teachers').select('*').eq('school_id', opts.schoolId).eq('nip', normalizedNip).maybeSingle();
      if (nipLookupError) throw nipLookupError;
      if (existingByNip) {
        const { error: linkError } = await db.from('profiles').update({ teacher_id: existingByNip.id }).eq('id', opts.profileId);
        if (linkError) throw linkError;
        return existingByNip;
      }
    }

    const { data: insertedTeacher, error: insertError } = await db.from('teachers').insert({
      school_id: opts.schoolId,
      nama: opts.nama,
      nip: normalizedNip || null,
      jenis_kelamin: opts.jenisKelamin || 'L',
      tugas_utama: opts.tugas_utama || opts.tugasUtama || opts.jabatan || null,
      mata_pelajaran: opts.mataPelajaran ?? null,
      status_kepegawaian: opts.statusKepegawaian ?? null,
      no_hp: opts.noHp ?? null,
    }).select().single();
    if (insertError) throw insertError;

    const { error: linkError } = await db.from('profiles').update({ teacher_id: insertedTeacher.id }).eq('id', opts.profileId);
    if (linkError) throw linkError;
    return insertedTeacher;
  };

  try {
    // -------------------------------------------------------------
    // 1. LOOKUP SEKOLAH / KODE UNDANGAN / NPSN (PUBLIC)
    // -------------------------------------------------------------
    if (action === 'lookup_school' || action === 'lookup_school_code') {
      const rawQuery = String(body.code || body.query || '').trim();
      if (!rawQuery) {
        return json(res, 400, { error: 'Masukkan kode sekolah, NPSN, atau nama sekolah.' });
      }

      // Bersihkan awalan SCH- jika ada agar pengguna yang memasukkan format lama tetap terlayani
      const strippedQuery = rawQuery.toUpperCase().replace(/^SCH-?/i, '').trim();
      const cleanCode = strippedQuery.replace(/[^A-Z0-9]/g, '');
      const cleanDigits = rawQuery.replace(/\D/g, '');

      // Cari di tabel schools
      let schQuery = db.from('schools').select('id, name, npsn, code, plan, status, workspace_type');
      if (cleanDigits.length >= 4) {
        schQuery = schQuery.or(`code.ilike.%${cleanCode}%,code.ilike.%${strippedQuery}%,code.ilike.%${rawQuery}%,name.ilike.%${rawQuery}%,npsn.ilike.%${cleanDigits}%`);
      } else {
        schQuery = schQuery.or(`code.ilike.%${cleanCode}%,code.ilike.%${strippedQuery}%,code.ilike.%${rawQuery}%,name.ilike.%${rawQuery}%`);
      }
      const { data: matchedSchools } = await schQuery.limit(15);

      // Cari di school_profile
      let spQuery = db
        .from('school_profile')
        .select('school_id, nama_sekolah, npsn, jenjang, alamat, tahun_pelajaran');

      if (cleanDigits.length >= 3) {
        spQuery = spQuery.or(`npsn.ilike.%${cleanDigits}%,nama_sekolah.ilike.%${rawQuery}%`);
      } else {
        spQuery = spQuery.ilike('nama_sekolah', `%${rawQuery}%`);
      }
      const { data: matchedProfiles } = await spQuery.limit(15);

      const schoolMap = new Map<string, any>();

      for (const sc of matchedSchools || []) {
        if (!sc.id) continue;
        const normalizedCode = sc.code ? String(sc.code).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
        const fallbackCode = normalizedCode || sc.npsn || sc.id.slice(0, 8).toUpperCase();
        schoolMap.set(sc.id, {
          id: sc.id,
          name: sc.name || 'Sekolah Terdaftar',
          code: fallbackCode,
          npsn: sc.npsn || '',
          jenjang: 'SD',
          alamat: '',
        });
      }

      for (const sp of matchedProfiles || []) {
        if (!sp.school_id) continue;
        const existing = schoolMap.get(sp.school_id);
        const normalizedCode = existing?.code ? String(existing.code).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
        const fallbackCode = normalizedCode || sp.npsn || sp.school_id.slice(0, 8).toUpperCase();
        schoolMap.set(sp.school_id, {
          id: sp.school_id,
          name: sp.nama_sekolah || existing?.name || 'Sekolah Terdaftar',
          code: fallbackCode,
          npsn: sp.npsn || existing?.npsn || '',
          jenjang: sp.jenjang || existing?.jenjang || 'SD',
          alamat: sp.alamat || existing?.alamat || '',
        });
      }

      const schools = [];
      for (const [, sc] of schoolMap) {
        const { data: cls } = await db
          .from('classes')
          .select('id, name, grade, academic_year')
          .eq('school_id', sc.id)
          .order('grade')
          .order('name');

        schools.push({
          id: sc.id,
          name: sc.name,
          code: sc.code,
          npsn: sc.npsn,
          jenjang: sc.jenjang || 'SD',
          alamat: sc.alamat,
          classes: cls || [],
        });
      }

      return json(res, 200, { ok: true, schools });
    }

    // -------------------------------------------------------------
    // 2. LOOKUP DATA SISWA BERDASARKAN NISN (PUBLIC)
    // -------------------------------------------------------------
    if (action === 'lookup_student') {
      const nisn = String(body.nisn || '').replace(/\D/g, '').trim();
      const schoolId = body.schoolId || null;

      if (!nisn || nisn.length < 5) {
        return json(res, 400, { error: 'Masukkan minimal 5-10 digit NISN yang valid.' });
      }

      let stuQuery = db
        .from('students')
        .select('id, nisn, nama, gender, class_id, school_id, classes:class_id(id, name, grade)')
        .eq('nisn', nisn);

      if (schoolId) {
        stuQuery = stuQuery.eq('school_id', schoolId);
      }

      const { data: studentRows, error: sErr } = await stuQuery.limit(1);
      if (sErr) throw sErr;

      const student = studentRows?.[0];
      if (!student) {
        return json(res, 404, {
          error: 'Data siswa belum ditemukan. Silakan hubungi wali kelas atau administrator sekolah.',
        });
      }

      const { data: sp } = await db
        .from('school_profile')
        .select('nama_sekolah, npsn')
        .eq('school_id', student.school_id)
        .maybeSingle();

      return json(res, 200, {
        ok: true,
        student: {
          id: student.id,
          nisn: student.nisn,
          nama: student.nama,
          gender: student.gender,
          schoolId: student.school_id,
          schoolName: sp?.nama_sekolah || 'Sekolah Terdaftar',
          npsn: sp?.npsn || '',
          classId: student.class_id,
          className: (student.classes as any)?.name || 'Kelas Terdaftar',
        },
      });
    }

    // -------------------------------------------------------------
    // 3. GET USER WORKSPACES
    // -------------------------------------------------------------
    if (action === 'get_user_workspaces') {
      const workspaceToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!workspaceToken) {
        return json(res, 401, { error: 'Sesi login diperlukan untuk membaca ruang kerja.' });
      }
      const { data: workspaceAuth, error: workspaceAuthError } = await db.auth.getUser(workspaceToken);
      if (workspaceAuthError || !workspaceAuth.user) {
        return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
      }
      const userId = workspaceAuth.user.id;

      const { data: profile } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      const workspaces: any[] = [];
      const visitedSchoolIds = new Set<string>();

      // 1. Ambil sekolah yang dimiliki (owned) oleh user
      const { data: ownedSchools } = await db
        .from('schools')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      // 2. Ambil master guru hanya untuk identitas/school linkage.
      // teachers.tugas_utama/mata_pelajaran TIDAK digunakan untuk menentukan role.
      const { data: teacherRecords } = await db
        .from('teachers')
        .select('id, school_id')
        .eq('id', profile?.teacher_id || '00000000-0000-0000-0000-000000000000');

      // Kumpulkan kandidat school ID
      const candidateSchoolIds: string[] = [];
      if (profile?.school_id) candidateSchoolIds.push(profile.school_id);
      for (const s of ownedSchools || []) {
        if (s.id && !candidateSchoolIds.includes(s.id)) candidateSchoolIds.push(s.id);
      }
      for (const t of teacherRecords || []) {
        if (t.school_id && !candidateSchoolIds.includes(t.school_id)) candidateSchoolIds.push(t.school_id);
      }

      for (const sId of candidateSchoolIds) {
        if (!sId || visitedSchoolIds.has(sId)) continue;
        visitedSchoolIds.add(sId);

        const { data: school } = await db.from('schools').select('*').eq('id', sId).maybeSingle();
        const { data: sp } = await db.from('school_profile').select('*').eq('school_id', sId).maybeSingle();

        let schoolCode = school?.code ? String(school.code).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
        if (school && !schoolCode) {
          schoolCode = generateSchoolInviteCode();
          try {
            await db.from('schools').update({ code: schoolCode }).eq('id', sId);
          } catch (_) {}
        }

        const isPersonal =
          school?.workspace_type === 'personal' ||
          (school as any)?.is_personal === true ||
          (sId === profile?.school_id && ((profile as any)?.workspace_type === 'personal' || (profile as any)?.registration_mode === 'personal')) ||
          school?.plan === 'mulai' ||
          school?.plan === 'teacher' ||
          school?.plan === 'guru';

        const teacherForSchool = (teacherRecords || []).find((t: any) => t.school_id === sId);
        const academicYear = String(sp?.tahun_pelajaran || '2026/2027').trim() || '2026/2027';
        let assignmentRole: 'WALI KELAS' | 'GURU MAPEL' | 'OTHER' = 'OTHER';
        if (!isPersonal && teacherForSchool) {
          const { data: waliAssignments } = await db
            .from('classes')
            .select('id')
            .eq('school_id', sId)
            .eq('academic_year', academicYear)
            .eq('wali_kelas_teacher_id', teacherForSchool.id)
            .limit(1);
          if (waliAssignments?.length) assignmentRole = 'WALI KELAS';

          const { data: subjectAssignments } = await db
            .from('subject_teacher_assignments')
            .select('subject_id')
            .eq('school_id', sId)
            .eq('academic_year', academicYear)
            .eq('teacher_id', teacherForSchool.id)
            .limit(1);
          if (subjectAssignments?.length) {
            if (assignmentRole === 'WALI KELAS') {
              // Database constraints should prevent this; fail closed if legacy data violates it.
              continue;
            }
            assignmentRole = 'GURU MAPEL';
          }
        }

        const profileRole = sId === profile?.school_id ? String(profile?.role || '').toUpperCase() : '';
        const nonTeacherRole = ['SUPER_ADMIN','ADMIN','KEPALA SEKOLAH','SISWA'].includes(profileRole) ? profileRole : '';
        const userRole = nonTeacherRole || (assignmentRole !== 'OTHER' ? assignmentRole : (isPersonal ? profileRole : null));
        if (!userRole) continue;

        workspaces.push({
          id: `ws-mem-${userId}-${sId}`,
          userId: userId,
          workspaceId: sId,
          workspaceCode: schoolCode || null,
          role: userRole,
          workspaceName: isPersonal ? 'Ruang Kerja Individu' : (school?.name || sp?.nama_sekolah || 'Ruang Kerja Sekolah'),
          workspaceType: isPersonal ? 'personal' : 'school',
          registrationMode: isPersonal ? 'personal' : 'school',
          npsn: school?.npsn || sp?.npsn || null,
          subscriptionPlan: school?.plan || (isPersonal ? 'teacher' : 'sekolah'),
          joinedAt: school?.created_at || profile?.created_at || new Date().toISOString(),
        });
      }

      return json(res, 200, { ok: true, success: true, workspaces });
    }

    // -------------------------------------------------------------
    // 3.1. CREATE FRESH PERSONAL WORKSPACE
    // -------------------------------------------------------------
    if (action === 'create_personal_workspace') {
      const personalToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!personalToken) {
        return json(res, 401, { error: 'Sesi login diperlukan untuk membuat ruang kerja individu.' });
      }
      const { data: personalAuth, error: personalAuthError } = await db.auth.getUser(personalToken);
      if (personalAuthError || !personalAuth.user) {
        return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
      }
      const userId = personalAuth.user.id;
      const fullName = String(body.fullName || body.name || '').trim() || 'Pendidik';
      const nip = String(body.nip || '-').trim();
      let linkedTeacher: any = null;

      const { data: currentProfile, error: currentProfileError } = await db
        .from('profiles')
        .select('role, teacher_id')
        .eq('id', userId)
        .maybeSingle();
      if (currentProfileError) throw currentProfileError;
      const role = normalizeTeacherRole(currentProfile?.role);
      if (!['WALI KELAS', 'GURU MAPEL'].includes(role)) {
        return json(res, 403, { error: 'Ruang kerja individu guru hanya dapat dibuat setelah role guru ditetapkan melalui onboarding/assignment yang valid.' });
      }

      // Periksa apakah user sudah memiliki ruang kerja individu
      const { data: existingPersonal } = await db
        .from('schools')
        .select('*')
        .eq('owner_id', userId)
        .or('workspace_type.eq.personal,is_personal.eq.true,plan.eq.teacher,plan.eq.mulai')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPersonal) {
        if (role === 'WALI KELAS' || role === 'GURU MAPEL') {
          linkedTeacher = await ensureTeacherForAccount({ profileId: userId, schoolId: existingPersonal.id, nama: fullName, nip, jenisKelamin: 'L', jabatan: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel', mataPelajaran: role === 'GURU MAPEL' ? 'Guru Mapel' : 'Wali Kelas', statusKepegawaian: 'PNS', noHp: null });
        }
        await db.from('profiles').update({
          school_id: existingPersonal.id,
          teacher_id: linkedTeacher?.id || null,
          workspace_type: 'personal',
        }).eq('id', userId);

        const wsObj = {
          id: `ws-mem-${userId}-${existingPersonal.id}`,
          userId,
          workspaceId: existingPersonal.id,
          workspaceCode: existingPersonal.code ? String(existingPersonal.code).replace(/^SCH-?/i, '').trim().toUpperCase() : null,
          role: role as any,
          workspaceName: 'Ruang Kerja Individu',
          workspaceType: 'personal',
          registrationMode: 'personal',
          npsn: null,
          subscriptionPlan: existingPersonal.plan || 'teacher',
          joinedAt: existingPersonal.created_at || new Date().toISOString(),
        };

        return json(res, 200, { ok: true, success: true, workspace: wsObj, isNew: false });
      }

      // Buat Ruang Kerja Individu baru dengan data fresh (kosong)
      const trial = calculateGuruProTrialPeriod();
      const inviteCode = generateSchoolInviteCode();
      const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
        name: 'Ruang Kerja Individu',
        code: inviteCode,
        plan: trial.plan,
        status: 'active',
        workspace_type: 'personal',
        is_personal: true,
        owner_id: userId,
        subscription_started_at: trial.startedAt,
        subscription_expires_at: trial.expiresAt,
        notes: trial.notes,
        max_teachers: trial.maxTeachers,
        max_students: trial.maxStudents,
        max_classes: trial.maxClasses,
      }).select().single();

      if (schoolErr || !newSchool) {
        return json(res, 500, { error: schoolErr?.message || 'Gagal membuat ruang kerja individu baru.' });
      }

      // Inisialisasi school_profile kosong (fresh workspace)
      await db.from('school_profile').upsert({
        school_id: newSchool.id,
        nama_sekolah: '',
        npsn: '',
        jenjang: 'SD',
        nama_wali_kelas: role === 'WALI KELAS' ? fullName : '',
        nip_wali_kelas: role === 'WALI KELAS' ? nip : '',
        tahun_pelajaran: '2026/2027',
        semester: '1',
        kelas: '',
      }, { onConflict: 'school_id' });

      await db.from('system_config').upsert({
        school_id: newSchool.id,
        app_title: 'Kawacanaan Presensi',
        app_subtitle: '',
      }, { onConflict: 'school_id' });

      // Daftarkan data guru untuk user ini di ruang kerja individu
      linkedTeacher = await ensureTeacherForAccount({ profileId: userId, schoolId: newSchool.id, nama: fullName, nip, jenisKelamin: 'L', jabatan: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel', mataPelajaran: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel', statusKepegawaian: 'PNS', noHp: '' });

      // Update profil aktif
      await db.from('profiles').update({
        school_id: newSchool.id,
        workspace_type: 'personal',
      }).eq('id', userId);

      const wsObj = {
        id: `ws-mem-${userId}-${newSchool.id}`,
        userId,
        workspaceId: newSchool.id,
        workspaceCode: inviteCode,
        role: role as any,
        workspaceName: 'Ruang Kerja Individu',
        workspaceType: 'personal',
        registrationMode: 'personal',
        npsn: null,
        subscriptionPlan: 'teacher',
        joinedAt: new Date().toISOString(),
      };

      return json(res, 200, { ok: true, success: true, workspace: wsObj, isNew: true });
    }

    // -------------------------------------------------------------
    // 3.2. JOIN SCHOOL WORKSPACE VIA CODE
    // -------------------------------------------------------------
    if (action === 'join_school_workspace') {
      const joinToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!joinToken) {
        return json(res, 401, { error: 'Sesi login diperlukan untuk bergabung ke sekolah.' });
      }
      const { data: joinAuth, error: joinAuthError } = await db.auth.getUser(joinToken);
      if (joinAuthError || !joinAuth.user) {
        return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
      }
      const authenticatedUserId = joinAuth.user.id;
      const userId = String(body.user_id || body.userId || '').trim();
      if (userId && userId !== authenticatedUserId) {
        return json(res, 403, { error: 'User ID tidak sesuai dengan sesi login.' });
      }
      const rawCode = String(body.code || body.schoolCode || body.schoolId || '').trim();
      const effectiveUserId = authenticatedUserId;
      const role = String(body.role || '').toUpperCase();
      const teacherName = String(body.teacherName || body.name || '').trim();
      const nip = String(body.nip || '-').trim();
      const classId = body.classId || null;
      const className = body.className || null;
      const grade = Number(body.grade || 5);
      const subjectName = String(body.subjectName || '').trim();
      const classIds: string[] = Array.from(new Set<string>((Array.isArray(body.classIds) ? body.classIds : []).map((v: any) => String(v)).filter(Boolean)));

      if (!rawCode) {
        return json(res, 400, { error: 'User ID dan Kode Sekolah wajib disertakan.' });
      }

      const strippedCode = rawCode.toUpperCase().replace(/^SCH-?/i, '').trim();
      const cleanCode = strippedCode.replace(/[^A-Z0-9]/g, '');

      // Cari sekolah target berdasarkan kode atau ID
      let schQuery = db.from('schools').select('*');
      if (cleanCode.length >= 4) {
        schQuery = schQuery.or(`code.ilike.%${cleanCode}%,code.ilike.%${strippedCode}%,id.eq.${rawCode}`);
      } else {
        schQuery = schQuery.or(`code.ilike.%${strippedCode}%,id.eq.${rawCode}`);
      }
      let { data: targetSchool } = await schQuery.limit(1).maybeSingle();

      if (!targetSchool) {
        const { data: sp } = await db
          .from('school_profile')
          .select('school_id')
          .or(`npsn.eq.${rawCode}`)
          .limit(1)
          .maybeSingle();

        if (sp?.school_id) {
          const { data: sch } = await db.from('schools').select('*').eq('id', sp.school_id).maybeSingle();
          targetSchool = sch;
        }
      }

      if (!targetSchool) {
        return json(res, 404, { error: 'Kode sekolah tidak valid atau sekolah tidak ditemukan. Silakan periksa kembali kode sekolah dari administrator.' });
      }

      const schoolId = targetSchool.id;

      if (!['WALI KELAS', 'GURU MAPEL'].includes(role)) {
        return json(res, 400, { error: 'Role join sekolah tidak valid.' });
      }

      const { data: currentProfile, error: currentProfileErr } = await db.from('profiles').select('role, teacher_id').eq('id', effectiveUserId).maybeSingle();
      if (currentProfileErr) throw currentProfileErr;
      if (currentProfile?.role) {
        const currentRole = normalizeTeacherRole(currentProfile.role);
        if ((currentRole === 'WALI KELAS' || currentRole === 'GURU MAPEL') && currentRole !== role) {
          return json(res, 409, { error: `Akun ini sudah memiliki role ${currentRole === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel'} dan tidak dapat bergabung sebagai ${role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel'}.` });
        }
      }
      if (role === 'GURU MAPEL' && classIds.length === 0) {
        return json(res, 400, { error: 'Guru Mapel wajib memilih minimal satu kelas yang diajar.' });
      }

      const linkedTeacher = (role === 'WALI KELAS' || role === 'GURU MAPEL')
        ? await ensureTeacherForAccount({ profileId: effectiveUserId, schoolId, nama: teacherName || 'Guru', nip, jenisKelamin: 'L', jabatan: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel', mataPelajaran: role === 'WALI KELAS' ? 'Wali Kelas' : (subjectName || 'Guru Mapel'), statusKepegawaian: 'PNS', noHp: null })
        : null;

      // Handle penugasan rombel/kelas
      let targetClassId = classId;
      if (role === 'WALI KELAS') {
        if (className && (!targetClassId || targetClassId === '__NEW_CLASS__')) {
          const { data: newCls, error: clsErr } = await db.from('classes').insert({
            school_id: schoolId, name: className, grade, academic_year: await getAcademicYear(schoolId), wali_kelas_teacher_id: linkedTeacher.id,
          }).select('id').single();
          if (clsErr) throw clsErr;
          targetClassId = newCls.id;
        } else if (targetClassId) {
          const { data: cls, error: clsErr } = await db.from('classes').select('id').eq('id', targetClassId).eq('school_id', schoolId).maybeSingle();
          if (clsErr) throw clsErr;
          if (!cls) throw new Error('Kelas yang dipilih tidak ditemukan di sekolah tersebut.');
          await assignHomeroom(schoolId, linkedTeacher.id, targetClassId, effectiveUserId);
        }
      } else {
        const { data: validClasses, error: classErr } = await db.from('classes').select('id').eq('school_id', schoolId).in('id', classIds);
        if (classErr) throw classErr;
        if ((validClasses || []).length !== classIds.length) throw new Error('Ada kelas Guru Mapel yang tidak berasal dari sekolah yang dipilih.');
        const subjectLabel = subjectName || 'Guru Mapel';
        const { data: existingSub } = await db.from('subjects').select('id').eq('school_id', schoolId).ilike('name', subjectLabel).maybeSingle();
        let subjectRow = existingSub;
        if (!subjectRow) {
          const { data: createdSub, error: subjectErr } = await db.from('subjects').insert({ school_id: schoolId, name: subjectLabel, code: subjectLabel.slice(0, 4).toUpperCase(), is_specialized: true }).select('id').single();
          if (subjectErr) throw subjectErr;
          subjectRow = createdSub;
        }
        await assignSubject(schoolId, subjectRow.id, linkedTeacher.id, classIds, effectiveUserId);
      }


      // Update profil aktif ke ruang kerja sekolah
      await db.from('profiles').update({
        school_id: schoolId,
        teacher_id: linkedTeacher?.id || null,
        role: role as any,
        workspace_type: 'school',
      }).eq('id', effectiveUserId);

      const { data: sp } = await db.from('school_profile').select('nama_sekolah, npsn').eq('school_id', schoolId).maybeSingle();

      const wsObj = {
        id: `ws-mem-${effectiveUserId}-${schoolId}`,
        userId: effectiveUserId,
        workspaceId: schoolId,
        workspaceCode: targetSchool.code ? String(targetSchool.code).replace(/^SCH-?/i, '').trim().toUpperCase() : null,
        role: role as any,
        workspaceName: targetSchool.name || sp?.nama_sekolah || 'Ruang Kerja Sekolah',
        workspaceType: 'school',
        registrationMode: 'school',
        npsn: targetSchool.npsn || sp?.npsn || null,
        subscriptionPlan: targetSchool.plan || 'sekolah',
        joinedAt: new Date().toISOString(),
      };

      return json(res, 200, {
        ok: true,
        success: true,
        message: `Berhasil terhubung ke Ruang Kerja Sekolah: ${wsObj.workspaceName}!`,
        workspace: wsObj,
        school: targetSchool,
      });
    }

    // -------------------------------------------------------------
    // 3.5. SCHOOL PROFILE MANAGEMENT (SAVE & GET)
    // -------------------------------------------------------------
    if (action === 'save_school_profile' || action === 'update_school_profile') {
      let schoolId = body.schoolId || body.school_id || null;
      
      // If schoolId not in body, try to resolve from auth token if available
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!schoolId && token) {
        try {
          const { data: authData } = await db.auth.getUser(token);
          if (authData?.user) {
            const { data: prof } = await db.from('profiles').select('school_id').eq('id', authData.user.id).maybeSingle();
            schoolId = prof?.school_id || null;
          }
        } catch (_) {}
      }

      if (!schoolId) {
        return json(res, 400, { error: 'ID ruang kerja/sekolah wajib disertakan.' });
      }

      const namaSekolah = String(body.namaSekolah || body.nama_sekolah || '').trim();
      const npsn = String(body.npsn || '').trim();
      const jenjang = String(body.jenjang || 'SD/MI').trim();
      const alamat = body.alamat || '';
      const tahunPelajaran = String(body.tahunPelajaran || body.tahun_pelajaran || '2025/2026').trim();
      const semester = String(body.semester || '1 (Ganjil)').trim();
      const kelas = String(body.kelas || '').trim();
      const namaKepalaSekolah = String(body.namaKepalaSekolah || body.nama_kepala_sekolah || '').trim();
      const nipKepalaSekolah = String(body.nipKepalaSekolah || body.nip_kepala_sekolah || '').trim();
      const namaWaliKelas = String(body.namaWaliKelas || body.nama_wali_kelas || '').trim();
      const nipWaliKelas = String(body.nipWaliKelas || body.nip_wali_kelas || '').trim();

      // 1. Simpan ke tabel school_profile secara aman dan kompatibel dengan semua versi schema
      const safeProfilePayload: any = {
        school_id: schoolId,
        nama_sekolah: namaSekolah,
        npsn: npsn || null,
        alamat,
        tahun_pelajaran: tahunPelajaran,
        semester,
        kelas,
        nama_kepala_sekolah: namaKepalaSekolah,
        nip_kepala_sekolah: nipKepalaSekolah,
      };

      let spData = null;
      try {
        // Cek keberadaan record terlebih dahulu untuk menghindari kegagalan unique constraint
        const { data: existingSp } = await db.from('school_profile').select('id, school_id').eq('school_id', schoolId).maybeSingle();
        if (existingSp?.id) {
          const { data: updatedSp, error: updateErr } = await db.from('school_profile').update(safeProfilePayload).eq('id', existingSp.id).select().maybeSingle();
          if (!updateErr && updatedSp) {
            spData = updatedSp;
          } else {
            const { error: updateBySchoolErr } = await db.from('school_profile').update(safeProfilePayload).eq('school_id', schoolId);
            if (!updateBySchoolErr) spData = { ...existingSp, ...safeProfilePayload };
          }
        } else {
          const { data: insertedSp, error: insertErr } = await db.from('school_profile').insert(safeProfilePayload).select().maybeSingle();
          if (!insertErr && insertedSp) {
            spData = insertedSp;
          } else {
            // Coba upsert dengan onConflict jika insert gagal
            const { data: upsertedSp } = await db.from('school_profile').upsert(safeProfilePayload, { onConflict: 'school_id' }).select().maybeSingle();
            spData = upsertedSp || safeProfilePayload;
          }
        }
      } catch (upsertErr: any) {
        console.warn('Upsert school_profile error:', upsertErr?.message);
        try {
          await db.from('school_profile').upsert(safeProfilePayload, { onConflict: 'school_id' });
        } catch (_) {}
      }

      // 2. Terintegrasi penuh dengan data Superadmin di tabel `schools`
      const schoolUpdate: any = {};
      if (namaSekolah) {
        schoolUpdate.name = namaSekolah;
      }
      if (npsn) {
        schoolUpdate.npsn = npsn;
      }
      if (Object.keys(schoolUpdate).length > 0) {
        try {
          await db.from('schools').update(schoolUpdate).eq('id', schoolId);
        } catch (schErr: any) {
          console.warn('Update schools table warning:', schErr?.message);
        }
      }

      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Identitas satuan pendidikan berhasil disimpan dan terintegrasi.',
        profile: spData || safeProfilePayload,
      });
    }

    if (action === 'get_school_profile') {
      const schoolId = body.schoolId || body.school_id;
      if (!schoolId) {
        return json(res, 400, { error: 'ID sekolah wajib disertakan.' });
      }
      let [{ data: sp }, { data: sch }] = await Promise.all([
        db.from('school_profile').select('*').eq('school_id', schoolId).maybeSingle(),
        db.from('schools').select('id, name, npsn, code, plan, status, workspace_type, is_personal').eq('id', schoolId).maybeSingle()
      ]);

      let schoolCode = sch?.code ? String(sch.code).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
      if (sch && !schoolCode) {
        schoolCode = generateSchoolInviteCode();
        try {
          await db.from('schools').update({ code: schoolCode }).eq('id', schoolId);
          if (sch) sch.code = schoolCode;
        } catch (_) {}
      }

      return json(res, 200, {
        ok: true,
        profile: sp ? { ...sp, kode_sekolah: schoolCode, kodeSekolah: schoolCode } : null,
        school: sch ? { ...sch, code: schoolCode } : null
      });
    }

    // -------------------------------------------------------------
    // 4. AUTHENTICATED ACTIONS: ONBOARDING DARI GOOGLE SSO & SESI AKTIF
    // -------------------------------------------------------------
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

    // -------------------------------------------------------------
    // A. REGISTER & ONBOARD (NON-GOOGLE NEW USER FORM)
    // -------------------------------------------------------------
    if (action === 'register_and_onboard') {
      const fullName = String(body.fullName || '').trim();
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const email = String(body.email || '').trim().toLowerCase();
      const role = String(body.role || '').toUpperCase();
      const mode = String(body.mode || 'school');
      const schoolId = body.schoolId || null;
      const nip = String(body.nip || '-').trim();
      const gender = body.gender === 'P' ? 'P' : 'L';
      const phone = String(body.phone || '-').trim();
      const employmentStatus = String(body.employmentStatus || 'PNS').trim();

      if (!['WALI KELAS', 'GURU MAPEL', 'SISWA'].includes(role)) {
        return json(res, 400, { error: 'Role onboarding tidak valid.' });
      }
      if (role === 'GURU MAPEL' && mode === 'school' && (!Array.isArray(body.classIds) || body.classIds.length === 0)) {
        return json(res, 400, { error: 'Guru Mapel wajib memilih minimal satu kelas yang diajar.' });
      }

      if (!fullName || !username || !password) {
        return json(res, 400, { error: 'Nama lengkap, username, dan kata sandi wajib diisi.' });
      }

      const { data: existingUser } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
      if (existingUser) {
        return json(res, 400, { error: 'Username sudah digunakan. Silakan pilih username lain.' });
      }

      const authEmail = email || `${username}@login.edushift.local`;
      const { data: authData, error: authErr } = await db.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { name: fullName, username },
      });

      if (authErr || !authData.user) {
        return json(res, 400, { error: authErr?.message || 'Gagal mendaftarkan akun di sistem autentikasi.' });
      }

      const newUserId = authData.user.id;
      let finalSchoolId = schoolId;
      let createdTeacher: any = null;

      if (mode === 'personal' || !finalSchoolId) {
        const isPersonal = mode === 'personal';
        const wsName = isPersonal ? 'Ruang Kerja Individu' : String(body.workspaceName || `Ruang Kerja ${fullName}`).trim();
        const trial = calculateGuruProTrialPeriod();
        const inviteCode = generateSchoolInviteCode();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
          code: inviteCode,
          plan: trial.plan,
          status: 'active',
          workspace_type: 'personal',
          is_personal: true,
          owner_id: newUserId,
          subscription_started_at: trial.startedAt,
          subscription_expires_at: trial.expiresAt,
          notes: trial.notes,
          max_teachers: trial.maxTeachers,
          max_students: trial.maxStudents,
          max_classes: trial.maxClasses,
        }).select('id').single();

        if (schoolErr) throw schoolErr;
        finalSchoolId = newSchool.id;

        // Untuk Ruang Kerja Individu baru, nama satuan pendidikan tetap KOSONG (tidak diisi otomatis oleh sistem)
        await db.from('school_profile').upsert({
          school_id: finalSchoolId,
          nama_sekolah: isPersonal ? '' : wsName,
          npsn: '',
          jenjang: 'SD',
          nama_wali_kelas: role === 'WALI KELAS' ? fullName : '',
          nip_wali_kelas: role === 'WALI KELAS' ? nip : '',
          tahun_pelajaran: '2026/2027',
          semester: '1',
          kelas: '',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: finalSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: isPersonal ? '' : wsName,
        }, { onConflict: 'school_id' });

        // Kelas untuk sekolah diproses setelah teacher berhasil dibuat.
      }

      if (role === 'WALI KELAS' || role === 'GURU MAPEL') {
        createdTeacher = await ensureTeacherForAccount({
          profileId: newUserId,
          schoolId: finalSchoolId,
          nama: fullName,
          nip,
          jenisKelamin: gender,
          jabatan: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel',
          mataPelajaran: role === 'GURU MAPEL' ? String(body.subjectName || 'Guru Mapel') : 'Wali Kelas',
          statusKepegawaian: employmentStatus,
          noHp: phone,
        });

        if (mode !== 'personal' && role === 'WALI KELAS') {
          const requestedClassId = body.classId && body.classId !== '__NEW_CLASS__' ? String(body.classId) : null;
          let targetClassId = requestedClassId;
          if (!targetClassId) {
            const clsName = String(body.className || 'Kelas 5').trim();
            const clsGrade = Number(body.grade || 5);
            const { data: newCls, error: clsErr } = await db.from('classes').insert({ school_id: finalSchoolId, name: clsName, grade: clsGrade, academic_year: await getAcademicYear(finalSchoolId), wali_kelas_teacher_id: createdTeacher.id }).select('id').single();
            if (clsErr) throw clsErr;
            targetClassId = newCls.id;
          } else {
            const { data: cls, error: clsErr } = await db.from('classes').select('id').eq('id', targetClassId).eq('school_id', finalSchoolId).maybeSingle();
            if (clsErr) throw clsErr;
            if (!cls) throw new Error('Kelas yang dipilih tidak ditemukan di sekolah tersebut.');
            await assignHomeroom(finalSchoolId, createdTeacher.id, targetClassId, newUserId);
          }
        }

        if (mode !== 'personal' && role === 'GURU MAPEL') {
          const classIds: string[] = Array.from(new Set<string>((Array.isArray(body.classIds) ? body.classIds : []).map((v: any) => String(v)).filter(Boolean)));
          const { data: validClasses, error: classErr } = await db.from('classes').select('id').eq('school_id', finalSchoolId).in('id', classIds);
          if (classErr) throw classErr;
          if ((validClasses || []).length !== classIds.length) throw new Error('Ada kelas Guru Mapel yang tidak berasal dari sekolah yang dipilih.');
          const subjectLabel = String(body.subjectName || 'Guru Mapel').trim();
          const { data: existingSub } = await db.from('subjects').select('id').eq('school_id', finalSchoolId).ilike('name', subjectLabel).maybeSingle();
          let subjectRow = existingSub;
          if (!subjectRow) {
            const { data: createdSub, error: subjectErr } = await db.from('subjects').insert({ school_id: finalSchoolId, name: subjectLabel, code: subjectLabel.slice(0, 4).toUpperCase(), is_specialized: true }).select('id').single();
            if (subjectErr) throw subjectErr;
            subjectRow = createdSub;
          }
          await assignSubject(finalSchoolId, subjectRow.id, createdTeacher.id, classIds, newUserId);
        }
      }

      // Upsert profile
      await db.from('profiles').upsert({
        id: newUserId,
        school_id: finalSchoolId,
        teacher_id: (role === 'WALI KELAS' || role === 'GURU MAPEL') ? createdTeacher.id : null,
        name: fullName,
        username,
        email: authEmail,
        role: role as any,
        workspace_type: mode === 'personal' ? 'personal' : 'school',
        registration_mode: mode === 'personal' ? 'personal' : 'school',
        is_active: true,
        must_change_password: false,
        student_id: body.studentId || null,
      });


      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Pendaftaran akun dan ruang kerja berhasil!',
        userId: newUserId,
        email: authEmail,
        schoolId: finalSchoolId,
      });
    }

    // -------------------------------------------------------------
    // B. GOOGLE SSO ACTIONS (WAJIB ADA TOKEN SESI LOGIN)
    // -------------------------------------------------------------
    if (!token) {
      return json(res, 401, { error: 'Sesi login Google tidak ditemukan. Silakan masuk kembali.' });
    }

    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) {
      return json(res, 401, { error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
    }

    const callerUser = authData.user;
    const userEmail = callerUser.email || '';

    const assertExistingProfileRole = async (requestedRole: 'WALI KELAS' | 'GURU MAPEL') => {
      const { data: existingProfile, error } = await db.from('profiles').select('role').eq('id', callerUser.id).maybeSingle();
      if (error) throw error;
      if (existingProfile?.role) {
        const existingRole = normalizeTeacherRole(existingProfile.role);
        if ((existingRole === 'WALI KELAS' || existingRole === 'GURU MAPEL') && existingRole !== requestedRole) {
          throw new Error(`Akun ini sudah memiliki role ${existingRole === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel'} dan tidak dapat berpindah role.`);
        }
      }
    };
    const rawMeta = callerUser.user_metadata || {};
    const defaultName = rawMeta.full_name || rawMeta.name || userEmail.split('@')[0] || 'Pengguna';
    const defaultUsername = userEmail ? userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') : `user.${callerUser.id.slice(0, 8)}`;

    // -------------------------------------------------------------
    // ONBOARD WALI KELAS
    // -------------------------------------------------------------
    if (action === 'onboard_homeroom') {
      const mode = body.mode === 'personal' ? 'personal' : 'school';
      const teacherName = String(body.teacherName || defaultName).trim();
      const nip = String(body.nip || '-').trim();
      const gender = body.gender === 'P' ? 'P' : 'L';
      const phone = String(body.phone || '-').trim();
      const employmentStatus = String(body.employmentStatus || 'PNS').trim();
      await assertExistingProfileRole('WALI KELAS');

      let targetSchoolId = body.schoolId || null;
      let linkedTeacher: any = null;

      if (mode === 'personal' || !targetSchoolId) {
        const isPersonal = mode === 'personal';
        const wsName = isPersonal
          ? 'Ruang Kerja Individu'
          : String(body.workspaceName || `Ruang Kerja Sekolah ${teacherName}`).trim();
        const trial = calculateGuruProTrialPeriod();
        const inviteCode = generateSchoolInviteCode();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
          code: inviteCode,
          plan: isPersonal ? trial.plan : 'sekolah',
          status: 'active',
          workspace_type: isPersonal ? 'personal' : 'school',
          is_personal: isPersonal,
          owner_id: callerUser.id,
          subscription_started_at: trial.startedAt,
          subscription_expires_at: trial.expiresAt,
          notes: isPersonal ? trial.notes : 'Ruang Kerja Sekolah (Google SSO)',
          max_teachers: isPersonal ? trial.maxTeachers : 100,
          max_students: isPersonal ? trial.maxStudents : 1000,
          max_classes: isPersonal ? trial.maxClasses : 50,
        }).select('id').single();

        if (schoolErr) throw schoolErr;
        targetSchoolId = newSchool.id;
        linkedTeacher = await ensureTeacherForAccount({ profileId: callerUser.id, schoolId: targetSchoolId, nama: teacherName, nip, jenisKelamin: gender, jabatan: 'Wali Kelas', mataPelajaran: 'Wali Kelas', statusKepegawaian: employmentStatus, noHp: phone });

        // Ruang kerja individu: nama satuan pendidikan dibiarkan kosong agar diisi sendiri oleh guru/wali kelas
        await db.from('school_profile').upsert({
          school_id: targetSchoolId,
          nama_sekolah: isPersonal ? '' : wsName,
          npsn: '',
          jenjang: 'SD',
          nama_wali_kelas: teacherName,
          nip_wali_kelas: nip,
          tahun_pelajaran: '2026/2027',
          semester: '1',
          kelas: '',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: targetSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: isPersonal ? '' : wsName,
        }, { onConflict: 'school_id' });

        // Ruang kerja individu (personal): Jangan buat kelas default.
        // Biarkan data kelas kosong agar pengguna menginput sendiri di Data Referensi -> Data Kelas.
        if (!isPersonal && body.className) {
          const clsName = String(body.className).trim();
          const clsGrade = Number(body.grade || 1);
          const { error: clsErr } = await db.from('classes').insert({
            school_id: targetSchoolId,
            name: clsName,
            grade: clsGrade,
            academic_year: await getAcademicYear(targetSchoolId),
            wali_kelas_teacher_id: linkedTeacher.id,
          });
          if (clsErr) throw clsErr;
        }
      } else {
        linkedTeacher = await ensureTeacherForAccount({ profileId: callerUser.id, schoolId: targetSchoolId, nama: teacherName, nip, jenisKelamin: gender, jabatan: 'Wali Kelas', mataPelajaran: 'Wali Kelas', statusKepegawaian: employmentStatus, noHp: phone });
        // Mode School
        let targetClassId = body.classId || null;
        if (!targetClassId || targetClassId === '__NEW_CLASS__') {
          const clsName = String(body.className || 'Kelas 5').trim();
          const clsGrade = Number(body.grade || 5);
          const { data: newCls } = await db.from('classes').insert({
            school_id: targetSchoolId,
            name: clsName,
            grade: clsGrade,
            academic_year: await getAcademicYear(targetSchoolId),
            wali_kelas_teacher_id: linkedTeacher.id,
          }).select('id').single();

          if (newCls) targetClassId = newCls.id;
        } else {
          await assignHomeroom(targetSchoolId, linkedTeacher.id, targetClassId, callerUser.id);
        }

      }

      // Upsert profile dengan penanganan robust
      const { data: existingProf } = await db.from('profiles').select('id, username').eq('id', callerUser.id).maybeSingle();
      const finalUsername = existingProf?.username || defaultUsername;

      const profilePayload: any = {
        id: callerUser.id,
        school_id: targetSchoolId,
        teacher_id: linkedTeacher.id,
        name: teacherName,
        username: finalUsername,
        email: userEmail,
        role: 'WALI KELAS',
        is_active: true,
        must_change_password: false,
      };

      const { error: profErr } = await db.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (profErr) {
        console.error('Error upserting profile in onboard_homeroom:', profErr);
        const { error: fallbackProfileErr } = await db.from('profiles').update({
          school_id: targetSchoolId, name: teacherName, role: 'WALI KELAS', is_active: true,
        }).eq('id', callerUser.id);
        if (fallbackProfileErr) throw new Error(`Gagal menyimpan profil Wali Kelas: ${fallbackProfileErr.message}`);
      }

      const { error: workspaceProfileErr } = await db.from('profiles').update({
        workspace_type: mode === 'personal' ? 'personal' : 'school',
        registration_mode: mode === 'personal' ? 'personal' : 'school',
        is_google_auth: true, auth_provider: 'google',
      }).eq('id', callerUser.id);
      if (workspaceProfileErr) throw new Error(`Gagal menyinkronkan status workspace Wali Kelas: ${workspaceProfileErr.message}`);

      // Upsert teacher record

      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Ruang kerja Wali Kelas berhasil diaktifkan!',
        userId: callerUser.id,
        schoolId: targetSchoolId,
      });
    }

    // -------------------------------------------------------------
    // ONBOARD GURU MAPEL
    // -------------------------------------------------------------
    if (action === 'onboard_subject_teacher') {
      const mode = body.mode === 'personal' ? 'personal' : 'school';
      const teacherName = String(body.teacherName || defaultName).trim();
      const nip = String(body.nip || '-').trim();
      const gender = body.gender === 'P' ? 'P' : 'L';
      const phone = String(body.phone || '-').trim();
      const employmentStatus = String(body.employmentStatus || 'PNS').trim();
      const subjectName = String(body.subjectName || 'Pendidikan Jasmani / Agama').trim();
      await assertExistingProfileRole('GURU MAPEL');

      let targetSchoolId = body.schoolId || null;
      let linkedTeacher: any = null;

      if (mode === 'personal' || !targetSchoolId) {
        const isPersonal = mode === 'personal';
        const wsName = isPersonal
          ? 'Ruang Kerja Individu'
          : String(body.workspaceName || `Ruang Kerja Sekolah ${teacherName}`).trim();
        const trial = calculateGuruProTrialPeriod();
        const inviteCode = generateSchoolInviteCode();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
          code: inviteCode,
          plan: isPersonal ? trial.plan : 'sekolah',
          status: 'active',
          workspace_type: isPersonal ? 'personal' : 'school',
          is_personal: isPersonal,
          owner_id: callerUser.id,
          subscription_started_at: trial.startedAt,
          subscription_expires_at: trial.expiresAt,
          notes: isPersonal ? trial.notes : 'Ruang Kerja Sekolah (Google SSO)',
          max_teachers: isPersonal ? trial.maxTeachers : 100,
          max_students: isPersonal ? trial.maxStudents : 1000,
          max_classes: isPersonal ? trial.maxClasses : 50,
        }).select('id').single();

        if (schoolErr) throw schoolErr;
        targetSchoolId = newSchool.id;
        linkedTeacher = await ensureTeacherForAccount({ profileId: callerUser.id, schoolId: targetSchoolId, nama: teacherName, nip, jenisKelamin: gender, jabatan: 'Guru Mapel', mataPelajaran: subjectName, statusKepegawaian: employmentStatus, noHp: phone });

        await db.from('school_profile').upsert({
          school_id: targetSchoolId,
          nama_sekolah: isPersonal ? '' : wsName,
          npsn: '',
          jenjang: 'SD',
          tahun_pelajaran: '2026/2027',
          semester: '1',
          kelas: '',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: targetSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: isPersonal ? '' : wsName,
        }, { onConflict: 'school_id' });

        // Ruang kerja individu (personal): Jangan buat kelas default.
        // Biarkan data kelas kosong agar pengguna menginput sendiri di Data Referensi -> Data Kelas.
        if (!isPersonal && body.className) {
          const clsName = String(body.className).trim();
          const clsGrade = Number(body.grade || 1);

          const { error: clsErr } = await db.from('classes').insert({
            school_id: targetSchoolId,
            name: clsName,
            grade: clsGrade,
            academic_year: await getAcademicYear(targetSchoolId),
          });
          if (clsErr) throw clsErr;

        }
      }

      if (!linkedTeacher) linkedTeacher = await ensureTeacherForAccount({ profileId: callerUser.id, schoolId: targetSchoolId, nama: teacherName, nip, jenisKelamin: gender, jabatan: 'Guru Mapel', mataPelajaran: subjectName, statusKepegawaian: employmentStatus, noHp: phone });

      // Upsert profile dengan penanganan robust
      const { data: existingProf } = await db.from('profiles').select('id, username').eq('id', callerUser.id).maybeSingle();
      const finalUsername = existingProf?.username || defaultUsername;

      const profilePayload: any = {
        id: callerUser.id,
        school_id: targetSchoolId,
        teacher_id: linkedTeacher.id,
        name: teacherName,
        username: finalUsername,
        email: userEmail,
        role: 'GURU MAPEL',
        is_active: true,
        must_change_password: false,
      };

      const { error: profErr } = await db.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (profErr) {
        console.error('Error upserting profile in onboard_subject_teacher:', profErr);
        const { error: fallbackProfileErr } = await db.from('profiles').update({
          school_id: targetSchoolId, name: teacherName, role: 'GURU MAPEL', is_active: true,
        }).eq('id', callerUser.id);
        if (fallbackProfileErr) throw new Error(`Gagal menyimpan profil Guru Mapel: ${fallbackProfileErr.message}`);
      }

      const { error: workspaceProfileErr } = await db.from('profiles').update({
        workspace_type: mode === 'personal' ? 'personal' : 'school',
        registration_mode: mode === 'personal' ? 'personal' : 'school',
        is_google_auth: true, auth_provider: 'google',
      }).eq('id', callerUser.id);
      if (workspaceProfileErr) throw new Error(`Gagal menyinkronkan status workspace Guru Mapel: ${workspaceProfileErr.message}`);

      // Upsert teacher record
      // Upsert subject record
      const { data: existingSub } = await db.from('subjects').select('id').eq('school_id', targetSchoolId).ilike('name', subjectName).maybeSingle();
      let subjectRow = existingSub;
      if (!subjectRow) {
        const { data: createdSubject, error: subjectCreateError } = await db.from('subjects').insert({
          school_id: targetSchoolId,
          name: subjectName,
          code: String(subjectName || '').slice(0, 4).toUpperCase(),
          is_specialized: true,
        }).select('id').single();
        if (subjectCreateError) throw subjectCreateError;
        subjectRow = createdSubject;
      }
      if (linkedTeacher?.id && subjectRow?.id) {
        const classIds: string[] = mode === 'school' ? Array.from(new Set<string>((Array.isArray(body.classIds) ? body.classIds : []).map((v: any) => String(v)).filter(Boolean))) : [];
        if (mode === 'school' && classIds.length === 0) throw new Error('Guru Mapel wajib memilih minimal satu kelas yang diajar.');
        await assignSubject(targetSchoolId, subjectRow.id, linkedTeacher.id, classIds, callerUser.id);
      }

      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Ruang kerja Guru Mata Pelajaran berhasil diaktifkan!',
        userId: callerUser.id,
        schoolId: targetSchoolId,
      });
    }

    // -------------------------------------------------------------
    // ONBOARD SISWA
    // -------------------------------------------------------------
    if (action === 'onboard_student') {
      const targetSchoolId = body.schoolId;
      const targetClassId = body.classId;
      const studentName = String(body.studentName || defaultName).trim();
      const gender = body.gender === 'P' ? 'P' : 'L';
      const nisn = String(body.nisn || '').replace(/\D/g, '').trim();

      if (!targetSchoolId || !targetClassId) {
        return json(res, 400, { error: 'Sekolah dan kelas wajib dipilih.' });
      }

      // Cari atau buat data siswa di tabel students
      let studentId: string | null = null;
      if (nisn) {
        const { data: matchedStudent } = await db.from('students').select('id').eq('school_id', targetSchoolId).eq('nisn', nisn).maybeSingle();
        if (matchedStudent) {
          studentId = matchedStudent.id;
        }
      }

      if (!studentId) {
        const fallbackNisn = nisn || `S${Date.now().toString().slice(-8)}`;
        const { data: newStudent, error: stuErr } = await db.from('students').insert({
          school_id: targetSchoolId,
          class_id: targetClassId,
          nama: studentName,
          gender,
          nisn: fallbackNisn,
        }).select('id').single();

        if (stuErr) throw stuErr;
        studentId = newStudent.id;
      }

      // Upsert profile siswa
      await db.from('profiles').upsert({
        id: callerUser.id,
        school_id: targetSchoolId,
        name: studentName,
        username: defaultUsername,
        email: userEmail,
        role: 'SISWA',
        student_id: studentId,
        is_active: true,
        is_google_auth: true,
        auth_provider: 'google',
        must_change_password: false,
      });

      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Pendaftaran akun siswa berhasil! Membuka Portal Siswa...',
        userId: callerUser.id,
        schoolId: targetSchoolId,
      });
    }

    // -------------------------------------------------------------
    // DELETE TEACHER (HAPUS DATA GURU & SINKRONISASI DATABASE)
    // -------------------------------------------------------------
    if (action === 'delete_teacher') {
      const teacherId = body.teacherId || body.id;
      const schoolId = body.schoolId || null;
      const teacherName = body.teacherName || null;

      if (!teacherId && !teacherName) {
        return json(res, 400, { error: 'ID guru atau nama guru wajib disertakan.' });
      }

      // 1. Hapus dari tabel teachers
      if (teacherId) {
        await db.from('teachers').delete().eq('id', teacherId);
      }
      if (schoolId && teacherName) {
        await db.from('teachers').delete().eq('school_id', schoolId).eq('nama', teacherName);
      }

      // 2. Hapus penugasan di classes
      if (teacherId) {
        await db.from('classes').update({ wali_kelas_teacher_id: null }).eq('wali_kelas_teacher_id', teacherId);
      }
      if (schoolId && teacherName) {
        await db.from('school_profile').update({ nama_wali_kelas: '', nip_wali_kelas: '' }).eq('school_id', schoolId).eq('nama_wali_kelas', teacherName);
      }

      // 3. Hapus teacher_class_assignments
      if (teacherId) {
        await db.from('teacher_class_assignments').delete().eq('teacher_id', teacherId);
      }

      return json(res, 200, {
        ok: true,
        success: true,
        message: 'Data guru berhasil dihapus dari database.',
      });
    }

    // -------------------------------------------------------------
    // SAVE TEACHER (TAMBAH / PERBARUI DATA GURU)
    // -------------------------------------------------------------
    if (action === 'save_teacher') {
      const teacherId = body.teacherId || body.id;
      const schoolId = body.schoolId || null;
      const nama = String(body.nama || '').trim();
      const nip = String(body.nip || '').trim();
      const jenisKelamin = body.jenisKelamin || 'L';
      const tugasUtama = String(body.tugasUtama || body.tugas_utama || body.jabatan || 'Wali Kelas').trim();
      const statusKepegawaian = String(body.statusKepegawaian || '').trim();
      const noHp = String(body.noHp || '').trim();

      if (!nama) {
        return json(res, 400, { error: 'Nama guru wajib diisi.' });
      }

      if (teacherId) {
        const { data: updated, error: uErr } = await db
          .from('teachers')
          .update({
            nama,
            nip,
            jenis_kelamin: jenisKelamin,
            tugas_utama: tugasUtama || null,
            status_kepegawaian: statusKepegawaian,
            no_hp: noHp,
          })
          .eq('id', teacherId)
          .select()
          .single();

        if (!uErr && updated) {
          return json(res, 200, {
            ok: true,
            success: true,
            teacher: { ...updated, tugas_utama: updated.tugas_utama },
            teacherId: updated.id,
          });
        }
      }

      const { data: inserted, error: iErr } = await db
        .from('teachers')
        .insert({
          nama,
          nip,
          jenis_kelamin: jenisKelamin,
          tugas_utama: tugasUtama || null,
          status_kepegawaian: statusKepegawaian,
          no_hp: noHp,
          school_id: schoolId,
        })
        .select()
        .single();

      if (iErr) throw iErr;

      return json(res, 200, {
        ok: true,
        success: true,
        teacher: { ...inserted, tugas_utama: inserted.tugas_utama },
        teacherId: inserted.id,
      });
    }

    return json(res, 400, { error: `Aksi ${action} tidak dikenali.` });
  } catch (err: any) {
    console.error('Onboarding handler error:', err);
    return json(res, 500, { error: err.message || 'Terjadi kesalahan pada server onboarding.' });
  }
}
