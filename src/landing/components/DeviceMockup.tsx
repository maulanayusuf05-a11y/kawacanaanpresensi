import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  Clock, 
  Calendar,
  CheckCircle2, 
  BarChart3, 
  FileSpreadsheet, 
  ShieldCheck, 
  Smartphone,
  Laptop,
  BookOpen,
  School,
  FileCheck
} from 'lucide-react';

interface DeviceMockupProps {
  lang?: 'ID' | 'EN';
}

export const DeviceMockup: React.FC<DeviceMockupProps> = ({ lang = 'ID' }) => {
  const [scannedFeedback, setScannedFeedback] = useState(false);

  const handleSimulateCheckIn = () => {
    setScannedFeedback(true);
    setTimeout(() => setScannedFeedback(false), 2000);
  };

  return (
    <div className="relative w-full max-w-[640px] mx-auto select-none">
      {/* Subtle Editorial Blur Accents */}
      <div className="absolute -top-10 -left-10 w-80 h-80 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-slate-100/80 rounded-full blur-3xl pointer-events-none" />

      {/* Editorial Vertical Label Marker */}
      <div className="absolute top-28 -left-14 rotate-[-90deg] text-[9px] uppercase tracking-[0.35em] font-bold text-slate-400 opacity-70 hidden sm:block select-none pointer-events-none">
        Kawacanaan Presensi
      </div>

      {/* 3D Container with perspective */}
      <div className="relative flex items-center justify-center [perspective:1400px]">
        
        {/* ===================== LAPTOP MOCKUP: WEB ADMIN & WALI KELAS SD ===================== */}
        <div 
          className="w-[88%] sm:w-[92%] transition-transform duration-500 hover:scale-[1.01]"
          style={{
            transform: 'rotateY(-5deg) rotateX(3deg) translateZ(0px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Laptop Screen Bezel - Editorial Dark/Slate */}
          <div className="relative bg-slate-900 rounded-t-2xl p-2.5 sm:p-3 border-2 border-slate-800 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.3)] backdrop-blur-md">
            {/* Webcam & Mic */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 ring-1 ring-slate-600"></div>
              <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></div>
            </div>

            {/* Laptop Screen Content: WEB ADMIN & WALI KELAS SD */}
            <div className="bg-white rounded-lg overflow-hidden border border-slate-200 text-slate-900 font-sans text-xs shadow-sm">
              
              {/* Browser Address / Top bar */}
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span className="ml-2 font-mono text-[9px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                    https://sdn01merdeka.kawacanaan.sch.id
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                  <School className="w-3 h-3 text-indigo-600" />
                  <span>{lang === 'ID' ? 'SDN 01 MERDEKA' : 'PRIMARY 01 MERDEKA'}</span>
                </div>
              </div>

              {/* Dashboard Layout */}
              <div className="flex min-h-[300px] sm:min-h-[340px]">
                {/* Left Mini Sidebar with required modules */}
                <div className="w-14 sm:w-36 bg-slate-50 border-r border-slate-200 p-2 flex flex-col justify-between shrink-0 text-left">
                  <div className="space-y-1.5">
                    {/* Brand */}
                    <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-200 px-1">
                      <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center font-black text-white text-[10px]">
                        K
                      </div>
                      <span className="hidden sm:inline font-bold text-slate-900 text-[11px] tracking-tight truncate uppercase">
                        Kawacanaan
                      </span>
                    </div>

                    {/* Navigation Items in Mockup */}
                    <div className="bg-indigo-600 text-white rounded p-1.5 flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider shadow-xs">
                      <BarChart3 className="w-3 h-3 shrink-0" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Ringkasan SD' : 'Summary'}</span>
                    </div>

                    <div className="text-slate-600 p-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                      <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Presensi Harian' : 'Daily Logs'}</span>
                    </div>

                    <div className="text-slate-600 p-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                      <BookOpen className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Mapel (PJOK/Agama)' : 'Subjects'}</span>
                    </div>

                    <div className="text-slate-600 p-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                      <Users className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Rombel 1-6' : 'Classes 1-6'}</span>
                    </div>

                    <div className="text-slate-600 p-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                      <Calendar className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Hari Efektif' : 'School Days'}</span>
                    </div>

                    <div className="text-slate-600 p-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                      <FileSpreadsheet className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'ID' ? 'Cetak Dinas' : 'Dinas Reports'}</span>
                    </div>
                  </div>

                  {/* Profile info footer in Mockup */}
                  <div className="pt-2 border-t border-slate-200 hidden sm:flex items-center gap-1.5 px-1">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-700">
                      WK
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="font-bold text-[9px] text-slate-900 truncate">Ibu Sri Rahayu</div>
                      <div className="text-[8px] text-slate-500 truncate">{lang === 'ID' ? 'Wali Kelas 4-B' : 'Grade 4-B Teacher'}</div>
                    </div>
                  </div>
                </div>

                {/* Right Dashboard Area */}
                <div className="flex-1 p-3 bg-white space-y-3 overflow-hidden text-left">
                  
                  {/* Top Stats Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-slate-900 text-xs sm:text-sm">
                        {lang === 'ID' ? 'Presensi Kelas 4-B' : 'Grade 4-B Attendance'}
                      </h4>
                      <p className="text-[9px] text-slate-500">
                        {lang === 'ID' ? 'Semester Ganjil 2026/2027 • 28 Siswa' : 'Odd Semester 2026/2027 • 28 Students'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[9px] font-bold">
                      22 {lang === 'ID' ? 'Hari Efektif' : 'Effective Days'}
                    </span>
                  </div>

                  {/* 4 Summary Stat Boxes */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded text-left">
                      <div className="text-[8px] uppercase font-bold text-emerald-800">{lang === 'ID' ? 'Hadir' : 'Present'}</div>
                      <div className="text-xs font-black text-emerald-950">27</div>
                    </div>
                    <div className="p-1.5 bg-amber-50 border border-amber-100 rounded text-left">
                      <div className="text-[8px] uppercase font-bold text-amber-800">{lang === 'ID' ? 'Sakit' : 'Sick'}</div>
                      <div className="text-xs font-black text-amber-950">1</div>
                    </div>
                    <div className="p-1.5 bg-blue-50 border border-blue-100 rounded text-left">
                      <div className="text-[8px] uppercase font-bold text-blue-800">{lang === 'ID' ? 'Izin' : 'Permit'}</div>
                      <div className="text-xs font-black text-blue-950">0</div>
                    </div>
                    <div className="p-1.5 bg-rose-50 border border-rose-100 rounded text-left">
                      <div className="text-[8px] uppercase font-bold text-rose-800">{lang === 'ID' ? 'Alfa' : 'Absent'}</div>
                      <div className="text-xs font-black text-rose-950">0</div>
                    </div>
                  </div>

                  {/* Attendance Table Preview */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-100 px-2 py-1 flex items-center justify-between text-[8px] font-bold text-slate-700 uppercase">
                      <span>{lang === 'ID' ? 'Daftar Siswa Kelas 4-B' : 'Grade 4-B Student List'}</span>
                      <span className="text-indigo-600">{lang === 'ID' ? 'Status Harian' : 'Daily Status'}</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-[8px]">
                      <div className="p-1.5 flex items-center justify-between bg-white">
                        <div>
                          <span className="font-bold text-slate-900">01. Ahmad Fathan Al-Ghifari</span>
                          <span className="text-slate-400 ml-1">NISN: 0129384751</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                          {lang === 'ID' ? 'Hadir (06:48)' : 'Present (06:48)'}
                        </span>
                      </div>
                      <div className="p-1.5 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <span className="font-bold text-slate-900">02. Aisyah Putri Rahmadani</span>
                          <span className="text-slate-400 ml-1">NISN: 0129384752</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                          {lang === 'ID' ? 'Hadir (06:55)' : 'Present (06:55)'}
                        </span>
                      </div>
                      <div className="p-1.5 flex items-center justify-between bg-white">
                        <div>
                          <span className="font-bold text-slate-900">03. Bilqis Humaira</span>
                          <span className="text-slate-400 ml-1">NISN: 0129384753</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                          {lang === 'ID' ? 'Sakit (Ket. Dokter)' : 'Sick (Doctor Note)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-[8px] text-slate-600">
                    <span className="flex items-center gap-1 font-semibold">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      {lang === 'ID' ? 'Format Laporan Siap Cetak A4 Dinas' : 'Dinas A4 Printable Format Ready'}
                    </span>
                    <span className="font-mono font-bold text-indigo-700">96.4% Kehadiran</span>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base Stand */}
          <div className="relative -mt-0.5 h-4 sm:h-5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-b-xl shadow-xl flex items-center justify-center border-t border-slate-600">
            <div className="w-16 sm:w-24 h-1 bg-slate-950/60 rounded-full"></div>
          </div>
        </div>

        {/* ===================== SMARTPHONE MOCKUP: PORTAL PRESENSI SISWA SD ===================== */}
        <div 
          className="absolute -right-1 xs:-right-2 sm:-right-4 -bottom-3 sm:-bottom-8 w-[155px] xs:w-[185px] sm:w-[225px] md:w-[245px] transition-all duration-500 hover:scale-[1.03] z-20"
          style={{
            transform: 'rotateY(-10deg) rotateX(4deg) translateZ(40px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Phone Frame */}
          <div className="relative bg-slate-950 rounded-[28px] xs:rounded-[34px] sm:rounded-[40px] p-1.5 xs:p-2 sm:p-2.5 border-2 xs:border-[3px] sm:border-4 border-slate-800 shadow-[0_25px_60px_rgba(15,23,42,0.35)] ring-1 ring-slate-700">
            
            {/* Dynamic Island Notch */}
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 w-14 xs:w-16 sm:w-20 h-3 sm:h-4 bg-slate-900 rounded-full flex items-center justify-center z-30 ring-1 ring-slate-800">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-slate-950 mr-1 sm:mr-1.5"></div>
              <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-indigo-500"></div>
            </div>

            {/* Phone Screen: PORTAL PRESENSI SISWA SD */}
            <div className="relative bg-white rounded-[22px] xs:rounded-[28px] sm:rounded-[32px] overflow-hidden text-slate-900 font-sans text-xs border border-slate-200 flex flex-col justify-between min-h-[340px] xs:min-h-[380px] sm:min-h-[460px]">
              
              {/* Header: Portal Presensi Siswa & Nama Siswa */}
              <div className="bg-slate-900 p-3 pt-6 rounded-b-2xl shadow-sm text-white">
                <div className="flex items-center justify-between text-[10px] text-slate-300 mb-2">
                  <span className="font-bold">07:15</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold">4G</span>
                    <div className="w-3.5 h-2 border border-white rounded-xs p-0.5 flex items-center">
                      <div className="w-full h-full bg-emerald-400 rounded-xs"></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[8px] text-indigo-300 uppercase tracking-widest font-bold">
                      {lang === 'ID' ? 'PORTAL SISWA SD' : 'SD STUDENT PORTAL'}
                    </div>
                    <div className="font-black text-white text-xs sm:text-sm">Ahmad Fathan</div>
                    <div className="text-[9px] text-slate-400">
                      {lang === 'ID' ? 'Kelas 4-B • SDN 01 Merdeka' : 'Grade 4-B • Primary 01'}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow">
                    AF
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-2.5 sm:p-3 space-y-2.5 flex-1 bg-slate-50 overflow-y-auto text-left">
                
                {/* Status Kehadiran Hari Ini */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span>{lang === 'ID' ? 'Status Kehadiran Hari Ini' : 'Today Attendance Status'}</span>
                    <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {lang === 'ID' ? 'TERCATAT' : 'RECORDED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {lang === 'ID' ? 'Hadir Tepat Waktu' : 'Present on Time'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {lang === 'ID' ? 'Kamis, 20 Agustus 2026 (06:48 WIB)' : 'Thursday, 20 August 2026 (06:48)'}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Tombol Presensi Masuk & Tombol Presensi Pulang */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSimulateCheckIn}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-center cursor-pointer transition-all shadow-xs"
                  >
                    <div className="text-[8px] uppercase font-bold text-indigo-200">{lang === 'ID' ? 'Presensi' : 'Check-In'}</div>
                    <div className="text-[10px] font-black tracking-wide flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {lang === 'ID' ? 'Masuk' : 'Entry'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateCheckIn}
                    className="p-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-lg text-center cursor-pointer transition-all shadow-xs"
                  >
                    <div className="text-[8px] uppercase font-bold text-slate-400">{lang === 'ID' ? 'Presensi' : 'Check-Out'}</div>
                    <div className="text-[10px] font-black tracking-wide flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {lang === 'ID' ? 'Pulang' : 'Exit'}
                    </div>
                  </button>
                </div>

                {/* Feedback simulation indicator */}
                {scannedFeedback && (
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded text-center text-[9px] font-bold">
                    ✓ {lang === 'ID' ? 'Data presensi berhasil disinkronkan!' : 'Attendance data synchronized!'}
                  </div>
                )}

                {/* Jadwal Mapel Hari Ini */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-600" />
                      <span>{lang === 'ID' ? 'Mapel Khusus Hari Ini' : 'Today Subjects'}</span>
                    </span>
                    <span className="text-[8px] text-indigo-600 font-bold uppercase tracking-wider">
                      Kelas 4-B
                    </span>
                  </div>
                  <div className="space-y-1 text-[8px] text-slate-600">
                    <div className="flex justify-between p-1 bg-slate-50 rounded">
                      <span>07:30 - PJOK (Pak Hendra)</span>
                      <span className="text-emerald-700 font-bold">Hadir</span>
                    </div>
                    <div className="flex justify-between p-1 bg-slate-50 rounded">
                      <span>09:15 - PABP / Pend. Agama</span>
                      <span className="text-emerald-700 font-bold">Hadir</span>
                    </div>
                  </div>
                </div>

                {/* Riwayat Kehadiran */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-slate-900 uppercase tracking-wider">{lang === 'ID' ? 'Rekap Kehadiran' : 'Attendance Recap'}</span>
                    <span className="text-[8px] text-slate-400">{lang === 'ID' ? '21 / 22 Hari' : '21 / 22 Days'}</span>
                  </div>

                  <div className="space-y-1 text-[9px]">
                    <div className="p-1 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-slate-700">
                      <span>{lang === 'ID' ? 'Rabu, 19 Agu (06:48 WIB)' : 'Wed, Aug 19 (06:48 AM)'}</span>
                      <span className="text-emerald-700 font-bold">{lang === 'ID' ? 'Hadir' : 'Present'}</span>
                    </div>
                    <div className="p-1 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-slate-700">
                      <span>{lang === 'ID' ? 'Selasa, 18 Agu (07:10 WIB)' : 'Tue, Aug 18 (07:10 AM)'}</span>
                      <span className="text-emerald-700 font-bold">{lang === 'ID' ? 'Hadir' : 'Present'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Mobile Bottom Navigation Bar */}
              <div className="bg-white border-t border-slate-200 p-2 px-3 flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                <div className="flex flex-col items-center text-indigo-600">
                  <div className="w-3.5 h-3.5 flex items-center justify-center font-black">●</div>
                  <span>{lang === 'ID' ? 'Beranda' : 'Home'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <AlertCircle className="w-3 h-3" />
                  <span>{lang === 'ID' ? 'Izin' : 'Leave'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Calendar className="w-3 h-3" />
                  <span>{lang === 'ID' ? 'Riwayat' : 'History'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <UserCheck className="w-3 h-3" />
                  <span>{lang === 'ID' ? 'Profil' : 'Profile'}</span>
                </div>
              </div>

              {/* iPhone Home Bar Indicator */}
              <div className="w-20 h-1 bg-slate-300 rounded-full mx-auto my-1"></div>

            </div>
          </div>
        </div>

      </div>

      {/* Editorial Bottom Badge Indicator */}
      <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-600 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded">
          <Laptop className="w-3 h-3 text-slate-700 shrink-0" /> {lang === 'ID' ? 'Web Admin & Wali Kelas SD' : 'Web Admin & Primary Teacher'}
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded">
          <Smartphone className="w-3 h-3 text-indigo-600 shrink-0" /> {lang === 'ID' ? 'Portal Siswa & Orang Tua SD' : 'Primary Student & Parent Portal'}
        </span>
      </div>
    </div>
  );
};
