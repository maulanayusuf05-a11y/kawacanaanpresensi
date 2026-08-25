import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Eye,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Sparkles,
  Receipt,
  Printer,
  ShieldCheck,
  Building2,
  Trash2,
  X
} from 'lucide-react';
import { PaymentTransaction, QrisPaymentModal } from '../payment/QrisPaymentModal';

// Initial Mock Transactions for Super Admin Overview
const INITIAL_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'trx-101',
    invoiceNo: 'INV/202608/QRIS/829101',
    planId: 'school',
    planName: 'Paket Sekolah (8 Guru + 1 Kepsek)',
    amount: 270000,
    uniqueCode: 182,
    totalAmount: 270182,
    schoolName: 'SD Negeri Cideng 07 Pagi',
    npsn: '20108802',
    contactName: 'Dra. Hj. Siti Rahmawati, M.Pd',
    contactPhone: '081288991122',
    email: 'admin@sdncideng07.sch.id',
    status: 'SETTLED',
    paymentMethod: 'QRIS',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    paidAt: new Date(Date.now() - 3600 * 1000 * 3.8).toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    qrisNmid: 'ID1024389281729',
  },
  {
    id: 'trx-102',
    invoiceNo: 'INV/202608/QRIS/829102',
    planId: 'teacher',
    planName: 'Paket Guru Mandiri',
    amount: 31000,
    uniqueCode: 450,
    totalAmount: 31450,
    schoolName: 'SDN 01 Merdeka Jakarta',
    npsn: '20108801',
    contactName: 'Guru C (Wali Kelas 3)',
    contactPhone: '081399887766',
    email: 'guruc@sdn01merdeka.sch.id',
    status: 'SETTLED',
    paymentMethod: 'QRIS',
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    paidAt: new Date(Date.now() - 3600 * 1000 * 11.9).toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    qrisNmid: 'ID1024389281729',
  },
  {
    id: 'trx-103',
    invoiceNo: 'INV/202608/QRIS/829103',
    planId: 'teacher',
    planName: 'Paket Guru Mandiri',
    amount: 31000,
    uniqueCode: 215,
    totalAmount: 31215,
    schoolName: 'SD Pertiwi Nusantara',
    npsn: '20108803',
    contactName: 'Guru B (PJOK)',
    contactPhone: '085711223344',
    email: 'gurub@pertiwi.sch.id',
    status: 'PENDING',
    paymentMethod: 'QRIS',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    expiresAt: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
    qrisNmid: 'ID1024389281729',
  },
  {
    id: 'trx-104',
    invoiceNo: 'INV/202608/QRIS/829104',
    planId: 'school',
    planName: 'Paket Sekolah (8 Guru + 1 Kepsek)',
    amount: 270000,
    uniqueCode: 673,
    totalAmount: 270673,
    schoolName: 'SDIT Al-Hikmah Nusantara',
    npsn: '20109955',
    contactName: 'Ust. Ahmad Dahlan, S.Pd.I',
    contactPhone: '081900112233',
    email: 'admin@alhikmahnusantara.sch.id',
    status: 'EXPIRED',
    paymentMethod: 'QRIS',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    expiresAt: new Date(Date.now() - 3600 * 1000 * 47).toISOString(),
    qrisNmid: 'ID1024389281729',
  },
];

export const PaymentsTab: React.FC<{
  call: any;
  showToast: any;
}> = ({ showToast }) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const loadPayments = async () => {
    setLoading(true);
    try { const res = await fetch('/api/superadmin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${(await (await import('../../lib/supabase')).supabase.auth.getSession()).data.session?.access_token||''}`},body:JSON.stringify({action:'payments'})}); const body=await res.json(); if(!res.ok) throw new Error(body.error||'Gagal memuat pembayaran.'); setTransactions(body.payments||[]); }
    catch(e:any){ showToast(e.message,'error'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{void loadPayments();},[]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'PENDING' | 'EXPIRED'>('ALL');
  const [selectedTrx, setSelectedTrx] = useState<PaymentTransaction | null>(null);


  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Metrics
  const totalCount = transactions.length;
  const settledTrx = transactions.filter((t) => t.status === 'SETTLED');
  const pendingTrx = transactions.filter((t) => t.status === 'PENDING');
  const totalRevenue = settledTrx.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Filtered List
  const filteredTransactions = transactions.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesQuery =
      !q ||
      t.invoiceNo.toLowerCase().includes(q) ||
      t.schoolName.toLowerCase().includes(q) ||
      (t.npsn && t.npsn.includes(q)) ||
      t.contactName.toLowerCase().includes(q) ||
      t.planName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const handleManualApprove = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'SETTLED',
              paidAt: new Date().toISOString(),
            }
          : t
      )
    );
    showToast('Transaksi berhasil dikonfirmasi LUNAS secara manual.', 'success');
  };

  const handleDeleteTrx = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast('Data transaksi telah dihapus.', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Gateway Pembayaran QRIS & Faktur
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Monitoring transaksi QRIS real-time, audit settlement, dan verifikasi langganan sekolah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>NMID: ID1024389281729</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Transaksi
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalCount}</div>
          <div className="text-[11px] text-slate-500">Semua riwayat QRIS</div>
        </div>

        <div className="p-5 bg-white border border-emerald-200/80 bg-emerald-50/20 rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Lunas / Settled</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{settledTrx.length}</div>
          <div className="text-[11px] text-emerald-600">Langganan aktif</div>
        </div>

        <div className="p-5 bg-white border border-amber-200/80 bg-amber-50/20 rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Menunggu Pembayaran</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{pendingTrx.length}</div>
          <div className="text-[11px] text-amber-600">Dalam masa timer QRIS</div>
        </div>

        <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md space-y-1">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
            Total Pendapatan Terverifikasi
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="text-[10px] text-indigo-300 font-medium">Gateway Settlement Bersih</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No. Invoice, Sekolah, NPSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Status:</span>
          {(['ALL', 'SETTLED', 'PENDING', 'EXPIRED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-4">Faktur / Invoice</th>
                <th className="p-4">Instansi & Kontak</th>
                <th className="p-4">Paket Langganan</th>
                <th className="p-4 text-right">Nominal (QRIS)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Tidak ada riwayat transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition">
                    
                    {/* Invoice & Date */}
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {trx.invoiceNo}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(trx.createdAt).toLocaleString('id-ID')}
                      </div>
                    </td>

                    {/* School & Contact */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{trx.schoolName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        {trx.npsn && <span className="font-mono font-semibold">NPSN: {trx.npsn} · </span>}
                        <span>{trx.contactName} ({trx.contactPhone})</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="p-4">
                      <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[10px] uppercase">
                        {trx.planName}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-right">
                      <div className="font-black text-slate-900 font-mono text-sm">
                        {formatRupiah(trx.totalAmount)}
                      </div>
                      {trx.uniqueCode > 0 && (
                        <div className="text-[9px] text-slate-400">Kode Unik: Rp{trx.uniqueCode}</div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      {trx.status === 'SETTLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Lunas
                        </span>
                      ) : trx.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase">
                          <XCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTrx(trx)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition cursor-pointer"
                          title="Lihat Detail Faktur"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {trx.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleManualApprove(trx.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Konfirmasi Lunas Manual"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verifikasi</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTrx(trx.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black uppercase tracking-tight text-slate-900 text-base">
                  Faktur Pembayaran QRIS
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Faktur:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTrx.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Sekolah:</span>
                  <span className="font-bold text-slate-900">{selectedTrx.schoolName}</span>
                </div>
                {selectedTrx.npsn && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">NPSN:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedTrx.npsn}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">PIC / Penanggung Jawab:</span>
                  <span className="font-semibold text-slate-800">{selectedTrx.contactName} ({selectedTrx.contactPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paket Langganan:</span>
                  <span className="font-bold text-indigo-600">{selectedTrx.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Pembayaran:</span>
                  <span className="font-bold text-slate-900">QRIS (NMID: {selectedTrx.qrisNmid})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                  <span className="text-slate-700">Total Tagihan:</span>
                  <span className="text-emerald-600 font-mono">{formatRupiah(selectedTrx.totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Dibuat: {new Date(selectedTrx.createdAt).toLocaleString('id-ID')}</span>
                <span className="font-bold text-slate-800">
                  Status: {selectedTrx.status === 'SETTLED' ? 'LUNAS (SETTLED)' : selectedTrx.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Faktur</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
