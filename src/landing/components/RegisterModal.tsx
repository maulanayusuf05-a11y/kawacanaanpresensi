import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  School,
  User,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  CreditCard,
  RefreshCw,
  Clock,
  Zap,
  Sparkles,
  Building2,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { KawacanaanEmblem } from '../../components/KawacanaanEmblem';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
  initialPlanId?: 'free' | 'teacher' | 'school';
  lang?: 'ID' | 'EN';
}

interface PaymentSessionData {
  orderId: string;
  snapToken: string | null;
  redirectUrl: string | null;
  amount: number;
  planTitle: string;
  billingCycle: 'monthly' | 'yearly';
  schoolId?: string;
  schoolName: string;
  schoolCode?: string;
  npsn?: string;
  contactName: string;
  email: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED';
  isSimulation?: boolean;
  notice?: string;
  createdAdminUsername: string;
  createdAdminRole: string;
}

interface RegistrationSuccessData {
  schoolName: string;
  schoolCode: string;
  npsn?: string;
  username: string;
  adminName: string;
  password: string;
  email?: string;
  invoiceNo?: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
  expiryDays: number;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  lang = 'ID',
}) => {
  // 1. FORM STATE - ONBOARDING DAFTAR SEKOLAH
  const [schoolName, setSchoolName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // 2. SUBMISSION & ERROR STATE
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 3. MIDTRANS & PAYMENT SESSION STATE
  const [paymentSession, setPaymentSession] = useState<PaymentSessionData | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCheckMessage, setPaymentCheckMessage] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  // 4. SUCCESS ACTIVATION STATE
  const [registrationSuccessData, setRegistrationSuccessData] = useState<RegistrationSuccessData | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [copiedSchoolCode, setCopiedSchoolCode] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  // Midtrans Client Key & Snap script loader
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/midtrans?action=get_client_config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.ok && cfg.enabled && cfg.client_key) {
          if (!document.getElementById('midtrans-snap-script')) {
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

  // Reset states on modal open
  useEffect(() => {
    if (isOpen) {
      setSubmitError('');
      setPaymentCheckMessage(null);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen]);

  // Real-time polling when waiting for payment
  useEffect(() => {
    if (paymentSession && paymentSession.status === 'PENDING' && !registrationSuccessData) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/midtrans?action=check_status&order_id=${encodeURIComponent(paymentSession.orderId)}`);
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
  }, [paymentSession, registrationSuccessData]);

  if (!isOpen) return null;

  // Auto-generate username from Admin Full Name (SAMA SEPERTI FITUR MULAI GRATIS)
  const handleAdminNameChange = (name: string) => {
    setAdminFullName(name);
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

  const handleUsernameChange = (val: string) => {
    setUsernameManuallyEdited(true);
    setUsername(val.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 28));
  };

  const handleResetAutoUsername = () => {
    setUsernameManuallyEdited(false);
    const sanitized = adminFullName
      .toLowerCase()
      .replace(/dr\.|dra\.|drs\.|s\.pd\.|m\.pd\.|h\.|hj\./gi, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '')
      .slice(0, 24);
    setUsername(sanitized || 'admin.sekolah');
  };

  // Pricing calculation
  const priceMonthly = 249000;
  const priceYearly = 2490000; // Hemat 2 bulan
  const activeAmount = billingCycle === 'yearly' ? priceYearly : priceMonthly;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Trigger Snap Payment Modal
  const triggerSnapPay = (token: string, session: PaymentSessionData) => {
    if (!window.snap) {
      setPaymentCheckMessage('Komponen Midtrans Snap sedang disiapkan. Silakan klik tombol bayar di bawah.');
      return;
    }
    window.snap.pay(token, {
      onSuccess: async () => {
        setIsCheckingPayment(true);
        try {
          await fetch(`/api/midtrans?action=check_status&order_id=${encodeURIComponent(session.orderId)}`);
          handleCompleteActivation(session);
        } catch (_) {
          handleCompleteActivation(session);
        } finally {
          setIsCheckingPayment(false);
        }
      },
      onPending: () => {
        setPaymentCheckMessage('Transaksi tercatat di Midtrans. Menunggu konfirmasi pembayaran Anda.');
      },
      onError: () => {
        setPaymentCheckMessage('Pembayaran belum berhasil. Silakan coba kembali atau gunakan metode lain.');
      },
      onClose: () => {
        setPaymentCheckMessage('Jendela pembayaran ditutup. Anda dapat membuka kembali pembayaran atau mengecek status.');
      },
    });
  };

  // Check Status Inquiry
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
        setPaymentCheckMessage(`Status pembayaran: ${body.status || 'PENDING'}. Menunggu transfer/konfirmasi.`);
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

  // Complete Activation Transition
  const handleCompleteActivation = (session: PaymentSessionData | null) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const sName = session?.schoolName || schoolName.trim();
    const sCode = session?.schoolCode || 'SCH-' + Math.floor(100000 + Math.random() * 900000);
    const uName = session?.createdAdminUsername || username.trim();
    const aName = session?.contactName || adminFullName.trim();
    const pTitle = session?.planTitle || (billingCycle === 'yearly' ? 'Paket Sekolah Dasar (1 Tahun)' : 'Paket Sekolah Dasar (1 Bulan)');
    const inv = session?.orderId;
    const isYr = billingCycle === 'yearly' || (session && session.billingCycle === 'yearly');

    setRegistrationSuccessData({
      schoolName: sName,
      schoolCode: sCode,
      npsn: session?.npsn,
      username: uName,
      adminName: aName,
      password: password,
      email: email.trim() || `${uName}@sekolah.kawacanaan.sch.id`,
      invoiceNo: inv,
      plan: pTitle,
      billingCycle: isYr ? 'yearly' : 'monthly',
      expiryDays: isYr ? 365 : 30,
    });
    setPaymentSession(null);
  };

  // Form Submit Handler: Onboarding -> Midtrans Payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const cleanSchoolName = schoolName.trim();
    const cleanAdminName = adminFullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Validasi Onboarding Sesuai Permintaan
    if (!cleanSchoolName) {
      setSubmitError(lang === 'ID' ? 'Nama sekolah wajib diisi.' : 'School name is required.');
      return;
    }
    if (cleanSchoolName.length < 3) {
      setSubmitError(lang === 'ID' ? 'Nama sekolah minimal 3 karakter.' : 'School name must be at least 3 characters.');
      return;
    }
    if (!cleanAdminName) {
      setSubmitError(lang === 'ID' ? 'Nama lengkap admin wajib diisi.' : 'Admin full name is required.');
      return;
    }
    if (!cleanUsername) {
      setSubmitError(lang === 'ID' ? 'Username wajib diisi.' : 'Username is required.');
      return;
    }
    if (cleanUsername.length < 3) {
      setSubmitError(lang === 'ID' ? 'Username minimal 3 karakter.' : 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setSubmitError(
        lang === 'ID'
          ? 'Username hanya boleh berisi huruf kecil, angka, titik, atau strip.'
          : 'Username can only contain lowercase letters, numbers, dots, or hyphens.'
      );
      return;
    }
    if (!password) {
      setSubmitError(lang === 'ID' ? 'Kata sandi wajib diisi.' : 'Password is required.');
      return;
    }
    if (password.length < 6) {
      setSubmitError(lang === 'ID' ? 'Kata sandi minimal 6 karakter.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError(lang === 'ID' ? 'Konfirmasi kata sandi tidak cocok.' : 'Password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Pendaftaran Sekolah & Akun Admin ke Sistem Pusat
      const regPayload = {
        schoolName: cleanSchoolName,
        adminName: cleanAdminName,
        fullName: cleanAdminName,
        username: cleanUsername,
        email: cleanEmail || undefined,
        password: password,
        plan: 'school',
      };

      const regRes = await fetch('/api/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload),
      });

      const regData = await regRes.json();
      if (!regRes.ok || !regData.ok) {
        throw new Error(regData?.error || 'Pendaftaran sekolah gagal diproses.');
      }

      const createdSchool = regData.school;
      const createdAdmin = regData.admin;

      // 2. Buat Transaksi Midtrans Snap
      const midtransPayload = {
        action: 'create_transaction',
        plan_id: 'school',
        billing_cycle: billingCycle,
        school_id: createdSchool?.id,
        school_name: cleanSchoolName,
        school_code: createdSchool?.code || createdSchool?.schoolCode,
        npsn: createdSchool?.npsn,
        contact_name: cleanAdminName,
        email: cleanEmail || `${cleanUsername}@login.kawacanaan.local`,
      };

      const midRes = await fetch('/api/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(midtransPayload),
      });

      const midData = await midRes.json();
      if (!midRes.ok || !midData.ok) {
        throw new Error(midData?.error || 'Gagal menyiapkan tagihan Midtrans.');
      }

      const session: PaymentSessionData = {
        orderId: midData.order_id,
        snapToken: midData.snap_token || midData.token || null,
        redirectUrl: midData.redirect_url || null,
        amount: midData.amount || activeAmount,
        planTitle: midData.plan_title || (billingCycle === 'yearly' ? 'Paket Sekolah Dasar (1 Tahun)' : 'Paket Sekolah Dasar (1 Bulan)'),
        billingCycle,
        schoolId: createdSchool?.id,
        schoolName: cleanSchoolName,
        schoolCode: createdSchool?.code || createdSchool?.schoolCode,
        npsn: createdSchool?.npsn,
        contactName: cleanAdminName,
        email: cleanEmail,
        status: 'PENDING',
        isSimulation: !!midData.is_simulation,
        notice: midData.notice,
        createdAdminUsername: createdAdmin?.username || cleanUsername,
        createdAdminRole: createdAdmin?.role || 'ADMIN',
      };

      setPaymentSession(session);

      // Otomatis buka popup Midtrans Snap jika tersedia
      if (session.snapToken && window.snap) {
        triggerSnapPay(session.snapToken, session);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan sistem saat pendaftaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salin Kredensial
  const handleCopyCredentials = () => {
    if (!registrationSuccessData) return;
    const text = `KREDENSIAL ADMINISTRATOR KAWACANAAN SD
Nama Sekolah: ${registrationSuccessData.schoolName}
Kode Undangan Sekolah: ${registrationSuccessData.schoolCode}
Nama Admin: ${registrationSuccessData.adminName}
Username: ${registrationSuccessData.username}
Kata Sandi: ${registrationSuccessData.password}
Email: ${registrationSuccessData.email || '-'}
Paket: ${registrationSuccessData.plan}
Status: AKTIF / LUNAS
Invoice: ${registrationSuccessData.invoiceNo || '-'}`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  // Navigasi Masuk ke Dashboard Sekolah
  const handleEnterDashboard = () => {
    if (registrationSuccessData) {
      try {
        sessionStorage.setItem('kwc_prefill_username', registrationSuccessData.username);
        sessionStorage.setItem('kwc_prefill_password', registrationSuccessData.password);
      } catch (_) {}
    }
    onClose();
    if (onOpenLogin) {
      onOpenLogin();
    }
  };

  return (
    <div
      id="register-school-modal"
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="register-school-card"
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh]"
      >
        {/* Header Modal */}
        <div
          id="modal-header"
          className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-[#0B2F64] text-white p-4 sm:p-6 border-b border-blue-800/40 shrink-0"
        >
          <button
            id="btn-close-register-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <KawacanaanEmblem size={40} className="border-2 border-amber-400/80 shadow-md shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Kawacanaan SD
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold text-blue-200">
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  Paket Sekolah Dasar Pro
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {registrationSuccessData
                  ? 'Paket Sekolah Telah Aktif'
                  : paymentSession
                  ? 'Pembayaran Gateway Midtrans'
                  : 'Onboarding & Pendaftaran Sekolah'}
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {registrationSuccessData
              ? 'Satuan pendidikan resmi terdaftar di database pusat & terintegrasi ke Super Admin.'
              : paymentSession
              ? 'Selesaikan pembayaran tagihan melalui Midtrans Snap untuk mengaktifkan paket sekolah.'
              : 'Daftarkan satuan pendidikan SD Anda, buat akun administrator resmi, dan aktifkan paket.'}
          </p>

          {/* Step Indicator Pills */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-[11px] font-bold">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                !paymentSession && !registrationSuccessData
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Onboarding Data</span>
            </div>
            <div className="h-0.5 w-3 bg-white/20" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                paymentSession
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
              <span>Pembayaran Midtrans</span>
            </div>
            <div className="h-0.5 w-3 bg-white/20" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                registrationSuccessData
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>Paket Sekolah Aktif</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 3: LAYAR PAKET SEKOLAH AKTIF & KREDENSIAL TERBIT */}
        {/* ------------------------------------------------------------------ */}
        {registrationSuccessData ? (
          <div id="registration-success-view" className="p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Paket Sekolah Dasar Aktif & Terverifikasi!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Selamat! Satuan pendidikan{' '}
                <span className="font-bold text-slate-900">{registrationSuccessData.schoolName}</span> telah resmi
                terdaftar di database pusat Kawacanaan SD dan otomatis terintegrasi ke panel Super Admin.
              </p>
            </div>

            {/* School Invitation Code Card */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  Kode Undangan Sekolah (School Invite Code)
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-wider">
                  {registrationSuccessData.schoolCode}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Bagikan kode undangan resmi ini kepada rekan Wali Kelas & Guru Mapel untuk bergabung ke ruang kerja sekolah.
                </p>
              </div>

              <button
                type="button"
                id="btn-copy-school-code"
                onClick={() => {
                  navigator.clipboard.writeText(registrationSuccessData.schoolCode);
                  setCopiedSchoolCode(true);
                  setTimeout(() => setCopiedSchoolCode(false), 2000);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
              >
                {copiedSchoolCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Kode Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>

            {/* Credential Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Kredensial Login Administrator
                </span>
                <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Lunas ({registrationSuccessData.expiryDays} Hari Aktif)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-slate-500 text-[11px] font-semibold">Nama Satuan Pendidikan</div>
                  <div className="font-bold text-slate-900 mt-0.5">{registrationSuccessData.schoolName}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[11px] font-semibold">Nama Administrator</div>
                  <div className="font-bold text-slate-900 mt-0.5">{registrationSuccessData.adminName}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[11px] font-semibold">Username Akses</div>
                  <div className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg mt-0.5 inline-block">
                    {registrationSuccessData.username}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-[11px] font-semibold">Kata Sandi (Password)</div>
                  <div className="font-mono font-black text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg mt-0.5 inline-block">
                    {registrationSuccessData.password}
                  </div>
                </div>

                {registrationSuccessData.email && (
                  <div>
                    <div className="text-slate-500 text-[11px] font-semibold">Email Korespondensi</div>
                    <div className="text-slate-800 font-medium mt-0.5">{registrationSuccessData.email}</div>
                  </div>
                )}

                {registrationSuccessData.invoiceNo && (
                  <div>
                    <div className="text-slate-500 text-[11px] font-semibold">Nomor Invoice Midtrans</div>
                    <div className="font-mono text-slate-700 font-medium mt-0.5">{registrationSuccessData.invoiceNo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="btn-copy-credentials"
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Kredensial Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Salin Kredensial Akun</span>
                  </>
                )}
              </button>

              <button
                id="btn-enter-school-dashboard"
                type="button"
                onClick={handleEnterDashboard}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-700/25 transition-all cursor-pointer"
              >
                <span>Masuk ke Dashboard Sekolah</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : paymentSession ? (
          /* ------------------------------------------------------------------ */
          /* VIEW 2: TAHAP PEMBAYARAN MIDTRANS GATEWAY */
          /* ------------------------------------------------------------------ */
          <div id="payment-gateway-view" className="p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Menunggu Pembayaran Midtrans
                  </span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {paymentSession.planTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tagihan resmi terbit untuk satuan pendidikan <span className="font-bold text-slate-900">{paymentSession.schoolName}</span>.
                </p>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Nomor Tagihan / Invoice</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {paymentSession.orderId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentSession.orderId);
                        setCopiedInvoice(true);
                        setTimeout(() => setCopiedInvoice(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                      title="Salin Nomor Invoice"
                    >
                      {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-500">Total Pembayaran</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-700">
                    {formatRupiah(paymentSession.amount)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[11px]">Siklus Langganan:</span>
                  <span className="font-bold text-slate-800">
                    {paymentSession.billingCycle === 'yearly' ? 'Tahunan (12 Bulan)' : 'Bulanan (1 Bulan)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Metode Didukung:</span>
                  <span className="font-bold text-slate-800">
                    QRIS, VA BCA, Mandiri, BRI, BNI, GoPay
                  </span>
                </div>
              </div>

              {paymentCheckMessage && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{paymentCheckMessage}</span>
                </div>
              )}
            </div>

            {/* Registered Account Pre-safeguard */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Akun Admin <strong className="font-mono font-bold text-blue-900">{paymentSession.createdAdminUsername}</strong> telah disiapkan. Paket akan otomatis aktif saat pembayaran terverifikasi.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {paymentSession.snapToken ? (
                <button
                  id="btn-open-snap"
                  type="button"
                  onClick={() => triggerSnapPay(paymentSession.snapToken!, paymentSession)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Bayar Sekarang via Midtrans Snap</span>
                </button>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="btn-check-payment-status"
                  type="button"
                  disabled={isCheckingPayment}
                  onClick={() => handleCheckStatus(paymentSession.orderId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-blue-300 text-blue-800 font-bold text-xs hover:bg-blue-50 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isCheckingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Cek Status Pembayaran (Midtrans)</span>
                </button>

                {/* Sandbox / Testing Simulation Button */}
                <button
                  id="btn-simulate-settlement"
                  type="button"
                  disabled={isCheckingPayment}
                  onClick={() => handleSimulatePayment(paymentSession.orderId)}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                  title="Gunakan simulasi ini untuk verifikasi instan sandbox"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifikasi Instan (Simulasi Sandbox)</span>
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-1">
                Terhubung ke Gateway Resmi Midtrans & terintegrasi ke panel Super Admin Kawacanaan SD.
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* VIEW 1: FORMULIR ONBOARDING DAFTAR SEKOLAH */
          /* ------------------------------------------------------------------ */
          <form
            id="register-school-form"
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 md:p-7 space-y-5 overflow-y-auto flex-1"
          >
            {submitError && (
              <div
                id="submit-error-alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs sm:text-sm"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Mohon lengkapi data onboarding:</div>
                  <div className="mt-0.5">{submitError}</div>
                </div>
              </div>
            )}

            {/* Banner Paket Sekolah Dasar Pro & Siklus Pembayaran */}
            <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-blue-900">
                      Paket Sekolah Dasar (Pro)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Seluruh Rombel 1–6 SD, Multi Akun Guru Mapel & Staf, Sinkronisasi Real-Time.
                    </div>
                  </div>
                </div>

                {/* Billing Cycle Switcher */}
                <div className="inline-flex items-center bg-white p-1 rounded-xl border border-blue-200 shadow-xs text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      billingCycle === 'yearly'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Tahunan</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                      Hemat 2 Bln
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Biaya Investasi:</span>
                <span className="text-base font-black text-blue-900">
                  {formatRupiah(activeAmount)}
                  <span className="text-xs font-normal text-slate-500">
                    /{billingCycle === 'yearly' ? 'tahun' : 'bulan'}
                  </span>
                </span>
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-4">
              {/* 1. NAMA SEKOLAH */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nama Sekolah / Satuan Pendidikan</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-school-name"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SD Negeri 01 Menteng / SD Islam Harapan Bangsa"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Nama resmi sekolah yang akan tercetak pada laporan dan rekap presensi dinas.
                </span>
              </div>

              {/* 2. NAMA LENGKAP ADMIN */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nama Lengkap Admin Sekolah</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-admin-name"
                  type="text"
                  value={adminFullName}
                  onChange={(e) => handleAdminNameChange(e.target.value)}
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Nama penanggung jawab akun administrator sekolah.
                </span>
              </div>

              {/* 3. USERNAME (OTOMATIS SAMA SEPERTI FITUR MULAI GRATIS) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                    <span>Username Akun Admin</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {usernameManuallyEdited ? (
                    <button
                      type="button"
                      onClick={handleResetAutoUsername}
                      className="text-[11px] text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Reset Otomatis
                    </button>
                  ) : (
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                      Otomatis dari Nama
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="input-username"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="otomatis terisi dari nama admin"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold text-blue-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-slate-50/60"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Username resmi untuk masuk ke sistem sekolah (tanpa spasi & huruf besar).
                </span>
              </div>

              {/* 4. EMAIL (OPSIONAL) */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-700" />
                  <span>Email Resmi / Korespondensi (Opsional)</span>
                </label>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sekolah.sch.id (opsional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Opsional. Digunakan untuk penerimaan bukti invoice Midtrans dan pemulihan akun.
                </span>
              </div>

              {/* 5. KATA SANDI & ULANGI KATA SANDI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-700" />
                    <span>Kata Sandi</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-700" />
                    <span>Ulangi Kata Sandi</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      required
                      minLength={6}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 transition-all bg-white ${
                        confirmPassword && password === confirmPassword
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : confirmPassword && password !== confirmPassword
                          ? 'border-amber-400 bg-amber-50/20'
                          : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {confirmPassword && password === confirmPassword && (
                    <span className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Kata sandi cocok
                    </span>
                  )}
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[11px] text-amber-600 font-medium mt-1 block">
                      Kata sandi belum cocok
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON & PRICE FOOTER */}
            <div className="pt-3 border-t border-slate-200">
              <button
                id="btn-submit-registration"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white shadow-md bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 active:scale-95 transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan Sekolah & Menyiapkan Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <span>Daftar & Lanjutkan ke Pembayaran ({formatRupiah(activeAmount)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center mt-2.5 text-[11px] text-slate-400">
                Terhubung ke Gateway Pembayaran Midtrans & database pusat Kawacanaan SD. Terintegrasi ke Super Admin.
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
