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
  Check,
  BookOpen,
  GraduationCap,
  CreditCard,
  QrCode,
  RefreshCw,
  Clock,
  Wallet,
  Zap,
  ChevronRight,
  KeyRound,
  PlusCircle,
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

interface SchoolLookupResult {
  schoolId?: string;
  code?: string;
  npsn?: string;
  namaSekolah: string;
  jenjang: string;
  status: 'Negeri' | 'Swasta';
  alamat?: string;
  jalan?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kabupatenKota?: string;
  provinsi?: string;
  kodePos?: string;
  teleponFax?: string;
  email?: string;
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
  npsn: string;
  contactName: string;
  contactPhone: string;
  email: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED';
  isSimulation?: boolean;
  notice?: string;
  createdAdminUsername: string;
  createdAdminRole: string;
  assignedInfo: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  initialPlanId = 'free',
  lang = 'ID',
}) => {
  // Mode Pendaftaran Sekolah: Punya Kode Undangan Sekolah vs Daftar Sekolah Baru
  const [schoolRegMode, setSchoolRegMode] = useState<'invite_code' | 'new_school'>('invite_code');
  const [inviteCode, setInviteCode] = useState('');
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [codeLookupSuccess, setCodeLookupSuccess] = useState(false);
  const [codeLookupError, setCodeLookupError] = useState('');
  const [linkedSchool, setLinkedSchool] = useState<SchoolLookupResult | null>(null);
  const [copiedSchoolCode, setCopiedSchoolCode] = useState(false);

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

  // Plan & Billing State
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'teacher' | 'school'>(
    initialPlanId || 'free'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

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

  // Midtrans Client Config & Payment Session State
  const [midtransConfig, setMidtransConfig] = useState<{
    client_key: string;
    is_production: boolean;
    snap_url: string;
    enabled: boolean;
  } | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSessionData | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCheckMessage, setPaymentCheckMessage] = useState<string | null>(null);

  // Success State
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    schoolName: string;
    schoolCode?: string;
    npsn?: string;
    username: string;
    role: string;
    plan: string;
    classesCount: number;
    assignedClassOrSubject?: string;
    invoiceNo?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);

  // Load Midtrans Snap Script dynamically when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/midtrans?action=get_client_config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.ok && cfg.enabled && cfg.client_key) {
          setMidtransConfig(cfg);
          if (!document.getElementById('midtrans-snap-script')) {
            const script = document.createElement('script');
            script.id = 'midtrans-snap-script';
            script.src = cfg.snap_url;
            script.setAttribute('data-client-key', cfg.client_key);
            script.async = true;
            document.body.appendChild(script);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSubmitError('');
      setRegistrationSuccessData(null);
      setPaymentSession(null);
      setPaymentCheckMessage(null);
      if (initialPlanId) {
        setSelectedPlan(initialPlanId);
      }
    }
  }, [isOpen, initialPlanId]);

  if (!isOpen) return null;

  // Auto generated username based on role & invite code or user input
  const cleanNpsnDigits = npsn.replace(/\D/g, '');
  const cleanNamePrefix = fullName.trim()
    ? fullName.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '')
    : '';
  const cleanCodePrefix = (inviteCode.trim() || cleanNpsnDigits).toLowerCase().replace(/[^a-z0-9]/g, '');

  const generatedUsername = isTeacherRegistration
    ? cleanNamePrefix
      ? `guru.${cleanNamePrefix}`
      : cleanCodePrefix
      ? `guru.${cleanCodePrefix}`
      : 'guru.kawacanaan'
    : cleanCodePrefix
    ? `admin.${cleanCodePrefix}`
    : 'admin.kawacanaan';

  // Plan info display configuration & pricing
  const planConfig = {
    free: {
      name: 'Paket Gratis',
      monthlyPrice: 0,
      yearlyPrice: 0,
      badge: '1 Guru Gratis (32 Siswa)',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Akses tanpa batas untuk 1 rombel binaan. Langsung aktif ke dashboard guru tanpa biaya apa pun.',
      features: ['Presensi 1 Rombel SD', '32 Peserta Didik', 'Ekspor Excel Standar', 'Masa Aktif Seumur Hidup'],
    },
    teacher: {
      name: 'Paket Guru Mandiri',
      monthlyPrice: 29000,
      yearlyPrice: 290000, // Diskon 2 bulan (hemat Rp 58.000)
      badge: 'Guru Pro (Multi-Kelas)',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Bisa didaftarkan oleh guru di sekolah mana pun. Terhubung hingga 5 rombel dan jadwal mata pelajaran.',
      features: ['Hingga 5 Rombel SD', '150 Peserta Didik', 'Multi-Jadwal Mapel & Ekstrakurikuler', 'Laporan Presensi Otomatis & Grafik'],
    },
    school: {
      name: 'Paket Sekolah Lengkap',
      monthlyPrice: 249000,
      yearlyPrice: 2490000, // Diskon 2 bulan (hemat Rp 498.000)
      badge: '1 Institusi Sekolah Penuh',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      description: 'Mencakup seluruh rombel kelas 1–6, semua guru mapel/wali kelas, portal siswa, dan rekap dinas.',
      features: ['Seluruh Rombel Kelas 1–6 SD', 'Seluruh Guru & Staf (Tak Terbatas)', 'Portal Orang Tua / Siswa', 'Sinkronisasi Super Admin & Rekap Terpadu'],
    },
  };

  const currentPlan = planConfig[selectedPlan];
  const activeAmount =
    selectedPlan === 'free'
      ? 0
      : billingCycle === 'yearly'
      ? currentPlan.yearlyPrice
      : currentPlan.monthlyPrice;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Lookup Satuan Pendidikan menggunakan Kode Undangan Sekolah
  const handleLookupInviteCode = async (targetCode?: string) => {
    const inputVal = (targetCode || inviteCode).trim().toUpperCase();
    if (!inputVal) {
      setCodeLookupError('Masukkan Kode Undangan Sekolah (contoh: 9B3366AB).');
      return;
    }

    setIsSearchingCode(true);
    setCodeLookupError('');
    setCodeLookupSuccess(false);

    try {
      const res = await fetch(`/api/school-lookup?code=${encodeURIComponent(inputVal)}`);
      const rawData = await res.json();
      const item: SchoolLookupResult = rawData?.data || rawData;

      if (res.ok && item && (item.namaSekolah || item.code)) {
        setLinkedSchool(item);
        setSchoolName(item.namaSekolah || `SD Satuan Pendidikan [${inputVal}]`);
        setStatusSekolah(item.status || 'Negeri');
        if (item.npsn) setNpsn(item.npsn);
        if (item.alamat) setAlamat(item.alamat);
        if (item.jalan) setJalan(item.jalan);
        if (item.desaKelurahan) setDesaKelurahan(item.desaKelurahan);
        if (item.kecamatan) setKecamatan(item.kecamatan);
        if (item.kabupatenKota) setKabupatenKota(item.kabupatenKota);
        if (item.provinsi) setProvinsi(item.provinsi);
        if (item.kodePos) setKodePos(item.kodePos);
        if (item.teleponFax && !phone) setPhone(item.teleponFax);
        if (item.email && !email) setEmail(item.email);
        setCodeLookupSuccess(true);
      } else {
        setCodeLookupError(
          rawData?.error || 'Kode Undangan Sekolah tidak ditemukan. Periksa kembali kode undangan dari Administrator sekolah.'
        );
        setLinkedSchool(null);
      }
    } catch (err: any) {
      setCodeLookupError('Koneksi ke server verifikasi kode tidak tersedia. Silakan periksa kembali.');
      setLinkedSchool(null);
    } finally {
      setIsSearchingCode(false);
    }
  };

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    setInviteCode(val);
    setCodeLookupError('');
    setCodeLookupSuccess(false);
    if (val.length >= 8) {
      handleLookupInviteCode(val);
    }
  };

  // Lookup fallback opsional bila pengguna mengisi NPSN
  const handleLookupNpsn = async (targetNpsn?: string) => {
    const inputVal = (targetNpsn || cleanNpsnDigits).trim();
    if (!inputVal) return;

    setIsSearchingNpsn(true);
    setLookupError('');
    setLookupSuccess(false);

    try {
      const res = await fetch(`/api/school-lookup?code=${inputVal}&npsn=${inputVal}`);
      const rawData = await res.json();
      const item: SchoolLookupResult = rawData?.data || rawData;

      if (res.ok && item && (item.namaSekolah || item.npsn)) {
        setSchoolName(item.namaSekolah || `SD NEGERI ${inputVal}`);
        setStatusSekolah(item.status || 'Negeri');
        if (item.alamat) setAlamat(item.alamat);
        setLookupSuccess(true);
      }
    } catch (_) {
    } finally {
      setIsSearchingNpsn(false);
    }
  };

  const handleNpsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setNpsn(val);
  };

  // Helper trigger Snap pay popup
  const triggerSnapPay = (token: string, session: PaymentSessionData) => {
    if (!window.snap) {
      setPaymentCheckMessage(
        'Komponen Midtrans Snap sedang memuat. Jika popup tidak terbuka, silakan gunakan tombol Bayar di bawah.'
      );
      return;
    }
    window.snap.pay(token, {
      onSuccess: async () => {
        setIsCheckingPayment(true);
        try {
          await fetch(`/api/midtrans?action=check_status&order_id=${encodeURIComponent(session.orderId)}`);
          completeOnboardingSuccess(session);
        } catch (_) {
          completeOnboardingSuccess(session);
        } finally {
          setIsCheckingPayment(false);
        }
      },
      onPending: () => {
        setPaymentCheckMessage('Transaksi tercatat di Midtrans. Menunggu penyelesaian pembayaran.');
      },
      onError: () => {
        setPaymentCheckMessage('Pembayaran belum berhasil diselesaikan. Silakan coba kembali.');
      },
      onClose: () => {
        setPaymentCheckMessage(
          'Jendela pembayaran ditutup. Anda dapat membuka kembali pembayaran atau mengecek status.'
        );
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
      if (!res.ok) throw new Error(body.error || 'Gagal memeriksa status.');

      if (body.is_settled || body.status === 'settlement' || body.status === 'capture') {
        completeOnboardingSuccess(paymentSession);
      } else {
        setPaymentCheckMessage(
          `Status: ${body.status || 'PENDING'}. Jika Anda baru saja melakukan transfer, silakan tunggu beberapa saat lalu cek kembali.`
        );
      }
    } catch (e: any) {
      setPaymentCheckMessage(e.message || 'Gagal menghubungi gateway Midtrans.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Simulate Instant Settlement (For Sandbox / Dev Testing)
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
      completeOnboardingSuccess(paymentSession);
    } catch (e: any) {
      setPaymentCheckMessage(e.message || 'Gagal simulasi pembayaran.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Complete onboarding transition
  const completeOnboardingSuccess = (session: PaymentSessionData | null) => {
    const assigned = session?.assignedInfo || (
      isTeacherRegistration
        ? teacherType === 'WALI_KELAS'
          ? `Wali Kelas SD (Kelas ${teacherGrade})`
          : `Guru Mata Pelajaran (${teacherSubject})`
        : 'Administrator & Kepala Sekolah'
    );

    const durationLabel = billingCycle === 'yearly' ? '1 Tahun Aktif' : '1 Bulan Aktif';
    const effectiveCode = session?.schoolCode || linkedSchool?.code || inviteCode || 'KWC-' + Math.floor(100000 + Math.random() * 900000);

    setRegistrationSuccessData({
      schoolName: schoolName.trim() || linkedSchool?.namaSekolah || 'SD Satuan Pendidikan',
      schoolCode: effectiveCode,
      npsn: cleanNpsnDigits || (linkedSchool?.npsn ? String(linkedSchool.npsn) : ''),
      username: session?.createdAdminUsername || generatedUsername,
      role: session?.createdAdminRole || (isTeacherRegistration ? 'WALI KELAS' : 'ADMIN'),
      plan: `${currentPlan.name} (${durationLabel}) - LUNAS Terverifikasi`,
      classesCount: selectedPlan === 'school' ? 6 : 1,
      assignedClassOrSubject: assigned,
      invoiceNo: session?.orderId,
    });
    setPaymentSession(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Validasi sesuai mode pendaftaran
    if (schoolRegMode === 'invite_code' && !linkedSchool && !inviteCode.trim()) {
      setSubmitError(lang === 'ID' ? 'Masukkan Kode Undangan Sekolah untuk menghubungkan ke satuan pendidikan Anda.' : 'Please enter School Invite Code.');
      return;
    }

    if (schoolRegMode === 'new_school' && !schoolName.trim()) {
      setSubmitError(lang === 'ID' ? 'Nama satuan pendidikan wajib diisi.' : 'School name is required.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError(
        isTeacherRegistration
          ? 'Nama lengkap guru/pendidik wajib diisi.'
          : 'Nama penanggung jawab/operator wajib diisi.'
      );
      return;
    }

    if (!password || password.length < 6) {
      setSubmitError(lang === 'ID' ? 'Kata sandi minimal 6 karakter.' : 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeInviteCode = inviteCode.trim().toUpperCase();
      const activeSchoolName = schoolName.trim() || (linkedSchool?.namaSekolah || 'SD Satuan Pendidikan');

      const payload = {
        schoolCode: activeInviteCode,
        inviteCode: activeInviteCode,
        code: activeInviteCode,
        npsn: cleanNpsnDigits || (linkedSchool?.npsn ? String(linkedSchool.npsn) : ''),
        schoolName: activeSchoolName,
        status: statusSekolah,
        plan: selectedPlan === 'free' ? 'guru_gratis' : selectedPlan === 'teacher' ? 'guru_pro' : 'sekolah_pro',
        jenjang: 'SD',
        alamat: alamat || linkedSchool?.alamat || '',
        jalan: jalan || linkedSchool?.jalan || '',
        desaKelurahan: desaKelurahan || linkedSchool?.desaKelurahan || '',
        kecamatan: kecamatan || linkedSchool?.kecamatan || '',
        kabupatenKota: kabupatenKota || linkedSchool?.kabupatenKota || '',
        provinsi: provinsi || linkedSchool?.provinsi || '',
        kodePos: kodePos || linkedSchool?.kodePos || '',
        // Akun fields
        adminName: fullName.trim(),
        adminPhone: phone.trim(),
        adminEmail: email.trim() || `${generatedUsername}@kawacanaan.sch.id`,
        adminPassword: password,
        username: generatedUsername,
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

      const returnedSchoolCode = data.school?.code || data.school?.schoolCode || activeInviteCode || 'KWC-' + Math.floor(100000 + Math.random() * 900000);

      // 1. JIKA PAKET GRATIS: Langsung aktifkan dan tampilkan layar sukses!
      if (selectedPlan === 'free') {
        setRegistrationSuccessData({
          schoolName: activeSchoolName,
          schoolCode: returnedSchoolCode,
          npsn: cleanNpsnDigits || (linkedSchool?.npsn ? String(linkedSchool.npsn) : ''),
          username: data.admin?.username || generatedUsername,
          role: data.admin?.role || (isTeacherRegistration ? 'WALI KELAS' : 'ADMIN'),
          plan: 'Paket Mulai / Gratis (Rp0 - 1 Guru, 32 Siswa)',
          classesCount: data.classesCreated || 1,
          assignedClassOrSubject: assignedInfo,
        });
        return;
      }

      // 2. JIKA PAKET BERBAYAR: Inisiasi Transaksi Midtrans
      const midtransRes = await fetch('/api/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
          school_id: data.school?.id,
          school_name: activeSchoolName,
          school_code: returnedSchoolCode,
          npsn: cleanNpsnDigits || (linkedSchool?.npsn ? String(linkedSchool.npsn) : ''),
          contact_name: fullName.trim(),
          contact_phone: phone.trim(),
          email: email.trim() || `${generatedUsername}@kawacanaan.sch.id`,
        }),
      });

      const midtransData = await midtransRes.json();
      if (!midtransRes.ok || !midtransData.ok) {
        throw new Error(midtransData?.error || 'Gagal menyiapkan sesi pembayaran Midtrans.');
      }

      const session: PaymentSessionData = {
        orderId: midtransData.order_id,
        snapToken: midtransData.snap_token || midtransData.token || null,
        redirectUrl: midtransData.redirect_url || null,
        amount: midtransData.amount || activeAmount,
        planTitle: midtransData.plan_title || currentPlan.name,
        billingCycle,
        schoolId: data.school?.id,
        schoolName: activeSchoolName,
        schoolCode: returnedSchoolCode,
        npsn: cleanNpsnDigits || (linkedSchool?.npsn ? String(linkedSchool.npsn) : ''),
        contactName: fullName.trim(),
        contactPhone: phone.trim(),
        email: email.trim(),
        status: 'PENDING',
        isSimulation: !!midtransData.is_simulation,
        notice: midtransData.notice,
        createdAdminUsername: data.admin?.username || generatedUsername,
        createdAdminRole: data.admin?.role || (isTeacherRegistration ? 'WALI KELAS' : 'ADMIN'),
        assignedInfo,
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

  const handleCopyCredentials = () => {
    if (!registrationSuccessData) return;
    const codePart = registrationSuccessData.schoolCode ? `\nKode Undangan Sekolah: ${registrationSuccessData.schoolCode}` : '';
    const text = `KREDENSIAL AKUN SISTEM KAWACANAAN\nSekolah: ${registrationSuccessData.schoolName}${codePart}\nNama: ${fullName}\nUsername: ${registrationSuccessData.username}\nPassword: ${password}\nPeran: ${registrationSuccessData.assignedClassOrSubject || registrationSuccessData.role}\nPaket: ${registrationSuccessData.plan}\nLink Login: ${window.location.origin}/?page=login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  const handleOpenLoginInNewTab = () => {
    const targetUrl = `/?page=login&user=${encodeURIComponent(registrationSuccessData?.username || '')}`;
    window.open(targetUrl, '_blank');
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
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header Section */}
        <div
          id="modal-header"
          className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6 border-b border-indigo-800/40"
        >
          <button
            id="btn-close-register-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <KawacanaanEmblem size={42} className="border-2 border-amber-400/80 shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Sistem Kawacanaan
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-medium text-slate-200">
                  <KeyRound className="w-3 h-3 text-amber-300" />
                  Akses Kode Undangan Sekolah
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {registrationSuccessData
                  ? 'Akun Kawacanaan Berhasil Dibuat'
                  : paymentSession
                  ? 'Menyelesaikan Pembayaran Midtrans'
                  : 'Onboarding Pengguna & Sekolah Baru'}
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {registrationSuccessData
              ? 'Kredensial login Anda telah terbit dan terdaftar di database pusat sistem Kawacanaan.'
              : paymentSession
              ? 'Selesaikan pembayaran tagihan melalui Midtrans Snap untuk mengaktifkan paket langganan Anda.'
              : 'Daftarkan akun pendidik menggunakan Kode Undangan Sekolah atau daftarkan satuan pendidikan baru.'}
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: LAYAR SUKSES PENDAFTARAN & KREDENSIAL */}
        {/* ------------------------------------------------------------- */}
        {registrationSuccessData ? (
          <div id="registration-success-view" className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Selamat Datang di Ekosistem Kawacanaan!
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Akun resmi untuk <span className="font-semibold text-slate-900">{registrationSuccessData.schoolName}</span> telah
                aktif dan siap digunakan langsung untuk rekap presensi dan administrasi sekolah.
              </p>
            </div>

            {/* School Invitation Code Card */}
            {registrationSuccessData.schoolCode && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-orange-500/10 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    Kode Undangan Sekolah (School Join Code)
                  </div>
                  <div className="font-mono text-2xl font-black text-amber-950 mt-1 tracking-wider">
                    {registrationSuccessData.schoolCode}
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1">
                    Bagikan kode undangan resmi ini kepada rekan guru lainnya untuk bergabung ke satuan pendidikan ini.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-copy-school-code"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationSuccessData.schoolCode || '');
                    setCopiedSchoolCode(true);
                    setTimeout(() => setCopiedSchoolCode(false), 2000);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                  title="Salin Kode Undangan"
                >
                  {copiedSchoolCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kode Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-800" />
                      <span>Salin Kode Undangan</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Credential Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Detail Kredensial Login
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {registrationSuccessData.plan}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Nama Pendidik / Admin</div>
                  <div className="font-semibold text-slate-800">{fullName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Penugasan / Jabatan</div>
                  <div className="font-semibold text-slate-800">
                    {registrationSuccessData.assignedClassOrSubject}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Username Akses</div>
                  <div className="font-mono font-bold text-indigo-600 bg-indigo-50/70 px-2 py-1 rounded inline-block border border-indigo-100">
                    {registrationSuccessData.username}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Kata Sandi (Password)</div>
                  <div className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded inline-block border border-slate-200">
                    {password}
                  </div>
                </div>
              </div>

              {registrationSuccessData.invoiceNo && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Nomor Invoice Midtrans:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {registrationSuccessData.invoiceNo}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="btn-copy-credentials"
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Kredensial Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Salin Kredensial Akun</span>
                  </>
                )}
              </button>

              <button
                id="btn-go-to-login"
                type="button"
                onClick={handleOpenLoginInNewTab}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm shadow-md transition-all"
              >
                <span>Buka Dashboard & Masuk</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : paymentSession ? (
          /* ------------------------------------------------------------- */
          /* VIEW 2: TAHAP PEMBAYARAN MIDTRANS GATEWAY */
          /* ------------------------------------------------------------- */
          <div id="payment-gateway-view" className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Menunggu Pembayaran
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {paymentSession.planTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tagihan resmi terbit untuk sekolah <span className="font-semibold">{paymentSession.schoolName}</span> (NPSN: {paymentSession.npsn}).
                </p>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs text-slate-500">Nomor Invoice Kawacanaan</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {paymentSession.orderId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyOrderId(paymentSession.orderId)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Salin Nomor Invoice"
                    >
                      {copiedOrder ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Tagihan</div>
                  <div className="text-xl font-black text-indigo-700">
                    {formatRupiah(paymentSession.amount)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block">Siklus Tagihan:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentSession.billingCycle === 'yearly' ? 'Tahunan (12 Bulan)' : 'Bulanan'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Metode Pembayaran:</span>
                  <span className="font-semibold text-slate-800">
                    QRIS, Virtual Account, E-Wallet
                  </span>
                </div>
              </div>

              {paymentCheckMessage && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{paymentCheckMessage}</span>
                </div>
              )}
            </div>

            {/* Credentials Preview Safeguard */}
            <div className="p-3.5 bg-slate-100/70 border border-slate-200/80 rounded-lg text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Data Akun Pendidik Tersimpan:</span>{' '}
              Username <code className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border">{paymentSession.createdAdminUsername}</code> dengan sandi yang telah Anda buat. Akun akan langsung aktif segera setelah pembayaran diverifikasi.
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {paymentSession.snapToken ? (
                <button
                  id="btn-open-snap"
                  type="button"
                  onClick={() => triggerSnapPay(paymentSession.snapToken!, paymentSession)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-md transition-all"
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
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-indigo-300 text-indigo-700 font-semibold text-xs hover:bg-indigo-50 disabled:opacity-60 transition-colors"
                >
                  {isCheckingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
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
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold text-xs transition-colors"
                  title="Gunakan ini untuk testing/demo sandbox tanpa harus transfer bank langsung"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifikasi Instan (Testing)</span>
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-1">
                Terintegrasi ke Super Admin Kawacanaan. Super Admin juga dapat memverifikasi tagihan ini secara manual di dashboard.
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 3: FORMULIR PENDAFTARAN & PEMILIHAN PAKET */
          /* ------------------------------------------------------------- */
          <form
            id="register-school-form"
            onSubmit={handleSubmit}
            className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto"
          >
            {submitError && (
              <div
                id="submit-error-alert"
                className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs sm:text-sm"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Pendaftaran belum dapat diproses:</div>
                  <div>{submitError}</div>
                </div>
              </div>
            )}

            {/* SELEKSI PAKET KAWACANAAN */}
            <div id="plan-selection-section" className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Pilih Paket Sistem Kawacanaan
                </label>

                {/* Billing Cycle Switcher */}
                {selectedPlan !== 'free' && (
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Bulanan
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                        billingCycle === 'yearly'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Tahunan</span>
                      <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1 rounded">
                        Hemat 2 Bln
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Paket Gratis */}
                <div
                  onClick={() => setSelectedPlan('free')}
                  className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'free'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-700">Gratis Selamanya</span>
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 'free'}
                      onChange={() => setSelectedPlan('free')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="text-base font-extrabold text-slate-900">Rp 0</div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    1 rombel binaan, 32 siswa. Langsung aktif tanpa kartu kredit.
                  </div>
                </div>

                {/* 2. Paket Guru Mandiri */}
                <div
                  onClick={() => setSelectedPlan('teacher')}
                  className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'teacher'
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-700">Guru Mandiri</span>
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 'teacher'}
                      onChange={() => setSelectedPlan('teacher')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {billingCycle === 'yearly' ? 'Rp 290.000' : 'Rp 29.000'}
                    <span className="text-[10px] font-normal text-slate-500">
                      /{billingCycle === 'yearly' ? 'thn' : 'bln'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    Hingga 5 rombel SD, rekap multi-jadwal, grafik otomatis.
                  </div>
                </div>

                {/* 3. Paket Sekolah Dasar Lengkap */}
                <div
                  onClick={() => setSelectedPlan('school')}
                  className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'school'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-indigo-700">Sekolah Lengkap</span>
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 'school'}
                      onChange={() => setSelectedPlan('school')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {billingCycle === 'yearly' ? 'Rp 2.490.000' : 'Rp 249.000'}
                    <span className="text-[10px] font-normal text-slate-500">
                      /{billingCycle === 'yearly' ? 'thn' : 'bln'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    Seluruh rombel kelas 1–6, semua guru mapel & portal siswa.
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1: SATUAN PENDIDIKAN DENGAN KODE UNDANGAN SEKOLAH */}
            <div id="step-school-id" className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  1. Satuan Pendidikan
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Sistem Kode Undangan</span>
              </div>

              {/* Pilihan Metode: Punya Kode Undangan vs Daftarkan Sekolah Baru */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  id="tab-mode-invite-code"
                  onClick={() => {
                    setSchoolRegMode('invite_code');
                    setSubmitError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    schoolRegMode === 'invite_code'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Punya Kode Undangan</span>
                </button>

                <button
                  type="button"
                  id="tab-mode-new-school"
                  onClick={() => {
                    setSchoolRegMode('new_school');
                    setSubmitError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    schoolRegMode === 'new_school'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Daftar Sekolah Baru</span>
                </button>
              </div>

              {schoolRegMode === 'invite_code' ? (
                /* MODE A: INPUT & VERIFIKASI KODE UNDANGAN SEKOLAH */
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Kode Undangan Sekolah (School Invite Code)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          id="input-invite-code"
                          type="text"
                          maxLength={12}
                          value={inviteCode}
                          onChange={handleInviteCodeChange}
                          placeholder="Contoh: 9B3366AB"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono tracking-wider font-bold text-indigo-950 uppercase placeholder:font-sans placeholder:font-normal"
                        />
                        <KeyRound className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
                      </div>

                      <button
                        id="btn-lookup-invite-code"
                        type="button"
                        onClick={() => handleLookupInviteCode()}
                        disabled={isSearchingCode || !inviteCode.trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        {isSearchingCode ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Verifikasi Kode</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {codeLookupSuccess && linkedSchool && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-emerald-950 text-sm">
                          {linkedSchool.namaSekolah}
                        </div>
                        <div className="text-emerald-800 font-medium mt-0.5">
                          Status: {linkedSchool.status || statusSekolah} &bull; Kode Terhubung:{' '}
                          <span className="font-mono font-bold">{linkedSchool.code || inviteCode}</span>
                        </div>
                        {linkedSchool.alamat && (
                          <div className="text-[11px] text-emerald-700 mt-1">
                            {linkedSchool.alamat}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {codeLookupError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span>{codeLookupError}</span>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Belum memiliki kode undangan? Pilih tab{' '}
                          <button
                            type="button"
                            onClick={() => setSchoolRegMode('new_school')}
                            className="font-bold text-indigo-600 underline"
                          >
                            Daftar Sekolah Baru
                          </button>{' '}
                          untuk membuat kode baru sekolah Anda.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE B: DAFTAR SATUAN PENDIDIKAN BARU */
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Sistem Kawacanaan akan otomatis menerbitkan <strong>Kode Undangan Sekolah resmi</strong> setelah pendaftaran berhasil.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Nama Satuan Pendidikan Resmi <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-school-name"
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Contoh: SD Negeri 01 Pagi / SD Islam..."
                        required
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Status Sekolah
                      </label>
                      <select
                        id="select-school-status"
                        value={statusSekolah}
                        onChange={(e: any) => setStatusSekolah(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 bg-white"
                      >
                        <option value="Negeri">Negeri</option>
                        <option value="Swasta">Swasta</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Alamat / Wilayah (Opsional)
                    </label>
                    <input
                      id="input-school-address"
                      type="text"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Jalan, Desa/Kelurahan, Kecamatan, Kota/Kabupaten"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: DATA AKUN GURU / PENANGGUNG JAWAB */}
            <div id="step-user-account" className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  2. Akun Pendidik & Penugasan
                </label>
                <span className="text-[11px] text-slate-400">Kredensial Akses</span>
              </div>

              {/* Spesifik Wali Kelas vs Guru Mapel jika registrasi guru */}
              {isTeacherRegistration && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Peran Pendidik
                    </label>
                    <select
                      id="select-teacher-type"
                      value={teacherType}
                      onChange={(e: any) => setTeacherType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                    >
                      <option value="WALI_KELAS">Wali Kelas SD</option>
                      <option value="GURU_MAPEL">Guru Mata Pelajaran</option>
                    </select>
                  </div>

                  {teacherType === 'WALI_KELAS' ? (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Tingkat Rombel Binaan
                      </label>
                      <select
                        id="select-teacher-grade"
                        value={teacherGrade}
                        onChange={(e: any) => setTeacherGrade(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                      >
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                          <option key={g} value={g}>
                            Kelas {g} SD
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Mata Pelajaran yang Diampu
                      </label>
                      <select
                        id="select-teacher-subject"
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                      >
                        <option value="PJOK">Pendidikan Jasmani & Olahraga (PJOK)</option>
                        <option value="PAI">Pendidikan Agama Islam (PAI)</option>
                        <option value="PAK">Pendidikan Agama Kristen</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Seni Budaya">Seni Budaya / Kesenian</option>
                        <option value="Pendidikan Pancasila">Pendidikan Pancasila / PKn</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    id="input-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Budi Santoso, S.Pd."
                    required
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    id="input-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Username Sistem (Format Standar)
                  </label>
                  <div className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-300 text-xs font-mono font-bold text-indigo-700">
                    {generatedUsername}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Otomatis dibuat berbasis peran dan NPSN.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Kata Sandi (Password) *
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
                      className="w-full px-3.5 py-2 pr-9 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON & PRICE FOOTER */}
            <div className="pt-3 border-t border-slate-200">
              <button
                id="btn-submit-registration"
                type="submit"
                disabled={isSubmitting || cleanNpsnDigits.length !== 8}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-md inline-flex items-center justify-center gap-2 transition-all ${
                  selectedPlan === 'free'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700'
                } disabled:opacity-60`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan Akun & Gateway...</span>
                  </>
                ) : selectedPlan === 'free' ? (
                  <>
                    <span>Aktifkan Akun Guru Gratis (Rp 0)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>
                      Lanjut ke Pembayaran Midtrans ({formatRupiah(activeAmount)})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center mt-2.5 text-[11px] text-slate-400">
                Terhubung ke Gateway Midtrans & Sistem Kawacanaan. Data aman dan terenkripsi.
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
