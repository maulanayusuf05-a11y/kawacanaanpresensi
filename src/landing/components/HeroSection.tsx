import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, School, Calendar, Users, Award, BookOpen } from 'lucide-react';
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
      className="relative min-h-[calc(100vh-80px)] pt-28 sm:pt-32 pb-16 lg:pt-36 lg:pb-24 flex items-center justify-center overflow-hidden bg-white text-slate-900 border-b border-blue-100"
    >
      {/* Educational Technical Grid & Blue Lighting Backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-grid-pattern opacity-60" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-b from-blue-50/50 via-transparent to-transparent pointer-events-none hidden lg:block" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/70 rounded-full blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl opacity-60 pointer-events-none" />

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Headline, Narrative, and CTAs */}
          <div className="w-full lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Educational Badge */}
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border border-blue-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <School className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>{lang === 'ID' ? 'SISTEM PRESENSI DIGITAL SEKOLAH DASAR' : 'PRIMARY SCHOOL DIGITAL ATTENDANCE SYSTEM'}</span>
              </div>

              {/* Main Headline - Authoritative Blue Display Typography */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-[56px] leading-[1.1] sm:leading-[1.05] font-black tracking-tight text-[#0B2F64] uppercase">
                {lang === 'ID' ? (
                  <>
                    PRESENSI SEKOLAH DASAR<br />
                    <span className="text-blue-600">LEBIH TERTIB & AKURAT</span>
                  </>
                ) : (
                  <>
                    PRIMARY ATTENDANCE<br />
                    <span className="text-blue-600">STRUCTURED & PRECISE</span>
                  </>
                )}
              </h1>

              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 pt-0.5">
                <span className="px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 text-[10px] font-extrabold font-mono">
                  TERPADU
                </span>
                <span>Kawacanaan Presensi • Platform Presensi Khusus Jenjang SD</span>
              </div>
            </div>

            {/* Narrative with Blue Border Accent */}
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl border-l-4 border-blue-600 pl-3 sm:pl-5 font-normal">
              {lang === 'ID' 
                ? "Sistem presensi digital terpadu untuk Sekolah Dasar. Mendukung presensi harian oleh Wali Kelas, presensi per mata pelajaran khusus (PJOK & Agama), penghitungan otomatis hari efektif belajar, hingga cetak laporan administrasi format dinas."
                : "Integrated digital attendance platform built specifically for Primary Schools. Supporting daily homeroom check-ins, specialized subject attendance (PE & Religious Studies), automatic effective school day calculations, and official administrative report exports."
              }
            </p>

            {/* Action Buttons Group with Blue Theme Styling */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1 w-full sm:w-auto">
              
              {/* Primary Blue Button: DAFTAR SEKOLAH BARU */}
              <button
                type="button"
                id="btn-hero-trial"
                onClick={onOpenRegister}
                className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 active:scale-95 text-white px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 cursor-pointer rounded-lg"
              >
                <span>{lang === 'ID' ? 'DAFTAR SEKOLAH BARU' : 'REGISTER SCHOOL'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {/* Secondary Button: MASUK KE SISTEM */}
              <button
                type="button"
                id="btn-hero-login"
                onClick={onOpenLogin}
                className="w-full sm:w-auto border-2 border-[#0B2F64] bg-white hover:bg-blue-50 text-[#0B2F64] px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs rounded-lg"
              >
                <span>{lang === 'ID' ? 'MASUK KE SISTEM' : 'ENTER SYSTEM'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

            </div>

            {/* Tiga Keunggulan Singkat: DUAL-MODE SD, HARI EFEKTIF, CETAK FORMAT DINAS */}
            <div className="pt-4 sm:pt-6 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl hover:border-blue-300 transition-colors">
                <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  {lang === 'ID' ? 'DUAL-MODE PRESENSI SD' : 'DUAL-MODE SD ATTENDANCE'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  {lang === 'ID' ? 'Presensi harian oleh Wali Kelas & presensi jam pelajaran oleh Guru Mapel.' : 'Daily homeroom logs & subject-by-subject attendance for specialized teachers.'}
                </p>
              </div>
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl hover:border-blue-300 transition-colors">
                <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  {lang === 'ID' ? 'HARI BELAJAR EFEKTIF' : 'EFFECTIVE SCHOOL DAYS'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  {lang === 'ID' ? 'Kalkulasi otomatis hari efektif per bulan & semester ganjil/genap.' : 'Automated effective learning days calculation by month & semester.'}
                </p>
              </div>
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl hover:border-blue-300 transition-colors">
                <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  {lang === 'ID' ? 'CETAK FORMAT DINAS' : 'OFFICIAL DINAS REPORTS'}
                </span>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  {lang === 'ID' ? 'Rekapitulasi siap cetak A4 & PDF lengkap dengan tanda tangan Kepsek & Guru.' : 'Print-ready A4 reports complete with Principal & Teacher signatures.'}
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Device Mockup Display */}
          <div className="hidden lg:flex lg:col-span-5 justify-center lg:justify-end relative">
            <DeviceMockup lang={lang} />
          </div>

        </div>
      </div>

    </section>
  );
};


