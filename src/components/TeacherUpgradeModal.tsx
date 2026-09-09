import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  FileText,
  Clock,
  Printer,
  ShieldCheck,
  Loader2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TeacherUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TeacherUpgradeModal: React.FC<TeacherUpgradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, upgradeToTeacherPro, showToast } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRole, setSelectedRole] = useState<'homeroom' | 'subject'>('homeroom');
  const [targetClassCount, setTargetClassCount] = useState<number>(3);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  if (!isOpen) return null;

  const teacherName = currentUser?.name || currentUser?.username || 'Bapak/Ibu Guru';
  const teacherEmail = currentUser?.email || 'guru@sekolah.id';
  const teacherNip = currentUser?.nip || '-';

  const monthlyPrice = 29000;
  const yearlyPrice = 290000; // Hemat 2 bulan (Rp 58.000)
  const amountToPay = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;

  const invoiceNumber = `INV-TCH-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(invoiceNumber);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  const handleProcessUpgrade = async () => {
    setIsProcessing(true);
    try {
      if (upgradeToTeacherPro) {
        await upgradeToTeacherPro(billingCycle);
      }
      setStep(4);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses aktivasi Paket Guru.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200 my-auto"
        id="modal-teacher-upgrade"
      >
        {/* Header Visual */}
        <div className="relative bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 p-5 sm:p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            id="btn-close-teacher-upgrade"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase">
              <Sparkles size={12} className="text-amber-300" />
              Onboarding Ruang Kerja Individu
            </span>
            <span className="text-[11px] text-emerald-100 font-medium">
              Langkah {step} dari 4
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black leading-snug">
            {step === 1 && 'Konfirmasi Profil & Penugasan Pendidik'}
            {step === 2 && 'Pilih Siklus Langganan Paket Guru'}
            {step === 3 && 'Simulasi Pembayaran & Aktivasi Instan'}
            {step === 4 && 'Selamat Datang di Paket Guru Pro!'}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">
            {step === 1 && 'Periksa penugasan Anda untuk mengaktifkan kapasitas rombel dan mata pelajaran.'}
            {step === 2 && 'Pilih paket bulanan atau tahunan dengan penghematan hingga 2 bulan penuh.'}
            {step === 3 && 'Verifikasi faktur dan aktifkan paket ke ruang kerja mandiri Anda saat ini.'}
            {step === 4 && 'Akses fitur multi-rombel, presensi mapel, dan cetak PDF resmi langsung terbuka.'}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-white'
                    : s < step
                    ? 'w-4 bg-emerald-300'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body Steps */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* STEP 1: PROFIL & PENUGASAN PENDIDIK */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Profil Saat Ini */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base shrink-0">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{teacherName}</h4>
                    <p className="text-xs text-slate-500">
                      NIP: <span className="font-semibold">{teacherNip}</span> • Email: <span className="font-semibold">{teacherEmail}</span>
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg uppercase">
                  Akun Aktif
                </span>
              </div>

              {/* Pilihan Penugasan Pendidik */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Penugasan Utama Anda di Sekolah:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('homeroom')}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                      selectedRole === 'homeroom'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <UserCheck size={18} />
                      </div>
                      {selectedRole === 'homeroom' && (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Wali Kelas Utama</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Mengampu 1 rombel binaan utama plus opsi kelas paralel tambahan hingga 5 rombel.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('subject')}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                      selectedRole === 'subject'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                        <Layers size={18} />
                      </div>
                      {selectedRole === 'subject' && (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Guru Mata Pelajaran</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Mengajar mapel tertentu (PJOK, PAI, Bahasa Inggris, dll) lintas tingkat kelas.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rencana Rombel */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Perkiraan Jumlah Rombel yang Dikelola (Maks 5 Kelas):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTargetClassCount(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                        targetClassCount === count
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {count} Kelas
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Paket Guru mencakup kuota hingga 5 rombongan belajar dan 150 siswa sekolah dasar.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PILIHAN SIKLUS & FASILITAS */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Opsi Siklus Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tahunan (Rekomendasi) */}
                <div
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    billingCycle === 'yearly'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wide shadow-2xs">
                    Hemat 2 Bulan
                  </span>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">Langganan 1 Tahun</span>
                      {billingCycle === 'yearly' && (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">Rp 290.000</span>
                      <span className="text-xs text-slate-500"> / tahun</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Hanya ~Rp 24.100/bulan (Hemat Rp 58.000)
                    </p>
                  </div>
                </div>

                {/* Bulanan */}
                <div
                  onClick={() => setBillingCycle('monthly')}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    billingCycle === 'monthly'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">Langganan Bulanan</span>
                      {billingCycle === 'monthly' && (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">Rp 29.000</span>
                      <span className="text-xs text-slate-500"> / bulan</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Perpanjangan fleksibel setiap 30 hari
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian 6 Fasilitas Baku yang Langsung Terbuka */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Fasilitas Profesional yang Segera Aktif:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Hingga 5 Rombel Belajar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Presensi per Jam Mata Pelajaran</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Cetak PDF Resmi A4 Siap SPJ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Kapasitas hingga 150 Siswa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Pengaturan HEB & Hari Libur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Bantuan Teknis Prioritas WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SIMULASI MIDTRANS & AKTIVASI INSTAN */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Nomor Faktur / Tagihan</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-mono font-bold text-slate-800">{invoiceNumber}</span>
                      <button
                        type="button"
                        onClick={handleCopyInvoice}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Salin Nomor Faktur"
                      >
                        {copiedInvoice ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    Menunggu Aktivasi
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Nama Pelanggan:</span>
                    <span className="font-bold text-slate-800">{teacherName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produk Langganan:</span>
                    <span className="font-bold text-slate-800">
                      Paket Guru Pro ({billingCycle === 'yearly' ? '1 Tahun' : '1 Bulan'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode Gateway:</span>
                    <span className="font-semibold text-emerald-700">QRIS / Virtual Account / Aktivasi Langsung</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Total Pembayaran:</span>
                    <span className="text-emerald-700">Rp {amountToPay.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Box Info Keamanan */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aktivasi Langsung ke Ruang Kerja Anda</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    Setelah tombol aktivasi ditekan, paket pada Ruang Kerja Individu Anda akan seketika di-upgrade ke Paket Guru Pro tanpa menghapus data siswa atau presensi yang sudah ada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUKSES & PANDUAN */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800">
                  Selamat, Akun Anda Kini Guru Pro!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
                  Paket Guru pada Ruang Kerja Individu <strong>{teacherName}</strong> telah aktif. Seluruh fitur tambahan siap digunakan sekarang.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto text-xs text-slate-700">
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  Langkah yang Dapat Anda Lakukan Sekarang:
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Buka menu <strong>Data Kelas</strong> untuk menambah rombel hingga 5 kelas.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Pilih mode <strong>Presensi Guru Mapel</strong> pada menu Presensi Harian.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Cetak dokumen <strong>Laporan Resmi PDF A4</strong> berlembar tanda tangan.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition cursor-pointer"
            >
              {step === 4 ? 'Tutup' : 'Batal'}
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Lanjut Langkah Berikutnya</span>
                <ArrowRight size={14} />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleProcessUpgrade}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-black text-white transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Mengaktifkan Paket Guru...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Aktifkan Paket Guru Sekarang</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Mulai Gunakan Fitur Sekarang</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
