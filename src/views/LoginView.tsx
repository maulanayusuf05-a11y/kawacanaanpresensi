import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { KawacanaanEmblem } from '../components/KawacanaanEmblem';
import { EducationIllustration } from '../components/EducationIllustration';
import {
  signInWithEmail,
  signInWithGoogle,
  resetPassword,
  isSupabaseConfigured,
  supabase,
  extractTokensFromUrl,
  setSessionFromTokenOrUrl,
  getAuthRedirectUrl,
  appOrigin,
} from '../lib/supabaseClient';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Globe,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    showToast,
    schoolProfile,
    registrationRequired,
    setActiveView,
    openOnboarding
  } = useApp();

  // Mode: 'login' | 'forgot-password'
  const [authMode, setAuthMode] = useState<'login' | 'forgot-password'>('login');

  // Modal State for Token Importer & Supabase Config Guide
  const [showTokenImporter, setShowTokenImporter] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [pastedTokenUrl, setPastedTokenUrl] = useState('');
  const [isImportingToken, setIsImportingToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [emailOrUser, setEmailOrUser] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('user') || p.get('username') || '';
    } catch (_) {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Loading & feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const currentOrigin = appOrigin() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const redirectTarget = getAuthRedirectUrl() || `${currentOrigin}/`;

  // Auto-detect if current window has auth hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
      const tokenString = window.location.hash;
      setIsImportingToken(true);
      setSessionFromTokenOrUrl(tokenString)
        .then(() => {
          showToast('Sesi Google berhasil diaktifkan. Membuka Onboarding...', 'success');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        })
        .catch((err) => {
          console.warn('Auto token process error:', err);
        })
        .finally(() => {
          setIsImportingToken(false);
        });
    }
  }, [showToast]);

  useEffect(() => {
    if (registrationRequired) {
      openOnboarding();
    }
  }, [registrationRequired, openOnboarding]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Berhasil menyalin: ${fieldName}`, 'success');
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Handle Token / URL Paste manually from localhost redirect
  const handleImportTokenUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedTokenUrl.trim()) {
      setErrorMessage('Harap masukkan URL atau token Google yang Anda dapatkan.');
      return;
    }

    setIsImportingToken(true);
    setErrorMessage('');

    try {
      await setSessionFromTokenOrUrl(pastedTokenUrl);
      showToast('Autentikasi Google berhasil! Mengarahkan ke Onboarding...', 'success');
      setShowTokenImporter(false);
      setPastedTokenUrl('');
    } catch (err: any) {
      console.error('Import token error:', err);
      setErrorMessage(err.message || 'Format URL/Token tidak valid. Pastikan menyalin seluruh tautan.');
      showToast('Gagal memproses token.', 'error');
    } finally {
      setIsImportingToken(false);
    }
  };

  // Handle standard login through Supabase Auth.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const identifier = emailOrUser.trim();
    const pass = password;

    if (!identifier || !pass) {
      setErrorMessage('Harap masukkan email/username dan kata sandi Anda.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Koneksi Supabase belum dikonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signInWithEmail(identifier, pass);

      if (error || !data.user) {
        const message = error?.message || '';
        setErrorMessage(
          message.toLowerCase().includes('invalid login credentials')
            ? 'Email/username atau kata sandi salah. Periksa kembali data akun Anda.'
            : message || 'Login gagal. Silakan coba lagi.'
        );
        showToast('Login gagal.', 'error');
        return;
      }

      showToast('Login berhasil. Memuat data aplikasi...', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Terjadi kendala saat proses autentikasi. Silakan coba lagi.');
      showToast('Login gagal.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth handler
  const handleGoogleOAuth = async () => {
    setErrorMessage('');

    if (!isSupabaseConfigured()) {
      setErrorMessage(
        'Koneksi Supabase belum dikonfigurasi. Periksa konfigurasi Supabase.'
      );
      return;
    }

    setIsGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        console.error('Google OAuth error:', error);
        setErrorMessage(
          error.message || 'Gagal masuk menggunakan Google. Silakan coba lagi.'
        );
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('Google OAuth exception:', err);
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat menghubungkan ke Google. Silakan coba lagi.'
      );
      setIsGoogleLoading(false);
    }
  };

  // Handle Reset Password via Supabase Auth
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    const email = resetEmail.trim();
    if (!email || !email.includes('@')) {
      setErrorMessage('Harap masukkan alamat email yang valid.');
      return;
    }

    setIsLoading(true);

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      setResetSuccessMessage(
        `Permintaan reset kata sandi untuk ${email} dicatat. Hubungi Administrator Sekolah untuk menyetel ulang kata sandi.`
      );
      return;
    }

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMessage(error.message || 'Gagal mengirim instruksi reset kata sandi.');
      } else {
        setResetSuccessMessage(
          `Tautan instruksi penyetelan ulang kata sandi telah dikirimkan ke email ${email}. Silakan periksa kotak masuk atau folder spam Anda.`
        );
        showToast('Tautan reset kata sandi terkirim ke email', 'success');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses reset kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-800 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-x-hidden font-sans select-none">
      {/* Background Soft Lighting Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:28px_28px] opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-50/70 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area (Decorative visual on the left, card centered/prominent on the right) */}
      <div className="max-w-6xl w-full mx-auto my-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-12 py-4 z-10">
        
        {/* Left Side: Small decorative education graphic (pemanis - NO text outside the card) */}
        <div className="hidden lg:flex flex-1 items-center justify-center pl-6">
          <EducationIllustration className="scale-95 hover:scale-100 transition-transform duration-500" />
        </div>

        {/* Right Side: Clean White Login Card */}
        <div className="w-full flex justify-center lg:justify-center flex-1">
          <div className="w-full max-w-[400px] sm:max-w-[440px] bg-white rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/80 border border-slate-200/90 transition-all text-slate-800">
            
            {/* Top Brand Header inside Card */}
            <div className="flex flex-col items-center justify-center mb-6 text-center">
              <div className="mb-2">
                <KawacanaanEmblem size={68} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-widest text-slate-900 uppercase">
                KAWACANAAN PRESENSI
              </h2>
              {schoolProfile.namaSekolah && (
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                  {schoolProfile.namaSekolah}
                </p>
              )}
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Success Alert Box */}
            {resetSuccessMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in duration-200">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-medium">{resetSuccessMessage}</div>
              </div>
            )}

            {/* VIEW 1: LOGIN FORM */}
            {authMode === 'login' && (
              <div>
                <form onSubmit={handleLogin} className="space-y-4" id="form-kawacanaan-login">
                  {/* Email or Username Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                      Email atau Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Mail size={17} />
                      </span>
                      <input
                        id="input-login-email"
                        type="text"
                        required
                        value={emailOrUser}
                        onChange={(e) => setEmailOrUser(e.target.value)}
                        placeholder="Email atau username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-2xl border border-slate-200 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 outline-none text-xs sm:text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input with Show/Hide Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot-password');
                          setErrorMessage('');
                          setResetSuccessMessage('');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        id="btn-forgot-password-link"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Lock size={17} />
                      </span>
                      <input
                        id="input-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan kata sandi"
                        className="w-full pl-10 pr-11 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-2xl border border-slate-200 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 outline-none text-xs sm:text-sm font-medium transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                        tabIndex={-1}
                        title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Login Button */}
                  <button
                    id="btn-submit-masuk"
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm tracking-wide transition-all shadow-md shadow-blue-600/20 hover:shadow-lg focus:outline-none focus:ring-3 focus:ring-blue-500/30 min-h-[46px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <span>Masuk</span>
                    )}
                  </button>
                </form>

                {/* Clean Divider "Atau" */}
                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="shrink mx-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    Atau
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Google OAuth Supabase Button */}
                <button
                  type="button"
                  id="btn-google-oauth-login"
                  onClick={handleGoogleOAuth}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-sm flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] min-h-[44px]"
                >
                  {isGoogleLoading ? (
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>Lanjutkan dengan Google</span>
                </button>

                {/* Secondary Google SSO Quick Helper Links */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setShowTokenImporter(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/90 py-1.5 px-3 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                    id="btn-open-token-importer"
                  >
                    <KeyRound size={13} className="shrink-0 text-amber-600" />
                    <span>Terlempar ke localhost? Tempel tautan token di sini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfigGuide(true)}
                    className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    <HelpCircle size={12} className="shrink-0" />
                    <span>Panduan Pengaturan Redirect URL Supabase</span>
                  </button>
                </div>

                {/* Footer registration note inside card */}
                <div className="text-center mt-4 text-xs text-slate-500 font-medium">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => openOnboarding()}
                    className="font-bold text-blue-700 hover:underline cursor-pointer"
                    id="btn-link-buat-akun-gratis"
                  >
                    Buat akun gratis
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 2: FORGOT PASSWORD FORM */}
            {authMode === 'forgot-password' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setResetSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 mb-4 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Halaman Masuk</span>
                </button>

                <div className="mb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Lupa Kata Sandi?
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    Masukkan email akun Anda untuk menerima instruksi reset kata sandi melalui Supabase.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                      Alamat Email
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Mail size={17} />
                      </span>
                      <input
                        id="input-reset-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="contoh: nama@sekolah.sch.id"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-2xl border border-slate-200 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 outline-none text-xs sm:text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-submit-reset-password"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-600/20 hover:shadow-lg focus:outline-none min-h-[44px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Mengirim Tautan...</span>
                      </>
                    ) : (
                      <span>Kirim Tautan Reset Kata Sandi</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: TOKEN / URL GOOGLE IMPORTER */}
      {showTokenImporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Masuk via Tautan / Token Google
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Selesaikan login jika peramban terlempar ke <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-800 font-mono">http://localhost:3000/#access_token=...</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenImporter(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportTokenUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tempel Seluruh Tautan URL atau Token di Bawah:
                </label>
                <textarea
                  rows={4}
                  required
                  value={pastedTokenUrl}
                  onChange={(e) => setPastedTokenUrl(e.target.value)}
                  placeholder="Contoh: http://localhost:3000/#access_token=eyJhbGciOiJ...&refresh_token=... (atau token JWT)"
                  className="w-full p-3 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-2xl border border-slate-200 focus:border-amber-600 focus:ring-3 focus:ring-amber-500/15 outline-none text-xs font-mono transition-all resize-none"
                />
              </div>

              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <Sparkles size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Cara Cepat:</strong> Saat tab baru peramban Anda menampilkan <em>"localhost refused to connect"</em>, cukup klik bilah alamat URL, tekan <kbd className="bg-amber-200/80 px-1.5 py-0.5 rounded font-mono text-[11px]">Ctrl+A</kbd> lalu <kbd className="bg-amber-200/80 px-1.5 py-0.5 rounded font-mono text-[11px]">Ctrl+C</kbd>, kemudian tempelkan di kotak atas ini.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTokenImporter(false)}
                  className="py-2.5 px-4 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isImportingToken || !pastedTokenUrl.trim()}
                  className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-amber-600/20 hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isImportingToken ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Memproses Token...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Aktifkan Sesi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPABASE AUTH CONFIGURATION GUIDE */}
      {showConfigGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Audit & Panduan URL Configuration Supabase
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cara memperbaiki pengalihan otomatis agar Google SSO tidak terlempar ke localhost
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-start gap-2.5">
                <ShieldCheck size={16} className="shrink-0 text-blue-600 mt-0.5" />
                <div>
                  Supabase mengalihkan ke <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">http://localhost:3000</code> jika URL domain aplikasi Anda saat ini belum didaftarkan di daftar <strong>Allowed Redirect URLs</strong> di Supabase Dashboard.
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Langkah Pengaturan di Supabase Dashboard:</h4>
                <ol className="list-decimal pl-5 space-y-3 font-medium">
                  <li>
                    Buka project Supabase Anda &gt; menu <strong>Authentication</strong> &gt; <strong>URL Configuration</strong>.
                  </li>
                  <li>
                    <div className="mb-1">
                      Setel <strong>Site URL</strong> ke alamat domain utama Anda:
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentOrigin}
                        className="flex-1 p-2 bg-slate-50 font-mono text-[11px] rounded-xl border border-slate-200 text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentOrigin, 'Site URL')}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'Site URL' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span className="text-[11px]">Salin</span>
                      </button>
                    </div>
                  </li>
                  <li>
                    <div className="mb-1">
                      Tambahkan entri berikut ke dalam <strong>Redirect URLs</strong> (tekan Add URL untuk tiap baris):
                    </div>
                    <div className="space-y-2 mt-1.5">
                      {[
                        `https://*.run.app/**`,
                        `${currentOrigin}/**`,
                        `http://localhost:3000/**`,
                      ].map((urlPattern) => (
                        <div key={urlPattern} className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={urlPattern}
                            className="flex-1 p-2 bg-slate-50 font-mono text-[11px] rounded-xl border border-slate-200 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(urlPattern, urlPattern)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedField === urlPattern ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            <span className="text-[11px]">Salin</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </li>
                  <li>
                    Klik tombol <strong>Save Changes</strong> di Supabase. Setelah itu, Google Login akan otomatis kembali langsung ke halaman aplikasi tanpa terlempar lagi ke localhost!
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigGuide(false)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Links (Centered minimal footer outside the card) */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center text-center text-[11px] sm:text-xs text-slate-500 pt-4 z-10">
        <div className="flex items-center gap-3 font-semibold">
          <span className="hover:text-blue-700 transition-colors cursor-pointer">
            Syarat & Ketentuan
          </span>
          <span>•</span>
          <span className="hover:text-blue-700 transition-colors cursor-pointer">
            Pemberitahuan Privasi
          </span>
        </div>
      </div>
    </div>
  );
};
