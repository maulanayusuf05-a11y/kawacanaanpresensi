import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AcademicEvent } from '../types';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  CalendarDays,
  X,
  Info,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  CalendarCheck2,
  Building,
  ChevronRight,
  ExternalLink,
  Lock,
  ShieldAlert,
} from 'lucide-react';

/**
 * Helper to parse startYear and endYear from schoolProfile.tahunPelajaran
 * Supports '2026/2027', '2025/2026', '2026-2027', '2026', etc.
 */
export const parseAcademicYears = (tpStr: string) => {
  const cleanStr = tpStr || '';
  const matches = cleanStr.match(/\d{4}/g);
  if (matches && matches.length >= 2) {
    const y1 = parseInt(matches[0], 10);
    const y2 = parseInt(matches[1], 10);
    return { startYear: y1, endYear: y2, academicYearLabel: `${y1}/${y2}` };
  } else if (matches && matches.length === 1) {
    const y1 = parseInt(matches[0], 10);
    return { startYear: y1, endYear: y1 + 1, academicYearLabel: `${y1}/${y1 + 1}` };
  }
  const currentYear = new Date().getFullYear();
  return { startYear: currentYear, endYear: currentYear + 1, academicYearLabel: `${currentYear}/${currentYear + 1}` };
};

export const KalenderAkademikView: React.FC = () => {
  const {
    schoolProfile,
    academicEvents,
    addAcademicEvent,
    deleteAcademicEvent,
    activeStudyDays,
    updateActiveStudyDays,
    effectiveDaysConfig,
    updateEffectiveDays,
    getBaseStudyDaysForMonth,
    getEffectiveDaysForMonth,
    setActiveView,
    currentUser,
    activeWorkspace,
    showToast,
  } = useApp();

  // Ruang Kerja Individu & Admin Sekolah memiliki akses penuh mengelola kalender akademik
  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    (currentUser?.subscriptionPlan === 'mulai' && !currentUser?.schoolId);

  const isAdminSekolah = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const canManageCalendar = isPersonalWorkspace ? true : isAdminSekolah;
  const isReadOnly = !canManageCalendar;

  // Extract startYear and endYear from schoolProfile.tahunPelajaran
  const { startYear, endYear, academicYearLabel } = useMemo(() => {
    return parseAcademicYears(schoolProfile.tahunPelajaran);
  }, [schoolProfile.tahunPelajaran]);

  const [activeTab, setActiveTab] = useState<'agenda' | 'hari-belajar'>('agenda');
  const [selectedMonth, setSelectedMonth] = useState<string>('08');
  const [selectedYear, setSelectedYear] = useState<string>(() => String(startYear));
  const [searchAgenda, setSearchAgenda] = useState<string>('');

  // Automatically adjust selectedYear based on selectedMonth and schoolProfile.tahunPelajaran
  // Semester 1 (Juli - Desember) uses startYear, Semester 2 (Januari - Juni) uses endYear
  useEffect(() => {
    const isSemester1 = ['07', '08', '09', '10', '11', '12'].includes(selectedMonth);
    const targetYear = String(isSemester1 ? startYear : endYear);
    setSelectedYear(targetYear);
  }, [selectedMonth, startYear, endYear]);

  // Add Event Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventDate, setEventDate] = useState(() => `${startYear}-08-17`);
  const [eventTitle, setEventTitle] = useState('');
  const [isEffective, setIsEffective] = useState(false); // false means holiday / reduces effective day
  const [eventNotes, setEventNotes] = useState('');

  const monthKey = `${selectedYear}-${selectedMonth}`;
  const baseHariBelajar = effectiveDaysConfig[monthKey] !== undefined
    ? effectiveDaysConfig[monthKey]
    : getBaseStudyDaysForMonth(Number(selectedYear), Number(selectedMonth));

  // Filter events for the selected month and search query
  const filteredEvents = academicEvents.filter((e) => {
    const inMonth = e.date.startsWith(monthKey);
    const matchesQuery = e.title.toLowerCase().includes(searchAgenda.toLowerCase());
    return inMonth && matchesQuery;
  });

  // Calculate non-effective events in this month that fall on an active study day
  const nonEffectiveEventsInMonth = academicEvents.filter((e) => {
    if (!e.date.startsWith(monthKey) || e.isEffective) return false;
    try {
      const [y, m, d] = e.date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      return activeStudyDays.includes(dayOfWeek);
    } catch {
      return false;
    }
  });
  const nonEffectiveCount = nonEffectiveEventsInMonth.length;

  const finalEffectiveDays = Math.max(0, baseHariBelajar - nonEffectiveCount);

  const monthNames: { [key: string]: string } = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
  };

  const weekdaysList = [
    { dayNumber: 1, label: 'Senin', short: 'Sen' },
    { dayNumber: 2, label: 'Selasa', short: 'Sel' },
    { dayNumber: 3, label: 'Rabu', short: 'Rab' },
    { dayNumber: 4, label: 'Kamis', short: 'Kam' },
    { dayNumber: 5, label: 'Jumat', short: 'Jum' },
    { dayNumber: 6, label: 'Sabtu', short: 'Sab' },
    { dayNumber: 0, label: 'Minggu', short: 'Min' },
  ];

  // 12 Months of the Academic Year (Juli year 1 s/d Juni year 2)
  const academicMonthsList = useMemo(() => {
    return [
      { m: '07', name: 'Juli', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '08', name: 'Agustus', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '09', name: 'September', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '10', name: 'Oktober', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '11', name: 'November', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '12', name: 'Desember', y: startYear, semester: 1, semesterLabel: 'Semester 1 (Ganjil)' },
      { m: '01', name: 'Januari', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
      { m: '02', name: 'Februari', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
      { m: '03', name: 'Maret', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
      { m: '04', name: 'April', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
      { m: '05', name: 'Mei', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
      { m: '06', name: 'Juni', y: endYear, semester: 2, semesterLabel: 'Semester 2 (Genap)' },
    ];
  }, [startYear, endYear]);

  // Compute subtotals for Semester 1, Semester 2, and Grand Total
  const { semester1Summary, semester2Summary, fullYearSummary } = useMemo(() => {
    let s1Cal = 0, s1Base = 0, s1Libur = 0, s1Heb = 0;
    let s2Cal = 0, s2Base = 0, s2Libur = 0, s2Heb = 0;

    academicMonthsList.forEach((row) => {
      const mNum = Number(row.m);
      const totalDays = new Date(row.y, mNum, 0).getDate();
      const baseDays = getBaseStudyDaysForMonth(row.y, mNum);
      const mKey = `${row.y}-${row.m}`;

      const libur = academicEvents.filter((e) => {
        if (!e.date.startsWith(mKey) || e.isEffective) return false;
        try {
          const [ey, em, ed] = e.date.split('-').map(Number);
          const dayOfWeek = new Date(ey, em - 1, ed).getDay();
          return activeStudyDays.includes(dayOfWeek);
        } catch {
          return false;
        }
      }).length;

      const heb = Math.max(0, baseDays - libur);

      if (row.semester === 1) {
        s1Cal += totalDays;
        s1Base += baseDays;
        s1Libur += libur;
        s1Heb += heb;
      } else {
        s2Cal += totalDays;
        s2Base += baseDays;
        s2Libur += libur;
        s2Heb += heb;
      }
    });

    return {
      semester1Summary: { cal: s1Cal, base: s1Base, libur: s1Libur, heb: s1Heb },
      semester2Summary: { cal: s2Cal, base: s2Base, libur: s2Libur, heb: s2Heb },
      fullYearSummary: {
        cal: s1Cal + s2Cal,
        base: s1Base + s2Base,
        libur: s1Libur + s2Libur,
        heb: s1Heb + s2Heb,
      },
    };
  }, [academicMonthsList, academicEvents, activeStudyDays, getBaseStudyDaysForMonth]);

  const toggleWeekday = (dayNumber: number) => {
    if (!canManageCalendar) {
      showToast('Hanya Admin Sekolah yang dapat mengubah konfigurasi hari belajar.', 'warning');
      return;
    }
    if (activeStudyDays.includes(dayNumber)) {
      if (activeStudyDays.length === 1) return; // Must have at least 1 day
      updateActiveStudyDays(activeStudyDays.filter((d) => d !== dayNumber));
    } else {
      updateActiveStudyDays([...activeStudyDays, dayNumber]);
    }
  };

  const applyPreset = (presetDays: number[]) => {
    if (!canManageCalendar) {
      showToast('Hanya Admin Sekolah yang dapat mengubah preset hari belajar.', 'warning');
      return;
    }
    updateActiveStudyDays(presetDays);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCalendar) {
      showToast('Hanya Admin Sekolah yang dapat menambah agenda akademik.', 'warning');
      setIsModalOpen(false);
      return;
    }
    if (!eventTitle.trim()) return;

    const dateObj = new Date(eventDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const mStr = dateObj.toLocaleString('en-US', { month: 'short' });
    const yStr = String(dateObj.getFullYear()).slice(-2);
    const dateDisplay = `${day} ${mStr} ${yStr}`;

    addAcademicEvent({
      date: eventDate,
      dateDisplay,
      title: eventTitle.trim(),
      isEffective,
      notes: eventNotes.trim(),
    });

    setIsModalOpen(false);
    setEventTitle('');
    setEventNotes('');
  };

  const openAddModalForMonth = () => {
    if (!canManageCalendar) {
      showToast('Hanya Admin Sekolah yang dapat menambah agenda akademik.', 'warning');
      return;
    }
    setEventDate(`${selectedYear}-${selectedMonth}-01`);
    setIsModalOpen(true);
  };

  const handleSelectMonthFromTable = (m: string, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(String(y));
    setActiveTab('agenda');
  };

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs min-h-[38px] cursor-pointer"
          id="btn-back-dashboard"
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>

        {/* School Profile Year Link Badge */}
        <button
          onClick={() => setActiveView('data-referensi')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors shadow-xs cursor-pointer"
          title="Klik untuk mengubah Tahun Pelajaran di menu Identitas Sekolah"
        >
          <Building size={14} className="text-blue-600" />
          <span>Tahun Pelajaran: <b>{schoolProfile.tahunPelajaran || `${startYear}/${endYear}`}</b></span>
          <ExternalLink size={12} className="text-blue-500 ml-0.5" />
        </button>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">
              Kalender Akademik & Hari Belajar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Terintegrasi langsung dengan Tahun Pelajaran <b>{schoolProfile.tahunPelajaran || `${startYear}/${endYear}`}</b>{schoolProfile.namaSekolah ? ` (${schoolProfile.namaSekolah})` : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isReadOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
              <Lock size={13} className="text-amber-600" />
              <span>Dikelola Admin Sekolah</span>
            </span>
          )}
        </div>
      </div>

      {/* Notification Banner for Non-Admin in School Workspace */}
      {isReadOnly && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
            <Lock size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-xs sm:text-sm">Hak Akses: Hanya Admin Sekolah</p>
            <p className="text-amber-800 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
              Di <b>Ruang Kerja Sekolah</b>, pengisian agenda kegiatan, penetapan libur sekolah, serta konfigurasi hari belajar aktif (Senin - Minggu) dikelola secara terpusat oleh <b>Admin Sekolah</b>. Anda dapat meninjau seluruh data kalender dan hari efektif belajar di bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('agenda')}
          id="tab-agenda"
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[40px] cursor-pointer ${
            activeTab === 'agenda'
              ? 'bg-blue-600 text-white shadow-xs font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CalendarDays size={15} />
          <span>Agenda & Kalender</span>
        </button>

        <button
          onClick={() => setActiveTab('hari-belajar')}
          id="tab-hari-belajar"
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[40px] cursor-pointer ${
            activeTab === 'hari-belajar'
              ? 'bg-blue-600 text-white shadow-xs font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Sliders size={15} />
          <span>Konfigurasi Hari Belajar (Senin - Minggu)</span>
        </button>
      </div>

      {activeTab === 'agenda' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Left Column: Agenda Table & Controls */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Filters & Add Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Month Selector */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer min-h-[40px]"
                >
                  {Object.entries(monthNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>

                {/* Integrated Year Selector based on Tahun Pelajaran */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none focus:border-blue-600 cursor-pointer min-h-[40px]"
                  title="Tahun terintegrasi dari Tahun Pelajaran di Identitas Sekolah"
                >
                  <option value={String(startYear)}>
                    {startYear} (Semester 1)
                  </option>
                  <option value={String(endYear)}>
                    {endYear} (Semester 2)
                  </option>
                  {/* Fallback option if user needs a different custom year */}
                  {selectedYear !== String(startYear) && selectedYear !== String(endYear) && (
                    <option value={selectedYear}>{selectedYear}</option>
                  )}
                </select>

                {/* Search Bar */}
                <div className="relative w-full sm:w-40 md:w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchAgenda}
                    onChange={(e) => setSearchAgenda(e.target.value)}
                    placeholder="Cari agenda..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 min-h-[40px]"
                  />
                </div>
              </div>

              {canManageCalendar ? (
                <button
                  onClick={openAddModalForMonth}
                  id="btn-tambah-agenda"
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 min-h-[40px] shrink-0 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>+ Agenda</span>
                </button>
              ) : (
                <div
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[40px] shrink-0 select-none"
                  title="Hanya Admin Sekolah yang dapat menambah agenda"
                >
                  <Lock size={13} className="text-slate-400" />
                  <span>+ Agenda (Khusus Admin)</span>
                </div>
              )}
            </div>

            {/* Agenda Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Daftar Agenda {monthNames[selectedMonth]} {selectedYear} ({filteredEvents.length})
                </span>
                <span className="text-[10px] text-slate-400 block sm:hidden">← Geser tabel →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[460px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60">
                      <th className="py-3 px-3 sm:px-4 w-28 sm:w-32">Tanggal</th>
                      <th className="py-3 px-3 sm:px-4">Nama Kegiatan</th>
                      <th className="py-3 px-3 sm:px-4 text-center w-20">
                        {canManageCalendar ? 'Aksi' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-800 whitespace-nowrap">{ev.dateDisplay}</td>
                          <td className="py-3.5 px-3 sm:px-4">
                            <p className="font-bold text-slate-900">{ev.title}</p>
                            {ev.notes && <p className="text-[11px] text-slate-500 mt-0.5">{ev.notes}</p>}
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                ev.isEffective
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {ev.isEffective ? 'Hari Efektif Belajar' : 'Hari Libur / Non-Efektif'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center">
                            {canManageCalendar ? (
                              <button
                                onClick={() => deleteAcademicEvent(ev.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <Lock size={10} />
                                <span>Tersinkron</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-slate-400 font-medium">
                          Belum ada agenda kegiatan untuk bulan {monthNames[selectedMonth]} {selectedYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Analisis Efektivitas Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            <div>
              {/* Header Banner */}
              <div className="bg-blue-50 border-b border-blue-100 text-blue-700 p-4 flex items-center justify-between font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  <h3 className="tracking-wide font-extrabold">Analisis Efektivitas</h3>
                </div>
                <span className="text-[11px] font-mono font-bold bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded">
                  {selectedYear}
                </span>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Active Weekdays Chip preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hari Belajar Aktif</span>
                    {canManageCalendar ? (
                      <button
                        onClick={() => setActiveTab('hari-belajar')}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Ubah
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Lock size={10} />
                        <span>Admin Only</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weekdaysList.map((w) => {
                      const isActive = activeStudyDays.includes(w.dayNumber);
                      return (
                        <span
                          key={w.dayNumber}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          }`}
                        >
                          {w.short}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Calculations breakdown */}
                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span>Hari Belajar ({activeStudyDays.length} hari/minggu)</span>
                    <span className="font-extrabold text-slate-900 text-sm">{baseHariBelajar}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-3">
                    <span>Agenda Libur Sekolah</span>
                    <span className="font-extrabold text-rose-600 text-sm">
                      {nonEffectiveCount > 0 ? `-${nonEffectiveCount}` : '0'}
                    </span>
                  </div>
                </div>

                {/* Big Center Total */}
                <div className="text-center py-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    HARI EFEKTIF BELAJAR
                  </p>
                  <div className="text-4xl font-black text-blue-700 leading-none my-1">
                    {finalEffectiveDays}
                  </div>
                  <p className="text-xs font-bold text-slate-700">Bulan {monthNames[selectedMonth]} {selectedYear}</p>
                </div>

                {/* Informational Banner */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Perhitungan otomatis terhubung ke formulir <b>Absensi</b>, panel <b>Rekapitulasi</b>, dan <b>Cetak Laporan</b> TP {schoolProfile.tahunPelajaran || `${startYear}/${endYear}`}.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Hari Belajar Tab (Senin sampai Minggu) */
        <div className="space-y-6">
          {/* Card 1: Day of week selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Pemilihan Hari Belajar (Senin s.d. Minggu)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Tentukan hari-hari dalam sepekan yang dihitung sebagai hari aktif kegiatan belajar mengajar (KBM).
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Preset:</span>
                <button
                  type="button"
                  disabled={!canManageCalendar}
                  onClick={() => applyPreset([1, 2, 3, 4, 5])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    !canManageCalendar
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                      : activeStudyDays.length === 5 &&
                        [1, 2, 3, 4, 5].every((d) => activeStudyDays.includes(d))
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-pointer'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                  }`}
                >
                  5 Hari (Sen-Jum)
                </button>
                <button
                  type="button"
                  disabled={!canManageCalendar}
                  onClick={() => applyPreset([1, 2, 3, 4, 5, 6])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    !canManageCalendar
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                      : activeStudyDays.length === 6 &&
                        [1, 2, 3, 4, 5, 6].every((d) => activeStudyDays.includes(d))
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-pointer'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                  }`}
                >
                  6 Hari (Sen-Sab)
                </button>
                <button
                  type="button"
                  disabled={!canManageCalendar}
                  onClick={() => applyPreset([0, 1, 2, 3, 4, 5, 6])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    !canManageCalendar
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                      : activeStudyDays.length === 7
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-pointer'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                  }`}
                >
                  7 Hari (Semua)
                </button>
              </div>
            </div>

            {/* 7 Days Interactive Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {weekdaysList.map((w) => {
                const isActive = activeStudyDays.includes(w.dayNumber);
                return (
                  <div
                    key={w.dayNumber}
                    onClick={canManageCalendar ? () => toggleWeekday(w.dayNumber) : undefined}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all select-none flex flex-col justify-between items-center text-center gap-3 ${
                      canManageCalendar ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 opacity-75'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {w.short}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-transparent border border-slate-300'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>

                    <div>
                      <p className="font-extrabold text-sm sm:text-base text-slate-900">
                        {w.label}
                      </p>
                      <p
                        className={`text-[10px] font-bold mt-0.5 ${
                          isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {isActive ? '● Hari Belajar' : '○ Libur Rutin'}
                      </p>
                    </div>

                    {canManageCalendar ? (
                      <button
                        type="button"
                        className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Non-Aktif'}
                      </button>
                    ) : (
                      <span
                        className={`w-full py-1.5 rounded-xl text-[11px] font-bold text-center block ${
                          isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Libur'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info Box Integration */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
              <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <Info size={16} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-blue-900">
                  Integrasi Perhitungan Absensi & Hari Efektif (TP {schoolProfile.tahunPelajaran || `${startYear}/${endYear}`}):
                </p>
                <p className="text-blue-800 leading-relaxed">
                  Sistem telah mengonfigurasi <b>{activeStudyDays.length} hari belajar per pekan</b> ({weekdaysList
                    .filter((w) => activeStudyDays.includes(w.dayNumber))
                    .map((w) => w.label)
                    .join(', ')}). Jumlah hari belajar bulanan dihitung secara otomatis dan akurat dari kalender tahun <b>{startYear}</b> (Semester 1) dan tahun <b>{endYear}</b> (Semester 2), lalu dikurangi agenda libur sekolah.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: 12-Month Academic Year Breakdown Table (Integrated with tahunPelajaran) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <CalendarCheck2 size={18} className="text-blue-600" />
                  <span>
                    Rekapitulasi Hari Efektif Per Bulan (Tahun Pelajaran {schoolProfile.tahunPelajaran || `${startYear}/${endYear}`})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tahun otomatis disinkronkan dengan Identitas Sekolah ({startYear} untuk Semester 1 & {endYear} untuk Semester 2).
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                  Total Hari Belajar/Minggu: {activeStudyDays.length} Hari
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60 text-center">
                      <th className="py-3 px-3 sm:px-4 text-left">Bulan</th>
                      <th className="py-3 px-3 sm:px-4">Tahun</th>
                      <th className="py-3 px-3 sm:px-4">Semester</th>
                      <th className="py-3 px-3 sm:px-4">Total Hari Kalender</th>
                      <th className="py-3 px-3 sm:px-4">Hari Belajar Rutin</th>
                      <th className="py-3 px-3 sm:px-4 text-rose-600">Agenda Libur</th>
                      <th className="py-3 px-3 sm:px-4 text-emerald-700 font-extrabold bg-blue-100/50">Hari Efektif (HEB)</th>
                      <th className="py-3 px-3 sm:px-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {/* Render Semester 1 (Juli - Desember) */}
                    <tr className="bg-slate-100/80 font-bold text-slate-700 text-[11px]">
                      <td colSpan={8} className="py-2 px-3 sm:px-4">
                        SEMESTER 1 (GANJIL) - TAHUN {startYear}
                      </td>
                    </tr>
                    {academicMonthsList.slice(0, 6).map((row) => {
                      const mNum = Number(row.m);
                      const totalDaysInMonth = new Date(row.y, mNum, 0).getDate();
                      const baseDays = getBaseStudyDaysForMonth(row.y, mNum);
                      const mKey = `${row.y}-${row.m}`;
                      
                      const liburAgenda = academicEvents.filter((e) => {
                        if (!e.date.startsWith(mKey) || e.isEffective) return false;
                        try {
                          const [ey, em, ed] = e.date.split('-').map(Number);
                          const dayOfWeek = new Date(ey, em - 1, ed).getDay();
                          return activeStudyDays.includes(dayOfWeek);
                        } catch {
                          return false;
                        }
                      }).length;

                      const heb = Math.max(0, baseDays - liburAgenda);
                      const isCurrentSelected = row.m === selectedMonth && String(row.y) === selectedYear;

                      return (
                        <tr
                          key={mKey}
                          className={`hover:bg-slate-50 transition-colors ${
                            isCurrentSelected ? 'bg-blue-50/50 font-bold' : ''
                          }`}
                        >
                          <td className="py-3 px-3 sm:px-4 font-bold text-slate-900 text-left">
                            {row.name}
                            {isCurrentSelected && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                                Terpilih
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-blue-700">{row.y}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-slate-500 text-[11px]">{row.semesterLabel}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-slate-600">{totalDaysInMonth} Hari</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold">{baseDays} Hari</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold text-rose-600">
                            {liburAgenda > 0 ? `-${liburAgenda}` : '0'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-black text-blue-700 bg-blue-50/60 text-sm">
                            {heb} Hari
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center">
                            <button
                              onClick={() => handleSelectMonthFromTable(row.m, row.y)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-bold text-blue-600 transition-colors cursor-pointer"
                            >
                              Lihat Agenda
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Subtotal Semester 1 */}
                    <tr className="bg-blue-50/70 font-bold text-blue-900 border-t-2 border-b-2 border-blue-200">
                      <td colSpan={3} className="py-2.5 px-3 sm:px-4 uppercase tracking-wider text-[11px]">
                        Subtotal Semester 1 (Ganjil {startYear})
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">{semester1Summary.cal} Hari</td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">{semester1Summary.base} Hari</td>
                      <td className="py-2.5 px-3 sm:px-4 text-center text-rose-600">
                        {semester1Summary.libur > 0 ? `-${semester1Summary.libur}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-black text-blue-800 text-sm bg-blue-100/60">
                        {semester1Summary.heb} Hari
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center text-[10px] text-blue-600 font-bold">
                        (6 Bulan)
                      </td>
                    </tr>

                    {/* Render Semester 2 (Januari - Juni) */}
                    <tr className="bg-slate-100/80 font-bold text-slate-700 text-[11px]">
                      <td colSpan={8} className="py-2 px-3 sm:px-4">
                        SEMESTER 2 (GENAP) - TAHUN {endYear}
                      </td>
                    </tr>
                    {academicMonthsList.slice(6, 12).map((row) => {
                      const mNum = Number(row.m);
                      const totalDaysInMonth = new Date(row.y, mNum, 0).getDate();
                      const baseDays = getBaseStudyDaysForMonth(row.y, mNum);
                      const mKey = `${row.y}-${row.m}`;
                      
                      const liburAgenda = academicEvents.filter((e) => {
                        if (!e.date.startsWith(mKey) || e.isEffective) return false;
                        try {
                          const [ey, em, ed] = e.date.split('-').map(Number);
                          const dayOfWeek = new Date(ey, em - 1, ed).getDay();
                          return activeStudyDays.includes(dayOfWeek);
                        } catch {
                          return false;
                        }
                      }).length;

                      const heb = Math.max(0, baseDays - liburAgenda);
                      const isCurrentSelected = row.m === selectedMonth && String(row.y) === selectedYear;

                      return (
                        <tr
                          key={mKey}
                          className={`hover:bg-slate-50 transition-colors ${
                            isCurrentSelected ? 'bg-blue-50/50 font-bold' : ''
                          }`}
                        >
                          <td className="py-3 px-3 sm:px-4 font-bold text-slate-900 text-left">
                            {row.name}
                            {isCurrentSelected && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                                Terpilih
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-blue-700">{row.y}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-slate-500 text-[11px]">{row.semesterLabel}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-slate-600">{totalDaysInMonth} Hari</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold">{baseDays} Hari</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold text-rose-600">
                            {liburAgenda > 0 ? `-${liburAgenda}` : '0'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-black text-blue-700 bg-blue-50/60 text-sm">
                            {heb} Hari
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center">
                            <button
                              onClick={() => handleSelectMonthFromTable(row.m, row.y)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-bold text-blue-600 transition-colors cursor-pointer"
                            >
                              Lihat Agenda
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Subtotal Semester 2 */}
                    <tr className="bg-blue-50/70 font-bold text-blue-900 border-t-2 border-b-2 border-blue-200">
                      <td colSpan={3} className="py-2.5 px-3 sm:px-4 uppercase tracking-wider text-[11px]">
                        Subtotal Semester 2 (Genap {endYear})
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">{semester2Summary.cal} Hari</td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">{semester2Summary.base} Hari</td>
                      <td className="py-2.5 px-3 sm:px-4 text-center text-rose-600">
                        {semester2Summary.libur > 0 ? `-${semester2Summary.libur}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-black text-blue-800 text-sm bg-blue-100/60">
                        {semester2Summary.heb} Hari
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center text-[10px] text-blue-600 font-bold">
                        (6 Bulan)
                      </td>
                    </tr>

                    {/* Grand Total 1 Tahun Pelajaran */}
                    <tr className="bg-emerald-50 font-black text-emerald-900 border-t-2 border-emerald-300">
                      <td colSpan={3} className="py-3 px-3 sm:px-4 uppercase tracking-wider text-xs">
                        ★ TOTAL 1 TAHUN PELAJARAN ({schoolProfile.tahunPelajaran || `${startYear}/${endYear}`})
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">{fullYearSummary.cal} Hari</td>
                      <td className="py-3 px-3 sm:px-4 text-center">{fullYearSummary.base} Hari</td>
                      <td className="py-3 px-3 sm:px-4 text-center text-rose-700">
                        {fullYearSummary.libur > 0 ? `-${fullYearSummary.libur}` : '0'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center font-black text-emerald-800 text-base bg-emerald-100/80">
                        {fullYearSummary.heb} HARI
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center text-[10px] text-emerald-700 font-bold">
                        (12 Bulan Penuh)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && canManageCalendar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Agenda Akademik</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  TANGGAL
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  NAMA KEGIATAN / AGENDA
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Contoh: Hari Kemerdekaan, Rapat Pleno, dll."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  SIFAT HARI
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEffective(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                      !isEffective
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Libur / Non-Efektif (-1 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEffective(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                      isEffective
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tetap Hari Efektif
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  KETERANGAN / CATATAN
                </label>
                <textarea
                  rows={2}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Keterangan tambahan..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[38px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md min-h-[38px] cursor-pointer"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


