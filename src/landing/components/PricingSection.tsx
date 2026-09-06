import React, { useState } from 'react';
import { Check, Sparkles, QrCode, PhoneCall, ArrowRight, ShieldCheck, Building2, User } from 'lucide-react';
import { formatRupiah } from '../../utils/packageSystem';

export type BillingCycle = 'monthly' | 'yearly';
export type PlanIdType = 'free' | 'teacher' | 'school' | 'custom';

interface PricingSectionProps {
  onOpenRegister: (planId?: PlanIdType) => void;
  lang: 'ID' | 'EN';
  customPackagesConfig?: any;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenRegister, lang, customPackagesConfig }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  // Ambil data harga dari customPackagesConfig (Super Admin) jika tersedia, atau gunakan default
  const freeConfig = customPackagesConfig?.guru_gratis;
  const teacherConfig = customPackagesConfig?.guru_pro;
  const schoolConfig = customPackagesConfig?.sekolah_pro;
  const customConfig = customPackagesConfig?.sekolah_custom;

  // Harga Bulanan & Tahunan
  const teacherMonthlyPrice = teacherConfig?.hargaBulanan ?? teacherConfig?.harga ?? 29000;
  const teacherYearlyPrice = teacherConfig?.hargaTahunan ?? 290000;

  const schoolMonthlyPrice = schoolConfig?.hargaBulanan ?? schoolConfig?.harga ?? 249000;
  const schoolYearlyPrice = schoolConfig?.hargaTahunan ?? 2490000;

  const plans = [
    // -------------------------------------------------------------
    // 1. PAKET GRATIS (Ruang Kerja Individu / Guru)
    // -------------------------------------------------------------
    {
      id: 'free' as const,
      name: lang === 'ID' ? 'PAKET GRATIS' : 'FREE PLAN',
      workspaceType: lang === 'ID' ? 'Ruang Kerja Individu' : 'Personal Workspace',
      workspaceIcon: User,
      price: 'Rp0',
      period: lang === 'ID' ? '/selamanya' : '/lifetime',
      savingsBadge: null,
      tagline: lang === 'ID'
        ? 'Akses dasar mandiri untuk 1 guru mengelola presensi harian 1 rombel tanpa biaya.'
        : 'Basic self-service access for 1 teacher to manage 1 class cohort with zero fees.',
      highlight: false,
      badge: null,
      features: freeConfig?.fitur && freeConfig.fitur.length > 0 ? freeConfig.fitur : [
        lang === 'ID' ? '1 Akun Guru (Wali Kelas Mandiri)' : '1 Teacher Account (Homeroom)',
        lang === 'ID' ? 'Maksimal 32 Siswa SD' : 'Up to 32 Elementary Students',
        lang === 'ID' ? '1 Rombongan Belajar / Kelas' : '1 Class Cohort',
        lang === 'ID' ? 'Presensi Pagi & Rekap Bulanan' : 'Daily Morning Check-in & Monthly Recap',
        lang === 'ID' ? 'Unduh Format Spreadsheet (Excel)' : 'Download Spreadsheet Recap (Excel)',
        lang === 'ID' ? 'Aktif Selamanya (Tanpa Expired)' : 'Active Forever (No Expiration)'
      ],
      ctaText: lang === 'ID' ? 'Mulai Gratis Sekarang' : 'Start for Free',
      ctaStyle: 'bg-slate-800 hover:bg-slate-900 text-white',
      paymentNote: lang === 'ID' ? 'Tanpa Kartu Kredit / Rp0' : 'No Credit Card Required',
      isCustom: false,
    },

    // -------------------------------------------------------------
    // 2. PAKET GURU (Ruang Kerja Individu Pro)
    // -------------------------------------------------------------
    {
      id: 'teacher' as const,
      name: lang === 'ID' ? 'PAKET GURU' : 'TEACHER PLAN',
      workspaceType: lang === 'ID' ? 'Ruang Kerja Individu Pro' : 'Teacher Workspace Pro',
      workspaceIcon: User,
      price: billingCycle === 'monthly'
        ? formatRupiah(teacherMonthlyPrice)
        : formatRupiah(teacherYearlyPrice),
      period: billingCycle === 'monthly'
        ? (lang === 'ID' ? '/bulan' : '/month')
        : (lang === 'ID' ? '/tahun' : '/year'),
      savingsBadge: billingCycle === 'yearly'
        ? (lang === 'ID' ? 'Hemat Rp58.000 / thn' : 'Save 2 Months')
        : null,
      tagline: lang === 'ID'
        ? 'Solusi lengkap bagi wali kelas atau guru mapel yang mengajar beberapa rombel belajar.'
        : 'Complete solution for teachers or subject specialists handling multiple classes.',
      highlight: false,
      badge: lang === 'ID' ? 'Favorit Guru SD' : 'Teacher Favorite',
      features: teacherConfig?.fitur && teacherConfig.fitur.length > 0 ? teacherConfig.fitur : [
        lang === 'ID' ? 'Semua Fitur Paket Gratis' : 'All Free Plan Features',
        lang === 'ID' ? 'Kelola s/d 5 Rombongan Belajar' : 'Manage up to 5 Class Cohorts',
        lang === 'ID' ? 'Kapasitas hingga 150 Siswa SD' : 'Up to 150 Elementary Students',
        lang === 'ID' ? 'Presensi Jam Mata Pelajaran' : 'Subject Schedule Check-in',
        lang === 'ID' ? 'Cetak Laporan Format Kedinasan' : 'Print Official Dinas Format',
        lang === 'ID' ? 'Ekspor Rekap Semester PDF & Excel' : 'Semester PDF & Excel Recap Export',
        lang === 'ID' ? 'Bantuan Teknis Cepat via WhatsApp' : 'Fast WhatsApp Technical Support'
      ],
      ctaText: lang === 'ID' ? 'Pilih Paket Guru' : 'Select Teacher Plan',
      ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      paymentNote: lang === 'ID' ? 'QRIS Real-Time Settlement' : 'QRIS Real-Time Settlement',
      isCustom: false,
    },

    // -------------------------------------------------------------
    // 3. PAKET SEKOLAH (Ruang Kerja Sekolah / Institusi)
    // -------------------------------------------------------------
    {
      id: 'school' as const,
      name: lang === 'ID' ? 'PAKET SEKOLAH' : 'SCHOOL PLAN',
      workspaceType: lang === 'ID' ? 'Ruang Kerja Sekolah (Institusi)' : 'School Workspace (Full)',
      workspaceIcon: Building2,
      price: billingCycle === 'monthly'
        ? formatRupiah(schoolMonthlyPrice)
        : formatRupiah(schoolYearlyPrice),
      period: billingCycle === 'monthly'
        ? (lang === 'ID' ? '/bulan' : '/month')
        : (lang === 'ID' ? '/tahun' : '/year'),
      savingsBadge: billingCycle === 'yearly'
        ? (lang === 'ID' ? 'Hemat Rp498.000 / thn' : 'Save 2 Months')
        : null,
      tagline: lang === 'ID'
        ? 'Sistem presensi terpadu 1 sekolah dasar: kepala sekolah, operator, seluruh guru & siswa.'
        : 'Integrated system for entire school: principal, operator, all teachers & students.',
      highlight: true,
      badge: lang === 'ID' ? 'Rekomendasi Utama SD' : 'Best Choice for SD',
      features: schoolConfig?.fitur && schoolConfig.fitur.length > 0 ? schoolConfig.fitur : [
        lang === 'ID' ? 'Seluruh Fitur Terbuka Penuh' : 'All Features Fully Unlocked',
        lang === 'ID' ? 'Semua Guru & Tenaga Kependidikan' : 'All Teachers & School Staff',
        lang === 'ID' ? 'Semua Rombel Kelas 1–6 (Paralel A/B/C)' : 'All Classes 1 to 6 (Parallel)',
        lang === 'ID' ? 'Kapasitas hingga 1.000 Siswa SD' : 'Capacity up to 1,000 Students',
        lang === 'ID' ? 'Perhitungan Hari Efektif Kalender' : 'Automatic Effective Days Calculation',
        lang === 'ID' ? 'Cetak Laporan Format Diknas Resmi' : 'Official Printable Dinas Reports',
        lang === 'ID' ? 'Kop Surat Resmi & Stempel Digital' : 'Official School Header & Stamp',
        lang === 'ID' ? 'Portal Siswa & Pengajuan Izin HP' : 'Student Portal & Self Excuse Form',
        lang === 'ID' ? 'Bantuan Migrasi & Unggah Data Awal' : 'Data Migration & Initial Setup Support'
      ],
      ctaText: lang === 'ID' ? 'Daftarkan Sekolah' : 'Register School',
      ctaStyle: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/25',
      paymentNote: lang === 'ID' ? 'QRIS / Semua Bank & Faktur' : 'QRIS & Official Receipt',
      isCustom: false,
    },

    // -------------------------------------------------------------
    // 4. PAKET CUSTOM (Ruang Kerja Yayasan / Dinas Pendidikan)
    // -------------------------------------------------------------
    {
      id: 'custom' as const,
      name: lang === 'ID' ? 'PAKET CUSTOM' : 'CUSTOM PLAN',
      workspaceType: lang === 'ID' ? 'Yayasan / Multi-Sekolah / Dinas' : 'Foundation / Multi-Campus',
      workspaceIcon: Building2,
      price: lang === 'ID' ? 'Kustom' : 'Custom',
      period: lang === 'ID' ? '/kontrak' : '/contract',
      savingsBadge: lang === 'ID' ? 'Sesuai Kebutuhan' : 'Tailored Tier',
      tagline: lang === 'ID'
        ? 'Solusi skala besar untuk Yayasan Pendidikan, Jaringan SD Terpadu, atau Dinas Pendidikan.'
        : 'Enterprise solutions for School Foundations, Integrated School Networks, or Education Offices.',
      highlight: false,
      badge: lang === 'ID' ? 'Enterprise' : 'Enterprise',
      features: customConfig?.fitur && customConfig.fitur.length > 0 ? customConfig.fitur : [
        lang === 'ID' ? 'Semua Fitur Paket Sekolah Lengkap' : 'All School Plan Features Included',
        lang === 'ID' ? 'Mendukung Multi-Sekolah / Cabang' : 'Multi-Campus / School Network',
        lang === 'ID' ? 'Kapasitas Siswa & Guru Skala Besar' : 'Large-Scale Student & Staff Capacity',
        lang === 'ID' ? 'Integrasi API Khusus / Dapodik' : 'Custom API Integration / Sync',
        lang === 'ID' ? 'Layanan White-Label (Domain Sendiri)' : 'White-Label Branding & Custom Domain',
        lang === 'ID' ? 'Pelatihan Langsung Guru & Operator' : 'On-site Staff Training & Onboarding',
        lang === 'ID' ? 'Dedicated Account Manager 24/7' : '24/7 Dedicated Account Manager'
      ],
      ctaText: lang === 'ID' ? 'Hubungi Tim Kami' : 'Contact Sales',
      ctaStyle: 'bg-slate-900 hover:bg-black text-white border border-slate-700',
      paymentNote: lang === 'ID' ? 'SPK / Invoice Institusi Resmi' : 'Formal Institutional Contract',
      isCustom: true,
    }
  ];

  const handleCtaClick = (plan: typeof plans[0]) => {
    if (plan.isCustom) {
      // Hubungi via WhatsApp atau Kontak
      const phone = '6281234567890';
      const text = encodeURIComponent(
        lang === 'ID'
          ? 'Halo Tim Kawacanaan SD, saya tertarik untuk konsultasi Paket Custom / Enterprise untuk yayasan/sekolah kami.'
          : 'Hello Kawacanaan Team, I would like to inquire about the Custom / Enterprise Plan for our schools.'
      );
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      onOpenRegister(plan.id);
    }
  };

  return (
    <section id="harga" className="py-16 sm:py-20 lg:py-24 bg-slate-50 text-slate-900 relative border-b border-blue-100 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Seksi */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider font-mono">
            <QrCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>{lang === 'ID' ? 'PILIHAN LISENSI & HARGA RESMI' : 'OFFICIAL LICENSING & PRICING'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0B2F64] tracking-tight uppercase leading-[1.1]">
            {lang === 'ID' ? (
              <>PILIH PAKET SESUAI <span className="text-blue-600">RUANG KERJA ANDA</span></>
            ) : (
              <>CHOOSE PLAN FOR YOUR <span className="text-blue-600">WORKSPACE</span></>
            )}
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {lang === 'ID'
              ? 'Paket ditentukan berdasarkan ruang kerja: mulai dari ruang kerja mandiri untuk 1 guru kelas hingga ruang kerja terpadu seluruh sekolah dasar.'
              : 'Plans are organized by workspace: from standalone personal workspaces for individual teachers to fully integrated institutional school deployment.'}
          </p>

          {/* Toggle Switch Periode Waktu: Bulanan vs Tahunan */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#0B2F64] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'ID' ? 'Tagihan Bulanan' : 'Monthly Billing'}
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-[#0B2F64] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{lang === 'ID' ? 'Tagihan Tahunan' : 'Yearly Billing'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse">
                  {lang === 'ID' ? 'Hemat 2 Bulan' : 'Save ~20%'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Kartu Berdampingan (Grid 1 -> 2 -> 4 Kolom) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const IconComponent = plan.workspaceIcon;

            return (
              <div
                key={plan.id}
                id={`pricing-card-${plan.id}`}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-[#0B2F64] to-[#071F42] text-white border-2 border-blue-600 shadow-2xl lg:-translate-y-2.5 ring-4 ring-blue-500/10'
                    : 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Badge Status / Rekomendasi */}
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-6 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${
                    plan.highlight
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-white/20'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div>
                  {/* Workspace Category Tag */}
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2 ${
                    plan.highlight ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span>{plan.workspaceType}</span>
                  </div>

                  {/* Plan Name */}
                  <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight mb-2 ${
                    plan.highlight ? 'text-white' : 'text-[#0B2F64]'
                  }`}>
                    {plan.name}
                  </h3>

                  {/* Tagline */}
                  <p className={`text-xs mb-6 min-h-[44px] leading-relaxed ${
                    plan.highlight ? 'text-blue-100' : 'text-slate-600'
                  }`}>
                    {plan.tagline}
                  </p>

                  {/* Price Block */}
                  <div className={`mb-6 pb-6 border-b ${
                    plan.highlight ? 'border-blue-800/80' : 'border-slate-100'
                  }`}>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                        plan.highlight ? 'text-white' : 'text-slate-900'
                      }`}>
                        {plan.price}
                      </span>
                      <span className={`text-xs font-bold ${
                        plan.highlight ? 'text-blue-200' : 'text-slate-500'
                      }`}>
                        {plan.period}
                      </span>
                    </div>

                    {/* Savings Tag for Yearly */}
                    {plan.savingsBadge && (
                      <div className="mt-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          plan.highlight
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {plan.savingsBadge}
                        </span>
                      </div>
                    )}

                    <div className={`mt-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      plan.highlight ? 'text-blue-200' : 'text-slate-500'
                    }`}>
                      <QrCode className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                      <span>{plan.paymentNote}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <div className={`text-[10px] font-black uppercase tracking-wider ${
                      plan.highlight ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      {lang === 'ID' ? 'FITUR UTAMA:' : 'KEY FEATURES:'}
                    </div>

                    {plan.features.map((feat: string, i: number) => (
                      <div key={i} className={`flex items-start gap-2.5 text-xs leading-snug ${
                        plan.highlight ? 'text-blue-50' : 'text-slate-700'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.highlight ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => handleCtaClick(plan)}
                  className={`w-full py-3.5 px-4 text-xs font-black uppercase tracking-wider transition-all cursor-pointer rounded-xl flex items-center justify-center gap-2 active:scale-95 ${plan.ctaStyle}`}
                  id={`btn-select-plan-${plan.id}`}
                >
                  <span>{plan.ctaText}</span>
                  {plan.isCustom ? (
                    <PhoneCall className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Banner Keamanan & Transparansi di Bawah Kartu */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-slate-200 text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {lang === 'ID' ? 'Transparan, Aman, dan Tanpa Biaya Tersembunyi' : 'Transparent, Secure & No Hidden Costs'}
              </div>
              <div className="text-[11px] text-slate-500">
                {lang === 'ID'
                  ? 'Paket Gratis tetap aktif selamanya tanpa pemblokiran. Paket berbayar didukung invoice resmi sekolah.'
                  : 'Free Plan remains active forever without lockdowns. Paid plans include formal school invoices.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <span>{lang === 'ID' ? 'Butuh bantuan memilih paket?' : 'Need guidance choosing a plan?'}</span>
            <a
              href="#kontak"
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              {lang === 'ID' ? 'Konsultasi Gratis' : 'Free Consultation'}
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
