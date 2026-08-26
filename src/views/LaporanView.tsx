import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ReportPrintModal } from '../components/ReportPrintModal';
import { getUserRoleScope } from '../utils/userScope';
import { getFaseByClassName, formatClassDisplay } from '../utils/faseKurikulum';
import { ArrowLeft, FileText, Printer, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LaporanView: React.FC = () => {
  const { schoolProfile, systemConfig, setActiveView, students, attendanceRecords, getEffectiveDaysForMonth, classes, subjects, teachers, currentUser } = useApp();

  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  const { startYear, endYear } = useMemo(() => {
    const matches = (schoolProfile.tahunPelajaran || '').match(/\d{4}/g);
    if (matches && matches.length >= 2) {
      return { startYear: parseInt(matches[0], 10), endYear: parseInt(matches[1], 10) };
    } else if (matches && matches.length === 1) {
      const y1 = parseInt(matches[0], 10);
      return { startYear: y1, endYear: y1 + 1 };
    }
    return { startYear: 2026, endYear: 2027 };
  }, [schoolProfile.tahunPelajaran]);

  const [reportType, setReportType] = useState('Laporan Bulanan');
  const [attendanceType, setAttendanceType] = useState<'DAILY' | 'SUBJECT'>(
    userScope.isGuruMapel ? 'SUBJECT' : 'DAILY'
  );
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (userScope.isGuruMapel && userScope.assignedSubjects.length > 0) {
      return userScope.assignedSubjects[0].id;
    }
    return subjects.find((s) => s.isSpecialized)?.id || subjects[0]?.id || '';
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (userScope.isWaliKelas && userScope.assignedWaliClassId) {
      return userScope.assignedWaliClassId;
    }
    if (userScope.isGuruMapel && userScope.accessibleClasses.length > 0) {
      return userScope.accessibleClasses[0].id;
    }
    return classes[0]?.id || '';
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState('Minggu Ke-1');
  const [month, setMonth] = useState(() => {
    const mNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return mNames[new Date().getMonth()] || 'Juli';
  });
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Keep state in sync with user role authority
  useEffect(() => {
    if (userScope.isWaliKelas) {
      setAttendanceType('DAILY');
      if (userScope.assignedWaliClassId) {
        setSelectedClassId(userScope.assignedWaliClassId);
      }
    } else if (userScope.isGuruMapel) {
      setAttendanceType('SUBJECT');
      if (userScope.assignedSubjects.length > 0 && !userScope.assignedSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(userScope.assignedSubjects[0].id);
      }
      if (userScope.accessibleClasses.length > 0 && !userScope.accessibleClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(userScope.accessibleClasses[0].id);
      }
    }
  }, [userScope]);

  // Specialized subjects for current user
  const specializedSubjects = useMemo(() => {
    if (userScope.isGuruMapel && userScope.assignedSubjects.length > 0) {
      return userScope.assignedSubjects;
    }
    if (userScope.isWaliKelas && userScope.assignedWaliClassId) {
      const classId = userScope.assignedWaliClassId;
      const className = userScope.assignedWaliClassName || '';
      const matched = subjects.filter((s) => {
        const hasClassId = s.targetClassIds && s.targetClassIds.includes(classId);
        const hasClassName = s.targetClassNames && s.targetClassNames.some((cn) => cn.trim().toLowerCase() === className.trim().toLowerCase());
        return hasClassId || hasClassName;
      });
      if (matched.length > 0) return matched;
    }
    return subjects.filter((s) => s.isSpecialized).length > 0
      ? subjects.filter((s) => s.isSpecialized)
      : subjects;
  }, [userScope, subjects]);

  const selectableClasses = useMemo(() => {
    if (userScope.isWaliKelas) {
      return userScope.assignedWaliClass ? [userScope.assignedWaliClass] : classes.slice(0, 1);
    }
    if (userScope.isGuruMapel) {
      return userScope.accessibleClasses;
    }
    return classes;
  }, [userScope, classes]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Auto-sync year based on semester
  React.useEffect(() => {
    const isSem1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].includes(month);
    setYear(String(isSem1 ? startYear : endYear));
  }, [month, startYear, endYear]);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const weeks = [
    'Minggu Ke-1',
    'Minggu Ke-2',
    'Minggu Ke-3',
    'Minggu Ke-4',
    'Minggu Ke-5',
  ];

  const monthNumberMap: { [key: string]: number } = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
    'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
    'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };

  const mNum = monthNumberMap[month] || 7;
  const monthKey = `${year}-${String(mNum).padStart(2, '0')}`;
  const effectiveDays = getEffectiveDaysForMonth(Number(year) || 2026, mNum);

  // Filter students by selected class
  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Calculate week dates helper
  const weekNum = parseInt(selectedWeek.replace(/\D/g, ''), 10) || 1;
  const weekDates = useMemo(() => {
    const yearNum = Number(year) || 2026;
    const daysInMonth = new Date(yearNum, mNum, 0).getDate();
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = Math.min(daysInMonth, weekNum * 7);

    const dates: string[] = [];
    for (let d = startDay; d <= endDay; d++) {
      const jsDate = new Date(yearNum, mNum - 1, d);
      const dayOfWeek = jsDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(`${yearNum}-${String(mNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }
    return dates;
  }, [year, mNum, weekNum]);

  // Live Summary Stats for preview matching current selection and mode
  const liveSummary = useMemo(() => {
    let relevantRecords = attendanceRecords.filter((r) => {
      if (attendanceType === 'SUBJECT') {
        if (r.type !== 'SUBJECT') return false;
        if (selectedSubjectId && r.subjectId !== selectedSubjectId) return false;
      } else {
        if (r.type === 'SUBJECT') return false;
      }
      if (selectedClassId && r.classId && r.classId !== selectedClassId) return false;
      return true;
    });

    if (reportType === 'Laporan Harian') {
      relevantRecords = relevantRecords.filter((r) => r.date === selectedDate);
    } else if (reportType === 'Laporan Mingguan') {
      relevantRecords = relevantRecords.filter((r) => weekDates.includes(r.date));
    } else if (reportType === 'Laporan Bulanan') {
      relevantRecords = relevantRecords.filter((r) => r.date.startsWith(monthKey));
    }

    const hadir = relevantRecords.filter((r) => r.status === 'Hadir').length;
    const sakit = relevantRecords.filter((r) => r.status === 'Sakit').length;
    const izin = relevantRecords.filter((r) => r.status === 'Izin').length;
    const alfa = relevantRecords.filter((r) => r.status === 'Alfa').length;
    const total = hadir + sakit + izin + alfa;

    const baseCount = filteredStudents.length || 1;
    let denominator = total;
    if (reportType === 'Laporan Harian') {
      denominator = baseCount;
    } else if (reportType === 'Laporan Mingguan') {
      denominator = (baseCount * (weekDates.length || 1)) || 1;
    } else {
      denominator = total > 0 ? total : (baseCount * (effectiveDays || 1)) || 1;
    }

    const pctHadir = denominator > 0 ? (hadir / denominator) * 100 : 0;
    const pctSakit = denominator > 0 ? (sakit / denominator) * 100 : 0;
    const pctIzin = denominator > 0 ? (izin / denominator) * 100 : 0;
    const pctAlfa = denominator > 0 ? (alfa / denominator) * 100 : 0;

    const formatPct = (val: number) => (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));

    return {
      hadir,
      sakit,
      izin,
      alfa,
      total,
      pctHadir: formatPct(pctHadir),
      pctSakit: formatPct(pctSakit),
      pctIzin: formatPct(pctIzin),
      pctAlfa: formatPct(pctAlfa),
    };
  }, [attendanceRecords, attendanceType, selectedSubjectId, selectedClassId, reportType, selectedDate, weekDates, monthKey, filteredStudents.length, effectiveDays]);

  // Format date display for info banner
  const formatReportDateIndo = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${parseInt(d, 10)} ${monthNames[Number(m) - 1] || m} ${y}`;
    } catch {
      return dateStr;
    }
  };

  const handlePrintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPrintModalOpen(true);
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200 pb-20">
      {/* Top Bar */}
      <div>
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs min-h-[38px] cursor-pointer"
          id="btn-back-dashboard"
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Main Header */}
      <div className="flex items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">Laporan Kehadiran</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Cetak laporan administratif sekolah dalam format standar.
          </p>
        </div>
      </div>

      {/* Center Configuration Card */}
      <div className="max-w-xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8 lg:p-10 space-y-5 sm:space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Konfigurasi Laporan
        </h2>

        <form onSubmit={handlePrintSubmit} className="space-y-4 sm:space-y-5">
          {/* TIPE PRESENSI (DUAL-MODE SD: WALI KELAS VS GURU MAPEL) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              KATEGORI PRESENSI
            </label>
            {!userScope.isWaliKelas && !userScope.isGuruMapel ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceType('DAILY');
                    setSelectedSubjectId('');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    attendanceType === 'DAILY'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Absensi Harian (Wali Kelas)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceType('SUBJECT');
                    if (!selectedSubjectId && specializedSubjects.length > 0) {
                      setSelectedSubjectId(specializedSubjects[0].id);
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    attendanceType === 'SUBJECT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Absensi Mata Pelajaran
                </button>
              </div>
            ) : userScope.isWaliKelas ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-blue-600" />
                  <span>Presensi Wali Kelas</span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-black">
                  Terkunci
                </span>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  <span>Format Absensi Guru Mata Pelajaran</span>
                </div>
                <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-black">
                  Terkunci
                </span>
              </div>
            )}
          </div>

          {/* PILIH MATA PELAJARAN (JIKA TIPE SUBJECT) */}
          {attendanceType === 'SUBJECT' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                MATA PELAJARAN
              </label>
              {userScope.isGuruMapel && specializedSubjects.length === 1 ? (
                <div className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <span>{specializedSubjects[0].name}</span>
                  {specializedSubjects[0].code && (
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded">
                      {specializedSubjects[0].code}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
                >
                  {specializedSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || s.name})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* PILIH KELAS / ROMBEL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {userScope.isGuruMapel ? 'PILIH ROMBEL KELAS' : 'PILIH KELAS'}
            </label>
            {userScope.isWaliKelas ? (
              <div className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  <span>
                    {(userScope.assignedWaliClassName || schoolProfile.kelas || '').toLowerCase().startsWith('kelas')
                      ? (userScope.assignedWaliClassName || schoolProfile.kelas)
                      : `Kelas ${userScope.assignedWaliClassName || schoolProfile.kelas || '1'}`}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-black">
                  Kelas Binaan Anda
                </span>
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
              >
                {!userScope.isGuruMapel && (
                  <option value="">Semua Kelas ({students.length} Siswa)</option>
                )}
                {selectableClasses.map((c) => {
                  const label = `${formatClassDisplay(c.name).toUpperCase()} (${getFaseByClassName(c.name, c.grade)})`;
                  return (
                    <option key={c.id} value={c.id}>
                      {userScope.isGuruMapel ? label : `${c.name} (${getFaseByClassName(c.name, c.grade)}) ${c.waliKelasName ? `• ${c.waliKelasName}` : ''}`}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* JENIS LAPORAN */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              PERIODE LAPORAN
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
            >
              <option value="Laporan Bulanan">Laporan Bulanan</option>
              <option value="Laporan Mingguan">Laporan Mingguan</option>
              <option value="Laporan Harian">Laporan Harian</option>
              <option value="Laporan Semester">Laporan Semester</option>
            </select>
          </div>

          {/* Conditional Field: LAPORAN HARIAN -> PILIH TANGGAL (As seen in har.png) */}
          {reportType === 'Laporan Harian' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                PILIH TANGGAL
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none min-h-[44px] cursor-pointer"
              />
            </div>
          )}

          {/* Conditional Field: LAPORAN MINGGUAN -> PILIH MINGGU (As seen in min.png) */}
          {reportType === 'Laporan Mingguan' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                PILIH MINGGU
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BULAN & TAHUN (For Bulanan and Mingguan, as seen in bul.png & min.png) */}
          {(reportType === 'Laporan Bulanan' || reportType === 'Laporan Mingguan') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  BULAN
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  TAHUN
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
                >
                  <option value={String(startYear)}>{startYear} (Semester 1)</option>
                  <option value={String(endYear)}>{endYear} (Semester 2)</option>
                  {year !== String(startYear) && year !== String(endYear) && (
                    <option value={year}>{year}</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Conditional Field: LAPORAN SEMESTER */}
          {reportType === 'Laporan Semester' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  SEMESTER
                </label>
                <select
                  value={month === 'Januari' ? 'Genap' : 'Ganjil'}
                  onChange={(e) => setMonth(e.target.value === 'Ganjil' ? 'Juli' : 'Januari')}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer min-h-[44px]"
                >
                  <option value="Ganjil">Semester 1 (Ganjil)</option>
                  <option value="Genap">Semester 2 (Genap)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  TAHUN PELAJARAN
                </label>
                <input
                  type="text"
                  value={`${year}/${Number(year) + 1}`}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none min-h-[44px] cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Ringkasan & Kesimpulan Cepat (Quick Preview - Cukup Persentase Saja) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="uppercase tracking-wider">Ringkasan Persentase Kehadiran:</span>
              <span className="text-blue-700 font-extrabold">
                {reportType === 'Laporan Harian' && formatReportDateIndo(selectedDate)}
                {reportType === 'Laporan Mingguan' && `${selectedWeek} (${month} ${year})`}
                {reportType === 'Laporan Bulanan' && `${month} ${year}`}
                {reportType === 'Laporan Semester' && `Semester ${month === 'Januari' ? 'Genap' : 'Ganjil'} ${year}`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[9px] block font-bold text-emerald-700 uppercase">Hadir</span>
                <span className="text-base sm:text-lg font-black text-emerald-900 leading-tight">{liveSummary.pctHadir}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                <span className="text-[9px] block font-bold text-sky-700 uppercase">Sakit</span>
                <span className="text-base sm:text-lg font-black text-sky-900 leading-tight">{liveSummary.pctSakit}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[9px] block font-bold text-amber-700 uppercase">Izin</span>
                <span className="text-base sm:text-lg font-black text-amber-900 leading-tight">{liveSummary.pctIzin}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[9px] block font-bold text-rose-700 uppercase">Alfa</span>
                <span className="text-base sm:text-lg font-black text-rose-900 leading-tight">{liveSummary.pctAlfa}%</span>
              </div>
            </div>
          </div>

          {/* Cetak Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-cetak-laporan-pdf"
              className="w-full py-3.5 px-6 rounded-xl bg-[#1D82F5] hover:bg-blue-600 active:scale-98 text-white font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
            >
              <Printer size={18} />
              <span>CETAK LAPORAN (PDF / A4)</span>
            </button>
          </div>
        </form>

        {/* Informational Banner matching exact screenshot */}
        <div className="p-4 bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl text-xs text-[#7D6608] leading-relaxed flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#FDEBD0] text-[#B7950B] shrink-0 mt-0.5 shadow-xs">
            <FileText size={16} />
          </div>
          <div className="pt-0.5">
            <span className="font-bold text-[#7D6608]">Informasi Tanggal Cetak:</span> Laporan akan dicetak dengan keterangan lokasi dan tanggal{' '}
            <span className="font-bold underline text-[#4A235A]">
              {systemConfig.reportPlace || 'Jakarta'}, {formatReportDateIndo(systemConfig.reportDate || '2026-06-27')}
            </span>{' '}
            sesuai pengaturan sistem.
          </div>
        </div>
      </div>

      {/* PDF / Print Document Preview Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={reportType}
        selectedDate={selectedDate}
        selectedWeek={selectedWeek}
        month={month}
        year={year}
        attendanceType={attendanceType}
        subjectId={selectedSubjectId || null}
        subjectName={selectedSubjectObj?.name || null}
        classId={selectedClassId || null}
        className={selectedClassObj?.name || null}
      />
    </div>
  );
};
