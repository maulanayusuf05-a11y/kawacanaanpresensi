import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  Shield,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  FileText,
  Activity,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Server
} from 'lucide-react';
import { getTenantLifecycleInfo } from '../../utils/tenantLifecycle';

export const OverviewSection: React.FC<{
  call: any;
  showToast: any;
  onNavigate: (category: 'beranda' | 'sekolah' | 'pembayaran' | 'keamanan' | 'pengaturan', subTab?: string, extraId?: string) => void;
}> = ({ call, showToast, onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, pays, audit, hlth] = await Promise.all([
        call('dashboard'),
        call('payments').catch(() => ({ payments: [] })),
        call('audit', { limit: 10 }).catch(() => ({ logs: [] })),
        call('health').catch(() => null),
      ]);
      setData(dash);
      setPayments(pays?.payments || []);
      setRecentLogs(audit?.logs || []);
      setHealth(hlth);
    } catch (e: any) {
      showToast(e.message || 'Gagal memuat ringkasan data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw size={28} className="animate-spin text-indigo-600 mb-3" />
        <span className="text-xs font-semibold tracking-wide">Memuat data ringkasan platform...</span>
      </div>
    );
  }

  const totals = data?.totals || {};
  const schools = data?.schools || [];

  // Hitung status langganan sekolah
  let activeSchoolsCount = 0;
  let inactiveSchoolsCount = 0;
  let expiringSchoolsCount = 0;

  schools.forEach((s: any) => {
    const lifecycle = getTenantLifecycleInfo(s);
    if (s.status === 'inactive' || lifecycle.isSuspended) {
      inactiveSchoolsCount++;
    } else if (lifecycle.isExpiringSoon || lifecycle.isGracePeriod) {
      expiringSchoolsCount++;
      activeSchoolsCount++;
    } else {
      activeSchoolsCount++;
    }
  });

  // Hitung Pembayaran Bulan Ini & Belum Selesai
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  let thisMonthPaidTotal = 0;
  let pendingPaymentsCount = 0;

  payments.forEach((p: any) => {
    const isThisMonth = (p.createdAt || p.created_at || '').startsWith(currentMonthStr);
    const isSettled = p.status === 'paid' || p.status === 'SETTLED';
    if (isSettled && isThisMonth) {
      thisMonthPaidTotal += Number(p.totalAmount || p.total_amount || p.amount || 0);
    }
    if (p.status === 'pending' || p.status === 'PENDING' || p.status === 'menunggu_pembayaran') {
      pendingPaymentsCount++;
    }
  });

  // Susun Pemberitahuan Penting Dinamis
  const urgentAlerts: Array<{
    type: 'red' | 'yellow';
    title: string;
    description: string;
    actionLabel: string;
    onClick: () => void;
  }> = [];

  if (inactiveSchoolsCount > 0) {
    urgentAlerts.push({
      type: 'red',
      title: `${inactiveSchoolsCount} Sekolah Membutuhkan Aktivasi`,
      description: 'Masa aktif langganan telah berakhir atau status dinonaktifkan.',
      actionLabel: 'Periksa Lisensi',
      onClick: () => onNavigate('pembayaran', 'tidak-aktif'),
    });
  }

  if (expiringSchoolsCount > 0) {
    urgentAlerts.push({
      type: 'yellow',
      title: `${expiringSchoolsCount} Sekolah Segera Kedaluwarsa`,
      description: 'Masa berlaku lisensi akan berakhir dalam waktu dekat (≤ 30 hari).',
      actionLabel: 'Lihat Daftar',
      onClick: () => onNavigate('pembayaran', 'akan-habis'),
    });
  }

  if (pendingPaymentsCount > 0) {
    urgentAlerts.push({
      type: 'yellow',
      title: `${pendingPaymentsCount} Tagihan Menunggu Konfirmasi`,
      description: 'Ada transaksi pembayaran yang belum diselesaikan atau diverifikasi.',
      actionLabel: 'Verifikasi Transaksi',
      onClick: () => onNavigate('pembayaran', 'pembayaran'),
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER EXECUTIVE RINGKAS DENGAN AKSI UTAMA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Ringkasan Operasional Platform</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantauan KPI utama, status multi-tenant, arus pembayaran lisensi, dan log keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigate('sekolah', 'tambah')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Sekolah</span>
          </button>
          <button
            onClick={load}
            disabled={loading}
            title="Segarkan data metrik"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* 2. PEMBERITAHUAN PENTING (Hanya Muncul Jika Ada Item Membutuhkan Tindakan) */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-2.5">
          {urgentAlerts.map((alert, idx) => {
            const isRed = alert.type === 'red';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-all ${
                  isRed
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 text-white ${
                      isRed ? 'bg-rose-600' : 'bg-amber-600'
                    }`}
                  >
                    {isRed ? <AlertCircle size={16} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <div className="text-xs font-black flex items-center gap-2">
                      <span>{alert.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isRed ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {isRed ? 'Perhatian Mendesak' : 'Tindakan Tertunda'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{alert.description}</p>
                  </div>
                </div>

                <button
                  onClick={alert.onClick}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs self-end sm:self-center shrink-0 cursor-pointer ${
                    isRed
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {alert.actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. METRIK UTAMA TERPADU (4 Kartu Eksekutif Bersih) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenant & Status */}
        <div
          onClick={() => onNavigate('sekolah')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tenant Sekolah</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            {schools.length}
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              <CheckCircle2 size={12} /> {activeSchoolsCount} Aktif
            </span>
            {inactiveSchoolsCount > 0 ? (
              <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                {inactiveSchoolsCount} Tidak Aktif
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Semua aktif</span>
            )}
          </div>
        </div>

        {/* Total Siswa & Kelas */}
        <div
          onClick={() => onNavigate('sekolah')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa Terdata</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            {(totals.students || 0).toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 text-xs text-slate-500">
            Terbagi dalam <strong className="text-slate-800 font-bold">{totals.classes || 0}</strong> rombel kelas
          </div>
        </div>

        {/* Guru & Pendidik */}
        <div
          onClick={() => onNavigate('sekolah')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Guru & Pendidik</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UserPlus size={16} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            {(totals.teachers || 0).toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 text-xs text-slate-500">
            Pengguna aktif guru & tenaga pendidik
          </div>
        </div>

        {/* Pembayaran & Lisensi */}
        <div
          onClick={() => onNavigate('pembayaran', 'pembayaran')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pendapatan Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-black text-emerald-700 tracking-tight">
            Rp {thisMonthPaidTotal.toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {pendingPaymentsCount > 0 ? (
                <span className="text-amber-700 font-bold">{pendingPaymentsCount} menunggu konfirmasi</span>
              ) : (
                'Semua tagihan lunas'
              )}
            </span>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-600" />
          </div>
        </div>
      </div>

      {/* 4. DUA KOLOM KOMERSIAL: DIREKTORI SEKOLAH TERBARU & AKTIVITAS AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri (7/12): Direktori Sekolah Cepat */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Direktori Sekolah Terdaftar</h3>
              </div>
              <button
                onClick={() => onNavigate('sekolah')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Kelola Semua ({schools.length})</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {schools.slice(0, 5).map((s: any) => {
                const lf = getTenantLifecycleInfo(s);
                const isInactive = s.status === 'inactive' || lf.isSuspended;
                return (
                  <div
                    key={s.id || s.school_id}
                    onClick={() => onNavigate('sekolah', 'ringkasan', s.school_id || s.id)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                        {s.name?.slice(0, 2)?.toUpperCase() || 'SK'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              !isInactive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {!isInactive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          NPSN: <span className="font-mono text-slate-700">{s.npsn || '-'}</span> •{' '}
                          <span className="uppercase font-semibold text-indigo-600">
                            Paket {s.plan === 'teacher' ? 'Guru' : s.plan === 'school' || s.plan === 'sekolah' ? 'Sekolah' : 'Mulai'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-800">
                        {s.student_count || 0} Siswa
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {lf.daysRemaining !== null ? `${lf.daysRemaining} hari sisa` : 'Seumur hidup'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {schools.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada data sekolah yang terdaftar.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan 5 dari {schools.length} total sekolah</span>
            <button
              onClick={() => onNavigate('pembayaran', 'akan-habis')}
              className="font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              Lihat yang mendekati kedaluwarsa →
            </button>
          </div>
        </div>

        {/* Kolom Kanan (5/12): Aktivitas & Keamanan Real-time */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Aktivitas Sistem Terbaru</h3>
              </div>
              <button
                onClick={() => onNavigate('keamanan', 'aktivitas')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Semua Log</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentLogs.slice(0, 5).map((log, idx) => {
                const actionStr = (log.action || '').toUpperCase();
                let iconColor = 'bg-slate-100 text-slate-600';
                let actionTitle = 'Aktivitas Sistem';

                if (actionStr.includes('CREATE') || actionStr.includes('TAMBAH')) {
                  iconColor = 'bg-emerald-50 text-emerald-600';
                  actionTitle = 'Data Ditambahkan';
                } else if (actionStr.includes('PAYMENT') || actionStr.includes('BAYAR')) {
                  iconColor = 'bg-blue-50 text-blue-600';
                  actionTitle = 'Transaksi Pembayaran';
                } else if (actionStr.includes('UPDATE') || actionStr.includes('EXTEND')) {
                  iconColor = 'bg-indigo-50 text-indigo-600';
                  actionTitle = 'Pembaruan Lisensi';
                } else if (actionStr.includes('DELETE') || actionStr.includes('SUSPEND')) {
                  iconColor = 'bg-rose-50 text-rose-600';
                  actionTitle = 'Penghapusan / Nonaktif';
                }

                return (
                  <div key={log.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${iconColor}`}>
                        <FileText size={13} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {log.school_name || actionTitle}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Oleh {log.actor_name || log.actor_username || 'Admin'} • {log.action || 'Perubahan data'}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono shrink-0">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>
                );
              })}

              {recentLogs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada catatan aktivitas tercatat.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">Audit Forensik Aktif</span>
            </div>
            <button
              onClick={() => onNavigate('pengaturan', 'ekspor')}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Unduh CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
