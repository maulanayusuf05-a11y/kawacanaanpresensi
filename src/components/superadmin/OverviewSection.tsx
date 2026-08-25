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
  RotateCcw,
  Check
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
  const [recovering, setRecovering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, pays, audit, hlth] = await Promise.all([
        call('dashboard'),
        call('payments').catch(() => ({ payments: [] })),
        call('audit', { limit: 12 }).catch(() => ({ logs: [] })),
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mb-3" />
        <span className="text-sm font-semibold">Memuat ringkasan beranda...</span>
      </div>
    );
  }

  const totals = data?.totals || {};
  const schools = data?.schools || [];

  // Hitung status langganan sekolah
  let activeSchoolsCount = 0;
  let inactiveSchoolsCount = 0;
  let expiringSchoolsCount = 0;

  const schoolLifecycleList = schools.map((s: any) => {
    const lifecycle = getTenantLifecycleInfo(s);
    if (s.status === 'inactive' || lifecycle.isSuspended) {
      inactiveSchoolsCount++;
    } else if (lifecycle.isExpiringSoon || lifecycle.isGracePeriod) {
      expiringSchoolsCount++;
      activeSchoolsCount++;
    } else {
      activeSchoolsCount++;
    }
    return { ...s, lifecycle };
  });

  // Hitung Pembayaran Bulan Ini & Belum Selesai
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  let thisMonthPaidTotal = 0;
  let pendingPaymentsCount = 0;

  payments.forEach((p: any) => {
    const isThisMonth = (p.createdAt || '').startsWith(currentMonthStr);
    if (p.status === 'paid' && isThisMonth) {
      thisMonthPaidTotal += Number(p.totalAmount || p.amount || 0);
    }
    if (p.status === 'pending' || p.status === 'menunggu_pembayaran') {
      pendingPaymentsCount++;
    }
  });

  // Susun Pemberitahuan Penting (Merah, Kuning, Hijau)
  const notifications: Array<{
    type: 'red' | 'yellow' | 'green';
    title: string;
    description: string;
    actionLabel?: string;
    onClick?: () => void;
  }> = [];

  // Peringatan Merah
  if (inactiveSchoolsCount > 0) {
    notifications.push({
      type: 'red',
      title: `${inactiveSchoolsCount} Sekolah Tidak Aktif / Kedaluwarsa`,
      description: 'Terdapat sekolah dengan status dinonaktifkan atau masa aktif langganan telah habis.',
      actionLabel: 'Lihat Sekolah Tidak Aktif',
      onClick: () => onNavigate('pembayaran', 'tidak-aktif'),
    });
  }

  // Peringatan Kuning
  if (expiringSchoolsCount > 0) {
    notifications.push({
      type: 'yellow',
      title: `${expiringSchoolsCount} Sekolah Akan Segera Habis Masa Langganan`,
      description: 'Masa aktif sekolah akan berakhir dalam waktu dekat. Periksa dan ingatkan perpanjangan.',
      actionLabel: 'Lihat Sekolah Akan Habis',
      onClick: () => onNavigate('pembayaran', 'akan-habis'),
    });
  }

  if (pendingPaymentsCount > 0) {
    notifications.push({
      type: 'yellow',
      title: `${pendingPaymentsCount} Transaksi Pembayaran Belum Selesai`,
      description: 'Terdapat tagihan pembayaran yang masih menunggu verifikasi atau penyelesaian.',
      actionLabel: 'Periksa Pembayaran',
      onClick: () => onNavigate('pembayaran', 'pembayaran'),
    });
  }

  // Indikator Hijau
  notifications.push({
    type: 'green',
    title: 'Sistem dan Database Berjalan Normal',
    description: `Layanan Supabase, server API, dan presensi aktif (${health?.latencyMs ? `${health.latencyMs} ms` : 'Latensi normal'}).`,
    actionLabel: 'Kondisi Sistem',
    onClick: () => onNavigate('pengaturan', 'kondisi'),
  });

  return (
    <div className="space-y-6">
      {/* 1. RINGKASAN UTAMA (8 Metrik Kunci) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            Ringkasan Utama
          </h2>
          <button
            onClick={load}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Perbarui Data</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Jumlah Seluruh Sekolah */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Jumlah Seluruh Sekolah</span>
              <Building2 size={16} className="text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{schools.length}</div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <span className="font-semibold text-slate-700">{activeSchoolsCount}</span> sekolah sedang aktif
            </div>
          </div>

          {/* Sekolah Aktif */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Sekolah Aktif</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{activeSchoolsCount}</div>
            <div className="mt-2 text-[11px] text-emerald-700 font-medium">
              Layanan berjalan normal
            </div>
          </div>

          {/* Sekolah Tidak Aktif */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Sekolah Tidak Aktif</span>
              <AlertCircle size={16} className="text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-700">{inactiveSchoolsCount}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              {inactiveSchoolsCount > 0 ? 'Perlu perpanjangan lisensi' : 'Semua sekolah aktif'}
            </div>
          </div>

          {/* Sekolah Akan Habis */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Akan Habis Masa Berlaku</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700">{expiringSchoolsCount}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              {expiringSchoolsCount > 0 ? 'Dalam 30 hari ke depan' : 'Tidak ada yang segera habis'}
            </div>
          </div>

          {/* Jumlah Seluruh Siswa */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Jumlah Seluruh Siswa</span>
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totals.students || 0}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              Terdaftar di {totals.classes || 0} rombel kelas
            </div>
          </div>

          {/* Jumlah Seluruh Guru */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Jumlah Seluruh Guru</span>
              <Users size={16} className="text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totals.teachers || 0}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              Admin & Tenaga Pendidik
            </div>
          </div>

          {/* Pembayaran Bulan Ini */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Pembayaran Bulan Ini</span>
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <div className="mt-2 text-xl font-black text-emerald-800">
              Rp {thisMonthPaidTotal.toLocaleString('id-ID')}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Transaksi berhasil bulan ini
            </div>
          </div>

          {/* Pembayaran Belum Selesai */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Pembayaran Belum Selesai</span>
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700">{pendingPaymentsCount}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              Menunggu konfirmasi pembayaran
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOMBOL CEPAT */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600" />
          Tombol Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() => onNavigate('sekolah', 'tambah')}
            className="p-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Plus size={16} />
            </div>
            <div className="text-xs font-black text-indigo-950">Tambah Sekolah</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Daftarkan sekolah baru</div>
          </button>

          <button
            onClick={() => onNavigate('sekolah')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Building2 size={16} />
            </div>
            <div className="text-xs font-black text-slate-900">Lihat Sekolah</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Daftar semua sekolah</div>
          </button>

          <button
            onClick={() => onNavigate('pembayaran', 'pembayaran')}
            className="p-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <CreditCard size={16} />
            </div>
            <div className="text-xs font-black text-emerald-950">Lihat Pembayaran</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Transaksi & bukti bayar</div>
          </button>

          <button
            onClick={() => onNavigate('pembayaran', 'akan-habis')}
            className="p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
            <div className="text-xs font-black text-amber-950">Lihat Sekolah Akan Habis</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pengingat langganan</div>
          </button>

          <button
            onClick={() => onNavigate('keamanan')}
            className="p-3 rounded-xl bg-purple-50/80 hover:bg-purple-100 border border-purple-200/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Shield size={16} />
            </div>
            <div className="text-xs font-black text-purple-950">Lihat Keamanan</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Riwayat aktivitas & masuk</div>
          </button>
        </div>
      </div>

      {/* 3. PEMBERITAHUAN PENTING (Merah, Kuning, Hijau) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Pemberitahuan Penting
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Merah: Segera Diperiksa • Kuning: Perhatian • Hijau: Aman
          </span>
        </h3>

        <div className="space-y-2.5">
          {notifications.map((notif, idx) => {
            const isRed = notif.type === 'red';
            const isYellow = notif.type === 'yellow';
            const isGreen = notif.type === 'green';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isRed
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                    : isYellow
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 text-white ${
                      isRed ? 'bg-rose-600' : isYellow ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  >
                    {isRed ? <AlertCircle size={16} /> : isYellow ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold flex items-center gap-2">
                      <span>{notif.title}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isRed
                            ? 'bg-rose-200 text-rose-900'
                            : isYellow
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {isRed ? 'Segera Periksa' : isYellow ? 'Perhatian' : 'Aman'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{notif.description}</p>
                  </div>
                </div>

                {notif.actionLabel && (
                  <button
                    onClick={notif.onClick}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all self-end sm:self-center flex-shrink-0 cursor-pointer ${
                      isRed
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        : isYellow
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {notif.actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. AKTIVITAS TERBARU */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            Aktivitas Terbaru
          </h3>
          <button
            onClick={() => onNavigate('keamanan', 'aktivitas')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            Lihat Semua Aktivitas <ArrowRight size={12} />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada rekam jejak aktivitas terbaru.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.slice(0, 6).map((log, i) => {
              const actionStr = (log.action || '').toUpperCase();
              let icon = <FileText size={14} className="text-slate-500" />;
              let label = 'Aktivitas Sistem';

              if (actionStr.includes('CREATE_SCHOOL')) {
                icon = <Building2 size={14} className="text-indigo-600" />;
                label = 'Sekolah Baru Ditambahkan';
              } else if (actionStr.includes('PAYMENT') || actionStr.includes('BAYAR')) {
                icon = <CreditCard size={14} className="text-emerald-600" />;
                label = 'Pembayaran Diterima';
              } else if (actionStr.includes('EXTEND') || actionStr.includes('UPDATE_SCHOOL')) {
                icon = <Clock size={14} className="text-blue-600" />;
                label = 'Langganan Diperbarui';
              } else if (actionStr.includes('TOGGLE') || actionStr.includes('SUSPEND') || actionStr.includes('DELETE')) {
                icon = <AlertTriangle size={14} className="text-rose-600" />;
                label = 'Perubahan Status Sekolah';
              } else if (actionStr.includes('USER') || actionStr.includes('ADMIN')) {
                icon = <UserPlus size={14} className="text-purple-600" />;
                label = 'Pengguna Dikelola';
              }

              const timeStr = log.created_at
                ? new Date(log.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-';

              return (
                <div key={log.id || i} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex-shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate flex items-center gap-2">
                        <span>{label}</span>
                        {log.school_name && (
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            {log.school_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Oleh: <strong className="text-slate-700">{log.actor_name || log.actor_username || 'Super Admin'}</strong>
                        {log.details?.name ? ` • "${log.details.name}"` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {timeStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
