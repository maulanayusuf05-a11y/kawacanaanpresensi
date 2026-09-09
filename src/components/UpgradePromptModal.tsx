import React from 'react';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  ArrowRight,
  School,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { SYSTEM_FEATURES } from '../utils/featureRegistry';

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

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  featureId,
  customTitle,
  customMessage,
  targetPackage = 'guru_pro',
  onOpenTeacherUpgrade,
  onOpenSchoolUpgrade,
}) => {
  if (!isOpen) return null;

  const featureInfo = featureId
    ? SYSTEM_FEATURES.find((f) => f.id === featureId)
    : null;

  const featureName = customTitle || featureInfo?.name || 'Fitur Unggulan Kawacanaan';
  const featureCategory = featureInfo?.category || 'Fasilitas Layanan';
  const featureDesc =
    customMessage ||
    featureInfo?.description ||
    'Fitur ini dirancang khusus untuk mempermudah administrasi dan kelancaran presensi Anda.';

  const isSchoolTarget =
    targetPackage === 'sekolah_pro' ||
    [
      'data_guru',
      'data_sekolah',
      'kop_surat',
      'stempel_digital',
      'laporan_kepsek',
      'portal_siswa',
      'izin_online',
      'generator_akun',
      'manajemen_multiuser',
    ].includes(featureId || '');

  const whatsappMessage = encodeURIComponent(
    `Halo Tim Pendamping Kawacanaan, saya sedang menggunakan Paket Gratis (Ruang Kerja Individu) dan ingin berkonsultasi mengenai upgrade untuk mengakses fitur "${featureName}". Mohon informasinya.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200 my-auto"
        id="modal-upgrade-prompt"
      >
        {/* Header Visual Hangat & Ramah */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-5 sm:p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            id="btn-close-upgrade-modal"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-2.5">
            <Sparkles size={12} className="text-amber-300" />
            <span>Pemberitahuan Hak Akses Layanan</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black leading-snug">
            {featureName}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            Kategori: <span className="font-semibold">{featureCategory}</span>
          </p>
        </div>

        {/* Content Body dengan Kalimat Ramah & Solutif */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Apresiasi & Penjelasan Batas Akses Ramah */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={18} />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800 text-xs mb-1">
                Terima Kasih atas Dedikasi Bapak/Ibu Pendidik!
              </p>
              <p>
                Saat ini akun Anda berada pada <strong>Paket Gratis (Ruang Kerja Individu)</strong>. {featureDesc}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Seluruh data kelas dan catatan presensi yang telah Anda buat tetap aman tersimpan.</span>
              </p>
            </div>
          </div>

          {/* Opsi Jalur Onboarding Upgrade */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pilih Jalur Onboarding Upgrade Sesuai Kebutuhan Anda:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* OPSI 1: ONBOARDING PAKET GURU (RUANG KERJA INDIVIDU) */}
              <div
                onClick={() => {
                  onClose();
                  if (onOpenTeacherUpgrade) onOpenTeacherUpgrade();
                }}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  !isSchoolTarget
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        Paket Guru (Ruang Kerja Individu Pro)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Rp 29.000/bln
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Kelola hingga 5 rombel, presensi per jam mata pelajaran, cetak format resmi PDF A4 siap supervisi & SPJ, kapasitas 150 siswa.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-2xs group-hover:bg-emerald-700"
                >
                  <span>Onboarding Paket Guru</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* OPSI 2: ONBOARDING PAKET SEKOLAH (RUANG KERJA SEKOLAH) */}
              <div
                onClick={() => {
                  onClose();
                  if (onOpenSchoolUpgrade) onOpenSchoolUpgrade();
                }}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isSchoolTarget
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <School size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        Paket Sekolah (Ruang Kerja Sekolah Terpadu)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Uji Coba 14 Hari Gratis
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Menghubungkan seluruh rombel kelas 1-6 paralel, akun Kepala Sekolah & dewan guru, Kop Surat Dinas & Stempel Digital otomatis, serta Portal Siswa.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-2xs group-hover:bg-blue-700"
                >
                  <span>Onboarding Paket Sekolah</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <a
            href={`https://wa.me/6281234567890?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 font-bold transition py-1"
            id="btn-whatsapp-upgrade-consult"
          >
            <MessageCircle size={14} className="text-emerald-600" />
            <span>Butuh Konsultasi? Hubungi WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition shadow-2xs cursor-pointer"
            id="btn-dismiss-upgrade-modal"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
};
