import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Users,
  ExternalLink,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Sparkles,
  X,
  Trash2,
  KeyRound,
  Check,
  Copy,
  GraduationCap,
  Briefcase,
  Layers,
  CreditCard,
  Activity,
  FileText,
  Filter,
  ArrowLeft,
  Edit,
  Save,
  Phone,
  Mail,
  MapPin,
  Globe,
  User,
  Power
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTenantLifecycleInfo } from '../../utils/tenantLifecycle';

export type SchoolDetailTab = 'ringkasan' | 'data-sekolah' | 'pengguna' | 'langganan' | 'pembayaran' | 'aktivitas';

const detailTabs: { id: SchoolDetailTab; label: string; icon: any }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: Building2 },
  { id: 'data-sekolah', label: 'Data Sekolah', icon: Edit },
  { id: 'pengguna', label: 'Pengguna', icon: Users },
  { id: 'langganan', label: 'Langganan', icon: Sparkles },
  { id: 'pembayaran', label: 'Pembayaran', icon: CreditCard },
  { id: 'aktivitas', label: 'Aktivitas', icon: Activity },
];

export const SchoolsSection: React.FC<{
  call: any;
  showToast: any;
  activeSubTab?: string;
  initialSchoolId?: string;
  onSubTabChange?: (tab: string) => void;
}> = ({ call, showToast, initialSchoolId, onSubTabChange }) => {
  const { impersonateSchool } = useApp();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  // School Detail Selection Context
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(initialSchoolId || null);
  const [currentDetailTab, setCurrentDetailTab] = useState<SchoolDetailTab>('ringkasan');
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Form State for Data Sekolah Edit
  const [profileForm, setProfileForm] = useState<any>({});

  // Modals for Create & Password Reset
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    npsn: '',
    plan: 'school',
    status: 'active',
    subscription_started_at: new Date().toISOString().slice(0, 10),
    subscription_expires_at: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  // Modal Create Admin for School
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Password Reset State
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Delete School / Workspace State
  const [schoolToDelete, setSchoolToDelete] = useState<any | null>(null);
  const [deletingSchool, setDeletingSchool] = useState(false);

  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;
    const sId = schoolToDelete.school_id || schoolToDelete.id;
    setDeletingSchool(true);
    try {
      const res = await call('delete_school', { school_id: sId });
      showToast(res.message || `Sekolah/ruang kerja "${schoolToDelete.name}" berhasil dihapus.`, 'success');
      setSchoolToDelete(null);
      if (selectedSchoolId === sId) {
        setSelectedSchoolId(null);
        setDetailData(null);
      }
      loadSchools();
    } catch (e: any) {
      showToast(e.message || 'Gagal menghapus sekolah.', 'error');
    } finally {
      setDeletingSchool(false);
    }
  };

  const loadSchools = async () => {
    setLoading(true);
    try {
      const res = await call('list');
      setSchools(res.schools || []);
    } catch (e: any) {
      showToast(e.message || 'Gagal memuat daftar sekolah.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  // Sync initial school ID if passed from external navigation
  useEffect(() => {
    if (initialSchoolId) {
      setSelectedSchoolId(initialSchoolId);
    }
  }, [initialSchoolId]);

  // Load Single School Details when selected
  const loadSchoolDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await call('school_details', { school_id: id });
      setDetailData(res);
      setProfileForm(res.profile || {
        nama_sekolah: res.school?.name || '',
        npsn: res.school?.npsn || '',
        jenjang: 'SD',
        tahun_pelajaran: '2026/2027',
        semester: '1'
      });
    } catch (e: any) {
      showToast(e.message || 'Gagal memuat detail sekolah.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      loadSchoolDetail(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const handleSelectSchool = (school: any) => {
    const sId = school.school_id || school.id;
    setSelectedSchoolId(sId);
    setCurrentDetailTab('ringkasan');
  };

  const handleBackToList = () => {
    setSelectedSchoolId(null);
    setDetailData(null);
    loadSchools();
  };

  // Filtered schools list
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const lifecycle = getTenantLifecycleInfo(s);
      const matchSearch =
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.npsn || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.status === 'active' && !lifecycle.isSuspended) ||
        (statusFilter === 'inactive' && (s.status === 'inactive' || lifecycle.isSuspended));

      const matchPlan =
        planFilter === 'all' ||
        (planFilter === 'school' && (s.plan === 'school' || s.plan === 'sekolah')) ||
        (planFilter === 'teacher' && (s.plan === 'teacher' || s.plan === 'guru')) ||
        (planFilter === 'mulai' && (s.plan === 'mulai' || s.plan === 'free'));

      let matchExpiry = true;
      if (expiryFilter === 'expiring') {
        matchExpiry = lifecycle.isExpiringSoon || lifecycle.isGracePeriod;
      } else if (expiryFilter === 'expired') {
        matchExpiry = lifecycle.isSuspended;
      } else if (expiryFilter === 'active') {
        matchExpiry = !lifecycle.isSuspended;
      }

      return matchSearch && matchStatus && matchPlan && matchExpiry;
    });
  }, [schools, search, statusFilter, planFilter, expiryFilter]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    setSavingProfile(true);
    try {
      await call('update_school_profile', {
        school_id: selectedSchoolId,
        profile: profileForm,
      });
      showToast('Informasi data sekolah berhasil disimpan.', 'success');
      loadSchoolDetail(selectedSchoolId);
      loadSchools();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan data sekolah.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Perpanjangan Langganan
  const handleExtendSubscription = async (days: number) => {
    if (!detailData?.school) return;
    const sch = detailData.school;
    const currentExpiry = sch.subscription_expires_at || new Date().toISOString().slice(0, 10);
    const baseDate = new Date(currentExpiry) > new Date() ? currentExpiry : new Date().toISOString().slice(0, 10);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + days);
    const nextExpiryStr = nextDate.toISOString().slice(0, 10);

    try {
      await call('update_school', {
        school_id: sch.id,
        name: sch.name,
        npsn: sch.npsn,
        plan: sch.plan,
        status: 'active',
        subscription_expires_at: nextExpiryStr,
      });
      showToast(`Masa aktif diperpanjang +${days} hari hingga ${nextExpiryStr}.`, 'success');
      loadSchoolDetail(sch.id);
      loadSchools();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperpanjang masa aktif.', 'error');
    }
  };

  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);

  const handleCopyCode = (code: string, id: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    showToast(`Kode sekolah "${code}" berhasil disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleRegenerateCode = async (schoolId: string) => {
    if (!confirm('Apakah Anda yakin ingin memperbarui / mengacak ulang Kode Undangan Sekolah ini?')) {
      return;
    }
    setRegeneratingCode(true);
    try {
      const res = await call('regenerate_school_code', { school_id: schoolId });
      showToast(`Kode sekolah berhasil diperbarui menjadi: ${res.code}`, 'success');
      loadSchoolDetail(schoolId);
      loadSchools();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperbarui kode sekolah.', 'error');
    } finally {
      setRegeneratingCode(false);
    }
  };

  // Handle Buat Sekolah Baru
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.npsn.trim()) {
      showToast('Nama sekolah dan NPSN wajib diisi.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await call('create_school', createForm);
      showToast(`Sekolah "${createForm.name}" berhasil dibuat!`, 'success');
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        npsn: '',
        plan: 'school',
        status: 'active',
        subscription_started_at: new Date().toISOString().slice(0, 10),
        subscription_expires_at: '',
        notes: '',
      });
      loadSchools();
      if (res.school?.id) {
        setSelectedSchoolId(res.school.id);
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat sekolah.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle Buat Admin Sekolah
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      showToast('Nama, username, dan password wajib diisi.', 'error');
      return;
    }
    setCreatingAdmin(true);
    try {
      await call('create_admin', {
        school_id: selectedSchoolId,
        ...adminForm,
      });
      showToast(`Akun admin "${adminForm.name}" berhasil dibuat.`, 'success');
      setIsCreateAdminOpen(false);
      setAdminForm({ name: '', username: '', email: '', password: '', role: 'ADMIN' });
      loadSchoolDetail(selectedSchoolId);
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat akun admin.', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Handle Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (newPassword.length < 8) {
      showToast('Password minimal 8 karakter.', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      await call('reset_admin_password', {
        user_id: resetModalUser.id,
        password: newPassword,
      });
      showToast(`Password untuk "${resetModalUser.name}" berhasil direset.`, 'success');
      setResetModalUser(null);
      setNewPassword('');
    } catch (e: any) {
      showToast(e.message || 'Gagal mereset password.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // Handle Masuk Sesi Sekolah (Impersonate)
  const handleImpersonate = (school: any) => {
    try {
      impersonateSchool({
        id: school.school_id || school.id,
        name: school.name,
        npsn: school.npsn || '10000000',
        plan: school.plan || 'school',
        status: school.status || 'active',
        subscriptionExpiresAt: school.subscription_expires_at,
        subscriptionStatus: school.status,
      });
      showToast(`Beralih ke sesi sekolah "${school.name}".`, 'info');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ==========================================
  // JIKA TAMPILAN DETAIL SEKOLAH TERPILIH
  // ==========================================
  if (selectedSchoolId) {
    const sch = detailData?.school || {};
    const prof = detailData?.profile || {};
    const users = detailData?.users || [];
    const classes = detailData?.classes || [];
    const students = detailData?.students || [];
    const payments = detailData?.payments || [];
    const auditLogs = detailData?.auditLogs || [];
    const lifecycle = getTenantLifecycleInfo(sch);

    return (
      <div className="space-y-6">
        {/* Header Navigasi Detail Sekolah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Kembali ke Daftar Sekolah"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{sch.name || 'Memuat Sekolah...'}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    sch.status === 'active' && !lifecycle.isSuspended
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {sch.status === 'active' && !lifecycle.isSuspended ? 'Aktif' : 'Tidak Aktif'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                  Paket {sch.plan === 'teacher' ? 'Guru' : sch.plan === 'school' || sch.plan === 'sekolah' ? 'Sekolah' : 'Mulai'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                NPSN: <strong className="text-slate-700">{sch.npsn || 'Belum diatur'}</strong> • Kode: <span className="font-mono text-slate-600">{sch.code || '-'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSchoolToDelete(sch)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="Hapus Sekolah atau Ruang Kerja ini"
            >
              <Trash2 size={14} />
              <span>Hapus {sch.workspace_type === 'personal' || sch.is_personal ? 'Ruang Kerja' : 'Sekolah'}</span>
            </button>
            <button
              onClick={() => handleImpersonate(sch)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ExternalLink size={14} />
              <span>Masuk Sesi Sekolah</span>
            </button>
          </div>
        </div>

        {/* 6 Tab Detail Sekolah Sesuai Ketentuan */}
        <div className="bg-white border border-slate-200/80 p-1.5 rounded-xl shadow-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {detailTabs.map((dt) => {
              const isActive = currentDetailTab === dt.id;
              const Icon = dt.icon;
              return (
                <button
                  key={dt.id}
                  onClick={() => setCurrentDetailTab(dt.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{dt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Konten Tiap Tab Detail */}
        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-semibold">Memuat data sekolah...</span>
          </div>
        ) : (
          <>
            {/* 1. Tab Ringkasan */}
            {currentDetailTab === 'ringkasan' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-500">Jumlah Siswa</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{students.length}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Maksimal: {sch.max_students || 256} siswa</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-500">Jumlah Guru & Admin</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Maksimal: {sch.max_teachers || 9} guru</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-500">Jumlah Kelas / Rombel</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{classes.length}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Maksimal: {sch.max_classes || 8} kelas</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-500">Masa Berlaku Lisensi</div>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {sch.subscription_expires_at || 'Seumur Hidup / Mulai'}
                    </div>
                    <div className="text-[11px] text-indigo-600 font-bold mt-1">
                      {lifecycle.daysRemaining === null ? 'Seumur Hidup' : `${lifecycle.daysRemaining} hari tersisa`}
                    </div>
                  </div>
                </div>

                {/* Kartu Khusus Kode Undangan Sekolah */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                      <KeyRound size={12} className="text-indigo-300" />
                      <span>Kode Undangan Bergabung Sekolah</span>
                    </div>
                    <h3 className="text-base font-black text-white">
                      Kode Akses Masuk Guru & Siswa
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Bagikan kode ini kepada Guru, Wali Kelas, dan Siswa saat mendaftar/onboarding agar mereka otomatis terhubung ke sekolah ini tanpa perlu memasukkan NPSN manual.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3">
                      <span className="font-mono text-xl font-black text-amber-300 tracking-wider">
                        {sch.code || `SCH-${sch.id?.slice(0, 4)?.toUpperCase() || '7849'}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(sch.code || `SCH-${sch.id?.slice(0, 4)?.toUpperCase() || '7849'}`, sch.id)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                        title="Salin Kode"
                      >
                        {copiedCodeId === sch.id ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRegenerateCode(sch.id)}
                      disabled={regeneratingCode}
                      className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={regeneratingCode ? 'animate-spin' : ''} />
                      <span>Acak Ulang</span>
                    </button>
                  </div>
                </div>

                {/* Informasi Penting & Catatan Super Admin */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600" />
                    Informasi & Catatan Khusus
                  </h3>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                    {sch.notes || 'Belum ada catatan khusus yang ditambahkan untuk sekolah ini.'}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Tab Data Sekolah */}
            {currentDetailTab === 'data-sekolah' && (
              <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Kelola Informasi Profil Sekolah</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Perbarui data pokok dan informasi kontak resmi sekolah.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sekolah / Institusi *</label>
                    <input
                      type="text"
                      value={profileForm.nama_sekolah || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, nama_sekolah: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NPSN Resmi *</label>
                    <input
                      type="text"
                      value={profileForm.npsn || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, npsn: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      value={profileForm.nama_kepala_sekolah || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, nama_kepala_sekolah: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      placeholder="Contoh: Hj. Siti Rahmah, M.Pd"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={profileForm.nip_kepala_sekolah || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, nip_kepala_sekolah: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      placeholder="19750812..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                    <input
                      type="text"
                      value={profileForm.alamat || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      placeholder="Jl. Cideng Barat No. 07"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon / Fax</label>
                    <input
                      type="text"
                      value={profileForm.telepon_fax || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, telepon_fax: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      placeholder="(021) 3847291"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi Sekolah</label>
                    <input
                      type="email"
                      value={profileForm.email || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      placeholder="sdncideng07@jakarta.go.id"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* 3. Tab Pengguna */}
            {currentDetailTab === 'pengguna' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Daftar Pengguna Sekolah</h3>
                    <p className="text-xs text-slate-500">Kelompok akun admin, kepala sekolah, dan guru.</p>
                  </div>
                  <button
                    onClick={() => setIsCreateAdminOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Tambah Akun Admin</span>
                  </button>
                </div>

                {users.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada akun guru atau administrator yang terdaftar di sekolah ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                          <th className="py-2.5 px-3">Nama Lengkap</th>
                          <th className="py-2.5 px-3">Username / Email</th>
                          <th className="py-2.5 px-3">Peran (Role)</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{u.name}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">{u.username || u.email}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {u.is_active !== false ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setResetModalUser(u);
                                  setNewPassword('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <KeyRound size={12} />
                                <span>Reset Sandi</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. Tab Langganan */}
            {currentDetailTab === 'langganan' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Kelola Paket & Masa Aktif Lisensi</h3>
                  <p className="text-xs text-slate-500">Perpanjang masa aktif atau ubah status lisensi sekolah.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold">Paket Saat Ini</div>
                    <div className="text-xl font-black text-slate-900 uppercase mt-1">
                      {sch.plan === 'teacher' ? 'Paket Guru' : sch.plan === 'school' || sch.plan === 'sekolah' ? 'Paket Sekolah' : 'Paket Mulai'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold">Masa Aktif Berakhir Pada</div>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {sch.subscription_expires_at || 'Tidak ada batas waktu'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold">Status Lisensi</div>
                    <div className="text-lg font-black text-emerald-700 mt-1">
                      {sch.status === 'active' ? 'Aktif' : 'Dinonaktifkan'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Pilihan Perpanjangan Cepat:</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExtendSubscription(7)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold cursor-pointer"
                    >
                      +7 Hari (Uji Coba / Tenggang)
                    </button>
                    <button
                      onClick={() => handleExtendSubscription(30)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold cursor-pointer"
                    >
                      +30 Hari (1 Bulan)
                    </button>
                    <button
                      onClick={() => handleExtendSubscription(180)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold cursor-pointer"
                    >
                      +180 Hari (1 Semester)
                    </button>
                    <button
                      onClick={() => handleExtendSubscription(365)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      +365 Hari (1 Tahun Ajaran)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Tab Pembayaran */}
            {currentDetailTab === 'pembayaran' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Riwayat Pembayaran & Transaksi</h3>
                  <p className="text-xs text-slate-500">Seluruh bukti tagihan pembayaran milik {sch.name}.</p>
                </div>

                {payments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada riwayat pembayaran yang tercatat untuk sekolah ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                          <th className="py-2.5 px-3">No. Transaksi</th>
                          <th className="py-2.5 px-3">Paket</th>
                          <th className="py-2.5 px-3">Nominal</th>
                          <th className="py-2.5 px-3">Metode</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.invoice_no || p.invoiceNo || p.id}</td>
                            <td className="py-2.5 px-3">{p.plan_name || p.planName || 'Paket Sekolah'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              Rp {Number(p.total_amount || p.amount || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-3">{p.payment_method || 'QRIS'}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {p.status === 'paid' ? 'Lunas' : 'Menunggu'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 6. Tab Aktivitas */}
            {currentDetailTab === 'aktivitas' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Rekam Jejak Aktivitas Sekolah</h3>
                  <p className="text-xs text-slate-500">Histori perubahan dan aksi yang terjadi pada tenant ini.</p>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada log aktivitas untuk sekolah ini.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {auditLogs.map((log: any, i: number) => (
                      <div key={log.id || i} className="py-3 text-xs flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-800">{log.action}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Oleh: <strong className="text-slate-700">{log.actor_name || 'Super Admin'}</strong>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal Buat Admin Sekolah */}
        {isCreateAdminOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Tambah Akun Admin Sekolah</h3>
                <button onClick={() => setIsCreateAdminOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="Nama Administrator"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="admin_cideng07"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="admin@sekolah.sch.id"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Awal *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="Minimal 8 karakter"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateAdminOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {creatingAdmin ? 'Membuat...' : 'Buat Akun'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Reset Password */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Reset Password Pengguna</h3>
                <button onClick={() => setResetModalUser(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Atur ulang password untuk akun <strong>{resetModalUser.name}</strong> (@{resetModalUser.username}).
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="Minimal 8 karakter"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {resettingPassword ? 'Menyimpan...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // TAMPILAN UTAMA: DAFTAR SELURUH SEKOLAH
  // ==========================================
  return (
    <div className="space-y-5">
      {/* Bar Pencarian & Tombol Aksi */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama sekolah, NPSN, atau kode..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif Saja</option>
            <option value="inactive">Tidak Aktif / Kedaluwarsa</option>
          </select>

          {/* Filter Paket */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Paket</option>
            <option value="school">Paket Sekolah</option>
            <option value="teacher">Paket Guru</option>
            <option value="mulai">Paket Mulai</option>
          </select>

          {/* Filter Masa Berlaku */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Masa Berlaku</option>
            <option value="expiring">Akan Segera Habis</option>
            <option value="expired">Sudah Kedaluwarsa</option>
          </select>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus size={15} />
            <span>Tambah Sekolah</span>
          </button>
        </div>
      </div>

      {/* Tabel Daftar Sekolah */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-semibold">Memuat data sekolah...</span>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Tidak ada sekolah yang sesuai dengan kriteria pencarian atau filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                  <th className="py-3 px-4">Nama Sekolah</th>
                  <th className="py-3 px-4">Kode Undangan</th>
                  <th className="py-3 px-4">NPSN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4 text-center">Siswa</th>
                  <th className="py-3 px-4 text-center">Guru</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((s) => {
                  const lifecycle = getTenantLifecycleInfo(s);
                  const isSuspendedOrExpired = s.status === 'inactive' || lifecycle.isSuspended;
                  const displayCode = s.code || `SCH-${s.id?.slice(0, 4)?.toUpperCase() || '7849'}`;

                  return (
                    <tr
                      key={s.id || s.school_id}
                      onClick={() => handleSelectSchool(s)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 hover:text-indigo-600 transition-colors">
                          {s.name}
                        </div>
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-[11px]">
                          <span>{displayCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(displayCode, s.id)}
                            className="text-amber-700 hover:text-amber-950 p-0.5"
                            title="Salin Kode Undangan"
                          >
                            {copiedCodeId === s.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {s.npsn || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !isSuspendedOrExpired
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {!isSuspendedOrExpired ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                          {s.plan === 'teacher' ? 'Guru' : s.plan === 'school' || s.plan === 'sekolah' ? 'Sekolah' : 'Mulai'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {s.student_count || 0}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {s.teacher_admin_count || 0}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">
                          {s.subscription_expires_at || 'Seumur Hidup'}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-bold">
                          {lifecycle.daysRemaining === null ? 'Seumur Hidup' : `${lifecycle.daysRemaining} hari lagi`}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectSchool(s)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer transition-colors"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => setSchoolToDelete(s)}
                            title="Hapus Sekolah / Ruang Kerja"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Sekolah Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Tambah Sekolah Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sekolah *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Contoh: Nama Sekolah"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NPSN Resmi *</label>
                <input
                  type="text"
                  required
                  value={createForm.npsn}
                  onChange={(e) => setCreateForm({ ...createForm, npsn: e.target.value })}
                  placeholder="Contoh: 20100123"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paket Layanan</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="school">Paket Sekolah (Maks 256 Siswa)</option>
                    <option value="teacher">Paket Guru (Maks 32 Siswa)</option>
                    <option value="mulai">Paket Mulai (Gratis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Awal</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Masa Berlaku Berakhir (Opsional)</label>
                <input
                  type="date"
                  value={createForm.subscription_expires_at}
                  onChange={(e) => setCreateForm({ ...createForm, subscription_expires_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Catatan administrasi super admin..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {creating ? 'Menyimpan...' : 'Buat Sekolah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Sekolah / Ruang Kerja */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hapus {schoolToDelete.workspace_type === 'personal' || schoolToDelete.is_personal ? 'Ruang Kerja Individu' : 'Sekolah'}</h3>
                  <p className="text-xs text-slate-500">Tindakan ini permanen dan tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => setSchoolToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nama:</span>
                  <span className="font-bold text-slate-800">{schoolToDelete.name}</span>
                </div>
                {schoolToDelete.npsn && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">NPSN:</span>
                    <span className="font-mono text-slate-700">{schoolToDelete.npsn}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tipe:</span>
                  <span className="font-bold text-indigo-700">{schoolToDelete.workspace_type === 'personal' || schoolToDelete.is_personal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Paket:</span>
                  <span className="font-semibold text-slate-700 uppercase">{schoolToDelete.plan || 'Mulai'}</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                <span>
                  Seluruh akun pengguna, data kelas, peserta didik, rekap presensi, dan konfigurasi yang terhubung dengan entitas ini akan dihapus secara menyeluruh.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingSchool}
                onClick={() => setSchoolToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingSchool}
                onClick={handleDeleteSchool}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {deletingSchool ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Hapus Permanen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
