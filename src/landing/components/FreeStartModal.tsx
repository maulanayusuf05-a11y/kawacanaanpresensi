import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FreeStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onEnterSystem: () => void;
  lang: 'ID' | 'EN';
}

type RoleType = 'homeroom' | 'subject';

export const FreeStartModal: React.FC<FreeStartModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onEnterSystem,
  lang,
}) => {
  const { loginWithCredentials } = useApp();

  // Wizard Steps: 1 = Pilih Peran, 2 = Formulir Identitas & Akun
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<RoleType>('homeroom');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Detail Pendidik
  const [nip, setNip] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [phone, setPhone] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('PNS');

  // Role Specific: Wali Kelas
  const [grade, setGrade] = useState<number>(1);
  const [className, setClassName] = useState<string>('Kelas 1');

  // Role Specific: Guru Mapel
  const [subjectName, setSubjectName] = useState<string>('Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)');

  // Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  // Auto-generate suggested username from Full Name if not manually edited
  const handleFullNameChange = (name: string) => {
    setFullName(name);
    if (!usernameManuallyEdited) {
      const sanitized = name
        .toLowerCase()
        .replace(/dr\.|dra\.|drs\.|s\.pd\.|m\.pd\.|h\.|hj\./gi, '')
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
        .slice(0, 24);
      if (sanitized) {
        setUsername(sanitized);
      }
    }
  };

  const handleSelectRole = (role: RoleType) => {
    setSelectedRole(role);
    setFormError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validasi Dasar
    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanName) {
      setFormError(lang === 'ID' ? 'Nama lengkap wajib diisi.' : 'Full name is required.');
      return;
    }
    if (!cleanUsername) {
      setFormError(lang === 'ID' ? 'Username wajib diisi.' : 'Username is required.');
      return;
    }
    if (cleanUsername.length < 3) {
      setFormError(lang === 'ID' ? 'Username minimal 3 karakter.' : 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setFormError(
        lang === 'ID'
          ? 'Username hanya boleh berisi huruf kecil, angka, titik, atau strip.'
          : 'Username can only contain lowercase letters, numbers, dots, or hyphens.'
      );
      return;
    }
    if (!password) {
      setFormError(lang === 'ID' ? 'Kata sandi wajib diisi.' : 'Password is required.');
      return;
    }
    if (password.length < 6) {
      setFormError(lang === 'ID' ? 'Kata sandi minimal 6 karakter.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError(lang === 'ID' ? 'Konfirmasi kata sandi tidak cocok.' : 'Password confirmation does not match.');
      return;
    }
    if (selectedRole === 'subject' && !subjectName.trim()) {
      setFormError(
        lang === 'ID'
          ? 'Mata pelajaran yang diampu wajib diisi.'
          : 'Subject taught is required.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadRole = selectedRole === 'homeroom' ? 'WALI KELAS' : 'GURU MAPEL';
      const cleanEmail = email.trim().toLowerCase() || `${cleanUsername}@login.edushift.local`;

      const payload = {
        action: 'register_and_onboard',
        fullName: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: password,
        role: payloadRole,
        mode: 'personal',
        nip: nip.trim() || '-',
        gender,
        phone: phone.trim() || '-',
        employmentStatus,
        grade: selectedRole === 'homeroom' ? grade : 1,
        className: selectedRole === 'homeroom' ? (className.trim() || `Kelas ${grade}`) : 'Kelas 1',
        subjectName: selectedRole === 'subject' ? subjectName.trim() : undefined,
        workspaceName: `Ruang Kerja ${cleanName}`,
        schoolId: null,
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok && !data.success) {
        throw new Error(data.error || (lang === 'ID' ? 'Pendaftaran gagal. Silakan coba lagi.' : 'Registration failed.'));
      }

      // Otomatis login dengan akun yang baru dibuat dan masuk langsung ke Ruang Kerja
      const loginResult = await loginWithCredentials(cleanUsername, password);
      if (!loginResult.success) {
        // Coba alternatif login menggunakan email
        const retryEmailResult = await loginWithCredentials(cleanEmail, password);
        if (!retryEmailResult.success) {
          throw new Error(loginResult.error || (lang === 'ID' ? 'Akun berhasil dibuat. Silakan login.' : 'Account created. Please log in.'));
        }
      }

      // Berhasil login dan masuk ke ruang kerja
      onClose();
      onEnterSystem();
    } catch (err: any) {
      setFormError(err.message || (lang === 'ID' ? 'Terjadi kesalahan pada sistem.' : 'A system error occurred.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="relative bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 sm:px-8 py-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Sparkles size={14} className="text-yellow-300" />
            <span>{step === 1 ? 'Langkah 1 dari 2' : 'Langkah 2 dari 2'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {step === 1
              ? (lang === 'ID' ? 'Pilih Peran Anda' : 'Select Your Role')
              : (lang === 'ID' ? 'Pendaftaran Akun Pendidik' : 'Educator Account Registration')}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-lg leading-relaxed">
            {step === 1
              ? (lang === 'ID'
                  ? 'Tentukan peran Anda untuk mulai mengelola kehadiran, siswa, dan ruang kerja digital.'
                  : 'Choose your role to start managing attendance, students, and your digital workspace.')
              : (lang === 'ID'
                  ? 'Lengkapi formulir di bawah ini untuk langsung membuat dan mengaktifkan ruang kerja Anda.'
                  : 'Complete the form below to immediately set up and enter your workspace.')}
          </p>
        </div>

        {/* Isi Modal */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          
          {/* ========================================================================= */}
          {/* LANGKAH 1: PILIH PERAN (HANYA WALI KELAS & GURU MAPEL — TANPA SISWA)      */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* KARTU 1: WALI KELAS */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('homeroom')}
                  className="group relative bg-white border-2 border-slate-200 hover:border-blue-600 hover:shadow-lg rounded-2xl p-5 sm:p-6 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  id="btn-free-role-homeroom"
                >
                  <div className="space-y-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                        1. WALI KELAS
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
                        {lang === 'ID'
                          ? 'Kelola presensi harian rombel, jurnal kegiatan kelas, dan rekapitulasi data kehadiran siswa.'
                          : 'Manage daily homeroom attendance, class journals, and student attendance recaps.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>{lang === 'ID' ? 'Pilih Wali Kelas' : 'Select Homeroom'}</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* KARTU 2: GURU MATA PELAJARAN */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('subject')}
                  className="group relative bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-lg rounded-2xl p-5 sm:p-6 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  id="btn-free-role-subject"
                >
                  <div className="space-y-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                        2. GURU MATA PELAJARAN
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
                        {lang === 'ID'
                          ? 'Kelola presensi per jam pelajaran khusus (PJOK, PAI, Bahasa Inggris, SBdP, dll.).'
                          : 'Manage subject-specific class attendance (PE, Religion, English, Arts, etc.).'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>{lang === 'ID' ? 'Pilih Guru Mapel' : 'Select Subject Teacher'}</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Footer Langkah 1 */}
              <div className="pt-3 flex items-center justify-center text-xs text-slate-500">
                <span>{lang === 'ID' ? 'Sudah memiliki akun?' : 'Already have an account?'}</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="ml-1.5 font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {lang === 'ID' ? 'Masuk Sekarang' : 'Sign In Now'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LANGKAH 2: FORMULIR IDENTITAS & AKUN (TANPA PILIHAN MODEL RUANG KERJA)    */}
          {/* ========================================================================= */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Baris Navigasi Balik & Label Peran */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setFormError('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  id="btn-back-to-step1"
                >
                  <ArrowLeft size={16} />
                  <span>{lang === 'ID' ? 'Ganti Pilihan Peran' : 'Change Role'}</span>
                </button>

                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  selectedRole === 'homeroom'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedRole === 'homeroom'
                    ? (lang === 'ID' ? 'Peran: Wali Kelas' : 'Role: Homeroom')
                    : (lang === 'ID' ? 'Peran: Guru Mata Pelajaran' : 'Role: Subject Teacher')}
                </span>
              </div>

              {/* Error Alert Banner */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Seksi 1: Akun & Masuk */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-3.5">
                <div className="flex items-center gap-2 text-blue-900 pb-2 border-b border-blue-100">
                  <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      1. Identitas Akun & Masuk
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Gunakan informasi ini saat masuk ke dalam aplikasi presensi.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nama Lengkap */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Nama Lengkap & Gelar: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => handleFullNameChange(e.target.value)}
                        placeholder="Contoh: Dra. Hj. Siti Rahmawati, M.Pd."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                        id="input-free-fullname"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Username (ID Login): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsernameManuallyEdited(true);
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                      }}
                      placeholder="Contoh: sitirahmawati"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                      id="input-free-username"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Huruf kecil, angka, titik, atau strip.
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email (Opsional):
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@pribadi.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                        id="input-free-email"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Untuk pemulihan kata sandi.
                    </p>
                  </div>

                  {/* Kata Sandi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Kata Sandi: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                        id="input-free-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Sandi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Ulangi Kata Sandi: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi..."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                        id="input-free-confirm-password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Form Penugasan & Data Guru */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="pb-2 border-b border-slate-200">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                    2. Data Guru & Penugasan
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi ruang kelas yang akan langsung disiapkan untuk Anda.
                  </p>
                </div>

                {/* FORM SPESIFIK WALI KELAS */}
                {selectedRole === 'homeroom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Tingkat Kelas: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => {
                          const g = Number(e.target.value);
                          setGrade(g);
                          setClassName(`Kelas ${g}`);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-blue-600 outline-none cursor-pointer"
                        id="select-free-grade"
                      >
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                          <option key={g} value={g}>
                            Kelas {g} SD
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Nama Rombel / Kelas: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="Contoh: Kelas 1, Kelas 4A..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-blue-600 outline-none"
                        id="input-free-classname"
                      />
                    </div>
                  </div>
                )}

                {/* FORM SPESIFIK GURU MAPEL */}
                {selectedRole === 'subject' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Mata Pelajaran yang Diampu: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Contoh: PJOK, Pendidikan Agama Islam..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-emerald-600 outline-none"
                      id="input-free-subjectname"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'PJOK',
                        'Pendidikan Agama Islam (PAI)',
                        'Pendidikan Agama Kristen',
                        'Bahasa Inggris',
                        'Seni Budaya',
                        'Informatika',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSubjectName(item)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profil Guru Tambahan: NIP, Jenis Kelamin, Telepon, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* NIP */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      NIP / NUPTK (Opsional):
                    </label>
                    <input
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="Jika belum ada, kosongkan"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-blue-600 outline-none"
                      id="input-free-nip"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Jenis Kelamin:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('L')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          gender === 'L'
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Laki-laki
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('P')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          gender === 'P'
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Perempuan
                      </button>
                    </div>
                  </div>

                  {/* No. Telepon / WA */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      No. WhatsApp (Opsional):
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-blue-600 outline-none"
                        id="input-free-phone"
                      />
                    </div>
                  </div>

                  {/* Status Kepegawaian */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Status Kepegawaian:
                    </label>
                    <select
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-blue-600 outline-none cursor-pointer"
                      id="select-free-employment-status"
                    >
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="Guru Honor">Guru Honor</option>
                      <option value="Guru Tetap Yayasan">Guru Tetap Yayasan</option>
                      <option value="Non-ASN">Non-ASN Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan & Masuk */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  id="btn-submit-free-registration"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{lang === 'ID' ? 'Menyiapkan Ruang Kerja...' : 'Setting up Workspace...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>
                        {lang === 'ID'
                          ? 'Daftar & Masuk ke Ruang Kerja'
                          : 'Register & Enter Workspace'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
