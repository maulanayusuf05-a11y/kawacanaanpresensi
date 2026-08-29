/**
 * SISTEM PAKET, RUANG KERJA, LANGGANAN, DAN ROLE KAWACANAAN
 * 
 * Standar Penamaan Entitas & Database (Bahasa Indonesia):
 * - ruang_kerja: Ruang kerja tenant (tipe: 'individu' | 'sekolah')
 * - anggota_ruang_kerja: Keanggotaan pengguna dalam ruang kerja dengan role
 * - paket: Master konfigurasi paket (Guru Gratis, Guru Uji Coba, Guru Pro, Sekolah Gratis, Sekolah Uji Coba, Sekolah Pro)
 * - langganan: Status langganan ruang kerja ('gratis' | 'uji_coba' | 'pro')
 * - pembayaran: Transaksi & invoice pembayaran upgrade paket
 * - tahun_ajaran: Tahun ajaran aktif untuk isolasi penugasan
 * - siswa: Data peserta didik
 * - guru: Data pendidik (Wali Kelas ATAU Guru Mapel per tahun ajaran)
 * - kelas: Rombongan belajar
 * - mata_pelajaran: Mata pelajaran yang diampu oleh Guru Mapel
 */

export type RuangKerjaType = 'individu' | 'sekolah';
export type PaketStatus = 'gratis' | 'uji_coba' | 'pro';

export type PaketGuruId = 'guru_gratis' | 'guru_uji_coba' | 'guru_pro';
export type PaketSekolahId = 'sekolah_gratis' | 'sekolah_uji_coba' | 'sekolah_pro';
export type PaketId = PaketGuruId | PaketSekolahId;

/**
 * 4 Role Resmi dalam Ruang Kerja Sekolah:
 * 1. Admin Sekolah ('ADMIN')
 * 2. Wali Kelas ('WALI KELAS')
 * 3. Guru Mapel ('GURU MAPEL')
 * 4. Siswa ('SISWA')
 */
export type SchoolRole = 'Admin Sekolah' | 'Wali Kelas' | 'Guru Mapel' | 'Siswa';

export interface PaketConfig {
  id: PaketId;
  nama: string;
  tipeRuangKerja: RuangKerjaType;
  statusPaket: PaketStatus;
  harga: number; // Dalam Rupiah (IDR) - Dapat diatur Super Admin
  hargaFormatted?: string;
  durasiHari: number; // Hari masa aktif (0 = tanpa batas / lifetime)
  kapasitasSiswa: number; // Maksimal siswa - Dapat diatur Super Admin
  kapasitasGuru: number; // Maksimal guru - Dapat diatur Super Admin
  kapasitasKelas: number; // Maksimal kelas - Dapat diatur Super Admin
  fitur: string[]; // Daftar fitur yang aktif
  deskripsi: string;
  isAktif?: boolean;
}

export interface LanggananRuangKerja {
  paketId: PaketId;
  paketNama: string;
  tipeRuangKerja: RuangKerjaType;
  status: PaketStatus;
  tanggalMulai: string | null;
  tanggalKedaluwarsa: string | null;
  sisaHari: number | null;
  maksSiswa: number;
  maksGuru: number;
  maksKelas: number;
  fiturAktif: string[];
}

export interface MasterPaketSettings {
  guru_gratis: PaketConfig;
  guru_uji_coba: PaketConfig;
  guru_pro: PaketConfig;
  sekolah_gratis: PaketConfig;
  sekolah_uji_coba: PaketConfig;
  sekolah_pro: PaketConfig;
}

/**
 * Konfigurasi Standar Master Paket (Default Factory Settings)
 * Super Admin dapat mengubah seluruh nilai harga, durasi, dan kapasitas di platform_settings.
 */
export const DEFAULT_MASTER_PAKET: MasterPaketSettings = {
  // -------------------------------------------------------------
  // 1. PAKET RUANG KERJA INDIVIDU (UNTUK GURU)
  // -------------------------------------------------------------
  guru_gratis: {
    id: 'guru_gratis',
    nama: 'Guru Gratis',
    tipeRuangKerja: 'individu',
    statusPaket: 'gratis',
    harga: 0,
    durasiHari: 0, // Tanpa batas kedaluwarsa
    kapasitasSiswa: 32,
    kapasitasGuru: 1,
    kapasitasKelas: 1,
    fitur: [
      'Presensi Harian Siswa 1 Kelas',
      'Rekap Kehadiran Standar Bulanan',
      'Unduh Rekap Spreadsheet',
      'Kop Surat Sederhana'
    ],
    deskripsi: 'Akses gratis selamanya untuk guru mengelola presensi 1 rombel binaan mandiri.'
  },
  guru_uji_coba: {
    id: 'guru_uji_coba',
    nama: 'Guru Uji Coba',
    tipeRuangKerja: 'individu',
    statusPaket: 'uji_coba',
    harga: 0,
    durasiHari: 14, // 14 hari masa uji coba
    kapasitasSiswa: 45,
    kapasitasGuru: 1,
    kapasitasKelas: 3,
    fitur: [
      'Akses Penuh Semua Fitur Guru Pro',
      'Kelola hingga 3 Rombel / Kelas',
      'Presensi Mandiri Siswa via HP',
      'Cetak Laporan Kop Surat Resmi Kustom',
      'Ekspor Format PDF & Excel Lengkap'
    ],
    deskripsi: 'Coba gratis seluruh fitur premium Guru Pro selama 14 hari tanpa komitmen.'
  },
  guru_pro: {
    id: 'guru_pro',
    nama: 'Guru Pro',
    tipeRuangKerja: 'individu',
    statusPaket: 'pro',
    harga: 49000, // Rp 49.000 / tahun (dapat disesuaikan Super Admin)
    durasiHari: 365, // 1 tahun
    kapasitasSiswa: 100,
    kapasitasGuru: 2,
    kapasitasKelas: 5,
    fitur: [
      'Semua Fitur Guru Uji Coba',
      'Kapasitas Siswa & Kelas Lebih Besar',
      'Cetak Laporan Format Resmi Kedinasan',
      'Analisis & Statistik Kehadiran Real-time',
      'Dukungan Prioritas WhatsApp'
    ],
    deskripsi: 'Solusi lengkap bagi guru profesional untuk kelola multi-kelas dan laporan presensi.'
  },

  // -------------------------------------------------------------
  // 2. PAKET RUANG KERJA SEKOLAH (UNTUK SEKOLAH)
  // -------------------------------------------------------------
  sekolah_gratis: {
    id: 'sekolah_gratis',
    nama: 'Sekolah Gratis',
    tipeRuangKerja: 'sekolah',
    statusPaket: 'gratis',
    harga: 0,
    durasiHari: 0,
    kapasitasSiswa: 60,
    kapasitasGuru: 3,
    kapasitasKelas: 2,
    fitur: [
      'Manajemen Multi-User Dasar',
      'Presensi Harian Wali Kelas & Mapel',
      'Rekap Bulanan Standar',
      '2 Kelas Rombel Sekolah'
    ],
    deskripsi: 'Paket dasar gratis untuk sekolah kecil dengan kapasitas terbatas.'
  },
  sekolah_uji_coba: {
    id: 'sekolah_uji_coba',
    nama: 'Sekolah Uji Coba',
    tipeRuangKerja: 'sekolah',
    statusPaket: 'uji_coba',
    harga: 0,
    durasiHari: 14, // 14 hari uji coba
    kapasitasSiswa: 300,
    kapasitasGuru: 16,
    kapasitasKelas: 12,
    fitur: [
      'Akses Penuh Seluruh Fitur Sekolah Pro',
      'Multi-Role: Admin Sekolah, Wali Kelas, Guru Mapel, Siswa',
      'Portal Siswa & Presensi Mandiri HP',
      'Cetak Kop Resmi & Rekap Kedinasan Lengkap',
      'Generator Akun Otomatis Seluruh Guru & Siswa'
    ],
    deskripsi: 'Uji coba gratis seluruh fitur enterprise sekolah selama 14 hari penuh.'
  },
  sekolah_pro: {
    id: 'sekolah_pro',
    nama: 'Sekolah Pro',
    tipeRuangKerja: 'sekolah',
    statusPaket: 'pro',
    harga: 199000, // Rp 199.000 / tahun (dapat disesuaikan Super Admin)
    durasiHari: 365, // 1 tahun
    kapasitasSiswa: 1000,
    kapasitasGuru: 50,
    kapasitasKelas: 36,
    fitur: [
      'Semua Fitur Sekolah Uji Coba',
      'Kapasitas Skala Penuh Seluruh Sekolah',
      'Hak Akses Terpisah Wali Kelas & Guru Mapel',
      'Validasi Anti Tumpang-Tindih Guru Mapel & Wali Kelas',
      'Laporan Presensi Semester & Tahunan Lengkap',
      'Dukungan VIP & Bimbingan Teknis Onboarding'
    ],
    deskripsi: 'Sistem presensi multi-user terpadu dan profesional untuk seluruh unit sekolah.'
  }
};

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Menggabungkan konfigurasi master paket default dengan penyesuaian dinamis dari Super Admin
 */
export function mergeMasterPaketConfig(customConfig?: Partial<MasterPaketSettings> | null): MasterPaketSettings {
  if (!customConfig) return DEFAULT_MASTER_PAKET;

  const result = { ...DEFAULT_MASTER_PAKET };
  const keys: (keyof MasterPaketSettings)[] = [
    'guru_gratis',
    'guru_uji_coba',
    'guru_pro',
    'sekolah_gratis',
    'sekolah_uji_coba',
    'sekolah_pro'
  ];

  for (const k of keys) {
    if (customConfig[k]) {
      result[k] = {
        ...DEFAULT_MASTER_PAKET[k],
        ...customConfig[k],
        hargaFormatted: formatRupiah(customConfig[k]?.harga ?? DEFAULT_MASTER_PAKET[k].harga)
      };
    } else {
      result[k].hargaFormatted = formatRupiah(result[k].harga);
    }
  }

  return result;
}

/**
 * Mendapatkan informasi langganan ruang kerja yang aktif, menghitung sisa hari,
 * dan menerapkan alur transisi otomatis:
 * - Uji Coba habis → kembali ke Gratis
 * - Pro habis → kembali ke Gratis
 * - DATA TIDAK DIHAPUS saat turun ke Gratis.
 */
export function resolveWorkspaceSubscription(
  workspace: {
    workspace_type?: string | null;
    workspaceType?: string | null;
    plan?: string | null;
    status?: string | null;
    subscription_started_at?: string | null;
    subscriptionStartedAt?: string | null;
    subscription_expires_at?: string | null;
    subscriptionExpiresAt?: string | null;
    max_teachers?: number | null;
    max_students?: number | null;
    max_classes?: number | null;
  } | null | undefined,
  masterPaket: MasterPaketSettings = DEFAULT_MASTER_PAKET
): LanggananRuangKerja {
  const wsTypeRaw = (workspace?.workspace_type || workspace?.workspaceType || 'school').toLowerCase();
  const isIndividu = wsTypeRaw === 'individu' || wsTypeRaw === 'personal';
  const tipeRuangKerja: RuangKerjaType = isIndividu ? 'individu' : 'sekolah';

  const rawPlan = (workspace?.plan || '').toLowerCase();
  const rawStatus = (workspace?.status || 'active').toLowerCase();
  const expiresAtStr = workspace?.subscription_expires_at || workspace?.subscriptionExpiresAt || null;
  const startedAtStr = workspace?.subscription_started_at || workspace?.subscriptionStartedAt || null;

  // Tentukan status paket berdasarkan data & tanggal kedaluwarsa
  let status: PaketStatus = 'gratis';
  let targetPaketId: PaketId = isIndividu ? 'guru_gratis' : 'sekolah_gratis';

  // Cek apakah ada status eksplisit atau plan pro / uji coba
  const isProPlan = rawPlan.includes('pro') || rawPlan === 'school' || rawPlan === 'teacher';
  const isTrialPlan = rawPlan.includes('trial') || rawPlan.includes('uji_coba') || rawPlan.includes('uji coba');

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let sisaHari: number | null = null;
  let isExpired = false;

  if (expiresAtStr) {
    const expiry = new Date(expiresAtStr);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - now.getTime();
    sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (sisaHari < 0) {
      isExpired = true;
    }
  }

  // ALUR BISNIS SIKLUS PAKET:
  // 1. Jika dalam masa Uji Coba:
  if (isTrialPlan || rawStatus === 'trial' || rawStatus === 'uji_coba') {
    if (isExpired) {
      // Masa uji coba habis tanpa pembayaran -> kembali ke Gratis
      status = 'gratis';
      targetPaketId = isIndividu ? 'guru_gratis' : 'sekolah_gratis';
    } else {
      status = 'uji_coba';
      targetPaketId = isIndividu ? 'guru_uji_coba' : 'sekolah_uji_coba';
    }
  } 
  // 2. Jika Paket Pro:
  else if (isProPlan || rawStatus === 'pro' || (rawStatus === 'active' && expiresAtStr)) {
    if (isExpired) {
      // Masa Pro habis tanpa pembayaran perpanjangan -> kembali ke Gratis
      status = 'gratis';
      targetPaketId = isIndividu ? 'guru_gratis' : 'sekolah_gratis';
    } else {
      status = 'pro';
      targetPaketId = isIndividu ? 'guru_pro' : 'sekolah_pro';
    }
  }
  // 3. Standar Gratis:
  else {
    status = 'gratis';
    targetPaketId = isIndividu ? 'guru_gratis' : 'sekolah_gratis';
  }

  const paketDef = masterPaket[targetPaketId] || (isIndividu ? masterPaket.guru_gratis : masterPaket.sekolah_gratis);

  return {
    paketId: targetPaketId,
    paketNama: paketDef.nama,
    tipeRuangKerja,
    status,
    tanggalMulai: startedAtStr,
    tanggalKedaluwarsa: expiresAtStr,
    sisaHari: isExpired ? 0 : sisaHari,
    maksSiswa: workspace?.max_students || paketDef.kapasitasSiswa,
    maksGuru: workspace?.max_teachers || paketDef.kapasitasGuru,
    maksKelas: workspace?.max_classes || paketDef.kapasitasKelas,
    fiturAktif: paketDef.fitur,
  };
}

/**
 * =========================================================================
 * ATURAN PENUGASAN ROLE GURU DALAM RUANG KERJA SEKOLAH:
 * - Wali Kelas ditentukan dari classes.wali_kelas_teacher_id.
 * - Satu guru hanya boleh menjadi Wali Kelas untuk satu kelas dalam tahun/periode ajaran yang sama.
 * - Guru Mapel ditentukan dari subject_teacher_assignments.
 * - Guru Mapel dapat mengajar beberapa kelas.
 * - Wali Kelas juga boleh menjadi Guru Mapel jika dibuatkan penugasan secara eksplisit.
 * =========================================================================
 */
export interface TeacherRoleValidationResult {
  valid: boolean;
  conflictType?: 'WALI_KELAS_CONFLICT' | 'GURU_MAPEL_CONFLICT' | null;
  conflictDetails?: string;
  errorMessage?: string;
}

export function validateTeacherRoleAssignment(
  paramsOrTeacherId:
    | {
        teacherId?: string | null;
        teacherName?: string | null;
        teacherNip?: string | null;
        targetRole: 'WALI KELAS' | 'GURU MAPEL' | 'ADMIN' | 'SISWA' | 'wali_kelas' | 'guru_mapel' | string;
        schoolId?: string | null;
        academicYear?: string | null;
        existingClasses: Array<{
          id: string;
          name: string;
          waliKelasTeacherId?: string | null;
          waliKelasName?: string | null;
          academicYear?: string | null;
        }>;
        existingSubjects?: Array<{
          id: string;
          name: string;
          teacherId?: string | null;
          teacherName?: string | null;
        }>;
        teachers?: Array<{
          id: string;
          nama: string;
          nip?: string;
          jabatan?: string;
        }>;
      }
    | string,
  targetRolePos?: string,
  existingClassesPos?: Array<any>,
  existingSubjectsPos?: Array<any>,
  academicYearPos?: string | null,
  teachersPos?: Array<any>
): TeacherRoleValidationResult {
  let teacherId: string | null | undefined;
  let teacherName: string | null | undefined;
  let teacherNip: string | null | undefined;
  let targetRole: string;
  let academicYear: string | null | undefined;
  let existingClasses: Array<any>;
  let existingSubjects: Array<any>;
  let teachers: Array<any> = [];

  if (typeof paramsOrTeacherId === 'object' && paramsOrTeacherId !== null) {
    teacherId = paramsOrTeacherId.teacherId;
    teacherName = paramsOrTeacherId.teacherName;
    teacherNip = paramsOrTeacherId.teacherNip;
    targetRole = paramsOrTeacherId.targetRole;
    academicYear = paramsOrTeacherId.academicYear;
    existingClasses = paramsOrTeacherId.existingClasses || [];
    existingSubjects = paramsOrTeacherId.existingSubjects || [];
    teachers = paramsOrTeacherId.teachers || [];
  } else {
    teacherId = typeof paramsOrTeacherId === 'string' ? paramsOrTeacherId : null;
    targetRole = targetRolePos || '';
    existingClasses = existingClassesPos || [];
    existingSubjects = existingSubjectsPos || [];
    academicYear = academicYearPos;
    teachers = teachersPos || [];
  }

  let roleClean = targetRole.toUpperCase().trim();
  if (roleClean === 'WALI_KELAS') roleClean = 'WALI KELAS';
  if (roleClean === 'GURU_MAPEL') roleClean = 'GURU MAPEL';

  if (roleClean !== 'WALI KELAS') {
    return { valid: true };
  }

  const cleanName = (teacherName || '').trim().toLowerCase();
  const cleanNip = (teacherNip || '').trim().toLowerCase();

  // Cari referensi guru terkait
  const matchedTeacher = teachers.find(
    (t) =>
      (teacherId && t.id === teacherId) ||
      (cleanNip && cleanNip !== '-' && t.nip && t.nip.trim().toLowerCase() === cleanNip) ||
      (cleanName && t.nama && t.nama.trim().toLowerCase() === cleanName)
  );

  const tId = teacherId || matchedTeacher?.id;
  const tName = (matchedTeacher?.nama || teacherName || '').trim().toLowerCase();

  // Jika hendak menugaskan sebagai WALI KELAS:
  // Cek apakah guru ini SUDAH menjadi Wali Kelas pada kelas lain di tahun ajaran yang sama
  if (roleClean === 'WALI KELAS') {
    const existingHomeroomClass = existingClasses.find((cls) => {
      if (academicYear && cls.academicYear && cls.academicYear !== academicYear) return false;
      if (tId && cls.waliKelasTeacherId && cls.waliKelasTeacherId === tId) return true;
      if (tName && cls.waliKelasName && cls.waliKelasName.trim().toLowerCase() === tName) return true;
      return false;
    });

    if (existingHomeroomClass) {
      const details = `Guru "${matchedTeacher?.nama || teacherName || 'Pendidik'}" saat ini sudah menjadi Wali Kelas pada "${existingHomeroomClass.name}". Satu guru hanya boleh menjadi Wali Kelas untuk satu rombel kelas dalam tahun ajaran yang sama.`;
      return {
        valid: false,
        conflictType: 'WALI_KELAS_CONFLICT',
        conflictDetails: details,
        errorMessage: details,
      };
    }
  }

  return { valid: true };
}
