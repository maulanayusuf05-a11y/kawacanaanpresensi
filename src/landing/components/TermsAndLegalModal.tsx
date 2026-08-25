import React, { useState } from 'react';
import {
  X,
  Shield,
  FileText,
  BookOpen,
  CheckCircle2,
  Lock,
  UserCheck,
  Building2,
  Users,
  GraduationCap,
  AlertCircle,
  HelpCircle,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';

export type LegalTabType = 'terms' | 'privacy' | 'guide';

interface TermsAndLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
  lang: 'ID' | 'EN';
}

export const TermsAndLegalModal: React.FC<TermsAndLegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initial tab when reopened
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black uppercase tracking-tight text-white text-base sm:text-lg">
                  {lang === 'ID' ? 'Pusat Kebijakan & Bantuan' : 'Policy & Help Center'}
                </h3>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                  Kawacanaan
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                {lang === 'ID'
                  ? 'Dokumentasi resmi sistem presensi dan manajemen kesiswaan digital'
                  : 'Official documentation for digital attendance and student management'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title={lang === 'ID' ? 'Cetak Dokumen' : 'Print Document'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'ID' ? 'Cetak' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'ID' ? 'Syarat & Ketentuan' : 'Terms & Conditions'}</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{lang === 'ID' ? 'Kebijakan Privasi' : 'Privacy Policy'}</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lang === 'ID' ? 'Panduan Pengguna' : 'User Guide'}</span>
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'ID' ? 'Cari pasal atau topik...' : 'Search clauses or topics...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-700 text-sm leading-relaxed space-y-8 bg-white">
          
          {/* TAB 1: SYARAT & KETENTUAN (TERMS & CONDITIONS) */}
          {activeTab === 'terms' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              
              {/* Document Banner */}
              <div className="p-5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    {lang === 'ID' ? 'Dokumen Resmi' : 'Official Document'}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lang === 'ID' ? 'Terakhir diperbarui: 20 Agustus 2026' : 'Last updated: August 20, 2026'}</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {lang === 'ID' ? 'Syarat & Ketentuan Penggunaan Kawacanaan' : 'Kawacanaan Terms & Conditions of Use'}
                </h2>

                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
                  {lang === 'ID'
                    ? 'Dengan menggunakan Kawacanaan, pengguna dianggap telah membaca, memahami, dan menyetujui Syarat & Ketentuan penggunaan sistem berikut.'
                    : 'By using Kawacanaan, users are deemed to have read, understood, and agreed to the following System Terms & Conditions.'}
                </p>
              </div>

              {/* Quick TOC Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-[11px] uppercase">1. Ketentuan Umum</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Sistem Info Pendidikan</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-[11px] uppercase">2. Akun & Hak Akses</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">4 Role Pengguna</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-[11px] uppercase">3. Data & Presensi</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Integritas & Akurasi</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-[11px] uppercase">4. Keamanan & SLA</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ketersediaan Sistem</div>
                </div>
              </div>

              {/* SECTION 1 */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">1</span>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">
                    {lang === 'ID' ? 'Ketentuan Umum' : 'General Provisions'}
                  </h3>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed pl-8">
                  {lang === 'ID'
                    ? 'Kawacanaan merupakan sistem informasi pendidikan yang digunakan untuk membantu sekolah dalam mengelola data siswa, pengguna, absensi, kalender akademik, rekapitulasi, laporan, dan layanan pendidikan lainnya.'
                    : 'Kawacanaan is an educational information system designed to assist schools in managing student records, users, attendance, academic calendars, summaries, reports, and other educational services.'}
                </p>
              </section>

              {/* SECTION 2 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">2</span>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">
                    {lang === 'ID' ? 'Akun Pengguna' : 'User Accounts'}
                  </h3>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 pl-8">
                  <p>
                    {lang === 'ID'
                      ? 'Setiap pengguna mendapatkan akun sesuai dengan kebutuhan dan kewenangan yang diberikan oleh pihak sekolah.'
                      : 'Each user is provisioned an account aligned with the requirements and authority designated by the school administration.'}
                  </p>
                  <p>
                    {lang === 'ID'
                      ? 'Pengguna bertanggung jawab atas seluruh aktivitas yang dilakukan menggunakan akun miliknya.'
                      : 'Users maintain full responsibility for all activities conducted under their respective accounts.'}
                  </p>
                  <p className="font-semibold text-slate-800">
                    {lang === 'ID' ? 'Pengguna wajib menjaga kerahasiaan:' : 'Users are required to maintain the confidentiality of:'}
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Username / NIP / NISN</li>
                    <li>{lang === 'ID' ? 'Kata sandi / PIN Keamanan' : 'Password / Security PIN'}</li>
                    <li>{lang === 'ID' ? 'Informasi autentikasi lainnya' : 'Other authentication credentials'}</li>
                  </ul>
                  <p className="text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-xs">
                    ⚠️ {lang === 'ID' ? 'Pengguna tidak diperbolehkan memberikan akun kepada orang lain.' : 'Users are strictly prohibited from sharing their account credentials with any unauthorized party.'}
                  </p>
                </div>
              </section>

              {/* SECTION 3 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">3</span>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">
                    {lang === 'ID' ? 'Hak Akses & Role Pengguna' : 'Access Rights & User Roles'}
                  </h3>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm pl-8">
                  {lang === 'ID'
                    ? 'Setiap pengguna memiliki hak akses berdasarkan role yang diberikan oleh sistem:'
                    : 'Each user operates within specified access rights assigned by system roles:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-8">
                  {/* ADMIN */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                      <Lock className="w-4 h-4" />
                      <span>ADMIN / TATA USAHA</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {lang === 'ID'
                        ? 'Admin bertanggung jawab terhadap pengelolaan sistem, data, pengguna, dan konfigurasi sesuai dengan kewenangannya.'
                        : 'Administrators are responsible for system management, database records, user provisioning, and institution configurations.'}
                    </p>
                  </div>

                  {/* KEPALA SEKOLAH */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                      <Building2 className="w-4 h-4" />
                      <span>{lang === 'ID' ? 'KEPALA SEKOLAH' : 'SCHOOL PRINCIPAL'}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {lang === 'ID'
                        ? 'Kepala Sekolah dapat mengakses informasi, rekapitulasi, grafik analitik, dan laporan manajerial sesuai dengan hak akses yang diberikan.'
                        : 'Principals may access school-wide insights, attendance summaries, analytical charts, and managerial reports.'}
                    </p>
                  </div>

                  {/* WALI KELAS */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                      <UserCheck className="w-4 h-4" />
                      <span>{lang === 'ID' ? 'WALI KELAS / GURU' : 'HOMEROOM TEACHER'}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {lang === 'ID'
                        ? 'Wali Kelas dapat mengelola dan memantau data serta kehadiran siswa dalam rombel kelas sesuai dengan kewenangannya.'
                        : 'Homeroom teachers manage and monitor classroom attendance data, daily logs, and verification of excuse notes.'}
                    </p>
                  </div>

                  {/* SISWA */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4" />
                      <span>{lang === 'ID' ? 'SISWA & WALI MURID' : 'STUDENTS & PARENTS'}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {lang === 'ID'
                        ? 'Siswa dapat menggunakan fitur yang disediakan untuk akun siswa, termasuk Portal Siswa dan presensi mandiri apabila fitur tersebut diaktifkan.'
                        : 'Students and parents access student portal features, progress summaries, and self-check-in if enabled by the school.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* SECTION 4 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">4</span>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">
                    {lang === 'ID' ? 'Penggunaan Sistem & Larangan' : 'System Usage & Prohibitions'}
                  </h3>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 pl-8">
                  <p>
                    {lang === 'ID'
                      ? 'Pengguna wajib menggunakan sistem untuk tujuan yang sesuai dengan kebutuhan pendidikan dan administrasi sekolah.'
                      : 'Users must utilize the system strictly for educational, administrative, and verified school operations.'}
                  </p>
                  <p className="font-semibold text-slate-800">
                    {lang === 'ID' ? 'Pengguna dilarang keras menggunakan sistem untuk:' : 'Users are strictly prohibited from:'}
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>{lang === 'ID' ? 'Melakukan tindakan yang merugikan pihak lain.' : 'Engaging in harmful or defamatory conduct against any party.'}</li>
                    <li>{lang === 'ID' ? 'Mengakses data tanpa kewenangan yang sah.' : 'Accessing unauthorized institutional records or data.'}</li>
                    <li>{lang === 'ID' ? 'Memanipulasi atau memalsukan data kehadiran dan rekap.' : 'Manipulating, altering, or falsifying attendance records.'}</li>
                    <li>{lang === 'ID' ? 'Mengganggu kinerja server atau kestabilan sistem.' : 'Disrupting server infrastructure or system stability.'}</li>
                    <li>{lang === 'ID' ? 'Mencoba melewati mekanisme keamanan atau enkripsi.' : 'Attempting to bypass authentication or security protocols.'}</li>
                    <li>{lang === 'ID' ? 'Menggunakan akun milik pengguna lain tanpa izin.' : 'Impersonating or using another user’s account.'}</li>
                  </ul>
                </div>
              </section>

              {/* SECTION 5 & 6 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">5</span>
                    <h4 className="font-black text-slate-900 uppercase text-xs">
                      {lang === 'ID' ? 'Data Siswa' : 'Student Data Protection'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Data siswa harus dimasukkan dan dikelola secara bertanggung jawab. Pengguna yang memiliki akses wajib menjaga kerahasiaan informasi tersebut dan tidak menggunakannya untuk kepentingan di luar sekolah.'
                      : 'Student records must be entered and managed responsibly. Authorized users must maintain privacy and refrain from utilizing student info for non-school purposes.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">6</span>
                    <h4 className="font-black text-slate-900 uppercase text-xs">
                      {lang === 'ID' ? 'Data Absensi' : 'Attendance Integrity'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Data absensi harus dicatat berdasarkan kondisi kehadiran siswa yang sebenarnya. Pengguna dilarang sengaja memanipulasi data presensi.'
                      : 'Attendance logs must accurately reflect verified student presence. Users are forbidden from falsifying or modifying scan logs intentionally.'}
                  </p>
                </div>
              </div>

              {/* SECTION 7, 8, 9 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">7</span>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">
                    {lang === 'ID' ? 'Presensi Mandiri Siswa' : 'Student Self-Attendance'}
                  </h3>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm text-slate-600 pl-8">
                  <p>
                    {lang === 'ID'
                      ? 'Apabila fitur Presensi Mandiri Siswa diaktifkan, siswa dapat melakukan presensi sesuai jadwal dan ketentuan yang telah ditetapkan oleh sekolah.'
                      : 'If Student Self-Attendance is activated, students may check in following schedules and parameters established by the school.'}
                  </p>
                  <p>
                    {lang === 'ID'
                      ? 'Siswa tidak diperbolehkan memberikan akun kepada orang lain untuk melakukan presensi atas namanya. Penggunaan presensi harus dilakukan secara jujur dan bertanggung jawab.'
                      : 'Students may not transfer accounts for proxy check-ins. Attendance recording must be conducted honestly and responsibly.'}
                  </p>
                </div>
              </section>

              {/* SECTION 8, 9, 10, 11, 12, 13, 14 */}
              <div className="space-y-4 pl-8">
                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    8. {lang === 'ID' ? 'Keamanan Akun' : 'Account Security'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Pengguna wajib menjaga keamanan akun masing-masing. Jika menduga akun digunakan pihak lain tanpa izin, segera laporkan kepada Admin atau pengelola sistem.'
                      : 'Users must secure their credentials. If unauthorized access is suspected, notify the system administrator immediately.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    9. {lang === 'ID' ? 'Ketersediaan Sistem (SLA)' : 'System Availability'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Pengelola berupaya menjaga sistem agar dapat digunakan dengan baik. Namun, gangguan sementara dapat terjadi karena pemeliharaan sistem, jaringan internet, layanan pihak ketiga, atau force majeure.'
                      : 'Management strives for continuous availability. Occasional disruptions may occur due to scheduled maintenance, connectivity, or external service issues.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    10. {lang === 'ID' ? 'Perubahan Sistem' : 'System Updates'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Fitur, tampilan, konfigurasi, dan mekanisme sistem dapat diperbarui dari waktu ke waktu untuk meningkatkan kualitas, keamanan, dan kinerja layanan.'
                      : 'Features and configurations may be updated periodically to enhance reliability, security, and institutional efficiency.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    11. {lang === 'ID' ? 'Penonaktifan Akun' : 'Account Deactivation'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Pihak yang memiliki kewenangan dapat menonaktifkan atau mengubah hak akses suatu akun apabila akun tersebut sudah tidak diperlukan atau terdapat alasan administratif maupun keamanan.'
                      : 'Authorized administrative staff may revoke or deactivate accounts if no longer active or for institutional security.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    12. {lang === 'ID' ? 'Tanggung Jawab Pengguna' : 'User Responsibility'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Pengguna bertanggung jawab atas informasi yang dimasukkan dan aktivitas yang dilakukan menggunakan akun masing-masing. Pengguna wajib menggunakan sistem dengan cara yang wajar, aman, dan bertanggung jawab.'
                      : 'Users are liable for entries made and activities executed under their accounts with reasonable care.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    13. {lang === 'ID' ? 'Perubahan Syarat & Ketentuan' : 'Terms Amendments'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Syarat & Ketentuan ini dapat diperbarui apabila terdapat perubahan pada sistem, layanan, kebijakan sekolah, atau kebutuhan operasional. Tanggal pembaruan akan ditampilkan pada halaman ini.'
                      : 'These Terms may be revised to reflect regulatory, technical, or educational policy modifications.'}
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">
                    14. {lang === 'ID' ? 'Penutup' : 'Closing Statement'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Dengan menggunakan Kawacanaan, pengguna menyatakan telah membaca dan memahami Syarat & Ketentuan ini serta bersedia menggunakan sistem sesuai dengan aturan dan tanggung jawab yang berlaku.'
                      : 'By accessing Kawacanaan, users acknowledge understanding and adherence to these Terms & Conditions.'}
                  </p>
                </div>
              </div>

              {/* Signature Footer in Terms */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <div className="font-black text-slate-900 uppercase tracking-tight text-sm">Kawacanaan</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    SISTEM PRESENSI DIGITAL SEKOLAH
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  {lang === 'ID' ? 'Pusat Bantuan Resmi: 0813-1249-8919' : 'Official Helpdesk: +62 813-1249-8919'}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KEBIJAKAN PRIVASI (PRIVACY POLICY) */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100/80 rounded-xl space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                  <Shield className="w-3 h-3" />
                  {lang === 'ID' ? 'Perlindungan Data Pribadi' : 'Data Privacy & Security'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {lang === 'ID' ? 'Kebijakan Privasi Kawacanaan' : 'Kawacanaan Privacy Policy'}
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
                  {lang === 'ID'
                    ? 'Kawacanaan berkomitmen melindungi privasi siswa, tenaga pendidik, dan wali murid sesuai standar Undang-Undang Perlindungan Data Pribadi (UU PDP).'
                    : 'Kawacanaan is committed to safeguarding the personal data of students, teachers, and parents under global security standards.'}
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    1. {lang === 'ID' ? 'Data yang Dikumpulkan' : 'Information Collected'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Kami mengumpulkan data NISN, nama lengkap siswa, rombongan belajar, nomor kontak WhatsApp orang tua, serta log timestamp kehadiran (waktu dan koordinat scan).'
                      : 'We store student IDs, full names, class rosters, parent WhatsApp contact numbers, and attendance timestamps.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    2. {lang === 'ID' ? 'Penggunaan Data' : 'Purpose of Data Processing'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Data semata-mata digunakan untuk kepentingan validasi presensi sekolah, rekapitulasi nilai kehadiran rapor, dan pengiriman notifikasi otomatis kepada orang tua.'
                      : 'Data is strictly utilized for school attendance validation, report card summaries, and automated parent dispatch notices.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    3. {lang === 'ID' ? 'Enkripsi & Keamanan Server' : 'Encryption & Server Security'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Seluruh data ditransmisikan menggunakan protokol aman TLS 1.3 dan disimpan dengan enkripsi data-at-rest pada server bersertifikasi ISO 27001.'
                      : 'All records are transmitted via TLS 1.3 and stored with data-at-rest encryption on certified cloud servers.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    4. {lang === 'ID' ? 'Hak Pemilik Data' : 'User Rights'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {lang === 'ID'
                      ? 'Pihak sekolah dan wali murid berhak meminta perbaikan atau pembaruan data yang tidak akurat melalui Admin sekolah masing-masing.'
                      : 'Schools and parents retain full rights to inspect and request corrections to any inaccurate records.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN PENGGUNA (USER GUIDE) */}
          {activeTab === 'guide' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100/80 rounded-xl space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                  <BookOpen className="w-3 h-3" />
                  {lang === 'ID' ? 'Petunjuk Praktis' : 'Practical Quickstart'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {lang === 'ID' ? 'Panduan Penggunaan Sistem Kawacanaan' : 'Kawacanaan System User Guide'}
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
                  {lang === 'ID'
                    ? 'Langkah mudah memulai dan mengoperasikan sistem presensi digital bagi seluruh pemangku kepentingan sekolah.'
                    : 'Step-by-step onboarding guide for school administrators, teachers, principals, and parents.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>{lang === 'ID' ? 'Panduan Admin Sekolah' : 'School Admin Guide'}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc">
                    <li>{lang === 'ID' ? 'Import master data siswa & guru via Excel (.xlsx)' : 'Import student & teacher rosters via Excel (.xlsx)'}</li>
                    <li>{lang === 'ID' ? 'Generate & cetak QR Card kartu presensi siswa' : 'Generate & print QR ID Attendance cards'}</li>
                    <li>{lang === 'ID' ? 'Atur jam batas toleransi keterlambatan sekolah' : 'Configure school schedule & late tolerance thresholds'}</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>{lang === 'ID' ? 'Panduan Guru & Guru Piket' : 'Teacher & Duty Guide'}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc">
                    <li>{lang === 'ID' ? 'Gunakan mode Scan Scanner di pintu gerbang' : 'Run QR Gate Scanner at school entrance'}</li>
                    <li>{lang === 'ID' ? 'Verifikasi surat izin / sakit siswa dari wali murid' : 'Verify student medical & excuse certificates'}</li>
                    <li>{lang === 'ID' ? 'Unduh rekap bulanan kelas dengan 1 klik' : 'Export monthly classroom recap in 1 click'}</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>{lang === 'ID' ? 'Panduan Kepala Sekolah' : 'Principal Guide'}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc">
                    <li>{lang === 'ID' ? 'Pantau grafik kehadiran real-time harian' : 'Monitor live daily school-wide attendance'}</li>
                    <li>{lang === 'ID' ? 'Tinjau analisis tren kedisiplinan per tingkatan' : 'Review multi-grade discipline analytics'}</li>
                    <li>{lang === 'ID' ? 'Download laporan rekap semesteran Dinas Pendidikan' : 'Export official semester compliance reports'}</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>{lang === 'ID' ? 'Panduan Wali Murid' : 'Parent Guide'}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc">
                    <li>{lang === 'ID' ? 'Terima WA notifikasi otomatis saat anak tiba & pulang' : 'Receive instant WhatsApp notices upon student arrival & departure'}</li>
                    <li>{lang === 'ID' ? 'Ajukan izin sakit langsung dari WhatsApp tanpa kertas' : 'Submit paperless medical leaves via WhatsApp'}</li>
                    <li>{lang === 'ID' ? 'Cek histori presensi bulanan ananda' : 'Check child attendance logs anytime'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {lang === 'ID' ? 'Butuh bantuan lebih lanjut?' : 'Need additional assistance?'}{' '}
            <a
              href="https://wa.me/6281312498919?text=Halo%20Admin%20Kawacanaan,%20saya%20ingin%20bertanya%20mengenai%20Syarat%20dan%20Ketentuan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-bold hover:underline"
            >
              {lang === 'ID' ? 'Hubungi Tim Legal Kawacanaan' : 'Contact Legal Helpdesk'}
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-xs"
          >
            {lang === 'ID' ? 'Tutup & Setuju' : 'Close & Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  );
};
