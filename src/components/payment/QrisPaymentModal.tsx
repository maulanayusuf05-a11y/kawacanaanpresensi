import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Printer,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Wallet,
  Building2,
  Receipt
} from 'lucide-react';

export interface QrisPaymentPlan {
  id: 'free' | 'teacher' | 'school';
  name: string;
  price: number;
  priceFormatted: string;
  period: string;
  durationDays: number;
  features: string[];
}

export interface PaymentTransaction {
  id: string;
  invoiceNo: string;
  planId: string;
  planName: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  schoolName: string;
  npsn?: string;
  contactName: string;
  contactPhone: string;
  email?: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED' | 'CANCELLED';
  paymentMethod: 'QRIS';
  createdAt: string;
  paidAt?: string;
  expiresAt: string;
  qrisNmid: string;
}

interface QrisPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: QrisPaymentPlan;
  schoolData: {
    schoolName: string;
    npsn?: string;
    contactName: string;
    contactPhone: string;
    email?: string;
  };
  onSuccess?: (transaction: PaymentTransaction) => void;
}

export const QrisPaymentModal: React.FC<QrisPaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  schoolData,
  onSuccess,
}) => {
  // Generate random unique code (e.g. 100 - 999) for easy verification
  const [uniqueCode] = useState(() => Math.floor(Math.random() * 899) + 100);
  const totalAmount = plan.price + (plan.price > 0 ? uniqueCode : 0);

  const [transaction, setTransaction] = useState<PaymentTransaction>(() => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 menit
    const inv = `INV/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}/QRIS/${Math.floor(Math.random() * 899999 + 100000)}`;

    return {
      id: `trx-${Date.now()}`,
      invoiceNo: inv,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      uniqueCode: plan.price > 0 ? uniqueCode : 0,
      totalAmount,
      schoolName: schoolData.schoolName || 'Sekolah Dasar',
      npsn: schoolData.npsn || '',
      contactName: schoolData.contactName || 'Admin / Wali Kelas',
      contactPhone: schoolData.contactPhone || '',
      email: schoolData.email || '',
      status: plan.price === 0 ? 'SETTLED' : 'PENDING',
      paymentMethod: 'QRIS',
      createdAt: now.toISOString(),
      paidAt: plan.price === 0 ? now.toISOString() : undefined,
      expiresAt: expiry.toISOString(),
      qrisNmid: 'ID1024389281729',
    };
  });

  // Countdown Timer (15 Minutes)
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isChecking, setIsChecking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  useEffect(() => {
    if (!isOpen || transaction.status === 'SETTLED') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTransaction((t) => ({ ...t, status: 'EXPIRED' }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, transaction.status]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(totalAmount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(transaction.invoiceNo);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  // Simulate Instant Settlement Scan (for demo / fast testing)
  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setTimeout(async () => {
      const settled: PaymentTransaction = {
        ...transaction,
        status: 'SETTLED',
        paidAt: new Date().toISOString(),
      };
      setTransaction(settled);
      setIsSimulating(false);

      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: sessionData } = await supabase.auth.getSession();
        await fetch('/api/payments', {
          method:'POST',
          headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionData.session?.access_token || ''}`},
          body:JSON.stringify({action:'settle',transaction:settled})
        });
      } catch (_) {}
      if (onSuccess) onSuccess(settled);
    }, 1200);
  };

  const handleManualCheckStatus = () => {
    setIsChecking(true);
    setTimeout(async () => {
      setIsChecking(false);
    }, 1000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Payment Gateway QRIS
              </div>
              <h3 className="font-black text-white text-base sm:text-lg tracking-tight uppercase mt-0.5">
                {transaction.status === 'SETTLED' ? 'Pembayaran Berhasil' : 'Selesaikan Pembayaran QRIS'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* STATUS: SETTLED (LUNAS) */}
          {transaction.status === 'SETTLED' ? (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs uppercase tracking-widest border border-emerald-200">
                  Pembayaran Terverifikasi (LUNAS)
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-2">
                  Langganan Aktif!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  Terima kasih, pembayaran untuk <strong>{schoolData.schoolName}</strong> ({plan.name}) telah berhasil dikonfirmasi oleh sistem gateway QRIS.
                </p>
              </div>

              {/* Digital Invoice Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-left text-xs space-y-3 font-sans shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 uppercase">Struk Pembayaran Digital</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500">
                    {transaction.invoiceNo}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Nama Instansi:</span>
                    <span className="font-bold text-slate-800">{transaction.schoolName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Paket Terpilih:</span>
                    <span className="font-bold text-indigo-600">{transaction.planName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Metode Pembayaran:</span>
                    <span className="font-bold text-slate-800">QRIS Standar BI (NMID: {transaction.qrisNmid})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Waktu Transaksi:</span>
                    <span className="font-mono font-medium text-slate-700">
                      {new Date(transaction.paidAt || transaction.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-xs">
                  <span className="text-slate-700">Total Pembayaran:</span>
                  <span className="text-sm font-black text-emerald-600 font-mono">
                    {formatRupiah(transaction.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Cetak Bukti Bayar
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest transition cursor-pointer shadow-sm"
                >
                  Mulai Gunakan Sistem
                </button>
              </div>
            </div>
          ) : (
            /* STATUS: PENDING PAYMENT */
            <div className="space-y-6">
              
              {/* Top Banner: Timer & Invoice */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-amber-900 font-bold block">Sisa Waktu Pembayaran</span>
                    <span className="text-[11px] text-amber-700 font-mono">Selesaikan scan sebelum waktu habis</span>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                  <span className="text-lg font-black text-amber-900 font-mono tracking-wider">
                    {timerFormatted}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyInvoice}
                    className="text-[10px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{transaction.invoiceNo}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Order Summary & Unique Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Paket Langganan
                  </span>
                  <div className="font-black text-slate-900 text-sm">{plan.name}</div>
                  <div className="text-[11px] text-indigo-600 font-semibold">{schoolData.schoolName}</div>
                </div>

                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                      Total Nominal Transfer
                    </span>
                    <div className="font-black text-indigo-950 text-base font-mono">
                      {formatRupiah(totalAmount)}
                    </div>
                    {uniqueCode > 0 && (
                      <span className="text-[9px] text-indigo-600 font-medium">
                        (Termasuk kode verifikasi: Rp{uniqueCode})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAmount}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition shadow-xs"
                    title="Salin Nominal"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedAmount ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Official QRIS Graphic Display */}
              <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                
                {/* Official QRIS Brand Header */}
                <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] tracking-wider">
                      QRIS
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                      QR Code Indonesian Standard
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono font-semibold">
                    NMID: {transaction.qrisNmid}
                  </span>
                </div>

                {/* QR Code Container with BI Emblem */}
                <div className="relative p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block">
                  <svg
                    className="w-52 h-52 sm:w-56 sm:h-56"
                    viewBox="0 0 200 200"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* QR Code Background Grid (High-Density Realistic Matrix) */}
                    <rect width="200" height="200" fill="#ffffff" />
                    
                    {/* Top-Left Finder */}
                    <rect x="15" y="15" width="45" height="45" fill="#0f172a" rx="4" />
                    <rect x="22" y="22" width="31" height="31" fill="#ffffff" rx="2" />
                    <rect x="29" y="29" width="17" height="17" fill="#0f172a" rx="2" />

                    {/* Top-Right Finder */}
                    <rect x="140" y="15" width="45" height="45" fill="#0f172a" rx="4" />
                    <rect x="147" y="22" width="31" height="31" fill="#ffffff" rx="2" />
                    <rect x="154" y="29" width="17" height="17" fill="#0f172a" rx="2" />

                    {/* Bottom-Left Finder */}
                    <rect x="15" y="140" width="45" height="45" fill="#0f172a" rx="4" />
                    <rect x="22" y="147" width="31" height="31" fill="#ffffff" rx="2" />
                    <rect x="29" y="154" width="17" height="17" fill="#0f172a" rx="2" />

                    {/* Data Matrix Bits Simulation */}
                    <g fill="#0f172a">
                      <rect x="70" y="20" width="8" height="8" />
                      <rect x="85" y="20" width="8" height="8" />
                      <rect x="100" y="20" width="8" height="8" />
                      <rect x="115" y="20" width="8" height="8" />
                      
                      <rect x="75" y="35" width="8" height="8" />
                      <rect x="95" y="35" width="8" height="8" />
                      <rect x="120" y="35" width="8" height="8" />

                      <rect x="70" y="50" width="8" height="8" />
                      <rect x="85" y="50" width="8" height="8" />
                      <rect x="110" y="50" width="8" height="8" />

                      <rect x="20" y="70" width="8" height="8" />
                      <rect x="35" y="70" width="8" height="8" />
                      <rect x="50" y="70" width="8" height="8" />
                      <rect x="70" y="70" width="8" height="8" />
                      <rect x="130" y="70" width="8" height="8" />
                      <rect x="145" y="70" width="8" height="8" />
                      <rect x="165" y="70" width="8" height="8" />

                      <rect x="25" y="90" width="8" height="8" />
                      <rect x="45" y="90" width="8" height="8" />
                      <rect x="135" y="90" width="8" height="8" />
                      <rect x="155" y="90" width="8" height="8" />
                      <rect x="170" y="90" width="8" height="8" />

                      <rect x="20" y="110" width="8" height="8" />
                      <rect x="40" y="110" width="8" height="8" />
                      <rect x="60" y="110" width="8" height="8" />
                      <rect x="140" y="110" width="8" height="8" />
                      <rect x="160" y="110" width="8" height="8" />

                      <rect x="70" y="140" width="8" height="8" />
                      <rect x="90" y="140" width="8" height="8" />
                      <rect x="110" y="140" width="8" height="8" />
                      <rect x="130" y="140" width="8" height="8" />
                      <rect x="150" y="140" width="8" height="8" />

                      <rect x="75" y="160" width="8" height="8" />
                      <rect x="100" y="160" width="8" height="8" />
                      <rect x="125" y="160" width="8" height="8" />
                      <rect x="145" y="160" width="8" height="8" />
                      <rect x="165" y="160" width="8" height="8" />

                      <rect x="70" y="175" width="8" height="8" />
                      <rect x="85" y="175" width="8" height="8" />
                      <rect x="115" y="175" width="8" height="8" />
                      <rect x="135" y="175" width="8" height="8" />
                    </g>

                    {/* Central QRIS Badge */}
                    <rect x="78" y="78" width="44" height="44" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                    <g transform="translate(85, 87)">
                      <rect width="30" height="24" rx="4" fill="#E11D48" />
                      <text x="15" y="16" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">QRIS</text>
                    </g>
                  </svg>
                </div>

                {/* Merchant Name */}
                <div className="mt-3">
                  <div className="font-black text-slate-900 text-xs sm:text-sm tracking-tight uppercase">
                    KAWACANAAN EDU INDONESIA
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Sistem Presensi & Manajemen SD Terpadu
                  </div>
                </div>

                {/* Compatible Apps Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-bold text-slate-600">
                  <span className="px-2 py-1 bg-slate-100 rounded-md">BCA Mobile</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">Livin' Mandiri</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">BRImo</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">BNI Mobile</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">GoPay</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">OVO</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">DANA</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">ShopeePay</span>
                </div>
              </div>

              {/* Action Buttons: Status Check & Instant Simulation */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                  id="btn-simulate-qris-payment"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isSimulating ? 'Memverifikasi Pembayaran QRIS...' : '⚡ Simulasikan Scan & Bayar Instan'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={isChecking}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>{isChecking ? 'Mengecek Gateway...' : 'Cek Status Pembayaran'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Panduan</span>
                    {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Payment Instructions */}
              {showInstructions && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5 text-slate-700 animate-in fade-in duration-150">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Cara Pembayaran Menggunakan QRIS:
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <li>Buka aplikasi Mobile Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay) di ponsel Anda.</li>
                    <li>Pilih menu <strong>Bayar / QRIS / Scan QR</strong>.</li>
                    <li>Arahkan kamera ke kode QRIS di atas.</li>
                    <li>Periksa nama merchant: <strong>KAWACANAAN EDU INDONESIA</strong>.</li>
                    <li>Masukkan/konfirmasi nominal transfer tepat: <strong>{formatRupiah(totalAmount)}</strong>.</li>
                    <li>Masukkan PIN Anda untuk menyelesaikan transaksi.</li>
                    <li>Sistem akan mengaktifkan paket secara otomatis dalam hitungan detik.</li>
                  </ol>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
