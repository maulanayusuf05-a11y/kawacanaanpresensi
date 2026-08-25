import React from 'react';
import { 
  Users, 
  Settings2, 
  Database, 
  Activity, 
  FileText, 
  Lock, 
  Cloud, 
  School,
  CalendarCheck,
  Award
} from 'lucide-react';

interface AdvantagesSectionProps {
  lang: 'ID' | 'EN';
  onOpenRegister: () => void;
}

export const AdvantagesSection: React.FC<AdvantagesSectionProps> = ({ lang, onOpenRegister }) => {
  const advantages = lang === 'ID' ? [
    {
      num: '01',
      title: 'ALUR KHUSUS SEKOLAH DASAR',
      desc: 'Disesuaikan dengan pola pengajaran SD: presensi kelas oleh Wali Kelas dan presensi jam pelajaran oleh Guru Mapel khusus (PJOK & Agama).',
      icon: School,
    },
    {
      num: '02',
      title: 'HARI EFEKTIF OTOMATIS',
      desc: 'Menghitung hari belajar efektif per bulan dan per semester secara otomatis berdasarkan kalender akademik SD tanpa rumus manual.',
      icon: CalendarCheck,
    },
    {
      num: '03',
      title: 'FORMAT CETAK STANDAR DINAS',
      desc: 'Dokumen rekapitulasi kehadiran A4 terstruktur rapi dengan kolom tanda tangan Kepala Sekolah & Wali Kelas, siap lampiran audit/akreditasi.',
      icon: FileText,
    },
    {
      num: '04',
      title: 'DATABASE ROMBEL 1-6 RAPI',
      desc: 'Penyimpanan data siswa dari kelas 1 sampai kelas 6 terpusat, mendukung nomor NIS, NISN, dan arsip data per tahun ajaran.',
      icon: Database,
    },
    {
      num: '05',
      title: 'MONITORING KEPSEK & TU',
      desc: 'Kepala Sekolah dan staf Tata Usaha dapat memantau tingkat kehadiran seluruh kelas secara real-time dari satu dashboard utama.',
      icon: Activity,
    },
    {
      num: '06',
      title: 'HAK AKSES MULTI-PERAN',
      desc: 'Pembagian wewenang yang jelas antara Super Admin, Kepala SD, Wali Kelas, Guru Mapel, dan Akun Siswa demi keamanan data.',
      icon: Lock,
    },
    {
      num: '07',
      title: 'BERBASIS CLOUD & MULTI-DEVICE',
      desc: 'Dapat diakses melalui laptop di ruang guru maupun smartphone wali kelas saat di kelas tanpa perlu instalasi server fisik.',
      icon: Cloud,
    },
    {
      num: '08',
      title: 'PORTAL RAMAH SISWA & WALI',
      desc: 'Antarmuka sederhana dan mudah dipahami siswa SD dan orang tua untuk melihat status presensi dan mengajukan surat izin.',
      icon: Users,
    },
  ] : [
    {
      num: '01',
      title: 'PRIMARY SCHOOL WORKFLOW',
      desc: 'Customized for elementary schooling: daily classroom logs by Homeroom teachers and subject logs by specialist teachers (PE & Religion).',
      icon: School,
    },
    {
      num: '02',
      title: 'AUTO EFFECTIVE SCHOOL DAYS',
      desc: 'Automatically calculates monthly and semester effective learning days based on educational calendars without manual calculation.',
      icon: CalendarCheck,
    },
    {
      num: '03',
      title: 'OFFICIAL DINAS PRINT FORMAT',
      desc: 'Standard A4 printable reports equipped with Principal and Homeroom signature boxes, ready for audit and accreditation filings.',
      icon: FileText,
    },
    {
      num: '04',
      title: 'ORGANIZED GRADE 1-6 DATABASE',
      desc: 'Centralized storage for Grade 1-6 cohorts with national student IDs, guardian records, and academic year archives.',
      icon: Database,
    },
    {
      num: '05',
      title: 'REAL-TIME PRINCIPAL OVERSIGHT',
      desc: 'Principals and administrative staff can monitor school-wide attendance rates across all grades instantly from one dashboard.',
      icon: Activity,
    },
    {
      num: '06',
      title: 'STRUCTURED ROLE PERMISSIONS',
      desc: 'Strict permission boundaries separating Super Admins, Principals, Homeroom Teachers, Subject Teachers, and Student accounts.',
      icon: Lock,
    },
    {
      num: '07',
      title: 'CLOUD-BASED & CROSS-DEVICE',
      desc: 'Accessible via teachers room laptops or smartphones directly in the classroom without needing physical server setups.',
      icon: Cloud,
    },
    {
      num: '08',
      title: 'STUDENT & PARENT FRIENDLY',
      desc: 'Intuitive and accessible design for young students and guardians to check daily attendance and submit sick leaves.',
      icon: Users,
    },
  ];

  return (
    <section id="keunggulan" className="py-16 sm:py-20 lg:py-24 bg-white text-slate-900 relative border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Editorial Style */}
        <div className="text-left max-w-3xl space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{lang === 'ID' ? 'KEUNGGULAN SISTEM SD' : 'PRIMARY SYSTEM ADVANTAGES'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? (
              <>
                KEUNGGULAN KHUSUS<br />
                <span className="text-indigo-600">SEKOLAH DASAR</span>
              </>
            ) : (
              <>
                PURPOSE-BUILT FOR<br />
                <span className="text-indigo-600">PRIMARY SCHOOLS</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-indigo-200 pl-3 sm:pl-4 font-normal">
            {lang === 'ID'
              ? 'Menjawab kebutuhan nyata guru dan kepala sekolah dasar di Indonesia: presensi cepat, perhitungan hari efektif tepat, dan berkas dinas lengkap.'
              : 'Addressing the real needs of elementary teachers and principals in Indonesia: rapid check-ins, exact learning days, and complete Dinas documentation.'}
          </p>
        </div>

        {/* 8 Advantages Grid with Editorial Numbering */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                id={`advantage-card-${idx}`}
                className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:border-indigo-400 hover:bg-white hover:shadow-md transition-all shadow-2xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-indigo-600/60 group-hover:text-indigo-600 transition-colors">
                      {item.num}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>{lang === 'ID' ? 'Fitur Terintegrasi' : 'Integrated Feature'}</span>
                  <span className="text-indigo-600">{lang === 'ID' ? '✓ Siap Pakai' : '✓ Ready'}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
