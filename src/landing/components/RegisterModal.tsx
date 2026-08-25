import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  ExternalLink,
  Layers,
  Lock,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  HelpCircle,
  Check,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
  initialPlanId?: 'free' | 'teacher' | 'school';
  lang?: 'ID' | 'EN';
}

interface SchoolLookupResult {
  npsn: string;
  namaSekolah: string;
  jenjang: string;
  status: 'Negeri' | 'Swasta';
  jalan: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodePos: string;
  teleponFax?: string;
  email?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  initialPlanId = 'free',
  lang = 'ID',
}) => {
  // Form State
  const [npsn, setNpsn] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [statusSekolah, setStatusSekolah] = useState<'Negeri' | 'Swasta'>('Negeri');
  const [alamat, setAlamat] = useState('');
  const [jalan, setJalan] = useState('');
  const [desaKelurahan, setDesaKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kabupatenKota, setKabupatenKota] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kodePos, setKodePos] = useState('');

  // Plan Selection (Pre-selected from initial choice)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'teacher' | 'school'>(
    initialPlanId || 'free'
  );

  // User / Teacher Details
  const isTeacherRegistration = selectedPlan === 'free' || selectedPlan === 'teacher';
  const [teacherType, setTeacherType] = useState<'WALI_KELAS' | 'GURU_MAPEL'>('WALI_KELAS');
  const [teacherGrade, setTeacherGrade] = useState<number>(1);
  const [teacherSubject, setTeacherSubject] = useState<string>('PJOK');
  const [teacherNip, setTeacherNip] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Lookup & Processing Status
  const [isSearchingNpsn, setIsSearchingNpsn] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Success State
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    schoolName: string;
    npsn: string;
    username: string;
    role: string;
    plan: string;
    classesCount: number;
    assignedClassOrSubject?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitError('');
      setRegistrationSuccessData(null);
      if (initialPlanId) {
        setSelectedPlan(initialPlanId);
      }
    }
  }, [isOpen, initialPlanId]);

  if (!isOpen) return null;

  // Auto generated username based on role and NPSN orientation: guru.<NPSN> / admin.<NPSN>
  const cleanNpsnDigits = npsn.replace(/\D/g, '');
  const generatedUsername = isTeacherRegistration
    ? cleanNpsnDigits
      ? `guru.${cleanNpsnDigits}`
      : 'guru.<NPSN>'
    : cleanNpsnDigits
    ? `admin.${cleanNpsnDigits}`
    : 'admin.<NPSN>';

  // Auto-Lookup Data Sekolah dari Kemendikdasmen via API
  const handleLookupNpsn = async (targetNpsn?: string) => {
    const inputVal = (targetNpsn || cleanNpsnDigits).trim();
    if (inputVal.length !== 8) {
      setLookupError(lang === 'ID' ? 'Masukkan 8 digit NPSN sekolah resmi.' : 'Enter 8 digits school NPSN.');
      return;
    }

    setIsSearchingNpsn(true);
    setLookupError('');
    setLookupSuccess(false);

    try {
      const res = await fetch(`/api/school-lookup?npsn=${inputVal}`);
      const rawData = await res.json();
      const item: SchoolLookupResult = rawData?.data || rawData;

      if (res.ok && item && (item.namaSekolah || item.npsn)) {
        setSchoolName(item.namaSekolah || `SD NEGERI ${inputVal}`);
        setStatusSekolah(item.status || 'Negeri');
        setJalan(item.jalan || '');
        setDesaKelurahan(item.desaKelurahan || '');
        setKecamatan(item.kecamatan || '');
        setKabupatenKota(item.kabupatenKota || '');
        setProvinsi(item.provinsi || '');
        setKodePos(item.kodePos || '');

        const fullAlamat = [
          item.jalan,
          item.desaKelurahan ? `Kel. ${item.desaKelurahan}` : '',
          item.kecamatan ? (item.kecamatan.startsWith('Kec.') ? item.kecamatan : `Kec. ${item.kecamatan}`) : '',
          item.kabupatenKota,
          item.provinsi,
          item.kodePos ? `Kode Pos ${item.kodePos}` : '',
        ]
          .filter(Boolean)
          .join(', ');

        setAlamat(fullAlamat || item.jalan || '');
        if (item.teleponFax && !phone) setPhone(item.teleponFax);
        if (item.email && !email) setEmail(item.email);

        setLookupSuccess(true);
      } else {
        setLookupError(
          rawData?.error ||
            (lang === 'ID'
              ? 'NPSN belum terindeks otomatis di server. Anda dapat melengkapi nama sekolah di bawah.'
              : 'NPSN not indexed in online server. You can enter school name below.')
        );
        if (!schoolName) {
          setSchoolName(`SD NEGERI ${inputVal}`);
        }
      }
    } catch (err: any) {
      setLookupError(
        lang === 'ID'
          ? 'Koneksi ke data referensi tidak tersedia. Silakan lengkapi nama sekolah secara mandiri.'
          : 'Failed to connect to school registry. Please complete manually.'
      );
      if (!schoolName) {
        setSchoolName(`SD NEGERI ${inputVal}`);
      }
    } finally {
      setIsSearchingNpsn(false);
    }
  };

  const handleNpsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setNpsn(val);
    setLookupError('');
    if (val.length === 8) {
      handleLookupNpsn(val);
    } else {
      setLookupSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (cleanNpsnDigits.length !== 8) {
      setSubmitError(lang === 'ID' ? 'NPSN harus berupa 8 digit angka.' : 'NPSN must be 8 digits.');
      return;
    }

    if (!schoolName.trim()) {
      setSubmitError(lang === 'ID' ? 'Nama sekolah wajib diisi.' : 'School name is required.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError(
        isTeacherRegistration
          ? (lang === 'ID' ? 'Nama lengkap Guru wajib diisi.' : 'Teacher name is required.')
          : (lang === 'ID' ? 'Nama penanggung jawab/Admin wajib diisi.' : 'Admin name is required.')
      );
      return;
    }

    if (!password || password.length < 8) {
      setSubmitError(
        lang === 'ID'
          ? 'Kata sandi minimal 8 karakter demi keamanan akun.'
          : 'Password must be at least 8 characters.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        npsn: cleanNpsnDigits,
        schoolName: schoolName.trim(),
        status: statusSekolah,
        plan: selectedPlan,
        jenjang: 'SD',
        alamat,
        jalan,
        desaKelurahan,
        kecamatan,
        kabupatenKota,
        provinsi,
        kodePos,
        // Akun fields
        adminName: fullName.trim(),
        adminPhone: phone.trim(),
        adminEmail: email.trim(),
        adminPassword: password,
        // Guru specific fields
        teacherType,
        teacherGrade,
        teacherSubject: teacherType === 'GURU_MAPEL' ? teacherSubject : 'Tematik / Guru Kelas',
        teacherNip: teacherNip.trim(),
      };

      const res = await fetch('/api/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || (lang === 'ID' ? 'Pendaftaran gagal.' : 'Registration failed.'));
      }

      const assignedInfo = isTeacherRegistration
        ? teacherType === 'WALI_KELAS'
          ? `Wali Kelas SD (Kelas ${teacherGrade})`
          : `Guru Mata Pelajaran (${teacherSubject})`
        : 'Administrator & Kepala Sekolah';

      setRegistrationSuccessData({
        schoolName: schoolName.trim(),
        npsn: cleanNpsnDigits,
        username: data.admin?.username || generatedUsername,
        role: data.admin?.role || (isTeacherRegistration ? 'WALI KELAS' : 'ADMIN'),
        plan:
          selectedPlan === 'free'
            ? 'Paket Mulai / Gratis (Rp0 - 1 Guru, 32 Siswa)'
            : selectedPlan === 'teacher'
            ? 'Paket Guru Mandiri (Rp31.000/bln, 1 Guru, 32 Siswa)'
            : 'Paket Sekolah Lengkap (Rp270.000/bln, 8 Guru + 1 Kepsek)',
        classesCount: data.classesCreated || (selectedPlan === 'school' ? 6 : 1),
        assignedClassOrSubject: assignedInfo,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!registrationSuccessData) return;
    const text = `KREDENSIAL AKUN PRESENSI SD\nSekolah: ${registrationSuccessData.schoolName}\nNPSN: ${registrationSuccessData.npsn}\nNama Pendidik/Admin: ${fullName}\nUsername: ${registrationSuccessData.username}\nPassword: ${password}\nPeran: ${registrationSuccessData.assignedClassOrSubject || registrationSuccessData.role}\nPaket: ${registrationSuccessData.plan}\nLink Login: ${window.location.origin}/?page=login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenLoginInNewTab = () => {
    const targetUrl = `/?page=login&user=${encodeURIComponent(registrationSuccessData?.username || '')}`;
    window.open(targetUrl, '_blank');
    onClose();
    if (onOpenLogin) {
      onOpenLogin();
    }
  };

  // Plan info display configuration
  const planInfo = {
    free: {
      name: 'Paket Mulai / Gratis',
      price: 'Rp0 / Bulan',
      badge: '1 Guru Gratis (32 Siswa)',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Diberikan untuk 1 guru per sekolah. Langsung aktif ke dashboard guru untuk 1 rombel.',
    },
    teacher: {
      name: 'Paket Guru Mandiri',
      price: 'Rp31.000 / Bulan',
      badge: '1 Guru Mandiri (32 Siswa)',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Bisa didaftarkan oleh beberapa guru di sekolah yang sama. Terhubung ke 1 rombel.',
    },
    school: {
      name: 'Paket Sekolah Lengkap',
      price: 'Rp270.000 / Bulan',
      badge: '1 Institusi Sekolah (8 Guru + Kepsek)',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Mencakup seluruh rombel kelas 1–6, 8 guru mapel/wali kelas, portal siswa, dan rekap dinas.',
    },
  }[selectedPlan];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto antialiased">
      <div className="relative w-full max-w-2xl my-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>

        {/* ===================== SUCCESS SCREEN ===================== */}
        {registrationSuccessData ? (
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
                {isTeacherRegistration ? 'Akun Guru Berhasil Diaktifkan' : 'Akun Administrator Berhasil Diaktifkan'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isTeacherRegistration ? 'Selamat Datang, Bapak/Ibu Guru!' : 'Selamat Datang di Kawacanaan Presensi!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Akun untuk <strong>{fullName}</strong> di <strong>{registrationSuccessData.schoolName}</strong> telah siap digunakan.
                {isTeacherRegistration
                  ? ` Anda dapat langsung masuk ke Dashboard Guru untuk mengelola presensi siswa ${registrationSuccessData.assignedClassOrSubject}.`
                  : ` Sistem telah menginisialisasi ${registrationSuccessData.classesCount} Rombel Kelas SD secara otomatis.`}
              </p>
            </div>

            {/* Credential Box */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span>Kredensial Akses Pengguna</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin Data Akun'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Username Masuk</span>
                  <span className="font-mono font-black text-indigo-700 text-sm">{registrationSuccessData.username}</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Kata Sandi (Password)</span>
                  <span className="font-mono font-black text-slate-800 text-sm">•••••••• ({password.slice(0, 3)}***)</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Peran & Penugasan</span>
                  <span className="font-bold text-slate-800">{registrationSuccessData.assignedClassOrSubject}</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Paket</span>
                  <span className="font-bold text-emerald-700">{registrationSuccessData.plan}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-medium leading-relaxed">
                💡 <strong>Langkah Selanjutnya:</strong> Gunakan username <code>{registrationSuccessData.username}</code> untuk login. Anda akan langsung diarahkan ke Dashboard Guru dan dapat langsung mencatat presensi harian siswa.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenLoginInNewTab}
                className="w-full sm:flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buka Tab Baru & Masuk ke Dashboard</span>
                <ExternalLink size={17} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-4 px-6 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        ) : (
          /* ===================== REGISTRATION FORM ===================== */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Header */}
            <div className="text-left space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                <School size={13} className="text-indigo-600" />
                <span>{isTeacherRegistration ? 'Pendaftaran Akun Guru Mandiri' : 'Pendaftaran Administrator Sekolah'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isTeacherRegistration ? 'Formulir Pendaftaran Guru Presensi SD' : 'Formulir Pendaftaran Administrator Sekolah'}
              </h2>
              <p className="text-xs text-slate-500">
                {isTeacherRegistration
                  ? 'Guru langsung membuat akun dan langsung terhubung ke kelas yang diampu tanpa perlu membuat akun Admin.'
                  : 'Pendaftaran 1 sekolah utuh untuk kepala sekolah dan 8 guru mata pelajaran/wali kelas.'}
              </p>
            </div>

            {/* SELECTED PLAN DISPLAY BADGE (Replaces redundant 3-card selector) */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Paket yang Anda Pilih:</span>
                </div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  <span>{planInfo.name}</span>
                  <span className="text-xs font-bold text-amber-300">({planInfo.price})</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {planInfo.description}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-white/10 text-white border border-white/20">
                  {planInfo.badge}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 font-medium animate-in fade-in">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{submitError}</span>
              </div>
            )}

            {/* SECTION 1: NPSN & AUTO-LOOKUP DARI KEMENDIKDASMEN */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" />
                  <span>1. NPSN Sekolah (8 Digit Angka)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <a
                  href="https://referensi.data.kemendikdasmen.go.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Data Kemendikdasmen RI</span>
                  <ExternalLink size={10} />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={npsn}
                    onChange={handleNpsnChange}
                    placeholder="Masukkan 8 digit NPSN (Contoh: 20108801)"
                    maxLength={8}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  {isSearchingNpsn && (
                    <div className="absolute right-3 top-3 text-indigo-600 animate-spin">
                      <Loader2 size={16} />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleLookupNpsn()}
                  disabled={cleanNpsnDigits.length !== 8 || isSearchingNpsn}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Search size={14} />
                  <span>Cek NPSN</span>
                </button>
              </div>

              {lookupError && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2">
                  <HelpCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>{lookupError}</span>
                </div>
              )}

              {/* Data Sekolah Terverifikasi Resmi */}
              {lookupSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-900 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-black text-emerald-800">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Sekolah Terverifikasi Kemendikdasmen:</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{schoolName}</div>
                  <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span>{alamat || `${desaKelurahan}, ${kecamatan}, ${kabupatenKota}`}</span>
                  </div>
                </div>
              )}

              {/* Nama Sekolah & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Nama Resmi Sekolah:
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="SD NEGERI ..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Status Sekolah:
                  </label>
                  <select
                    value={statusSekolah}
                    onChange={(e) => setStatusSekolah(e.target.value as 'Negeri' | 'Swasta')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                  >
                    <option value="Negeri">Sekolah Negeri (SDN)</option>
                    <option value="Swasta">Sekolah Swasta (SDS / SD IT / MI)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: DATA AKUN GURU (JIKA PAKET GURU/GRATIS) ATAU ADMIN (JIKA PAKET SEKOLAH) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                {isTeacherRegistration ? <GraduationCap size={14} className="text-indigo-600" /> : <User size={14} />}
                <span>
                  {isTeacherRegistration ? '2. Data Akun Guru & Penugasan Kelas' : '2. Data Akun Administrator Sekolah'}
                </span>
                <span className="text-rose-500">*</span>
              </label>

              {/* Auto Generated Username Box */}
              <div className="p-3 bg-white border border-indigo-200 rounded-xl flex items-center justify-between shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                    {isTeacherRegistration ? 'Username Akun Guru Dibuat Otomatis:' : 'Username Administrator Dibuat Otomatis:'}
                  </span>
                  <div className="font-mono font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>{generatedUsername}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-sans font-bold">
                      {isTeacherRegistration ? 'Format guru.<NPSN>' : 'Format admin.<NPSN>'}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 hidden sm:block">
                  Role: <strong>{isTeacherRegistration ? (teacherType === 'WALI_KELAS' ? 'WALI KELAS' : 'GURU MAPEL') : 'ADMIN UTAMA'}</strong>
                </div>
              </div>

              {/* Pilihan Tugas Guru (Wali Kelas vs Guru Mapel) */}
              {isTeacherRegistration && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2.5">
                  <span className="text-[10px] uppercase font-black text-indigo-900 block">
                    Penugasan Guru di Sekolah:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        teacherType === 'WALI_KELAS'
                          ? 'bg-white border-indigo-600 text-indigo-900 shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="teacherType"
                        checked={teacherType === 'WALI_KELAS'}
                        onChange={() => setTeacherType('WALI_KELAS')}
                        className="text-indigo-600"
                      />
                      <span>Wali Kelas</span>
                    </label>

                    <label
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        teacherType === 'GURU_MAPEL'
                          ? 'bg-white border-indigo-600 text-indigo-900 shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="teacherType"
                        checked={teacherType === 'GURU_MAPEL'}
                        onChange={() => setTeacherType('GURU_MAPEL')}
                        className="text-indigo-600"
                      />
                      <span>Guru Mata Pelajaran</span>
                    </label>
                  </div>

                  {teacherType === 'WALI_KELAS' ? (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                        Pilih Kelas yang Diampu:
                      </label>
                      <select
                        value={teacherGrade}
                        onChange={(e) => setTeacherGrade(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                      >
                        <option value={1}>Kelas 1 (Fase A)</option>
                        <option value={2}>Kelas 2 (Fase A)</option>
                        <option value={3}>Kelas 3 (Fase B)</option>
                        <option value={4}>Kelas 4 (Fase B)</option>
                        <option value={5}>Kelas 5 (Fase C)</option>
                        <option value={6}>Kelas 6 (Fase C)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                        Pilih Mata Pelajaran:
                      </label>
                      <select
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                      >
                        <option value="PJOK">Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)</option>
                        <option value="PABP">Pendidikan Agama & Budi Pekerti (PABP)</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Seni Budaya & Prakarya">Seni Budaya & Prakarya (SBdP)</option>
                        <option value="Bahasa Daerah / Mulok">Bahasa Daerah / Muatan Lokal</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    {isTeacherRegistration ? 'Nama Lengkap Guru (dengan Gelar):' : 'Nama Administrator / Penanggung Jawab:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isTeacherRegistration ? 'Contoh: Rahmawati, S.Pd' : 'Contoh: Drs. H. Suryanto, M.Pd'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Nomor WhatsApp / HP Aktif:
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    {isTeacherRegistration ? 'NIP / NUPTK (Opsional):' : 'Email Resmi Sekolah:'}
                  </label>
                  {isTeacherRegistration ? (
                    <input
                      type="text"
                      value={teacherNip}
                      onChange={(e) => setTeacherNip(e.target.value)}
                      placeholder="19850101 201001 1 001 atau -"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  ) : (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sekolah@kemdikbud.go.id"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Buat Kata Sandi Akun: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter..."
                      minLength={8}
                      className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Submit CTA */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-indigo-600 active:scale-98 disabled:bg-slate-400 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>Sedang Menyiapkan Akun & Rombel...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>
                      {isTeacherRegistration ? 'Aktifkan Akun Guru & Rombel Kelas' : 'Daftarkan Sekolah & Aktifkan Admin'}
                    </span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
              <div className="text-center mt-2 text-[11px] text-slate-400">
                Data terenkripsi dan langsung siap dipakai login ke dashboard.
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

