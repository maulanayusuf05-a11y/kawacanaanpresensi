import React from 'react';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';

interface BlogSectionProps {
  lang: 'ID' | 'EN';
}

export const BlogSection: React.FC<BlogSectionProps> = ({ lang }) => {
  const categories = lang === 'ID' ? [
    {
      name: 'DIGITALISASI SEKOLAH',
      desc: 'Membahas perkembangan teknologi untuk mendukung administrasi dan pembelajaran.'
    },
    {
      name: 'MANAJEMEN KEHADIRAN',
      desc: 'Tips mengelola data kehadiran siswa dengan lebih efektif.'
    },
    {
      name: 'ADMINISTRASI SEKOLAH',
      desc: 'Informasi dan solusi untuk membantu pekerjaan administrasi sekolah.'
    }
  ] : [
    {
      name: 'SCHOOL DIGITALIZATION',
      desc: 'Discussing technological advancements that support administration and learning workflows.'
    },
    {
      name: 'ATTENDANCE MANAGEMENT',
      desc: 'Actionable tips for managing student attendance data with precision and ease.'
    },
    {
      name: 'SCHOOL ADMINISTRATION',
      desc: 'Insights and streamlined solutions to assist school administrative staff and educators.'
    }
  ];

  const posts = lang === 'ID' ? [
    {
      id: '1',
      title: 'Mengapa Sekolah Perlu Beralih ke Sistem Presensi Digital?',
      category: 'DIGITALISASI SEKOLAH',
      readTime: '4 menit baca',
      date: '18 Agu 2026',
      snippet: 'Membahas perkembangan teknologi untuk mendukung administrasi presensi dan pembelajaran yang lebih terstruktur di era modern.',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '2',
      title: 'Cara Mengelola Rekap Kehadiran Siswa dengan Lebih Efisien',
      category: 'MANAJEMEN KEHADIRAN',
      readTime: '5 menit baca',
      date: '12 Agu 2026',
      snippet: 'Tips praktis menyusun dan menganalisis rekapitulasi presensi harian, mingguan, hingga semester tanpa kesalahan manual.',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '3',
      title: 'Digitalisasi Administrasi Sekolah: Dari Data hingga Laporan',
      category: 'ADMINISTRASI SEKOLAH',
      readTime: '6 menit baca',
      date: '05 Agu 2026',
      snippet: 'Informasi dan solusi terintegrasi untuk menyederhanakan alur pekerjaan tata usaha dan dewan guru di lingkungan sekolah.',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80',
    }
  ] : [
    {
      id: '1',
      title: 'Why Should Schools Transition to Digital Attendance Systems?',
      category: 'SCHOOL DIGITALIZATION',
      readTime: '4 min read',
      date: 'Aug 18, 2026',
      snippet: 'Exploring how technology modernizes attendance administration and structured school learning in the digital era.',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '2',
      title: 'How to Manage Student Attendance Summaries Efficiently',
      category: 'ATTENDANCE MANAGEMENT',
      readTime: '5 min read',
      date: 'Aug 12, 2026',
      snippet: 'Practical tips to compile and analyze daily, weekly, and semester-long attendance recaps without manual human errors.',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '3',
      title: 'School Administration Digitization: From Data to Reporting',
      category: 'SCHOOL ADMINISTRATION',
      readTime: '6 min read',
      date: 'Aug 05, 2026',
      snippet: 'Integrated insights and workflow solutions to simplify administrative tasks for school staff and teachers.',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80',
    }
  ];

  return (
    <section id="blog" className="py-16 sm:py-20 lg:py-24 bg-slate-50 text-slate-900 relative border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Educational Style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
              <span>{lang === 'ID' ? 'BLOG & INFORMASI' : 'BLOG & INSIGHTS'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0B2F64] tracking-tight uppercase leading-[1.05]">
              {lang === 'ID' ? (
                <>
                  TIPS &<br />
                  <span className="text-blue-600">DIGITALISASI SEKOLAH</span>
                </>
              ) : (
                <>
                  TIPS &<br />
                  <span className="text-blue-600">SCHOOL DIGITALIZATION</span>
                </>
              )}
            </h2>
            <p className="text-slate-600 text-xs sm:text-base lg:text-lg max-w-2xl border-l-4 border-blue-600 pl-3 sm:pl-4 font-normal">
              {lang === 'ID'
                ? 'Edukasi, wawasan, dan panduan praktis pengelolaan presensi dan administrasi sekolah.'
                : 'Education, insights, and practical guides for school attendance and administrative management.'}
            </p>
          </div>

          <a 
            href="#blog" 
            className="text-blue-700 hover:text-blue-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 self-start md:self-auto py-2 border-b-2 border-blue-700"
          >
            <span>{lang === 'ID' ? 'Lihat Semua Artikel' : 'View All Articles'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Categories Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {categories.map((cat, idx) => (
            <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block mb-1">
                {cat.name}
              </span>
              <p className="text-xs text-slate-600 font-normal">
                {cat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {posts.map((post) => (
            <article
              key={post.id}
              id={`blog-card-${post.id}`}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between shadow-xs"
            >
              <div>
                {/* Thumbnail image - Hidden on HP (mobile), visible on laptop & desktop */}
                <div className="relative aspect-16/10 overflow-hidden bg-slate-100 hidden md:block">
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 bg-[#0B2F64] text-white px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-xs">
                    {post.category}
                  </span>
                </div>

                <div className="p-5 sm:p-6 lg:p-7 space-y-3">
                  {/* Category badge visible on mobile when image is hidden */}
                  <div className="md:hidden">
                    <span className="inline-block bg-[#0B2F64] text-white px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {post.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {post.readTime}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-[#0B2F64] group-hover:text-blue-600 transition-colors leading-snug uppercase">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {post.snippet}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 pt-0">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 group-hover:text-blue-900 flex items-center gap-1">
                  {lang === 'ID' ? 'Baca Selengkapnya →' : 'Read Full Article →'}
                </span>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
};
