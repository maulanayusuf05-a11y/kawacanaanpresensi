import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  CreditCard,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TeacherRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onEnterSystem?: () => void;
  onEnterDashboard?: () => void;
  lang: 'ID' | 'EN';
}

type RoleType = 'homeroom' | 'subject';
type BillingCycle = 'monthly' | 'yearly';

interface PaymentSessionData {
  orderId: string;
  snapToken: string | null;
  amount: number;
  planTitle: string;
  billingCycle: BillingCycle;
  teacherFullName: string;
  username: string;
  role: string;
  schoolId?: string;
  schoolCode?: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED';
}

interface RegistrationSuccessData {
  teacherName: string;
  username: string;
  password?: string;
  email?: string;
  role: string;
  workspaceName: string;
  invoiceNo?: string;
  billingCycle: BillingCycle;
  amount: number;
  expiresInDays: number;
}

export const TeacherRegisterModal: React.FC<TeacherRegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onEnterDashboard,
  lang,
}) => {
  const { loginWithCredentials, setActiveView } = useApp();

  // Wizard Steps:
  // 1: Pilih Peran (Wali Kelas / Guru Mapel)
  // 2: Formulir Identitas, Akun & Siklus Pembayaran
  // 3: Integrasi Pembayaran Midtrans (Snap / Gateway)
  // 4: Paket Guru Aktif (Kredensial & Ruang Kerja Individu)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRole, setSelectedRole] = useState<RoleType>('homeroom');

  // Form Fields (Identitas & Akun Guru)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  // Payment & Success States
  const [paymentSession, setPaymentSession] = useState<PaymentSessionData | null>(null);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<RegistrationSuccessData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [formError, setFormError] = useState('');
  const [paymentCheckMessage, setPaymentCheckMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const pollingRef = useRef<any>(null);

  // Pricing: Monthly Rp 29.000, Yearly Rp 290.000 (hemat 2 bulan)
  const monthlyPrice = 29000;
  const yearlyPrice = 290000;
  const currentPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Load Midtrans Snap Script on modal open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/midtrans?action=config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.enabled && cfg.client_key) {
          const existing = document.getElementById('midtrans-snap-script');
          if (!existing) {
            const script = document.createElement('script');
            script.id = 'midtrans-snap-script';
            script.src = cfg.snap_url || 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', cfg.client_key);
            script.async = true;
            document.body.appendChild(script);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Reset or cleanup on close
  useEffect(() => {
    if (isOpen) {
      setFormError('');
      setPaymentCheckMessage(null);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen]);

  // Real-time polling when waiting for payment in step 3
  useEffect(() => {
    if (paymentSession && paymentSession.status === 'PENDING' && !registrationSuccessData && step === 3) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(
              `/api/midtrans?action=check_status&order_id=${encodeURIComponent(paymentSession.orderId)}`
            );
            const body = await res.json();
            if (res.ok && (body.is_settled || body.status === 'settlement' || body.status === 'capture')) {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              handleCompleteActivation(paymentSession);
            }
          } catch (_) {}
        }, 4000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [paymentSession, registrationSuccessData, step]);

  if (!isOpen) return null;

  // Auto-generate suggested username from Full Name (SAMA DENGAN ONBOARDING MULAI GRATIS)
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

  // Step 2 Submission: Register Account & Create Midtrans Transaction
  const handleSubmitAndProceedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

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

    setIsSubmitting(true);

    try {
      const payloadRole = selectedRole === 'homeroom' ? 'WALI KELAS' : 'GURU MAPEL';
      const cleanEmail = email.trim().toLowerCase() || `${cleanUsername}@guru.kawacanaan.sch.id`;

      // 1. Daftarkan akun guru dengan Ruang Kerja Individu Pro di backend
      const onboardRes = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_and_onboard',
          fullName: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          password: password,
          role: payloadRole,
          mode: 'personal',
          plan: 'guru_pro',
          nip: '-',
          gender: 'L',
          grade: 1,
          className: 'Kelas 1',
          subjectName: selectedRole === 'subject' ? 'Guru Mata Pelajaran' : undefined,
          workspaceName: 'Ruang Kerja Individu',
          schoolId: null,
        }),
      });

      const onboardData = await onboardRes.json();
      if (!onboardRes.ok || (!onboardData.ok && !onboardData.success)) {
        throw new Error(
          onboardData.error ||
            (lang === 'ID' ? 'Pendaftaran akun guru gagal. Silakan coba lagi.' : 'Teacher registration failed.')
        );
      }

      const createdSchoolId = onboardData.schoolId;
      const createdSchoolCode = onboardData.schoolCode;

      // 2. Buat Tagihan Midtrans Snap untuk Paket Guru
      const midtransRes = await fetch('/api/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          plan_id: 'teacher',
          billing_cycle: billingCycle,
          school_id: createdSchoolId || null,
          school_name: `Ruang Kerja ${cleanName}`,
          contact_name: cleanName,
          email: cleanEmail,
          npsn: null,
        }),
      });

      const midtransData = await midtransRes.json();
      if (!midtransRes.ok || !midtransData.ok) {
        throw new Error(
          midtransData.error ||
            (lang === 'ID'
              ? 'Gagal membuat sesi pembayaran Midtrans. Silakan coba lagi.'
              : 'Failed to create payment session.')
        );
      }

      const session: PaymentSessionData = {
        orderId: midtransData.order_id,
        snapToken: midtransData.snap_token || midtransData.token || null,
        amount: midtransData.amount || currentPrice,
        planTitle: midtransData.plan_title || `Paket Guru Mandiri (${billingCycle === 'yearly' ? '1 Tahun' : '1 Bulan'})`,
        billingCycle,
        teacherFullName: cleanName,
        username: cleanUsername,
        role: payloadRole,
        schoolId: createdSchoolId,
        schoolCode: createdSchoolCode,
        status: 'PENDING',
      };

      setPaymentSession(session);
      setStep(3);

      // Auto-launch Snap popup if available
      if (session.snapToken && window.snap) {
        setTimeout(() => {
          handleLaunchSnap(session.snapToken!);
        }, 500);
      }
    } catch (err: any) {
      setFormError(err.message || (lang === 'ID' ? 'Terjadi kesalahan sistem.' : 'A system error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Launch Midtrans Snap Modal
  const handleLaunchSnap = (token: string) => {
    if (!window.snap) {
      setPaymentCheckMessage(
        'Komponen Midtrans Snap belum siap. Silakan klik tombol Cek Status atau Verifikasi Instan di bawah.'
      );
      return;
    }

    window.snap.pay(token, {
      onSuccess: () => {
        handleCompleteActivation(paymentSession);
      },
      onPending: () => {
        setPaymentCheckMessage('Menunggu penyelesaian transfer/pembayaran Anda via Midtrans.');
      },
      onError: (err: any) => {
        setPaymentCheckMessage(err?.status_message || 'Pembayaran dibatalkan atau gagal.');
      },
      onClose: () => {
        setPaymentCheckMessage(
          'Jendela pembayaran ditutup. Anda dapat membuka kembali atau mengecek status secara berkala.'
        );
      },
    });
  };

  // Check Status Inquiry via Midtrans API
  const handleCheckStatus = async (orderId: string) => {
    setIsCheckingPayment(true);
    setPaymentCheckMessage(null);
    try {
      const res = await fetch(`/api/midtrans?action=check_status&order_id=${encodeURIComponent(orderId)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Gagal memeriksa status pembayaran.');

      if (body.is_settled || body.status === 'settlement' || body.status === 'capture') {
        handleCompleteActivation(paymentSession);
      } else {
        setPaymentCheckMessage(`Status pembayaran: ${body.status || 'PENDING'}. Menunggu transfer.`);
      }
    } catch (e: any) {
      setPaymentCheckMessage(e.message || 'Gagal menghubungi server Midtrans.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Simulate Instant Settlement (Sandbox)
  const handleSimulatePayment = async (orderId: string) => {
    setIsCheckingPayment(true);
    try {
      const res = await fetch('/api/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_settlement', order_id: orderId }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Gagal simulasi pembayaran.');
      handleCompleteActivation(paymentSession);
    } catch (e: any) {
      setPaymentCheckMessage(e.message || 'Gagal simulasi pembayaran.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Final Transition to Step 4 (Paket Guru Aktif & Kredensial)
  const handleCompleteActivation = (session: PaymentSessionData | null) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const tName = session?.teacherFullName || fullName.trim();
    const uName = session?.username || username.trim();
    const rName = session?.role || (selectedRole === 'homeroom' ? 'WALI KELAS' : 'GURU MAPEL');
    const isYr = billingCycle === 'yearly' || session?.billingCycle === 'yearly';

    setRegistrationSuccessData({
      teacherName: tName,
      username: uName,
      password: password,
      email: email.trim() || `${uName}@guru.kawacanaan.sch.id`,
      role: rName,
      workspaceName: 'Ruang Kerja Individu Pro',
      invoiceNo: session?.orderId,
      billingCycle: isYr ? 'yearly' : 'monthly',
      amount: session?.amount || (isYr ? yearlyPrice : monthlyPrice),
      expiresInDays: isYr ? 365 : 30,
    });

    setStep(4);
  };

  // Direct login and enter Individual Workspace Dashboard
  const handleEnterDashboard = async () => {
    const cleanUsername = registrationSuccessData?.username || username.trim();
    const cleanPassword = password;

    try {
      sessionStorage.setItem('kwc_prefill_username', cleanUsername);
      sessionStorage.setItem('kwc_prefill_password', cleanPassword);
    } catch (_) {}

    setIsSubmitting(true);
    try {
      const loginRes = await loginWithCredentials(cleanUsername, cleanPassword);
      if (loginRes.success) {
        onClose();
        setActiveView('dashboard');
        if (onEnterDashboard) {
          onEnterDashboard();
        }
      } else {
        onClose();
        onOpenLogin();
      }
    } catch (_) {
      onClose();
      onOpenLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      id="teacher-register-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="teacher-register-modal-content"
        className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-blue-200 overflow-hidden relative"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            {step > 1 && step < 4 && (
              <button
                type="button"
                id="btn-teacher-back"
                onClick={() => {
                  if (step === 2) setStep(1);
                  if (step === 3) setStep(2);
                }}
                className="w-8 h-8 rounded-lg bg-blue-800/80 hover:bg-blue-700 active:scale-95 flex items-center justify-center text-blue-100 transition-colors cursor-pointer border border-blue-600/60"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  PAKET GURU PRO
                </span>
                <span className="text-xs text-blue-200 font-medium">Ruang Kerja Individu</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
                {step === 1 && (lang === 'ID' ? 'Pilih Peran Guru Sekolah Dasar' : 'Select Primary School Teacher Role')}
                {step === 2 && (lang === 'ID' ? 'Identitas Akun & Langganan Guru' : 'Teacher Account & Subscription')}
                {step === 3 && (lang === 'ID' ? 'Pembayaran Midtrans Gateway' : 'Midtrans Payment Gateway')}
                {step === 4 && (lang === 'ID' ? 'Paket Guru Pro Berhasil Aktif!' : 'Teacher Pro Workspace Activated!')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            id="btn-teacher-close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-blue-800/60 hover:bg-blue-700 active:scale-95 flex items-center justify-center text-blue-100 transition-colors cursor-pointer border border-blue-600/40"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indikator Progres Langkah (Steps) */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 1 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'text-blue-900 font-bold' : 'text-slate-500'}>Peran</span>
            <span className="text-slate-300">/</span>

            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 2 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-blue-900 font-bold' : 'text-slate-500'}>Data Akun</span>
            <span className="text-slate-300">/</span>

            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 3 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'text-blue-900 font-bold' : 'text-slate-500'}>Midtrans</span>
            <span className="text-slate-300">/</span>

            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              ✓
            </span>
            <span className={step === 4 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Aktif</span>
          </div>
          <div className="text-[11px] font-bold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-2xs">
            {billingCycle === 'yearly' ? 'Tahunan (Hemat 2 Bln)' : 'Bulanan'}
          </div>
        </div>

        {/* Body Modal Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ========================================================================= */}
          {/* STEP 1: PILIH PERAN GURU (SAMA PERSIS DENGAN FITUR ONBOARDING MULAI GRATIS) */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center max-w-md mx-auto mb-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'ID'
                    ? 'Pilih Peran Guru di Sekolah Dasar Anda'
                    : 'Choose Your Primary School Teacher Role'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'ID'
                    ? 'Paket Guru Pro memberikan Ruang Kerja Individu mandiri dengan kapasitas rombel dan siswa lebih luas.'
                    : 'Teacher Pro Plan provides an independent Teacher Workspace with extended class and student capacity.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                {/* 1. Wali Kelas / Guru Kelas */}
                <button
                  type="button"
                  id="btn-teacher-role-homeroom"
                  onClick={() => handleSelectRole('homeroom')}
                  className="p-4 rounded-xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50/80 transition-all text-left flex flex-col justify-between group active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1.5 uppercase">
                      Wali Kelas SD
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {lang === 'ID' ? 'Wali Kelas / Guru Kelas' : 'Homeroom Teacher'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {lang === 'ID'
                        ? 'Kelola presensi harian rombel binaan, rekap bulanan format dinas, catatan izin/sakit, dan agenda kelas.'
                        : 'Manage daily homeroom check-ins, monthly dinas recap, excuse logs, and class journal.'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-blue-100/80 flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>{lang === 'ID' ? 'Pilih Wali Kelas' : 'Select Homeroom'}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 2. Guru Mata Pelajaran */}
                <button
                  type="button"
                  id="btn-teacher-role-subject"
                  onClick={() => handleSelectRole('subject')}
                  className="p-4 rounded-xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50/80 transition-all text-left flex flex-col justify-between group active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1.5 uppercase">
                      Guru Mapel SD
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {lang === 'ID' ? 'Guru Mata Pelajaran' : 'Specialized Subject Teacher'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {lang === 'ID'
                        ? 'PJOK, Pendidikan Agama, Bahasa Inggris, SBdP, Mulok - mencatat presensi langsung per jam tatap muka.'
                        : 'PE, Religious Studies, English, Arts - log attendance per subject period across multiple classes.'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-blue-100/80 flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>{lang === 'ID' ? 'Pilih Guru Mapel' : 'Select Subject'}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Rincian Fasilitas Paket Guru */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 mt-3">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Keuntungan Paket Guru Pro (Ruang Kerja Individu):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kelola s/d 5 Rombel Belajar SD</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kapasitas s/d 150 Peserta Didik</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Presensi Jam Pelajaran Khusus</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Cetak Rekap Laporan Format Dinas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: FORMULIR IDENTITAS, AKUN & SIKLUS PEMBAYARAN MIDTRANS             */}
          {/* ========================================================================= */}
          {step === 2 && (
            <form onSubmit={handleSubmitAndProceedPayment} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Peran yang dipilih */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                    {selectedRole === 'homeroom' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                      Peran Terpilih:
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedRole === 'homeroom' ? 'Wali Kelas / Guru Kelas' : 'Guru Mata Pelajaran (Mapel)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  Ubah
                </button>
              </div>

              {/* 1. Nama Lengkap Guru */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>{lang === 'ID' ? 'Nama Lengkap Guru' : 'Teacher Full Name'}</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-teacher-fullname"
                  value={fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                  required
                />
              </div>

              {/* 2. Username Akun (Otomatis dari Nama Lengkap, Sama Seperti Mulai Gratis) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    <span>{lang === 'ID' ? 'Username Akun (Otomatis)' : 'Account Username (Automated)'}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {usernameManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameManuallyEdited(false);
                        handleFullNameChange(fullName);
                      }}
                      className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Reset Otomatis
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id="input-teacher-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameManuallyEdited(true);
                  }}
                  placeholder="budi.santoso"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-mono lowercase"
                  required
                />
                <span className="text-[10px] text-slate-400 block">
                  Dihasilkan otomatis dari nama lengkap Anda (dapat disesuaikan).
                </span>
              </div>

              {/* 3. Email (Opsional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-700" />
                  <span>{lang === 'ID' ? 'Email Resmi / Korespondensi' : 'Official Email'}</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Opsional)</span>
                </label>
                <input
                  type="email"
                  id="input-teacher-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@sekolah.sch.id (opsional)"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                />
              </div>

              {/* 4. Kata Sandi & Konfirmasi Sandi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-700" />
                    <span>{lang === 'ID' ? 'Kata Sandi' : 'Password'}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="input-teacher-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-3.5 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-700" />
                      <span>{lang === 'ID' ? 'Ulangi Kata Sandi' : 'Confirm Password'}</span>
                      <span className="text-red-500">*</span>
                    </label>
                    {confirmPassword && password === confirmPassword && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Cocok
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="input-teacher-confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      className="w-full pl-3.5 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pilihan Siklus Pembayaran (Monthly / Yearly) */}
              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                  <span>{lang === 'ID' ? 'Pilih Siklus Langganan Paket Guru' : 'Select Subscription Cycle'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Bulanan */}
                  <div
                    onClick={() => setBillingCycle('monthly')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      billingCycle === 'monthly'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">Bulanan</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          billingCycle === 'monthly' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {billingCycle === 'monthly' && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-1">Rp 29.000</div>
                    <span className="text-[10px] text-slate-500">per bulan (tagihan fleksibel)</span>
                  </div>

                  {/* Tahunan */}
                  <div
                    onClick={() => setBillingCycle('yearly')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all relative ${
                      billingCycle === 'yearly'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                      Hemat 2 Bulan
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">Tahunan</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          billingCycle === 'yearly' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {billingCycle === 'yearly' && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-1">Rp 290.000</div>
                    <span className="text-[10px] text-slate-500">per tahun (aktif 365 hari)</span>
                  </div>
                </div>
              </div>

              {/* Tombol Daftar & Lanjutkan ke Pembayaran */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-teacher-submit-payment"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ID' ? 'Menyiapkan Akun & Midtrans...' : 'Preparing Midtrans...'}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {lang === 'ID'
                          ? `Daftar & Lanjutkan ke Pembayaran (${formatRupiah(currentPrice)})`
                          : `Register & Proceed to Payment (${formatRupiah(currentPrice)})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Didukung Gateway Resmi Midtrans • Pembayaran QRIS & Virtual Account Real-Time</span>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: INTEGRASI PEMBAYARAN MIDTRANS GATEWAY (QRIS / VA / SNAP)          */}
          {/* ========================================================================= */}
          {step === 3 && paymentSession && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      Tagihan Paket Guru Pro
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{paymentSession.planTitle}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ruang Kerja Individu Guru • {paymentSession.teacherFullName} ({paymentSession.role})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Tagihan</span>
                    <span className="text-lg font-black text-blue-700">{formatRupiah(paymentSession.amount)}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-blue-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600">
                    <span className="text-slate-400">Invoice No:</span>
                    <span className="font-bold text-slate-800">{paymentSession.orderId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentSession.orderId, 'invoice')}
                    className="text-[11px] text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'invoice' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'invoice' ? 'Disalin' : 'Salin Invoice'}</span>
                  </button>
                </div>
              </div>

              {/* Status Menunggu Pembayaran */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs">
                <Clock className="w-5 h-5 shrink-0 animate-pulse text-amber-600" />
                <div className="flex-1">
                  <span className="font-bold block">Menunggu Pembayaran Midtrans</span>
                  <span className="text-[11px] text-amber-700">
                    Sistem secara otomatis mendeteksi pembayaran via Snap/QRIS/Bank Transfer setiap 4 detik.
                  </span>
                </div>
              </div>

              {paymentCheckMessage && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>{paymentCheckMessage}</span>
                </div>
              )}

              {/* Action Buttons Pembayaran */}
              <div className="space-y-2 pt-1">
                {/* 1. Tombol Buka Snap */}
                {paymentSession.snapToken && (
                  <button
                    type="button"
                    id="btn-teacher-open-snap"
                    onClick={() => handleLaunchSnap(paymentSession.snapToken!)}
                    className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Bayar Sekarang via Midtrans Snap</span>
                  </button>
                )}

                {/* 2. Tombol Cek Status */}
                <button
                  type="button"
                  id="btn-teacher-check-status"
                  disabled={isCheckingPayment}
                  onClick={() => handleCheckStatus(paymentSession.orderId)}
                  className="w-full py-3 border border-blue-700 bg-white hover:bg-blue-50 active:scale-[0.99] text-blue-800 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isCheckingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-700" />
                  )}
                  <span>Cek Status Pembayaran (Midtrans)</span>
                </button>

                {/* 3. Tombol Simulasi Pembayaran Instan (Sandbox) */}
                <button
                  type="button"
                  id="btn-teacher-simulate-settlement"
                  disabled={isCheckingPayment}
                  onClick={() => handleSimulatePayment(paymentSession.orderId)}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 active:scale-[0.99] text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifikasi Instan (Simulasi Sandbox)</span>
                </button>
              </div>

              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Untuk pengujian sandbox lokal/preview, gunakan tombol <strong>Verifikasi Instan</strong> untuk aktivasi langsung.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PAKET GURU AKTIF (KREDENSIAL & RUANG KERJA INDIVIDU GURU)          */}
          {/* ========================================================================= */}
          {step === 4 && registrationSuccessData && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Badge Sukses */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1.5">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  {lang === 'ID' ? 'Paket Guru Pro Berhasil Diaktifkan!' : 'Teacher Pro Workspace Activated!'}
                </h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  {lang === 'ID'
                    ? `Selamat! Ruang Kerja Individu Pro Anda telah aktif selama ${registrationSuccessData.expiresInDays} hari. Pembayaran Midtrans telah lunas dan terintegrasi.`
                    : `Congratulations! Your Teacher Workspace is now active for ${registrationSuccessData.expiresInDays} days.`}
                </p>
              </div>

              {/* Rincian Kredensial Akun Guru */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-700" />
                    <span>Kredensial Akun Guru Pro</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                    {registrationSuccessData.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Username */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Username Login:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {registrationSuccessData.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(registrationSuccessData.username, 'cred_user')}
                        className="text-blue-700 hover:text-blue-800 cursor-pointer"
                      >
                        {copiedField === 'cred_user' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Kata Sandi */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Kata Sandi:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {registrationSuccessData.password || '••••••••'}
                      </span>
                      {registrationSuccessData.password && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(registrationSuccessData.password!, 'cred_pwd')}
                          className="text-blue-700 hover:text-blue-800 cursor-pointer"
                        >
                          {copiedField === 'cred_pwd' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nama Guru */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Nama Guru:</span>
                    <span className="font-bold text-slate-800 text-xs block truncate mt-0.5">
                      {registrationSuccessData.teacherName}
                    </span>
                  </div>

                  {/* No Invoice */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Status Pembayaran:</span>
                    <span className="font-bold text-emerald-700 text-xs block mt-0.5">
                      LUNAS (SETTLED) • Midtrans
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="btn-teacher-enter-workspace"
                  disabled={isSubmitting}
                  onClick={handleEnterDashboard}
                  className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ID' ? 'Memasuki Ruang Kerja...' : 'Entering Workspace...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'ID' ? 'Masuk ke Ruang Kerja Individu' : 'Enter Teacher Workspace'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-teacher-copy-all"
                  onClick={() => {
                    const text = `KREDENSIAL GURU PRO KAWACANAAN\nNama: ${registrationSuccessData.teacherName}\nPeran: ${registrationSuccessData.role}\nUsername: ${registrationSuccessData.username}\nPassword: ${registrationSuccessData.password}\nInvoice: ${registrationSuccessData.invoiceNo || '-'}\nRuang Kerja: Ruang Kerja Individu Pro (Aktif ${registrationSuccessData.expiresInDays} Hari)`;
                    copyToClipboard(text, 'all');
                  }}
                  className="w-full py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'all' ? 'Seluruh Kredensial Disalin!' : 'Salin Seluruh Kredensial'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
