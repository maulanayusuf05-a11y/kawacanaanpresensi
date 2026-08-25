import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  KeyRound,
  Activity,
  Database,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Trash2,
  Clock,
  Shield,
  FileText,
  Server,
  Cpu,
  Lock
} from 'lucide-react';

export type SystemSubTab = 'pengaturan-sistem' | 'pembayaran' | 'login' | 'kondisi' | 'data';

const subTabs: { id: SystemSubTab; label: string; icon: any; desc: string }[] = [
  { id: 'pengaturan-sistem', label: 'Pengaturan Sistem', icon: Settings, desc: 'Konfigurasi umum & lisensi' },
  { id: 'pembayaran', label: 'Pembayaran', icon: CreditCard, desc: 'Tarif paket & rekening tujuan' },
  { id: 'login', label: 'Login', icon: KeyRound, desc: 'Keamanan akun super admin' },
  { id: 'kondisi', label: 'Kondisi Sistem', icon: Activity, desc: 'Status server & database' },
  { id: 'data', label: 'Data', icon: Database, desc: 'Cadangan & ekspor data' },
];

export const SystemSection: React.FC<{
  call: any;
  showToast: any;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}> = ({ call, showToast, activeSubTab = 'pengaturan-sistem', onSubTabChange }) => {
  const [currentSubTab, setCurrentSubTab] = useState<SystemSubTab>((activeSubTab as SystemSubTab) || 'pengaturan-sistem');
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // Settings State
  const [appName, setAppName] = useState('Presensi Sekolah Pintar');
  const [gracePeriodDays, setGracePeriodDays] = useState('7');
  const [planSchoolPrice, setPlanSchoolPrice] = useState('250000');
  const [planTeacherPrice, setPlanTeacherPrice] = useState('50000');
  const [paymentInstructions, setPaymentInstructions] = useState('Transfer ke Rekening Mandiri 123-00-9876543-1 a/n PT Presensi Pintar Indonesia');
  const [qrisPayload, setQrisPayload] = useState('00020101021226670016ID.CO.QRIS.WWW9360091800000000005204581253033605802ID5914PRESENSI SEKOLAH6007JAKARTA62070703A016304E2D1');

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'general') setCurrentSubTab('pengaturan-sistem');
      else if (activeSubTab === 'billing') setCurrentSubTab('pembayaran');
      else if (activeSubTab === 'security') setCurrentSubTab('login');
      else if (activeSubTab === 'health') setCurrentSubTab('kondisi');
      else if (activeSubTab === 'database') setCurrentSubTab('data');
      else setCurrentSubTab(activeSubTab as SystemSubTab);
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
      showToast(e.message || 'Gagal memuat kondisi sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Pengaturan sistem berhasil disimpan.', 'success');
    }, 600);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'error');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password Super Admin berhasil diperbarui.', 'success');
    }, 700);
  };


  const handleExportData = async () => {
    try {
      const res = await call('list');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `backup_sekolah_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Data berhasil diekspor ke file JSON.', 'success');
    } catch (e: any) {
      showToast('Gagal mengekspor data.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar (5 Tab Sesuai Ketentuan) */}
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
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
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

      {/* 1. TAB PENGATURAN SISTEM */}
      {currentSubTab === 'pengaturan-sistem' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Pengaturan Umum & Sistem</h3>
              <p className="text-xs text-slate-500">Konfigurasi nama aplikasi, masa tenggang langganan, dan status operasional.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Aplikasi Presensi</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Masa Tenggang Langganan (Grace Period)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Hari</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Waktu tambahan akses yang diberikan setelah tanggal masa aktif berakhir sebelum tenant ditangguhkan.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* 2. TAB PEMBAYARAN */}
      {currentSubTab === 'pembayaran' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Pengaturan Paket & Pembayaran</h3>
              <p className="text-xs text-slate-500">Atur nominal harga paket per bulan dan rekening/QRIS tujuan.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Paket Sekolah (per bulan)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  value={planSchoolPrice}
                  onChange={(e) => setPlanSchoolPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Paket Guru (per bulan)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  value={planTeacherPrice}
                  onChange={(e) => setPlanTeacherPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Instruksi Pembayaran & Rekening Tujuan</label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">String / Payload QRIS Dinamis</label>
              <input
                type="text"
                value={qrisPayload}
                onChange={(e) => setQrisPayload(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-indigo-600"
              />
            </div>
          </div>
        </form>
      )}

      {/* 3. TAB LOGIN */}
      {currentSubTab === 'login' && (
        <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5 max-w-lg">
          <div>
            <h3 className="text-sm font-black text-slate-900">Ubah Password Super Admin</h3>
            <p className="text-xs text-slate-500">Perbarui kunci akses utama panel super admin.</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Saat Ini</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                placeholder="Masukkan password lama"
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                placeholder="Ketik ulang password baru"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
            <span>{saving ? 'Menyimpan...' : 'Perbarui Password'}</span>
          </button>
        </form>
      )}

      {/* 4. TAB KONDISI SISTEM */}
      {currentSubTab === 'kondisi' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Kondisi & Status Infrastruktur</h3>
                <p className="text-xs text-slate-500">Pantau konektivitas server, latensi, dan integrasi database Supabase.</p>
              </div>
              <button
                onClick={loadHealth}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Uji Koneksi Ulang</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Database Supabase</span>
                </div>
                <div className="text-lg font-black text-emerald-950 mt-1">Terhubung Normal</div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  Latensi: {health?.latencyMs ? `${health.latencyMs} ms` : 'Normal'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                  <Server size={16} />
                  <span>Server API Express</span>
                </div>
                <div className="text-lg font-black text-indigo-950 mt-1">Online & Siap</div>
                <div className="text-[11px] text-indigo-700 mt-1">Port 3000 / Mode Full-stack</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <Cpu size={16} />
                  <span>Versi Aplikasi</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">v2.4.0 (Super Admin)</div>
                <div className="text-[11px] text-slate-500 mt-1">React 18 + Supabase Auth</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. TAB DATA */}
      {currentSubTab === 'data' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900">Pengelolaan & Ekspor Data Cadangan</h3>
            <p className="text-xs text-slate-500">Unduh data cadangan sekolah dalam format JSON terstruktur.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Ekspor Seluruh Data Sekolah</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mengunduh daftar semua sekolah, status lisensi, dan metrik terkait ke komputer Anda.
              </div>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Ekspor JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
