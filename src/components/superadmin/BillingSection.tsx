import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  QrCode,
  AlertTriangle,
  Ban,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Printer,
  ShieldCheck,
  Building2,
  ExternalLink,
  Phone,
  Mail,
  ArrowUpRight,
  Filter,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { getTenantLifecycleInfo } from '../../utils/tenantLifecycle';

export type BillingSubTab = 'ringkasan' | 'langganan' | 'pembayaran' | 'akan-habis' | 'tidak-aktif';

const subTabs: { id: BillingSubTab; label: string; icon: any; desc: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: CreditCard, desc: 'Metrik pendapatan & status langganan' },
  { id: 'langganan', label: 'Langganan', icon: Sparkles, desc: 'Masa aktif seluruh sekolah' },
  { id: 'pembayaran', label: 'Pembayaran', icon: QrCode, desc: 'Daftar transaksi & invoice' },
  { id: 'akan-habis', label: 'Akan Habis', icon: AlertTriangle, desc: 'Sekolah segera habis masa berlaku' },
  { id: 'tidak-aktif', label: 'Tidak Aktif', icon: Ban, desc: 'Sekolah kedaluwarsa & pemulihan' },
];

export const BillingSection: React.FC<{
  call: any;
  showToast: any;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  onNavigateToSchool?: (schoolId: string) => void;
}> = ({ call, showToast, activeSubTab = 'ringkasan', onSubTabChange, onNavigateToSchool }) => {
  const [currentSubTab, setCurrentSubTab] = useState<BillingSubTab>((activeSubTab as BillingSubTab) || 'ringkasan');
  const [schools, setSchools] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [daysFilter, setDaysFilter] = useState<'3' | '7' | '14' | '30' | 'all'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'subscriptions') setCurrentSubTab('langganan');
      else if (activeSubTab === 'payments') setCurrentSubTab('pembayaran');
      else if (activeSubTab === 'expiring') setCurrentSubTab('akan-habis');
      else if (activeSubTab === 'suspended') setCurrentSubTab('tidak-aktif');
      else setCurrentSubTab(activeSubTab as BillingSubTab);
    }
  }, [activeSubTab]);

  const switchSubTab = (t: BillingSubTab) => {
    setCurrentSubTab(t);
    onSubTabChange?.(t);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSchools, resPayments] = await Promise.all([
        call('list'),
        call('payments').catch(() => ({ payments: [] })),
      ]);
      setSchools(resSchools.schools || []);
      setPayments(resPayments.payments || []);
    } catch (e: any) {
      showToast(e.message || 'Gagal memuat data pembayaran.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickExtend = async (school: any, days: number) => {
    try {
      const currentExpiry = school.subscription_expires_at || new Date().toISOString().slice(0, 10);
      const baseDate = new Date(currentExpiry) > new Date() ? currentExpiry : new Date().toISOString().slice(0, 10);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + days);
      const nextExpiryStr = nextDate.toISOString().slice(0, 10);

      await call('update_school', {
        school_id: school.school_id || school.id,
        name: school.name,
        npsn: school.npsn,
        plan: school.plan,
        subscription_expires_at: nextExpiryStr,
        status: 'active',
      });
      showToast(`Masa aktif ${school.name} diperpanjang +${days} hari hingga ${nextExpiryStr}.`, 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperpanjang masa aktif.', 'error');
    }
  };

  const handleReactivate = async (school: any) => {
    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextExpiryStr = nextDate.toISOString().slice(0, 10);

      await call('update_school', {
        school_id: school.school_id || school.id,
        name: school.name,
        npsn: school.npsn,
        plan: school.plan || 'school',
        status: 'active',
        subscription_expires_at: nextExpiryStr,
      });
      showToast(`Sekolah ${school.name} berhasil diaktifkan kembali (+30 hari).`, 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengaktifkan kembali sekolah.', 'error');
    }
  };

  // Ringkasan Metrics
  const summaryMetrics = useMemo(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    let monthTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;

    payments.forEach((p) => {
      const isThisMonth = (p.createdAt || p.created_at || '').startsWith(currentMonthStr);
      if (p.status === 'paid') {
        paidCount++;
        if (isThisMonth) {
          monthTotal += Number(p.totalAmount || p.total_amount || p.amount || 0);
        }
      } else if (p.status === 'pending' || p.status === 'menunggu_pembayaran') {
        pendingCount++;
      }
    });

    let activeCount = 0;
    let expiringCount = 0;
    let inactiveCount = 0;

    schools.forEach((s) => {
      const lf = getTenantLifecycleInfo(s);
      if (s.status === 'inactive' || lf.isSuspended) {
        inactiveCount++;
      } else if (lf.isExpiringSoon || lf.isGracePeriod) {
        expiringCount++;
        activeCount++;
      } else {
        activeCount++;
      }
    });

    return {
      monthTotal,
      paidCount,
      pendingCount,
      activeCount,
      expiringCount,
      inactiveCount,
    };
  }, [payments, schools]);

  // Sekolah Akan Habis dengan Filter Hari (3, 7, 14, 30 hari)
  const expiringSchools = useMemo(() => {
    return schools
      .map((s) => ({ ...s, lifecycle: getTenantLifecycleInfo(s) }))
      .filter((s) => {
        if (s.lifecycle.daysRemaining === null || s.lifecycle.isSuspended) return false;
        const days = s.lifecycle.daysRemaining;
        if (days === null || days === undefined || days > 30) return false;

        if (daysFilter === '3') return days <= 3;
        if (daysFilter === '7') return days <= 7;
        if (daysFilter === '14') return days <= 14;
        if (daysFilter === '30') return days <= 30;
        return true;
      });
  }, [schools, daysFilter]);

  // Sekolah Tidak Aktif
  const inactiveSchools = useMemo(() => {
    return schools
      .map((s) => ({ ...s, lifecycle: getTenantLifecycleInfo(s) }))
      .filter((s) => s.status === 'inactive' || s.lifecycle.isSuspended);
  }, [schools]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar (5 Tab Utama Sesuai Ketentuan) */}
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

      {/* 1. TAB RINGKASAN */}
      {currentSubTab === 'ringkasan' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Total Pembayaran Bulan Ini</div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                Rp {summaryMetrics.monthTotal.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summaryMetrics.paidCount} transaksi berhasil tercatat
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Pembayaran Belum Selesai</div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {summaryMetrics.pendingCount} Tagihan
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Menunggu transfer / verifikasi
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Status Lisensi Sekolah</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">{summaryMetrics.activeCount} Aktif</span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  {summaryMetrics.inactiveCount} Tidak Aktif
                </span>
              </div>
              <div className="text-[11px] text-amber-700 font-bold mt-1">
                {summaryMetrics.expiringCount} sekolah akan segera habis
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                Sekolah Segera Habis Masa Berlaku
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {expiringSchools.slice(0, 4).map((s) => (
                  <div key={s.id || s.school_id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">
                        Sisa {s.lifecycle?.daysRemaining} hari ({s.subscription_expires_at})
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickExtend(s, 30)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] cursor-pointer"
                    >
                      +30 Hari
                    </button>
                  </div>
                ))}
                {expiringSchools.length === 0 && (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Tidak ada sekolah yang akan habis dalam waktu dekat.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Ban size={16} className="text-rose-600" />
                Sekolah Tidak Aktif / Kedaluwarsa
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {inactiveSchools.slice(0, 4).map((s) => (
                  <div key={s.id || s.school_id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-rose-600 font-semibold">
                        Kedaluwarsa: {s.subscription_expires_at || 'Nonaktif'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleReactivate(s)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] cursor-pointer"
                    >
                      Aktifkan
                    </button>
                  </div>
                ))}
                {inactiveSchools.length === 0 && (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Semua sekolah berstatus aktif.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB LANGGANAN */}
      {currentSubTab === 'langganan' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari langganan sekolah..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="py-3 px-4">Nama Sekolah</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tanggal Mulai</th>
                  <th className="py-3 px-4">Tanggal Berakhir</th>
                  <th className="py-3 px-4">Sisa Waktu</th>
                  <th className="py-3 px-4 text-right">Perpanjang Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools
                  .filter((s) => (s.name || '').toLowerCase().includes(search.toLowerCase()))
                  .map((s) => {
                    const lf = getTenantLifecycleInfo(s);
                    return (
                      <tr key={s.id || s.school_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                            {s.plan === 'teacher' ? 'Guru' : s.plan === 'school' || s.plan === 'sekolah' ? 'Sekolah' : 'Mulai'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === 'active' && !lf.isSuspended
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {s.status === 'active' && !lf.isSuspended ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{s.subscription_started_at || '-'}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{s.subscription_expires_at || 'Seumur Hidup'}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600">
                          {lf.daysRemaining === null ? 'Seumur Hidup' : `${lf.daysRemaining} hari`}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQuickExtend(s, 30)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] cursor-pointer"
                            >
                              +30H
                            </button>
                            <button
                              onClick={() => handleQuickExtend(s, 365)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] cursor-pointer"
                            >
                              +1Th
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB PEMBAYARAN */}
      {currentSubTab === 'pembayaran' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi pembayaran atau invoice..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="py-3 px-4">Sekolah</th>
                  <th className="py-3 px-4">Nomor Transaksi</th>
                  <th className="py-3 px-4">Nominal Tagihan</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Tanggal Transaksi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments
                  .filter(
                    (p) =>
                      (p.schoolName || p.school_name || '').toLowerCase().includes(search.toLowerCase()) ||
                      (p.invoiceNo || p.invoice_no || '').toLowerCase().includes(search.toLowerCase())
                  )
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.schoolName || p.school_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.invoiceNo || p.invoice_no}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        Rp {Number(p.totalAmount || p.total_amount || p.amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.paymentMethod || p.payment_method || 'QRIS'}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.status === 'paid' ? 'Lunas' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(p)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB AKAN HABIS */}
      {currentSubTab === 'akan-habis' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Sekolah Segera Berakhir Masa Langganan</h3>
              <p className="text-xs text-slate-500">Filter berdasarkan rentang sisa hari untuk memantau perpanjangan.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Kelompok:</span>
              {(['all', '3', '7', '14', '30'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDaysFilter(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    daysFilter === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt === 'all' ? 'Semua' : `${opt} Hari`}
                </button>
              ))}
            </div>
          </div>

          {expiringSchools.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada sekolah yang berada dalam rentang masa habis langganan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Nama Sekolah</th>
                    <th className="py-2.5 px-3">NPSN</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3">Masa Berlaku</th>
                    <th className="py-2.5 px-3">Sisa Hari</th>
                    <th className="py-2.5 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiringSchools.map((s) => (
                    <tr key={s.id || s.school_id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.npsn || '-'}</td>
                      <td className="py-2.5 px-3 uppercase text-indigo-700 font-bold">{s.plan}</td>
                      <td className="py-2.5 px-3 text-slate-700">{s.subscription_expires_at}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                          {s.lifecycle.daysRemaining} Hari Lagi
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleQuickExtend(s, 30)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                        >
                          Perpanjang +30 Hari
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

      {/* 5. TAB TIDAK AKTIF */}
      {currentSubTab === 'tidak-aktif' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Sekolah Tidak Aktif / Masa Langganan Berakhir</h3>
            <p className="text-xs text-slate-500">
              Data sekolah tetap aman tersimpan di database. Anda dapat mengaktifkan kembali atau memperpanjang masa aktif kapan saja.
            </p>
          </div>

          {inactiveSchools.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada sekolah yang berstatus tidak aktif.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Nama Sekolah</th>
                    <th className="py-2.5 px-3">NPSN</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3">Tanggal Kedaluwarsa</th>
                    <th className="py-2.5 px-3 text-right">Tindakan Pemulihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inactiveSchools.map((s) => (
                    <tr key={s.id || s.school_id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.npsn || '-'}</td>
                      <td className="py-2.5 px-3 uppercase text-slate-700">{s.plan}</td>
                      <td className="py-2.5 px-3 text-rose-600 font-semibold">{s.subscription_expires_at || 'Dinonaktifkan'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigateToSchool?.(s.id || s.school_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Lihat
                          </button>
                          <button
                            onClick={() => handleReactivate(s)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                          >
                            Aktifkan Kembali
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Invoice Print / View */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Bukti Pembayaran / Invoice</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Invoice:</span>
                <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNo || selectedInvoice.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sekolah:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.schoolName || selectedInvoice.school_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paket Layanan:</span>
                <span className="font-bold text-indigo-700">{selectedInvoice.planName || selectedInvoice.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Pembayaran:</span>
                <span className="font-black text-emerald-800 text-sm">
                  Rp {Number(selectedInvoice.totalAmount || selectedInvoice.total_amount || selectedInvoice.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Pembayaran:</span>
                <span className="font-bold text-emerald-700 uppercase">{selectedInvoice.status}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} />
                <span>Cetak Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
