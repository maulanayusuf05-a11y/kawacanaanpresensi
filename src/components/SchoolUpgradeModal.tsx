import React, { useState } from 'react';
import {
  School,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldCheck,
  Copy,
  Check,
  Users,
  FileText,
  Printer,
  Calendar,
  Layers,
  Loader2,
  Share2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SchoolUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SchoolUpgradeModal: React.FC<SchoolUpgradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, upgradeToSchoolWorkspace, showToast } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields Satuan Pendidikan
  const [schoolName, setSchoolName] = useState('SDN Percontohan Jakarta');
  const [npsn, setNpsn] = useState('20104567');
  const [city, setCity] = useState('Jakarta Pusat');
  const [province, setProvince] = useState('DKI Jakarta');
  const [status, setStatus] = useState<'Negeri' | 'Swasta'>('Negeri');

  // Pejabat & Admin
  const [principalName, setPrincipalName] = useState('Dra. Hj. Nurjanah, M.Pd.');
  const [principalNip, setPrincipalNip] = useState('197508122000032001');
  const [adminName, setAdminName] = useState(
    currentUser?.name || currentUser?.username || 'Administrator Sekolah'
  );

  // Paket Aktivasi
  const [planOption, setPlanOption] = useState<'trial' | 'annual'>('trial');
  const [isProcessing, setIsProcessing] = useState(false);

  // Hasil Sukses
  const [generatedSchoolCode, setGeneratedSchoolCode] = useState('9B3366AB');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedSchoolCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleActivateSchool = async () => {
    if (!schoolName.trim()) {
      showToast('Nama satuan pendidikan wajib diisi.', 'error');
      return;
    }
    if (!npsn.trim() || npsn.length < 8) {
      showToast('NPSN minimal 8 digit angka.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      let createdCode = 'SCH-' + Math.floor(100000 + Math.random() * 900000);
      if (upgradeToSchoolWorkspace) {
        const res = await upgradeToSchoolWorkspace({
          schoolName,
          npsn,
          city,
          province,
          status,
          principalName,
          principalNip,
          adminName,
          planOption,
        });
        if (res?.schoolCode) {
          createdCode = res.schoolCode;
        }
      }
      setGeneratedSchoolCode(createdCode);
      setStep(4);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal membentuk Ruang Kerja Sekolah.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200 my-auto"
        id="modal-school-upgrade"
      >
        {/* Header Visual */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-5 sm:p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            id="btn-close-school-upgrade"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase">
              <Sparkles size={12} className="text-amber-300" />
              Onboarding Ruang Kerja Sekolah
            </span>
            <span className="text-[11px] text-blue-100 font-medium">
              Langkah {step} dari 4
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black leading-snug">
            {step === 1 && 'Identitas Satuan Pendidikan (SD)'}
            {step === 2 && 'Pejabat & Pengesahan Sekolah'}
            {step === 3 && 'Aktivasi Ruang Kerja Sekolah Terpadu'}
            {step === 4 && 'Ruang Kerja Sekolah Berhasil Dibentuk!'}
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {step === 1 && 'Masukkan data resmi SD untuk mengintegrasikan seluruh kelas dan rombel paralel.'}
            {step === 2 && 'Atur nama Kepala Sekolah dan penanggung jawab administrasi kedinasan.'}
            {step === 3 && 'Pilih paket aktivasi (Masa Uji Coba 14 Hari Penuh atau Lisensi Tahunan).'}
            {step === 4 && 'Dapatkan Kode Undangan Sekolah untuk dibagikan ke seluruh guru dan siswa.'}
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
                    ? 'w-4 bg-sky-300'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body Steps */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* STEP 1: IDENTITAS SATUAN PENDIDIKAN */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nama Satuan Pendidikan (SD):
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SDN Cideng 07 Pagi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    NPSN (Nomor Pokok Sekolah):
                  </label>
                  <input
                    type="text"
                    value={npsn}
                    maxLength={8}
                    onChange={(e) => setNpsn(e.target.value.replace(/\D/g, ''))}
                    placeholder="8 Digit Angka NPSN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Status Satuan Pendidikan:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Negeri')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        status === 'Negeri'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Negeri
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Swasta')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        status === 'Swasta'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Swasta
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Kabupaten / Kota:
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kota / Kabupaten"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Provinsi:
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Provinsi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PEJABAT & PENGESAHAN */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
                Data Kepala Sekolah akan digunakan secara otomatis pada dokumen <strong>Kop Surat Kedinasan</strong>, lembar pengesahan tanda tangan raport/SPJ, dan laporan rekapitulasi sekolah.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nama Lengkap Kepala Sekolah (Beserta Gelar):
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="Contoh: Dra. Hj. Nurjanah, M.Pd."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  NIP Kepala Sekolah:
                </label>
                <input
                  type="text"
                  value={principalNip}
                  onChange={(e) => setPrincipalNip(e.target.value)}
                  placeholder="NIP 18 Digit atau '-'"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Penanggung Jawab / Admin Sekolah:
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nama Akun Anda"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PILIHAN AKTIVASI */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Uji Coba 14 Hari Penuh */}
                <div
                  onClick={() => setPlanOption('trial')}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    planOption === 'trial'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">Uji Coba 14 Hari Penuh</span>
                      {planOption === 'trial' && (
                        <CheckCircle2 size={18} className="text-blue-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">Gratis</span>
                      <span className="text-xs text-slate-500"> / 14 Hari</span>
                    </div>
                    <p className="text-[11px] text-blue-700 font-semibold mt-1">
                      Coba seluruh 24 fitur sekolah tanpa biaya awal
                    </p>
                  </div>
                </div>

                {/* Lisensi Resmi Tahunan */}
                <div
                  onClick={() => setPlanOption('annual')}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    planOption === 'annual'
                      ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">Paket Sekolah Terpadu</span>
                      {planOption === 'annual' && (
                        <CheckCircle2 size={18} className="text-indigo-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-slate-900">Rp 2.490.000</span>
                      <span className="text-xs text-slate-500"> / tahun</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mencakup seluruh guru, staf, dan siswa sekolah
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian Fitur Ekosistem Sekolah */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Fasilitas Terpadu 1 Unit Sekolah Dasar:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Seluruh Kelas 1-6 Paralel Terhubung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Akun Kepala Sekolah & Supervisi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Kop Surat Dinas & Stempel Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Portal Siswa & Izin Sakit Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Rekapitulasi Kehadiran Tingkat Sekolah</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Generator Akun Otomatis Massal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUKSES & KODE UNDANGAN */}
          {step === 4 && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-800">
                  Ruang Kerja Sekolah Telah Siap!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
                  Ruang Kerja untuk <strong>{schoolName}</strong> (NPSN: {npsn}) telah aktif. Bagikan kode di bawah ini ke seluruh dewan guru dan siswa.
                </p>
              </div>

              {/* Box Kode Undangan Sekolah */}
              <div className="bg-slate-50 border-2 border-dashed border-blue-300 rounded-2xl p-4 max-w-md mx-auto space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Kode Undangan Sekolah (School Invitation Code)
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-blue-700 tracking-wider">
                    {generatedSchoolCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition cursor-pointer"
                    title="Salin Kode Undangan"
                  >
                    {copiedCode ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Guru dan siswa cukup memasukkan kode ini saat pendaftaran untuk otomatis terhubung ke sekolah.
                </p>
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Lanjut Langkah Berikutnya</span>
                <ArrowRight size={14} />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleActivateSchool}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-black text-white transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Membentuk Ruang Kerja Sekolah...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Bentuk & Aktifkan Ruang Kerja Sekolah</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Masuk ke Ruang Kerja Sekolah</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
