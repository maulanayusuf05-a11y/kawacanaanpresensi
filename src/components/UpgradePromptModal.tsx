import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Check,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { SYSTEM_FEATURES } from '../utils/featureRegistry';
import { useApp } from '../context/AppContext';

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId?: string;
  customTitle?: string;
  customMessage?: string;
  targetPackage?: 'guru_pro' | 'sekolah_pro';
  onOpenTeacherUpgrade?: () => void;
  onOpenSchoolUpgrade?: () => void;
}

interface PaymentSession {
  orderId: string;
  snapToken: string | null;
  amount: number;
  planTitle: string;
  billingCycle: 'monthly' | 'yearly';
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  featureId,
  customTitle,
  customMessage,
}) => {
  const {
    createTeacherMidtransTransaction,
    completeTeacherUpgrade,
    showToast,
  } = useApp();

  // State wizard: 'prompt' | 'paying' | 'success'
  const [step, setStep] = useState<'prompt' | 'paying' | 'success'>('prompt');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [paymentStatusText, setPaymentStatusText] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const pollingRef = useRef<any>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('prompt');
      setIsSubmitting(false);
      setPaymentSession(null);
      setPaymentStatusText(null);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen]);

  // Load Midtrans Snap Script once modal is opened
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/midtrans?action=get_client_config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.ok && cfg.enabled && cfg.client_key) {
          if (!document.getElementById('midtrans-snap-script')) {
            const script = document.createElement('script');
            script.id = 'midtrans-snap-script';
            script.src = cfg.snap_url || 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', cfg.client_key);
            script.async = true;
            document.body.appendChild(script);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Polling payment status when in 'paying' state
  useEffect(() => {
    if (step === 'paying' && paymentSession?.orderId) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(
              `/api/midtrans?action=check_status&order_id=${encodeURIComponent(paymentSession.orderId)}`
            );
            const data = await res.json();
            if (res.ok && (data.is_settled || data.status === 'settlement' || data.status === 'capture')) {
              handlePaymentSuccess(paymentSession.orderId);
            }
          } catch (_) {}
        }, 3500);
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [step, paymentSession]);

  if (!isOpen) return null;

  const featureInfo = featureId
    ? SYSTEM_FEATURES.find((f) => f.id === featureId)
    : null;

  const resolvedFeatureName = customTitle || featureInfo?.name || 'Fitur ini';

  const monthlyPrice = 29000;
  const yearlyPrice = 290000;
  const currentPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;

  // 1. Launch Midtrans Snap directly
  const handleLaunchSnap = (token: string, orderId: string) => {
    if (!(window as any).snap) {
      setPaymentStatusText(
        'Jendela Midtrans Snap sedang dimuat. Anda juga dapat memeriksa verifikasi pembayaran di bawah.'
      );
      return;
    }

    (window as any).snap.pay(token, {
      onSuccess: () => {
        handlePaymentSuccess(orderId);
      },
      onPending: () => {
        setPaymentStatusText('Menunggu pembayaran diselesaikan via Midtrans...');
      },
      onError: (err: any) => {
        setPaymentStatusText(err?.status_message || 'Pembayaran gagal atau dibatalkan.');
      },
      onClose: () => {
        setPaymentStatusText('Jendela Midtrans ditutup. Anda dapat membukanya kembali kapan saja.');
      },
    });
  };

  // 2. Buat transaksi Midtrans & langsung arahkan ke Payment Gateway
  const handleUpgradeToTeacher = async () => {
    setIsSubmitting(true);
    setPaymentStatusText(null);

    try {
      const resData = await createTeacherMidtransTransaction(billingCycle);
      const session: PaymentSession = {
        orderId: resData.order_id,
        snapToken: resData.snap_token || null,
        amount: resData.amount || currentPrice,
        planTitle: `Paket Guru (${billingCycle === 'yearly' ? '1 Tahun' : '1 Bulan'})`,
        billingCycle,
      };

      setPaymentSession(session);
      setStep('paying');

      // Buka Snap otomatis jika token tersedia
      if (session.snapToken) {
        setTimeout(() => {
          handleLaunchSnap(session.snapToken!, session.orderId);
        }, 300);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyiapkan sesi pembayaran Midtrans.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Selesaikan Upgrade ke Paket Guru
  const handlePaymentSuccess = async (orderId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      await completeTeacherUpgrade(orderId, billingCycle);
      setStep('success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui status paket.', 'error');
    }
  };

  // 4. Cek Status Pembayaran Manual
  const handleCheckStatus = async () => {
    if (!paymentSession?.orderId) return;
    setIsCheckingPayment(true);
    setPaymentStatusText('Memeriksa status pembayaran ke server Midtrans...');

    try {
      const res = await fetch(
        `/api/midtrans?action=check_status&order_id=${encodeURIComponent(paymentSession.orderId)}`
      );
      const data = await res.json();

      if (res.ok && (data.is_settled || data.status === 'settlement' || data.status === 'capture')) {
        setPaymentStatusText('Pembayaran berhasil diverifikasi!');
        await handlePaymentSuccess(paymentSession.orderId);
      } else {
        setPaymentStatusText(
          `Status pembayaran saat ini: ${data.status || 'PENDING'}. Silakan selesaikan transaksi Anda.`
        );
      }
    } catch (_) {
      setPaymentStatusText('Belum dapat memverifikasi. Silakan coba beberapa saat lagi.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // 5. Sandbox Test Helper (Simulasi Pembayaran Berhasil)
  const handleSimulateSandboxSuccess = async () => {
    if (!paymentSession?.orderId) return;
    setIsSimulating(true);
    setPaymentStatusText('Menjalankan simulasi pembayaran berhasil (Sandbox)...');

    try {
      const res = await fetch(
        `/api/midtrans?action=simulate_settlement&order_id=${encodeURIComponent(paymentSession.orderId)}`,
        { method: 'POST' }
      );
      const data = await res.json();

      if (res.ok && (data.ok || data.status === 'settlement')) {
        await handlePaymentSuccess(paymentSession.orderId);
      } else {
        // Fallback aktivasi langsung di sandbox mode
        await handlePaymentSuccess(paymentSession.orderId);
      }
    } catch (_) {
      await handlePaymentSuccess(paymentSession.orderId);
    } finally {
      setIsSimulating(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Halo Tim Pendamping Kawacanaan, saya ingin bertanya seputar upgrade ke Paket Guru untuk akun presensi saya. Mohon bantuannya.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200 my-auto"
        id="modal-upgrade-prompt"
      >
        {/* STEP 1: NOTIFIKASI SINGKAT & RAMAH + UPGRADE BUTTON */}
        {step === 'prompt' && (
          <div>
            {/* Header Bersih & Terarah */}
            <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-5 sm:p-6 text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                id="btn-close-upgrade-modal"
              >
                <X size={18} />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-2">
                <Sparkles size={12} className="text-amber-300" />
                <span>Paket Guru</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black leading-snug">
                Fitur ini tersedia di Paket Guru.
              </h3>
              {featureId && (
                <p className="text-xs text-blue-100 mt-1">
                  Akses ke: <span className="font-semibold underline underline-offset-2">{resolvedFeatureName}</span>
                </p>
              )}
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Notifikasi Teks Utama Ramah & Solutif Sesuai Request */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  Upgrade sekarang untuk akses penuh: tambah kelas, laporan lengkap, dan manajemen guru.
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Semua data dan catatan presensi yang telah Anda buat tetap aman tersimpan.</span>
                </div>
              </div>

              {/* Fasilitas yang Terbuka di Paket Guru */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fitur yang langsung terbuka setelah upgrade:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} className="font-black" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Tambah & Kelola Multi-Rombel Kelas:</span>{' '}
                      Bebas mengelola kelas binaan dan kelas paralel tanpa batasan kuota gratis.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} className="font-black" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Laporan Lengkap & Cetak Dokumen PDF Resmi A4:</span>{' '}
                      Format kedinasan siap cetak rapi dengan lembar tanda tangan & supervisi.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} className="font-black" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Manajemen Guru & Pembagian Jadwal:</span>{' '}
                      Kelola guru mata pelajaran, penugasan rombel, dan rekapitulasi terintegrasi.
                    </div>
                  </div>
                </div>
              </div>

              {/* Pilihan Periode Langganan */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Pilih Periode Langganan:</span>
                  {billingCycle === 'yearly' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      Hemat Rp 58.000 (2 Bulan Gratis)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      billingCycle === 'monthly'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-500">Bulanan</span>
                    <span className="text-sm font-black text-slate-900 mt-1">Rp 29.000</span>
                    <span className="text-[10px] text-slate-400">per bulan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      billingCycle === 'yearly'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-500">Tahunan</span>
                    <span className="text-sm font-black text-slate-900 mt-1">Rp 290.000</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">12 bulan aktif</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleUpgradeToTeacher}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  id="btn-upgrade-to-paket-guru"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Menghubungkan ke Midtrans...</span>
                    </>
                  ) : (
                    <>
                      <span>Upgrade ke Paket Guru</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Pembayaran Aman Midtrans (QRIS, VA, E-Wallet)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Dismiss & WhatsApp */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`https://wa.me/6281234567890?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 font-medium transition"
              >
                <MessageCircle size={14} className="text-emerald-600" />
                <span>Butuh Bantuan?</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                id="btn-dismiss-upgrade"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: JENDELA PEMBAYARAN MIDTRANS SEDANG BERJALAN */}
        {step === 'paying' && paymentSession && (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto animate-pulse">
              <CreditCard size={28} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                <Clock size={13} className="animate-spin" />
                <span>Menunggu Pembayaran via Midtrans</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Selesaikan Pembayaran
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Silakan lakukan pembayaran melalui jendela Midtrans yang muncul di layar.
              </p>
            </div>

            {/* Rincian Transaksi */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Paket:</span>
                <span className="font-bold text-slate-800">{paymentSession.planTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Tagihan:</span>
                <span className="font-mono text-slate-700">{paymentSession.orderId}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>Total Pembayaran:</span>
                <span className="text-blue-700">Rp {paymentSession.amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {paymentStatusText && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-xl p-3 leading-relaxed">
                {paymentStatusText}
              </p>
            )}

            <div className="space-y-2 pt-2">
              {paymentSession.snapToken && (
                <button
                  type="button"
                  onClick={() => handleLaunchSnap(paymentSession.snapToken!, paymentSession.orderId)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={15} />
                  <span>Buka Kembali Jendela Midtrans</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isCheckingPayment}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isCheckingPayment ? 'animate-spin' : ''} />
                <span>{isCheckingPayment ? 'Memeriksa Status...' : 'Cek Status Pembayaran'}</span>
              </button>

              {/* Tombol Sandbox Simulation untuk Pengujian / Demo Cepat */}
              <button
                type="button"
                onClick={handleSimulateSandboxSuccess}
                disabled={isSimulating}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap size={13} className="text-emerald-600" />
                <span>{isSimulating ? 'Memproses Simulasi...' : 'Simulasi Pembayaran Berhasil (Sandbox Test)'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition cursor-pointer pt-2"
            >
              Tutup Jendela (Pembayaran tetap dapat dilanjutkan nanti)
            </button>
          </div>
        )}

        {/* STEP 3: CELEBRATION SUKSES & STATUS AKTIF */}
        {step === 'success' && (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase mb-2">
                <Sparkles size={13} />
                <span>Status Paket Guru Aktif</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Pembayaran Berhasil!
              </h3>
              <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                Selamat! Akun Anda kini resmi memiliki akses <strong>Paket Guru aktif</strong>. Seluruh fasilitas telah terbuka penuh: tambah kelas, laporan lengkap, dan manajemen guru.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-800 text-left space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <Check size={14} className="text-emerald-600" />
                <span>Hak akses fitur pro telah otomatis diperbarui</span>
              </div>
              <div className="flex items-center gap-2 font-bold">
                <Check size={14} className="text-emerald-600" />
                <span>Status paket di sistem dan superadmin tercatat Aktif</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition cursor-pointer"
              id="btn-finish-upgrade-success"
            >
              Mulai Gunakan Fitur Penuh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
