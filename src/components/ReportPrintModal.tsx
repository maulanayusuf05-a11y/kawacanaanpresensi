import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceType } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { Printer, X, Download } from 'lucide-react';
import { formatSubjectTeacherTitle, formatHomeroomTeacherTitle } from '../utils/formatTeacherTitle';
import { getFaseByClassName, formatClassDisplay, formatClassClean } from '../utils/faseKurikulum';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  selectedDate?: string;
  selectedWeek?: string;
  month: string;
  year: string;
  semester?: 'Ganjil' | 'Genap';
  academicYear?: string;
  attendanceType?: AttendanceType;
  subjectId?: string | null;
  subjectName?: string | null;
  classId?: string | null;
  className?: string | null;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportType,
  selectedDate = '2026-08-14',
  selectedWeek = 'Minggu Ke-1',
  month,
  year,
  semester = 'Ganjil',
  academicYear,
  attendanceType = 'DAILY',
  subjectId = null,
  subjectName = null,
  classId = null,
  className = null,
}) => {
  const { schoolProfile, systemConfig, students, attendanceRecords, getEffectiveDaysForMonth, currentUser, classes, teachers, subjects } = useApp();

  if (!isOpen) return null;

  const isKepalaSekolahReport = reportType.startsWith('Laporan Kepala Sekolah') || reportType.includes('Tingkat Sekolah');

  const { startYear, endYear } = useMemo(() => {
    const matches = (academicYear || schoolProfile.tahunPelajaran || '').match(/\d{4}/g);
    if (matches && matches.length >= 2) {
      return { startYear: parseInt(matches[0], 10), endYear: parseInt(matches[1], 10) };
    } else if (matches && matches.length === 1) {
      const y1 = parseInt(matches[0], 10);
      return { startYear: y1, endYear: y1 + 1 };
    }
    return { startYear: 2026, endYear: 2027 };
  }, [academicYear, schoolProfile.tahunPelajaran]);

  const currentClass = useMemo(() => {
    if (classId) return classes.find((c) => c.id === classId) || null;
    return null;
  }, [classes, classId]);

  const rawClassName = currentClass?.name || className || schoolProfile.kelas || '6A';
  const activeClassName = formatClassDisplay(rawClassName);
  const activeClassClean = formatClassClean(rawClassName);
  const activeFase = getFaseByClassName(rawClassName, currentClass?.grade);

  // Filter students based on class selection
  const targetStudents = useMemo(() => {
    if (!classId) return students;
    return students.filter((s) => s.classId === classId);
  }, [students, classId]);

  // Filter attendance records based on mode, subject, and class
  const targetRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      if (attendanceType === 'SUBJECT') {
        if (r.type !== 'SUBJECT') return false;
        if (subjectId && r.subjectId !== subjectId) return false;
      } else {
        if (r.type === 'SUBJECT') return false;
      }
      if (classId && r.classId && r.classId !== classId) return false;
      return true;
    });
  }, [attendanceRecords, attendanceType, subjectId, classId]);

  // Resolved teacher info (Name & NIP) from Master Data Guru / Class / Subject
  const resolvedTeacherInfo = useMemo(() => {
    let teacherName = '';
    let teacherNip = '';

    if (attendanceType === 'SUBJECT') {
      const activeSubjectObj = subjects.find((s) => s.id === subjectId) || subjects.find((s) => s.name === subjectName);

      // 1. Check if currentUser is the subject teacher
      if (currentUser?.role === 'GURU MAPEL' || currentUser?.role === 'GURU') {
        if (!subjectId || currentUser.subjectId === subjectId || (currentUser.subjectName && subjectName && currentUser.subjectName.toLowerCase() === subjectName.toLowerCase())) {
          teacherName = currentUser.name;
          teacherNip = currentUser.nip || '';
        }
      }

      // 2. Look in teachers list by subject's teacherId or name
      if (!teacherName && activeSubjectObj) {
        if (activeSubjectObj.teacherId) {
          const tMatch = teachers.find((t) => t.id === activeSubjectObj.teacherId);
          if (tMatch) {
            teacherName = tMatch.nama;
            teacherNip = tMatch.nip || '';
          }
        }
        if (!teacherName && activeSubjectObj.teacherName) {
          const tMatch = teachers.find((t) => t.nama.trim().toLowerCase() === activeSubjectObj.teacherName?.trim().toLowerCase());
          if (tMatch) {
            teacherName = tMatch.nama;
            teacherNip = tMatch.nip || '';
          } else {
            teacherName = activeSubjectObj.teacherName;
          }
        }
      }

      // 3. Look in teachers list by specialization / mataPelajaran / jabatan
      if (!teacherName && subjectName) {
        const tMatch = teachers.find((t) =>
          (t.mataPelajaran && t.mataPelajaran.toLowerCase().includes(subjectName.toLowerCase())) ||
          (t.jabatan && t.jabatan.toLowerCase().includes(subjectName.toLowerCase())) ||
          (t.jenisPTK && t.jenisPTK.toLowerCase().includes(subjectName.toLowerCase())) ||
          (t.specialization && t.specialization.toLowerCase().includes(subjectName.toLowerCase()))
        );
        if (tMatch) {
          teacherName = tMatch.nama;
          teacherNip = tMatch.nip || '';
        }
      }

      // 4. Fallback to school profile or currentUser
      if (!teacherName) {
        teacherName = schoolProfile.namaWaliKelas || currentUser?.name || 'Guru Mata Pelajaran';
        teacherNip = schoolProfile.nipWaliKelas || currentUser?.nip || '';
      }
      if (!teacherNip) {
        const tMatch = teachers.find((t) => t.nama.trim().toLowerCase() === teacherName.trim().toLowerCase());
        if (tMatch?.nip) teacherNip = tMatch.nip;
      }
    } else {
      // DAILY / Wali Kelas
      // 1. Try from currentClass
      if (currentClass?.waliKelasId) {
        const tMatch = teachers.find((t) => t.id === currentClass.waliKelasId);
        if (tMatch) {
          teacherName = tMatch.nama;
          teacherNip = tMatch.nip || '';
        }
      }

      if (!teacherName && currentClass?.waliKelasName) {
        teacherName = currentClass.waliKelasName;
        const tMatch = teachers.find((t) => t.nama.trim().toLowerCase() === currentClass.waliKelasName?.trim().toLowerCase());
        if (tMatch?.nip) {
          teacherNip = tMatch.nip;
        }
      }

      // 2. If currentUser is Wali Kelas and assigned
      if (!teacherName && (currentUser?.role === 'WALI KELAS' || currentUser?.role === 'GURU')) {
        if (!classId || (currentUser.classIds && currentUser.classIds.includes(classId))) {
          teacherName = currentUser.name;
          teacherNip = currentUser.nip || '';
        }
      }

      // 3. Fallback to schoolProfile.namaWaliKelas
      if (!teacherName) {
        teacherName = schoolProfile.namaWaliKelas || currentUser?.name || 'Wali Kelas';
      }

      if (!teacherNip) {
        const tMatch = teachers.find((t) => t.nama.trim().toLowerCase() === teacherName.trim().toLowerCase());
        if (tMatch?.nip) {
          teacherNip = tMatch.nip;
        } else {
          teacherNip = currentClass?.waliKelasNip || currentUser?.nip || schoolProfile.nipWaliKelas || '';
        }
      }
    }

    const cleanNip = teacherNip && teacherNip.trim() !== '' && teacherNip.trim() !== '-' ? teacherNip.trim() : (schoolProfile.nipWaliKelas || '-');

    return {
      name: teacherName,
      nip: cleanNip,
    };
  }, [attendanceType, subjectId, subjectName, subjects, teachers, currentUser, currentClass, classId, schoolProfile]);

  // Format date display for signature & headers
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

  const getDayNameIndo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[date.getDay()] || 'Hari';
    } catch {
      return 'Hari';
    }
  };

  const monthNumberMap: { [key: string]: number } = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
    'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
    'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };

  const mNum = monthNumberMap[month] || 7;
  const effectiveDays = getEffectiveDaysForMonth(Number(year) || 2026, mNum);
  const monthKey = `${year}-${String(mNum).padStart(2, '0')}`;

  // Helper: Week working days calculation
  const weekNum = parseInt(selectedWeek.replace(/\D/g, ''), 10) || 1;
  const weekWorkingDays = useMemo(() => {
    const yearNum = Number(year) || 2026;
    const daysInMonth = new Date(yearNum, mNum, 0).getDate();
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = Math.min(daysInMonth, weekNum * 7);

    const days: { dateStr: string; dayNum: number; dayShort: string; dayName: string }[] = [];
    const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dayNamesFull = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (let d = startDay; d <= endDay; d++) {
      const jsDate = new Date(yearNum, mNum - 1, d);
      const dow = jsDate.getDay();
      if (dow >= 1 && dow <= 5) {
        // Monday to Friday
        const dateStr = `${yearNum}-${String(mNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          dateStr,
          dayNum: d,
          dayShort: dayNamesShort[dow],
          dayName: dayNamesFull[dow],
        });
      }
    }
    return days;
  }, [year, mNum, weekNum]);

  // Helper format percentage
  const formatPct = (val: number) => (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));

  // 1. DATA COMPUTATION FOR LAPORAN HARIAN
  const dailyStudentRows = useMemo(() => {
    return targetStudents.map((s) => {
      const record = targetRecords.find((r) => r.studentId === s.id && r.date === selectedDate);
      const status = record?.status || 'Belum Diabsen';
      const timeIn = record?.checkInTime || '-';
      const timeOut = record?.checkOutTime || '-';
      const note = record?.notes || '-';

      return {
        ...s,
        status,
        timeIn,
        timeOut,
        note,
      };
    });
  }, [targetStudents, targetRecords, selectedDate]);

  const dailyHadir = dailyStudentRows.filter((s) => s.status === 'Hadir').length;
  const dailySakit = dailyStudentRows.filter((s) => s.status === 'Sakit').length;
  const dailyIzin = dailyStudentRows.filter((s) => s.status === 'Izin').length;
  const dailyAlfa = dailyStudentRows.filter((s) => s.status === 'Alfa').length;
  const dailyTotalKnown = dailyHadir + dailySakit + dailyIzin + dailyAlfa;
  const dailyDenom = dailyTotalKnown > 0 ? dailyTotalKnown : targetStudents.length || 1;

  const dailyPctHadir = (dailyHadir / dailyDenom) * 100;
  const dailyPctSakit = (dailySakit / dailyDenom) * 100;
  const dailyPctIzin = (dailyIzin / dailyDenom) * 100;
  const dailyPctAlfa = (dailyAlfa / dailyDenom) * 100;

  // 2. DATA COMPUTATION FOR LAPORAN MINGGUAN
  const weeklyStudentRows = useMemo(() => {
    const weekDateStrings = weekWorkingDays.map((d) => d.dateStr);

    return targetStudents.map((s) => {
      const recordsForWeek = targetRecords.filter(
        (r) => r.studentId === s.id && weekDateStrings.includes(r.date)
      );

      const dayStatusMap: { [dateStr: string]: string } = {};
      weekWorkingDays.forEach((wDay) => {
        const found = recordsForWeek.find((r) => r.date === wDay.dateStr);
        dayStatusMap[wDay.dateStr] = found ? (found.status === 'Hadir' ? 'H' : found.status === 'Sakit' ? 'S' : found.status === 'Izin' ? 'I' : 'A') : '-';
      });

      const hadir = recordsForWeek.filter((r) => r.status === 'Hadir').length;
      const sakit = recordsForWeek.filter((r) => r.status === 'Sakit').length;
      const izin = recordsForWeek.filter((r) => r.status === 'Izin').length;
      const alfa = recordsForWeek.filter((r) => r.status === 'Alfa').length;
      const totalDaysInWeek = weekWorkingDays.length || 1;
      const pct = (hadir / totalDaysInWeek) * 100;

      return {
        ...s,
        dayStatusMap,
        hadir,
        sakit,
        izin,
        alfa,
        percent: formatPct(pct),
        percentNum: pct,
      };
    });
  }, [targetStudents, targetRecords, weekWorkingDays]);

  const weeklyTotalHadir = weeklyStudentRows.reduce((acc, s) => acc + s.hadir, 0);
  const weeklyTotalSakit = weeklyStudentRows.reduce((acc, s) => acc + s.sakit, 0);
  const weeklyTotalIzin = weeklyStudentRows.reduce((acc, s) => acc + s.izin, 0);
  const weeklyTotalAlfa = weeklyStudentRows.reduce((acc, s) => acc + s.alfa, 0);
  const weeklyGrandTotal = weeklyTotalHadir + weeklyTotalSakit + weeklyTotalIzin + weeklyTotalAlfa;
  const weeklyTheoreticalTotal = (targetStudents.length || 1) * (weekWorkingDays.length || 1);
  const weeklyDenom = weeklyGrandTotal > 0 ? weeklyGrandTotal : weeklyTheoreticalTotal;

  const weeklyPctHadir = (weeklyTotalHadir / weeklyDenom) * 100;
  const weeklyPctSakit = (weeklyTotalSakit / weeklyDenom) * 100;
  const weeklyPctIzin = (weeklyTotalIzin / weeklyDenom) * 100;
  const weeklyPctAlfa = (weeklyTotalAlfa / weeklyDenom) * 100;

  // 3. DATA COMPUTATION FOR LAPORAN BULANAN & SEMESTER
  const semesterMonthList = useMemo(() => {
    const isSem1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].includes(month);
    const semYear = Number(year) || 2026;
    if (isSem1) {
      return [
        { code: '07', name: 'Juli', mNum: 7, key: `${semYear}-07` },
        { code: '08', name: 'Agustus', mNum: 8, key: `${semYear}-08` },
        { code: '09', name: 'September', mNum: 9, key: `${semYear}-09` },
        { code: '10', name: 'Oktober', mNum: 10, key: `${semYear}-10` },
        { code: '11', name: 'November', mNum: 11, key: `${semYear}-11` },
        { code: '12', name: 'Desember', mNum: 12, key: `${semYear}-12` },
      ];
    } else {
      return [
        { code: '01', name: 'Januari', mNum: 1, key: `${semYear}-01` },
        { code: '02', name: 'Februari', mNum: 2, key: `${semYear}-02` },
        { code: '03', name: 'Maret', mNum: 3, key: `${semYear}-03` },
        { code: '04', name: 'April', mNum: 4, key: `${semYear}-04` },
        { code: '05', name: 'Mei', mNum: 5, key: `${semYear}-05` },
        { code: '06', name: 'Juni', mNum: 6, key: `${semYear}-06` },
      ];
    }
  }, [month, year]);

  const semesterTotalEffectiveDays = useMemo(() => {
    const semYear = Number(year) || 2026;
    return semesterMonthList.reduce((acc, m) => acc + (getEffectiveDaysForMonth(semYear, m.mNum) || 20), 0);
  }, [semesterMonthList, getEffectiveDaysForMonth, year]);

  const semesterStudentRows = useMemo(() => {
    const denom = semesterTotalEffectiveDays > 0 ? semesterTotalEffectiveDays : 1;

    return targetStudents.map((s) => {
      const sRecords = targetRecords.filter((r) => {
        return r.studentId === s.id && semesterMonthList.some((m) => r.date.startsWith(m.key));
      });

      const hadir = sRecords.filter((r) => r.status === 'Hadir').length;
      const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
      const izin = sRecords.filter((r) => r.status === 'Izin').length;
      const alfa = sRecords.filter((r) => r.status === 'Alfa').length;
      const totalRecorded = hadir + sakit + izin + alfa;

      const pctHadir = Math.min(100, Math.round((hadir / denom) * 100));
      const pctSakit = Math.round((sakit / denom) * 100 * 10) / 10;
      const pctIzin = Math.round((izin / denom) * 100 * 10) / 10;
      const pctAlfa = Math.round((alfa / denom) * 100 * 10) / 10;

      let predicate = 'Sangat Baik';
      if (pctHadir < 75) predicate = 'Perlu Pembinaan';
      else if (pctHadir < 85) predicate = 'Cukup';
      else if (pctHadir < 95) predicate = 'Baik';

      return {
        ...s,
        hadir,
        sakit,
        izin,
        alfa,
        totalRecorded,
        pctHadir: formatPct(pctHadir),
        pctSakit: formatPct(pctSakit),
        pctIzin: formatPct(pctIzin),
        pctAlfa: formatPct(pctAlfa),
        percent: formatPct(pctHadir),
        percentNum: pctHadir,
        predicate,
      };
    });
  }, [targetStudents, targetRecords, semesterMonthList, semesterTotalEffectiveDays]);

  const semesterTotalHadir = semesterStudentRows.reduce((acc, s) => acc + s.hadir, 0);
  const semesterTotalSakit = semesterStudentRows.reduce((acc, s) => acc + s.sakit, 0);
  const semesterTotalIzin = semesterStudentRows.reduce((acc, s) => acc + s.izin, 0);
  const semesterTotalAlfa = semesterStudentRows.reduce((acc, s) => acc + s.alfa, 0);
  const semesterGrandTotal = semesterTotalHadir + semesterTotalSakit + semesterTotalIzin + semesterTotalAlfa;
  const semesterTheoreticalTotal = (targetStudents.length || 1) * (semesterTotalEffectiveDays || 1);
  const semesterDenom = semesterGrandTotal > 0 ? semesterGrandTotal : semesterTheoreticalTotal;

  const semesterPctHadir = (semesterTotalHadir / semesterDenom) * 100;
  const semesterPctSakit = (semesterTotalSakit / semesterDenom) * 100;
  const semesterPctIzin = (semesterTotalIzin / semesterDenom) * 100;
  const semesterPctAlfa = (semesterTotalAlfa / semesterDenom) * 100;

  const monthlyStudentRows = useMemo(() => {
    return targetStudents.map((s) => {
      const sRecords = targetRecords.filter((r) => {
        if (reportType === 'Laporan Bulanan') {
          return r.studentId === s.id && r.date.startsWith(monthKey);
        }
        return r.studentId === s.id;
      });

      const hadir = sRecords.filter((r) => r.status === 'Hadir').length;
      const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
      const izin = sRecords.filter((r) => r.status === 'Izin').length;
      const alfa = sRecords.filter((r) => r.status === 'Alfa').length;
      const totalRecorded = hadir + sakit + izin + alfa;
      const baseDenom = effectiveDays || totalRecorded || 1;
      const percentFloat = totalRecorded > 0 ? (hadir / baseDenom) * 100 : (hadir > 0 ? 100 : 0);
      const percentFormatted = formatPct(percentFloat);

      return {
        ...s,
        hadir,
        sakit,
        izin,
        alfa,
        totalRecorded,
        percent: percentFormatted,
        percentNum: Math.min(100, percentFloat),
      };
    });
  }, [targetStudents, targetRecords, reportType, monthKey, effectiveDays]);

  const monthlyTotalHadir = monthlyStudentRows.reduce((acc, s) => acc + s.hadir, 0);
  const monthlyTotalSakit = monthlyStudentRows.reduce((acc, s) => acc + s.sakit, 0);
  const monthlyTotalIzin = monthlyStudentRows.reduce((acc, s) => acc + s.izin, 0);
  const monthlyTotalAlfa = monthlyStudentRows.reduce((acc, s) => acc + s.alfa, 0);
  const monthlyGrandTotal = monthlyTotalHadir + monthlyTotalSakit + monthlyTotalIzin + monthlyTotalAlfa;
  const monthlyTheoreticalTotal = (targetStudents.length || 1) * (effectiveDays || 1);
  const monthlyDenom = monthlyGrandTotal > 0 ? monthlyGrandTotal : monthlyTheoreticalTotal;

  const monthlyPctHadir = (monthlyTotalHadir / monthlyDenom) * 100;
  const monthlyPctSakit = (monthlyTotalSakit / monthlyDenom) * 100;
  const monthlyPctIzin = (monthlyTotalIzin / monthlyDenom) * 100;
  const monthlyPctAlfa = (monthlyTotalAlfa / monthlyDenom) * 100;

  const avgStudentAttendance = monthlyStudentRows.length > 0
    ? (monthlyStudentRows.reduce((acc, s) => acc + s.percentNum, 0) / monthlyStudentRows.length)
    : 0;

  // =========================================================================
  // DATA COMPUTATION: LAPORAN KEPALA SEKOLAH (SELURUH KELAS / ROMBEL)
  // =========================================================================
  const kepsekPeriodInfo = useMemo(() => {
    if (reportType.includes('Bulanan')) {
      const mNum = monthNumberMap[month] || 7;
      const mKey = `${year}-${String(mNum).padStart(2, '0')}`;
      const effDays = getEffectiveDaysForMonth(Number(year) || 2026, mNum) || 20;
      return {
        mode: 'bulanan',
        periodLabel: `Bulan ${month} ${year}`,
        monthKeys: [mKey],
        totalEffectiveDays: effDays,
        title: 'LAPORAN REKAPITULASI KEHADIRAN SISWA BULANAN TINGKAT SEKOLAH',
        subTitle: `BULAN: ${month.toUpperCase()} ${year} | TAHUN PELAJARAN: ${academicYear || schoolProfile.tahunPelajaran || '2026/2027'}`,
      };
    } else if (reportType.includes('Semester')) {
      const isSem1 = semester === 'Ganjil' || ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].includes(month);
      const semYear = isSem1 ? startYear : endYear;
      const mList = isSem1
        ? [7, 8, 9, 10, 11, 12].map((m) => ({ mNum: m, key: `${startYear}-${String(m).padStart(2, '0')}` }))
        : [1, 2, 3, 4, 5, 6].map((m) => ({ mNum: m, key: `${endYear}-${String(m).padStart(2, '0')}` }));

      const effDays = mList.reduce((acc, item) => acc + (getEffectiveDaysForMonth(semYear, item.mNum) || 20), 0);
      return {
        mode: 'semester',
        periodLabel: `Semester ${isSem1 ? '1 (Ganjil)' : '2 (Genap)'} TP ${academicYear || schoolProfile.tahunPelajaran || '2026/2027'}`,
        monthKeys: mList.map((m) => m.key),
        totalEffectiveDays: effDays,
        title: `LAPORAN REKAPITULASI KEHADIRAN SISWA SEMESTER ${isSem1 ? '1 (GANJIL)' : '2 (GENAP)'} TINGKAT SEKOLAH`,
        subTitle: `SEMESTER: ${isSem1 ? '1 (GANJIL)' : '2 (GENAP)'} | TAHUN PELAJARAN: ${academicYear || schoolProfile.tahunPelajaran || '2026/2027'}`,
      };
    } else {
      // Tahunan (Semester Ganjil + Genap)
      const sem1List = [7, 8, 9, 10, 11, 12].map((m) => ({ mNum: m, key: `${startYear}-${String(m).padStart(2, '0')}` }));
      const sem2List = [1, 2, 3, 4, 5, 6].map((m) => ({ mNum: m, key: `${endYear}-${String(m).padStart(2, '0')}` }));
      const allMonths = [...sem1List, ...sem2List];
      const effDays = sem1List.reduce((acc, item) => acc + (getEffectiveDaysForMonth(startYear, item.mNum) || 20), 0) +
                      sem2List.reduce((acc, item) => acc + (getEffectiveDaysForMonth(endYear, item.mNum) || 20), 0);
      return {
        mode: 'tahunan',
        periodLabel: `Tahun Pelajaran Penuh ${academicYear || schoolProfile.tahunPelajaran || '2026/2027'}`,
        monthKeys: allMonths.map((m) => m.key),
        totalEffectiveDays: effDays,
        title: 'LAPORAN REKAPITULASI KEHADIRAN SISWA TAHUNAN TINGKAT SEKOLAH',
        subTitle: `TAHUN PELAJARAN: ${academicYear || schoolProfile.tahunPelajaran || '2026/2027'} (SEMESTER 1 & 2)`,
      };
    }
  }, [reportType, month, year, semester, academicYear, schoolProfile.tahunPelajaran, startYear, endYear, getEffectiveDaysForMonth, monthNumberMap]);

  // Aggregate class rows for Kepala Sekolah
  const kepsekClassRows = useMemo(() => {
    const sortedClasses = [...classes].sort((a, b) => (a.grade || 1) - (b.grade || 1) || a.name.localeCompare(b.name));

    return sortedClasses.map((cls) => {
      const classStudents = students.filter((s) => s.classId === cls.id);
      const studentIds = new Set(classStudents.map((s) => s.id));
      const maleCount = classStudents.filter((s) => s.gender === 'L').length;
      const femaleCount = classStudents.filter((s) => s.gender === 'P').length;
      const totalStudents = classStudents.length;

      // Filter daily attendance records for this class
      const clsRecords = attendanceRecords.filter((r) => {
        if (r.type === 'SUBJECT') return false;
        const isClassMatch = r.classId === cls.id || studentIds.has(r.studentId);
        if (!isClassMatch) return false;
        return kepsekPeriodInfo.monthKeys.some((mKey) => r.date.startsWith(mKey));
      });

      const hadir = clsRecords.filter((r) => r.status === 'Hadir').length;
      const sakit = clsRecords.filter((r) => r.status === 'Sakit').length;
      const izin = clsRecords.filter((r) => r.status === 'Izin').length;
      const alfa = clsRecords.filter((r) => r.status === 'Alfa').length;
      const totalRecorded = hadir + sakit + izin + alfa;

      const denom = (totalStudents * kepsekPeriodInfo.totalEffectiveDays) || totalRecorded || 1;
      const pctHadir = denom > 0 ? (hadir / denom) * 100 : 0;
      const pctSakit = denom > 0 ? (sakit / denom) * 100 : 0;
      const pctIzin = denom > 0 ? (izin / denom) * 100 : 0;
      const pctAlfa = denom > 0 ? (alfa / denom) * 100 : 0;

      let predicate = 'Sangat Baik';
      if (pctHadir < 75) predicate = 'Perlu Pembinaan';
      else if (pctHadir < 85) predicate = 'Cukup';
      else if (pctHadir < 95) predicate = 'Baik';

      let waliName = cls.waliKelasName || '';
      if (!waliName && cls.waliKelasId) {
        const t = teachers.find((tc) => tc.id === cls.waliKelasId);
        if (t) waliName = t.nama;
      }

      return {
        classId: cls.id,
        className: formatClassDisplay(cls.name),
        grade: cls.grade,
        fase: getFaseByClassName(cls.name, cls.grade),
        waliKelasName: waliName || '-',
        maleCount,
        femaleCount,
        totalStudents,
        hadir,
        sakit,
        izin,
        alfa,
        totalRecorded,
        pctHadir: formatPct(pctHadir),
        pctSakit: formatPct(pctSakit),
        pctIzin: formatPct(pctIzin),
        pctAlfa: formatPct(pctAlfa),
        pctHadirNum: pctHadir,
        predicate,
      };
    });
  }, [classes, students, attendanceRecords, kepsekPeriodInfo, teachers]);

  // Aggregate School Totals for Kepala Sekolah
  const kepsekSchoolTotals = useMemo(() => {
    const totalMale = kepsekClassRows.reduce((a, c) => a + c.maleCount, 0);
    const totalFemale = kepsekClassRows.reduce((a, c) => a + c.femaleCount, 0);
    const totalStudents = kepsekClassRows.reduce((a, c) => a + c.totalStudents, 0);
    const totalHadir = kepsekClassRows.reduce((a, c) => a + c.hadir, 0);
    const totalSakit = kepsekClassRows.reduce((a, c) => a + c.sakit, 0);
    const totalIzin = kepsekClassRows.reduce((a, c) => a + c.izin, 0);
    const totalAlfa = kepsekClassRows.reduce((a, c) => a + c.alfa, 0);
    const grandRecorded = totalHadir + totalSakit + totalIzin + totalAlfa;

    const grandDenom = (totalStudents * kepsekPeriodInfo.totalEffectiveDays) || grandRecorded || 1;
    const pctHadir = grandDenom > 0 ? (totalHadir / grandDenom) * 100 : 0;
    const pctSakit = grandDenom > 0 ? (totalSakit / grandDenom) * 100 : 0;
    const pctIzin = grandDenom > 0 ? (totalIzin / grandDenom) * 100 : 0;
    const pctAlfa = grandDenom > 0 ? (totalAlfa / grandDenom) * 100 : 0;

    let predicate = 'Sangat Baik';
    if (pctHadir < 75) predicate = 'Perlu Pembinaan';
    else if (pctHadir < 85) predicate = 'Cukup';
    else if (pctHadir < 95) predicate = 'Baik';

    return {
      totalMale,
      totalFemale,
      totalStudents,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlfa,
      grandRecorded,
      pctHadir: formatPct(pctHadir),
      pctSakit: formatPct(pctSakit),
      pctIzin: formatPct(pctIzin),
      pctAlfa: formatPct(pctAlfa),
      pctHadirNum: pctHadir,
      predicate,
    };
  }, [kepsekClassRows, kepsekPeriodInfo.totalEffectiveDays]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=960,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');

      if (!printWindow) {
        // Fallback if popup is blocked
        window.print();
        return;
      }

      const docTitle = `Cetak ${reportType} - ${schoolProfile.namaSekolah || 'Sekolah'}`;

      printWindow.document.open();
      printWindow.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .page-sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
    body {
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .page-sheet {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 48px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Print Control Bar (Hidden on Print) -->
  <div class="no-print" style="position: sticky; top: 0; z-index: 9999; margin-bottom: 24px; background: #0f172a; color: white; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
    <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">🖨️</span>
      <span>Dokumen Siap Dicetak: <strong style="color: #38bdf8;">${reportType}</strong></span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        🖨️ Cetak / Simpan PDF (A4)
      </button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer;">
        ✕ Tutup Jendela
      </button>
    </div>
  </div>

  <!-- A4 Printable Document -->
  <div class="page-sheet font-serif">
    ${printContent.innerHTML}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error opening print window:', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-[#141414] rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-white/10 print:border-none print:shadow-none print:max-h-none print:w-full overflow-hidden my-auto">
        {/* Top Modal Controls (Hidden when printing) */}
        <div className="p-3 sm:p-4 bg-[#181818] border-b border-white/10 text-white rounded-t-2xl flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Printer size={18} className="text-[#C5A059] shrink-0" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#E0E0E0] truncate">
                Pratinjau Cetak {reportType} (PDF)
              </h3>
              <span className="text-[10px] text-[#C5A059] font-semibold">
                Format Kertas: A4 (Standar Cetak)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              id="btn-trigger-print"
              className="px-3.5 sm:px-4 py-2 bg-[#C5A059] hover:bg-[#D4B475] active:scale-95 text-black font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all min-h-[36px] cursor-pointer"
            >
              <Printer size={14} />
              <span>Cetak Sekarang (Buka Jendela Baru)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container (White Sheet) */}
        <div className="p-4 sm:p-8 md:p-12 overflow-y-auto flex-1 font-serif text-slate-900 leading-normal bg-white" id="printable-report">
          {/* Formal Indonesian School Letterhead (Kop Surat) */}
          {(systemConfig.showLetterhead ?? true) && (
            <>
              {systemConfig.letterheadType === 'custom_image' && systemConfig.letterheadImageUrl ? (
                /* 1. Custom Image Letterhead (Auto-scaled for A4 Sheet Format) */
                <div className="kop-surat-a4-container w-full mb-5 pb-2 border-b-2 border-slate-900 break-inside-avoid print:mb-4 print:pb-1 flex justify-center items-center">
                  <img
                    src={systemConfig.letterheadImageUrl}
                    alt="Kop Surat Resmi Sekolah"
                    className="kop-surat-a4-img w-full max-w-full h-auto object-contain mx-auto block max-h-[140px] print:max-h-[155px]"
                  />
                </div>
              ) : (
                /* 2. Standard Text Letterhead with School Logo & Double Lines */
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 pb-3 border-b-4 border-double border-slate-900 mb-6 text-center sm:text-left break-inside-avoid">
                  {systemConfig.schoolLogoUrl ? (
                    <div className="w-16 h-16 sm:w-[74px] sm:h-[74px] shrink-0 flex items-center justify-center">
                      <img
                        src={systemConfig.schoolLogoUrl}
                        alt="Logo Sekolah"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <SchoolLogo size={60} className="sm:w-[74px] sm:h-[74px] shrink-0" />
                  )}
                  <div className="flex-1 text-center font-sans">
                    <h4 className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-slate-700 leading-tight">
                      PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA
                    </h4>
                    <h4 className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-slate-700 leading-tight">
                      DINAS PENDIDIKAN
                    </h4>
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase my-0.5">
                      {schoolProfile.namaSekolah || 'SD NEGERI CONTOH'}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-600 font-normal">
                      {schoolProfile.alamat || 'Jl. Pendidikan No. 123, Kel. Merdeka, Kec. Nusantara, Kota Jakarta'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">
                      {isKepalaSekolahReport ? (
                        <>NPSN: {schoolProfile.npsn || '20104501'} | TAHUN PELAJARAN: {academicYear || schoolProfile.tahunPelajaran} | KEPALA SEKOLAH: {schoolProfile.namaKepalaSekolah || '-'}</>
                      ) : (
                        <>NPSN: {schoolProfile.npsn || '20104501'} | KELAS: {activeClassClean} | FASE: {activeFase.toUpperCase()}</>
                      )}
                    </p>
                  </div>
                  <div className="w-16 hidden sm:block" />
                </div>
              )}
            </>
          )}

          {/* Report Document Title based on Report Type */}
          <div className="text-center mb-5 sm:mb-6 font-sans">
            <h3 className="text-sm sm:text-lg font-extrabold uppercase underline tracking-wide">
              {isKepalaSekolahReport
                ? kepsekPeriodInfo.title
                : reportType === 'Laporan Harian'
                ? 'LAPORAN KEHADIRAN HARIAN SISWA'
                : reportType === 'Laporan Mingguan'
                ? 'LAPORAN KEHADIRAN MINGGUAN SISWA'
                : reportType === 'Laporan Bulanan'
                ? 'LAPORAN REKAPITULASI KEHADIRAN BULANAN'
                : 'LAPORAN REKAPITULASI KEHADIRAN SEMESTER'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 font-bold mt-1 uppercase">
              {isKepalaSekolahReport ? (
                <>{kepsekPeriodInfo.subTitle}</>
              ) : reportType === 'Laporan Harian' ? (
                <>HARI/TANGGAL: {getDayNameIndo(selectedDate).toUpperCase()}, {formatReportDateIndo(selectedDate).toUpperCase()} | SEMESTER: {schoolProfile.semester.toUpperCase()} (TP: {schoolProfile.tahunPelajaran})</>
              ) : reportType === 'Laporan Mingguan' ? (
                <>PERIODE: {selectedWeek.toUpperCase()} ({month.toUpperCase()} {year}) | KELAS: {activeClassClean} (TP: {schoolProfile.tahunPelajaran})</>
              ) : reportType === 'Laporan Bulanan' ? (
                <>BULAN: {month.toUpperCase()} {year} | SEMESTER: {schoolProfile.semester.toUpperCase()} (TP: {schoolProfile.tahunPelajaran})</>
              ) : (
                <>SEMESTER: {month === 'Januari' ? 'GENAP' : 'GANJIL'} | TAHUN PELAJARAN: {schoolProfile.tahunPelajaran}</>
              )}
            </p>
          </div>

          {/* School Attributes Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs font-sans mb-4 border border-slate-200 p-3 rounded-lg bg-slate-50/50">
            <div>
              <p><span className="font-semibold text-slate-600">Satuan Pendidikan:</span> {schoolProfile.namaSekolah}</p>
              {isKepalaSekolahReport ? (
                <>
                  <p><span className="font-semibold text-slate-600">NPSN:</span> {schoolProfile.npsn || '20104501'}</p>
                  <p><span className="font-semibold text-slate-600">Kepala Sekolah:</span> {schoolProfile.namaKepalaSekolah || '-'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold text-slate-600">Kelas / Fase:</span> {activeClassName} / {activeFase}</p>
                  {attendanceType === 'SUBJECT' ? (
                    <p><span className="font-semibold text-slate-600">Mata Pelajaran:</span> <strong className="text-blue-900">{subjectName || 'Mata Pelajaran Khusus'}</strong></p>
                  ) : (
                    <p><span className="font-semibold text-slate-600">Wali Kelas:</span> {currentClass?.waliKelasName || schoolProfile.namaWaliKelas}</p>
                  )}
                </>
              )}
            </div>
            <div>
              {isKepalaSekolahReport ? (
                <>
                  <p><span className="font-semibold text-slate-600">Periode Rekap:</span> {kepsekPeriodInfo.periodLabel}</p>
                  <p><span className="font-semibold text-slate-600">Total Rombel / Kelas:</span> {kepsekClassRows.length} Rombel</p>
                  <p><span className="font-semibold text-slate-600">Total Siswa Sekolah:</span> {kepsekSchoolTotals.totalStudents} Siswa (L: {kepsekSchoolTotals.totalMale}, P: {kepsekSchoolTotals.totalFemale})</p>
                  <p><span className="font-semibold text-slate-600">Hari Efektif Periode:</span> {kepsekPeriodInfo.totalEffectiveDays} Hari</p>
                </>
              ) : reportType === 'Laporan Harian' ? (
                <>
                  <p><span className="font-semibold text-slate-600">Tanggal Presensi:</span> {formatReportDateIndo(selectedDate)}</p>
                  <p><span className="font-semibold text-slate-600">Total Siswa:</span> {targetStudents.length} Siswa</p>
                  <p><span className="font-semibold text-slate-600">Tahun Pelajaran:</span> {schoolProfile.tahunPelajaran}</p>
                </>
              ) : reportType === 'Laporan Mingguan' ? (
                <>
                  <p><span className="font-semibold text-slate-600">Hari Belajar Minggu Ini:</span> {weekWorkingDays.length} Hari</p>
                  <p><span className="font-semibold text-slate-600">Total Siswa:</span> {targetStudents.length} Siswa</p>
                  <p><span className="font-semibold text-slate-600">Tahun Pelajaran:</span> {schoolProfile.tahunPelajaran}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold text-slate-600">Hari Efektif Belajar:</span> {effectiveDays} Hari</p>
                  <p><span className="font-semibold text-slate-600">Total Siswa:</span> {targetStudents.length} Siswa</p>
                  <p><span className="font-semibold text-slate-600">Tahun Pelajaran:</span> {schoolProfile.tahunPelajaran}</p>
                </>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABEL SESUAI JENIS LAPORAN */}
          {/* ========================================================================= */}

          {/* TYPE: LAPORAN KEPALA SEKOLAH (SELURUH ROMBEL KELAS) */}
          {isKepalaSekolahReport && (
            <div className="overflow-x-auto mb-6 sm:mb-8">
              <table className="w-full text-left border-collapse border border-slate-400 text-xs font-sans min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                    <th className="border border-slate-400 p-2 w-8" rowSpan={2}>NO</th>
                    <th className="border border-slate-400 p-2 text-left w-36" rowSpan={2}>ROMBEL / KELAS</th>
                    <th className="border border-slate-400 p-2 text-left" rowSpan={2}>WALI KELAS</th>
                    <th className="border border-slate-400 p-1 text-center" colSpan={3}>SISWA</th>
                    <th className="border border-slate-400 p-1 text-center" colSpan={4}>REKAPITULASI (HARI)</th>
                    <th className="border border-slate-400 p-1 text-center" colSpan={4}>PERSENTASE (%)</th>
                    <th className="border border-slate-400 p-2 text-center w-24" rowSpan={2}>PREDIKAT</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center text-[10px] font-bold">
                    <th className="border border-slate-400 p-1 w-8">L</th>
                    <th className="border border-slate-400 p-1 w-8">P</th>
                    <th className="border border-slate-400 p-1 w-9">TOT</th>
                    <th className="border border-slate-400 p-1 w-9 bg-emerald-50 text-emerald-900">H</th>
                    <th className="border border-slate-400 p-1 w-9 bg-sky-50 text-sky-900">S</th>
                    <th className="border border-slate-400 p-1 w-9 bg-amber-50 text-amber-900">I</th>
                    <th className="border border-slate-400 p-1 w-9 bg-rose-50 text-rose-900">A</th>
                    <th className="border border-slate-400 p-1 w-11 bg-emerald-50 text-emerald-900">%H</th>
                    <th className="border border-slate-400 p-1 w-11 bg-sky-50 text-sky-900">%S</th>
                    <th className="border border-slate-400 p-1 w-11 bg-amber-50 text-amber-900">%I</th>
                    <th className="border border-slate-400 p-1 w-11 bg-rose-50 text-rose-900">%A</th>
                  </tr>
                </thead>
                <tbody>
                  {kepsekClassRows.map((cls, idx) => (
                    <tr key={cls.classId} className="border-b border-slate-300 hover:bg-slate-50/60">
                      <td className="border border-slate-300 p-1.5 text-center font-semibold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                        {cls.className}
                        <span className="block text-[9px] text-slate-500 font-normal">{cls.fase}</span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700 font-medium">{cls.waliKelasName}</td>
                      <td className="border border-slate-300 p-1 text-center text-slate-600">{cls.maleCount}</td>
                      <td className="border border-slate-300 p-1 text-center text-slate-600">{cls.femaleCount}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold text-slate-900 bg-slate-50">{cls.totalStudents}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold text-emerald-800 bg-emerald-50/40">{cls.hadir}</td>
                      <td className="border border-slate-300 p-1 text-center text-sky-800 bg-sky-50/40">{cls.sakit}</td>
                      <td className="border border-slate-300 p-1 text-center text-amber-800 bg-amber-50/40">{cls.izin}</td>
                      <td className="border border-slate-300 p-1 text-center text-rose-800 bg-rose-50/40">{cls.alfa}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold text-emerald-700 bg-emerald-50/60">{cls.pctHadir}%</td>
                      <td className="border border-slate-300 p-1 text-center text-sky-700">{cls.pctSakit}%</td>
                      <td className="border border-slate-300 p-1 text-center text-amber-700">{cls.pctIzin}%</td>
                      <td className="border border-slate-300 p-1 text-center text-rose-700">{cls.pctAlfa}%</td>
                      <td className="border border-slate-300 p-1 text-center text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${
                          cls.pctHadirNum >= 95 ? 'bg-emerald-100 text-emerald-800' :
                          cls.pctHadirNum >= 85 ? 'bg-blue-100 text-blue-800' :
                          cls.pctHadirNum >= 75 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {cls.predicate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-slate-900 text-center">
                    <td colSpan={3} className="border border-slate-400 p-2 text-left uppercase font-black">
                      TOTAL KESELURUHAN SEKOLAH
                    </td>
                    <td className="border border-slate-400 p-1.5">{kepsekSchoolTotals.totalMale}</td>
                    <td className="border border-slate-400 p-1.5">{kepsekSchoolTotals.totalFemale}</td>
                    <td className="border border-slate-400 p-1.5 bg-slate-300 font-black">{kepsekSchoolTotals.totalStudents}</td>
                    <td className="border border-slate-400 p-1.5 text-emerald-900 bg-emerald-100">{kepsekSchoolTotals.totalHadir}</td>
                    <td className="border border-slate-400 p-1.5 text-sky-900 bg-sky-100">{kepsekSchoolTotals.totalSakit}</td>
                    <td className="border border-slate-400 p-1.5 text-amber-900 bg-amber-100">{kepsekSchoolTotals.totalIzin}</td>
                    <td className="border border-slate-400 p-1.5 text-rose-900 bg-rose-100">{kepsekSchoolTotals.totalAlfa}</td>
                    <td className="border border-slate-400 p-1.5 text-emerald-950 bg-emerald-200 font-black">{kepsekSchoolTotals.pctHadir}%</td>
                    <td className="border border-slate-400 p-1.5 text-sky-950 bg-sky-100">{kepsekSchoolTotals.pctSakit}%</td>
                    <td className="border border-slate-400 p-1.5 text-amber-950 bg-amber-100">{kepsekSchoolTotals.pctIzin}%</td>
                    <td className="border border-slate-400 p-1.5 text-rose-950 bg-rose-100">{kepsekSchoolTotals.pctAlfa}%</td>
                    <td className="border border-slate-400 p-1.5 text-slate-900 font-black text-[10px] bg-slate-300">
                      {kepsekSchoolTotals.predicate}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* TYPE 1: LAPORAN HARIAN */}
          {reportType === 'Laporan Harian' && (
            <div className="overflow-x-auto mb-6 sm:mb-8">
              <table className="w-full text-left border-collapse border border-slate-400 text-xs font-sans min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                    <th className="border border-slate-400 p-1.5 w-8">NO</th>
                    <th className="border border-slate-400 p-1.5 w-24 sm:w-28">NISN</th>
                    <th className="border border-slate-400 p-1.5 text-left">NAMA SISWA</th>
                    <th className="border border-slate-400 p-1.5 w-10">L/P</th>
                    <th className="border border-slate-400 p-1.5 w-20">STATUS</th>
                    <th className="border border-slate-400 p-1.5 w-20">MASUK</th>
                    <th className="border border-slate-400 p-1.5 w-20">PULANG</th>
                    <th className="border border-slate-400 p-1.5 text-left">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStudentRows.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1 text-center font-semibold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-mono">{s.nisn}</td>
                      <td className="border border-slate-300 p-1 font-semibold">{s.nama}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.gender}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">
                        <span className={
                          s.status === 'Hadir' ? 'text-emerald-700' :
                          s.status === 'Sakit' ? 'text-sky-700' :
                          s.status === 'Izin' ? 'text-amber-700' :
                          s.status === 'Alfa' ? 'text-rose-700' : 'text-slate-500'
                        }>
                          {s.status}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-mono text-[11px]">{s.timeIn}</td>
                      <td className="border border-slate-300 p-1 text-center font-mono text-[11px]">{s.timeOut}</td>
                      <td className="border border-slate-300 p-1 text-slate-600 italic text-[11px]">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TYPE 2: LAPORAN MINGGUAN */}
          {reportType === 'Laporan Mingguan' && (
            <div className="overflow-x-auto mb-6 sm:mb-8">
              <table className="w-full text-left border-collapse border border-slate-400 text-xs font-sans min-w-[550px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                    <th className="border border-slate-400 p-1.5 w-8" rowSpan={2}>NO</th>
                    <th className="border border-slate-400 p-1.5 w-24" rowSpan={2}>NISN</th>
                    <th className="border border-slate-400 p-1.5 text-left" rowSpan={2}>NAMA SISWA</th>
                    <th className="border border-slate-400 p-1.5 w-10" rowSpan={2}>L/P</th>
                    <th className="border border-slate-400 p-1" colSpan={weekWorkingDays.length || 1}>HARI & TANGGAL</th>
                    <th className="border border-slate-400 p-1 w-8" rowSpan={2}>H</th>
                    <th className="border border-slate-400 p-1 w-8" rowSpan={2}>S</th>
                    <th className="border border-slate-400 p-1 w-8" rowSpan={2}>I</th>
                    <th className="border border-slate-400 p-1 w-8" rowSpan={2}>A</th>
                    <th className="border border-slate-400 p-1.5 w-14" rowSpan={2}>% HADIR</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold text-[10px]">
                    {weekWorkingDays.map((d) => (
                      <th key={d.dateStr} className="border border-slate-400 p-1 w-10">
                        {d.dayShort} ({d.dayNum})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyStudentRows.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1 text-center font-semibold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-mono">{s.nisn}</td>
                      <td className="border border-slate-300 p-1 font-semibold">{s.nama}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.gender}</td>
                      {weekWorkingDays.map((d) => {
                        const val = s.dayStatusMap[d.dateStr] || '-';
                        return (
                          <td key={d.dateStr} className="border border-slate-300 p-1 text-center font-bold text-[11px]">
                            <span className={
                              val === 'H' ? 'text-emerald-700' :
                              val === 'S' ? 'text-sky-700' :
                              val === 'I' ? 'text-amber-700' :
                              val === 'A' ? 'text-rose-700' : 'text-slate-400'
                            }>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.hadir}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.sakit}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.izin}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.alfa}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">{s.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TYPE 3: LAPORAN BULANAN */}
          {reportType === 'Laporan Bulanan' && (
            <div className="overflow-x-auto mb-6 sm:mb-8">
              <table className="w-full text-left border-collapse border border-slate-400 text-xs font-sans min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                    <th className="border border-slate-400 p-1.5 w-8">NO</th>
                    <th className="border border-slate-400 p-1.5 w-24 sm:w-28">NISN</th>
                    <th className="border border-slate-400 p-1.5 text-left">NAMA SISWA</th>
                    <th className="border border-slate-400 p-1.5 w-10 sm:w-12">L/P</th>
                    <th className="border border-slate-400 p-1.5 w-10 sm:w-12">H</th>
                    <th className="border border-slate-400 p-1.5 w-10 sm:w-12">S</th>
                    <th className="border border-slate-400 p-1.5 w-10 sm:w-12">I</th>
                    <th className="border border-slate-400 p-1.5 w-10 sm:w-12">A</th>
                    <th className="border border-slate-400 p-1.5 w-16 sm:w-20">% HADIR</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStudentRows.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1 text-center font-semibold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-mono">{s.nisn}</td>
                      <td className="border border-slate-300 p-1 font-semibold">{s.nama}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.gender}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.hadir}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.sakit}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.izin}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.alfa}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">{s.percent}%</td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary / Total Footer Row */}
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-500 text-slate-900">
                    <td colSpan={4} className="border border-slate-400 p-1.5 text-center font-black uppercase">
                      JUMLAH TOTAL
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-emerald-800 font-black">
                      {monthlyTotalHadir}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-sky-800 font-black">
                      {monthlyTotalSakit}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-amber-800 font-black">
                      {monthlyTotalIzin}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-rose-800 font-black">
                      {monthlyTotalAlfa}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-black text-blue-900">
                      {formatPct(avgStudentAttendance)}%
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-400 text-slate-800 text-[11px]">
                    <td colSpan={4} className="border border-slate-400 p-1 text-center font-bold uppercase">
                      PERSENTASE (%)
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-emerald-700">
                      {formatPct(monthlyPctHadir)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-sky-700">
                      {formatPct(monthlyPctSakit)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-amber-700">
                      {formatPct(monthlyPctIzin)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-rose-700">
                      {formatPct(monthlyPctAlfa)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-slate-500">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* TYPE 4: LAPORAN SEMESTER (Dengan Persentase Lengkap H, S, I, A per Siswa) */}
          {reportType === 'Laporan Semester' && (
            <div className="overflow-x-auto mb-6 sm:mb-8">
              <table className="w-full text-left border-collapse border border-slate-400 text-xs font-sans min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                    <th className="border border-slate-400 p-1.5 w-8" rowSpan={2}>NO</th>
                    <th className="border border-slate-400 p-1.5 w-24 sm:w-28" rowSpan={2}>NISN</th>
                    <th className="border border-slate-400 p-1.5 text-left" rowSpan={2}>NAMA SISWA</th>
                    <th className="border border-slate-400 p-1.5 w-10" rowSpan={2}>L/P</th>
                    <th className="border border-slate-400 p-1" colSpan={4}>TOTAL KEHADIRAN (HARI)</th>
                    <th className="border border-slate-400 p-1" colSpan={4}>PERSENTASE KEHADIRAN (%)</th>
                    <th className="border border-slate-400 p-1.5 w-20" rowSpan={2}>PREDIKAT</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold text-[10px]">
                    <th className="border border-slate-400 p-1 w-8 text-emerald-800">H</th>
                    <th className="border border-slate-400 p-1 w-8 text-sky-800">S</th>
                    <th className="border border-slate-400 p-1 w-8 text-amber-800">I</th>
                    <th className="border border-slate-400 p-1 w-8 text-rose-800">A</th>
                    <th className="border border-slate-400 p-1 w-12 text-emerald-800">%H</th>
                    <th className="border border-slate-400 p-1 w-12 text-sky-800">%S</th>
                    <th className="border border-slate-400 p-1 w-12 text-amber-800">%I</th>
                    <th className="border border-slate-400 p-1 w-12 text-rose-800">%A</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterStudentRows.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1 text-center font-semibold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-mono">{s.nisn}</td>
                      <td className="border border-slate-300 p-1 font-semibold">{s.nama}</td>
                      <td className="border border-slate-300 p-1 text-center">{s.gender}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.hadir}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.sakit}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.izin}</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold">{s.alfa}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold text-emerald-700 bg-emerald-50/40">{s.pctHadir}%</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold text-sky-700 bg-sky-50/40">{s.pctSakit}%</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold text-amber-700 bg-amber-50/40">{s.pctIzin}%</td>
                      <td className="border border-slate-300 p-1 text-center font-semibold text-rose-700 bg-rose-50/40">{s.pctAlfa}%</td>
                      <td className="border border-slate-300 p-1 text-center text-[10px] font-bold text-slate-700">{s.predicate}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary / Total Footer Row for Semester */}
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-500 text-slate-900">
                    <td colSpan={4} className="border border-slate-400 p-1.5 text-center font-black uppercase">
                      JUMLAH TOTAL
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-emerald-800 font-black">
                      {semesterTotalHadir}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-sky-800 font-black">
                      {semesterTotalSakit}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-amber-800 font-black">
                      {semesterTotalIzin}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center text-rose-800 font-black">
                      {semesterTotalAlfa}
                    </td>
                    <td colSpan={4} className="border border-slate-400 p-1.5 text-center font-black text-blue-900">
                      RATA-RATA % HADIR: {formatPct(semesterPctHadir)}%
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold text-slate-600">-</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-400 text-slate-800 text-[11px]">
                    <td colSpan={4} className="border border-slate-400 p-1 text-center font-bold uppercase">
                      PERSENTASE (%)
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-emerald-700">
                      {formatPct(semesterPctHadir)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-sky-700">
                      {formatPct(semesterPctSakit)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-amber-700">
                      {formatPct(semesterPctIzin)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-rose-700">
                      {formatPct(semesterPctAlfa)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-emerald-700 font-bold">
                      {formatPct(semesterPctHadir)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-sky-700 font-bold">
                      {formatPct(semesterPctSakit)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-amber-700 font-bold">
                      {formatPct(semesterPctIzin)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-rose-700 font-bold">
                      {formatPct(semesterPctAlfa)}%
                    </td>
                    <td className="border border-slate-400 p-1 text-center text-slate-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Ringkasan & Kesimpulan Kehadiran (Summary Box) */}
          <div className="border border-slate-400 bg-slate-50/70 p-3.5 sm:p-4 rounded-lg font-sans mb-6 text-xs break-inside-avoid">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] sm:text-xs mb-2 border-b border-slate-300 pb-1 flex items-center justify-between">
              <span>KESIMPULAN & RINGKASAN REKAPITULASI KEHADIRAN</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {isKepalaSekolahReport
                  ? `${kepsekPeriodInfo.periodLabel} • ${kepsekClassRows.length} Rombel • ${kepsekPeriodInfo.totalEffectiveDays} Hari Efektif`
                  : reportType === 'Laporan Harian'
                  ? `Tanggal: ${formatReportDateIndo(selectedDate)}`
                  : reportType === 'Laporan Mingguan'
                  ? `${selectedWeek} • ${weekWorkingDays.length} Hari`
                  : reportType === 'Laporan Bulanan'
                  ? `Bulan: ${month} ${year} • ${effectiveDays} Hari Efektif`
                  : `Semester: ${schoolProfile.semester}`}
              </span>
            </h4>

            {/* Metrics Row - Persentase Saja */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center my-2.5">
              <div className="p-2.5 bg-emerald-50/90 border border-emerald-300 rounded-lg text-emerald-950">
                <span className="text-[10px] block font-bold uppercase text-emerald-700">Hadir (H)</span>
                <span className="text-lg sm:text-xl font-black text-emerald-800 tracking-tight">
                  {isKepalaSekolahReport
                    ? kepsekSchoolTotals.pctHadir
                    : formatPct(
                        reportType === 'Laporan Harian'
                          ? dailyPctHadir
                          : reportType === 'Laporan Mingguan'
                          ? weeklyPctHadir
                          : reportType === 'Laporan Semester'
                          ? semesterPctHadir
                          : monthlyPctHadir
                      )}%
                </span>
                <span className="block text-[9px] font-semibold text-emerald-600 uppercase">
                  {isKepalaSekolahReport ? 'Rata-rata Sekolah' : 'Persentase Kehadiran'}
                </span>
              </div>
              <div className="p-2.5 bg-sky-50/90 border border-sky-300 rounded-lg text-sky-950">
                <span className="text-[10px] block font-bold uppercase text-sky-700">Sakit (S)</span>
                <span className="text-lg sm:text-xl font-black text-sky-800 tracking-tight">
                  {isKepalaSekolahReport
                    ? kepsekSchoolTotals.pctSakit
                    : formatPct(
                        reportType === 'Laporan Harian'
                          ? dailyPctSakit
                          : reportType === 'Laporan Mingguan'
                          ? weeklyPctSakit
                          : reportType === 'Laporan Semester'
                          ? semesterPctSakit
                          : monthlyPctSakit
                      )}%
                </span>
                <span className="block text-[9px] font-semibold text-sky-600 uppercase">
                  Persentase Sakit
                </span>
              </div>
              <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-lg text-amber-950">
                <span className="text-[10px] block font-bold uppercase text-amber-700">Izin (I)</span>
                <span className="text-lg sm:text-xl font-black text-amber-800 tracking-tight">
                  {isKepalaSekolahReport
                    ? kepsekSchoolTotals.pctIzin
                    : formatPct(
                        reportType === 'Laporan Harian'
                          ? dailyPctIzin
                          : reportType === 'Laporan Mingguan'
                          ? weeklyPctIzin
                          : reportType === 'Laporan Semester'
                          ? semesterPctIzin
                          : monthlyPctIzin
                      )}%
                </span>
                <span className="block text-[9px] font-semibold text-amber-600 uppercase">
                  Persentase Izin
                </span>
              </div>
              <div className="p-2.5 bg-rose-50/90 border border-rose-300 rounded-lg text-rose-950">
                <span className="text-[10px] block font-bold uppercase text-rose-700">Alfa (A)</span>
                <span className="text-lg sm:text-xl font-black text-rose-800 tracking-tight">
                  {isKepalaSekolahReport
                    ? kepsekSchoolTotals.pctAlfa
                    : formatPct(
                        reportType === 'Laporan Harian'
                          ? dailyPctAlfa
                          : reportType === 'Laporan Mingguan'
                          ? weeklyPctAlfa
                          : reportType === 'Laporan Semester'
                          ? semesterPctAlfa
                          : monthlyPctAlfa
                      )}%
                </span>
                <span className="block text-[9px] font-semibold text-rose-600 uppercase">
                  Persentase Tanpa Keterangan
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-700 pt-1.5 border-t border-slate-200 leading-relaxed">
              <p>
                <strong>Catatan Evaluasi:</strong>{' '}
                {isKepalaSekolahReport ? (
                  <>
                    Rata-rata persentase kehadiran siswa tingkat sekolah ({schoolProfile.namaSekolah || 'Sekolah'}) pada periode {kepsekPeriodInfo.periodLabel} tercatat sebesar{' '}
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {kepsekSchoolTotals.pctHadir}% ({kepsekSchoolTotals.predicate})
                    </span>{' '}
                    dengan total ketidakhadiran: Sakit {kepsekSchoolTotals.totalSakit} hari ({kepsekSchoolTotals.pctSakit}%), Izin {kepsekSchoolTotals.totalIzin} hari ({kepsekSchoolTotals.pctIzin}%), dan Alfa {kepsekSchoolTotals.totalAlfa} hari ({kepsekSchoolTotals.pctAlfa}%). Dokumen ini disusun sebagai laporan manajerial dan pertanggungjawaban resmi kepada Pengawas Sekolah Pembina.
                  </>
                ) : reportType === 'Laporan Harian' ? (
                  <>
                    Tingkat kehadiran siswa {activeClassName} pada tanggal {formatReportDateIndo(selectedDate)} tercatat sebesar{' '}
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                      {formatPct(dailyPctHadir)}%
                    </span>.
                  </>
                ) : reportType === 'Laporan Mingguan' ? (
                  <>
                    Tingkat kehadiran kumulatif siswa {activeClassName} selama {selectedWeek} ({month} {year}) tercatat sebesar{' '}
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                      {formatPct(weeklyPctHadir)}%
                    </span>.
                  </>
                ) : reportType === 'Laporan Semester' ? (
                  <>
                    Rata-rata persentase kehadiran kumulatif siswa {activeClassName} selama Semester {month === 'Januari' ? 'Genap' : 'Ganjil'} ({schoolProfile.tahunPelajaran}) tercatat sebesar{' '}
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                      {formatPct(semesterPctHadir)}%
                    </span>.
                  </>
                ) : (
                  <>
                    Rata-rata persentase kehadiran kumulatif siswa {activeClassName} berada pada angka{' '}
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                      {formatPct(avgStudentAttendance)}%
                    </span>.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Official Signature Block */}
          {isKepalaSekolahReport ? (
            /* Signature Block: Pengawas Pembina on Left & Kepala Sekolah on Right */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-xs font-sans pt-4 break-inside-avoid">
              <div className="text-center">
                <p>Mengesahkan,</p>
                <p className="font-bold">Pengawas Pembina Sekolah Dasar</p>
                <div className="h-16 sm:h-20" />
                <p className="font-bold underline text-sm">( .................................................... )</p>
                <p className="text-slate-600 font-mono">NIP. ...............................................</p>
              </div>

              <div className="text-center">
                <p>{systemConfig.reportPlace || 'Jakarta'}, {formatReportDateIndo(systemConfig.reportDate || '2026-06-27')}</p>
                <p className="font-bold">Kepala {schoolProfile.namaSekolah || 'Sekolah Dasar'}</p>
                <div className="h-16 sm:h-20" />
                <p className="font-bold underline text-sm">{schoolProfile.namaKepalaSekolah || 'Nama Kepala Sekolah'}</p>
                <p className="text-slate-600 font-mono">NIP. {schoolProfile.nipKepalaSekolah || '-'}</p>
              </div>
            </div>
          ) : (
            /* Standard Signature Block: Kepala Sekolah on Left & Guru/Wali on Right */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-xs font-sans pt-4 break-inside-avoid">
              <div className="text-center">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala {schoolProfile.namaSekolah || 'Sekolah'}</p>
                <div className="h-14 sm:h-20" />
                <p className="font-bold underline text-sm">{schoolProfile.namaKepalaSekolah}</p>
                <p className="text-slate-600 font-mono">NIP. {schoolProfile.nipKepalaSekolah}</p>
              </div>

              <div className="text-center">
                <p>{systemConfig.reportPlace || 'Jakarta'}, {formatReportDateIndo(systemConfig.reportDate || '2026-06-27')}</p>
                <p className="font-bold">
                  {attendanceType === 'SUBJECT'
                    ? formatSubjectTeacherTitle(subjectName)
                    : formatHomeroomTeacherTitle(activeClassName)}
                </p>
                <div className="h-14 sm:h-20" />
                <p className="font-bold underline text-sm">
                  {resolvedTeacherInfo.name}
                </p>
                <p className="text-slate-600 font-mono">
                  {resolvedTeacherInfo.nip && resolvedTeacherInfo.nip !== '-' ? `NIP. ${resolvedTeacherInfo.nip}` : 'NIP. -'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
