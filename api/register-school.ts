import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const generateSchoolInviteCode = (): string => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getPlanLimits = (plan: string) => {
  const p = (plan || 'free').toLowerCase();
  if (p === 'school' || p === 'pro' || p === 'enterprise' || p === 'sekolah') {
    // Paket Sekolah: 8 guru + 1 kepala sekolah, maks 32 siswa/kelas (hingga 8 kelas = 256 siswa), semua fitur terbuka
    return { max_teachers: 9, max_students: 256, max_classes: 8, days: 30, defaultClasses: 6, name: 'Paket Sekolah' };
  }
  if (p === 'teacher' || p === 'guru') {
    // Paket Guru: Rp31.000/bln, 1 guru (wali kelas/mapel), boleh dari sekolah yang sama, 32 siswa, 1 rombel
    return { max_teachers: 1, max_students: 32, max_classes: 1, days: 30, defaultClasses: 1, name: 'Paket Guru' };
  }
  // Paket Mulai/Gratis: Rp0/bln, 1 guru dari 1 sekolah saja (hanya 1 per NPSN), 32 siswa, 1 rombel
  return { max_teachers: 1, max_students: 32, max_classes: 1, days: 30, defaultClasses: 1, name: 'Paket Mulai/Gratis' };
};

const generateInitialClasses = (schoolId: string, count: number) => {
  const classesList: { school_id: string; name: string; grade: number }[] = [];
  if (count <= 1) {
    classesList.push({ school_id: schoolId, name: 'Kelas 1', grade: 1 });
  } else if (count <= 6) {
    for (let g = 1; g <= 6; g++) {
      classesList.push({ school_id: schoolId, name: `Kelas ${g}`, grade: g });
    }
  } else if (count <= 8) {
    for (let g = 1; g <= 6; g++) {
      classesList.push({ school_id: schoolId, name: `Kelas ${g}`, grade: g });
    }
    classesList.push({ school_id: schoolId, name: `Kelas 1B`, grade: 1 });
    classesList.push({ school_id: schoolId, name: `Kelas 2B`, grade: 2 });
  } else {
    for (let g = 1; g <= 6; g++) {
      classesList.push({ school_id: schoolId, name: `Kelas ${g}A`, grade: g });
      classesList.push({ school_id: schoolId, name: `Kelas ${g}B`, grade: g });
    }
  }
  return classesList;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Gunakan metode POST.' });
  }

  const body = req.body || {};
  const npsn = String(body.npsn || '').replace(/\D/g, '').trim();
  const schoolName = String(body.schoolName || body.namaSekolah || '').trim();
  const plan = String(body.plan || 'free').toLowerCase();
  const adminName = String(body.adminName || body.contactName || 'Administrator Sekolah').trim();
  const adminPhone = String(body.adminPhone || body.contactPhone || '').trim();
  const adminEmail = String(body.adminEmail || body.email || '').trim().toLowerCase();
  const adminPassword = String(body.adminPassword || body.password || '');
  const jenjang = String(body.jenjang || 'SD').toUpperCase();
  const statusSekolah = body.status === 'Swasta' ? 'Swasta' : 'Negeri';

  // Alamat detail
  const alamatDetail = {
    full: body.alamat || '',
    jalan: body.jalan || '',
    desaKelurahan: body.desaKelurahan || '',
    kecamatan: body.kecamatan || '',
    kabupatenKota: body.kabupatenKota || '',
    provinsi: body.provinsi || '',
    kodePos: body.kodePos || '',
    teleponFax: body.teleponFax || adminPhone || '',
    email: adminEmail || '',
    website: body.website || '',
    jenjang,
  };

  // Validasi Dasar
  if (!npsn || npsn.length !== 8) {
    return json(res, 400, { error: 'NPSN harus terdiri dari 8 digit angka resmi Kemendikdasmen.' });
  }

  if (!schoolName) {
    return json(res, 400, { error: 'Nama sekolah wajib diisi atau diverifikasi melalui NPSN.' });
  }

  if (!adminPassword || adminPassword.length < 8) {
    return json(res, 400, { error: 'Kata sandi Administrator minimal 8 karakter demi keamanan data sekolah.' });
  }

  // Pola username otomatis sesuai orientasi NPSN: admin.<NPSN>
  const adminUsername = `admin.${npsn}`.toLowerCase();
  const authEmail = adminEmail || `${adminUsername}@login.edushift.local`;

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  // Mode Fallback jika Supabase belum dikonfigurasi (untuk preview / offline mode)
  if (!url || !serviceKey) {
    return json(res, 200, {
      ok: true,
      demoMode: true,
      message: `Pendaftaran sekolah ${schoolName} berhasil disimulasikan!`,
      school: {
        id: `mock-${npsn}`,
        name: schoolName,
        npsn,
        plan,
        status: 'active',
      },
      admin: {
        username: adminUsername,
        name: adminName,
        email: authEmail,
        role: 'ADMIN',
      },
      classesCreated: getPlanLimits(plan).defaultClasses,
    });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Cek apakah NPSN sudah terdaftar di sistem
    const { data: existingSchool } = await admin
      .from('schools')
      .select('id, name, npsn, plan, status')
      .eq('npsn', npsn)
      .maybeSingle();

    // Deteksi khusus Paket Mulai/Gratis: 1 guru dari 1 sekolah saja
    if (plan === 'free' && existingSchool) {
      return json(res, 409, {
        error: `Pendaftaran Ditolak: Sekolah dengan NPSN ${npsn} (${existingSchool.name}) sudah terdaftar dalam sistem. Paket Mulai/Gratis dibatasi khusus untuk 1 guru per sekolah. Silakan pilih Paket Guru (Rp31.000/bln) atau Paket Sekolah (Rp270.000/bln) untuk mendaftar.`,
      });
    }

    // Deteksi Paket Sekolah: Hanya 1 institusi per NPSN
    if (plan === 'school' && existingSchool && existingSchool.plan === 'school') {
      return json(res, 409, {
        error: `Sekolah dengan NPSN ${npsn} (${existingSchool.name}) sudah terdaftar dengan Paket Sekolah. Silakan masuk menggunakan kredensial Administrator sekolah (${adminUsername}) atau hubungi bantuan.`,
      });
    }

    // Penentuan Username & Peran untuk Guru vs Admin
    const isTeacherPlan = plan === 'teacher' || plan === 'free';
    const teacherType = body.teacherType === 'GURU_MAPEL' ? 'GURU_MAPEL' : 'WALI_KELAS';
    const teacherGrade = Number(body.teacherGrade || 1);
    const teacherSubject = String(body.teacherSubject || 'Tematik / Guru Kelas').trim();
    const teacherNip = String(body.teacherNip || '').trim();

    let effectiveUsername = adminUsername;
    if (isTeacherPlan) {
      const classSuffix = teacherType === 'WALI_KELAS' ? `k${teacherGrade}` : 'mapel';
      effectiveUsername = `guru.${npsn}`;
      if (existingSchool) {
        effectiveUsername = `guru.${npsn}.${classSuffix}`;
      }
    }

    // 2. Cek apakah username sudah terpakai
    const { data: existingUser } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', effectiveUsername)
      .maybeSingle();

    if (existingUser) {
      if (plan === 'free') {
        return json(res, 409, {
          error: `Pengguna untuk NPSN ${npsn} (${effectiveUsername}) sudah terdaftar dengan Paket Mulai/Gratis. Sistem membatasi 1 pengguna gratis per sekolah. Silakan pilih Paket Guru jika ingin mendaftar mandiri.`,
        });
      } else {
        effectiveUsername = `guru.${npsn}.${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    // 3. Hitung Masa Aktif & Limit Paket
    const planLimits = getPlanLimits(plan);
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + planLimits.days);

    const rawCustomCode = body.code ? String(body.code).trim().toUpperCase().replace(/^SCH-?/i, '').replace(/[^A-Z0-9]/g, '') : '';
    const schoolCode = rawCustomCode || generateSchoolInviteCode();

    // 4. Buat Tenant Sekolah / Guru (Sekolah formal = Ruang Kerja Sekolah, Guru Mandiri = Ruang Kerja Individu)
    const workspaceType = isTeacherPlan ? 'personal' : 'school';
    const { data: school, error: schoolErr } = await admin
      .from('schools')
      .insert({
        name: isTeacherPlan ? `${schoolName} (Guru Mandiri)` : schoolName,
        npsn,
        code: schoolCode,
        plan,
        workspace_type: workspaceType,
        status: 'active',
        subscription_started_at: startDate.toISOString().slice(0, 10),
        subscription_expires_at: expiryDate.toISOString().slice(0, 10),
        max_teachers: planLimits.max_teachers,
        max_students: planLimits.max_students,
        max_classes: planLimits.max_classes,
      })
      .select()
      .single();

    if (schoolErr || !school) {
      return json(res, 400, { error: schoolErr?.message || 'Gagal mendaftarkan data sekolah/guru.' });
    }

    // 5. Buat School Profile dengan alamat terstruktur
    const currentYear = new Date().getFullYear();
    const tahunPelajaran = `${currentYear}/${currentYear + 1}`;
    const alamatJsonString = `__EXTJSON__:${JSON.stringify(alamatDetail)}`;

    await admin.from('school_profile').insert({
      school_id: school.id,
      nama_sekolah: schoolName,
      npsn,
      jenjang,
      alamat: alamatJsonString,
      tahun_pelajaran: tahunPelajaran,
      semester: '1',
      nama_kepala_sekolah: isTeacherPlan ? '-' : adminName,
      nama_wali_kelas: isTeacherPlan ? adminName : '-',
      kelas: isTeacherPlan ? `Kelas ${teacherGrade}` : '-',
    });

    // 6. Buat System Config Default
    await admin.from('system_config').insert({
      school_id: school.id,
      app_title: `Sistem Presensi ${schoolName}`,
      app_subtitle: isTeacherPlan ? 'Platform Presensi Guru Mandiri' : 'Platform Presensi & Rekapitulasi Digital SD',
      active_study_days: [1, 2, 3, 4, 5],
      student_self_attendance_enabled: plan === 'school',
      check_in_start_time: '06:00',
      check_in_deadline_time: '07:00',
      check_out_start_time: '12:30',
      auto_mark_late: true,
    });

    // 7. Inisialisasi Otomatis Rombel Kelas Sesuai Paket
    let initialClasses: { school_id: string; name: string; grade: number }[] = [];
    if (isTeacherPlan) {
      initialClasses = [{ school_id: school.id, name: `Kelas ${teacherGrade}`, grade: teacherGrade }];
    } else {
      initialClasses = generateInitialClasses(school.id, planLimits.defaultClasses);
    }

    let createdClassRows: any[] = [];
    try {
      const { data: insertedClasses } = await admin.from('classes').insert(initialClasses).select();
      if (insertedClasses) createdClassRows = insertedClasses;
    } catch (classErr) {
      console.warn('Inisialisasi rombel kelas otomatis mengalami peringatan:', classErr);
    }

    // 8. Inisialisasi Mata Pelajaran Dasar SD
    const defaultSubjects = [
      { school_id: school.id, name: 'Tematik / Guru Kelas (Wali Kelas)', code: 'TMK', is_specialized: false },
      { school_id: school.id, name: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', code: 'PJOK', is_specialized: true },
      { school_id: school.id, name: 'Pendidikan Agama & Budi Pekerti (PABP)', code: 'PABP', is_specialized: true },
      { school_id: school.id, name: 'Bahasa Daerah / Muatan Lokal (MULOK)', code: 'MULOK', is_specialized: true },
    ];
    try {
      await admin.from('subjects').insert(defaultSubjects);
    } catch (_) {}

    // 9. Buat Akun Auth Supabase untuk Pengguna (Guru / Admin)
    const userAuthEmail = adminEmail || `${effectiveUsername}@login.edushift.local`;
    const userRole = plan === 'school' ? 'ADMIN' : (teacherType === 'GURU_MAPEL' ? 'GURU MAPEL' : 'WALI KELAS');

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: userAuthEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        username: effectiveUsername,
        role: userRole,
        school_id: school.id,
        phone: adminPhone,
      },
    });

    if (authErr || !authData.user) {
      // Rollback sekolah jika gagal buat user
      await admin.from('schools').delete().eq('id', school.id);
      return json(res, 400, { error: authErr?.message || 'Gagal membuat akun autentikasi pengguna.' });
    }

    // 10. Buat Profil Pengguna
    const { error: profileErr } = await admin.from('profiles').insert({
      id: authData.user.id,
      school_id: school.id,
      name: adminName,
      username: effectiveUsername,
      email: userAuthEmail,
      role: userRole,
      is_active: true,
      must_change_password: false,
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(authData.user.id);
      await admin.from('schools').delete().eq('id', school.id);
      return json(res, 400, { error: profileErr.message || 'Gagal menyimpan profil pengguna.' });
    }

    // 10b. Hubungkan Guru ke Guru Table & Class Assignment
    if (isTeacherPlan) {
      try {
        const { data: teacherRow, error: teacherError } = await admin.from('teachers').insert({
          school_id: school.id,
          nama: adminName,
          nip: (teacherNip || '').trim() || null,
          jenis_kelamin: 'L',
          jabatan: teacherType === 'GURU_MAPEL' ? 'Guru Mapel' : 'Wali Kelas',
          jenis_ptk: teacherType === 'GURU_MAPEL' ? 'Guru Mapel' : 'Wali Kelas',
          no_hp: adminPhone || '-',
          mata_pelajaran: teacherType === 'GURU_MAPEL' ? teacherSubject : 'Tematik',
        }).select('id').single();
        if (teacherError || !teacherRow) throw teacherError || new Error('Gagal membuat data guru.');
        await admin.from('profiles').update({ teacher_id: teacherRow.id }).eq('id', authData.user.id);

        if (createdClassRows.length > 0) {
          const primaryClass = createdClassRows[0];
          await admin.from('teacher_class_assignments').insert({
            school_id: school.id,
            teacher_id: teacherRow.id,
            class_id: primaryClass.id,
          });

          if (teacherType === 'WALI_KELAS') {
            await admin.from('classes').update({ wali_kelas_id: teacherRow.id }).eq('id', primaryClass.id);
          }
        }
      } catch (linkErr) {
        console.warn('Penghubungan data guru dan rombel mengalami catatan:', linkErr);
      }
    }

    // 11. Audit Log Pendaftaran
    try {
      await admin.from('audit_logs').insert({
        actor_id: authData.user.id,
        actor_name: adminName,
        actor_role: userRole,
        action: 'PUBLIC_REGISTER_SCHOOL',
        school_id: school.id,
        details: {
          npsn,
          schoolName,
          plan,
          adminUsername: effectiveUsername,
          role: userRole,
          classesCreated: initialClasses.length,
        },
      });
    } catch (_) {}

    return json(res, 200, {
      ok: true,
      message: `Pendaftaran berhasil! Akun ${effectiveUsername} (${userRole}) telah aktif.`,
      school: {
        id: school.id,
        name: schoolName,
        npsn,
        plan,
        status: 'active',
        subscription_expires_at: expiryDate.toISOString().slice(0, 10),
      },
      admin: {
        id: authData.user.id,
        username: effectiveUsername,
        name: adminName,
        email: userAuthEmail,
        role: userRole,
      },
      classesCreated: initialClasses.length,
    });
  } catch (error: any) {
    console.error('Error saat pendaftaran sekolah:', error);
    return json(res, 500, { error: error.message || 'Terjadi kesalahan sistem saat memproses pendaftaran.' });
  }
}

