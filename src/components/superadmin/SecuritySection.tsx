import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  LogIn,
  AlertTriangle,
  Search,
  RefreshCw,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  Filter
} from 'lucide-react';

export type SecuritySubTab = 'aktivitas' | 'riwayat-masuk' | 'kegiatan-penting';

const subTabs: { id: SecuritySubTab; label: string; icon: any; desc: string }[] = [
  { id: 'aktivitas', label: 'Riwayat Aktivitas', icon: Activity, desc: 'Semua rekam jejak audit sistem' },
  { id: 'riwayat-masuk', label: 'Riwayat Masuk', icon: LogIn, desc: 'Catatan login pengguna' },
  { id: 'kegiatan-penting', label: 'Kegiatan Penting', icon: AlertTriangle, desc: 'Perubahan kritis & keamanan' },
];

export const SecuritySection: React.FC<{
  call: any;
  showToast: any;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}> = ({ call, showToast, activeSubTab = 'aktivitas', onSubTabChange }) => {
  const [currentSubTab, setCurrentSubTab] = useState<SecuritySubTab>((activeSubTab as SecuritySubTab) || 'aktivitas');
  const [logs, setLogs] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'audit') setCurrentSubTab('aktivitas');
      else if (activeSubTab === 'sessions') setCurrentSubTab('riwayat-masuk');
      else if (activeSubTab === 'critical') setCurrentSubTab('kegiatan-penting');
      else setCurrentSubTab(activeSubTab as SecuritySubTab);
    }
  }, [activeSubTab]);

  const switchSubTab = (t: SecuritySubTab) => {
    setCurrentSubTab(t);
    onSubTabChange?.(t);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditRes, loginRes] = await Promise.all([
        call('audit', { limit: 100 }),
        call('login_history', { limit: 100 }).catch(() => ({ history: [] })),
      ]);
      setLogs(auditRes.logs || []);
      setLoginHistory(loginRes.history || []);
    } catch (e: any) {
      showToast(e.message || 'Gagal memuat log keamanan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Kegiatan Penting (Perubahan status, pembuatan sekolah, pembayaran, perubahan pengaturan)
  const criticalLogs = logs.filter((l) => {
    const act = (l.action || '').toUpperCase();
    return (
      act.includes('CREATE_SCHOOL') ||
      act.includes('UPDATE_SCHOOL') ||
      act.includes('DELETE') ||
      act.includes('SUSPEND') ||
      act.includes('PAYMENT') ||
      act.includes('ROLE') ||
      act.includes('PASSWORD') ||
      act.includes('SETTING')
    );
  });

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar (3 Tab Sesuai Ketentuan) */}
      <div className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {subTabs.map((st) => {
            const isActive = currentSubTab === st.id;
            const Icon = st.icon;
            return (
              <button
                key={st.id}
                onClick={() => switchSubTab(st.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={18} />
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

      {/* Pencarian dan Refresh */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama pengguna, sekolah, atau tindakan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
          />
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          title="Perbarui Data"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Konten 3 Tab */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-semibold">Memuat data keamanan...</span>
          </div>
        ) : (
          <>
            {/* 1. TAB RIWAYAT AKTIVITAS */}
            {currentSubTab === 'aktivitas' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">Pengguna (Pelaku)</th>
                      <th className="py-3 px-4">Sekolah Terkait</th>
                      <th className="py-3 px-4">Tindakan</th>
                      <th className="py-3 px-4">Keterangan / Rincian</th>
                      <th className="py-3 px-4 text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs
                      .filter(
                        (l) =>
                          (l.actor_name || l.actor_username || '').toLowerCase().includes(search.toLowerCase()) ||
                          (l.school_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (l.action || '').toLowerCase().includes(search.toLowerCase())
                      )
                      .map((log, i) => (
                        <tr key={log.id || i} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {log.actor_name || log.actor_username || 'Super Admin'}
                          </td>
                          <td className="py-3 px-4 text-indigo-700 font-semibold">
                            {log.school_name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. TAB RIWAYAT MASUK */}
            {currentSubTab === 'riwayat-masuk' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">Nama Pengguna</th>
                      <th className="py-3 px-4">Sekolah</th>
                      <th className="py-3 px-4">Peran (Role)</th>
                      <th className="py-3 px-4">Waktu Masuk</th>
                      <th className="py-3 px-4">Perangkat / IP</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loginHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada catatan riwayat masuk terpisah. Riwayat sesi aktif tercatat di log audit.
                        </td>
                      </tr>
                    ) : (
                      loginHistory
                        .filter((lh) => (lh.user_name || '').toLowerCase().includes(search.toLowerCase()))
                        .map((lh, i) => (
                          <tr key={lh.id || i} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-bold text-slate-900">{lh.user_name || lh.username}</td>
                            <td className="py-3 px-4 text-slate-700">{lh.school_name || '-'}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                {lh.role || 'ADMIN'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {lh.created_at ? new Date(lh.created_at).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                              {lh.ip_address || lh.user_agent || 'Browser Web'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  lh.status !== 'failed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {lh.status !== 'failed' ? 'Berhasil' : 'Gagal'}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. TAB KEGIATAN PENTING */}
            {currentSubTab === 'kegiatan-penting' && (
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Perubahan Kritis & Administrasi</h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan peristiwa penting seperti penambahan sekolah, pembayaran, perpanjangan, atau perubahan sistem.
                  </p>
                </div>

                {criticalLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada peristiwa penting yang tercatat.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {criticalLogs.map((cl, i) => (
                      <div key={cl.id || i} className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 mt-0.5">
                            <AlertTriangle size={15} />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-2">
                              <span>{cl.action}</span>
                              {cl.school_name && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                  {cl.school_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Dilakukan oleh: <strong className="text-slate-800">{cl.actor_name || 'Super Admin'}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                          {cl.created_at ? new Date(cl.created_at).toLocaleString('id-ID') : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
