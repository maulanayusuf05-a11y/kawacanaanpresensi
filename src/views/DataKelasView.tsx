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
  AlertCircle,
  BookOpen,
  Layers,
  BookmarkCheck,
  Sparkles
} from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';
import { getFaseByClassName, getFaseByGrade, getFaseBadgeColor, getGradeFromClassName, formatClassDisplay } from '../utils/faseKurikulum';
import { BookLoadingModal } from '../components/BookLoader';
import { normalizeTeacherName, normalizeNip } from '../utils/userScope';

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
    assignTeacherClasses,
    showToast,
    activeWorkspace,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isWaliKelas = currentUser?.role === 'WALI KELAS';
  const isGuru = currentUser?.role === 'GURU MAPEL';
  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    currentUser?.subscriptionPlan === 'mulai' ||
    currentUser?.subscriptionPlan === 'free' ||
    currentUser?.subscriptionPlan === 'guru' ||
    currentUser?.subscriptionPlan === 'teacher' ||
    !currentUser?.schoolId;

  // Active Tab: Rombel & Wali Kelas VS Penugasan Guru Mapel
  const [activeTab, setActiveTab] = useState<'rombel' | 'penugasan_mapel'>('rombel');

  // Daftar kelas binaan pengguna (untuk Wali Kelas) / kelas yang diajar (untuk Guru Mapel)
  const myAssignedClasses = useMemo(() => {
    if (isAdmin && !isPersonalWorkspace) return classes;
    const ids = new Set<string>();

    const cleanUserName = normalizeTeacherName(currentUser?.name);
    const userNip = normalizeNip(currentUser?.nip) || (/^\d{8,}$/.test(currentUser?.username || '') ? normalizeNip(currentUser?.username) : '');
    const matchedTeacher = (teachers || []).find((t) => {
      if (currentUser?.teacherId && t.id === currentUser.teacherId) return true;
      if (userNip && normalizeNip(t.nip) === userNip) return true;
      if (cleanUserName && normalizeTeacherName(t.nama) === cleanUserName) return true;
      return false;
    });
    const effectiveTeacherId = currentUser?.teacherId || matchedTeacher?.id || null;
    const cleanTeacherName = matchedTeacher?.nama ? normalizeTeacherName(matchedTeacher.nama) : '';

    if (isWaliKelas) {
      if (currentUser?.assignedClassIds && Array.isArray(currentUser.assignedClassIds)) {
        currentUser.assignedClassIds.forEach((id) => ids.add(id));
      }
      if (currentUser?.classIds && Array.isArray(currentUser.classIds)) {
        currentUser.classIds.forEach((id) => ids.add(id));
      }
      classes.forEach((c) => {
        if (effectiveTeacherId && c.waliKelasTeacherId === effectiveTeacherId) {
          ids.add(c.id);
        }
        if (c.waliKelasName) {
          const cleanWaliName = normalizeTeacherName(c.waliKelasName);
          if (cleanUserName && cleanWaliName === cleanUserName) ids.add(c.id);
          if (cleanTeacherName && cleanWaliName === cleanTeacherName) ids.add(c.id);
        }
      });
      // Fallback matching against schoolProfile
      if (ids.size === 0 && schoolProfile?.kelas) {
        const cleanSpKelas = normalizeTeacherName(schoolProfile.kelas);
        const spClass = classes.find((c) => normalizeTeacherName(c.name) === cleanSpKelas);
        if (spClass) ids.add(spClass.id);
      }
    } else if (isGuru) {
      // Guru Mapel: kelas yang diajar bersumber dari data assignment mata pelajaran (subjects)
      subjects.forEach((s) => {
        const cleanSubTeacher = s.teacherName ? normalizeTeacherName(s.teacherName) : '';
        const isTeacherMatch =
          (effectiveTeacherId && s.teacherId === effectiveTeacherId) ||
          (currentUser?.subjectId && s.id === currentUser.subjectId) ||
          (cleanSubTeacher && cleanUserName && (cleanSubTeacher === cleanUserName || cleanSubTeacher.includes(cleanUserName))) ||
          (cleanSubTeacher && cleanTeacherName && (cleanSubTeacher === cleanTeacherName || cleanSubTeacher.includes(cleanTeacherName)));

        if (isTeacherMatch) {
          (s.targetClassIds || []).forEach((cid) => ids.add(cid));
          if (s.targetClassNames && s.targetClassNames.length > 0) {
            classes.forEach((c) => {
              if (s.targetClassNames?.some((cn) => cn.trim().toLowerCase() === c.name.trim().toLowerCase())) {
                ids.add(c.id);
              }
            });
          }
        }
      });
      if (currentUser?.classIds && Array.isArray(currentUser.classIds)) {
        currentUser.classIds.forEach((id) => ids.add(id));
      }
      if (currentUser?.assignedClassIds && Array.isArray(currentUser.assignedClassIds)) {
        currentUser.assignedClassIds.forEach((id) => ids.add(id));
      }
    }

    if (activeWorkspace?.classId) {
      ids.add(activeWorkspace.classId);
    }
    const matched = classes.filter((c) => ids.has(c.id));
    // Fail closed: di workspace sekolah, jika belum ada kelas terhubung, tidak menampilkan kelas lain
    if (matched.length === 0) return isPersonalWorkspace ? classes : [];
    return matched;
  }, [isAdmin, isPersonalWorkspace, classes, currentUser, activeWorkspace, isWaliKelas, isGuru, subjects, teachers, schoolProfile]);

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
  const [waliKelasTeacherId, setWaliKelasTeacherId] = useState('');
  const [editingClassMapelIds, setEditingClassMapelIds] = useState<string[]>([]);

  // Quick Wali Kelas Assignment Modal
  const [assignWaliModal, setAssignWaliModal] = useState<SchoolClass | null>(null);
  const [quickWaliId, setQuickWaliId] = useState('');

  // Guru Mapel Matrix state
  const [savingMapelTeacherId, setSavingMapelTeacherId] = useState<string | null>(null);
  const [mapelCardAssignments, setMapelCardAssignments] = useState<Record<string, string[]>>({});

  // Delete Class Modal
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

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
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusMessage, setImportStatusMessage] = useState('');

  // Daftar Guru Mapel bersumber dari data assignment mata pelajaran (subjects)
  const activeAcademicYear = schoolProfile?.tahunPelajaran || '2026/2027';

  // Guru Mapel ditentukan dari assignment mata pelajaran aktif, bukan profiles.role.
  const guruMapelTeacherIds = useMemo(() => {
    return new Set(
      subjects
        .filter((s) => !!s.teacherId)
        .map((s) => s.teacherId as string),
    );
  }, [subjects]);

  // Guru yang sudah menjadi Wali Kelas pada tahun ajaran aktif tidak boleh
  // dipilih sebagai Guru Mapel.
  const waliTeacherIds = useMemo(() => {
    return new Set(
      classes
        .filter((c) => !c.academicYear || c.academicYear === activeAcademicYear)
        .map((c) => c.waliKelasTeacherId)
        .filter(Boolean) as string[],
    );
  }, [classes, activeAcademicYear]);

  const guruMapelList = useMemo(() => {
    return teachers.filter(
      (t) => guruMapelTeacherIds.has(t.id) && !waliTeacherIds.has(t.id),
    );
  }, [teachers, guruMapelTeacherIds, waliTeacherIds]);

  // Calon wali kelas bersumber dari master Data Guru (teachers) dengan Tugas Utama: Wali Kelas
  const waliCandidates = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      nip: string;
      role: string;
      assignedClassId: string | null;
      assignedClassName: string | null;
      isWaliRole: boolean;
    }> = [];

    teachers.forEach((t) => {
      const teacherName = (t.nama || '').trim();
      const teacherNip = (t.nip || '').trim();
      const normTugas = (t.tugasUtama || t.tugas_utama || '').trim().toLowerCase();

      const isWaliTugasUtama =
        normTugas === 'wali kelas' ||
        normTugas === 'walikelas' ||
        (normTugas.includes('wali') && !normTugas.includes('mapel'));

      // Assignment Guru Mapel aktif adalah konflik yang harus mengalahkan
      // Tugas Utama Wali Kelas. Guru Mapel tidak boleh dipilih sebagai Wali Kelas.
      const isActiveMapelAssignment = guruMapelTeacherIds.has(t.id) || normTugas === 'guru mapel' || normTugas.includes('mapel');

      const assignedClass = classes.find((c) => {
        if (c.waliKelasTeacherId === t.id) return true;
        if (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === teacherName.toLowerCase()) return true;
        return false;
      });

      const isAssignedWali = !isActiveMapelAssignment && (isWaliTugasUtama || !!assignedClass);

      list.push({
        id: t.id,
        name: teacherName || 'Tanpa Nama',
        nip: teacherNip,
        role: isAssignedWali ? 'Wali Kelas' : 'Guru',
        assignedClassId: assignedClass?.id || null,
        assignedClassName: assignedClass?.name || null,
        isWaliRole: isAssignedWali,
      });
    });

    // Hanya guru yang tugas utamanya Wali Kelas yang ditampilkan.
    const sourceList = list.filter((item) => item.isWaliRole);

    sourceList.sort((a, b) => a.name.localeCompare(b.name));
    return sourceList;
  }, [teachers, classes, guruMapelTeacherIds]);

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
    setWaliKelasTeacherId('');
    setEditingClassMapelIds([]);
    setOpen(true);
  };

  const openEdit = (c: SchoolClass) => {
    setEditing(c);
    setName(c.name);
    setGrade(c.grade);
    setWaliKelasTeacherId(c.waliKelasTeacherId || '');
    
    // Guru Mapel yang saat ini ditugaskan mengajar kelas ini
    const assignedTeachers = subjects
      .filter((s) => s.targetClassIds && s.targetClassIds.includes(c.id) && s.teacherId)
      .map((s) => s.teacherId as string);
    setEditingClassMapelIds(assignedTeachers);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Nama kelas wajib diisi', 'error');

    if (!editing && isPersonalWorkspace && isWaliKelas && classes.length >= 1) {
      showToast('Ruang Kerja Individu dibatasi maksimal 1 kelas binaan.', 'error');
      return;
    }

    // Ekstrak angka kelas otomatis dari teks nama kelas (contoh: "Kelas 1A" -> 1, "2B" -> 2)
    const matchNumber = name.match(/\d+/);
    const autoGrade = matchNumber ? parseInt(matchNumber[0], 10) : 1;

    const selectedWali = waliCandidates.find((w) => w.id === waliKelasTeacherId);
    const resolvedWaliName = selectedWali ? selectedWali.name : null;

    if (waliKelasTeacherId && guruMapelTeacherIds.has(waliKelasTeacherId)) {
      showToast(
        'Guru tersebut sudah memiliki assignment Guru Mapel pada tahun ajaran aktif dan tidak dapat menjadi Wali Kelas.',
        'error',
      );
      return;
    }

    if (editing) {
      await updateClass(editing.id, {
        name: name.trim(),
        grade: grade || autoGrade,
        academicYear: schoolProfile?.tahunPelajaran || editing.academicYear,
        waliKelasTeacherId: waliKelasTeacherId || null,
        waliKelasName: resolvedWaliName,
      });
      showToast('Data rombongan belajar berhasil diperbarui', 'success');
    } else {
      await addClass({
        name: name.trim(),
        grade: grade || autoGrade,
        academicYear: schoolProfile?.tahunPelajaran || '2026/2027',
        waliKelasTeacherId: waliKelasTeacherId || null,
        waliKelasName: resolvedWaliName,
      });
      showToast('Rombongan belajar baru berhasil ditambahkan', 'success');
    }

    setOpen(false);
  };

  const openQuickWaliModal = (c: SchoolClass) => {
    setAssignWaliModal(c);
    setQuickWaliId(c.waliKelasTeacherId || '');
  };

  const saveQuickWali = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignWaliModal) return;

    if (quickWaliId && guruMapelTeacherIds.has(quickWaliId)) {
      showToast(
        'Guru tersebut sudah memiliki assignment Guru Mapel pada tahun ajaran aktif dan tidak dapat menjadi Wali Kelas.',
        'error',
      );
      return;
    }

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
      waliKelasTeacherId: quickWaliId || null,
      waliKelasName: resolvedWaliName,
    });
    showToast(`Wali kelas untuk ${assignWaliModal.name} berhasil diperbarui`, 'success');
    setAssignWaliModal(null);
  };

  // Save assignments for a specific Guru Mapel card in Tab 2
  const handleSaveMapelCard = async (teacherId: string) => {
    const selectedClassIds = mapelCardAssignments[teacherId] !== undefined
      ? mapelCardAssignments[teacherId]
      : (subjects.find((s) => s.teacherId === teacherId)?.targetClassIds || []);

    setSavingMapelTeacherId(teacherId);
    try {
      await assignTeacherClasses(teacherId, selectedClassIds);
      const teacherObj = teachers.find((t) => t.id === teacherId);
      showToast(`Penugasan kelas untuk ${teacherObj?.nama || 'Guru Mapel'} berhasil disimpan`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan penugasan kelas guru mapel', 'error');
    } finally {
      setSavingMapelTeacherId(null);
    }
  };

  const removeClass = async () => {
    if (!deleting || isDeletingClass) return;
    setIsDeletingClass(true);
    try {
      await deleteClass(deleting.id);
      setDeleting(null);
    } catch {
      // Error handled with toast in deleteClass
    } finally {
      setIsDeletingClass(false);
    }
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

  // Download Template CSV Kelas (Format: NAMA KELAS, NAMA WALI KELAS)
  const handleDownloadTemplate = () => {
    const header = 'NAMA KELAS,NAMA WALI KELAS\n';
    const sampleRows = [
      'Kelas 1A,Budi Santoso, S.Pd.',
      'Kelas 1B,Siti Aminah, M.Pd.',
      'Kelas 2A,Rahmat Hidayat, S.Pd.',
      'Kelas 3A,Dewi Lestari, S.Pd.',
      'Kelas 4A,',
      'Kelas 5A,',
      'Kelas 6A,',
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
    showToast('Template file CSV Kelas berhasil diunduh (Format: Nama Kelas, Nama Wali Kelas).', 'success');
  };

  // Parser helper function for CSV / TSV text for Classes (Format: Nama Kelas, Nama Wali Kelas)
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
        let rawWali = '';
        let gradeNum = 1;

        // Jika user menginput 3 kolom (format legacy: Nama Kelas, Tingkat, Nama Wali)
        if (tokens.length >= 3 && !isNaN(parseInt(tokens[1], 10))) {
          gradeNum = parseInt(tokens[1], 10);
          rawWali = tokens[2] || '';
        } else {
          // Format standar: 2 Kolom (Nama Kelas, Nama Wali Kelas)
          rawWali = tokens[1] || '';
          const matchNum = rawName.match(/\d+/);
          if (matchNum) {
            gradeNum = parseInt(matchNum[0], 10);
          }
        }

        if (gradeNum < 1 || gradeNum > 12) {
          const matchNum = rawName.match(/\d+/);
          gradeNum = matchNum ? parseInt(matchNum[0], 10) : 1;
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

    setIsImporting(true);
    setImportProgress(20);
    setImportStatusMessage(`Membaca dan memvalidasi ${validOnes.length} baris data rombongan belajar...`);

    try {
      await new Promise((res) => setTimeout(res, 300));
      setImportProgress(55);
      setImportStatusMessage('Menyusun rombel kelas, menentukan tingkat fase, dan memetakan wali kelas...');

      const payload = validOnes.map((c) => ({
        name: c.name,
        grade: c.grade,
        waliKelasNameInput: c.waliKelasNameInput,
      }));

      await importClasses(payload, importMode === 'replace');

      setImportProgress(100);
      setImportStatusMessage('Selesai! Seluruh data rombongan belajar berhasil diimpor.');
      await new Promise((res) => setTimeout(res, 300));

      setIsImportModalOpen(false);
      setParsedClasses([]);
      setPasteText('');
      setFileName('');
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses import data kelas', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportStatusMessage('');
    }
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
                {isPersonalWorkspace ? 'Data Kelas Binaan Saya' : 'Data Rombongan Belajar & Penugasan Kelas'}
              </h2>
              <p className="text-xs text-slate-500">
                {isPersonalWorkspace
                  ? 'Data rombongan belajar Anda di Ruang Kerja Individu. Anda dapat melihat dan mengelola siswa kelas ini.'
                  : 'Kelola data rombel kelas, penetapan wali kelas, dan penugasan guru mata pelajaran terintegrasi.'}
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
              ) : !isAdmin && (isWaliKelas || isGuru) ? (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-indigo-600" />
                  <span>
                    Ruang Kerja Sekolah:{' '}
                    {accessibleClasses.length > 0
                      ? isWaliKelas
                        ? `Menampilkan kelas yang Anda bina (${accessibleClasses.map((c) => c.name).join(', ')})`
                        : `Menampilkan kelas yang Anda ajar (${accessibleClasses.map((c) => c.name).join(', ')})`
                      : isWaliKelas
                      ? 'Belum ada kelas binaan yang ditugaskan kepada Anda.'
                      : 'Belum ada kelas ajar yang ditugaskan kepada Anda.'}
                  </span>
                </div>
              ) : null}
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

        {/* Navigation Tabs (School Admin Only) */}
        {!isPersonalWorkspace && isAdmin && (
          <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('rombel')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'rombel'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers size={15} />
              <span>Daftar Rombel & Wali Kelas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                {classes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('penugasan_mapel')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'penugasan_mapel'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BookOpen size={15} />
              <span>Penugasan Guru Mapel</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                {guruMapelList.length}
              </span>
            </button>
          </div>
        )}

        {/* TAB 1: DAFTAR ROMBEL & WALI KELAS */}
        {activeTab === 'rombel' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
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
                    <th className="py-3.5 px-4 font-black">Kelas & Fase</th>
                    <th className="py-3.5 px-4 text-center text-blue-700">Jml L</th>
                    <th className="py-3.5 px-4 text-center text-pink-700">Jml P</th>
                    <th className="py-3.5 px-4 text-center text-slate-800">Total Siswa</th>
                    <th className="py-3.5 px-4 text-center w-32">Aksi</th>
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
                        (t) => t.id === c.waliKelasTeacherId || (c.waliKelasName && t.nama.trim().toLowerCase() === c.waliKelasName.trim().toLowerCase())
                      );
                      const effectiveWaliName = matchedTeacher
                        ? matchedTeacher.nama
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
        )}

        {/* TAB 2: MATRIKS & PENUGASAN GURU MAPEL */}
        {activeTab === 'penugasan_mapel' && !isPersonalWorkspace && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-indigo-600/20">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Penugasan Rombongan Belajar Guru Mata Pelajaran
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Hanya menampilkan guru yang tugas utamanya Guru Mapel beserta daftar kelas yang sudah diajarkannya.
                  </p>
                </div>
              </div>
              <div className="text-xs font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs shrink-0">
                Total {guruMapelList.length} Guru Mapel Terdaftar
              </div>
            </div>

            {guruMapelList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guruMapelList.map((teacher) => {
                  const teacherSubject = subjects.find((s) => s.teacherId === teacher.id);
                  const currentAssigned = mapelCardAssignments[teacher.id] !== undefined
                    ? mapelCardAssignments[teacher.id]
                    : (teacherSubject?.targetClassIds || []);

                  const isSaving = savingMapelTeacherId === teacher.id;

                  return (
                    <div
                      key={teacher.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all"
                    >
                      <div className="space-y-3.5">
                        {/* Header Guru */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-black text-sm">
                              {teacher.nama?.charAt(0) || 'G'}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm leading-tight">
                                {teacher.nama}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                NIP: {teacher.nip || '-'} • Mapel: <span className="font-bold text-indigo-600">{teacher.mataPelajaran || teacherSubject?.name || 'Mata Pelajaran'}</span>
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-black shrink-0">
                            {currentAssigned.length} Kelas Diajar
                          </span>
                        </div>

                        {/* Kelas yang Sudah Diajarkan */}
                        <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            Kelas yang Sudah Diajarkan:
                          </span>
                          {currentAssigned.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {currentAssigned.map((cid) => {
                                const cObj = classes.find((c) => c.id === cid);
                                return (
                                  <span
                                    key={cid}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[11px]"
                                  >
                                    <Check size={11} className="text-indigo-600" />
                                    {cObj ? cObj.name : 'Kelas'}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Belum ada rombel kelas yang diajarkan oleh guru ini.
                            </p>
                          )}
                        </div>

                        {/* Checklist Pilihan Kelas */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">Pilih / Ubah Kelas yang Diampu:</span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setMapelCardAssignments((prev) => ({
                                    ...prev,
                                    [teacher.id]: classes.map((c) => c.id),
                                  }));
                                }}
                                className="font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                Pilih Semua
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMapelCardAssignments((prev) => ({
                                    ...prev,
                                    [teacher.id]: [],
                                  }));
                                }}
                                className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                Kosongkan
                              </button>
                            </div>
                          </div>

                          {classes.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                              {classes.map((cls) => {
                                const isChecked = currentAssigned.includes(cls.id);
                                return (
                                  <label
                                    key={cls.id}
                                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-xs'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newClassIds = e.target.checked
                                          ? [...currentAssigned, cls.id]
                                          : currentAssigned.filter((id) => id !== cls.id);
                                        setMapelCardAssignments((prev) => ({
                                          ...prev,
                                          [teacher.id]: newClassIds,
                                        }));
                                      }}
                                      className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="truncate">{cls.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2">
                              Belum ada rombel kelas yang dibuat di Data Kelas. Silakan tambahkan kelas terlebih dahulu.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tombol Simpan Per Kartu */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveMapelCard(teacher.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          <Check size={14} />
                          <span>{isSaving ? 'Menyimpan...' : 'Simpan Penugasan'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <BookOpen size={24} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Guru Mata Pelajaran Terdaftar</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Silakan buka menu <strong>Data Referensi &gt; Data Guru</strong> dan tambahkan guru dengan tugas utama Guru Mapel beserta mata pelajarannya.
                </p>
              </div>
            )}
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
                  <p className="text-xs text-slate-500">Format: Nama Kelas, Nama Wali Kelas</p>
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
                    Format: <strong>NAMA KELAS, NAMA WALI KELAS</strong> (Tingkat kelas otomatis ditentukan dari nama kelas)
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
                    <span className="text-[11px] text-slate-400">Format: Nama Kelas, Nama Wali Kelas (Pemisah koma, titik koma, atau tab)</span>
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
                    placeholder="Tempel data kelas dari spreadsheet Excel di sini...&#10;Contoh:&#10;Kelas 1A&#9;Budi Santoso, S.Pd.&#10;Kelas 1B&#9;Siti Aminah, M.Pd.&#10;Kelas 2A&#9;Rahmat Hidayat, S.Pd."
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
                          <th className="p-2">Nama Wali Kelas</th>
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
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

            <form onSubmit={save} className="space-y-4 pt-3 text-xs overflow-y-auto flex-1 pr-1">
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
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Wali Kelas
                    <span className="text-[11px] font-normal text-slate-400 ml-1.5">(Guru dengan Tugas Utama: Wali Kelas)</span>
                  </label>
                  <select
                    value={waliKelasTeacherId}
                    onChange={(e) => setWaliKelasTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="">-- Belum Ditentukan / Kosongkan --</option>
                    {waliCandidates.map((w) => {
                      const isAssignedToOther =
                        w.assignedClassName && (!editing || w.assignedClassId !== editing.id);
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.nip && w.nip !== '-' ? `(NIP: ${w.nip})` : ''} {isAssignedToOther ? `[Sudah di ${w.assignedClassName}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hanya guru dengan <strong>Tugas Utama: Wali Kelas</strong> yang tidak memiliki assignment Guru Mapel aktif yang dapat dipilih.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
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
                      {w.isWaliRole ? '⭐ ' : ''}{w.name} ({w.role}) {w.assignedClassName ? `• Saat ini di ${w.assignedClassName}` : ''}
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
              Hapus kelas?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Kelas beserta seluruh data yang terkait, termasuk siswa, riwayat absensi, dan assignment, akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                disabled={isDeletingClass}
                onClick={() => setDeleting(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingClass}
                onClick={() => void removeClass()}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingClass ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Book Loading Modal for Import Kelas */}
      <BookLoadingModal
        isOpen={isImporting}
        title="Mengimpor Data Kelas & Rombel..."
        subtitle="Sistem sedang memproses rombongan belajar, tingkat kurikulum, dan wali kelas."
        badgeText="PROSES IMPORT DATA KELAS"
        progress={importProgress}
        statusMessage={importStatusMessage}
      />
    </div>
  );
};
