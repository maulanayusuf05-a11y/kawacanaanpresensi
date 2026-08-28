import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getUserRoleScope } from '../utils/userScope';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import {
  Users,
  Calendar,
  Building,
  Building2,
  UserCheck,
  ClipboardList,
  BarChart2,
  FileText,
  Settings,
  ArrowRight,
  TrendingUp,
  Percent,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Key,
  User,
  Crown,
  Award,
  CheckCircle2,
} from 'lucide-react';

interface SummaryCache {
  scopedTotal: number;
  scopedMale: number;
  scopedFemale: number;
  usersCount: number;
  studentsCount: number;
  classesCount: number;
  guruKsCount: number;
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alfaCount: number;
  recordTotal: number;
  hadirPercent: number;
  trendData: { day: string; count: number }[];
  timestamp: number;
}

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    activeWorkspace,
    users,
    classes,
    subjects,
    teachers,
    students,
    attendanceRecords,
    academicEvents,
    effectiveDaysConfig,
    getEffectiveDaysForMonth,
    setActiveView,
    schoolProfile,
    currentAttendanceDate,
    isDataLoading,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);

  // Workspace cache key
  const cacheKey = `kawacanaan_summary_cache_${activeWorkspace?.workspaceId || currentUser?.schoolId || 'global'}`;

  // Read initial cache from localStorage to prevent zero-value flash
  const [cachedSummary, setCachedSummary] = useState<SummaryCache | null>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  });

  // Resolve user role scope (Wali Kelas, Guru Mapel, Admin, KS)
  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  // Month & time calculation
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthNames = useMemo(
    () => [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ],
    []
  );
  const currentMonthName = monthNames[now.getMonth()];
  const effectiveDaysThisMonth = getEffectiveDaysForMonth(currentYear, currentMonth);

  // Scoped students calculation based on role
  const scopedStudents = useMemo(() => {
    if (userScope.isWaliKelas) {
      if (userScope.assignedWaliClassId) {
        return students.filter((s) => s.classId === userScope.assignedWaliClassId);
      }
      if (currentUser?.classIds && currentUser.classIds.length > 0) {
        return students.filter((s) => currentUser.classIds?.includes(s.classId || ''));
      }
      return students;
    }
    if (userScope.isGuruMapel) {
      const accessibleClassIds = userScope.accessibleClasses.map((c) => c.id);
      if (accessibleClassIds.length > 0) {
        return students.filter((s) => accessibleClassIds.includes(s.classId || ''));
      }
      return students;
    }
    return students;
  }, [userScope, students, currentUser]);

  const scopedStudentIds = useMemo(() => new Set(scopedStudents.map((s) => s.id)), [scopedStudents]);

  // Metrics for scoped students
  const scopedTotal = scopedStudents.length || cachedSummary?.scopedTotal || 0;
  const scopedMale = scopedStudents.filter((s) => s.gender === 'L').length || cachedSummary?.scopedMale || 0;
  const scopedFemale = scopedStudents.filter((s) => s.gender === 'P').length || cachedSummary?.scopedFemale || 0;

  // Today's attendance calculation (Context-aware for Wali Kelas vs Guru Mapel vs Admin/KS)
  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);

  const todayRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const isDateMatch = r.date === todayStr || r.date === currentAttendanceDate;
      if (!isDateMatch) return false;

      if (userScope.isWaliKelas) {
        return scopedStudentIds.has(r.studentId) && r.type !== 'SUBJECT';
      }
      if (userScope.isGuruMapel) {
        const assignedSubjectIds = new Set(userScope.assignedSubjectIds);
        if (assignedSubjectIds.size > 0) {
          return (
            scopedStudentIds.has(r.studentId) &&
            r.type === 'SUBJECT' &&
            r.subjectId &&
            assignedSubjectIds.has(r.subjectId)
          );
        }
        return scopedStudentIds.has(r.studentId) && r.type === 'SUBJECT';
      }
      return r.type !== 'SUBJECT';
    });
  }, [attendanceRecords, todayStr, currentAttendanceDate, userScope, scopedStudentIds]);

  const hadirCount = todayRecords.filter((r) => r.status === 'Hadir').length || cachedSummary?.hadirCount || 0;
  const sakitCount = todayRecords.filter((r) => r.status === 'Sakit').length || cachedSummary?.sakitCount || 0;
  const izinCount = todayRecords.filter((r) => r.status === 'Izin').length || cachedSummary?.izinCount || 0;
  const alfaCount = todayRecords.filter((r) => r.status === 'Alfa').length || cachedSummary?.alfaCount || 0;
  const recordTotal =
    hadirCount + sakitCount + izinCount + alfaCount ||
    scopedTotal ||
    students.length ||
    cachedSummary?.recordTotal ||
    0;
  const hadirPercent =
    recordTotal > 0 ? Math.round((hadirCount / recordTotal) * 100) : cachedSummary?.hadirPercent || 0;

  // 7-day trend data (Sab, Min, Sen, Sel, Rab, Kam, Jum)
  const dayNames = useMemo(() => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], []);
  const trendData = useMemo(() => {
    if (attendanceRecords.length === 0 && cachedSummary?.trendData) {
      return cachedSummary.trendData;
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().split('T')[0];
      const recs = attendanceRecords.filter((r) => {
        if (r.date !== dStr) return false;
        if (userScope.isWaliKelas) {
          return scopedStudentIds.has(r.studentId) && r.type !== 'SUBJECT';
        }
        if (userScope.isGuruMapel) {
          const assignedSubjectIds = new Set(userScope.assignedSubjectIds);
          if (assignedSubjectIds.size > 0) {
            return (
              scopedStudentIds.has(r.studentId) &&
              r.type === 'SUBJECT' &&
              r.subjectId &&
              assignedSubjectIds.has(r.subjectId)
            );
          }
          return scopedStudentIds.has(r.studentId) && r.type === 'SUBJECT';
        }
        return r.type !== 'SUBJECT';
      });
      const hCount = recs.filter((r) => r.status === 'Hadir').length;
      return {
        day: dayNames[d.getDay()],
        count: hCount,
      };
    });
  }, [attendanceRecords, cachedSummary?.trendData, dayNames, userScope, scopedStudentIds]);

  // Save calculated summary to localStorage cache for lightning-fast next load
  useEffect(() => {
    if (!isDataLoading && (students.length > 0 || users.length > 0 || classes.length > 0)) {
      const summaryToCache: SummaryCache = {
        scopedTotal,
        scopedMale,
        scopedFemale,
        usersCount: users.length,
        studentsCount: students.length,
        classesCount: classes.length,
        guruKsCount: users.filter(
          (u) =>
            u.role === 'GURU' ||
            u.role === 'WALI KELAS' ||
            u.role === 'GURU MAPEL' ||
            u.role === 'KEPALA SEKOLAH'
        ).length,
        hadirCount,
        sakitCount,
        izinCount,
        alfaCount,
        recordTotal,
        hadirPercent,
        trendData,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(summaryToCache));
      } catch (_) {}
    }
  }, [
    isDataLoading,
    cacheKey,
    scopedTotal,
    scopedMale,
    scopedFemale,
    users,
    students,
    classes,
    hadirCount,
    sakitCount,
    izinCount,
    alfaCount,
    recordTotal,
    hadirPercent,
    trendData,
  ]);

  // Agenda Mendatang: hanya untuk bulan berjalan dan tanggal yang belum terlewat (>= tanggal hari ini)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const todayFormatted = `${currentYear}-${currentMonth}-${currentDay}`;
    const currentMonthPrefix = `${currentYear}-${currentMonth}`;

    return academicEvents
      .filter((e) => {
        if (!e.date) return false;
        // Hanya untuk bulan berjalan
        const inCurrentMonth = e.date.startsWith(currentMonthPrefix);
        // Tanggal yang belum terlewat (>= tanggal hari ini)
        const isUpcomingOrToday = e.date >= todayFormatted;
        return inCurrentMonth && isUpcomingOrToday;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [academicEvents]);

  const menuItems = [
    {
      id: 'data-referensi',
      title: 'Data Referensi',
      desc: 'Sekolah, Guru, Siswa & Kelas',
      icon: Building,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'data-pengguna',
      title: 'Data Pengguna',
      desc: 'Hak Akses & Akun Sistem',
      icon: UserCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'kalender-akademik',
      title: 'Kalender Akademik',
      desc: 'Agenda & Hari Efektif',
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'absensi',
      title: 'Absensi Siswa',
      desc: userScope.assignedWaliClassName
        ? `Presensi Kelas ${userScope.assignedWaliClassName}`
        : userScope.primarySubject?.name
        ? `Presensi Mapel ${userScope.primarySubject.name}`
        : 'Presensi & Validasi Harian',
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'rekapitulasi',
      title: 'Rekapitulasi',
      desc: 'Statistik & Matriks Bulanan',
      icon: BarChart2,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'laporan',
      title: 'Laporan',
      desc: 'Cetak & Ekspor Dokumen',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      id: 'pengaturan',
      title: 'Pengaturan Sistem',
      desc: 'Konfigurasi & Jam Real-Time',
      icon: Settings,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
  ] as const;

  const allowedMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!currentUser) return false;
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') return true;
      if (currentUser.role === 'WALI KELAS') {
        return [
          'data-referensi',
          'kalender-akademik',
          'absensi',
          'rekapitulasi',
          'laporan',
        ].includes(item.id);
      }
      if (
        currentUser.role === 'GURU' ||
        currentUser.role === 'GURU MAPEL'
      ) {
        return [
          'data-referensi',
          'kalender-akademik',
          'absensi',
          'rekapitulasi',
          'laporan',
          'pengaturan',
        ].includes(item.id);
      }
      if (currentUser.role === 'KEPALA SEKOLAH') {
        return ['data-referensi', 'kalender-akademik', 'rekapitulasi', 'laporan', 'pengaturan'].includes(
          item.id
        );
      }
      return false;
    });
  }, [currentUser, menuItems]);

  // Role-specific widgets definition
  const isTeacherOrWali = userScope.isWaliKelas || userScope.isGuruMapel;

  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    currentUser?.subscriptionPlan === 'guru_uji_coba' ||
    currentUser?.subscriptionPlan === 'teacher' ||
    currentUser?.subscriptionPlan === 'guru_pro' ||
    currentUser?.subscriptionPlan === 'mulai' ||
    currentUser?.subscriptionPlan === 'guru_gratis' ||
    (!currentUser?.schoolId && currentUser?.role !== 'SUPER_ADMIN');

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
    sky: 'bg-sky-50 border-sky-100 text-sky-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  };

  const usersCountDisplay = users.length || cachedSummary?.usersCount || 0;
  const studentsCountDisplay = students.length || cachedSummary?.studentsCount || 0;
  const classesCountDisplay = classes.length || cachedSummary?.classesCount || 0;
  const guruKsCountDisplay =
    users.filter(
      (u) =>
        u.role === 'GURU' ||
        u.role === 'WALI KELAS' ||
        u.role === 'GURU MAPEL' ||
        u.role === 'KEPALA SEKOLAH'
    ).length || cachedSummary?.guruKsCount || 0;

  // Show Skeleton Loader if data is completely empty and currently loading
  const isInitialEmptyLoad = isDataLoading && !cachedSummary && students.length === 0 && users.length === 0;

  if (isInitialEmptyLoad) {
    return <DashboardSkeleton isTeacherOrWali={isTeacherOrWali} />;
  }

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3.5 sm:space-y-4 animate-in fade-in duration-300">
      {/* Spanduk Panel Kontrol Utama */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 shadow-lg border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="min-w-0 space-y-2 flex-1 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Panel Kontrol Utama</span>
            </h1>

            {/* Lencana Ruang Kerja */}
            {isPersonalWorkspace ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 backdrop-blur-md shadow-xs">
                <User size={13} className="text-purple-300" />
                <span>Ruang Kerja Individu</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/25 text-blue-200 border border-blue-400/35 backdrop-blur-md shadow-xs tracking-tight">
                <Building2 size={13} className="text-blue-300" />
                <span>Ruang Kerja Sekolah</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {userScope.isWaliKelas
              ? `Pengawasan kehadiran dan administrasi peserta didik kelas binaan ${userScope.assignedWaliClassName || 'Wali Kelas'}.`
              : userScope.isGuruMapel
              ? `Pengawasan kehadiran mata pelajaran ${userScope.primarySubject?.name || 'Mata Pelajaran'} (${userScope.accessibleClasses.length} Rombel).`
              : currentUser?.role === 'KEPALA SEKOLAH'
              ? `Pengawasan dan evaluasi rekapitulasi presensi seluruh rombongan belajar ${schoolProfile.namaSekolah || 'Sekolah'} secara komprehensif.`
              : `Pantau aktivitas harian dan analisis kehadiran siswa ${schoolProfile.namaSekolah ? `${schoolProfile.namaSekolah} ` : ''}secara real-time.`}
          </p>
        </div>
      </div>

      {/* Main Widgets: If Wali Kelas or Guru Mapel -> 4 widgets */}
      {isTeacherOrWali ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {[
            {
              label: 'JUMLAH SISWA',
              value: scopedTotal,
              desc: userScope.isWaliKelas
                ? `Kelas ${userScope.assignedWaliClassName || 'Binaan'}`
                : `${userScope.primarySubject?.name || 'Mapel'} (${userScope.accessibleClasses.length} Rombel)`,
              icon: Users,
              tone: 'blue',
            },
            {
              label: 'SISWA LAKI-LAKI',
              value: scopedMale,
              desc: 'Siswa putra (L)',
              icon: UserCheck,
              tone: 'sky',
            },
            {
              label: 'SISWA PEREMPUAN',
              value: scopedFemale,
              desc: 'Siswa putri (P)',
              icon: UserCheck,
              tone: 'violet',
            },
            {
              label: 'HARI EFEKTIF BELAJAR',
              value: `${effectiveDaysThisMonth} Hari`,
              desc: `Bulan ${currentMonthName} (Aktif)`,
              icon: CalendarCheck,
              tone: 'emerald',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bg-white rounded-2xl p-3.5 sm:p-4.5 border border-slate-200 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all group"
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                    toneClasses[item.tone]
                  }`}
                >
                  <Icon size={22} className="sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                    {item.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight my-0.5">
                    {item.value}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Admin & Kepala Sekolah Overview Widgets (5 widgets) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {[
            { label: 'PENGGUNA', value: usersCountDisplay, desc: 'Total akun', icon: Users, tone: 'blue' },
            { label: 'ONLINE', value: currentUser ? 1 : 0, desc: 'Sesi aktif', icon: UserCheck, tone: 'emerald' },
            {
              label: 'GURU & KS',
              value: guruKsCountDisplay,
              desc: 'Tenaga pendidik',
              icon: GraduationCap,
              tone: 'violet',
            },
            { label: 'SISWA', value: studentsCountDisplay, desc: 'Terdaftar', icon: Users, tone: 'sky' },
            { label: 'ROMBEL', value: classesCountDisplay, desc: 'Data kelas', icon: Building, tone: 'amber' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    toneClasses[item.tone]
                  }`}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.label}</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{item.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2 Chart Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Left Chart: Tren Kehadiran (7 Hari) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-3.5 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 text-xs sm:text-sm">
                {userScope.isWaliKelas
                  ? `Tren Kehadiran Kelas ${userScope.assignedWaliClassName || ''} (7 Hari)`
                  : userScope.isGuruMapel
                  ? `Tren Kehadiran Mapel ${userScope.primarySubject?.name || ''} (7 Hari)`
                  : 'Tren Kehadiran (7 Hari)'}
              </h2>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              SISWA HADIR
            </span>
          </div>

          {/* SVG Smooth Area Chart */}
          <div className="h-36 sm:h-44 w-full relative pt-1 overflow-x-auto">
            <svg viewBox="0 0 500 180" className="w-full h-full min-w-[300px] overflow-visible">
              <defs>
                <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-axis labels */}
              {(() => {
                const maxVal = Math.max(scopedTotal || students.length || 1, 1);
                const stepValues = [
                  maxVal,
                  Math.round(maxVal * 0.75),
                  Math.round(maxVal * 0.5),
                  Math.round(maxVal * 0.25),
                  0,
                ];
                return stepValues.map((val, idx) => {
                  const y = 15 + idx * 32;
                  return (
                    <g key={idx}>
                      <line x1="30" y1={y} x2="480" y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="18" y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8" fontWeight="500">
                        {val}
                      </text>
                    </g>
                  );
                });
              })()}

              {/* Dynamic Path Calculation based on trendData */}
              {(() => {
                const maxVal = Math.max(scopedTotal || students.length || 1, 1);
                const points = trendData.map((item, idx) => {
                  const x = 35 + idx * 70;
                  const ratio = Math.min(Math.max(item.count / maxVal, 0), 1);
                  const y = 143 - ratio * 120;
                  return { x, y };
                });

                const linePath = points.reduce((acc, pt, idx) => {
                  return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, '');

                const areaPath = `${linePath} L ${points[points.length - 1].x} 143 L ${points[0].x} 143 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#blueAreaGradient)" />
                    <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="3.5" className="fill-blue-600 stroke-white stroke-2" />
                    ))}
                  </>
                );
              })()}

              {/* X-axis Day labels */}
              {trendData.map((item, idx) => {
                const x = 35 + idx * 70;
                return (
                  <text key={item.day} x={x} y="165" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">
                    {item.day}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Chart: % Status Hari Ini */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-3.5 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-start gap-2 mb-1">
            <Percent size={16} className="text-blue-600" />
            <h2 className="font-bold text-slate-900 text-xs sm:text-sm">Status Hari Ini</h2>
          </div>

          {/* Donut Chart */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center my-1">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Background Track */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="11" />

              {/* Segment 1: Hadir (Emerald Green) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#10b981"
                strokeWidth="11"
                strokeDasharray={`${(hadirCount / Math.max(recordTotal, 1)) * 238.76} 238.76`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />

              {/* Segment 2: Sakit (Blue) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="11"
                strokeDasharray={`${(sakitCount / Math.max(recordTotal, 1)) * 238.76} 238.76`}
                strokeDashoffset={`-${(hadirCount / Math.max(recordTotal, 1)) * 238.76}`}
              />

              {/* Segment 3: Alfa (Rose Red) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="11"
                strokeDasharray={`${(alfaCount / Math.max(recordTotal, 1)) * 238.76} 238.76`}
                strokeDashoffset={`-${((hadirCount + sakitCount) / Math.max(recordTotal, 1)) * 238.76}`}
              />
            </svg>

            {/* Center Percentage Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg sm:text-xl font-black text-slate-900">{hadirPercent}%</span>
              <span className="text-[8px] sm:text-[9px] font-bold text-blue-600 tracking-widest uppercase">
                HADIR
              </span>
            </div>
          </div>

          {/* Legend Pills below */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px] font-semibold mt-1">
            <div className="flex items-center gap-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>HADIR ({hadirCount})</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>SAKIT ({sakitCount})</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>IZIN ({izinCount})</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>ALFA ({alfaCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info / Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Agenda Mendatang Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-3.5 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
              <Calendar size={16} className="text-blue-600" />
              <span>Agenda Mendatang</span>
            </div>
            <button
              onClick={() => setActiveView('kalender-akademik')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          {/* Upcoming Event Item */}
          <div className="space-y-2 mt-1">
            {upcomingEvents.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <Calendar size={22} className="mx-auto mb-1.5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada agenda mendatang di bulan ini</p>
                <p className="text-[10px] text-slate-400">Semua agenda bulan ini telah selesai atau belum dijadwalkan</p>
              </div>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-slate-50 hover:bg-blue-50/50 transition-colors rounded-xl p-2.5 flex items-center gap-2.5 border border-slate-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-blue-200 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      {ev.dateDisplay.split(' ')[1] || 'AUG'}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-blue-600 leading-none">
                      {ev.dateDisplay.split(' ')[0] || '17'}
                    </span>
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 text-xs truncate">{ev.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {ev.isEffective ? 'Agenda sekolah efektif' : 'Libur / Tidak efektif'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Big Action Banner */}
        <div className="lg:col-span-8 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight mb-1 text-white">
              Efisiensi Administrasi Terkendali
            </h3>
            <p className="text-blue-100 text-xs max-w-2xl leading-relaxed">
              Gunakan fitur sinkronisasi pengguna untuk memastikan setiap siswa memiliki akses login,
              dan pantau kalender akademik untuk perhitungan hari belajar efektif yang akurat bagi
              pelaporan semester.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-3.5 relative z-10">
            {currentUser?.role === 'KEPALA SEKOLAH' ? (
              <button
                id="btn-banner-rekapitulasi"
                onClick={() => setActiveView('rekapitulasi')}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-900 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
              >
                <span>REKAPITULASI PRESENSI</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                id="btn-banner-mulai-absensi"
                onClick={() => setActiveView('absensi')}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-900 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
              >
                <span>ABSENSI SISWA</span>
                <ArrowRight size={15} />
              </button>
            )}
            <button
              id="btn-banner-cetak-laporan"
              onClick={() => setActiveView('laporan')}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 transition-all text-center min-h-[38px] cursor-pointer"
            >
              CETAK LAPORAN
            </button>
          </div>
        </div>
      </div>

      {/* Menu Navigasi Section (Compact & Dense) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Menu Navigasi</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {allowedMenuItems.length} Modul Akses ({userScope.roleBadgeLabel})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`btn-menu-${item.id}`}
                onClick={() => setActiveView(item.id as any)}
                className="bg-white hover:bg-blue-50/60 hover:border-blue-300 border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs hover:shadow-sm transition-all group cursor-pointer active:scale-98 min-h-[58px]"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
                <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
