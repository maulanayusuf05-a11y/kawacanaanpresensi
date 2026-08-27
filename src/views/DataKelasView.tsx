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
  ShieldCheck,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Download,
  Check,
  AlertCircle
} from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';
import { getFaseByClassName, getFaseByGrade, getFaseBadgeColor, getGradeFromClassName, formatClassDisplay } from '../utils/faseKurikulum';

interface ParsedClassItem {
  name: string;
  grade: number;
  waliKelasNameInput?: string;
  isValid: boolean;
  error?: string;
}

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
    importClasses,
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
      return isPersonalWorkspace ? classes : classes.slice(0, 1);
    }
    return matched;
  }, [isAdmin, isPersonalWorkspace, classes, currentUser, activeWorkspace]);

  const accessibleClassIds = useMemo(() => {
    return new Set(myAssignedClasses.map((c) => c.id));
  }, [myAssignedClasses]);

  const accessibleClasses = useMemo(() => {
    if (isAdmin && !isPersonalWorkspace) return classes;
    if (isPersonalWorkspace) {
      return classes;
    }
    return myAssignedClasses;
  }, [isAdmin, isPersonalWorkspace, classes, myAssignedClasses]);

  const canAddClass = isAdmin || isPersonalWorkspace;
  const canEditClass = isAdmin || isPersonalWorkspace;
  const canDeleteClass = isAdmin || isPersonalWorkspace;
  const canManageKelas = isAdmin || isPersonalWorkspace;

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

  // Import Kelas Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parsedClasses, setParsedClasses] = useState<ParsedClassItem[]>([]);

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

    // 2. Tambahkan akun pengguna khusus jika di Ruang Kerja Sekolah
    if (!isPersonalWorkspace) {
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
    }

    return list;
  }, [teachers, users, classes, isPersonalWorkspace]);

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
    if (isPersonalWorkspace && isWaliKelas && classes.length >= 1) {
      showToast('Ruang Kerja Individu (Wali Kelas) dibatasi maksimal 1 rombel/kelas. Anda dapat mengedit data kelas binaan yang sudah ada.', 'warning');
      return;
    }
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

    if (!editing && isPersonalWorkspace && isWaliKelas && classes.length >= 1) {
      showToast('Ruang Kerja Individu dibatasi maksimal 1 kelas binaan.', 'error');
      return;
    }

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

    // Cari nama wali kelas dari waliCandidates
    const selectedCandidate = waliCandidates.find((w) => w.id === waliKelasId);
    const resolvedWaliName = selectedCandidate ? selectedCandidate.name : null;

    if (editing) {
      await updateClass(editing.id, {
        name: name.trim(),
        grade: grade || autoGrade,
        academicYear: schoolProfile?.tahunPelajaran || editing.academicYear,
        waliKelasId: waliKelasId || null,
        waliKelasName: resolvedWaliName || editing.waliKelasName || null,
      });
      showToast('Data rombongan belajar berhasil diperbarui', 'success');
    } else {
      await addClass({
        name: name.trim(),
        grade: grade || autoGrade,
        academicYear: schoolProfile?.tahunPelajaran || '2025/2026',
        waliKelasId: waliKelasId || null,
        waliKelasName: resolvedWaliName || null,
      });
      showToast('Rombongan belajar baru berhasil ditambahkan', 'success');
    }
    setOpen(false);
  };

  const openQuickWaliModal = (c: SchoolClass) => {
    setAssignWaliModal(c);
    setQuickWaliId(c.waliKelasId || '');
  };

  const saveQuickWali = async (e: React.FormEvent) => {
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

    const selectedCandidate = waliCandidates.find((w) => w.id === quickWaliId);
    const resolvedWaliName = selectedCandidate ? selectedCandidate.name : null;

    await updateClass(assignWaliModal.id, {
      ...assignWaliModal,
      waliKelasId: quickWaliId || null,
      waliKelasName: resolvedWaliName,
    });
    showToast(`Wali kelas untuk ${assignWaliModal.name} berhasil diperbarui`, 'success');
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

  // Download Template CSV Kelas
  const handleDownloadTemplate = () => {
    const header = 'NAMA KELAS,TINGKAT KELAS,NAMA WALI KELAS\n';
    const sampleRows = [
      'Kelas 1A,1,Budi Santoso, S.Pd.',
      'Kelas 1B,1,Siti Aminah, M.Pd.',
      'Kelas 2A,2,Rahmat Hidayat, S.Pd.',
      'Kelas 3A,3,Dewi Lestari, S.Pd.',
      'Kelas 4A,4,',
      'Kelas 5A,5,',
      'Kelas 6A,6,',
    ].join('\n');

    const csvContent = '\uFEFF' + header + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Data_Kelas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Template file CSV Kelas berhasil diunduh. Silakan isi dan unggah kembali.', 'success');
  };

  // Parser helper function for CSV / TSV text for Classes
  const parseRawTextToClasses = (text: string): ParsedClassItem[] => {
    if (!text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const results: ParsedClassItem[] = [];

    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('kelas') ||
      firstLineLower.includes('tingkat') ||
      firstLineLower.includes('grade') ||
      firstLineLower.includes('wali') ||
      firstLineLower.includes('rombel');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line) => {
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t');
      } else if (line.includes(';')) {
        tokens = line.split(';');
      } else {
        tokens = line.split(',');
      }

      tokens = tokens.map((t) => t.trim().replace(/^["']|["']$/g, ''));

      if (tokens.length >= 1 && tokens[0]) {
        const rawName = tokens[0] || '';
        const rawGrade = tokens[1] || '';
        const rawWali = tokens[2] || '';

        // Auto determine grade
        let gradeNum = 1;
        const parsedGrade = parseInt(rawGrade, 10);
        if (!isNaN(parsedGrade) && parsedGrade >= 1 && parsedGrade <= 12) {
          gradeNum = parsedGrade;
        } else {
          const matchNum = rawName.match(/\d+/);
          if (matchNum) {
            gradeNum = parseInt(matchNum[0], 10);
          }
        }

        const isValid = rawName.trim().length > 0;
        let error = undefined;
        if (!rawName.trim()) error = 'Nama kelas kosong';

        results.push({
          name: rawName.trim(),
          grade: gradeNum,
          waliKelasNameInput: rawWali.trim() || undefined,
          isValid,
          error,
        });
      }
    });

    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseRawTextToClasses(content);
      setParsedClasses(parsed);
      if (parsed.length === 0) {
        showToast('Tidak ada data kelas yang dapat dibaca dari file ini', 'error');
      } else {
        showToast(`Berhasil membaca ${parsed.length} baris data kelas dari ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const parsed = parseRawTextToClasses(text);
    setParsedClasses(parsed);
  };

  const handleExecuteImport = async () => {
    const validOnes = parsedClasses.filter((p) => p.isValid);
    if (validOnes.length === 0) {
      showToast('Tidak ada data kelas yang valid untuk diimpor', 'error');
      return;
    }

    const payload = validOnes.map((c) => ({
      name: c.name,
      grade: c.grade,
      waliKelasNameInput: c.waliKelasNameInput,
    }));

    await importClasses(payload, importMode === 'replace');
    setIsImportModalOpen(false);
    setParsedClasses([]);
    setPasteText('');
    setFileName('');
  };

  const validCount = parsedClasses.filter((p) => p.isValid).length;

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
                  <span>
                    Ruang Kerja Individu:{' '}
                    {myAssignedClasses.length > 0
                      ? `Menampilkan kelas binaan Anda (${myAssignedClasses.map((c) => c.name).join(', ')})`
                      : 'Belum ada kelas yang didaftarkan. Silakan klik Tambah Kelas untuk menginput rombel binaan Anda.'}
                  </span>
                </div>
              ) : isWaliKelas && !isAdmin && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Akses Wali Kelas (Hanya Melihat): Menampilkan Kelas Binaan Anda ({myAssignedClasses.map((c) => c.name).join(', ') || 'Belum ditugaskan'})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canAddClass && !isPersonalWorkspace && (
              <button
                onClick={() => {
                  setParsedClasses([]);
                  setPasteText('');
                  setFileName('');
                  setIsImportModalOpen(true);
                }}
                id="btn-import-kelas-modal"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Import Kelas</span>
              </button>
            )}

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
                  const matchedTeacher = teachers.find(
                    (t) => t.id === c.waliKelasId || (c.waliKelasName && t.nama.trim().toLowerCase() === c.waliKelasName.trim().toLowerCase())
                  );
                  const matchedUser = users.find(
                    (u) => u.id === c.waliKelasId || (c.waliKelasName && u.name.trim().toLowerCase() === c.waliKelasName.trim().toLowerCase())
                  );
                  const effectiveWaliName = matchedTeacher
                    ? matchedTeacher.nama
                    : matchedUser
                    ? matchedUser.name
                    : isPersonalWorkspace
                    ? currentUser?.name || 'Pendidik Mandiri'
                    : c.waliKelasName || 'Belum Ditugaskan';

                  const fase = getFaseByClassName(c.name, c.grade);
                  const faseBadgeClass = getFaseBadgeColor(fase);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              effectiveWaliName === 'Belum Ditugaskan'
                                ? 'text-slate-400 italic'
                                : 'text-slate-900'
                            }`}
                          >
                            {effectiveWaliName}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openQuickWaliModal(c)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Ganti / Tetapkan Wali Kelas"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-700 text-sm">
                            {formatClassDisplay(c.name, c.grade)}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${faseBadgeClass}`}
                          >
                            {fase}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600 bg-blue-50/20">
                        {countL}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-pink-600 bg-pink-50/20">
                        {countP}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-100 font-black">
                          {totalCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditClass && (
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Rombel"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {!canEditClass && !canDeleteClass && (
                            <button
                              type="button"
                              onClick={() => setViewingClass(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Daftar Siswa"
                            >
                              <Eye size={13} />
                              <span>Lihat Siswa</span>
                            </button>
                          )}
                          {isAdmin && totalCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setPurgeClassModal(c)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Semua Siswa di Kelas Ini"
                            >
                              <UserX size={15} />
                            </button>
                          )}
                          {canDeleteClass && (
                            <button
                              type="button"
                              onClick={() => setDeleting(c)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {searchTerm ? 'Tidak ada kelas yang cocok dengan pencarian.' : 'Belum ada data rombongan belajar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Menampilkan {startIndex + 1} s.d {Math.min(startIndex + pageSize, filteredClasses.length)} dari {filteredClasses.length} kelas
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Import Data Kelas (Ruang Kerja Sekolah) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Import Data Rombongan Belajar (Kelas)</h3>
                  <p className="text-xs text-slate-500">Unggah file CSV/Excel atau tempel teks daftar rombel kelas</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
              {/* Step 1: Download Template */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-950">Gunakan Template Standar Kelas</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Format: <strong>NAMA KELAS, TINGKAT KELAS (1-12), NAMA WALI KELAS</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              {/* Step 2: Tab Selector (Upload File vs Tempel Teks) */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Metode Input Data Kelas
                </label>
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImportTab('upload')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                      importTab === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud size={14} />
                    <span>Unggah File (.csv / .txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportTab('paste')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                      importTab === 'paste' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText size={14} />
                    <span>Tempel Data (Salin dari Excel)</span>
                  </button>
                </div>
              </div>

              {/* Upload File Body */}
              {importTab === 'upload' ? (
                <div>
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-all">
                    <UploadCloud size={28} className="text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-700">
                      {fileName ? `File terpilih: ${fileName}` : 'Klik untuk memilih file CSV / TXT'}
                    </span>
                    <span className="text-[11px] text-slate-400">Mendukung format file dengan pemisah koma, titik koma, atau tab</span>
                    <input
                      type="file"
                      accept=".csv, .txt, text/csv, text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={4}
                    value={pasteText}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    placeholder="Tempel data kelas dari spreadsheet Excel di sini...&#10;Contoh:&#10;Kelas 1A&#9;1&#9;Budi Santoso, S.Pd.&#10;Kelas 1B&#9;1&#9;Siti Aminah, M.Pd.&#10;Kelas 2A&#9;2&#9;Rahmat Hidayat, S.Pd."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              )}

              {/* Data Preview Table */}
              {parsedClasses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Pratinjau Data ({parsedClasses.length} Kelas Terdeteksi)
                    </label>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {validCount} Kelas Valid
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="p-2 w-8">#</th>
                          <th className="p-2">Nama Kelas</th>
                          <th className="p-2 text-center w-20">Tingkat</th>
                          <th className="p-2">Calon Wali Kelas</th>
                          <th className="p-2 text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedClasses.map((item, i) => (
                          <tr key={i} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                            <td className="p-2 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                            <td className="p-2 font-bold text-slate-800">{item.name}</td>
                            <td className="p-2 text-center font-bold text-blue-700">Tingkat {item.grade}</td>
                            <td className="p-2 text-slate-600 font-medium">
                              {item.waliKelasNameInput || <span className="text-slate-400 italic">Belum ditentukan</span>}
                            </td>
                            <td className="p-2 text-center">
                              {item.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Check size={10} /> Valid
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  {item.error || 'Error'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Import Mode Option */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Opsi Penempatan Data Kelas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="classImportMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Tambahkan ke Data Kelas Saat Ini
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menyisipkan rombel baru tanpa menghapus daftar kelas yang sudah ada.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="classImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Gantikan Seluruh Data Kelas
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menghapus data kelas lama dan mengisi dengan daftar rombel yang baru diimpor.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                {validCount > 0 ? `${validCount} kelas siap diproses` : 'Pilih file/tempel data untuk mulai'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={validCount === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Proses Import ({validCount} Kelas)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Single Class */}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editing ? 'Edit Rombongan Belajar' : 'Tambah Rombel Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Rombel / Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 1A, Kelas 6B, dll."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    const matchNumber = e.target.value.match(/\d+/);
                    if (matchNumber) {
                      setGrade(parseInt(matchNumber[0], 10));
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {!isPersonalWorkspace && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wali Kelas Penanggung Jawab</label>
                  <select
                    value={waliKelasId}
                    onChange={(e) => setWaliKelasId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="">-- Belum Ditugaskan --</option>
                    {waliCandidates.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role}) {w.assignedClassName ? `• Saat ini di ${w.assignedClassName}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Daftar wali kelas diambil dari data Pendidik (Data Guru) & Akun Terdaftar.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Assign Wali Kelas */}
      {assignWaliModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Tetapkan Wali Kelas untuk {assignWaliModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setAssignWaliModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveQuickWali} className="space-y-4 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Pendidik (Wali Kelas)</label>
                <select
                  value={quickWaliId}
                  onChange={(e) => setQuickWaliId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                >
                  <option value="">-- Kosongkan / Lepas Penugasan --</option>
                  {waliCandidates.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role}) {w.assignedClassName ? `• Saat ini di ${w.assignedClassName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                Guru yang dipilih akan secara otomatis terhubung dengan cetak laporan, rekap kehadiran, dan administrasi kelas <strong>{assignWaliModal.name}</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignWaliModal(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Students in Class */}
      {viewingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Daftar Siswa {viewingClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wali Kelas: {viewingClass.waliKelasName || 'Belum Ditugaskan'} • Tahun Pelajaran {viewingClass.academicYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
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
