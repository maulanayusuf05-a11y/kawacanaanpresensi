import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

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

  try {
    // -------------------------------------------------------------
    // 1. LOOKUP SEKOLAH / KODE UNDANGAN / NPSN (PUBLIC)
    // -------------------------------------------------------------
    if (action === 'lookup_school') {
      const query = String(body.query || '').trim();
      if (!query) {
        return json(res, 400, { error: 'Masukkan kode sekolah, NPSN, atau nama sekolah.' });
      }

      const cleanDigits = query.replace(/\D/g, '');
      let spQuery = db
        .from('school_profile')
        .select('school_id, nama_sekolah, npsn, jenjang, alamat, tahun_pelajaran');

      if (cleanDigits.length >= 3) {
        spQuery = spQuery.or(`npsn.ilike.%${cleanDigits}%,nama_sekolah.ilike.%${query}%`);
      } else {
        spQuery = spQuery.ilike('nama_sekolah', `%${query}%`);
      }

      const { data: matchedProfiles } = await spQuery.limit(15);

      // Cari juga di tabel schools
      let schQuery = db.from('schools').select('id, name, npsn, code, status');
      if (cleanDigits.length >= 3) {
        schQuery = schQuery.or(`npsn.ilike.%${cleanDigits}%,name.ilike.%${query}%,code.ilike.%${query}%`);
      } else {
        schQuery = schQuery.ilike('name', `%${query}%`);
      }
      const { data: matchedSchools } = await schQuery.limit(15);

      const schoolMap = new Map<string, any>();

      for (const sp of matchedProfiles || []) {
        if (!sp.school_id) continue;
        schoolMap.set(sp.school_id, {
          id: sp.school_id,
          name: sp.nama_sekolah || 'Sekolah Terdaftar',
          npsn: sp.npsn || '',
          jenjang: sp.jenjang || 'SD',
          alamat: sp.alamat || '',
        });
      }

      for (const sc of matchedSchools || []) {
        if (!sc.id) continue;
        if (!schoolMap.has(sc.id)) {
          schoolMap.set(sc.id, {
            id: sc.id,
            name: sc.name || 'Sekolah Terdaftar',
            npsn: sc.npsn || '',
            jenjang: 'SD',
            alamat: '',
          });
        }
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
      const userId = String(body.user_id || body.userId || '').trim();
      if (!userId) {
        return json(res, 400, { error: 'User ID wajib disertakan.' });
      }

      const { data: profile } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      const workspaces: any[] = [];
      let targetSchoolId = profile?.school_id || null;

      // Jika di profile belum ada school_id, periksa apakah ada sekolah/ruang kerja yang di-own oleh userId
      if (!targetSchoolId) {
        const { data: ownedSchool } = await db
          .from('schools')
          .select('id')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ownedSchool) {
          targetSchoolId = ownedSchool.id;
          // Sinkronkan ke profiles jika profile ada
          if (profile) {
            await db.from('profiles').update({ school_id: targetSchoolId }).eq('id', userId);
          }
        }
      }

      if (targetSchoolId) {
        const { data: school } = await db.from('schools').select('*').eq('id', targetSchoolId).maybeSingle();
        const { data: sp } = await db.from('school_profile').select('*').eq('school_id', targetSchoolId).maybeSingle();

        const isPersonal =
          (profile as any)?.workspace_type === 'personal' ||
          (profile as any)?.registration_mode === 'personal' ||
          (school as any)?.workspace_type === 'personal' ||
          (school as any)?.is_personal === true ||
          school?.plan === 'mulai' ||
          school?.plan === 'teacher' ||
          school?.plan === 'guru';

        const userRole = profile?.role || 'WALI KELAS';

        workspaces.push({
          id: `ws-mem-${userId}`,
          userId: userId,
          workspaceId: targetSchoolId,
          role: userRole,
          workspaceName: school?.name || sp?.nama_sekolah || (isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'),
          workspaceType: isPersonal ? 'personal' : 'school',
          registrationMode: isPersonal ? 'personal' : 'school',
          npsn: school?.npsn || sp?.npsn || null,
          subscriptionPlan: school?.plan || (isPersonal ? 'teacher' : 'sekolah'),
          joinedAt: profile?.created_at || new Date().toISOString(),
        });
      }

      return json(res, 200, { ok: true, success: true, workspaces });
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
      const role = String(body.role || 'WALI KELAS').toUpperCase();
      const mode = String(body.mode || 'school');
      const schoolId = body.schoolId || null;
      const nip = String(body.nip || '-').trim();
      const gender = body.gender === 'P' ? 'P' : 'L';
      const phone = String(body.phone || '-').trim();
      const employmentStatus = String(body.employmentStatus || 'PNS').trim();

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
        user_metadata: { name: fullName, username, role },
      });

      if (authErr || !authData.user) {
        return json(res, 400, { error: authErr?.message || 'Gagal mendaftarkan akun di sistem autentikasi.' });
      }

      const newUserId = authData.user.id;
      let finalSchoolId = schoolId;

      if (mode === 'personal' || !finalSchoolId) {
        const wsName = String(body.workspaceName || `Ruang Kelas ${fullName}`).trim();
        const trial = calculateGuruProTrialPeriod();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
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

        await db.from('school_profile').upsert({
          school_id: finalSchoolId,
          nama_sekolah: wsName,
          jenjang: 'SD',
          nama_wali_kelas: role === 'WALI KELAS' ? fullName : '',
          nip_wali_kelas: role === 'WALI KELAS' ? nip : '',
          tahun_pelajaran: '2026/2027',
          semester: '1',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: finalSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: wsName,
        }, { onConflict: 'school_id' });

        const clsName = String(body.className || 'Kelas 4A').trim();
        const clsGrade = Number(body.grade || 4);
        const { data: newCls } = await db.from('classes').insert({
          school_id: finalSchoolId,
          name: clsName,
          grade: clsGrade,
          academic_year: '2026/2027',
          wali_kelas_id: role === 'WALI KELAS' ? newUserId : null,
        }).select('id').single();

        if (newCls) {
          await db.from('teacher_class_assignments').insert({
            school_id: finalSchoolId,
            teacher_id: newUserId,
            class_id: newCls.id,
          });
        }
      }

      // Upsert profile
      await db.from('profiles').upsert({
        id: newUserId,
        school_id: finalSchoolId,
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

      if (role === 'WALI KELAS' || role === 'GURU' || role === 'GURU MAPEL') {
        await db.from('teachers').insert({
          id: newUserId,
          school_id: finalSchoolId,
          nama: fullName,
          nip: nip || '-',
          jenis_kelamin: gender,
          jabatan: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel',
          jenis_ptk: role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel',
          mataPelajaran: role === 'WALI KELAS' ? 'Wali Kelas' : (body.subjectName || 'Guru Mapel'),
          status_kepegawaian: employmentStatus || 'PNS',
          no_hp: phone || '',
        });
      }

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

      let targetSchoolId = body.schoolId || null;

      if (mode === 'personal' || !targetSchoolId) {
        const isPersonal = mode === 'personal';
        const wsName = String(
          body.workspaceName ||
            (isPersonal ? `Ruang Kelas ${teacherName}` : `Ruang Kerja Sekolah ${teacherName}`)
        ).trim();
        const trial = calculateGuruProTrialPeriod();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
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

        await db.from('school_profile').upsert({
          school_id: targetSchoolId,
          nama_sekolah: wsName,
          jenjang: 'SD',
          nama_wali_kelas: teacherName,
          nip_wali_kelas: nip,
          tahun_pelajaran: '2026/2027',
          semester: '1',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: targetSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: wsName,
        }, { onConflict: 'school_id' });

        const clsName = String(body.className || 'Kelas 4A').trim();
        const clsGrade = Number(body.grade || 4);
        const { data: newCls } = await db.from('classes').insert({
          school_id: targetSchoolId,
          name: clsName,
          grade: clsGrade,
          academic_year: '2026/2027',
          wali_kelas_id: callerUser.id,
        }).select('id').single();

        if (newCls) {
          await db.from('teacher_class_assignments').insert({
            school_id: targetSchoolId,
            teacher_id: callerUser.id,
            class_id: newCls.id,
          });
        }
      } else {
        // Mode School
        let targetClassId = body.classId || null;
        if (!targetClassId || targetClassId === '__NEW_CLASS__') {
          const clsName = String(body.className || 'Kelas 5').trim();
          const clsGrade = Number(body.grade || 5);
          const { data: newCls } = await db.from('classes').insert({
            school_id: targetSchoolId,
            name: clsName,
            grade: clsGrade,
            academic_year: '2026/2027',
            wali_kelas_id: callerUser.id,
          }).select('id').single();

          if (newCls) targetClassId = newCls.id;
        } else {
          await db.from('classes').update({
            wali_kelas_id: callerUser.id,
          }).eq('id', targetClassId);
        }

        if (targetClassId) {
          await db.from('teacher_class_assignments').upsert({
            school_id: targetSchoolId,
            teacher_id: callerUser.id,
            class_id: targetClassId,
          }, { onConflict: 'teacher_id,class_id' });
        }
      }

      // Upsert profile dengan penanganan robust
      const { data: existingProf } = await db.from('profiles').select('id, username').eq('id', callerUser.id).maybeSingle();
      const finalUsername = existingProf?.username || defaultUsername;

      const profilePayload: any = {
        id: callerUser.id,
        school_id: targetSchoolId,
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
        await db.from('profiles').update({
          school_id: targetSchoolId,
          name: teacherName,
          role: 'WALI KELAS',
          is_active: true,
        }).eq('id', callerUser.id);
      }

      try {
        await db.from('profiles').update({
          workspace_type: mode === 'personal' ? 'personal' : 'school',
          registration_mode: mode === 'personal' ? 'personal' : 'school',
          is_google_auth: true,
          auth_provider: 'google',
        }).eq('id', callerUser.id);
      } catch (_) {}

      // Upsert teacher record
      await db.from('teachers').upsert({
        id: callerUser.id,
        school_id: targetSchoolId,
        nama: teacherName,
        nip: nip || '-',
        jenis_kelamin: gender,
        jabatan: 'Wali Kelas',
        jenis_ptk: 'Wali Kelas',
        mata_pelajaran: 'Wali Kelas',
        status_kepegawaian: employmentStatus,
        no_hp: phone,
      }, { onConflict: 'id' });

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

      let targetSchoolId = body.schoolId || null;

      if (mode === 'personal' || !targetSchoolId) {
        const isPersonal = mode === 'personal';
        const wsName = String(
          body.workspaceName ||
            (isPersonal ? `Ruang Mengajar ${subjectName} - ${teacherName}` : `Ruang Kerja Sekolah ${teacherName}`)
        ).trim();
        const trial = calculateGuruProTrialPeriod();
        const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
          name: wsName,
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

        await db.from('school_profile').upsert({
          school_id: targetSchoolId,
          nama_sekolah: wsName,
          jenjang: 'SD',
          tahun_pelajaran: '2026/2027',
          semester: '1',
        }, { onConflict: 'school_id' });

        await db.from('system_config').upsert({
          school_id: targetSchoolId,
          app_title: 'Kawacanaan Presensi',
          app_subtitle: wsName,
        }, { onConflict: 'school_id' });

        const clsName = String(body.className || 'Kelas 4A').trim();
        const clsGrade = Number(body.grade || 4);

        const { data: newCls } = await db.from('classes').insert({
          school_id: targetSchoolId,
          name: clsName,
          grade: clsGrade,
          academic_year: '2026/2027',
        }).select('id').single();

        if (newCls) {
          await db.from('teacher_class_assignments').insert({
            school_id: targetSchoolId,
            teacher_id: callerUser.id,
            class_id: newCls.id,
          });
        }
      }

      // Upsert profile dengan penanganan robust
      const { data: existingProf } = await db.from('profiles').select('id, username').eq('id', callerUser.id).maybeSingle();
      const finalUsername = existingProf?.username || defaultUsername;

      const profilePayload: any = {
        id: callerUser.id,
        school_id: targetSchoolId,
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
        await db.from('profiles').update({
          school_id: targetSchoolId,
          name: teacherName,
          role: 'GURU MAPEL',
          is_active: true,
        }).eq('id', callerUser.id);
      }

      try {
        await db.from('profiles').update({
          workspace_type: mode === 'personal' ? 'personal' : 'school',
          registration_mode: mode === 'personal' ? 'personal' : 'school',
          is_google_auth: true,
          auth_provider: 'google',
        }).eq('id', callerUser.id);
      } catch (_) {}

      // Upsert teacher record
      await db.from('teachers').upsert({
        id: callerUser.id,
        school_id: targetSchoolId,
        nama: teacherName,
        nip: nip || '-',
        jenis_kelamin: gender,
        jabatan: 'Guru Mapel',
        jenis_ptk: 'Guru Mapel',
        mata_pelajaran: subjectName,
        status_kepegawaian: employmentStatus,
        no_hp: phone,
      }, { onConflict: 'id' });

      // Upsert subject record
      const { data: existingSub } = await db.from('subjects').select('id').eq('school_id', targetSchoolId).ilike('name', subjectName).maybeSingle();
      if (!existingSub) {
        await db.from('subjects').insert({
          school_id: targetSchoolId,
          name: subjectName,
          is_specialized: true,
        });
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

    return json(res, 400, { error: `Aksi ${action} tidak dikenali.` });
  } catch (err: any) {
    console.error('Onboarding handler error:', err);
    return json(res, 500, { error: err.message || 'Terjadi kesalahan pada server onboarding.' });
  }
}
