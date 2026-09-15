import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, signInWithEmail } from '../lib/supabaseClient';
import { KawacanaanEmblem } from '../components/KawacanaanEmblem';
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
  ShieldCheck,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

type RoleType = 'homeroom' | 'subject';

interface OnboardingViewProps {
  onCompleted?: (userId: string) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onCompleted }) => {
  const {
    showToast,
    logout,
    loadUserDataAfterOnboarding,
    loginWithCredentials,
    setActiveView,
    setIsOnboarding,
  } = useApp();

  // Wizard step: 1 = Pilih Peran, 2 = Pendaftaran Akun Pendidik
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<RoleType>('homeroom');

  // Google SSO session detection
  const [hasGoogleSession, setHasGoogleSession] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState('');
  const [googleUserId, setGoogleUserId] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Check on mount if user arrived with active Supabase session (e.g. from Google OAuth)
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;
        if (sessionUser && isMounted) {
          setHasGoogleSession(true);
          setGoogleUserId(sessionUser.id);
          const userEmail = sessionUser.email || '';
          setGoogleUserEmail(userEmail);
          setEmail(userEmail);

          const meta = sessionUser.user_metadata || {};
          const detectedName = meta.full_name || meta.name || '';
          if (detectedName) {
            setFullName(detectedName);
            const sanitized = detectedName
              .toLowerCase()
              .replace(/dr\.|dra\.|drs\.|s\.pd\.|m\.pd\.|h\.|hj\./gi, '')
              .trim()
              .replace(/\s+/g, '.')
              .replace(/[^a-z0-9.]/g, '')
              .slice(0, 24);
            if (sanitized) setUsername(sanitized);
          } else if (userEmail) {
            const prefix = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
            setUsername(prefix);
          }
        }
      } catch (err) {
        console.warn('Session check error in OnboardingView:', err);
      }
    };

    void checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-generate suggested username from Full Name if not manually edited
  const handleFullNameChange = (name: string) => {
    setFullName(name);
    if (!usernameManuallyEdited && !hasGoogleSession) {
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

  const handleBackToLogin = async () => {
    if (hasGoogleSession) {
      await logout();
    }
    setIsOnboarding(false);
    setActiveView('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanName) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    if (!cleanUsername) {
      setFormError('Username login wajib diisi.');
      return;
    }

    if (cleanUsername.length < 3) {
      setFormError('Username minimal 3 karakter.');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setFormError('Username hanya boleh berisi huruf kecil, angka, titik, atau strip.');
      return;
    }

    // Jika registrasi mandiri (bukan Google SSO), validasi kata sandi
    if (!hasGoogleSession) {
      if (!password) {
        setFormError('Kata sandi wajib diisi.');
        return;
      }
      if (password.length < 6) {
        setFormError('Kata sandi minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payloadRole = selectedRole === 'homeroom' ? 'WALI KELAS' : 'GURU MAPEL';
      const cleanEmail = (email || googleUserEmail).trim().toLowerCase() || `${cleanUsername}@login.edushift.local`;

      if (hasGoogleSession) {
        // Alur Akun Google SSO: panggil endpoint onboard_homeroom / onboard_subject mode personal
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          throw new Error('Sesi Google telah kedaluwarsa. Silakan masuk kembali.');
        }

        const action = selectedRole === 'homeroom' ? 'onboard_homeroom' : 'onboard_subject';
        const payload = {
          action,
          mode: 'personal',
          teacherName: cleanName,
          nip: '-',
          gender: 'L',
          phone: '-',
          employmentStatus: 'PNS',
          workspaceName: selectedRole === 'homeroom' ? `Ruang Kerja Wali Kelas - ${cleanName}` : `Ruang Kerja Guru Mapel - ${cleanName}`,
          subjectName: selectedRole === 'subject' ? 'Guru Mata Pelajaran' : undefined,
          grade: 1,
          className: 'Kelas 1',
        };

        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || (!data.ok && !data.success)) {
          throw new Error(data.error || 'Gagal menyelesaikan onboarding akun pendidik.');
        }

        showToast('Pendaftaran akun berhasil! Membuka ruang kerja...', 'success');
        setIsOnboarding(false);

        if (onCompleted) {
          onCompleted(googleUserId || data.userId);
        } else if (loadUserDataAfterOnboarding) {
          await loadUserDataAfterOnboarding(googleUserId || data.userId);
        } else {
          setActiveView('dashboard');
        }
      } else {
        // Alur Pendaftaran Akun Mandiri (Kredensial Username & Password)
        // Alur yang sama persis dengan fitur Mulai Gratis di Landing Page
        const payload = {
          action: 'register_and_onboard',
          fullName: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          password: password,
          role: payloadRole,
          mode: 'personal',
          nip: '-',
          gender: 'L',
          phone: '-',
          employmentStatus: 'PNS',
          grade: 1,
          className: 'Kelas 1',
          subjectName: selectedRole === 'subject' ? 'Guru Mata Pelajaran' : undefined,
          workspaceName: selectedRole === 'homeroom' ? `Ruang Kerja Wali Kelas - ${cleanName}` : `Ruang Kerja Guru Mapel - ${cleanName}`,
          schoolId: null,
        };

        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || (!data.ok && !data.success)) {
          throw new Error(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
        }

        // Simpan preferensi akun di localStorage
        try {
          localStorage.removeItem('kawacanaan_cached_school_ws');
          localStorage.removeItem('kawacanaan_last_workspace_id');
          localStorage.setItem('kawacanaan_last_registered_name', cleanName);
          localStorage.setItem('kawacanaan_last_registered_role', payloadRole);
          if (data.userId && data.schoolId) {
            localStorage.setItem(`kawacanaan_last_workspace_id_${data.userId}`, data.schoolId);
            const personalWs = {
              id: `ws-mem-${data.userId}-${data.schoolId}`,
              userId: data.userId,
              workspaceId: data.schoolId,
              workspaceCode: null,
              role: payloadRole,
              workspaceName: 'Ruang Kerja Individu',
              workspaceType: 'personal',
              registrationMode: 'personal',
              npsn: null,
              subscriptionPlan: 'mulai',
              joinedAt: new Date().toISOString(),
            };
            localStorage.setItem(`kawacanaan_school_ws_${data.userId}`, JSON.stringify(personalWs));
          }
        } catch (_) {}

        // Otomatis login dengan akun yang baru dibuat
        const loginResult = await loginWithCredentials(cleanUsername, password);
        if (!loginResult.success) {
          const retryEmailResult = await loginWithCredentials(cleanEmail, password);
          if (!retryEmailResult.success) {
            const fallbackSignIn = await signInWithEmail(cleanEmail, password);
            if (fallbackSignIn.error) {
              throw new Error(loginResult.error || 'Akun berhasil dibuat. Silakan login kembali.');
            }
          }
        }

        showToast('Pendaftaran akun pendidik berhasil! Selamat datang.', 'success');
        setIsOnboarding(false);

        if (onCompleted) {
          onCompleted(data.userId);
        } else if (loadUserDataAfterOnboarding) {
          await loadUserDataAfterOnboarding(data.userId);
        } else {
          setActiveView('dashboard');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan pada sistem saat pendaftaran.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-3 sm:p-6 md:p-8 selection:bg-blue-600 selection:text-white antialiased">
      {/* Container Utama Onboarding */}
      <div className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Header Onboarding */}
        <div className="relative bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-4 sm:px-7 md:px-8 py-4 sm:py-6 text-white">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
            aria-label="Kembali ke halaman masuk"
            id="btn-onboarding-back-to-login"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={14} className="text-yellow-300 shrink-0" />
            <span>{step === 1 ? 'Langkah 1 dari 2' : 'Langkah 2 dari 2'}</span>
          </div>

          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white pr-16 sm:pr-0">
            {step === 1 ? 'Pilih Peran Anda' : 'Pendaftaran Akun Pendidik'}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-lg leading-relaxed">
            {step === 1
              ? 'Tentukan peran pendidik Anda untuk mulai presensi digital secara gratis tanpa komitmen.'
              : 'Lengkapi data akun untuk langsung membuat dan masuk ke ruang kerja Anda.'}
          </p>
        </div>

        {/* Konten Onboarding */}
        <div className="p-4 sm:p-6 md:p-8 space-y-4">

          {/* ========================================================================= */}
          {/* LANGKAH 1: PILIH PERAN (HANYA WALI KELAS & GURU MAPEL — TANPA SISWA)      */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                
                {/* KARTU 1: WALI KELAS */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('homeroom')}
                  className="group relative bg-white border-2 border-slate-200 hover:border-blue-600 hover:shadow-lg rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-blue-100 min-h-[160px]"
                  id="btn-onboarding-role-homeroom"
                >
                  <div className="space-y-2.5 sm:space-y-3.5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                        1. WALI KELAS
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
                        Kelola presensi harian rombel, jurnal kegiatan kelas, dan rekapitulasi data kehadiran siswa.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Pilih Wali Kelas</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* KARTU 2: GURU MATA PELAJARAN */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('subject')}
                  className="group relative bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-lg rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-emerald-100 min-h-[160px]"
                  id="btn-onboarding-role-subject"
                >
                  <div className="space-y-2.5 sm:space-y-3.5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                        2. GURU MATA PELAJARAN
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
                        Kelola presensi per jam pelajaran khusus (PJOK, PAI, Bahasa Inggris, SBdP, dll.).
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>Pilih Guru Mapel</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Footer Langkah 1 */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
                <span>Sudah memiliki akun?</span>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="font-bold text-blue-700 hover:underline cursor-pointer"
                  id="btn-onboarding-login-link"
                >
                  Masuk Sekarang
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LANGKAH 2: FORMULIR IDENTITAS & AKUN SAJA                                 */}
          {/* ========================================================================= */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              
              {/* Baris Navigasi Balik & Label Peran */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setFormError('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1"
                  id="btn-onboarding-back-to-step1"
                >
                  <ArrowLeft size={16} />
                  <span>Ganti Pilihan Peran</span>
                </button>

                <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                  selectedRole === 'homeroom'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedRole === 'homeroom' ? 'Peran: Wali Kelas' : 'Peran: Guru Mata Pelajaran'}
                </span>
              </div>

              {/* Banner Info untuk Pengguna Google SSO */}
              {hasGoogleSession && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
                  <ShieldCheck size={18} className="shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <span className="font-bold block">Terhubung dengan Akun Google</span>
                    <span className="text-[11px] text-blue-700">
                      Email: <strong>{googleUserEmail}</strong>. Akun telah terverifikasi, kata sandi manual tidak diperlukan.
                    </span>
                  </div>
                </div>
              )}

              {/* Error Alert Banner */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Formulir Akun & Masuk */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-3.5">
                <div className="flex items-center gap-2 text-blue-900 pb-2 border-b border-blue-100">
                  <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Identitas Akun & Masuk
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
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none min-h-[44px]"
                        id="input-onboarding-fullname"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div className={hasGoogleSession ? 'sm:col-span-2' : ''}>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none min-h-[44px]"
                      id="input-onboarding-username"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Huruf kecil, angka, titik, atau strip.
                    </p>
                  </div>

                  {/* Email */}
                  {!hasGoogleSession && (
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
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none min-h-[44px]"
                          id="input-onboarding-email"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Untuk pemulihan kata sandi.
                      </p>
                    </div>
                  )}

                  {/* Kata Sandi (Hanya jika bukan Google SSO) */}
                  {!hasGoogleSession && (
                    <>
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
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none min-h-[44px]"
                            id="input-onboarding-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 w-9 h-9 flex items-center justify-center cursor-pointer"
                            aria-label="Tampilkan sandi"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

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
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none min-h-[44px]"
                            id="input-onboarding-confirm-password"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tombol Simpan & Masuk */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer min-h-[48px]"
                  id="btn-submit-onboarding-registration"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Menyiapkan Ruang Kerja...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>
                        {hasGoogleSession
                          ? 'Selesaikan Pendaftaran & Masuk ke Ruang Kerja'
                          : 'Daftar & Masuk ke Ruang Kerja'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Footer Minimalist */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <KawacanaanEmblem size={16} />
        <span>Kawacanaan Presensi Digital Sekolah Dasar</span>
      </div>
    </div>
  );
};
