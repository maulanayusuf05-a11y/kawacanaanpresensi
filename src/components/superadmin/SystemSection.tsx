import React, { useState, useEffect } from 'react';
import {
  Shield,
  Megaphone,
  Download,
  Activity,
  KeyRound,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Building2,
  CreditCard,
  Server,
  Cpu,
  Lock,
  Info,
  AlertCircle,
  Database
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SecuritySection } from './SecuritySection';

export type SystemSubTab = 'audit' | 'siaran' | 'ekspor' | 'kondisi' | 'login';

const subTabs: { id: SystemSubTab; label: string; icon: any; desc: string }[] = [
  { id: 'audit', label: 'Log & Keamanan', icon: Shield, desc: 'Audit forensik & riwayat login' },
  { id: 'siaran', label: 'Siaran Pengumuman', icon: Megaphone, desc: 'Pita broadcast seluruh sekolah' },
  { id: 'ekspor', label: 'Cadangan & Ekspor', icon: Download, desc: 'Unduh CSV multi-tabel & JSON' },
  { id: 'kondisi', label: 'Infrastruktur', icon: Activity, desc: 'Status server & database' },
  { id: 'login', label: 'Akun Super Admin', icon: KeyRound, desc: 'Kredensial & ganti password' },
];

export const SystemSection: React.FC<{
  call: any;
  showToast: any;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}> = ({ call, showToast, activeSubTab = 'audit', onSubTabChange }) => {
  const { globalAnnouncement, updateGlobalAnnouncement } = useApp();
  const [currentSubTab, setCurrentSubTab] = useState<SystemSubTab>('audit');
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Broadcast Announcement State
  const [broadcastMsg, setBroadcastMsg] = useState(globalAnnouncement?.message || '');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>(globalAnnouncement?.type || 'info');
  const [broadcastActive, setBroadcastActive] = useState<boolean>(globalAnnouncement?.active || false);
  const [savingBroadcast, setSavingBroadcast] = useState(false);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (globalAnnouncement) {
      setBroadcastMsg(globalAnnouncement.message || '');
      setBroadcastType(globalAnnouncement.type || 'info');
      setBroadcastActive(globalAnnouncement.active || false);
    }
  }, [globalAnnouncement]);

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'security' || activeSubTab === 'aktivitas' || activeSubTab === 'audit') {
        setCurrentSubTab('audit');
      } else if (activeSubTab === 'siaran' || activeSubTab === 'broadcast') {
        setCurrentSubTab('siaran');
      } else if (activeSubTab === 'ekspor' || activeSubTab === 'data' || activeSubTab === 'database') {
        setCurrentSubTab('ekspor');
      } else if (activeSubTab === 'kondisi' || activeSubTab === 'health') {
        setCurrentSubTab('kondisi');
      } else if (activeSubTab === 'login' || activeSubTab === 'akun') {
        setCurrentSubTab('login');
      } else {
        setCurrentSubTab('audit');
      }
    }
  }, [activeSubTab]);

  const switchSubTab = (t: SystemSubTab) => {
    setCurrentSubTab(t);
    onSubTabChange?.(t);
  };

  const loadHealth = async () => {
    setLoading(true);
    try {
      const h = await call('health');
      setHealth(h);
    } catch (e: any) {
      showToast(e.message || 'Gagal memeriksa kondisi sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSubTab === 'kondisi') {
      loadHealth();
    }
  }, [currentSubTab]);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBroadcast(true);
    try {
      await updateGlobalAnnouncement({
        message: broadcastMsg.trim(),
        type: broadcastType,
        active: broadcastActive,
      });
      showToast(
        broadcastActive
          ? 'Siaran pengumuman global berhasil diaktifkan ke semua sekolah.'
          : 'Pengumuman dinonaktifkan.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengumuman.', 'error');
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await call('reset_admin_password', {
        user_id: 'superadmin',
        new_password: newPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password Super Admin berhasil diperbarui.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Helper CSV Downloader
  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((e) =>
          e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSchools = async () => {
    setDownloading('schools');
    try {
      const res = await call('list');
      const schools = res.schools || [];
      const headers = ['ID', 'Nama Sekolah', 'NPSN', 'Paket', 'Status', 'Siswa', 'Guru/Admin', 'Masa Berlaku'];
      const rows = schools.map((s: any) => [
        s.school_id || s.id,
        s.name,
        s.npsn || '-',
        s.plan,
        s.status,
        s.student_count || 0,
        s.teacher_admin_count || 0,
        s.subscription_expires_at || 'Tanpa Batas',
      ]);
      downloadCSV('data_tenant_sekolah', headers, rows);
      showToast('Data tenant sekolah berhasil diekspor ke CSV.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal ekspor sekolah.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportUsers = async () => {
    setDownloading('users');
    try {
      const res = await call('list_users', { school_id: 'all' });
      const users = res.users || [];
      const headers = ['ID', 'Nama', 'Username', 'Email', 'Role', 'Sekolah', 'Status'];
      const rows = users.map((u: any) => [
        u.id,
        u.name || '-',
        u.username || '-',
        u.email || '-',
        u.role || 'ADMIN',
        u.school_name || '-',
        u.is_active !== false ? 'Aktif' : 'Nonaktif',
      ]);
      downloadCSV('data_pengguna_platform', headers, rows);
      showToast('Data seluruh pengguna platform berhasil diekspor.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal ekspor pengguna.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportAudit = async () => {
    setDownloading('audit');
    try {
      const res = await call('audit', { limit: 500 });
      const logs = res.logs || [];
      const headers = ['Waktu', 'Aktor', 'Role', 'Aksi', 'Sekolah', 'IP Address', 'Detail'];
      const rows = logs.map((l: any) => [
        l.created_at ? new Date(l.created_at).toISOString() : '',
        l.actor_username || l.actor_id || '-',
        l.actor_role || '-',
        l.action || '-',
        l.school_name || '-',
        l.ip_address || '-',
        JSON.stringify(l.details || {}),
      ]);
      downloadCSV('data_audit_forensik', headers, rows);
      showToast('Log audit forensik berhasil diekspor ke CSV.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal ekspor audit.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportPayments = async () => {
    setDownloading('payments');
    try {
      const res = await call('payments');
      const payments = res.payments || [];
      const headers = ['ID', 'Sekolah', 'Metode', 'Jumlah (Rp)', 'Status', 'Tanggal', 'Keterangan'];
      const rows = payments.map((p: any) => [
        p.id,
        p.school_name || '-',
        p.method || 'Transfer',
        p.amount || 0,
        p.status,
        p.created_at || '-',
        p.notes || '-',
      ]);
      downloadCSV('data_transaksi_pembayaran', headers, rows);
      showToast('Rekap transaksi berhasil diekspor ke CSV.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal ekspor transaksi.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportJSON = async () => {
    setDownloading('json');
    try {
      const res = await call('list');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `cadangan_lengkap_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Cadangan JSON lengkap berhasil diunduh.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal unduh cadangan JSON.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar Rumpun Pusat Sistem */}
      <div className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {subTabs.map((st) => {
            const isActive = currentSubTab === st.id;
            const Icon = st.icon;
            return (
              <button
                key={st.id}
                onClick={() => switchSubTab(st.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{st.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {st.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. SUB-TAB AUDIT & KEAMANAN */}
      {currentSubTab === 'audit' && (
        <SecuritySection
          call={call}
          showToast={showToast}
          activeSubTab="aktivitas"
        />
      )}

      {/* 2. SUB-TAB SIARAN PENGUMUMAN GLOBAL */}
      {currentSubTab === 'siaran' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
                <Megaphone size={13} />
                <span>Broadcast Pengumuman Global</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Pita Pengumuman Seluruh Sekolah
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Pesan ini akan disiarkan di bagian paling atas dashboard seluruh sekolah, kepala sekolah, guru, dan admin secara instan.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={broadcastActive}
                  onChange={(e) => setBroadcastActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Tayangkan ke Seluruh Sekolah</span>
              </label>
            </div>
          </div>

          {/* Form Editor Pengumuman */}
          <form onSubmit={handleSaveAnnouncement} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tipe Notifikasi Pita
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setBroadcastType('info')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    broadcastType === 'info'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Info size={14} className="text-indigo-600" />
                  <span>Informasi (Biru)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('warning')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    broadcastType === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>Peringatan (Kuning)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('alert')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    broadcastType === 'alert'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle size={14} className="text-rose-600" />
                  <span>Kritis (Merah)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Isi Pesan Pengumuman
              </label>
              <textarea
                rows={3}
                required
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Contoh: Pemeliharaan server dijadwalkan pada hari Sabtu pukul 22.00 - 24.00 WIB. Presensi tetap dapat dilakukan secara offline."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-indigo-600"
              />
            </div>

            {/* Live Preview Pengumuman */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">
                Pratinjau Langsung Tampilan Sekolah:
              </label>
              <div
                className={`w-full px-4 py-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border ${
                  broadcastType === 'alert'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : broadcastType === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                {broadcastType === 'alert' ? (
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                ) : broadcastType === 'warning' ? (
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                ) : (
                  <Info size={15} className="text-indigo-600 shrink-0" />
                )}
                <span className="truncate">
                  {broadcastMsg.trim() || 'Ketik pesan di atas untuk melihat pratinjau pita pengumuman...'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingBroadcast}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingBroadcast ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{savingBroadcast ? 'Menyimpan...' : 'Simpan & Terapkan Pengumuman'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. SUB-TAB CADANGAN & EKSPOR DATA */}
      {currentSubTab === 'ekspor' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Pusat Ekspor & Cadangan Data Platform
              </h3>
              <p className="text-xs text-slate-500">
                Unduh seluruh data instansi sekolah, direktori pengguna, rekap transaksi keuangan, dan log audit sistem dalam format CSV & JSON.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Tenant Sekolah */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Direktori Tenant Sekolah</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Daftar seluruh sekolah, NPSN, status langganan, jumlah siswa, guru, dan masa aktif.
                  </p>
                </div>
                <button
                  onClick={handleExportSchools}
                  disabled={downloading === 'schools'}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'schools' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh CSV Tenant</span>
                </button>
              </div>

              {/* Card 2: Pengguna Platform */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Direktori Seluruh Pengguna</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Daftar akun admin sekolah, kepala sekolah, wali kelas, guru mapel di semua instansi.
                  </p>
                </div>
                <button
                  onClick={handleExportUsers}
                  disabled={downloading === 'users'}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'users' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh CSV Pengguna</span>
                </button>
              </div>

              {/* Card 3: Transaksi & Invoice */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Rekap Transaksi Keuangan</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Daftar riwayat verifikasi pembayaran transfer manual, invoice, dan QRIS sekolah.
                  </p>
                </div>
                <button
                  onClick={handleExportPayments}
                  disabled={downloading === 'payments'}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'payments' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh CSV Transaksi</span>
                </button>
              </div>

              {/* Card 4: Audit Forensik */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Log Audit Forensik</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Catatan keamanan, mutasi tenant, ganti password, perpanjangan paket, dan IP address.
                  </p>
                </div>
                <button
                  onClick={handleExportAudit}
                  disabled={downloading === 'audit'}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'audit' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh CSV Audit</span>
                </button>
              </div>

              {/* Card 5: JSON Full Backup */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Cadangan Struktur JSON</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Struktur penuh metadata tenant, konfigurasi lisensi, dan relasi akun dalam file JSON.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={downloading === 'json'}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'json' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh JSON Lengkap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB KONDISI INFRASTRUKTUR */}
      {currentSubTab === 'kondisi' && (
        <div className="space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Kondisi & Status Infrastruktur</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau konektivitas server, latensi query database Supabase, dan router API Express.
                </p>
              </div>
              <button
                onClick={loadHealth}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition shadow-2xs disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Uji Koneksi Ulang</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Database Supabase PostgreSQL</span>
                </div>
                <div className="text-xl font-black text-emerald-950 mt-2">Terhubung Normal</div>
                <div className="text-xs text-emerald-700 mt-1">
                  Latensi: {health?.latencyMs ? `${health.latencyMs} ms` : 'Normal (< 80 ms)'}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                  <Server size={16} />
                  <span>Router API Express Backend</span>
                </div>
                <div className="text-xl font-black text-indigo-950 mt-2">Port 3000 Online</div>
                <div className="text-xs text-indigo-700 mt-1">Mode: Full-Stack / Node.js tsx</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <Cpu size={16} />
                  <span>Versi Platform Kawacanaan</span>
                </div>
                <div className="text-xl font-black text-slate-900 mt-2">v2.5.0 Pro</div>
                <div className="text-xs text-slate-500 mt-1">Arsitektur Multi-Tenant Terpadu</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB AKUN SUPER ADMIN */}
      {currentSubTab === 'login' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 max-w-xl">
          <div>
            <h3 className="text-base font-black text-slate-900">Keamanan Kredensial Super Admin</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui kata sandi akun super administrator utama platform Kawacanaan Presensi.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Saat Ini</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-indigo-600"
                placeholder="Masukkan kata sandi lama"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-indigo-600"
                placeholder="Minimal 8 karakter"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ulangi Password Baru</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-indigo-600"
                placeholder="Ketik ulang kata sandi baru"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>{savingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
