import React from 'react';
import { Check, Sparkles, QrCode } from 'lucide-react';

interface PricingSectionProps {
  onOpenRegister: (planId?: 'free' | 'teacher' | 'school') => void;
  lang: 'ID' | 'EN';
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenRegister, lang }) => {
  const plans = lang === 'ID'
    ? [
        {
          id: 'free' as const,
          name: 'PAKET MULAI/GRATIS',
          price: 'Rp0',
          period: '/bulan',
          tagline: 'Gratis khusus untuk 1 guru (wali kelas/mapel) dari 1 sekolah dengan fitur terbatas.',
          highlight: false,
          features: [
            'Hanya 1 Guru (Wali Kelas / Mapel)',
            'Khusus 1 Guru per Sekolah (Cek NPSN)',
            'Maksimal 32 Siswa SD',
            '1 Rombel Kelas',
            'Presensi Harian & Mapel Dasar',
            'Rekapitulasi Sederhana',
            'Akses Terbatas'
          ],
          ctaText: 'Mulai Gratis Sekarang',
          paymentNote: 'Khusus 1 Guru per Sekolah',
        },
        {
          id: 'teacher' as const,
          name: 'PAKET GURU',
          price: 'Rp31.000',
          period: '/bulan',
          tagline: 'Solusi mandiri untuk 1 guru (wali kelas/mapel), boleh dari sekolah yang sama.',
          highlight: false,
          features: [
            '1 Akun Guru (Wali Kelas / Mapel)',
            'Boleh dari Sekolah yang Sama',
            'Maksimal 32 Siswa SD',
            '1 Rombongan Belajar',
            'Presensi Lengkap & Mapel',
            'Cetak Laporan Format Dinas Kelas',
            'Ekspor Excel & PDF',
            'Fitur Terbuka Sebagian'
          ],
          ctaText: 'Pilih Paket Guru',
          paymentNote: 'QRIS Real-Time Settlement',
        },
        {
          id: 'school' as const,
          name: 'PAKET SEKOLAH',
          price: 'Rp270.000',
          period: '/bulan',
          tagline: 'Pengelolaan terpadu untuk 1 sekolah dengan 8 guru, 1 kepala sekolah, dan semua fitur terbuka.',
          highlight: true,
          badge: 'Rekomendasi Terbaik SD',
          features: [
            'Hanya untuk 1 Sekolah Dasar',
            '8 Akun Guru (Wali Kelas & Mapel)',
            '1 Akun Kepala Sekolah (+ 1 Admin)',
            'Hingga 8 Rombel (Maks. 32 Siswa/Kelas)',
            'Semua Fitur Terbuka Penuh',
            'Perhitungan Hari Efektif Otomatis',
            'Cetak Laporan A4 Resmi Dinas Semua Kelas',
            'Portal Siswa & Pengajuan Izin Mandiri',
            'Bantuan Migrasi Data Siswa',
            'Pembayaran QRIS & Faktur Resmi'
          ],
          ctaText: 'Pilih Paket Sekolah',
          paymentNote: 'QRIS / Semua Bank & E-Wallet',
        },
      ]
    : [
        {
          id: 'free' as const,
          name: 'STARTER / FREE PLAN',
          price: 'Rp0',
          period: '/month',
          tagline: 'Free tier strictly for 1 teacher from 1 elementary school with limited features.',
          highlight: false,
          features: [
            '1 Teacher (Homeroom or Subject)',
            'Strictly 1 Teacher per School (NPSN Check)',
            'Up to 32 Students',
            '1 Class Cohort',
            'Basic Daily Check-in',
            'Simple Attendance Recap',
            'Limited Feature Access'
          ],
          ctaText: 'Start Free',
          paymentNote: '1 Teacher per School Limit',
        },
        {
          id: 'teacher' as const,
          name: 'TEACHER PLAN',
          price: 'Rp31,000',
          period: '/month',
          tagline: 'Individual solution for 1 teacher, multiple teachers from same school allowed.',
          highlight: false,
          features: [
            '1 Teacher Account (Homeroom or Subject)',
            'Same School Multi-Teacher Allowed',
            'Up to 32 Students',
            '1 Class Group',
            'Complete Class Attendance',
            'Official Dinas Report Export',
            'Excel & PDF Data Export',
            'Partially Unlocked Features'
          ],
          ctaText: 'Select Teacher Plan',
          paymentNote: 'QRIS Instant Settlement',
        },
        {
          id: 'school' as const,
          name: 'SCHOOL PLAN',
          price: 'Rp270,000',
          period: '/month',
          tagline: 'Integrated management for 1 school: 8 teachers, 1 principal, and all features unlocked.',
          highlight: true,
          badge: 'Recommended for SD',
          features: [
            'Dedicated for 1 Primary School',
            '8 Teachers (Homeroom & Subject)',
            '1 Principal Account (+ 1 Admin)',
            'Up to 8 Classes (Max 32 Students/Class)',
            'All Features Completely Unlocked',
            'Automatic Effective Days Calculation',
            'Official A4 Dinas Printable Reports',
            'Student & Parent Self Portal',
            'Assisted Student Data Migration',
            'QRIS Payment & Official Receipt'
          ],
          ctaText: 'Select School Plan',
          paymentNote: 'QRIS / All E-Wallets & Banks',
        },
      ];

  return (
    <section id="harga" className="py-16 sm:py-20 lg:py-24 bg-slate-50 text-slate-900 relative border-b border-blue-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-left max-w-3xl space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider font-mono">
            <QrCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>{lang === 'ID' ? 'HARGA & PEMBAYARAN QRIS' : 'PRICING & QRIS PAYMENT'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0B2F64] tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? <>PAKET LISENSI <span className="text-blue-600">SEKOLAH DASAR</span></> : <>PRIMARY SCHOOL <span className="text-blue-600">PLANS</span></>}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-blue-600 pl-3 sm:pl-4">
            {lang === 'ID'
              ? 'Pilihan paket fleksibel untuk guru kelas mandiri maupun satu Sekolah Dasar secara terpadu dengan sistem pembayaran QRIS instan.'
              : 'Flexible plans for individual elementary teachers or complete school-wide institutional deployment with instant QRIS gateway.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              id={`pricing-card-${plan.id}`}
              className={`rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between transition-all relative ${
                plan.highlight
                  ? 'bg-[#0B2F64] text-white border-2 border-blue-900 shadow-2xl lg:-translate-y-2'
                  : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-8 px-3.5 py-1 rounded-md bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> {plan.badge}
                </div>
              )}

              <div>
                <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight mb-2 ${plan.highlight ? 'text-white' : 'text-[#0B2F64]'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-7 min-h-[42px] leading-relaxed ${plan.highlight ? 'text-blue-100' : 'text-slate-600'}`}>
                  {plan.tagline}
                </p>

                <div className={`mb-7 pb-7 border-b ${plan.highlight ? 'border-blue-800/80' : 'border-slate-100'}`}>
                  <div className={`text-4xl sm:text-5xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                    <span className={`text-base font-bold ml-1 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${plan.highlight ? 'text-blue-200' : 'text-blue-700'}`}>
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{plan.paymentNote}</span>
                  </div>
                </div>

                <div className="space-y-3.5 mb-8">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
                    {lang === 'ID' ? 'FITUR TERMASUK' : 'INCLUDED FEATURES'}
                  </div>
                  {plan.features.map((feat, i) => (
                    <div key={i} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-blue-50' : 'text-slate-700'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        plan.highlight ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenRegister(plan.id)}
                className={`w-full py-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 rounded-lg flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-950/40'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
                id={`btn-select-plan-${plan.id}`}
              >
                <span>{plan.ctaText}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
