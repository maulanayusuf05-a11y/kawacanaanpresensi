import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  Calendar,
  User,
  History,
  FileText,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Send,
  X,
  Lock,
  CalendarDays,
  Award,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

export const PortalSiswaView: React.FC = () => {
  const {
    currentUser,
    students,
    schoolProfile,
    systemConfig,
    attendanceRecords,
    currentAttendanceDate,
    submitStudentAttendance,
    getDateStatus,
    getEffectiveDaysForMonth,
    setActiveView,
    showToast,
  } = useApp();

  // Active Tab: 'hari-ini' | 'rekap-bulanan' | 'rekap-semester'
  const [activeTab, setActiveTab] = useState<'hari-ini' | 'rekap-bulanan' | 'rekap-semester'>('hari-ini');

  // Current real-time clock state
  const [timeNow, setTimeNow] = useState<Date>(new Date());
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUser?.role === 'SISWA') {
      const matched = students.find((s) => s.nisn === currentUser.username || s.nama === currentUser.name);
      return matched ? matched.id : students[0]?.id || '1';
    }
    return students[0]?.id || '1';
  });

  // Filters for Rekap Bulanan
  const [rekapMonth, setRekapMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [rekapYear, setRekapYear] = useState<string>(() => String(new Date().getFullYear()));

  // Filters for Rekap Semester (1 = Ganjil: Jul-Des, 2 = Genap: Jan-Jun)
  const [rekapSemester, setRekapSemester] = useState<'1' | '2'>('1');

  // Izin / Sakit Modal state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [leaveType, setLeaveType] = useState<'sakit' | 'izin'>('sakit');
  const [leaveNotes, setLeaveNotes] = useState<string>('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected student object
  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Indonesian Day & Month names
  const daysIndonesia = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndonesia = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Real-time calculations
  const padZero = (n: number) => String(n).padStart(2, '0');
  const currentDayName = daysIndonesia[timeNow.getDay()];
  const currentDateNum = timeNow.getDate();
  const currentMonthName = monthsIndonesia[timeNow.getMonth()];
  const currentYearNum = timeNow.getFullYear();
  const formattedRealTimeDate = `${currentDayName}, ${currentDateNum} ${currentMonthName} ${currentYearNum}`;

  // Dynamic Today ISO Date (YYYY-MM-DD)
  const todayISOString = `${currentYearNum}-${padZero(timeNow.getMonth() + 1)}-${padZero(currentDateNum)}`;
  
  // Target date for today's attendance
  const targetDate = todayISOString;

  // Status of the day (Effective study day / Holiday)
  const dayStatus = getDateStatus(targetDate);
  const isLockedForHoliday = !dayStatus.isEffective;

  // Today record for this student (Daily / Wali Kelas)
  const todayRecord = attendanceRecords.find(
    (r) => r.date === targetDate && r.studentId === activeStudent?.id && r.type !== 'SUBJECT'
  );

  // Today specialized subject records for this student (Guru Mapel)
  const todaySubjectRecords = attendanceRecords.filter(
    (r) => r.date === targetDate && r.studentId === activeStudent?.id && r.type === 'SUBJECT'
  );

  // Time calculations
  const hours = String(timeNow.getHours()).padStart(2, '0');
  const mins = String(timeNow.getMinutes()).padStart(2, '0');
  const secs = String(timeNow.getSeconds()).padStart(2, '0');

  // Check if student has checked in/out
  const hasCheckedIn = !!(todayRecord && todayRecord.checkInTime && todayRecord.checkInTime !== '-' && todayRecord.status === 'Hadir');
  const hasCheckedOut = !!(todayRecord && todayRecord.checkOutTime && todayRecord.checkOutTime !== '-');
  const isExcused = todayRecord && (todayRecord.status === 'Sakit' || todayRecord.status === 'Izin');

  // Time window checks
  const currentTotalMinutes = Number(hours) * 60 + Number(mins);

  // Check-in start time
  const [startH, startM] = (systemConfig.checkInStartTime || '06:00').split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const isBeforeCheckInOpen = currentTotalMinutes < startMinutes;

  // Check-in deadline (Late check)
  const [dlH, dlM] = (systemConfig.checkInDeadlineTime || '07:00').split(':').map(Number);
  const deadlineMinutes = (dlH || 7) * 60 + (dlM || 0);
  const isLate = currentTotalMinutes > deadlineMinutes;

  // Check-out start time
  const [outH, outM] = (systemConfig.checkOutStartTime || '12:30').split(':').map(Number);
  const outMinutes = (outH || 12) * 60 + (outM || 30);
  const isBeforeCheckOutOpen = currentTotalMinutes < outMinutes;

  // Handlers
  const handleCheckIn = () => {
    if (!activeStudent || isLockedForHoliday) return;
    if (isBeforeCheckInOpen) {
      showToast(`Presensi masuk belum dibuka. Jam buka presensi: ${systemConfig.checkInStartTime || '06:00'} WIB.`, 'error');
      return;
    }
    submitStudentAttendance(activeStudent.id, 'masuk', undefined, targetDate);
  };

  const handleCheckOut = () => {
    if (!activeStudent || isLockedForHoliday) return;
    if (isBeforeCheckOutOpen) {
      showToast(`Presensi pulang belum dibuka. Jam buka presensi: ${systemConfig.checkOutStartTime || '12:30'} WIB.`, 'error');
      return;
    }
    submitStudentAttendance(activeStudent.id, 'pulang', undefined, targetDate);
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || isLockedForHoliday) return;
    submitStudentAttendance(activeStudent.id, leaveType, leaveNotes, targetDate);
    setIsLeaveModalOpen(false);
    setLeaveNotes('');
  };

  // Month information & formatting for history
  const activeYearMonth = targetDate.slice(0, 7); // e.g. '2026-08'
  const activeMonthDisplay = `${currentMonthName} ${currentYearNum}`;

  // Student Attendance History (Current month)
  const monthlyStudentHistory = attendanceRecords
    .filter((r) => r.studentId === activeStudent?.id && r.date.startsWith(activeYearMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalHadirBulanIni = monthlyStudentHistory.filter((r) => r.status === 'Hadir').length;
  const totalSakitBulanIni = monthlyStudentHistory.filter((r) => r.status === 'Sakit').length;
  const totalIzinBulanIni = monthlyStudentHistory.filter((r) => r.status === 'Izin').length;
  const totalAlfaBulanIni = monthlyStudentHistory.filter((r) => r.status === 'Alfa').length;
  const totalRecordedDays = monthlyStudentHistory.length;
  const attendanceRate = totalRecordedDays > 0 ? Math.round((totalHadirBulanIni / totalRecordedDays) * 100) : 100;

  // Selected Monthly Rekap Data for Tab 2
  const selectedYearMonthKey = `${rekapYear}-${rekapMonth}`;
  const selectedMonthHistory = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.studentId === activeStudent?.id && r.date.startsWith(selectedYearMonthKey))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceRecords, activeStudent?.id, selectedYearMonthKey]);

  const selectedMonthStats = useMemo(() => {
    const hadir = selectedMonthHistory.filter((r) => r.status === 'Hadir').length;
    const sakit = selectedMonthHistory.filter((r) => r.status === 'Sakit').length;
    const izin = selectedMonthHistory.filter((r) => r.status === 'Izin').length;
    const alfa = selectedMonthHistory.filter((r) => r.status === 'Alfa').length;
    const totalEffective = getEffectiveDaysForMonth(selectedYearMonthKey) || 21;
    const totalRecorded = selectedMonthHistory.length;
    const rate = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 100;
    return { hadir, sakit, izin, alfa, totalEffective, totalRecorded, rate };
  }, [selectedMonthHistory, selectedYearMonthKey, getEffectiveDaysForMonth]);

  // Semester breakdown for Tab 3
  const semesterMonthKeys = useMemo(() => {
    if (rekapSemester === '1') {
      // Semester 1 (Ganjil): Juli - Desember (Start Year)
      return [
        { monthNum: '07', name: 'Juli', key: `${rekapYear}-07` },
        { monthNum: '08', name: 'Agustus', key: `${rekapYear}-08` },
        { monthNum: '09', name: 'September', key: `${rekapYear}-09` },
        { monthNum: '10', name: 'Oktober', key: `${rekapYear}-10` },
        { monthNum: '11', name: 'November', key: `${rekapYear}-11` },
        { monthNum: '12', name: 'Desember', key: `${rekapYear}-12` },
      ];
    } else {
      // Semester 2 (Genap): Januari - Juni (Next Year)
      const nextYear = String(Number(rekapYear) + 1);
      return [
        { monthNum: '01', name: 'Januari', key: `${nextYear}-01` },
        { monthNum: '02', name: 'Februari', key: `${nextYear}-02` },
        { monthNum: '03', name: 'Maret', key: `${nextYear}-03` },
        { monthNum: '04', name: 'April', key: `${nextYear}-04` },
        { monthNum: '05', name: 'Mei', key: `${nextYear}-05` },
        { monthNum: '06', name: 'Juni', key: `${nextYear}-06` },
      ];
    }
  }, [rekapSemester, rekapYear]);

  const semesterSummary = useMemo(() => {
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlfa = 0;
    let totalEffectiveDays = 0;

    const monthlyBreakdown = semesterMonthKeys.map((m) => {
      const monthRecs = attendanceRecords.filter(
        (r) => r.studentId === activeStudent?.id && r.date.startsWith(m.key)
      );
      const h = monthRecs.filter((r) => r.status === 'Hadir').length;
      const s = monthRecs.filter((r) => r.status === 'Sakit').length;
      const i = monthRecs.filter((r) => r.status === 'Izin').length;
      const a = monthRecs.filter((r) => r.status === 'Alfa').length;
      const eff = getEffectiveDaysForMonth(m.key) || 20;

      totalHadir += h;
      totalSakit += s;
      totalIzin += i;
      totalAlfa += a;
      totalEffectiveDays += eff;

      const rate = monthRecs.length > 0 ? Math.round((h / monthRecs.length) * 100) : 0;

      return {
        ...m,
        hadir: h,
        sakit: s,
        izin: i,
        alfa: a,
        effectiveDays: eff,
        totalRecorded: monthRecs.length,
        rate,
      };
    });

    const totalDaysRecorded = totalHadir + totalSakit + totalIzin + totalAlfa;
    const semesterRate =
      totalDaysRecorded > 0 ? Math.round((totalHadir / totalDaysRecorded) * 100) : 100;

    let predicate = 'Sangat Baik';
    let predicateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (semesterRate < 75) {
      predicate = 'Perlu Pembinaan';
      predicateColor = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (semesterRate < 85) {
      predicate = 'Cukup';
      predicateColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (semesterRate < 95) {
      predicate = 'Baik';
      predicateColor = 'text-blue-700 bg-blue-50 border-blue-200';
    }

    return {
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlfa,
      totalEffectiveDays,
      totalDaysRecorded,
      semesterRate,
      predicate,
      predicateColor,
      monthlyBreakdown,
    };
  }, [semesterMonthKeys, attendanceRecords, activeStudent?.id, getEffectiveDaysForMonth]);

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-3 sm:py-5 space-y-4 animate-in fade-in duration-200 pb-24 font-sans">
      {/* Simulation Banner for Admin/Guru */}
      {currentUser?.role !== 'SISWA' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
              ⚡
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-950">Mode Simulasi Presensi Siswa (HP)</p>
              <p className="text-[11px] text-amber-800">
                Pilih profil siswa untuk menguji penekanan tombol Masuk/Pulang:
              </p>
            </div>
          </div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.nisn})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Student Identity Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 border-2 border-white">
            {activeStudent?.nama.charAt(0) || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-100">
                Kelas {schoolProfile.kelas || '6A'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {activeStudent?.gender === 'L' ? 'Putra' : 'Putri'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
              {activeStudent?.nama}
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate">
              NISN: <span className="font-bold text-slate-700">{activeStudent?.nisn}</span> • {schoolProfile.namaSekolah}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Presensi Hari Ini, Rekap Bulanan, Rekap Semester) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 shadow-inner">
        <button
          onClick={() => setActiveTab('hari-ini')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'hari-ini'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={13} />
          <span>Hari Ini</span>
        </button>

        <button
          onClick={() => setActiveTab('rekap-bulanan')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'rekap-bulanan'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays size={13} />
          <span>Rekap Bulanan</span>
        </button>

        <button
          onClick={() => setActiveTab('rekap-semester')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'rekap-semester'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={13} />
          <span>Rekap Semester</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PRESENSI HARI INI */}
      {/* ============================================================== */}
      {activeTab === 'hari-ini' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Real-time Live Clock Card */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-5 text-white shadow-lg text-center relative overflow-hidden border border-slate-800">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-center gap-1.5 text-blue-300 text-[11px] font-bold tracking-widest uppercase mb-1">
              <Clock size={13} className="animate-pulse" />
              <span>WAKTU REAL-TIME SISTEM</span>
            </div>

            {/* Digital Clock */}
            <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono my-1 text-white flex items-center justify-center gap-1">
              <span>{hours}</span>
              <span className="animate-pulse text-blue-400">:</span>
              <span>{mins}</span>
              <span className="animate-pulse text-blue-400">:</span>
              <span className="text-xl sm:text-2xl text-blue-300 font-normal">{secs}</span>
              <span className="text-xs font-bold text-blue-300 ml-1">WIB</span>
            </div>

            {/* Dynamic Real-time Date */}
            <p className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
              {formattedRealTimeDate}
            </p>

            {/* Status of Today (Effective Study Day vs Holiday) */}
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  dayStatus.isEffective
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}
              >
                {dayStatus.isEffective ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-0.5" />
                ) : (
                  <AlertCircle size={11} className="inline-block mr-0.5" />
                )}
                <span>{dayStatus.label}</span>
              </span>
              {dayStatus.eventTitle && (
                <span className="text-[10px] font-semibold text-blue-200">
                  ({dayStatus.eventTitle})
                </span>
              )}
            </div>

            {/* Status Rules Info */}
            <div className="mt-3.5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200">
              <span>Buka: <strong className="text-white">{systemConfig.checkInStartTime || '06:00'}</strong></span>
              <span>Tepat Waktu: <strong className="text-white">s/d {systemConfig.checkInDeadlineTime || '07:00'}</strong></span>
              <span>Pulang: <strong className="text-white">{systemConfig.checkOutStartTime || '12:30'}</strong></span>
            </div>
          </div>

          {/* Locked for Holiday Warning */}
          {isLockedForHoliday && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl text-amber-950 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div className="text-xs space-y-1">
                <h3 className="font-black text-amber-950 text-sm">Presensi Terkunci (Hari Libur)</h3>
                <p className="text-amber-800 leading-relaxed">
                  Hari ini bukan hari belajar efektif ({dayStatus.label}{dayStatus.eventTitle ? ` - ${dayStatus.eventTitle}` : ''}). Tombol presensi masuk, pulang, dan izin dinonaktifkan.
                </p>
              </div>
            </div>
          )}

          {/* Today's Status Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                STATUS HARI INI
              </span>
              {todayRecord?.status === 'Hadir' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={13} />
                  HADIR
                </span>
              ) : todayRecord?.status === 'Sakit' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">
                  SAKIT
                </span>
              ) : todayRecord?.status === 'Izin' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                  IZIN
                </span>
              ) : todayRecord?.status === 'Alfa' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                  ALFA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {isLockedForHoliday ? 'LIBUR' : 'BELUM PRESENSI'}
                </span>
              )}
            </div>

            {/* Details row */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Jam Masuk</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {todayRecord?.checkInTime && todayRecord.checkInTime !== '-' ? `${todayRecord.checkInTime} WIB` : '—'}
                </span>
                {todayRecord?.notes && todayRecord.notes.includes('Terlambat') && (
                  <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-600">
                    (Terlambat)
                  </span>
                )}
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Jam Pulang</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {todayRecord?.checkOutTime && todayRecord.checkOutTime !== '-' ? `${todayRecord.checkOutTime} WIB` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Today's Subject Attendance Records (if any recorded by Guru Mapel) */}
          {todaySubjectRecords.length > 0 && (
            <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-blue-600" />
                  Presensi Mata Pelajaran Hari Ini
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {todaySubjectRecords.length} Mapel Dicatat
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {todaySubjectRecords.map((sr) => (
                  <div key={sr.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{sr.subjectName || 'Mata Pelajaran'}</p>
                      {sr.notes && <p className="text-[10px] text-slate-500">{sr.notes}</p>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        sr.status === 'Hadir'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : sr.status === 'Sakit'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : sr.status === 'Izin'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {sr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Big Action Buttons (Masuk & Pulang) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tombol Presensi Masuk */}
            <button
              id="btn-presensi-masuk"
              onClick={handleCheckIn}
              disabled={
                isLockedForHoliday ||
                hasCheckedIn ||
                isExcused ||
                !systemConfig.studentSelfAttendanceEnabled ||
                isBeforeCheckInOpen
              }
              className={`relative p-5 rounded-3xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer shadow-md min-h-[140px] group ${
                isLockedForHoliday
                  ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                  : hasCheckedIn
                  ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-900 cursor-not-allowed opacity-90'
                  : !systemConfig.studentSelfAttendanceEnabled
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : isBeforeCheckInOpen
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-500/20'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                  isLockedForHoliday
                    ? 'bg-slate-200 text-slate-500'
                    : hasCheckedIn
                    ? 'bg-emerald-200 text-emerald-800'
                    : isBeforeCheckInOpen
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-white/20 text-white'
                }`}
              >
                {isLockedForHoliday ? (
                  <Lock size={28} />
                ) : hasCheckedIn ? (
                  <CheckCircle2 size={30} />
                ) : isBeforeCheckInOpen ? (
                  <Lock size={28} />
                ) : (
                  <LogIn size={30} />
                )}
              </div>
              <div>
                <span className="text-base font-black tracking-tight block">
                  {isLockedForHoliday
                    ? 'LIBUR (DIKUNCI)'
                    : hasCheckedIn
                    ? 'SUDAH MASUK'
                    : isBeforeCheckInOpen
                    ? 'BELUM DIBUKA'
                    : 'PRESENSI MASUK'}
                </span>
                <span className="text-[11px] font-medium opacity-90 block mt-0.5">
                  {isLockedForHoliday
                    ? 'Bukan hari belajar'
                    : hasCheckedIn
                    ? `Tercatat pukul ${todayRecord?.checkInTime} WIB`
                    : isBeforeCheckInOpen
                    ? `Dibuka pukul ${systemConfig.checkInStartTime || '06:00'} WIB`
                    : isLate
                    ? 'Lewat jam masuk (Terlambat)'
                    : 'Tekan saat tiba di sekolah'}
                </span>
              </div>
            </button>

            {/* Tombol Presensi Pulang */}
            <button
              id="btn-presensi-pulang"
              onClick={handleCheckOut}
              disabled={
                isLockedForHoliday ||
                hasCheckedOut ||
                !hasCheckedIn ||
                !systemConfig.studentSelfAttendanceEnabled ||
                isBeforeCheckOutOpen
              }
              className={`relative p-5 rounded-3xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer shadow-md min-h-[140px] group ${
                isLockedForHoliday
                  ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                  : hasCheckedOut
                  ? 'bg-blue-50 border-2 border-blue-300 text-blue-900 cursor-not-allowed opacity-90'
                  : !hasCheckedIn
                  ? 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : isBeforeCheckOutOpen
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-blue-500/20'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                  isLockedForHoliday
                    ? 'bg-slate-200 text-slate-500'
                    : hasCheckedOut
                    ? 'bg-blue-200 text-blue-800'
                    : isBeforeCheckOutOpen
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-white/20 text-white'
                }`}
              >
                {isLockedForHoliday ? (
                  <Lock size={28} />
                ) : hasCheckedOut ? (
                  <CheckCircle2 size={30} />
                ) : isBeforeCheckOutOpen ? (
                  <Lock size={28} />
                ) : (
                  <LogOut size={30} />
                )}
              </div>
              <div>
                <span className="text-base font-black tracking-tight block">
                  {isLockedForHoliday
                    ? 'LIBUR (DIKUNCI)'
                    : hasCheckedOut
                    ? 'SUDAH PULANG'
                    : isBeforeCheckOutOpen && hasCheckedIn
                    ? 'BELUM JAM PULANG'
                    : 'PRESENSI PULANG'}
                </span>
                <span className="text-[11px] font-medium opacity-90 block mt-0.5">
                  {isLockedForHoliday
                    ? 'Bukan hari belajar'
                    : hasCheckedOut
                    ? `Tercatat pukul ${todayRecord?.checkOutTime} WIB`
                    : !hasCheckedIn
                    ? 'Harus presensi masuk dulu'
                    : isBeforeCheckOutOpen
                    ? `Dibuka pukul ${systemConfig.checkOutStartTime || '12:30'} WIB`
                    : 'Tekan saat jam pulang sekolah'}
                </span>
              </div>
            </button>
          </div>

          {/* Button Ajukan Izin / Sakit */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Tidak Bisa Hadir?</p>
                <p className="text-[11px] text-slate-500">Ajukan surat izin atau surat sakit ke wali kelas</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (isLockedForHoliday) {
                  showToast('Hari ini adalah hari libur, tidak perlu mengajukan izin', 'info');
                  return;
                }
                setIsLeaveModalOpen(true);
              }}
              disabled={isLockedForHoliday}
              className={`px-3 py-1.5 font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer ${
                isLockedForHoliday
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900'
              }`}
            >
              Ajukan Izin
            </button>
          </div>

          {/* Student Attendance Stats (Monthly Summary Preview) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-blue-600" />
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900">
                    Statistik Bulan Ini
                  </h2>
                  <span className="text-[11px] font-semibold text-blue-600">
                    {activeMonthDisplay}
                  </span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                {attendanceRate}% Kehadiran
              </span>
            </div>

            {/* 4 Mini Counters for Current Month */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">HADIR</span>
                <span className="text-lg font-black text-emerald-900">{totalHadirBulanIni}</span>
                <span className="text-[9px] text-emerald-700 block font-medium">Hari</span>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-sky-800 block uppercase tracking-wider">SAKIT</span>
                <span className="text-lg font-black text-sky-900">{totalSakitBulanIni}</span>
                <span className="text-[9px] text-sky-700 block font-medium">Hari</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wider">IZIN</span>
                <span className="text-lg font-black text-amber-900">{totalIzinBulanIni}</span>
                <span className="text-[9px] text-amber-700 block font-medium">Hari</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 block uppercase tracking-wider">ALFA</span>
                <span className="text-lg font-black text-rose-900">{totalAlfaBulanIni}</span>
                <span className="text-[9px] text-rose-700 block font-medium">Hari</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: REKAP BULANAN SISWA */}
      {/* ============================================================== */}
      {activeTab === 'rekap-bulanan' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Rekapitulasi Kehadiran Bulanan</h2>
                  <p className="text-xs text-slate-500">Pilih bulan dan tahun untuk melihat rincian absensi</p>
                </div>
              </div>
            </div>

            {/* Filter Bulan & Tahun */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  PILIH BULAN
                </label>
                <select
                  value={rekapMonth}
                  onChange={(e) => setRekapMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                >
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  PILIH TAHUN
                </label>
                <input
                  type="number"
                  value={rekapYear}
                  onChange={(e) => setRekapYear(e.target.value)}
                  min={2020}
                  max={2035}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Rekap Summary Badges */}
            <div className="grid grid-cols-4 gap-2 text-center pt-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 block uppercase">HADIR</span>
                <span className="text-lg font-black text-emerald-900">{selectedMonthStats.hadir}</span>
                <span className="text-[9px] text-emerald-700 block font-medium">Hari</span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-sky-800 block uppercase">SAKIT</span>
                <span className="text-lg font-black text-sky-900">{selectedMonthStats.sakit}</span>
                <span className="text-[9px] text-sky-700 block font-medium">Hari</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-amber-800 block uppercase">IZIN</span>
                <span className="text-lg font-black text-amber-900">{selectedMonthStats.izin}</span>
                <span className="text-[9px] text-amber-700 block font-medium">Hari</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 block uppercase">ALFA</span>
                <span className="text-lg font-black text-rose-900">{selectedMonthStats.alfa}</span>
                <span className="text-[9px] text-rose-700 block font-medium">Hari</span>
              </div>
            </div>

            {/* % Kehadiran Progress */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Persentase Kehadiran</span>
                <p className="text-xs text-slate-700 font-medium">
                  {selectedMonthStats.hadir} hadir dari {selectedMonthStats.totalRecorded} hari tercatat
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-blue-700">{selectedMonthStats.rate}%</span>
              </div>
            </div>
          </div>

          {/* Daftar Riwayat Detail Harian */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Catatan Presensi Harian ({selectedMonthHistory.length} Data)
              </h3>
            </div>

            <div className="space-y-2">
              {selectedMonthHistory.length > 0 ? (
                selectedMonthHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-black text-slate-900">{item.date}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Masuk: <strong className="text-slate-700">{item.checkInTime || '-'}</strong></span>
                        <span>•</span>
                        <span>Pulang: <strong className="text-slate-700">{item.checkOutTime || '-'}</strong></span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-amber-700 font-medium italic">
                          Ket: {item.notes}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black ${
                        item.status === 'Hadir'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : item.status === 'Sakit'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : item.status === 'Izin'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : item.status === 'Alfa'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status || 'Belum'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Tidak ada catatan presensi pada bulan yang dipilih.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REKAP SEMESTER SISWA */}
      {/* ============================================================== */}
      {activeTab === 'rekap-semester' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Rekapitulasi Kehadiran Semester</h2>
                  <p className="text-xs text-slate-500">Akumulasi presensi 6 bulan dalam 1 semester</p>
                </div>
              </div>
            </div>

            {/* Filter Semester & Tahun */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  PILIH SEMESTER
                </label>
                <select
                  value={rekapSemester}
                  onChange={(e) => setRekapSemester(e.target.value as '1' | '2')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                >
                  <option value="1">Semester 1 (Ganjil: Jul - Des)</option>
                  <option value="2">Semester 2 (Genap: Jan - Jun)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  TAHUN AJARAN AWAL
                </label>
                <input
                  type="number"
                  value={rekapYear}
                  onChange={(e) => setRekapYear(e.target.value)}
                  min={2020}
                  max={2035}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Semester Highlights */}
            <div className="bg-gradient-to-br from-indigo-900 to-blue-950 rounded-2xl p-4 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">
                    {rekapSemester === '1' ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)'}
                  </span>
                  <h3 className="text-base font-black text-white">
                    {semesterSummary.totalHadir} Hari Hadir
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-300">
                    {semesterSummary.semesterRate}%
                  </span>
                  <span className="text-[10px] text-blue-200 block">Tingkat Kehadiran</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-blue-200 font-medium">Predikat Kehadiran:</span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${semesterSummary.predicateColor}`}>
                  {semesterSummary.predicate}
                </span>
              </div>
            </div>

            {/* 4 Mini Stats Accumulation */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 block uppercase">TOTAL HADIR</span>
                <span className="text-lg font-black text-emerald-900">{semesterSummary.totalHadir}</span>
                <span className="text-[9px] text-emerald-700 block font-medium">Hari</span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-sky-800 block uppercase">TOTAL SAKIT</span>
                <span className="text-lg font-black text-sky-900">{semesterSummary.totalSakit}</span>
                <span className="text-[9px] text-sky-700 block font-medium">Hari</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-amber-800 block uppercase">TOTAL IZIN</span>
                <span className="text-lg font-black text-amber-900">{semesterSummary.totalIzin}</span>
                <span className="text-[9px] text-amber-700 block font-medium">Hari</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 block uppercase">TOTAL ALFA</span>
                <span className="text-lg font-black text-rose-900">{semesterSummary.totalAlfa}</span>
                <span className="text-[9px] text-rose-700 block font-medium">Hari</span>
              </div>
            </div>
          </div>

          {/* Breakdown 6 Bulan dalam Semester */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Rincian Kehadiran 6 Bulan
            </h3>

            <div className="space-y-2">
              {semesterSummary.monthlyBreakdown.map((m, idx) => (
                <div
                  key={m.key}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-black text-slate-900 text-sm">{m.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      H: <strong className="text-emerald-700">{m.hadir}</strong> • S: <strong className="text-sky-700">{m.sakit}</strong> • I: <strong className="text-amber-700">{m.izin}</strong> • A: <strong className="text-rose-700">{m.alfa}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 inline-block">
                      {m.rate}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                      {m.totalRecorded} hari
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Izin / Sakit */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Form Pengajuan Ketidakhadiran</h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              {/* Tipe: Sakit / Izin */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  PILIH ALASAN
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sakit')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      leaveType === 'sakit'
                        ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Sakit (S)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('izin')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      leaveType === 'izin'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Izin (I)
                  </button>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  KETERANGAN / ALASAN DETAIL
                </label>
                <textarea
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="Contoh: Demam, kontrol ke dokter, atau ada keperluan keluarga..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Kirim Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
