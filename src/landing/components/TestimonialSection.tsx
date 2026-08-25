import React from 'react';
import { Quote, School, CheckCircle2 } from 'lucide-react';

interface TestimonialSectionProps {
  lang: 'ID' | 'EN';
}

export const TestimonialSection: React.FC<TestimonialSectionProps> = ({ lang }) => {
  const testimonials = lang === 'ID' ? [
    {
      id: '1',
      name: 'Bpk. Hendra Pratama, M.Pd.',
      role: 'Kepala Sekolah',
      school: 'SDN 04 Nusantara',
      initials: 'HP',
      content: 'Pencatatan kehadiran menjadi lebih rapi dan kami tidak perlu lagi mengumpulkan data dari banyak catatan.',
    },
    {
      id: '2',
      name: 'Ibu Siti Nurhaliza, S.Pd.',
      role: 'Wali Kelas & Guru',
      school: 'SD Bintang Kejora',
      initials: 'SN',
      content: 'Dashboard membantu kami melihat kondisi kehadiran siswa dengan lebih cepat.',
    },
    {
      id: '3',
      name: 'Bpk. Rizky Ramadhan, S.Kom.',
      role: 'Koordinator Tata Usaha',
      school: 'SD Al-Azhar Mandiri',
      initials: 'RR',
      content: 'Fitur presensi dan rekapitulasi membuat proses administrasi menjadi lebih terorganisir.',
    }
  ] : [
    {
      id: '1',
      name: 'Hendra Pratama, M.Pd.',
      role: 'School Principal',
      school: 'SDN 04 Nusantara',
      initials: 'HP',
      content: 'Attendance logging has become noticeably structured and we no longer have to aggregate data across disconnected records.',
    },
    {
      id: '2',
      name: 'Siti Nurhaliza, S.Pd.',
      role: 'Homeroom Teacher',
      school: 'SD Bintang Kejora',
      initials: 'SN',
      content: 'The dashboard empowers us to assess daily student attendance conditions much faster.',
    },
    {
      id: '3',
      name: 'Rizky Ramadhan, S.Kom.',
      role: 'Administrative Coordinator',
      school: 'SD Al-Azhar Mandiri',
      initials: 'RR',
      content: 'Digital attendance recording and recapitulation features keep all institutional administration truly organized.',
    }
  ];

  return (
    <section id="testimoni" className="py-16 sm:py-20 lg:py-24 bg-white text-slate-900 relative border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Editorial Style */}
        <div className="text-left max-w-3xl space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
            <span>{lang === 'ID' ? 'TESTIMONI PENGGUNA' : 'USER TESTIMONIALS'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? (
              <>
                ADMINISTRASI SEKOLAH<br />
                <span className="text-indigo-600">LEBIH PRAKTIS</span>
              </>
            ) : (
              <>
                MORE PRACTICAL<br />
                <span className="text-indigo-600">SCHOOL ADMINISTRATION</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-indigo-200 pl-3 sm:pl-4 font-normal">
            {lang === 'ID'
              ? 'Bagaimana ekosistem Kawacanaan membawa kepraktisan dan keteraturan nyata dalam operasional sekolah.'
              : 'How the Kawacanaan ecosystem delivers genuine practicality and order in day-to-day school operations.'}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              id={`testimonial-card-${t.id}`}
              className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col justify-between hover:border-slate-400 hover:bg-white hover:shadow-md transition-all shadow-2xs group"
            >
              <div>
                <Quote className="w-8 h-8 text-indigo-300 group-hover:text-indigo-600 transition-colors mb-6 stroke-[1.5]" />

                {/* Quote Content */}
                <p className="text-base sm:text-lg text-slate-800 leading-relaxed italic mb-8 font-normal">
                  "{t.content}"
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-5 border-t border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <div className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">{t.role}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <School className="w-3 h-3" /> {t.school}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
