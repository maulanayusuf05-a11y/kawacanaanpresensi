import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Sliders,
  Power,
  Users,
  ExternalLink,
  ShieldCheck,
  Zap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Ban,
  Sparkles,
  Gift,
  HelpCircle,
  X,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getTenantLifecycleInfo,
  calculateExpiryFromDuration,
  DURATION_PRESETS
} from '../../utils/tenantLifecycle';

export const SchoolsTab: React.FC<{
  call: any;
  showToast: any;
  onManageUsers: (schoolId: string) => void;
}> = ({ call, showToast, onManageUsers }) => {
  const { impersonateSchool } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickProvisionOpen, setIsQuickProvisionOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<any | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State (Create School)
  const [form, setForm] = useState({
    name: '',
    npsn: '',
    plan: 'school',
    subscription_started_at: new Date().toISOString().slice(0, 10),
    duration_preset: '365', // default 1 tahun
    custom_days: 30,
    subscription_expires_at: calculateExpiryFromDuration(new Date().toISOString().slice(0, 10), 365) || '',
    is_manual_override: false,
    override_reason: '',
    notes: '',
  });

  // 1-Click Provisioning Form
  const [quickForm, setQuickForm] = useState({
    schoolName: '',
    npsn: '',
    plan: 'school',
    duration_preset: '365',
    subscription_started_at: new Date().toISOString().slice(0, 10),
    adminName: 'Administrator Sekolah',
    adminUsername: '',
    adminPassword: '',
  });
  const [provisioning, setProvisioning] = useState(false);

  // Edit School helper states
  const [editDurationPreset, setEditDurationPreset] = useState<string>('custom');
  const [editManualOverride, setEditManualOverride] = useState<boolean>(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await call('list');
      setRows(res.schools || []);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Update expiry when start date or duration preset changes in Create form
  const handleDurationPresetChange = (presetId: string, customDaysVal?: number) => {
    const days = presetId === 'unlimited' ? null : presetId === 'custom' ? (customDaysVal || form.custom_days || 30) : Number(presetId);
    const calculatedExpiry = calculateExpiryFromDuration(form.subscription_started_at, days);
    setForm((prev) => ({
      ...prev,
      duration_preset: presetId,
      subscription_expires_at: calculatedExpiry || '',
    }));
  };

  const handleStartDateChange = (dateStr: string) => {
    const days = form.duration_preset === 'unlimited' ? null : form.duration_preset === 'custom' ? form.custom_days : Number(form.duration_preset);
    const calculatedExpiry = calculateExpiryFromDuration(dateStr, days);
    setForm((prev) => ({
      ...prev,
      subscription_started_at: dateStr,
      subscription_expires_at: calculatedExpiry || '',
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const notesWithOverride = form.is_manual_override && form.override_reason
        ? `[OVERRIDE MANUAL SUPER ADMIN: ${form.override_reason}] ${form.notes || ''}`.trim()
        : form.notes;

      await call('create_school', {
        name: form.name,
        npsn: form.npsn,
        plan: form.plan,
        subscription_started_at: form.subscription_started_at,
        subscription_expires_at: form.subscription_expires_at || null,
        notes: notesWithOverride,
      });

      showToast('Tenant sekolah baru berhasil didaftarkan.', 'success');
      setIsCreateOpen(false);
      setForm({
        name: '',
        npsn: '',
        plan: 'school',
        subscription_started_at: new Date().toISOString().slice(0, 10),
        duration_preset: '365',
        custom_days: 30,
        subscription_expires_at: calculateExpiryFromDuration(new Date().toISOString().slice(0, 10), 365) || '',
        is_manual_override: false,
        override_reason: '',
        notes: '',
      });
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // 1-Click Tenant & Admin Provisioning
  const handleQuickProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    try {
      const days = quickForm.duration_preset === 'unlimited' ? null : Number(quickForm.duration_preset);
      const expiryDate = calculateExpiryFromDuration(quickForm.subscription_started_at, days);

      // 1. Create School
      const resSchool = await call('create_school', {
        name: quickForm.schoolName,
        npsn: quickForm.npsn,
        plan: quickForm.plan,
        subscription_started_at: quickForm.subscription_started_at,
        subscription_expires_at: expiryDate,
        notes: '1-Click Fast Provisioning (Otomatis Sistem)',
      });
      const schoolId = resSchool?.school?.id;
      if (!schoolId) throw new Error('Gagal membuat profil sekolah.');

      // 2. Create Admin
      const username = quickForm.adminUsername || `admin_${quickForm.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
      const password = quickForm.adminPassword || 'AdminSekolah123!';

      await call('create_admin', {
        school_id: schoolId,
        name: quickForm.adminName,
        username,
        password,
      });

      showToast(`Tenant "${quickForm.schoolName}" & akun Admin (@${username}) berhasil dibuat!`, 'success');
      setIsQuickProvisionOpen(false);
      setQuickForm({
        schoolName: '',
        npsn: '',
        plan: 'school',
        duration_preset: '365',
        subscription_started_at: new Date().toISOString().slice(0, 10),
        adminName: 'Administrator Sekolah',
        adminUsername: '',
        adminPassword: '',
      });
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setProvisioning(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchool) return;
    try {
      await call('update_school', {
        school_id: editSchool.school_id,
        name: editSchool.name,
        npsn: editSchool.npsn,
        plan: editSchool.plan,
        status: editSchool.status,
        subscription_started_at: editSchool.subscription_started_at || null,
        subscription_expires_at: editSchool.subscription_expires_at || null,
        notes: editSchool.notes,
      });
      showToast('Informasi tenant sekolah berhasil diperbarui.', 'success');
      setEditSchool(null);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleStatus = async (school: any) => {
    const lifecycle = getTenantLifecycleInfo(school);
    const isCurrentlySuspended = lifecycle.isSuspended;
    const nextStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const confirmMsg =
      nextStatus === 'suspended'
        ? `Tangguhkan (SUSPEND) operasional ${school.name}? Seluruh pengguna sekolah ini tidak akan bisa login.`
        : `Aktifkan kembali (ACTIVE) operasional ${school.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await call('toggle_school', { school_id: school.school_id, status: nextStatus });
      showToast(`Status sekolah berhasil diubah menjadi ${nextStatus === 'active' ? 'ACTIVE' : 'SUSPENDED'}.`, 'success');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;
    setIsDeleting(true);
    try {
      await call('delete_school', { schoolId: schoolToDelete.school_id || schoolToDelete.id });
      showToast(`Sekolah ${schoolToDelete.name} dan seluruh data terkait berhasil dihapus permanen.`, 'success');
      setSchoolToDelete(null);
      load();
    } catch (e: any) {
      showToast(e.message || 'Gagal menghapus sekolah.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper quick date extension / manual override
  const applyDurationExtension = (days: number, label: string) => {
    if (!editSchool) return;
    const currentBase = editSchool.subscription_expires_at ? new Date(editSchool.subscription_expires_at) : new Date();
    const target = new Date(Math.max(Date.now(), currentBase.getTime()) + days * 24 * 60 * 60 * 1000);
    const newDateStr = target.toISOString().slice(0, 10);
    
    setEditSchool({
      ...editSchool,
      status: 'active',
      subscription_expires_at: newDateStr,
      notes: `${editSchool.notes ? editSchool.notes + ' | ' : ''}[+${days} hari ${label} pada ${new Date().toLocaleDateString('id-ID')}]`,
    });
    showToast(`Masa berlaku diperpanjang +${days} hari (${label}) menjadi ${newDateStr}.`, 'info');
  };

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.npsn || '').toLowerCase().includes(search.toLowerCase());
      
      const sPlan = (s.plan || 'mulai').toLowerCase();
      const matchPlan =
        planFilter === 'all' ||
        (planFilter === 'mulai' && (sPlan === 'mulai' || sPlan === 'free')) ||
        (planFilter === 'teacher' && (sPlan === 'teacher' || sPlan === 'guru')) ||
        (planFilter === 'school' && (sPlan === 'school' || sPlan === 'sekolah')) ||
        sPlan === planFilter;
      
      const lifecycle = getTenantLifecycleInfo(s);
      const matchStatus = statusFilter === 'all' || lifecycle.status === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [rows, search, planFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Manajemen Tenant & Ruang Kerja</h2>
          <p className="text-xs text-slate-500">
            Integrasi lengkap seluruh paket (Paket Mulai / Gratis, Paket Guru Mandiri, dan Paket Sekolah Institusi).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsQuickProvisionOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm shadow-amber-500/20 cursor-pointer"
          >
            <Zap size={15} /> 1-Klik Provisioning Tenant
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus size={15} /> Tambah Sekolah / Ruang Kerja
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama sekolah, guru, atau NPSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Paket Layanan</option>
            <option value="mulai">Paket Mulai / Gratis (Rp0)</option>
            <option value="teacher">Paket Guru Mandiri (Rp31.000)</option>
            <option value="school">Paket Sekolah Institusi (Rp270.000)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Status Otomatis Sistem</option>
            <option value="ACTIVE">🟢 1. ACTIVE (Aktif Normal)</option>
            <option value="EXPIRING_SOON">🟡 2. EXPIRING_SOON (≤ 30 Hari)</option>
            <option value="GRACE_PERIOD">🟠 3. GRACE_PERIOD (Tenggang 7 Hari)</option>
            <option value="SUSPENDED">🔴 4. SUSPENDED (Ditangguhkan Otomatis)</option>
          </select>

          <button
            onClick={load}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Sekolah / Ruang Kerja</th>
                <th className="px-5 py-3.5">Paket Langganan</th>
                <th className="px-5 py-3.5">Penggunaan Kuota</th>
                <th className="px-5 py-3.5">Masa Berlaku (Sistem)</th>
                <th className="px-5 py-3.5">Status Otomatis</th>
                <th className="px-5 py-3.5 text-right">Tindakan & Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Memuat data tenant sekolah & ruang kerja...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Tidak ada tenant atau ruang kerja yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const studentPct = s.max_students ? Math.min(100, Math.round((s.student_count / s.max_students) * 100)) : 0;
                  const lifecycle = getTenantLifecycleInfo(s);
                  const p = (s.plan || 'mulai').toLowerCase();
                  const isSchoolPlan = p === 'school' || p === 'sekolah';
                  const isTeacherPlan = p === 'teacher' || p === 'guru';

                  return (
                    <tr key={s.school_id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Building2 size={16} className={isSchoolPlan ? 'text-indigo-600 shrink-0' : isTeacherPlan ? 'text-blue-600 shrink-0' : 'text-emerald-600 shrink-0'} />
                          {s.name}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                          {s.npsn ? `NPSN: ${s.npsn}` : 'Ruang Kerja Individu / Mandiri'}
                        </div>
                        {s.notes && (
                          <div className="mt-1 flex items-start gap-1 text-[11px] text-slate-600 bg-slate-100/70 border border-slate-200/60 rounded-md px-2 py-0.5 max-w-[280px]">
                            <span className="font-bold text-indigo-600 shrink-0">📝</span>
                            <span className="truncate" title={s.notes}>{s.notes}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                            isSchoolPlan
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isTeacherPlan
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isSchoolPlan ? 'Paket Sekolah' : isTeacherPlan ? 'Paket Guru' : 'Paket Mulai / Gratis'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1.5 min-w-[140px]">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">
                              Siswa: {s.student_count} / {s.max_students}
                            </span>
                            <span className="font-semibold text-slate-700">{studentPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                studentPct > 90 ? 'bg-rose-500' : studentPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${studentPct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Guru: {s.teacher_admin_count}/{s.max_teachers} · Kelas: {s.class_count}/{s.max_classes}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {s.subscription_expires_at
                            ? new Date(s.subscription_expires_at).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Tanpa Batas (Lifetime)'}
                        </div>
                        {lifecycle.isExpiringSoon && (
                          <span className={`inline-block mt-0.5 text-[10px] font-bold ${
                            lifecycle.alertSeverity === 'danger' ? 'text-rose-600' : 'text-amber-700'
                          }`}>
                            ⚠️ {lifecycle.alertMilestone}: Sisa {lifecycle.daysRemaining} hari
                          </span>
                        )}
                        {lifecycle.isGracePeriod && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-orange-700">
                            ⏳ Masa tenggang: sisa {lifecycle.graceDaysRemaining} hari
                          </span>
                        )}
                        {lifecycle.isSuspended && s.subscription_expires_at && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600">
                            🚫 Ditangguhkan otomatis
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${lifecycle.badgeClass}`}
                          >
                            {lifecycle.status === 'ACTIVE' && <CheckCircle2 size={12} className="text-emerald-600" />}
                            {lifecycle.status === 'EXPIRING_SOON' && <Clock size={12} className="text-amber-600" />}
                            {lifecycle.status === 'GRACE_PERIOD' && <Hourglass size={12} className="text-orange-600" />}
                            {lifecycle.status === 'SUSPENDED' && <Ban size={12} className="text-rose-600" />}
                            <span>{lifecycle.status}</span>
                          </span>
                          <div className="text-[10px] text-slate-400 max-w-[170px] leading-tight truncate" title={lifecycle.description}>
                            {lifecycle.description}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate / Login As Admin */}
                          <button
                            onClick={() => impersonateSchool({ id: s.school_id, name: s.name, plan: s.plan })}
                            title="Simulasi Login sebagai Admin Sekolah"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <ExternalLink size={13} />
                            <span className="hidden xl:inline">Login As</span>
                          </button>

                          {/* Manage Users */}
                          <button
                            onClick={() => onManageUsers(s.school_id)}
                            title="Kelola Admin Sekolah Ini"
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <Users size={14} />
                          </button>

                          {/* Edit / Limits / Lifecycle */}
                          <button
                            onClick={() => {
                              setEditSchool({ ...s });
                              setEditManualOverride(false);
                            }}
                            title="Konfigurasi Masa Berlaku & Override Manual"
                            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <Sliders size={14} />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleStatus(s)}
                            title={lifecycle.isSuspended ? 'Aktifkan Kembali (ACTIVE)' : 'Tangguhkan Akses (SUSPEND)'}
                            className={`p-2 rounded-xl transition cursor-pointer ${
                              lifecycle.isSuspended
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            <Power size={14} />
                          </button>

                          {/* Delete School */}
                          <button
                            onClick={() => setSchoolToDelete(s)}
                            title="Hapus Sekolah & Seluruh Data Terkait"
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1-Click Fast Provisioning */}
      {isQuickProvisionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">1-Klik Provisioning Tenant</h3>
                  <p className="text-xs text-slate-500">Buat sekolah, hitung masa berlaku otomatis, dan buat admin pertama.</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickProvisionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickProvision} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Instansi Sekolah</label>
                <input
                  required
                  value={quickForm.schoolName}
                  onChange={(e) => setQuickForm({ ...quickForm, schoolName: e.target.value })}
                  placeholder="Contoh: SMA Negeri 1 Bandung"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NPSN (Opsional)</label>
                  <input
                    value={quickForm.npsn}
                    onChange={(e) => setQuickForm({ ...quickForm, npsn: e.target.value })}
                    placeholder="20101234"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paket Awal</label>
                  <select
                    value={quickForm.plan}
                    onChange={(e) => setQuickForm({ ...quickForm, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700"
                  >
                    <option value="school">Paket Sekolah Institusi (Rp270.000 / 8 Guru + 1 Kepsek / 256 Siswa)</option>
                    <option value="teacher">Paket Guru Mandiri (Rp31.000 / 1 Guru / 32 Siswa)</option>
                    <option value="mulai">Paket Mulai / Gratis (Rp0 / 1 Guru / 32 Siswa)</option>
                  </select>
                </div>
              </div>

              {/* Automatic Duration Selection */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                <label className="font-bold text-indigo-950 flex items-center justify-between">
                  <span>Masa Berlaku (Otomatis Dihitung Sistem)</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Mulai Hari Ini</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '30', label: '1 Bulan' },
                    { id: '90', label: '3 Bulan' },
                    { id: '180', label: '6 Bulan' },
                    { id: '365', label: '1 Tahun' },
                    { id: '730', label: '2 Tahun' },
                    { id: 'unlimited', label: 'Lifetime' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setQuickForm({ ...quickForm, duration_preset: p.id })}
                      className={`py-2 px-2.5 rounded-xl text-center font-bold text-[11px] transition border cursor-pointer ${
                        quickForm.duration_preset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-indigo-800 font-medium pt-1">
                  📅 Tanggal Kedaluwarsa Otomatis:{' '}
                  <strong>
                    {calculateExpiryFromDuration(
                      quickForm.subscription_started_at,
                      quickForm.duration_preset === 'unlimited' ? null : Number(quickForm.duration_preset)
                    ) || 'Tanpa Batas (Lifetime)'}
                  </strong>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  Kredensial Admin Utama Sekolah
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Admin</label>
                  <input
                    required
                    value={quickForm.adminName}
                    onChange={(e) => setQuickForm({ ...quickForm, adminName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Username Login</label>
                    <input
                      value={quickForm.adminUsername}
                      onChange={(e) => setQuickForm({ ...quickForm, adminUsername: e.target.value })}
                      placeholder="Otomatis jika kosong"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Password Awal</label>
                    <input
                      type="password"
                      value={quickForm.adminPassword}
                      onChange={(e) => setQuickForm({ ...quickForm, adminPassword: e.target.value })}
                      placeholder="AdminSekolah123!"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickProvisionOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {provisioning ? 'Memproses Tenant...' : 'Buat Tenant & Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Standard Create School */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Daftarkan Tenant Sekolah</h3>
                  <p className="text-xs text-slate-500">Buat entitas sekolah baru dengan siklus masa aktif otomatis.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Instansi Sekolah</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: SMA Negeri 1 Bandung"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NPSN (Nomor Pokok)</label>
                  <input
                    value={form.npsn}
                    onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                    placeholder="Contoh: 20103456"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paket Langganan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700"
                  >
                    <option value="school">Paket Sekolah Institusi (Rp270.000 / 8 Guru + 1 Kepsek / 256 Siswa)</option>
                    <option value="teacher">Paket Guru Mandiri (Rp31.000 / 1 Guru / 32 Siswa)</option>
                    <option value="mulai">Paket Mulai / Gratis (Rp0 / 1 Guru / 32 Siswa)</option>
                  </select>
                </div>
              </div>

              {/* Section: Masa Berlaku Otomatis (System-based) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    Pengaturan Masa Berlaku (Otomatis Sistem)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    System-Calculated
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={form.subscription_started_at}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Pilihan Durasi Paket</label>
                    <select
                      value={form.duration_preset}
                      onChange={(e) => handleDurationPresetChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
                    >
                      {DURATION_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                      <option value="custom">Kustom Jumlah Hari...</option>
                    </select>
                  </div>
                </div>

                {form.duration_preset === 'custom' && (
                  <div className="pt-1">
                    <label className="font-bold text-slate-600 block mb-1">Jumlah Hari Durasi</label>
                    <input
                      type="number"
                      min={1}
                      value={form.custom_days}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setForm({ ...form, custom_days: val });
                        handleDurationPresetChange('custom', val);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>
                )}

                {/* Calculated Result Preview */}
                <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                      Tanggal Berakhir Otomatis
                    </div>
                    <div className="font-mono font-bold text-indigo-950 text-sm">
                      {form.subscription_expires_at
                        ? new Date(form.subscription_expires_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Tanpa Batas (Lifetime)'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">
                      Otomatis
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Override Toggle (For Special Cases, Compensation, Promo) */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-amber-700" />
                    <div>
                      <span className="font-bold text-amber-900 block text-xs">
                        Override Manual Super Admin
                      </span>
                      <span className="text-[10px] text-amber-700">
                        Gunakan untuk kasus khusus (Promo, Kompensasi Server, Perpanjangan Gratis)
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_manual_override}
                    onChange={(e) => setForm({ ...form, is_manual_override: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                </label>

                {form.is_manual_override && (
                  <div className="pt-2 border-t border-amber-200 space-y-2 animate-in fade-in duration-200">
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">
                        Override Tanggal Kedaluwarsa Manual
                      </label>
                      <input
                        type="date"
                        value={form.subscription_expires_at}
                        onChange={(e) => setForm({ ...form, subscription_expires_at: e.target.value })}
                        className="w-full px-3 py-2 border border-amber-300 rounded-xl font-mono bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">
                        Alasan / Keterangan Override
                      </label>
                      <input
                        type="text"
                        value={form.override_reason}
                        onChange={(e) => setForm({ ...form, override_reason: e.target.value })}
                        placeholder="Contoh: Promo Launching 1 Bulan / Kompensasi Downtime"
                        className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Internal Administratif</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Keterangan kontrak dinas, nama narahubung PIC, dsb."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Simpan Sekolah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit School */}
      {editSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Masa Berlaku & Lisensi Tenant</h3>
                  <p className="text-xs text-slate-500">Kelola siklus otomatis & override manual untuk {editSchool.name}.</p>
                </div>
              </div>
              <button
                onClick={() => setEditSchool(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              {/* Calculated Lifecycle Preview */}
              {(() => {
                const previewLifecycle = getTenantLifecycleInfo(editSchool);
                return (
                  <div className={`p-4 rounded-2xl border ${previewLifecycle.badgeClass} flex items-center justify-between`}>
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                        Status Otomatis Sistem
                      </div>
                      <div className="font-black text-sm flex items-center gap-1.5">
                        {previewLifecycle.status === 'ACTIVE' && <CheckCircle2 size={14} className="text-emerald-600" />}
                        {previewLifecycle.status === 'EXPIRING_SOON' && <Clock size={14} className="text-amber-600" />}
                        {previewLifecycle.status === 'GRACE_PERIOD' && <Hourglass size={14} className="text-orange-600" />}
                        {previewLifecycle.status === 'SUSPENDED' && <Ban size={14} className="text-rose-600" />}
                        <span>{previewLifecycle.status}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-bold max-w-[210px] leading-snug">
                      {previewLifecycle.description}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Instansi Sekolah</label>
                <input
                  required
                  value={editSchool.name}
                  onChange={(e) => setEditSchool({ ...editSchool, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NPSN</label>
                  <input
                    value={editSchool.npsn || ''}
                    onChange={(e) => setEditSchool({ ...editSchool, npsn: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paket</label>
                  <select
                    value={editSchool.plan}
                    onChange={(e) => setEditSchool({ ...editSchool, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  >
                    <option value="school">Paket Sekolah Institusi (Rp270.000 / 8 Guru + 1 Kepsek / 256 Siswa)</option>
                    <option value="teacher">Paket Guru Mandiri (Rp31.000 / 1 Guru / 32 Siswa)</option>
                    <option value="mulai">Paket Mulai / Gratis (Rp0 / 1 Guru / 32 Siswa)</option>
                  </select>
                </div>
              </div>

              {/* Section: Perpanjangan Cepat Otomatis */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    Perpanjangan Cepat (Otomatis Tambah Durasi)
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">1-Klik Ekstensi</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(30, 'Paket 1 Bulan')}
                    className="py-2 px-2.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 font-bold text-[11px] transition text-slate-700 shadow-2xs cursor-pointer"
                  >
                    +1 Bulan (30 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(180, 'Paket 6 Bulan')}
                    className="py-2 px-2.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 font-bold text-[11px] transition text-slate-700 shadow-2xs cursor-pointer"
                  >
                    +6 Bulan (180 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(365, 'Paket 1 Tahun')}
                    className="py-2 px-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                  >
                    +1 Tahun (365 Hari)
                  </button>
                </div>
              </div>

              {/* Section: Override Manual Super Admin */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Gift size={14} className="text-amber-700" />
                    Override Manual (Promo / Kompensasi / Kasus Khusus)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditSchool({
                        ...editSchool,
                        subscription_expires_at: '',
                        status: 'active',
                      });
                      showToast('Masa berlaku diubah menjadi Tanpa Batas (Lifetime).', 'info');
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Set Lifetime
                  </button>
                </div>

                {/* Quick Promo / Compensation buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-amber-800 font-bold mr-1">Aksi Khusus:</span>
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(14, 'Promo Gratis 14 Hari')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-[10px] font-bold transition cursor-pointer"
                  >
                    🎁 +14 Hari Promo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(30, 'Kompensasi Gangguan 30 Hari')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-[10px] font-bold transition cursor-pointer"
                  >
                    🤝 +30 Hari Kompensasi
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationExtension(7, 'Tenggang Tambahan 7 Hari')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-[10px] font-bold transition cursor-pointer"
                  >
                    ⏳ +7 Hari Ekstra
                  </button>
                </div>

                <div>
                  <label className="font-bold text-amber-900 block mb-1">
                    Tanggal Kedaluwarsa (Direct Edit)
                  </label>
                  <input
                    type="date"
                    value={editSchool.subscription_expires_at ? editSchool.subscription_expires_at.slice(0, 10) : ''}
                    onChange={(e) => setEditSchool({ ...editSchool, subscription_expires_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl font-mono text-slate-800 bg-white"
                  />
                </div>

                {/* Manual Status Override */}
                <div>
                  <label className="font-bold text-amber-900 block mb-1">Status Akses Manual</label>
                  <select
                    value={editSchool.status || 'active'}
                    onChange={(e) => setEditSchool({ ...editSchool, status: e.target.value })}
                    className="w-full px-3.5 py-2 border border-amber-300 rounded-xl bg-white font-bold text-slate-800"
                  >
                    <option value="active">🟢 Active (Diizinkan Operasional)</option>
                    <option value="suspended">🔴 Suspended (Ditangguhkan Manual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Internal / Riwayat</label>
                <textarea
                  value={editSchool.notes || ''}
                  onChange={(e) => setEditSchool({ ...editSchool, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
                  placeholder="Keterangan perpanjangan, kompensasi, atau riwayat promo..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSchool(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Sekolah */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Tenant Sekolah?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-2">
              <p className="font-bold">
                Anda akan menghapus sekolah <span className="underline">{schoolToDelete.name}</span> (NPSN: {schoolToDelete.npsn || '-'}).
              </p>
              <p className="text-rose-700 text-[11px] leading-relaxed">
                Seluruh data akun pengguna, profil sekolah, data siswa, kelas, guru, dan rekaman absensi pada sekolah ini akan dihapus secara permanen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSchoolToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSchool}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Ya, Hapus Sekolah Ini
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

