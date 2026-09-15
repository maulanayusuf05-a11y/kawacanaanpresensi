import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

interface FaqSectionProps {
  lang: 'ID' | 'EN';
  onOpenRegister: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ lang, onOpenRegister }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = lang === 'ID' ? [
    {
      q: 'Apakah Kawacanaan dapat digunakan oleh semua sekolah?',
      a: 'Ya. Sistem dapat dikonfigurasi sesuai kebutuhan data dan operasional sekolah.'
    },
    {
      q: 'Siapa saja yang dapat menggunakan Kawacanaan?',
      a: 'Sistem mendukung beberapa peran, seperti Admin, Kepala Sekolah, Wali Kelas/Guru, dan Siswa.'
    },
    {
      q: 'Apakah siswa dapat melakukan presensi sendiri?',
      a: 'Ya. Sekolah dapat mengaktifkan fitur presensi mandiri siswa sesuai kebutuhan.'
    },
    {
      q: 'Apakah data kehadiran dapat direkap?',
      a: 'Ya. Sistem menyediakan rekapitulasi berdasarkan periode tertentu, termasuk harian, mingguan, bulanan, dan semester.'
    },
    {
      q: 'Apakah laporan dapat digunakan untuk kebutuhan administrasi sekolah?',
      a: 'Ya. Data kehadiran dapat disusun menjadi laporan berdasarkan periode yang dipilih.'
    },
    {
      q: 'Apakah setiap pengguna memiliki akses yang sama?',
      a: 'Tidak. Akses sistem disesuaikan berdasarkan peran pengguna.'
    }
  ] : [
    {
      q: 'Can Kawacanaan be used by any type of school?',
      a: 'Yes. The system can be configured flexibly according to the specific data structures and operational workflows of your school.'
    },
    {
      q: 'Who can use the Kawacanaan platform?',
      a: 'The system supports distinct role-based access for Administrators, School Principals, Homeroom/Subject Teachers, and Students.'
    },
    {
      q: 'Can students record their attendance independently?',
      a: 'Yes. Schools can enable student self check-in features via individual mobile or web devices as needed.'
    },
    {
      q: 'Can attendance records be summarized automatically?',
      a: 'Yes. The system generates automatic recapitulation across customizable periods including daily, weekly, monthly, and semester views.'
    },
    {
      q: 'Are reports suitable for official school administration?',
      a: 'Yes. Attendance records are readily formatted into structured printable PDFs and Excel spreadsheets for institutional filing.'
    },
    {
      q: 'Does every user have the same level of access?',
      a: 'No. Access permissions and administrative capabilities are strictly scoped by user roles to ensure security and privacy.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-20 lg:py-24 bg-white text-slate-900 relative border-b border-blue-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-left space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
            <span>{lang === 'ID' ? 'TANYA JAWAB' : 'FREQUENTLY ASKED QUESTIONS'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0B2F64] tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? (
              <>
                PERTANYAAN<br />
                <span className="text-blue-600">SERING DITANYAKAN</span>
              </>
            ) : (
              <>
                COMMON<br />
                <span className="text-blue-600">QUESTIONS & ANSWERS</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-blue-600 pl-3 sm:pl-4 font-normal">
            {lang === 'ID'
              ? 'Jawaban lengkap seputar fitur, akses pengguna, dan implementasi sistem Kawacanaan.'
              : 'Complete answers regarding features, user access levels, and system implementation of Kawacanaan.'}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                id={`faq-item-${idx}`}
                className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'border-blue-600 bg-blue-50/30 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/60 hover:border-blue-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded shrink-0">
                      0{idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {faq.q}
                    </h3>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-blue-100/60 mt-2 pt-4 pl-12 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Hotline Note */}
        <div className="mt-12 text-center p-6 bg-blue-50/60 border border-blue-200 rounded-xl">
          <p className="text-xs text-slate-600">
            {lang === 'ID' ? 'Punya pertanyaan spesifik lain seputar sekolah Anda? ' : 'Have specific questions about your institution? '}
            <button
              onClick={onOpenRegister}
              className="text-blue-700 font-bold hover:underline cursor-pointer"
            >
              {lang === 'ID' ? 'Hubungi Tim Konsultan Kami' : 'Contact Our Consulting Team'}
            </button>
          </p>
        </div>

      </div>
    </section>
  );
};
