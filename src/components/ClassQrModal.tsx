import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  QrCode,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  GraduationCap,
  School,
  Maximize2
} from 'lucide-react';
import { SchoolClass, SchoolProfile, SystemConfig } from '../types';
import { generateClassQrDataUrl, generateClassQrPayload } from '../utils/classQr';
import { getFaseByGrade } from '../utils/faseKurikulum';

interface ClassQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: SchoolClass;
  schoolProfile: SchoolProfile;
  systemConfig: SystemConfig;
  schoolId?: string | null;
}

export const ClassQrModal: React.FC<ClassQrModalProps> = ({
  isOpen,
  onClose,
  classItem,
  schoolProfile,
  systemConfig,
  schoolId,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && classItem) {
      generateClassQrDataUrl(classItem, schoolId, 600)
        .then(setQrDataUrl)
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, classItem, schoolId]);

  if (!isOpen || !classItem) return null;

  const fase = getFaseByGrade(classItem.grade);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Presensi-${classItem.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleCopyPayload = () => {
    const payload = generateClassQrPayload(classItem, schoolId);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* On-screen Modal View */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto print:hidden">
        <div className={`relative w-full ${isFullscreen ? 'max-w-3xl' : 'max-w-xl'} bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 my-auto animate-in zoom-in-95 duration-200`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-inner">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  QR Code Tetap Rombel
                </div>
                <h3 className="font-black text-white text-base sm:text-lg tracking-tight mt-0.5">
                  Presensi Mandiri {classItem.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition cursor-pointer"
                title={isFullscreen ? 'Kecilkan' : 'Perbesar Tampilan'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            
            {/* Identity Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xl shrink-0">
                  {classItem.grade || 'K'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 text-base">{classItem.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                      {fase}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Wali Kelas: <strong className="text-slate-700">{classItem.waliKelasName || 'Belum Ditetapkan'}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Satuan Pendidikan</span>
                <span className="text-xs font-bold text-slate-700 truncate max-w-[200px] block">
                  {schoolProfile.namaSekolah}
                </span>
              </div>
            </div>

            {/* QR Card Presentation */}
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50/40 to-slate-50 border-2 border-blue-200 rounded-3xl text-center relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-wider mb-3 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                Scan via Portal Siswa (HP)
              </div>

              {/* QR Image Container */}
              <div className="p-3 bg-white border-2 border-slate-300 rounded-2xl shadow-md inline-block my-1">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Presensi ${classItem.name}`}
                    className={`${isFullscreen ? 'w-64 h-64 sm:w-72 sm:h-72' : 'w-48 h-48 sm:w-56 sm:h-56'} object-contain`}
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Membuat QR Code...
                  </div>
                )}
              </div>

              <p className="text-xs font-extrabold text-slate-800 mt-3">
                QR Code Permanen • {classItem.name}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                Kode ini tetap dan tidak berubah setiap hari maupun saat pergantian mata pelajaran. Cukup dicetak atau ditempel di pintu / meja kelas.
              </p>
            </div>

            {/* Step-by-Step Guidance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                <p className="text-slate-600 leading-snug">
                  Siswa buka <strong>Portal Siswa</strong> di HP dan login ke akun masing-masing.
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                <p className="text-slate-600 leading-snug">
                  Tekan tombol hijau <strong>"Scan QR Presensi"</strong> untuk membuka kamera.
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                <p className="text-slate-600 leading-snug">
                  Arahkan kamera ke QR ini. Presensi Masuk / Pulang otomatis tercatat dengan jam server.
                </p>
              </div>
            </div>

            {/* Rules Note */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Keamanan & Jam Aturan Sekolah:</span>
                <span className="text-[11px] text-amber-800 leading-relaxed block">
                  Presensi Masuk: mulai {systemConfig.checkInStartTime || '06:00'} WIB. Batas tepat waktu: s/d {systemConfig.checkInDeadlineTime || '07:00'} WIB. Presensi Pulang: mulai {systemConfig.checkOutStartTime || '12:30'} WIB. Siswa dari rombel lain akan otomatis ditolak oleh sistem.
                </span>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleCopyPayload}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kode Tersalin!' : 'Salin Token QR'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-2 cursor-pointer transition shadow-md shadow-blue-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Poster Rombel (A4)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable A4 Poster View (hidden on screen, only appears during window.print()) */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 font-sans text-slate-900">
        <div className="border-4 border-slate-900 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-6">
          
          {/* Header Kop */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
              {schoolProfile.namaSekolah}
            </h2>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              SISTEM PRESENSI DIGITAL MANDIRI PESERTA DIDIK
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Tahun Ajaran {schoolProfile.tahunPelajaran || '2025/2026'} • Semester {schoolProfile.semester || '1 (Ganjil)'}
            </p>
          </div>

          {/* Class Title Badge */}
          <div className="py-2">
            <span className="inline-block px-6 py-2 rounded-2xl bg-slate-900 text-white font-black text-2xl uppercase tracking-wider">
              {classItem.name}
            </span>
            <div className="mt-2 text-sm font-bold text-slate-700">
              {fase} • Tingkat Kelas {classItem.grade}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Wali Kelas: <strong>{classItem.waliKelasName || '—'}</strong>
            </div>
          </div>

          {/* Large QR Code */}
          <div className="my-4">
            <div className="inline-block p-4 border-4 border-slate-900 rounded-3xl bg-white shadow-none">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR Presensi ${classItem.name}`}
                  className="w-72 h-72 mx-auto object-contain"
                />
              )}
            </div>
          </div>

          {/* Student Instructions */}
          <div className="border-2 border-slate-300 rounded-2xl p-4 bg-slate-50 text-left space-y-2">
            <p className="font-black text-xs uppercase tracking-wider text-slate-800 text-center border-b border-slate-200 pb-1.5">
              PETUNJUK PRESENSI SISWA
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-700 pt-1">
              <div>
                <strong>1. Masuk Portal:</strong>
                <p>Buka Portal Siswa di HP & login akun Anda.</p>
              </div>
              <div>
                <strong>2. Tekan Scan:</strong>
                <p>Klik tombol hijau Scan QR Presensi.</p>
              </div>
              <div>
                <strong>3. Scan Kode:</strong>
                <p>Arahkan kamera ke QR ini. Jam masuk/pulang tercatat otomatis.</p>
              </div>
            </div>
          </div>

          {/* Footer note & security warning */}
          <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200">
            <span>*QR ini tetap dan berlaku untuk seluruh mata pelajaran di kelas ini.</span>
            <span>Waktu presensi menggunakan jam server resmi sekolah.</span>
          </div>

        </div>
      </div>
    </>
  );
};
