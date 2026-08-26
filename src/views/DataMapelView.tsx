import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Subject } from '../types';
import { getUserRoleScope } from '../utils/userScope';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';
import { getFaseByClassName } from '../utils/faseKurikulum';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Search,
  CheckCircle2,
  Calendar,
  UserCheck,
  GraduationCap,
  Layers,
  Sparkles,
  Filter,
  Info,
  Clock,
  CheckSquare,
} from 'lucide-react';

const DAYS_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DataMapelView: React.FC = () => {
  const {
    currentUser,
    subjects,
    teachers,
    classes,
    attendanceRecords,
    schoolProfile,
    addSubject,
    updateSubject,
    deleteSubject,
    setActiveView,
    showToast,
    activeWorkspace,
  } = useApp();

  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    (currentUser?.subscriptionPlan === 'mulai' && !currentUser?.schoolId);

  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isWaliKelas = userScope.isWaliKelas;
  const isGuruMapel = userScope.isGuruMapel || currentUser?.role === 'GURU MAPEL' || currentUser?.role === 'GURU';
  const assignedWaliClass = userScope.assignedWaliClass;

  // Find teacher record linked to currentUser
  const currentTeacher = useMemo(() => {
    if (!currentUser) return null;
    const uName = (currentUser.name || '').trim().toLowerCase();
    const uUsername = (currentUser.username || '').trim().toLowerCase();
    return teachers.find(
      (t) =>
        (t.nip && t.nip !== '-' && t.nip.trim().toLowerCase() === uUsername) ||
        (t.nama && t.nama.trim().toLowerCase() === uName)
    ) || null;
  }, [currentUser, teachers]);

  // Check if a specific subject is taught by current user
  const isMySubject = (sub: Subject) => {
    if (!currentUser) return false;
    if (sub.teacherId && (sub.teacherId === currentUser.id || (currentTeacher && sub.teacherId === currentTeacher.id))) {
      return true;
    }
    if (userScope.assignedSubjectIds.includes(sub.id)) return true;
    if (sub.teacherName && currentUser.name && sub.teacherName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
      return true;
    }
    if (currentTeacher && sub.teacherName && sub.teacherName.trim().toLowerCase() === currentTeacher.nama.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  const mySubjectsCount = useMemo(() => {
    return subjects.filter((s) => isMySubject(s)).length;
  }, [subjects, currentUser, currentTeacher, userScope.assignedSubjectIds]);

  // Search & Class Filter & Scope Filter (Semua vs Mapel Saya)
  const [searchTerm, setSearchTerm] = useState('');
  const [viewScopeTab, setViewScopeTab] = useState<'ALL' | 'MY'>(() => {
    return isGuruMapel && mySubjectsCount > 0 ? 'MY' : 'ALL';
  });

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    isWaliKelas && userScope.assignedWaliClassId ? userScope.assignedWaliClassId : 'ALL'
  );

  // Sync default filter if Wali Kelas
  useEffect(() => {
    if (isWaliKelas && userScope.assignedWaliClassId && selectedClassFilter === 'ALL') {
      setSelectedClassFilter(userScope.assignedWaliClassId);
    }
  }, [isWaliKelas, userScope.assignedWaliClassId]);

  // Modal Add / Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Delete Confirmation Modal
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Filter guru yang berjenis Guru Mapel (atau semua guru dengan penanda)
  const guruMapelList = useMemo(() => {
    return teachers.filter(
      (t) =>
        t.jabatan === 'Guru Mapel' ||
        t.jenisPTK === 'Guru Mapel' ||
        (t.mataPelajaran && t.mataPelajaran.toLowerCase().includes('mapel'))
    );
  }, [teachers]);

  // Semua guru (fallback jika belum ada yang diset guru mapel)
  const allTeacherOptions = useMemo(() => {
    return teachers;
  }, [teachers]);

  const activeFilterClass = useMemo(() => {
    if (selectedClassFilter === 'ALL') return null;
    return classes.find((c) => c.id === selectedClassFilter) || null;
  }, [classes, selectedClassFilter]);

  // Filtered Subjects:
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // Filter tab Mapel Saya
      if (viewScopeTab === 'MY') {
        if (!isMySubject(sub)) return false;
      }

      // Filter berdasarkan Kelas
      if (selectedClassFilter !== 'ALL') {
        const targetIds = sub.targetClassIds || [];
        const targetNames = (sub.targetClassNames || []).map((n) => n.trim().toLowerCase());
        const hasIdMatch = targetIds.includes(selectedClassFilter);
        const hasNameMatch = activeFilterClass && targetNames.includes(activeFilterClass.name.trim().toLowerCase());
        const hasAttendanceMatch = attendanceRecords.some(
          (r) => r.type === 'SUBJECT' && r.subjectId === sub.id && r.classId === selectedClassFilter
        );
        const isMatchedClass = hasIdMatch || hasNameMatch || hasAttendanceMatch;
        if (!isMatchedClass) return false;
      }

      // Text search
      const q = searchTerm.toLowerCase();
      if (!q) return true;
      const matchesName = sub.name.toLowerCase().includes(q);
      const matchesCode = (sub.code || '').toLowerCase().includes(q);
      const matchesTeacher = (sub.teacherName || '').toLowerCase().includes(q);
      const matchesClasses = (sub.targetClassNames || []).some((cn) => cn.toLowerCase().includes(q));
      const matchesDays = (sub.scheduleDays || []).some((d) => d.toLowerCase().includes(q));
      return matchesName || matchesCode || matchesTeacher || matchesClasses || matchesDays;
    });
  }, [subjects, viewScopeTab, searchTerm, selectedClassFilter, activeFilterClass, attendanceRecords, currentUser, currentTeacher, userScope.assignedSubjectIds]);

  const openAdd = () => {
    setEditingSubject(null);
    setName('');
    setAcronym('');
    // Auto-select logged-in teacher if available
    const defaultTeacherId = currentTeacher?.id || guruMapelList[0]?.id || teachers[0]?.id || '';
    setSelectedTeacherId(defaultTeacherId);

    // Default kelas: jika wali kelas sedang difilter ke kelas tertentu, prioritaskan kelas tersebut
    if (selectedClassFilter !== 'ALL') {
      setSelectedClassIds([selectedClassFilter]);
    } else {
      setSelectedClassIds(classes.map((c) => c.id));
    }
    setSelectedDays(['Senin']);
    setOpenModal(true);
  };

  const openEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setAcronym(sub.code || '');
    setSelectedTeacherId(sub.teacherId || (currentTeacher?.id || ''));
    setSelectedClassIds(sub.targetClassIds || []);
    setSelectedDays(sub.scheduleDays || []);
    setOpenModal(true);
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const selectAllClasses = () => {
    setSelectedClassIds(classes.map((c) => c.id));
  };

  const clearAllClasses = () => {
    setSelectedClassIds([]);
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Nama mata pelajaran wajib diisi', 'error');

    const cleanAcronym = acronym.trim().toUpperCase() || name.slice(0, 4).toUpperCase();
    const chosenTeacher = teachers.find((t) => t.id === selectedTeacherId) || currentTeacher;
    const chosenClasses = classes.filter((c) => selectedClassIds.includes(c.id));
    const targetClassNames = chosenClasses.map((c) => c.name);

    const teacherIdToAssign = chosenTeacher ? chosenTeacher.id : (currentUser?.id || null);

    if (teacherIdToAssign) {
      const validation = validateTeacherRoleAssignment(
        teacherIdToAssign,
        'guru_mapel',
        classes,
        subjects.filter((s) => (editingSubject ? s.id !== editingSubject.id : true)),
        schoolProfile?.tahunPelajaran
      );
      if (!validation.valid) {
        showToast(validation.errorMessage || 'Konflik peran guru terdeteksi.', 'error');
        return;
      }
    }

    const payload: Omit<Subject, 'id'> = {
      name: name.trim(),
      code: cleanAcronym,
      isSpecialized: true, // Khusus guru mapel
      teacherId: teacherIdToAssign,
      teacherName: chosenTeacher ? chosenTeacher.nama : (currentUser?.name || null),
      targetClassIds: selectedClassIds,
      targetClassNames,
      scheduleDays: selectedDays,
    };

    if (editingSubject) {
      await updateSubject(editingSubject.id, payload);
    } else {
      await addSubject(payload);
    }

    setOpenModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    await deleteSubject(deletingSubject.id);
    setDeletingSubject(null);
  };

  const isPersonalWaliKelas = isPersonalWorkspace && isWaliKelas && !isAdmin;

  const canAdd = !isPersonalWaliKelas && (isAdmin || isGuruMapel || (isPersonalWorkspace && !isWaliKelas));
  const canEditSubject = (sub: Subject) => {
    if (isPersonalWaliKelas) return false;
    if (isAdmin || isPersonalWorkspace) return true;
    if (isGuruMapel) return true; // Allow Guru Mapel to configure subjects/schedules
    return false;
  };
  const canDeleteSubject = (sub: Subject) => {
    if (isPersonalWaliKelas) return false;
    if (isAdmin || isPersonalWorkspace) return true;
    if (isGuruMapel && isMySubject(sub)) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Data Mata Pelajaran & Guru Mapel</h2>
              {isGuruMapel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Akses Guru Mapel
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isWaliKelas && assignedWaliClass
                ? `Menampilkan daftar mata pelajaran yang diinput dan diajar oleh Guru Mapel untuk kelas ${assignedWaliClass.name}.`
                : isGuruMapel
                ? 'Kelola mata pelajaran yang Anda ampu, tentukan rombel kelas binaan/sasaran (1A - 6B), dan atur hari jadwal KBM.'
                : 'Kelola mata pelajaran, penetapan guru pengajar mapel, pembagian rombel kelas yang diajar, dan jadwal KBM.'}
            </p>
          </div>
        </div>

        {canAdd && (
          <button
            onClick={openAdd}
            id="btn-tambah-mapel"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Tambah Mata Pelajaran</span>
          </button>
        )}
      </div>

      {/* Info Banner untuk Guru Mapel */}
      {isGuruMapel && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/95 via-blue-50/90 to-purple-50/90 border border-indigo-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Sparkles size={18} />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                <span>Panel Referensi Guru Mapel: {currentUser?.name}</span>
                {mySubjectsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-mono font-bold">
                    {mySubjectsCount} Mapel Aktif
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed max-w-3xl">
                Sebagai Guru Mata Pelajaran, Anda dapat mengelola data mata pelajaran yang Anda ajar, mengatur rombongan belajar (lintas kelas dari 1A sampai 6B), serta menentukan hari jadwal KBM mingguan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('absensi')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <CheckSquare size={14} />
            <span>Mulai Presensi KBM</span>
          </button>
        </div>
      )}

      {/* Info Banner untuk Wali Kelas */}
      {isWaliKelas && assignedWaliClass && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 shadow-xs flex items-start gap-3 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <GraduationCap size={16} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-extrabold text-blue-950 text-sm">
              Mata Pelajaran Kelas Binaan: {assignedWaliClass.name}
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tampilan ini menyajikan data mata pelajaran yang diisi oleh <strong>Guru Mata Pelajaran</strong> untuk <strong>{assignedWaliClass.name}</strong> (misalnya guru PJOK menginput kelas {assignedWaliClass.name} di hari Kamis, maka otomatis tersinkronisasi di kelas ini).
            </p>
          </div>
        </div>
      )}

      {/* Toolbar: Search & Scope Filter & Class Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-3xl">
          {/* Quick Scope Filter for Guru Mapel */}
          {isGuruMapel && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewScopeTab('MY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewScopeTab === 'MY'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mapel Saya ({mySubjectsCount})
              </button>
              <button
                type="button"
                onClick={() => setViewScopeTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewScopeTab === 'ALL'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua Mapel ({subjects.length})
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari mapel, kode, pengajar, kelas, jadwal hari..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Filter Kelas Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Filter size={13} className="text-blue-600 shrink-0" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Filter Kelas:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-transparent font-extrabold text-blue-900 outline-none cursor-pointer text-xs"
              >
                {isWaliKelas && assignedWaliClass && (
                  <option value={assignedWaliClass.id}>
                    Kelas Binaan ({assignedWaliClass.name})
                  </option>
                )}
                <option value="ALL">Semua Rombel</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({getFaseByClassName(cls.name, cls.grade)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <span>
            Menampilkan: <span className="text-blue-700 font-extrabold">{filteredSubjects.length}</span> dari {subjects.length} Mapel
          </span>
        </div>
      </div>

      {/* Grid of Subjects */}
      {filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            // Check input attendance by Guru Mapel for this subject (and class filter if applied)
            const mapelAttendance = attendanceRecords.filter(
              (r) =>
                r.type === 'SUBJECT' &&
                r.subjectId === sub.id &&
                (selectedClassFilter === 'ALL' ? true : r.classId === selectedClassFilter)
            );
            const inputCount = mapelAttendance.length;
            const lastRecord = mapelAttendance[mapelAttendance.length - 1];
            const isMine = isMySubject(sub);

            return (
              <div
                key={sub.id}
                className={`p-4 bg-white rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isMine
                    ? 'border-indigo-200/90 shadow-sm hover:border-indigo-300 ring-1 ring-indigo-500/10'
                    : 'border-slate-200 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Accent Top Strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isMine
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80'
                  }`}
                />

                <div className="space-y-3.5 pt-1">
                  {/* Header Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] font-black border border-blue-200">
                          {sub.code || 'MAPEL'}
                        </span>
                        {isMine && (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                            Mapel Saya ✓
                          </span>
                        )}
                        {sub.isSpecialized && (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            Guru Mapel
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {sub.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEditSubject(sub) && (
                        <button
                          onClick={() => openEdit(sub)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Mata Pelajaran & Rombel"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDeleteSubject(sub) && (
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Mata Pelajaran"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pengajar Mapel */}
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isMine ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      GURU PENGAJAR
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <UserCheck size={14} className={isMine ? 'text-indigo-600 shrink-0' : 'text-blue-600 shrink-0'} />
                      <span className={isMine ? 'text-indigo-950 font-black' : ''}>
                        {sub.teacherName || <span className="text-slate-400 font-normal italic">Belum ditentukan</span>}
                      </span>
                    </div>
                  </div>

                  {/* Multi Kelas yang Diajar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <span>KELAS YANG DIAJAR ({sub.targetClassNames?.length || 0} KELAS)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sub.targetClassNames && sub.targetClassNames.length > 0 ? (
                        sub.targetClassNames.map((cName, i) => {
                          const isCurrentActive =
                            activeFilterClass && cName.trim().toLowerCase() === activeFilterClass.name.trim().toLowerCase();
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
                                isCurrentActive
                                  ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {cName} {isCurrentActive && '✓'}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Semua Kelas / Belum dipilih</span>
                      )}
                    </div>
                  </div>

                  {/* Jadwal Hari Pelajaran */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      JADWAL KBM (HARI)
                    </span>
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      {sub.scheduleDays && sub.scheduleDays.length > 0 ? (
                        sub.scheduleDays.map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]"
                          >
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum diatur</span>
                      )}
                    </div>
                  </div>

                  {/* Status Input Data Presensi dari Guru Mapel */}
                  <div className="p-2.5 rounded-xl border text-[11px] bg-slate-50/80 border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1 font-bold text-slate-700">
                      <Clock size={12} className="text-blue-600 shrink-0" />
                      <span>Status Input Presensi:</span>
                    </div>
                    {inputCount > 0 ? (
                      <div className="space-y-0.5 text-emerald-700 font-semibold text-[10px]">
                        <div className="flex items-center gap-1 font-bold">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          <span>Sudah ada {inputCount} data presensi mapel</span>
                        </div>
                        {lastRecord && (
                          <span className="text-slate-500 block pl-4">
                            Terakhir diinput: {lastRecord.date}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Info size={11} className="shrink-0 text-slate-400" />
                        <span>
                          {activeFilterClass
                            ? `Menunggu Guru Mapel menginput presensi di ${activeFilterClass.name}`
                            : 'Belum ada catatan presensi mapel'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-blue-600 font-bold text-[10px]">
                    <Sparkles size={11} /> Terintegrasi Rombel
                  </span>

                  {!isPersonalWaliKelas && (
                    <button
                      type="button"
                      onClick={() => setActiveView('absensi')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all text-[10px] font-black cursor-pointer shadow-2xs"
                    >
                      <span>Presensi</span>
                      <CheckSquare size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-700">
            {searchTerm
              ? 'Tidak ditemukan mata pelajaran sesuai pencarian.'
              : viewScopeTab === 'MY'
              ? 'Belum ada mata pelajaran yang tertaut dengan akun Anda. Klik tombol Tambah Mata Pelajaran untuk mendaftarkan mata pelajaran Anda.'
              : selectedClassFilter !== 'ALL' && activeFilterClass
              ? `Belum ada mata pelajaran yang diinput oleh Guru Mapel untuk ${activeFilterClass.name}.`
              : 'Belum ada mata pelajaran. Klik tombol Tambah Mata Pelajaran untuk mulai.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {viewScopeTab === 'MY' && (
              <button
                onClick={() => setViewScopeTab('ALL')}
                className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
              >
                Lihat Semua Mata Pelajaran
              </button>
            )}
            {selectedClassFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedClassFilter('ALL')}
                className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
              >
                Tampilkan Semua Rombel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Mapel */}
      {openModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingSubject ? 'Edit Mata Pelajaran & Jadwal' : 'Tambah Mata Pelajaran Baru'}
                </h3>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {/* Form 1: Nama Mapel */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  1. NAMA MATA PELAJARAN
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pendidikan Jasmani, Olahraga dan Kesehatan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Form 2: Akronim */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  2. AKRONIM / KODE SINGKATAN
                </label>
                <input
                  type="text"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  placeholder="Contoh: PJOK, PABP, BING, MTK, SBdP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 uppercase focus:border-blue-600 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Form 3: Pengajar (Pilihan data guru jenis Guru Mapel) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    3. PENGAJAR (GURU MAPEL)
                  </label>
                  {currentTeacher && (
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherId(currentTeacher.id)}
                      className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      <span>Gunakan Akun Saya</span>
                    </button>
                  )}
                </div>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Guru Mapel --</option>
                  {currentTeacher && (
                    <option value={currentTeacher.id}>
                      ★ {currentTeacher.nama} (Saya / Pengguna Aktif)
                    </option>
                  )}
                  {guruMapelList.length > 0 && (
                    <optgroup label="Guru Mapel Terdaftar">
                      {guruMapelList
                        .filter((t) => t.id !== currentTeacher?.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nama} (Guru Mapel - {t.nip || 'Non-NIP'})
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <optgroup label="Semua Guru">
                    {allTeacherOptions
                      .filter((t) => t.id !== currentTeacher?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama} ({t.jabatan || 'Guru'})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Data pengajar diambil dari referensi Master Data Guru berjenis Guru Mapel.
                </p>
              </div>

              {/* Form 4: Kelas (Multi-pilih lebih dari 1 kelas dari Data Kelas) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    4. KELAS YANG DIAJAR (PILIH LEBIH DARI 1 KELAS)
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearAllClasses}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classes.length > 0 ? (
                    classes.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleClassSelection(cls.id)}
                            className="rounded text-blue-600 focus:ring-0 accent-blue-600"
                          />
                          <span>{cls.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="col-span-3 text-slate-400 text-center py-2">
                      Belum ada data kelas di Master Data Kelas.
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Guru mapel dapat mengajar di banyak kelas sekaligus (Rombel).
                </p>
              </div>

              {/* Form 5: Jadwal Guru Mapel */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <label className="block text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                  5. JADWAL GURU MAPEL (HARI MENGAJAR)
                </label>

                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Hari Pelaksanaan KBM:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_LIST.map((day) => {
                      const isChecked = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDaySelection(day)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {editingSubject ? 'Simpan Perubahan' : 'Simpan Mapel & Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Mapel */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1">
              Hapus Mata Pelajaran?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Anda yakin ingin menghapus mata pelajaran <strong>{deletingSubject.name}</strong> ({deletingSubject.code})?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingSubject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
