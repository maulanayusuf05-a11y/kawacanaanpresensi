import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Metode permintaan tidak diizinkan. Gunakan POST.' });
  }

  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  const body = req.body || {};
  const action = body.action;

  if (!url || !serviceKey) {
    return json(res, 500, { error: 'Supabase belum dikonfigurasi di server. Silakan isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Semua aksi selain lookup harus berasal dari sesi Supabase Auth yang valid.
  // Pembuatan akun baru dilakukan melalui /api/admin-users oleh ADMIN/SUPER_ADMIN.
  const publicLookupActions = new Set(['lookup_school','lookup_student']);
  let callerUser: any = null;
  if (!publicLookupActions.has(action)) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(res, 401, { error: 'Sesi login diperlukan.' });
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) return json(res, 401, { error: 'Sesi login tidak valid.' });
    callerUser = authData.user;
    if (body.userId && body.userId !== callerUser.id) return json(res, 403, { error: 'Akun tidak sesuai dengan sesi login.' });
    return json(res, 403, { error: 'Onboarding akun dinonaktifkan. Akun pengguna dibuat oleh ADMIN sekolah melalui menu Data Pengguna.' });
  }

  try {
    // -------------------------------------------------------------
    // 1. LOOKUP SEKOLAH / KODE UNDANGAN / NPSN
    // -------------------------------------------------------------
    if (action === 'lookup_school') {
      const query = String(body.query || '').trim();
      if (!query) {
        return json(res, 400, { error: 'Masukkan kode sekolah, NPSN, atau nama sekolah.' });
      }

      // Cari di tabel school_profile dan schools
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
        schoolMap.set(sp.school_id, {
          id: sp.school_id,
          name: sp.nama_sekolah,
          npsn: sp.npsn || '',
          jenjang: sp.jenjang || 'SD',
          alamat: sp.alamat || '',
        });
      }

      for (const sc of matchedSchools || []) {
        if (!schoolMap.has(sc.id)) {
          schoolMap.set(sc.id, {
            id: sc.id,
            name: sc.name,
            npsn: sc.npsn || '',
            jenjang: 'SD',
            alamat: '',
          });
        }
      }

      const schools = [];
      for (const [, sc] of schoolMap) {
        // Ambil kelas untuk sekolah ini
        const { data: cls } = await db
          .from('classes')
          .select('id, name, grade')
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
    // 2. LOOKUP DATA SISWA BERDASARKAN NISN
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

      // Ambil nama sekolah
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
    // 3. DAFTAR AKUN BARU SUPABASE AUTH & ONBOARDING (BUAT AKUN GRATIS)
    // -------------------------------------------------------------
    if (action === 'register_and_onboard') {
      return json(res, 403, { error: 'Pendaftaran akun baru dari halaman publik dinonaktifkan. Akun dibuat oleh ADMIN sekolah melalui menu Data Pengguna.' });
    }

    return json(res, 403, { error: 'Onboarding akun dinonaktifkan. Akun dibuat oleh ADMIN sekolah melalui menu Data Pengguna.' });
  } catch (err: any) {
    console.error('Onboarding handler error:', err);
    return json(res, 500, { error: err.message || 'Terjadi kesalahan pada server onboarding.' });
  }
}
