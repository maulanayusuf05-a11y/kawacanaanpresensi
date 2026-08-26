import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceStatus, AttendanceType } from '../types';
import { getUserRoleScope } from '../utils/userScope';
import { getFaseByClassName, formatClassDisplay } from '../utils/faseKurikulum';
import {
  ArrowLeft,
  ClipboardList,
  Calendar,
  CheckCircle2,
  LogOut,
  RotateCcw,
  Save,
  Clock,
  BookOpen,
  UserCheck,
  Sparkles,
  Info,
  GraduationCap,
  FileText,
  Check,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export const AbsensiView: React.FC = () => {
  const {
    students,
    subjects,
    classes,
    teachers,
    currentUser,
    systemConfig,
    schoolProfile,
    currentAttendanceDate,
    setCurrentAttendanceDate,
    getAttendanceForDate,
    saveDailyAttendance,
    getDateStatus,
    setActiveView,
    showToast,
  } = useApp();

  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  const initialMode: AttendanceType = userScope.isGuruMapel ? 'SUBJECT' : 'DAILY';

  const [date, setDate] = useState<string>(currentAttendanceDate);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceType>(initialMode);
  
  // Subject state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (userScope.isGuruMapel && userScope.assignedSubjects.length > 0) {
      return userScope.assignedSubjects[0].id;
    }
    return subjects.find((s) => s.isSpecialized)?.id || subjects[0]?.id || '';
  });

  // Class state
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (userScope.isWaliKelas && userScope.assignedWaliClassId) {
      return userScope.assignedWaliClassId;
    }
    if (userScope.isGuruMapel && userScope.accessibleClasses.length > 0) {
      return userScope.accessibleClasses[0].id;
    }
    return classes[0]?.id || '';
  });

  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const dateStatus = getDateStatus(date);
  const isHoliday = !!dateStatus.isHoliday;
  const isNonStudyDay = !dateStatus.isStudyDay;
  const isNonEffectiveDay = !dateStatus.isEffective;

  // Active study days formatted text (e.g. Senin s.d. Jumat)
  const activeStudyDaysText = useMemo(() => {
    const dayNames: { [key: number]: string } = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      0: 'Minggu',
    };
    const list = (systemConfig.activeStudyDays || [1, 2, 3, 4, 5])
      .map((d) => dayNames[d])
      .filter(Boolean);
    if (list.length === 5 && list[0] === 'Senin' && list[4] === 'Jumat') {
      return 'Senin s.d. Jumat (5 Hari Sekolah)';
    }
    if (list.length === 6 && list[0] === 'Senin' && list[5] === 'Sabtu') {
      return 'Senin s.d. Sabtu (6 Hari Sekolah)';
    }
    return list.join(', ');
  }, [systemConfig.activeStudyDays]);

  // Available subjects for current user
  const selectableSubjects = useMemo(() => {
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
      return matched.length > 0 ? matched : subjects;
    }
    return subjects;
  }, [userScope, subjects]);

  const activeSubject = selectableSubjects.find((s) => s.id === selectedSubjectId) || selectableSubjects[0];

  // Available classes for current selection and mode
  const availableClasses = useMemo(() => {
    if (userScope.isWaliKelas) {
      return userScope.assignedWaliClass ? [userScope.assignedWaliClass] : classes.slice(0, 1);
    }
    if (userScope.isGuruMapel) {
      if (activeSubject?.targetClassIds && activeSubject.targetClassIds.length > 0) {
        const filtered = userScope.accessibleClasses.filter((c) => activeSubject.targetClassIds?.includes(c.id));
        if (filtered.length > 0) return filtered;
      }
      return userScope.accessibleClasses;
    }
    if (attendanceMode === 'SUBJECT' && activeSubject?.targetClassIds && activeSubject.targetClassIds.length > 0) {
      const filtered = classes.filter((c) => activeSubject.targetClassIds?.includes(c.id));
      if (filtered.length > 0) return filtered;
    }
    return classes;
  }, [userScope, attendanceMode, activeSubject, classes]);

  // Synchronize mode and selected class/subject when role scope changes
  useEffect(() => {
    if (userScope.isWaliKelas) {
      if (userScope.assignedWaliClassId && selectedClassId !== userScope.assignedWaliClassId) {
        setSelectedClassId(userScope.assignedWaliClassId);
      }
      if (selectableSubjects.length > 0 && !selectableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(selectableSubjects[0].id);
      }
    } else if (userScope.isGuruMapel) {
      setAttendanceMode('SUBJECT');
      if (userScope.assignedSubjects.length > 0 && !userScope.assignedSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(userScope.assignedSubjects[0].id);
      }
      if (availableClasses.length > 0 && !availableClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
      }
    } else {
      // Admin / KS
      if (availableClasses.length > 0 && !availableClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
      }
    }
  }, [userScope, availableClasses, selectedClassId, selectedSubjectId, selectableSubjects]);

  const currentDayName = useMemo(() => {
    try {
      const [y, m, d] = date.split('-');
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dObj = new Date(Number(y), Number(m) - 1, Number(d));
      return dayNames[dObj.getDay()] || '';
    } catch {
      return '';
    }
  }, [date]);

  const isScheduledToday = useMemo(() => {
    if (attendanceMode !== 'SUBJECT' || !activeSubject?.scheduleDays || activeSubject.scheduleDays.length === 0) {
      return true;
    }
    return activeSubject.scheduleDays.includes(currentDayName);
  }, [attendanceMode, activeSubject, currentDayName]);

  // Auto-lock for Guru Mapel if selected day is not a scheduled teaching day
  const isLockedForGuruMapel = useMemo(() => {
    if (userScope.isGuruMapel) {
      if (activeSubject?.scheduleDays && activeSubject.scheduleDays.length > 0) {
        return !activeSubject.scheduleDays.includes(currentDayName);
      }
      if (currentDayName === 'Minggu') return true;
    }
    return false;
  }, [userScope, activeSubject, currentDayName]);

  // Combined Lock Status (Locked if Holiday, Non-Effective Day, or Non-Teaching Day for Guru Mapel)
  const isDateLocked = isNonEffectiveDay || isLockedForGuruMapel;

  // Load records for the chosen date, mode, and subject
  useEffect(() => {
    const loaded = getAttendanceForDate(date, {
      type: attendanceMode,
      subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
      classId: selectedClassId || null,
    });
    const sorted = [...loaded].sort((a, b) => a.studentName.localeCompare(b.studentName, 'id'));
    setRecords(sorted);
  }, [date, attendanceMode, selectedSubjectId, selectedClassId, students, systemConfig]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setCurrentAttendanceDate(newDate);
  };

  const updateRecord = (studentId: string, updates: Partial<AttendanceRecord>) => {
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan jadwal mengajar mata pelajaran ini', 'error');
      return;
    }
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...updates } : r))
    );
  };

  // Bulk Actions
  const handleHadirSemua = () => {
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan hari jadwal mengajar', 'error');
      return;
    }
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'Hadir',
        checkInTime: systemConfig.defaultCheckInTime,
        checkOutTime: attendanceMode === 'DAILY' ? systemConfig.defaultCheckOutTime : r.checkOutTime,
      }))
    );
    showToast('Semua siswa diatur ke status Hadir');
  };

  const handlePulangMasal = () => {
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan hari jadwal mengajar', 'error');
      return;
    }
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        checkOutTime: systemConfig.defaultCheckOutTime,
      }))
    );
    showToast(`Jam pulang masal (${systemConfig.defaultCheckOutTime}) diterapkan`);
  };

  const handleReset = () => {
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan hari jadwal mengajar', 'error');
      return;
    }
    const targetStudents = selectedClassId
      ? students.filter((s) => s.classId === selectedClassId)
      : students;
    const sortedStudents = [...targetStudents].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    const resetRecords: AttendanceRecord[] = sortedStudents.map((s) => ({
      id: `att-${date}-${attendanceMode === 'SUBJECT' ? selectedSubjectId : 'daily'}-${s.id}`,
      date,
      studentId: s.id,
      studentName: s.nama,
      status: '' as AttendanceStatus,
      checkInTime: '',
      checkOutTime: '',
      notes: '',
      type: attendanceMode,
      subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
      classId: selectedClassId || s.classId || null,
    }));

    setRecords(resetRecords);
    saveDailyAttendance(date, resetRecords, {
      type: attendanceMode,
      subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
      subjectName: activeSubject?.name || null,
      classId: selectedClassId || null,
    });
  };

  const handleSave = () => {
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan hari jadwal mengajar', 'error');
      return;
    }
    saveDailyAttendance(date, records, {
      type: attendanceMode,
      subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
      subjectName: activeSubject?.name || null,
      classId: selectedClassId || null,
    });
  };

  // Status counts
  const countHadir = records.filter((r) => r.status === 'Hadir').length;
  const countSakit = records.filter((r) => r.status === 'Sakit').length;
  const countIzin = records.filter((r) => r.status === 'Izin').length;
  const countAlfa = records.filter((r) => r.status === 'Alfa').length;
  const countBelum = records.filter((r) => !r.status || r.status === '-').length;

  const formatDateIndo = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dObj = new Date(Number(y), Number(m) - 1, Number(d));
      const dayName = dayNames[dObj.getDay()] || 'Hari';
      const monthName = monthNames[Number(m) - 1] || m;
      return `${dayName}, ${d} ${monthName} ${y}`;
    } catch {
      return dateStr;
    }
  };

  const currentSelectedClassName = classes.find((c) => c.id === selectedClassId)?.name || 'Semua Kelas';

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200 pb-20">
      {/* Top Navigation */}
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

      {/* Header Info & Date Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">
                Pencatatan Presensi & Kehadiran
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${dateStatus.badgeColor}`}>
                {dateStatus.label}
              </span>
              {isNonEffectiveDay && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                  <Lock size={11} />
                  <span>Presensi Dikunci</span>
                </span>
              )}
              {userScope.isWaliKelas && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Lock size={11} />
                  <span>Wali {userScope.assignedWaliClassName || 'Kelas'}</span>
                </span>
              )}
              {userScope.isGuruMapel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <ShieldCheck size={11} />
                  <span>Guru Mapel ({selectableSubjects[0]?.code || 'Mapel'})</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {attendanceMode === 'DAILY' ? (
                <span>Format Absensi Wali Kelas • <strong>{currentSelectedClassName}</strong></span>
              ) : (
                <span>Format Absensi Guru Mapel • <strong>{activeSubject?.name || 'Mata Pelajaran'}</strong> ({currentSelectedClassName})</span>
              )}{' '}
              • {formatDateIndo(date)}
            </p>
          </div>
        </div>

        {/* Date Selector Box */}
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs self-start lg:self-auto min-h-[40px]">
          <Calendar size={16} className="text-blue-600 shrink-0" />
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Holiday / Non-Effective Study Day Lock Warning Banner */}
      {isNonEffectiveDay && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs ${
            isHoliday
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
              isHoliday
                ? 'bg-rose-100 border border-rose-300 text-rose-700'
                : 'bg-amber-100 border border-amber-300 text-amber-800'
            }`}
          >
            <Lock size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black tracking-tight">
                {isHoliday
                  ? 'Presensi Siswa Dikunci Otomatis (Hari Libur)'
                  : 'Presensi Siswa Dikunci Otomatis (Bukan Hari Efektif Belajar)'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  isHoliday ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                }`}
              >
                Akses Terkunci
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {isHoliday ? (
                <>
                  Tanggal <strong>{formatDateIndo(date)}</strong> tercatat sebagai{' '}
                  <strong>{dateStatus.eventTitle || dateStatus.label}</strong> pada Kalender Akademik.
                  Pengisian dan perubahan data absensi siswa (Wali Kelas & Guru) dikunci secara otomatis.
                </>
              ) : (
                <>
                  Hari <strong>{currentDayName} ({formatDateIndo(date)})</strong> bukan merupakan hari efektif belajar sekolah.
                  Jadwal hari belajar aktif: <strong>{activeStudyDaysText}</strong>.
                  Pengisian dan perubahan data absensi siswa dinonaktifkan secara otomatis.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Mode Selector & Configuration Toolbar (Hanya untuk Admin / KS / Guru Mapel) */}
      {!userScope.isWaliKelas && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
          {/* Toggle Mode / Role Scoped Mode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">
                {userScope.isGuruMapel
                  ? 'FORMAT ABSENSI (GURU MAPEL)'
                  : 'PILIH FORMAT ABSENSI'}
              </span>
              <div className="inline-flex p-1 bg-slate-200/80 rounded-xl gap-1">
                {/* Wali Kelas Button: Hidden for Guru Mapel */}
                {!userScope.isGuruMapel && (
                  <button
                    type="button"
                    onClick={() => setAttendanceMode('DAILY')}
                    id="btn-mode-daily"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      attendanceMode === 'DAILY'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    <UserCheck size={15} />
                    <span>Format Wali Kelas (Harian)</span>
                  </button>
                )}

                {/* Guru Mapel Button */}
                <button
                  type="button"
                  onClick={() => !userScope.isGuruMapel && setAttendanceMode('SUBJECT')}
                  id="btn-mode-subject"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    attendanceMode === 'SUBJECT'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                  }`}
                >
                  <BookOpen size={15} />
                  <span>Format Guru Mapel (Per Jam Pelajaran)</span>
                </button>
              </div>
            </div>

            {/* Select Class (Admin/KS Daily) or Subject + Class (Guru Mapel / Admin Subject) */}
            <div className="flex flex-wrap items-center gap-3">
              {attendanceMode === 'DAILY' ? (
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    PILIH KELAS
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl shadow-xs outline-none focus:border-blue-600 cursor-pointer min-w-[160px]"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({getFaseByClassName(cls.name, cls.grade)}) {cls.waliKelasName ? `• Wali: ${cls.waliKelasName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span>MATA PELAJARAN</span>
                      {userScope.isGuruMapel && selectableSubjects.length === 1 && (
                        <Lock size={10} className="text-indigo-600" />
                      )}
                    </label>
                    {userScope.isGuruMapel && selectableSubjects.length === 1 ? (
                      <div className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black rounded-xl shadow-xs inline-flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-600" />
                        <span>{selectableSubjects[0].name}</span>
                        {selectableSubjects[0].code && (
                          <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                            {selectableSubjects[0].code}
                          </span>
                        )}
                      </div>
                    ) : (
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        id="select-subject"
                        className="px-3.5 py-2 bg-white border border-blue-300 text-blue-900 text-xs font-bold rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        {selectableSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} {sub.code ? `(${sub.code})` : ''} {sub.teacherName ? `• ${sub.teacherName}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {userScope.isGuruMapel ? 'PILIH ROMBEL YANG DIAJAR' : 'KELAS YANG DIAJAR'}
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      id="select-class"
                      className="px-3.5 py-2 bg-white border border-blue-300 text-blue-900 text-xs font-bold rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[140px]"
                    >
                      {availableClasses.map((cls) => {
                        const label = `${formatClassDisplay(cls.name).toUpperCase()} (${getFaseByClassName(cls.name, cls.grade)})`;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {userScope.isGuruMapel ? label : `${cls.name} (${getFaseByClassName(cls.name, cls.grade)}) ${cls.waliKelasName ? `• Wali: ${cls.waliKelasName}` : ''}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Context Header (Guru Mapel) */}
          {attendanceMode === 'SUBJECT' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              {/* Subject Schedule & Teacher Info Box */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-blue-200 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                    <UserCheck size={15} className="text-blue-600" />
                    <span>Pengajar: {activeSubject?.teacherName || 'Guru Mapel'}</span>
                  </div>
                  {activeSubject?.code && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {activeSubject.code}
                    </span>
                  )}
                  {activeSubject?.scheduleDays && activeSubject.scheduleDays.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[11px]">Jadwal Mengajar:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeSubject.scheduleDays.map((d) => (
                          <span
                            key={d}
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              d === currentDayName
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isLockedForGuruMapel ? (
                  <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                    <Lock size={12} />
                    <span>Bukan Jadwal Mengajar (Terkunci)</span>
                  </span>
                ) : isScheduledToday ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Sesuai Jadwal Mengajar</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                    KBM Tambahan (Hari {currentDayName})
                  </span>
                )}
              </div>

              {/* Locked Warning for Guru Mapel on Non-Teaching Days */}
              {isLockedForGuruMapel && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-amber-950 flex items-center gap-2">
                      <span>Fitur Absensi Siswa Dikunci Otomatis</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black">
                        Bukan Hari Mengajar
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      Hari <strong>{currentDayName}</strong> bukan merupakan jadwal mengajar mata pelajaran <strong>{activeSubject?.name}</strong>.
                      {activeSubject?.scheduleDays && activeSubject.scheduleDays.length > 0 ? (
                        <span> Jadwal resmi mata pelajaran ini adalah: <strong>{activeSubject.scheduleDays.join(', ')}</strong>.</span>
                      ) : (
                        <span> Tidak ada jadwal mengajar pada hari ini.</span>
                      )}
                      {' '}Sistem otomatis menonaktifkan pengisian dan perubahan data absensi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleHadirSemua}
          disabled={isDateLocked}
          id="btn-hadir-semua"
          className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs min-h-[44px] ${
            isDateLocked
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-700 cursor-pointer'
          }`}
        >
          {isDateLocked ? <Lock size={16} /> : <CheckCircle2 size={16} />}
          <span>Hadir Semua</span>
        </button>

        {attendanceMode === 'DAILY' ? (
          <button
            type="button"
            onClick={handlePulangMasal}
            disabled={isDateLocked}
            id="btn-pulang-masal"
            className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs min-h-[44px] ${
              isDateLocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-98 text-blue-700 cursor-pointer'
            }`}
          >
            {isDateLocked ? <Lock size={16} /> : <LogOut size={16} />}
            <span>Pulang Masal</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isDateLocked}
            className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs min-h-[44px] ${
              isDateLocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-98 text-blue-700 cursor-pointer'
            }`}
          >
            {isDateLocked ? <Lock size={16} /> : <Save size={16} />}
            <span>Simpan Presensi Mapel</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          disabled={isDateLocked}
          id="btn-reset-absensi"
          className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs min-h-[44px] ${
            isDateLocked
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'border-rose-300 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 cursor-pointer'
          }`}
        >
          {isDateLocked ? <Lock size={16} /> : <RotateCcw size={16} />}
          <span>Reset Absensi</span>
        </button>
      </div>

      {/* Status Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <span className="text-[11px] font-bold">Hadir</span>
          <span className="text-sm font-black">{countHadir}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-between">
          <span className="text-[11px] font-bold">Sakit</span>
          <span className="text-sm font-black">{countSakit}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
          <span className="text-[11px] font-bold">Izin</span>
          <span className="text-sm font-black">{countIzin}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <span className="text-[11px] font-bold">Alfa</span>
          <span className="text-sm font-black">{countAlfa}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold">Belum Diisi</span>
          <span className="text-sm font-black text-slate-900">{countBelum}</span>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Daftar Siswa {currentSelectedClassName} ({records.length} Siswa) •{' '}
            {attendanceMode === 'DAILY' ? 'Presensi Harian Wali Kelas' : `Presensi ${activeSubject?.name}`}
          </span>
          <span className="text-[10px] text-slate-400 block sm:hidden">← Geser tabel ke kanan →</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60">
                <th className="py-3.5 px-4 w-12 text-center">NO</th>
                <th className="py-3.5 px-4 sm:px-5">NAMA SISWA</th>
                <th className="py-3.5 px-3 sm:px-4 w-40">STATUS KEHADIRAN</th>
                {attendanceMode === 'DAILY' ? (
                  <>
                    <th className="py-3.5 px-3 sm:px-4 w-32">JAM MASUK</th>
                    <th className="py-3.5 px-3 sm:px-4 w-32">JAM PULANG</th>
                    <th className="py-3.5 px-4 sm:px-5 w-56">KETERANGAN WALI KELAS</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-3 sm:px-4 w-36">JAM PELAJARAN</th>
                    <th className="py-3.5 px-4 sm:px-5">CATATAN KEAKTIFAN / PENILAIAN MAPEL</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {records.length > 0 ? (
                records.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-slate-50 transition-colors">
                    {/* No */}
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Nama Siswa */}
                    <td className="py-3 px-4 sm:px-5 font-bold text-slate-900 tracking-tight">
                      {r.studentName}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-3 sm:px-4">
                      <select
                        value={r.status}
                        disabled={isDateLocked}
                        onChange={(e) =>
                          updateRecord(r.studentId, {
                            status: e.target.value as AttendanceStatus,
                            checkInTime:
                              e.target.value === 'Hadir' && !r.checkInTime
                                ? (attendanceMode === 'DAILY' ? systemConfig.defaultCheckInTime : (activeSubject?.lessonPeriod || '07:30'))
                                : r.checkInTime,
                            checkOutTime:
                              e.target.value === 'Hadir' && !r.checkOutTime && attendanceMode === 'DAILY'
                                ? systemConfig.defaultCheckOutTime
                                : r.checkOutTime,
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors outline-none ${
                          isDateLocked
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : r.status === 'Hadir'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-pointer'
                            : r.status === 'Sakit'
                            ? 'bg-sky-50 text-sky-700 border-sky-300 cursor-pointer'
                            : r.status === 'Izin'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 cursor-pointer'
                            : r.status === 'Alfa'
                            ? 'bg-rose-50 text-rose-700 border-rose-300 cursor-pointer'
                            : 'bg-slate-50 text-slate-500 border-slate-300 cursor-pointer'
                        }`}
                      >
                        <option value="">- Belum Diabsen -</option>
                        <option value="Hadir">Hadir</option>
                        <option value="Sakit">Sakit</option>
                        <option value="Izin">Izin</option>
                        <option value="Alfa">Alfa</option>
                      </select>
                    </td>

                    {attendanceMode === 'DAILY' ? (
                      <>
                        {/* Masuk Time */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={r.checkInTime}
                              disabled={isDateLocked}
                              readOnly={isDateLocked}
                              onChange={(e) => updateRecord(r.studentId, { checkInTime: e.target.value })}
                              className={`w-full pl-2.5 pr-6 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                                isDateLocked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
                              }`}
                            />
                            <Clock size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
                          </div>
                        </td>

                        {/* Pulang Time */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={r.checkOutTime}
                              disabled={isDateLocked}
                              readOnly={isDateLocked}
                              onChange={(e) => updateRecord(r.studentId, { checkOutTime: e.target.value })}
                              className={`w-full pl-2.5 pr-6 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                                isDateLocked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
                              }`}
                            />
                            <Clock size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
                          </div>
                        </td>

                        {/* Catatan Wali Kelas */}
                        <td className="py-3 px-4 sm:px-5">
                          <input
                            type="text"
                            value={r.notes || ''}
                            disabled={isDateLocked}
                            readOnly={isDateLocked}
                            onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                            placeholder={
                              isNonEffectiveDay
                                ? 'Presensi terkunci (hari libur / bukan hari efektif)...'
                                : 'Keterangan surat / izin...'
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors ${
                              isDateLocked
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed placeholder-slate-400'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white'
                            }`}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Jam Pelajaran Mapel */}
                        <td className="py-3 px-3 sm:px-4">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md block text-center">
                            {r.checkInTime || activeSubject?.lessonPeriod || 'Sesuai Jadwal'}
                          </span>
                        </td>

                        {/* Catatan / Penilaian Guru Mapel */}
                        <td className="py-3 px-4 sm:px-5">
                          <input
                            type="text"
                            value={r.notes || ''}
                            disabled={isDateLocked}
                            readOnly={isDateLocked}
                            onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                            placeholder={
                              isNonEffectiveDay
                                ? 'Presensi terkunci (hari libur / bukan hari efektif)...'
                                : isLockedForGuruMapel
                                ? 'Presensi terkunci (bukan hari mengajar)...'
                                : 'Catatan keaktifan siswa saat jam pelajaran...'
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors ${
                              isDateLocked
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed placeholder-slate-400'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white'
                            }`}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={attendanceMode === 'DAILY' ? 6 : 5} className="text-center py-10 text-slate-400 font-medium">
                    Belum ada siswa di kelas <strong>{currentSelectedClassName}</strong>. Tambahkan siswa di Data Referensi → Data Siswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Save Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isDateLocked}
          id="btn-simpan-absensi"
          className={`w-full sm:w-auto px-6 py-3.5 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] ${
            isDateLocked
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white hover:shadow-lg cursor-pointer'
          }`}
        >
          {isDateLocked ? <Lock size={18} /> : <Save size={18} />}
          <span>
            {isNonEffectiveDay
              ? `PRESENSI TERKUNCI (${isHoliday ? 'HARI LIBUR' : 'BUKAN HARI EFEKTIF BELAJAR'})`
              : isLockedForGuruMapel
              ? 'PRESENSI TERKUNCI (BUKAN HARI MENGAJAR)'
              : 'SIMPAN DATA PRESENSI'}
          </span>
        </button>
      </div>
    </div>
  );
};
