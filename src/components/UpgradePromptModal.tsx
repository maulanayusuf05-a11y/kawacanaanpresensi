import React from 'react';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  ArrowRight,
  School,
  UserCheck,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { SYSTEM_FEATURES } from '../utils/featureRegistry';

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId?: string;
  customTitle?: string;
  customMessage?: string;
  targetPackage?: 'guru_pro' | 'sekolah_pro';
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  featureId,
  customTitle,
  customMessage,
  targetPackage = 'guru_pro',
}) => {
  if (!isOpen) return null;

  const featureInfo = featureId
    ? SYSTEM_FEATURES.find((f) => f.id === featureId)
    : null;

  const featureName = customTitle || featureInfo?.name || 'Fitur Ekstra Kawacanaan';
  const featureCategory = featureInfo?.category || 'Fasilitas Layanan';
  const featureDesc = customMessage || featureInfo?.description || 'Fitur ini dirancang khusus untuk meningkatkan kemudahan administrasi pembelajaran Anda.';

  const isSchoolTarget = targetPackage === 'sekolah_pro' || [
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
    `Halo Tim Kawacanaan, saya ingin berkonsultasi mengenai upgrade ${
      isSchoolTarget ? 'Paket Sekolah' : 'Paket Guru'
    } untuk mengakses fitur "${featureName}". Mohon informasinya.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200"
        id="modal-upgrade-prompt"
      >
        {/* Header Visual */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            id="btn-close-upgrade-modal"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-3">
            <Sparkles size={12} className="text-amber-300" />
            <span>Tingkatkan Pengalaman Anda</span>
          </div>

          <h3 className="text-xl font-black leading-snug">
            {featureName}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            Kategori: {featureCategory}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={18} />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 mb-0.5">
                Pemberitahuan Hak Akses Paket
              </p>
              <p>
                Saat ini akun Anda berada pada <strong>Paket Gratis (Ruang Kerja Individu)</strong>. {featureDesc}
              </p>
            </div>
          </div>

          {/* Rekomendasi Solusi yang Ramah */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isSchoolTarget ? 'Dapatkan Akses Penuh via Paket Sekolah:' : 'Kelebihan Mengaktifkan Paket Guru:'}
            </p>

            {isSchoolTarget ? (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2">
                  <School size={16} className="text-indigo-600 shrink-0" />
                  <span className="font-bold">Paket Ruang Kerja Sekolah Terpadu</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-indigo-900/90 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Mencakup seluruh kelas (1 s/d 6 paralel) dalam 1 sekolah.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Laporan otomatis ber-Kop Dinas, stempel sekolah & pengesahan Kepsek.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Portal siswa mandiri & pengajuan surat izin online orang tua.</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-bold">Paket Guru (Ruang Kerja Mandiri Profesional)</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-emerald-900/90 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Dukungan penuh Guru Mapel untuk mengajar di banyak kelas.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Cetak laporan PDF A4 rapi siap serah terima saat supervisi.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Kustomisasi Hari Efektif Belajar (HEB) dan catatan kehadiran lengkap.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 italic text-center">
            Pekerjaan dan data presensi yang sudah Anda buat di kelas saat ini akan tetap aman dan tidak akan hilang.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition shadow-2xs cursor-pointer"
            id="btn-dismiss-upgrade-modal"
          >
            Nanti Saja
          </button>
          
          <a
            href={`https://wa.me/6281234567890?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition shadow-sm active:scale-95 cursor-pointer"
            id="btn-whatsapp-upgrade-consult"
          >
            <MessageCircle size={15} />
            <span>Konsultasi Upgrade Sekarang</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
