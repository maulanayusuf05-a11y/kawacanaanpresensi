import React from 'react';
import { 
  BarChart3, 
  Users, 
  Clock, 
  Smartphone, 
  ShieldCheck, 
  CalendarRange, 
  FileSpreadsheet, 
  CalendarDays,
  Check,
  BookOpen,
  School
} from 'lucide-react';

interface FeaturesSectionProps {
  lang: 'ID' | 'EN';
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ lang }) => {
  const features = lang === 'ID' ? [
    {
      icon: BarChart3,
      title: 'DASHBOARD PRESENSI SD',
      desc: 'Pantau kondisi kehadiran seluruh siswa SD secara real-time berdasarkan persentase kehadiran dan hari efektif belajar.',
      items: [
        'Total siswa terdaftar kelas 1-6',
        'Jumlah hadir hari ini',
        'Rekap sakit, izin, dan alfa',
        'Persentase kehadiran real-time',
        'Peringatan absensi berulang'
      ],
      badge: 'Real-time'
    },
    {
      icon: Clock,
      title: 'DUAL-MODE PRESENSI SD',
      desc: 'Mendukung pencatatan presensi harian oleh Wali Kelas serta presensi per jam mata pelajaran khusus (PJOK, PABP/Agama, dsb).',
      items: [
        'Presensi harian oleh Wali Kelas',
        'Presensi jam pelajaran Guru Mapel',
        'Catatan keterlambatan siswa',
        'Verifikasi cepat satu klik',
        'Sinkronisasi lintas guru'
      ],
      badge: 'Dual-Mode SD'
    },
    {
      icon: Users,
      title: 'ROMBEL & DATA SISWA SD',
      desc: 'Kelola data siswa jenjang Sekolah Dasar dari Kelas 1 sampai Kelas 6 secara rapi dengan NISN dan identitas lengkap.',
      items: [
        'Rombongan belajar Kelas 1 s/d 6',
        'Data NIS, NISN, & data wali',
        'Import & Export Excel/Dapodik',
        'Pencarian & filter siswa cepat',
        'Arsip riwayat kenaikan kelas'
      ],
      badge: 'Database SD'
    },
    {
      icon: CalendarDays,
      title: 'KALENDER & HARI EFEKTIF',
      desc: 'Kalkulasi otomatis hari belajar efektif bulanan dan semester ganjil/genap sesuai kalender pendidikan Dinas Pendidikan.',
      items: [
        'Penetapan hari efektif belajar',
        'Pengaturan hari libur nasional & cuti',
        'Jeda tengah semester & ujian',
        'Kalkulasi persentase akurat',
        'Sinkronisasi kalender dinas'
      ],
      badge: 'Otomatis'
    },
    {
      icon: CalendarRange,
      title: 'REKAPITULASI OTOMATIS',
      desc: 'Rekap kehadiran siswa terhitung otomatis tanpa perlu rumus Excel manual, tersaji per rombel maupun per siswa.',
      items: [
        'Rekapitulasi harian & mingguan',
        'Rekapitulasi bulanan kelas',
        'Rekapitulasi semester ganjil & genap',
        'Akumulasi H, S, I, A per siswa',
        'Filter per mata pelajaran'
      ],
      badge: 'Rekap Cepat'
    },
    {
      icon: FileSpreadsheet,
      title: 'LAPORAN & CETAK DINAS',
      desc: 'Cetak dokumen laporan presensi dan berita acara format standar A4 yang siap ditandatangani Kepala Sekolah & Guru.',
      items: [
        'Format A4 standar Dinas Pendidikan',
        'Export Excel terstruktur rapi',
        'Kolom tanda tangan Kepsek & Wali',
        'Siap lampiran SPJ & Akreditasi',
        'Download PDF instan'
      ],
      badge: 'Format Dinas'
    },
    {
      icon: Smartphone,
      title: 'PORTAL SISWA & WALI MURID',
      desc: 'Akses ramah siswa SD dan orang tua untuk memantau status kehadiran harian serta mengajukan izin atau sakit.',
      items: [
        'Cek status hadir masuk & pulang',
        'Jadwal mapel khusus hari ini',
        'Pengajuan izin & unggah surat sakit',
        'Riwayat kehadiran semester',
        'Tampilan simpel mudah diakses'
      ],
      badge: 'Portal Siswa'
    },
    {
      icon: ShieldCheck,
      title: 'MULTI-ROLE SEKOLAH DASAR',
      desc: 'Hak akses bertingkat yang disesuaikan dengan struktur organisasi SD agar data tetap aman dan terorganisir.',
      items: [
        'Super Admin & Admin Tata Usaha',
        'Kepala Sekolah Dasar',
        'Wali Kelas 1 s/d 6',
        'Guru Mapel (PJOK, Agama, dll)',
        'Siswa & Wali Murid'
      ],
      badge: 'Hak Akses'
    },
  ] : [
    {
      icon: BarChart3,
      title: 'PRIMARY SCHOOL DASHBOARD',
      desc: 'Monitor all elementary student attendance in real-time calculated against effective learning days.',
      items: [
        'Total enrolled students Grade 1-6',
        'Present count today',
        'Sick, leave, & unexcused totals',
        'Real-time attendance percentage',
        'Repeated absence alerts'
      ],
      badge: 'Real-time'
    },
    {
      icon: Clock,
      title: 'DUAL-MODE SD ATTENDANCE',
      desc: 'Supports daily homeroom check-ins by classroom teachers and subject-based logs by specialized teachers (PE, Religion, etc).',
      items: [
        'Daily homeroom teacher attendance',
        'Subject period attendance for specialists',
        'Lateness recording with timestamps',
        'One-click batch verification',
        'Cross-teacher synchronization'
      ],
      badge: 'Dual-Mode SD'
    },
    {
      icon: Users,
      title: 'CLASS & STUDENT RECORDS',
      desc: 'Manage elementary students from Grade 1 to 6 systematically with national student IDs and parent details.',
      items: [
        'Grade 1 through 6 study groups',
        'NIS, NISN, & guardian contacts',
        'Excel / Student registry import & export',
        'Quick student search & filters',
        'Grade promotion history archive'
      ],
      badge: 'SD Database'
    },
    {
      icon: CalendarDays,
      title: 'ACADEMIC CALENDAR & DAYS',
      desc: 'Automated calculation of monthly and semester effective learning days aligned with Ministry regulations.',
      items: [
        'Effective learning day configuration',
        'National holidays & school breaks',
        'Mid-semester & examination periods',
        'Accurate percentage calculations',
        'Official calendar synchronization'
      ],
      badge: 'Automated'
    },
    {
      icon: CalendarRange,
      title: 'AUTOMATED RECAPITULATION',
      desc: 'Attendance data is compiled automatically without manual spreadsheet formulas, available per class and per student.',
      items: [
        'Daily & weekly summaries',
        'Monthly classroom recaps',
        'Odd & even semester totals',
        'Accumulated present, sick, leave, unexcused',
        'Subject-specific breakdown'
      ],
      badge: 'Fast Recap'
    },
    {
      icon: FileSpreadsheet,
      title: 'OFFICIAL DINAS REPORTS',
      desc: 'Print official A4 attendance records and minutes ready for Principal and Teacher institutional signatures.',
      items: [
        'Standard Dinas Pendidikan A4 format',
        'Structured clean Excel export',
        'Principal & Homeroom signature boxes',
        'Accreditation & audit ready',
        'Instant PDF generation'
      ],
      badge: 'Dinas Format'
    },
    {
      icon: Smartphone,
      title: 'STUDENT & PARENT PORTAL',
      desc: 'Student-friendly interface for young learners and parents to verify daily attendance and submit sickness notes.',
      items: [
        'Daily check-in & check-out status',
        'Today specialized subject schedule',
        'Leave submission & doctor note upload',
        'Semester attendance log',
        'Clean & intuitive mobile layout'
      ],
      badge: 'Student Portal'
    },
    {
      icon: ShieldCheck,
      title: 'ROLE-BASED PERMISSIONS',
      desc: 'Structured hierarchical access tailored for Primary School operations to safeguard records and integrity.',
      items: [
        'Super Admin & Administrative Staff',
        'School Principal',
        'Homeroom Teachers (Grade 1-6)',
        'Specialized Subject Teachers',
        'Students & Parents'
      ],
      badge: 'Access Control'
    },
  ];

  return (
    <section id="fitur" className="py-16 sm:py-20 lg:py-24 bg-slate-50 text-slate-900 relative border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header - Editorial Aesthetic */}
        <div className="text-left max-w-3xl space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
            <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{lang === 'ID' ? 'FITUR UTAMA SEKOLAH DASAR' : 'PRIMARY SCHOOL CORE FEATURES'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? (
              <>
                SISTEM LENGKAP<br />
                <span className="text-indigo-600">PRESENSI SEKOLAH DASAR</span>
              </>
            ) : (
              <>
                COMPREHENSIVE<br />
                <span className="text-indigo-600">PRIMARY ATTENDANCE PLATFORM</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-indigo-200 pl-3 sm:pl-4 font-normal">
            {lang === 'ID' 
              ? 'Didesain khusus menyesuaikan tata kelola administrasi dan kurikulum Sekolah Dasar, dari rombel kelas 1-6 hingga rekap dinas.'
              : 'Specifically tailored to Primary School curricula and administrative workflows, from Grade 1-6 cohorts to official Dinas reporting.'}
          </p>
        </div>

        {/* Feature Cards Grid (8 Features) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                id={`feature-card-${idx}`}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal mb-4">
                    {feature.desc}
                  </p>

                  {/* Bullet points */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {lang === 'ID' ? 'Fitur & Kemampuan:' : 'Features & Capabilities:'}
                    </div>
                    {feature.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Check className="w-3 h-3 text-indigo-600 shrink-0 stroke-[3]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
