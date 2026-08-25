import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolClass, Student } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  GraduationCap,
  Search,
  Users,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';

export const DataKelasView: React.FC = () => {
  const {
    currentUser,
    classes,
    users,
    teachers,
    students,
    subjects,
    schoolProfile,
    addClass,
    updateClass,
    deleteClass,
    deleteStudentsByClass,
    deleteStudent,
    updateStudent,
    showToast,
    activeWorkspace,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isWaliKelas = currentUser?.role === 'WALI KELAS';
  const isGuru = currentUser?.role === 'GURU' || currentUser?.role === 'GURU MAPEL';
  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    currentUser?.subscriptionPlan === 'mulai' ||
    currentUser?.subscriptionPlan === 'free' ||
    currentUser?.subscriptionPlan === 'guru' ||
    currentUser?.subscriptionPlan === 'teacher' ||
    !currentUser?.schoolId;

  // Daftar kelas binaan pengguna (untuk Wali Kelas / Ruang Kerja Individu)
  const myAssignedClasses = useMemo(() => {
    if (isAdmin && !isPersonalWorkspace) return classes;
    const ids = new Set<string>();
    if (currentUser?.assignedClassIds && Array.isArray(currentUser.assignedClassIds)) {
      currentUser.assignedClassIds.forEach((id) => ids.add(id));
    }
    if (currentUser?.classIds && Array.isArray(currentUser.classIds)) {
      currentUser.classIds.forEach((id) => ids.add(id));
    }
    classes.forEach((c) => {
      if (c.waliKelasId && currentUser?.id && c.waliKelasId === currentUser.id) {
        ids.add(c.id);
      }
      if (
        c.waliKelasName &&
        currentUser?.name &&
        c.waliKelasName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      ) {
        ids.add(c.id);
      }
    });
    if (activeWorkspace?.classId) {
      ids.add(activeWorkspace.classId);
    }
    const matched = classes.filter((c) => ids.has(c.id));
    if (matched.length === 0) {
      return classes.slice(0, 1);
    }
    return matched;
  }, [isAdmin, isPersonalWorkspace, classes, currentUser, activeWorkspace]);

  const accessibleClassIds = useMemo(() => {
    return new Set(myAssignedClasses.map((c) => c.id));
  }, [myAssignedClasses]);

  const accessibleClasses = useMemo(() => {
    if (isAdmin && !isPersonalWorkspace) return classes;
    if (isPersonalWorkspace) {
      if (classes.length > 0) return classes;
      const fallbackClassName = schoolProfile?.kelas || currentUser?.classNames?.[0] || 'Kelas 4A';
      const matchGrade = fallbackClassName.match(/\d+/);
      const fallbackGrade = matchGrade ? parseInt(matchGrade[0], 10) : 4;
      return [
        {
          id: 'onboarding-class-default',
          name: fallbackClassName,
          grade: fallbackGrade,
          academicYear: schoolProfile?.tahunPelajaran || '2026/2027',
          waliKelasId: currentUser?.id || null,
          waliKelasName: currentUser?.name || null,
        },
      ];
    }
    return myAssignedClasses;
  }, [isAdmin, isPersonalWorkspace, classes, myAssignedClasses, schoolProfile, currentUser]);

  const canAddClass = isAdmin && !isPersonalWorkspace;
  const canEditClass = isAdmin || isPersonalWorkspace || isWaliKelas;
  const canDeleteClass = isAdmin && !isPersonalWorkspace;
  const canManageKelas = isAdmin || isPersonalWorkspace || isWaliKelas;

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add / Edit Modal
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(1);
  const [waliKelasId, setWaliKelasId] = useState('');

  // Quick Wali Kelas Assignment Modal
  const [assignWaliModal, setAssignWaliModal] = useState<SchoolClass | null>(null);
  const [quickWaliId, setQuickWaliId] = useState('');

  // Delete Class Modal
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  // View Students in Class Modal
  const [viewingClass, setViewingClass] = useState<SchoolClass | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Delete All Students in Class Confirmation Modal
  const [purgeClassModal, setPurgeClassModal] = useState<SchoolClass | null>(null);

  // Calon wali kelas bersumber dari master Data Guru (teachers)
  // Dilengkapi pemetaan akun jika guru sudah terhubung dengan user profile
  const waliCandidates = useMemo(() => {
    // 1. Ambil seluruh data guru dari master Data Guru (teachers)
    const list: Array<{ id: string; name: string; role: string; assignedClassName: string | null; isAccount: boolean }> = [];

    // Map untuk mencari user account berdasarkan nama guru atau NIP
    teachers.forEach((t) => {
      const teacherName = (t.nama || '').trim();
      const teacherNip = (t.nip || '').trim();

      // Cari user profile yang cocok jika ada
      const matchedUser = users.find(
        (u) =>
          (u.role === 'GURU' || u.role === 'WALI KELAS' || u.role === 'GURU MAPEL' || u.role === 'ADMIN') &&
          ((teacherNip && teacherNip !== '-' && u.username.toLowerCase() === teacherNip.toLowerCase()) ||
            u.name.trim().toLowerCase() === teacherName.toLowerCase())
      );

      // ID yang digunakan: id akun pengguna jika ada (karena FK database ke profiles),
      // atau id pengguna yang cocok, jika belum ada fallback ke matched user atau u.id
      const candidateId = matchedUser?.id || t.id;

      // Cek apakah guru ini sudah ditugaskan sebagai wali kelas di kelas manapun
      const assignedClass = classes.find((c) => {
        if (matchedUser && c.waliKelasId === matchedUser.id) return true;
        if (c.waliKelasId === t.id) return true;
        if (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === teacherName.toLowerCase()) return true;
        return false;
      });

      list.push({
        id: candidateId,
        name: teacherName || 'Tanpa Nama',
        role: t.jabatan || 'Guru',
        assignedClassName: assignedClass?.name || null,
        isAccount: !!matchedUser,
      });
    });

    // 2. Tambahkan juga akun pengguna GURU/WALI KELAS/GURU MAPEL/ADMIN yang mungkin belum ada di tabel teachers
    users
      .filter((u) => u.role === 'GURU' || u.role === 'WALI KELAS' || u.role === 'GURU MAPEL' || u.role === 'ADMIN')
      .forEach((u) => {
        const uName = (u.name || u.username).trim().toLowerCase();
        const alreadyInList = list.some(
          (item) => item.id === u.id || item.name.trim().toLowerCase() === uName
        );
        if (!alreadyInList) {
          const assignedClass = classes.find((c) => c.waliKelasId === u.id);
          list.push({
            id: u.id,
            name: u.name || u.username,
            role: u.role,
            assignedClassName: assignedClass?.name || null,
            isAccount: true,
          });
        }
      });

    return list;
  }, [teachers, users, classes]);

  // Filtered classes by search term (menggunakan accessibleClasses)
  const filteredClasses = useMemo(() => {
    return accessibleClasses.filter((c) => {
      const q = searchTerm.toLowerCase();
      const wali = c.waliKelasName?.toLowerCase() || '';
      return (
        c.name.toLowerCase().includes(q) ||
        `kelas ${c.grade}`.includes(q) ||
        c.academicYear.toLowerCase().includes(q) ||
        wali.includes(q)
      );
    });
  }, [accessibleClasses, searchTerm]);

  // Pagination for classes
  const totalPages = Math.ceil(filteredClasses.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentClasses = filteredClasses.slice(startIndex, startIndex + pageSize);

  // Students in currently viewed class
  const classStudents = useMemo(() => {
    if (!viewingClass) return [];
    return students.filter(
      (s) =>
        s.classId === viewingClass.id ||
        (s.className && s.className.toLowerCase() === viewingClass.name.toLowerCase()) ||
        (isPersonalWorkspace &&
          (!s.classId || s.classId === 'onboarding-class-default' || accessibleClasses.length === 1))
    );
  }, [students, viewingClass, isPersonalWorkspace, accessibleClasses.length]);

  const filteredClassStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const q = studentSearchTerm.toLowerCase();
      return s.nama.toLowerCase().includes(q) || s.nisn.includes(q);
    });
  }, [classStudents, studentSearchTerm]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setGrade(1);
    // Jika Wali Kelas, otomatis arahkan akun mereka sendiri
    setWaliKelasId(isWaliKelas && currentUser?.id ? currentUser.id : '');
    setOpen(true);
  };

  const openEdit = (c: SchoolClass) => {
    setEditing(c);
    setName(c.name);
    setGrade(c.grade);
    setWaliKelasId(c.waliKelasId || '');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Nama kelas wajib diisi', 'error');

    if (waliKelasId) {
      const validation = validateTeacherRoleAssignment(
        waliKelasId,
        'wali_kelas',
        classes.filter((c) => (editing ? c.id !== editing.id : true)),
        subjects,
        schoolProfile?.tahunPelajaran
      );
      if (!validation.valid) {
        showToast(validation.errorMessage || 'Konflik peran guru terdeteksi.', 'error');
        return;
      }
    }
    
    // Ekstrak angka kelas otomatis dari teks nama kelas (contoh: "Kelas 1A" -> 1, "2B" -> 2)
    const matchNumber = name.match(/\d+/);
    const autoGrade = matchNumber ? parseInt(matchNumber[0], 10) : 1;

    const payload = {
      name: name.trim(),
      grade: autoGrade,
      academicYear: editing ? editing.academicYear : '',
      waliKelasId: waliKelasId || null,
    };
    if (editing) await updateClass(editing.id, payload);
    else await addClass(payload);
    setOpen(false);
  };

  const handleSaveQuickWali = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignWaliModal) return;

    if (quickWaliId) {
      const validation = validateTeacherRoleAssignment(
        quickWaliId,
        'wali_kelas',
        classes.filter((c) => c.id !== assignWaliModal.id),
        subjects,
        schoolProfile?.tahunPelajaran
      );
      if (!validation.valid) {
        showToast(validation.errorMessage || 'Konflik peran guru terdeteksi.', 'error');
        return;
      }
    }

    await updateClass(assignWaliModal.id, {
      name: assignWaliModal.name,
      grade: assignWaliModal.grade,
      academicYear: assignWaliModal.academicYear,
      waliKelasId: quickWaliId || null,
    });
    setAssignWaliModal(null);
  };

  const removeClass = async () => {
    if (!deleting) return;
    await deleteClass(deleting.id);
    setDeleting(null);
  };

  const handlePurgeClassStudents = async () => {
    if (!purgeClassModal) return;
    await deleteStudentsByClass(purgeClassModal.id);
    setPurgeClassModal(null);
  };

  const handleRemoveFromClass = async (student: Student) => {
    await updateStudent(student.id, {
      nisn: student.nisn,
      nama: student.nama,
      gender: student.gender,
      classId: null,
    });
    showToast(`Siswa ${student.nama} dikeluarkan dari kelas`, 'info');
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isPersonalWorkspace ? 'Data Kelas Binaan Saya' : 'Data Rombongan Belajar (Kelas)'}
              </h2>
              <p className="text-xs text-slate-500">
                {isPersonalWorkspace
                  ? 'Data rombongan belajar Anda di Ruang Kerja Individu. Anda dapat melihat dan mengelola siswa kelas ini.'
                  : 'Kelola data kelas, penetapan wali kelas, dan rekapitulasi jumlah siswa otomatis.'}
              </p>
              {isPersonalWorkspace ? (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-blue-600" />
                  <span>Ruang Kerja Individu: Menampilkan kelas binaan Anda ({myAssignedClasses.map((c) => c.name).join(', ')})</span>
                </div>
              ) : isWaliKelas && !isAdmin && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Akses Wali Kelas: Mengelola Kelas Binaan Anda ({myAssignedClasses.map((c) => c.name).join(', ') || 'Belum ditugaskan'})</span>
                </div>
              )}
            </div>
          </div>
          {canAddClass && (
            <button
              onClick={openAdd}
              id="btn-tambah-kelas"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus size={16} /> Tambah Kelas
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kelas atau wali kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
            >
              <option value={5}>5 Kelas</option>
              <option value={10}>10 Kelas</option>
              <option value={25}>25 Kelas</option>
            </select>
          </div>
        </div>

        {/* Table Classes */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Wali Kelas</th>
                <th className="py-3.5 px-4 font-black">Kelas</th>
                <th className="py-3.5 px-4 text-center text-blue-700">Jml Siswa Laki-laki</th>
                <th className="py-3.5 px-4 text-center text-pink-700">Jml Siswa Perempuan</th>
                <th className="py-3.5 px-4 text-center text-slate-800">Jumlah Siswa</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentClasses.length > 0 ? (
                currentClasses.map((c, idx) => {
                  const classStudentList = students.filter(
                    (s) =>
                      s.classId === c.id ||
                      (s.className && s.className.toLowerCase() === c.name.toLowerCase()) ||
                      (isPersonalWorkspace &&
                        (!s.classId || s.classId === 'onboarding-class-default' || accessibleClasses.length === 1))
                  );
                  const countL = classStudentList.filter((s) => s.gender === 'L' || s.gender === 'Laki-laki').length;
                  const countP = classStudentList.filter((s) => s.gender === 'P' || s.gender === 'Perempuan').length;
                  const totalCount = classStudentList.length;
                  const effectiveWaliName =
                    c.waliKelasName ||
                    (isPersonalWorkspace && currentUser?.name ? currentUser.name : null);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          {effectiveWaliName ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                              <UserCheck size={13} className="text-emerald-600" />
                              {effectiveWaliName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum ditentukan</span>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignWaliModal(c);
                                setQuickWaliId(c.waliKelasId || '');
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                              title="Tentukan / ganti wali kelas"
                            >
                              {c.waliKelasId ? 'Ganti' : '+ Wali'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-700 bg-blue-50/30">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-xs">
                          {countL} L
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-pink-700 bg-pink-50/30">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-100/80 text-pink-800 text-xs">
                          {countP} P
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setViewingClass(c);
                            setStudentSearchTerm('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200 transition-colors cursor-pointer"
                          title="Klik untuk melihat daftar siswa di kelas ini"
                        >
                          <Users size={13} />
                          <span>{totalCount} Siswa</span>
                          <Eye size={12} className="ml-0.5 text-emerald-600" />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setViewingClass(c);
                              setStudentSearchTerm('');
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Tampilkan Siswa dalam Kelas Ini"
                          >
                            <Users size={15} />
                          </button>
                          {canManageKelas && (
                            <>
                              <button
                                onClick={() => openEdit(c)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Kelas"
                              >
                                <Edit2 size={15} />
                              </button>
                              {canDeleteClass && totalCount > 0 && (
                                <button
                                  onClick={() => setPurgeClassModal(c)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Semua Siswa dalam Kelas Ini"
                                >
                                  <UserX size={15} />
                                </button>
                              )}
                              {canDeleteClass && (
                                <button
                                  onClick={() => setDeleting(c)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Kelas"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {searchTerm
                      ? 'Tidak ditemukan kelas yang cocok dengan pencarian.'
                      : 'Belum ada kelas. Klik tombol Tambah Kelas untuk mulai.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Menampilkan {startIndex + 1} - {Math.min(startIndex + pageSize, filteredClasses.length)} dari {filteredClasses.length} kelas
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 font-bold text-slate-700">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tentukan Wali Kelas Cepat */}
      {assignWaliModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Tentukan Wali Kelas ({assignWaliModal.name})
                </h3>
              </div>
              <button
                onClick={() => setAssignWaliModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickWali} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-900 space-y-1">
                <p className="font-bold">Kelas: {assignWaliModal.name}</p>
                <p className="text-[11px] text-blue-700">
                  Wali kelas memiliki wewenang untuk mengisi absensi harian dan rekap kehadiran siswa di kelas ini.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  PILIH WALI KELAS (DARI DATA GURU)
                </label>
                <select
                  value={quickWaliId}
                  onChange={(e) => setQuickWaliId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Kosongkan / Belum Ditentukan --</option>
                  {waliCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.assignedClassName ? `(Saat ini Wali di: ${u.assignedClassName})` : '(Tersedia)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignWaliModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah / Edit Kelas (Hanya 2 Form: Wali Kelas & Nama Kelas) */}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">
                {editing ? 'Edit Data Kelas' : 'Tambah Rombongan Belajar Baru'}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4 pt-4">
              {/* Form Pertama: Wali Kelas (Diambil dari sumber Data Guru) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  1. WALI KELAS
                </label>
                <select
                  value={waliKelasId}
                  onChange={(e) => setWaliKelasId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Wali Kelas (Belum Ditentukan) --</option>
                  {waliCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.assignedClassName && u.assignedClassName !== editing?.name ? `(Wali di: ${u.assignedClassName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Data diambil dari referensi Master Data Guru.
                </p>
              </div>

              {/* Form Kedua: Kelas */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  2. KELAS
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kelas 1A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tulis nama kelas lengkap (contoh: <strong>Kelas 1A</strong>, <strong>Kelas 2B</strong>, <strong>Kelas 6</strong>).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Siswa Dalam Kelas */}
      {viewingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 text-slate-800">
            {/* Header Modal */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-black text-xs rounded-lg">
                    Kelas {viewingClass.name}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Daftar Siswa Terdaftar
                </h3>
                <p className="text-xs text-slate-500">
                  Wali Kelas: <strong className="text-slate-700">{viewingClass.waliKelasName || 'Belum ditentukan'}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewingClass(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar Dalam Modal */}
            <div className="py-3 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa atau NISN..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>
            </div>

            {/* Tabel Siswa */}
            <div className="overflow-y-auto flex-1 min-h-0 border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Lengkap</th>
                    <th className="py-2.5 px-3 text-center">L/P</th>
                    {isAdmin && <th className="py-2.5 px-3 text-center w-24">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassStudents.length > 0 ? (
                    filteredClassStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {s.nisn || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {s.nama}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.gender === 'L'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {s.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromClass(s)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                                title="Keluarkan dari kelas ini (tetap ada di database siswa)"
                              >
                                Lepas Kelas
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteStudent(s.id);
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Hapus siswa permanen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-slate-400">
                        {studentSearchTerm
                          ? 'Tidak ada siswa yang sesuai pencarian.'
                          : 'Belum ada siswa yang dimasukkan ke kelas ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0 text-xs">
              <span className="font-bold text-slate-600">
                Total: {classStudents.length} Siswa ({classStudents.filter((s) => s.gender === 'L').length} L,{' '}
                {classStudents.filter((s) => s.gender === 'P').length} P)
              </span>
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Semua Siswa Dalam Satu Kelas */}
      {purgeClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center text-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1">
              Hapus Semua Siswa di Kelas {purgeClassModal.name}?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Tindakan ini akan <strong>menghapus permanen seluruh data {students.filter(s => s.classId === purgeClassModal.id).length} siswa</strong>, riwayat absensi, dan akun login siswa yang terdaftar di kelas <strong>{purgeClassModal.name}</strong>.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setPurgeClassModal(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handlePurgeClassStudents}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ya, Hapus Semua Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Kelas */}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center text-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1">
              Hapus Rombel Kelas {deleting.name}?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Kelas <strong>{deleting.name}</strong> akan dihapus dari daftar rombel. Data siswa di kelas ini akan dilepas status kelasnya.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={removeClass}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ya, Hapus Kelas Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
