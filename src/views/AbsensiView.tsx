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
  Loader2,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { ClassQrModal } from '../components/ClassQrModal';

export const AbsensiView: React.FC = () => {
  const {
    students,
    subjects,
    classes,
    teachers,
    currentUser,
    systemConfig,
    activeStudyDays,
    schoolProfile,
    currentAttendanceDate,
    setCurrentAttendanceDate,
    getAttendanceForDate,
    saveDailyAttendance,
    getDateStatus,
    setActiveView,
    showToast,
    attendanceRecords,
    requestFeatureAccess,
  } = useApp();

  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  const initialMode: AttendanceType = userScope.isGuruMapel ? 'SUBJECT' : 'DAILY';

  const [date, setDate] = useState<string>(currentAttendanceDate);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceType>(initialMode);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isClassQrOpen, setIsClassQrOpen] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const isDirtyRef = React.useRef<boolean>(false);
  const prevContextKeyRef = React.useRef<string>('');

  const draftStorageKey = useMemo(() => {
    const schoolKey = currentUser?.schoolId || 'default';
    return `kawacanaan_att_draft_${schoolKey}_${selectedClassId}_${date}_${attendanceMode}_${selectedSubjectId || 'none'}`;
  }, [currentUser?.schoolId, selectedClassId, date, attendanceMode, selectedSubjectId]);

  const currentContextKey = `${selectedClassId}_${date}_${attendanceMode}_${selectedSubjectId}`;

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
    const effectiveDays =
      Array.isArray(activeStudyDays) && activeStudyDays.length > 0
        ? activeStudyDays
        : systemConfig.activeStudyDays || [1, 2, 3, 4, 5];
    const list = effectiveDays
      .map((d) => dayNames[d])
      .filter(Boolean);
    if (list.length === 5 && list[0] === 'Senin' && list[4] === 'Jumat') {
      return 'Senin s.d. Jumat (5 Hari Sekolah)';
    }
    if (list.length === 6 && list[0] === 'Senin' && list[5] === 'Sabtu') {
      return 'Senin s.d. Sabtu (6 Hari Sekolah)';
    }
    return list.join(', ');
  }, [activeStudyDays, systemConfig.activeStudyDays]);

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

  // Active target class for QR Presensi Rombel & modal
  const activeTargetClass = useMemo(() => {
    return (
      classes.find((c) => c.id === selectedClassId) ||
      availableClasses.find((c) => c.id === selectedClassId) ||
      availableClasses[0] ||
      classes[0] ||
      null
    );
  }, [classes, availableClasses, selectedClassId]);

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
    if (attendanceMode !== 'SUBJECT' || !activeSubject) {
      return true;
    }
    // Check class-specific schedule if available for the selected class
    if (selectedClassId && activeSubject.classSchedules && activeSubject.classSchedules.length > 0) {
      const clsSched = activeSubject.classSchedules.find((cs) => cs.classId === selectedClassId);
      if (clsSched && clsSched.days && clsSched.days.length > 0) {
        return clsSched.days.includes(currentDayName);
      }
    }
    if (!activeSubject.scheduleDays || activeSubject.scheduleDays.length === 0) {
      return true;
    }
    return activeSubject.scheduleDays.includes(currentDayName);
  }, [attendanceMode, activeSubject, selectedClassId, currentDayName]);

  // Auto-lock for Guru Mapel if selected day is not a scheduled teaching day
  const isLockedForGuruMapel = useMemo(() => {
    if (userScope.isGuruMapel) {
      if (selectedClassId && activeSubject?.classSchedules && activeSubject.classSchedules.length > 0) {
        const clsSched = activeSubject.classSchedules.find((cs) => cs.classId === selectedClassId);
        if (clsSched && clsSched.days && clsSched.days.length > 0) {
          return !clsSched.days.includes(currentDayName);
        }
      }
      if (activeSubject?.scheduleDays && activeSubject.scheduleDays.length > 0) {
        return !activeSubject.scheduleDays.includes(currentDayName);
      }
      if (currentDayName === 'Minggu') return true;
    }
    return false;
  }, [userScope, activeSubject, selectedClassId, currentDayName]);

  // Combined Lock Status (Locked if Holiday, Non-Effective Day, or Non-Teaching Day for Guru Mapel)
  const isDateLocked = isNonEffectiveDay || isLockedForGuruMapel;

  // Load records for the chosen date, mode, and subject with dirty-protection and draft restore
  useEffect(() => {
    const isContextSwitch = prevContextKeyRef.current !== currentContextKey;
    prevContextKeyRef.current = currentContextKey;

    if (isContextSwitch) {
      // 1. Cek apakah ada draft yang belum tersimpan di session storage
      let restoredDraft: AttendanceRecord[] | null = null;
      try {
        const draftRaw = sessionStorage.getItem(draftStorageKey);
        if (draftRaw) {
          restoredDraft = JSON.parse(draftRaw);
        }
      } catch (_) {}

      if (restoredDraft && Array.isArray(restoredDraft) && restoredDraft.length > 0) {
        setRecords(restoredDraft);
        setIsDirty(true);
        isDirtyRef.current = true;
        return;
      }

      // 2. Jika tidak ada draft, ambil data absensi resmi dari store
      const loaded = getAttendanceForDate(date, {
        type: attendanceMode,
        subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
        classId: selectedClassId || null,
      });
      const sorted = [...loaded].sort((a, b) => a.studentName.localeCompare(b.studentName, 'id'));
      setRecords(sorted);
      setIsDirty(false);
      isDirtyRef.current = false;
    } else {
      // Context sama (misal background sync data siswa atau sinkronisasi data master)
      const loaded = getAttendanceForDate(date, {
        type: attendanceMode,
        subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
        classId: selectedClassId || null,
      });

      if (isDirtyRef.current) {
        // Jangan timpa input yang sedang diedit oleh pengguna!
        setRecords((prev) => {
          const mapPrev = new Map<string, AttendanceRecord>(prev.map((r) => [r.studentId, r]));
          const merged = loaded.map((fresh) => {
            const existing = mapPrev.get(fresh.studentId);
            if (existing && existing.status) {
              return { ...fresh, ...existing };
            }
            return fresh;
          });
          return [...merged].sort((a, b) => a.studentName.localeCompare(b.studentName, 'id'));
        });
      } else {
        const sorted = [...loaded].sort((a, b) => a.studentName.localeCompare(b.studentName, 'id'));
        setRecords(sorted);
      }
    }
  }, [currentContextKey, draftStorageKey, students, systemConfig, attendanceRecords]);

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
    setIsDirty(true);
    isDirtyRef.current = true;
    setRecords((prev) => {
      const updated = prev.map((r) => (r.studentId === studentId ? { ...r, ...updates } : r));
      try {
        sessionStorage.setItem(draftStorageKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
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
    setIsDirty(true);
    isDirtyRef.current = true;
    setRecords((prev) => {
      const updated = prev.map((r) => ({
        ...r,
        status: 'Hadir',
        checkInTime: systemConfig.defaultCheckInTime,
        checkOutTime: r.checkOutTime || '',
      }));
      try {
        sessionStorage.setItem(draftStorageKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
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
    setIsDirty(true);
    isDirtyRef.current = true;
    setRecords((prev) => {
      const updated = prev.map((r) => ({
        ...r,
        checkOutTime: systemConfig.defaultCheckOutTime,
      }));
      try {
        sessionStorage.setItem(draftStorageKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    showToast(`Jam pulang masal (${systemConfig.defaultCheckOutTime}) diterapkan`);
  };

  const handleReset = async () => {
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
    setIsDirty(false);
    isDirtyRef.current = false;
    try {
      sessionStorage.removeItem(draftStorageKey);
    } catch (_) {}

    await saveDailyAttendance(date, resetRecords, {
      type: attendanceMode,
      subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
      subjectName: activeSubject?.name || null,
      classId: selectedClassId || null,
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (isNonEffectiveDay) {
      showToast(`Presensi siswa terkunci: ${dateStatus.label}`, 'error');
      return;
    }
    if (isLockedForGuruMapel) {
      showToast('Presensi terkunci karena bukan hari jadwal mengajar', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveDailyAttendance(date, records, {
        type: attendanceMode,
        subjectId: attendanceMode === 'SUBJECT' ? selectedSubjectId : null,
        subjectName: activeSubject?.name || null,
        classId: selectedClassId || null,
      });
      if (res?.success) {
        setIsDirty(false);
        isDirtyRef.current = false;
        try {
          sessionStorage.removeItem(draftStorageKey);
        } catch (_) {}
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Status counts
  const countHadir = records.filter((r) => r.status === 'Hadir').length;
  const countSakit = records.filter((r) => r.status === 'Sakit').length;
  const countIzin = records.filter((r) => r.status === 'Izin').length;
  const countAlfa = records.filter((r) => r.status === 'Alfa').length;
  const countBelum = records.filter((r) => !r.status || r.status === '-').length;
  const countTotalDiabsen = countHadir + countSakit + countIzin + countAlfa;
  const percentageDiabsen = records.length > 0 ? Math.round((countTotalDiabsen / records.length) * 100) : 0;

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => r.studentName.toLowerCase().includes(q));
  }, [records, searchQuery]);

  const changeDateByOffset = (offsetDays: number) => {
    try {
      const [y, m, d] = date.split('-');
      const current = new Date(Number(y), Number(m) - 1, Number(d));
      current.setDate(current.getDate() + offsetDays);
      const newY = current.getFullYear();
      const newM = String(current.getMonth() + 1).padStart(2, '0');
      const newD = String(current.getDate()).padStart(2, '0');
      handleDateChange(`${newY}-${newM}-${newD}`);
    } catch (_) {}
  };

  const isToday = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return date === `${y}-${m}-${d}`;
  }, [date]);

  const goToToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    handleDateChange(`${y}-${m}-${d}`);
  };

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
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3.5 sm:space-y-5 animate-in fade-in duration-200 pb-28">
      {/* Top Navigation & Fast Context Bar */}
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs min-h-[36px] cursor-pointer active:scale-95"
          id="btn-back-dashboard"
        >
          <ArrowLeft size={13} />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
            Rombel:
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold shadow-2xs">
            {currentSelectedClassName}
          </span>
          {attendanceMode === 'SUBJECT' && activeSubject && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-2xs">
              {activeSubject.name}
            </span>
          )}
        </div>
      </div>

      {/* Header Info & Responsive Date Picker */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardList size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Pencatatan Presensi
              </h1>
              {dateStatus.label !== 'Hari Efektif Belajar' && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dateStatus.badgeColor}`}>
                  {dateStatus.label}
                </span>
              )}
              {isNonEffectiveDay && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                  <Lock size={10} />
                  <span>Terkunci</span>
                </span>
              )}
              {userScope.isGuruMapel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <ShieldCheck size={10} />
                  <span>Guru Mapel</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
              {attendanceMode === 'DAILY' ? (
                <span>Wali Kelas • {currentSelectedClassName}</span>
              ) : (
                <span>Guru Mapel • {activeSubject?.name || 'Mapel'} ({currentSelectedClassName})</span>
              )}{' '}
              • <strong className="text-slate-700">{formatDateIndo(date)}</strong>
            </p>
          </div>
        </div>

        {/* Date Selector Box with Prev / Today / Next Quick Jumps */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/90 p-1 rounded-xl border border-slate-200 shadow-2xs self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => changeDateByOffset(-1)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Hari Sebelumnya (H-1)"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <Calendar size={13} className="text-blue-600 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => changeDateByOffset(1)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Hari Berikutnya (H+1)"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={goToToday}
              className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
          )}
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
                  onClick={() => {
                    if (userScope.isGuruMapel) return;
                    if (
                      !requestFeatureAccess(
                        'presensi_mapel',
                        'Presensi Guru Mata Pelajaran',
                        'Pencatatan presensi per jam pelajaran dan lintas kelas binaan merupakan fasilitas pada Paket Guru dan Paket Sekolah.'
                      )
                    ) {
                      return;
                    }
                    setAttendanceMode('SUBJECT');
                  }}
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
                  <div className="flex items-center gap-1.5">
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
                    {activeTargetClass && (
                      <button
                        type="button"
                        onClick={() => setIsClassQrOpen(true)}
                        id="btn-quick-qr-daily"
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition cursor-pointer shrink-0"
                        title={`Lihat / Cetak QR Presensi ${activeTargetClass.name}`}
                      >
                        <QrCode size={16} />
                      </button>
                    )}
                  </div>
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
                    <div className="flex items-center gap-1.5">
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
                      {activeTargetClass && (
                        <button
                          type="button"
                          onClick={() => setIsClassQrOpen(true)}
                          id="btn-quick-qr-subject"
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition cursor-pointer shrink-0"
                          title={`Lihat / Cetak QR Presensi ${activeTargetClass.name}`}
                        >
                          <QrCode size={16} />
                        </button>
                      )}
                    </div>
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

      {/* Unsaved Changes Alert Banner */}
      {isDirty && !isDateLocked && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-bold animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 animate-ping" />
          <span>Ada perubahan absensi yang belum disimpan. Klik <strong>Simpan Presensi</strong> untuk menyimpan permanen.</span>
        </div>
      )}

      {/* Bulk Action Buttons - Compact Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={handleHadirSemua}
          disabled={isDateLocked || isSaving}
          id="btn-hadir-semua"
          className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs min-h-[40px] ${
            isDateLocked || isSaving
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 cursor-pointer'
          }`}
        >
          {isDateLocked ? <Lock size={14} /> : <CheckCircle2 size={14} />}
          <span>Hadir Semua</span>
        </button>

        {attendanceMode === 'DAILY' ? (
          <button
            type="button"
            onClick={handlePulangMasal}
            disabled={isDateLocked || isSaving}
            id="btn-pulang-masal"
            className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs min-h-[40px] ${
              isDateLocked || isSaving
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 cursor-pointer'
            }`}
          >
            {isDateLocked ? <Lock size={14} /> : <LogOut size={14} />}
            <span>Pulang Masal</span>
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={() => setIsClassQrOpen(true)}
          disabled={!activeTargetClass}
          id="btn-qr-presensi-rombel"
          className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs min-h-[40px] ${
            !activeTargetClass
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 cursor-pointer'
          }`}
          title={`Tampilkan / Cetak QR Code Presensi ${activeTargetClass?.name || 'Rombel Kelas'}`}
        >
          <QrCode size={14} />
          <span>QR Presensi</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isDateLocked || isSaving}
          id="btn-reset-absensi"
          className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs min-h-[40px] ${
            isDateLocked || isSaving
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'border-rose-300 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 cursor-pointer'
          }`}
        >
          {isDateLocked ? <Lock size={14} /> : <RotateCcw size={14} />}
          <span>Reset</span>
        </button>
      </div>

      {/* Unified Status Ribbon & Completion Meter */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hadir:</span>
              <strong className="text-emerald-950">{countHadir}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Sakit:</span>
              <strong className="text-sky-950">{countSakit}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Izin:</span>
              <strong className="text-amber-950">{countIzin}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Alfa:</span>
              <strong className="text-rose-950">{countAlfa}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Belum:</span>
              <strong className="text-slate-900">{countBelum}</strong>
            </span>
          </div>

          {/* Progress Percent */}
          <div className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
            <span>{countTotalDiabsen} / {records.length} Diabsen</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black">
              {percentageDiabsen}%
            </span>
          </div>
        </div>

        {/* Progress Bar Line */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percentageDiabsen}%` }}
          />
        </div>
      </div>

      {/* Student List Container with Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        {/* Header & Quick Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800">
              Daftar Siswa {currentSelectedClassName}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-bold">
              {filteredRecords.length} dari {records.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center min-w-[200px] sm:max-w-xs w-full sm:w-auto">
            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 1. Mobile Phone Touch Card View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((r, idx) => (
              <div key={r.studentId} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                {/* Card Top: Number + Name + Subject Sync Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {r.studentName}
                    </span>
                  </div>

                  {attendanceMode === 'SUBJECT' && (() => {
                    const dailyRec = attendanceRecords.find(
                      (ar) => ar.studentId === r.studentId && ar.date === date && (!ar.type || ar.type === 'DAILY')
                    );
                    if (dailyRec?.status === 'Hadir') {
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          Hadir Wali
                        </span>
                      );
                    }
                    if (dailyRec?.status === 'Sakit' || dailyRec?.status === 'Izin') {
                      return (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                          {dailyRec.status} (Wali)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Card 1-Tap Quick Attendance Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Hadir', 'Sakit', 'Izin', 'Alfa'] as AttendanceStatus[]).map((statusOption) => {
                    const isSelected = r.status === statusOption;
                    let activeColor = '';
                    if (isSelected) {
                      if (statusOption === 'Hadir') activeColor = 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-black';
                      else if (statusOption === 'Sakit') activeColor = 'bg-sky-600 text-white border-sky-600 shadow-xs font-black';
                      else if (statusOption === 'Izin') activeColor = 'bg-amber-600 text-white border-amber-600 shadow-xs font-black';
                      else if (statusOption === 'Alfa') activeColor = 'bg-rose-600 text-white border-rose-600 shadow-xs font-black';
                    } else {
                      activeColor = 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold';
                    }

                    return (
                      <button
                        key={statusOption}
                        type="button"
                        disabled={isDateLocked}
                        onClick={() => {
                          const newStatus = isSelected ? '' : statusOption;
                          updateRecord(r.studentId, {
                            status: newStatus as AttendanceStatus,
                            checkInTime:
                              newStatus === 'Hadir' && !r.checkInTime
                                ? (attendanceMode === 'DAILY' ? systemConfig.defaultCheckInTime : (activeSubject?.lessonPeriod || '07:30'))
                                : r.checkInTime,
                            checkOutTime:
                              newStatus === 'Hadir' && !r.checkOutTime && attendanceMode === 'DAILY'
                                ? systemConfig.defaultCheckOutTime
                                : r.checkOutTime,
                          });
                        }}
                        className={`py-2 px-1 rounded-xl text-xs border text-center transition-all cursor-pointer min-h-[38px] active:scale-95 ${activeColor}`}
                      >
                        {statusOption}
                      </button>
                    );
                  })}
                </div>

                {/* Card Extra Fields: Times or Notes */}
                {attendanceMode === 'DAILY' ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">Masuk:</span>
                      <input
                        type="text"
                        value={r.checkInTime || ''}
                        disabled={isDateLocked}
                        placeholder="07:00"
                        onChange={(e) => updateRecord(r.studentId, { checkInTime: e.target.value })}
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">Pulang:</span>
                      <input
                        type="text"
                        value={r.checkOutTime || ''}
                        disabled={isDateLocked}
                        placeholder="14:00"
                        onChange={(e) => updateRecord(r.studentId, { checkOutTime: e.target.value })}
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        value={r.notes || ''}
                        disabled={isDateLocked}
                        placeholder="Catatan / keterangan surat izin..."
                        onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 text-xs space-y-1.5">
                    <input
                      type="text"
                      value={r.notes || ''}
                      disabled={isDateLocked}
                      placeholder="Catatan keaktifan siswa saat jam pelajaran..."
                      onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada siswa yang sesuai dengan filter atau pencarian.
            </div>
          )}
        </div>

        {/* 2. Desktop & Tablet Compact High-Density Table (≥ md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60">
                <th className="py-2.5 px-3 w-10 text-center">NO</th>
                <th className="py-2.5 px-3.5">NAMA SISWA</th>
                <th className="py-2.5 px-3 w-38">STATUS KEHADIRAN</th>
                {attendanceMode === 'DAILY' ? (
                  <>
                    <th className="py-2.5 px-3 w-28">JAM MASUK</th>
                    <th className="py-2.5 px-3 w-28">JAM PULANG</th>
                    <th className="py-2.5 px-3.5 w-52">KETERANGAN WALI KELAS</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 w-32">JAM MAPEL</th>
                    <th className="py-2.5 px-3.5">CATATAN KEAKTIFAN MAPEL</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                    {/* No */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Nama Siswa */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 tracking-tight">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.studentName}</span>
                        {attendanceMode === 'SUBJECT' && (() => {
                          const dailyRec = attendanceRecords.find(
                            (ar) => ar.studentId === r.studentId && ar.date === date && (!ar.type || ar.type === 'DAILY')
                          );
                          if (dailyRec?.status === 'Hadir') {
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0"
                                title={`Siswa hadir di sekolah (dicatat Wali Kelas)`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Hadir
                              </span>
                            );
                          }
                          if (dailyRec?.status === 'Sakit' || dailyRec?.status === 'Izin') {
                            return (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                                {dailyRec.status} (Wali)
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-2.5 px-3">
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
                        className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors outline-none cursor-pointer ${
                          isDateLocked
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : r.status === 'Hadir'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : r.status === 'Sakit'
                            ? 'bg-sky-50 text-sky-700 border-sky-300'
                            : r.status === 'Izin'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : r.status === 'Alfa'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
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
                        <td className="py-2.5 px-3">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={r.checkInTime || ''}
                              disabled={isDateLocked}
                              readOnly={isDateLocked}
                              onChange={(e) => updateRecord(r.studentId, { checkInTime: e.target.value })}
                              className={`w-full pl-2 pr-5 py-1 border rounded-lg text-xs font-semibold outline-none ${
                                isDateLocked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
                              }`}
                            />
                            <Clock size={11} className="absolute right-1.5 text-slate-400 pointer-events-none" />
                          </div>
                        </td>

                        {/* Pulang Time */}
                        <td className="py-2.5 px-3">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={r.checkOutTime || ''}
                              disabled={isDateLocked}
                              readOnly={isDateLocked}
                              onChange={(e) => updateRecord(r.studentId, { checkOutTime: e.target.value })}
                              className={`w-full pl-2 pr-5 py-1 border rounded-lg text-xs font-semibold outline-none ${
                                isDateLocked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
                              }`}
                            />
                            <Clock size={11} className="absolute right-1.5 text-slate-400 pointer-events-none" />
                          </div>
                        </td>

                        {/* Catatan Wali Kelas */}
                        <td className="py-2.5 px-3.5">
                          <input
                            type="text"
                            value={r.notes || ''}
                            disabled={isDateLocked}
                            readOnly={isDateLocked}
                            onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                            placeholder="Keterangan surat / izin..."
                            className={`w-full px-2 py-1 rounded-lg text-xs outline-none transition-colors ${
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
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded block text-center">
                            {r.checkInTime || activeSubject?.lessonPeriod || 'Sesuai'}
                          </span>
                        </td>

                        {/* Catatan / Penilaian Guru Mapel */}
                        <td className="py-2.5 px-3.5">
                          <input
                            type="text"
                            value={r.notes || ''}
                            disabled={isDateLocked}
                            readOnly={isDateLocked}
                            onChange={(e) => updateRecord(r.studentId, { notes: e.target.value })}
                            placeholder="Catatan keaktifan siswa saat jam pelajaran..."
                            className={`w-full px-2 py-1 rounded-lg text-xs outline-none transition-colors ${
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
                  <td colSpan={attendanceMode === 'DAILY' ? 6 : 5} className="text-center py-8 text-slate-400 font-medium text-xs">
                    {searchQuery
                      ? 'Tidak ada siswa yang cocok dengan kata kunci pencarian.'
                      : `Belum ada siswa di kelas ${currentSelectedClassName}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Sticky Bottom Save Bar */}
      <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 self-start sm:self-auto">
          {isDirty && !isDateLocked ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-extrabold text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Ada perubahan belum disimpan</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Semua data tersinkron</span>
            </span>
          )}
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-500 font-medium">
            {countTotalDiabsen} / {records.length} terisi
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isDateLocked || isSaving}
          id="btn-simpan-absensi"
          className={`w-full sm:w-auto px-5 py-2.5 font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 min-h-[42px] cursor-pointer ${
            isDateLocked || isSaving
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white hover:shadow-md'
          }`}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isDateLocked ? (
            <Lock size={16} />
          ) : (
            <Save size={16} />
          )}
          <span>
            {isSaving
              ? 'Menyimpan...'
              : isNonEffectiveDay
              ? 'Presensi Terkunci (Hari Libur)'
              : isLockedForGuruMapel
              ? 'Terkunci (Bukan Jadwal Mengajar)'
              : 'Simpan Presensi'}
          </span>
        </button>
      </div>
      {/* Class QR Attendance Code Modal */}
      {isClassQrOpen && activeTargetClass && (
        <ClassQrModal
          isOpen={isClassQrOpen}
          onClose={() => setIsClassQrOpen(false)}
          schoolClass={activeTargetClass}
          classItem={activeTargetClass}
          schoolProfile={schoolProfile}
          systemConfig={systemConfig}
          classList={availableClasses.length > 0 ? availableClasses : classes}
        />
      )}
    </div>
  );
};
