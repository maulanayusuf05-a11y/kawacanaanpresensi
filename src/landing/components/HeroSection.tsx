import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, School, Calendar, Users } from 'lucide-react';
import { DeviceMockup } from './DeviceMockup';

interface HeroSectionProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  lang: 'ID' | 'EN';
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onOpenRegister, 
  onOpenLogin,
  lang 
}) => {
  return (
    <section 
      id="beranda" 
      className="relative min-h-[calc(100vh-80px)] pt-28 pb-16 lg:pt-36 lg:pb-24 flex items-center justify-center overflow-hidden bg-white text-slate-900 border-b border-slate-100"
    >
      {/* Subtle Editorial Background Accents */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 border-l border-slate-100 hidden lg:block" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-slate-100 rounded-full blur-2xl opacity-60" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Headline, Narrative, and CTAs */}
          <div className="w-full lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Editorial Badge */}
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded border border-indigo-100">
                <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{lang === 'ID' ? 'SISTEM PRESENSI DIGITAL SEKOLAH DASAR' : 'PRIMARY SCHOOL DIGITAL ATTENDANCE SYSTEM'}</span>
              </span>

              {/* Main Headline - Editorial Display Typography */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-[58px] leading-[1.1] sm:leading-[1.0] font-black tracking-tight text-slate-900 uppercase">
                {lang === 'ID' ? (
                  <>
                    PRESENSI SEKOLAH DASAR<br />
                    <span className="text-indigo-600">LEBIH TERTIB & AKURAT</span>
                  </>
                ) : (
                  <>
                    PRIMARY ATTENDANCE<br />
                    <span className="text-indigo-600">STRUCTURED & PRECISE</span>
                  </>
                )}
              </h1>

              <div className="text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500 pt-0.5">
                Kawacanaan Presensi • Platform Presensi Khusus Jenjang SD
              </div>
            </div>

            {/* Editorial Narrative with Left Border Accent */}
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl border-l-4 border-indigo-300 pl-3 sm:pl-5 font-normal">
              {lang === 'ID' 
                ? "Sistem presensi digital terpadu untuk Sekolah Dasar. Mendukung presensi harian oleh Wali Kelas, presensi per mata pelajaran khusus (PJOK & Agama), penghitungan otomatis hari efektif belajar, hingga cetak laporan administrasi format dinas."
                : "Integrated digital attendance platform built specifically for Primary Schools. Supporting daily homeroom check-ins, specialized subject attendance (PE & Religious Studies), automatic effective school day calculations, and official administrative report exports."
              }
            </p>

            {/* Action Buttons Group with Editorial Styling */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1 w-full sm:w-auto">
              
              {/* Primary Dark Button: MULAI SEKARANG */}
              <button
                type="button"
                id="btn-hero-trial"
                onClick={onOpenRegister}
                className="w-full sm:w-auto bg-slate-900 text-white px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer rounded"
              >
                <span>{lang === 'ID' ? 'DAFTAR SEKOLAH BARU' : 'REGISTER SCHOOL'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {/* Secondary Border Button: MASUK KE SISTEM */}
              <button
                type="button"
                id="btn-hero-login"
                onClick={onOpenLogin}
                className="w-full sm:w-auto border border-slate-300 bg-white hover:bg-indigo-50 text-slate-900 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:border-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs rounded"
              >
                <span>{lang === 'ID' ? 'MASUK KE SISTEM' : 'ENTER SYSTEM'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

            </div>

            {/* Tiga Keunggulan Singkat: DUAL-MODE SD, HARI EFEKTIF, CETAK FORMAT DINAS */}
            <div className="pt-4 sm:pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-black text-indigo-700 tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0" />
                  {lang === 'ID' ? 'DUAL-MODE PRESENSI SD' : 'DUAL-MODE SD ATTENDANCE'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1">
                  {lang === 'ID' ? 'Presensi harian oleh Wali Kelas & presensi jam pelajaran oleh Guru Mapel.' : 'Daily homeroom logs & subject-by-subject attendance for specialized teachers.'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-black text-indigo-700 tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {lang === 'ID' ? 'HARI BELAJAR EFEKTIF' : 'EFFECTIVE SCHOOL DAYS'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1">
                  {lang === 'ID' ? 'Kalkulasi otomatis hari efektif per bulan & semester ganjil/genap.' : 'Automated effective learning days calculation by month & semester.'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-black text-indigo-700 tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  {lang === 'ID' ? 'CETAK FORMAT DINAS' : 'OFFICIAL DINAS REPORTS'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1">
                  {lang === 'ID' ? 'Rekapitulasi siap cetak A4 & PDF lengkap dengan tanda tangan Kepsek & Guru.' : 'Print-ready A4 reports complete with Principal & Teacher signatures.'}
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Editorial Device Mockup Display - Hidden on HP (mobile), visible on laptop/desktop */}
          <div className="hidden lg:flex lg:col-span-5 justify-center lg:justify-end relative">
            <DeviceMockup lang={lang} />
          </div>

        </div>
      </div>

    </section>
  );
};

