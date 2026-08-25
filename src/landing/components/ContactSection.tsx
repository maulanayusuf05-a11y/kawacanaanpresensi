import React, { useState } from 'react';
import { 
  Mail, 
  MapPin, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  PhoneCall,
  School
} from 'lucide-react';

interface ContactSectionProps {
  lang: 'ID' | 'EN';
  onOpenRegister?: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ lang, onOpenRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    phone: '',
    role: 'Kepala Sekolah Dasar',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="kontak" className="py-16 sm:py-20 lg:py-24 bg-white text-slate-900 relative border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Editorial Style */}
        <div className="text-left max-w-3xl space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest font-mono">
            <span>{lang === 'ID' ? 'HUBUNGI KAMI' : 'CONTACT US'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight uppercase leading-[1.05]">
            {lang === 'ID' ? (
              <>
                KONSULTASI & ADOPSI<br />
                <span className="text-indigo-600">PRESENSI SEKOLAH DASAR</span>
              </>
            ) : (
              <>
                CONSULTATION & ADOPTION<br />
                <span className="text-indigo-600">PRIMARY ATTENDANCE</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-indigo-200 pl-3 sm:pl-4 font-normal">
            {lang === 'ID'
              ? 'Konsultasikan kebutuhan presensi rombel kelas 1-6 dan format administrasi Dinas untuk sekolah Anda.'
              : 'Consult attendance requirements for Grade 1-6 cohorts and official Dinas reporting formats for your school.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
            <a
              href="#form-kontak"
              className="px-6 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest transition-all rounded shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{lang === 'ID' ? 'KIRIM PESAN' : 'SEND MESSAGE'}</span>
            </a>
            <button
              onClick={onOpenRegister}
              className="px-6 py-3.5 bg-white border border-slate-300 hover:border-slate-900 text-slate-900 font-bold text-xs uppercase tracking-widest transition-all rounded shadow-2xs inline-flex items-center gap-2 cursor-pointer"
            >
              <School className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'ID' ? 'DAFTARKAN SEKOLAH' : 'REGISTER SCHOOL'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 space-y-8 shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">
                  {lang === 'ID' ? 'Informasi Kontak' : 'Contact Information'}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {lang === 'ID' ? 'Saluran Bantuan Resmi' : 'Official Support Channel'}
                </h3>
              </div>
              
              <div className="space-y-6 text-sm text-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {lang === 'ID' ? 'Layanan Bantuan (WhatsApp)' : 'Support Service (WhatsApp)'}
                    </div>
                    <div className="font-black text-slate-900 text-lg">0813-1249-8919</div>
                    <div className="text-[11px] font-medium text-emerald-700">
                      {lang === 'ID' ? 'Senin - Sabtu: 07.00 - 17.00 WIB' : 'Mon - Sat: 07:00 - 17:00 WIB'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {lang === 'ID' ? 'Email Resmi' : 'Official Email'}
                    </div>
                    <div className="font-bold text-slate-900 break-all">maulanayusuf05@guru.sd.belajar.id</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-slate-200/60 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {lang === 'ID' ? 'Kantor Layanan' : 'Service Office'}
                    </div>
                    <div className="font-medium text-slate-800 text-xs leading-relaxed">
                      Jl. Pendidikan No. 123, Kel. Merdeka, Kec. Nusantara, Kota Jakarta Pusat, DKI Jakarta 10110
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action */}
              <a
                href="https://wa.me/6281312498919?text=Halo%20Tim%20Kawacanaan,%20kami%20ingin%20berkonsultasi%20mengenai%20sistem%20presensi%20digital%20Sekolah%20Dasar."
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 rounded"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{lang === 'ID' ? 'Konsultasi via WhatsApp' : 'Consult via WhatsApp'}</span>
              </a>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div id="form-kontak" className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8 sm:p-10 shadow-xs">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {lang === 'ID' ? 'Pesan Telah Diterima!' : 'Message Received!'}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {lang === 'ID' ? (
                    <>Terima kasih Bpk/Ibu <strong>{formData.name}</strong> dari <strong>{formData.schoolName}</strong>. Tim Kawacanaan akan segera menghubungi Anda.</>
                  ) : (
                    <>Thank you Mr./Ms. <strong>{formData.name}</strong> from <strong>{formData.schoolName}</strong>. The Kawacanaan team will reach out to you shortly.</>
                  )}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer rounded"
                >
                  {lang === 'ID' ? 'Kirim Pesan Lain' : 'Send Another Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">
                    {lang === 'ID' ? 'Kirim Pertanyaan' : 'Send an Inquiry'}
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {lang === 'ID' ? 'Formulir Konsultasi Sekolah Dasar' : 'Primary School Consultation Form'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === 'ID' ? 'Nama Lengkap *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'ID' ? "contoh: Bpk. Hendra, S.Pd." : "e.g., John Doe, M.Ed."}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === 'ID' ? 'Nama Sekolah Dasar *' : 'Primary School Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'ID' ? "contoh: SDN 01 Merdeka" : "e.g., Merdeka Primary 01"}
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === 'ID' ? 'Nomor Kontak / WhatsApp *' : 'Contact / WhatsApp Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder={lang === 'ID' ? "contoh: 081234567890" : "e.g., +62 812 3456 7890"}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === 'ID' ? 'Peran / Jabatan' : 'Role / Position'}
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
                    >
                      <option>{lang === 'ID' ? 'Kepala Sekolah Dasar' : 'Primary School Principal'}</option>
                      <option>{lang === 'ID' ? 'Wali Kelas (Kelas 1-6)' : 'Homeroom Teacher (Grade 1-6)'}</option>
                      <option>{lang === 'ID' ? 'Guru Mapel (PJOK / Agama)' : 'Subject Teacher (PE / Religion)'}</option>
                      <option>{lang === 'ID' ? 'Tata Usaha / Operator SD' : 'Admin Staff / SD Operator'}</option>
                      <option>{lang === 'ID' ? 'Komite Sekolah / Yayasan' : 'School Committee / Foundation'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {lang === 'ID' ? 'Pesan atau Kebutuhan Sekolah' : 'Message or School Requirements'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={lang === 'ID' ? "Tuliskan kebutuhan presensi atau administrasi Sekolah Dasar Anda..." : "Describe your specific primary school attendance requirements..."}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white resize-none transition-colors"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs rounded"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === 'ID' ? 'KIRIM PESAN KONSULTASI' : 'SUBMIT INQUIRY'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
