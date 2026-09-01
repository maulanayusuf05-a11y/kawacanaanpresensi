import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { getFaseByClassName, getFaseBadgeColor, formatClassDisplay } from '../utils/faseKurikulum';
import { BookLoadingModal, BookVisual } from '../components/BookLoader';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  ClipboardPaste,
  Filter,
} from 'lucide-react';

interface ParsedStudentItem {
  nama: string;
  gender: 'L' | 'P';
  nisn: string;
  classNameInput?: string;
  matchedClassId?: string | null;
  matchedClassName?: string;
  isValid: boolean;
  error?: string;
}

export const DataSiswaView: React.FC = () => {
  const {
    currentUser,
    classes,
    students,
    schoolProfile,
    addClass,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    showToast,
    activeWorkspace,
  } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Deteksi ruang kerja individu dan paket mulai/gratis/guru
  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    currentUser?.subscriptionPlan === 'mulai' ||
    currentUser?.subscriptionPlan === 'free' ||
    currentUser?.subscriptionPlan === 'guru' ||
    currentUser?.subscriptionPlan === 'teacher' ||
    !currentUser?.schoolId;

  const isWaliKelas = currentUser?.role === 'WALI KELAS';
  const isGuru = currentUser?.role === 'GURU MAPEL';
  const isKepalaSekolah = currentUser?.role === 'KEPALA SEKOLAH';

  // Kelas yang diampu oleh Wali Kelas / Guru
  const myAssignedClasses = useMemo(() => {
    if (isAdmin || isPersonalWorkspace) return classes;
    const ids = new Set<string>();
    if (currentUser?.classIds && currentUser.classIds.length > 0) {
      currentUser.classIds.forEach((id) => ids.add(id));
    }
    classes.forEach((c) => {
      if (c.waliKelasTeacherId && (c.waliKelasTeacherId === currentUser?.teacherId)) {
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
    if (matched.length === 0 && (isWaliKelas || isGuru)) {
      return classes;
    }
    return matched;
  }, [isAdmin, isPersonalWorkspace, classes, currentUser, activeWorkspace, isWaliKelas, isGuru]);

  const accessibleClassIds = useMemo(() => {
    return new Set(myAssignedClasses.map((c) => c.id));
  }, [myAssignedClasses]);

  // Data siswa yang diizinkan untuk diakses (hanya kelas binaannya sendiri bagi Wali Kelas)
  const accessibleStudents = useMemo(() => {
    if (isAdmin || isPersonalWorkspace) return students;
    if (isWaliKelas || isGuru) {
      if (myAssignedClasses.length > 0 && myAssignedClasses.length < classes.length) {
        return students.filter((s) => s.classId && accessibleClassIds.has(s.classId));
      }
    }
    return students;
  }, [isAdmin, isPersonalWorkspace, isWaliKelas, isGuru, students, myAssignedClasses, accessibleClassIds, classes.length]);

  // Akses aksi data siswa (tambah/edit/hapus/import) & kolom AKSI hanya muncul untuk Role Admin Sekolah / Admin Individu
  // Tidak muncul untuk role Kepala Sekolah, Wali Kelas, dan Guru Mapel
  const isRestrictedRole = isWaliKelas || isGuru || isKepalaSekolah;
  const showAksiColumn = isAdmin || (isPersonalWorkspace && !isRestrictedRole);
  const canInputStudents = showAksiColumn;

  // Kuota siswa pada paket mulai / gratis
  const maxStudentsLimit = currentUser?.maxStudents || (isPersonalWorkspace ? 32 : undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<{ nisn: string; nama: string; gender: 'L' | 'P'; classId: string }>({
    nisn: '',
    nama: '',
    gender: 'L',
    classId: myAssignedClasses[0]?.id || classes[0]?.id || '',
  });

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Import Modal States
  const [selectedImportClassId, setSelectedImportClassId] = useState(myAssignedClasses[0]?.id || classes[0]?.id || '');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progressive Book Loading for Student Import
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusMessage, setImportStatusMessage] = useState('');

  // Available classes: integrated from onboarding registration / workspace classes
  const availableClasses = useMemo(() => {
    if (myAssignedClasses && myAssignedClasses.length > 0) {
      return myAssignedClasses;
    }
    return classes || [];
  }, [myAssignedClasses, classes]);

  // Filter and sort students (otomatis urut alfabetis A - Z)
  const filteredStudents = useMemo(() => {
    return accessibleStudents
      .filter((s) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = s.nama.toLowerCase().includes(q) || s.nisn.includes(q);
        if (!matchesSearch) return false;

        if (selectedClassFilter !== 'ALL') {
          const selCls = availableClasses.find((c) => c.id === selectedClassFilter);
          const matchesClass =
            s.classId === selectedClassFilter ||
            (selCls && s.className && s.className.toLowerCase() === selCls.name.toLowerCase());
          if (!matchesClass) return false;
        }

        return true;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [accessibleStudents, searchTerm, selectedClassFilter, availableClasses]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  const openAddModal = () => {
    if (maxStudentsLimit && students.length >= maxStudentsLimit) {
      showToast(`Batas kuota siswa untuk paket Anda (${maxStudentsLimit} siswa) telah tercapai.`, 'error');
      return;
    }
    setEditingStudent(null);
    setFormData({ nisn: '', nama: '', gender: 'L', classId: availableClasses[0]?.id || '' });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nisn: student.nisn,
      nama: student.nama,
      gender: student.gender,
      classId: student.classId || availableClasses[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn.trim() || !formData.nama.trim()) return;

    const selectedCls = availableClasses.find((c) => c.id === formData.classId) || availableClasses[0];
    const targetClassId = selectedCls && selectedCls.id !== 'onboarding-class-default' ? selectedCls.id : null;

    if (editingStudent) {
      await updateStudent(editingStudent.id, {
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim().toUpperCase(),
        gender: formData.gender,
        classId: targetClassId,
      });
    } else {
      if (maxStudentsLimit && students.length >= maxStudentsLimit) {
        showToast(`Batas kuota siswa untuk paket Anda (${maxStudentsLimit} siswa) telah tercapai.`, 'error');
        return;
      }
      await addStudent({
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim().toUpperCase(),
        gender: formData.gender,
        classId: targetClassId,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (isDeletingStudent) return;
    setIsDeletingStudent(true);
    try {
      await deleteStudent(id);
      setDeletingId(null);
    } catch {
      // Error is handled with toast in deleteStudent
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const findMatchingClass = (rawClass: string, classList: Array<{ id: string; name: string }>) => {
    if (!rawClass || !rawClass.trim()) return undefined;
    const clean = rawClass.trim().toLowerCase();
    // 1. Exact match
    const exact = classList.find((c) => c.name.trim().toLowerCase() === clean);
    if (exact) return exact;

    // 2. Normalized match (e.g. "1A" matching "Kelas 1A" or "1 A")
    const normClean = clean.replace(/^(kelas|tingkat|rombel)\s*/i, '').replace(/\s+/g, '');
    const match = classList.find((c) => {
      const cNorm = c.name.toLowerCase().replace(/^(kelas|tingkat|rombel)\s*/i, '').replace(/\s+/g, '');
      return cNorm === normClean;
    });
    if (match) return match;

    // 3. Substring match
    return classList.find((c) => c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase()));
  };

  // Download Template CSV (Standardized for Excel with UTF-8 BOM)
  // Format: NAMA LENGKAP, L/P, NISN, KELAS
  const handleDownloadTemplate = () => {
    const header = 'NAMA LENGKAP,L/P,NISN,KELAS\n';
    const sampleRows = [
      'ADLAN AR RASHAFI SUBHAN,L,3140787024,Kelas 1A',
      'AINUN FAJARIAH,P,3141380962,Kelas 1A',
      'AISYAH AZ ZAHRA,P,3149811568,Kelas 1B',
      'ALBY FAKHRI ARSYAD,L,3145450700,Kelas 2A',
      'AQILA SHAFA MAHYA,P,3148157704,Kelas 2B',
      'BAGAS SATRIA PRATAMA,L,3146473211,Kelas 3A',
      'CITRA LESTARI DEWI,P,3149021145,Kelas 3B',
    ].join('\n');

    const csvContent = '\uFEFF' + header + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Data_Siswa_Kelas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Template file CSV berhasil diunduh. Silakan isi dan unggah kembali.', 'success');
  };

  // Parser helper function for CSV / TSV text
  // Urutan kolom utama: NAMA LENGKAP, L/P, NISN, KELAS
  const parseRawTextToStudents = (text: string): ParsedStudentItem[] => {
    if (!text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const results: ParsedStudentItem[] = [];

    // Helper token split
    const splitTokens = (lineStr: string): string[] => {
      let t: string[] = [];
      if (lineStr.includes('\t')) {
        t = lineStr.split('\t');
      } else if (lineStr.includes(';')) {
        t = lineStr.split(';');
      } else {
        t = lineStr.split(',');
      }
      return t.map((x) => x.trim().replace(/^["']|["']$/g, ''));
    };

    // Detect if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('nisn') ||
      firstLineLower.includes('nama') ||
      firstLineLower.includes('siswa') ||
      firstLineLower.includes('jenis') ||
      firstLineLower.includes('gender') ||
      firstLineLower.includes('l/p') ||
      firstLineLower.includes('kelas') ||
      firstLineLower.includes('rombel');

    let nameCol = 0;
    let genderCol = 1;
    let nisnCol = 2;
    let classCol = 3;

    if (hasHeader) {
      const headerTokens = splitTokens(lines[0]).map((t) => t.toLowerCase());
      headerTokens.forEach((tok, idx) => {
        if (tok.includes('nama') || tok.includes('name') || tok.includes('siswa')) nameCol = idx;
        else if (
          tok.includes('l/p') ||
          tok.includes('lp') ||
          tok.includes('jenis') ||
          tok.includes('gender') ||
          tok.includes('kelamin') ||
          tok.includes('jk')
        )
          genderCol = idx;
        else if (tok.includes('nisn') || tok.includes('nis') || tok.includes('induk')) nisnCol = idx;
        else if (tok.includes('kelas') || tok.includes('rombel') || tok.includes('tingkat') || tok.includes('class'))
          classCol = idx;
      });
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line) => {
      const tokens = splitTokens(line);
      if (tokens.length < 2) return;

      let nama = '';
      let genderRaw = '';
      let nisn = '';
      let classRaw = '';

      if (hasHeader) {
        nama = tokens[nameCol] || '';
        genderRaw = tokens[genderCol] || '';
        nisn = tokens[nisnCol] || '';
        classRaw = tokens[classCol] || '';
      } else if (tokens.length >= 4) {
        // Standard requested order: NAMA LENGKAP, L/P, NISN, KELAS
        // Check if token[0] is digits (legacy NISN, NAMA, L/P, KELAS)
        if (/^\d{6,15}$/.test(tokens[0]) && !/^\d{6,15}$/.test(tokens[2])) {
          nisn = tokens[0];
          nama = tokens[1];
          genderRaw = tokens[2];
          classRaw = tokens[3];
        } else {
          nama = tokens[0];
          genderRaw = tokens[1];
          nisn = tokens[2];
          classRaw = tokens[3];
        }
      } else if (tokens.length === 3) {
        // 3 tokens: check if token[0] is digits vs token[2] is digits
        if (/^\d{6,15}$/.test(tokens[0])) {
          // NISN, NAMA, L/P
          nisn = tokens[0];
          nama = tokens[1];
          genderRaw = tokens[2];
        } else if (/^\d{6,15}$/.test(tokens[2])) {
          // NAMA, L/P, NISN
          nama = tokens[0];
          genderRaw = tokens[1];
          nisn = tokens[2];
        } else {
          // NAMA, L/P, KELAS
          nama = tokens[0];
          genderRaw = tokens[1];
          classRaw = tokens[2];
          nisn = '';
        }
      } else {
        // 2 tokens: NAMA, NISN or NISN, NAMA
        if (/^\d{6,15}$/.test(tokens[0])) {
          nisn = tokens[0];
          nama = tokens[1];
        } else {
          nama = tokens[0];
          nisn = tokens[1];
        }
      }

      // Clean gender
      let gender: 'L' | 'P' = 'L';
      const gUpper = (genderRaw || '').trim().toUpperCase();
      if (
        gUpper === 'P' ||
        gUpper.startsWith('PEREMPUAN') ||
        gUpper.startsWith('PUTRI') ||
        gUpper.startsWith('WANITA') ||
        gUpper === 'F' ||
        gUpper === 'FEMALE' ||
        gUpper === 'W'
      ) {
        gender = 'P';
      } else {
        gender = 'L';
      }

      // Clean class match
      const cleanClassInput = (classRaw || '').trim();
      const matchedClass = cleanClassInput ? findMatchingClass(cleanClassInput, availableClasses) : undefined;
      const matchedClassId = matchedClass?.id || selectedImportClassId || availableClasses[0]?.id || null;
      const matchedClassName =
        matchedClass?.name ||
        cleanClassInput ||
        availableClasses.find((c) => c.id === matchedClassId)?.name ||
        '';

      // Validation
      const isValid = (nama || '').trim().length > 0 && (nisn || '').trim().length > 0;
      let error = undefined;
      if (!nama.trim()) error = 'Nama lengkap kosong';
      else if (!nisn.trim()) error = 'NISN kosong';

      results.push({
        nama: nama.trim().toUpperCase(),
        gender,
        nisn: nisn.trim(),
        classNameInput: cleanClassInput || undefined,
        matchedClassId,
        matchedClassName,
        isValid,
        error,
      });
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
      const parsed = parseRawTextToStudents(content);
      setParsedStudents(parsed);
      if (parsed.length === 0) {
        showToast('Tidak ada data siswa yang dapat dibaca dari file ini', 'error');
      } else {
        showToast(`Berhasil membaca ${parsed.length} baris data dari ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const parsed = parseRawTextToStudents(text);
    setParsedStudents(parsed);
  };

  const handleExecuteImport = async () => {
    const validOnes = parsedStudents.filter((p) => p.isValid);
    if (validOnes.length === 0) {
      showToast('Tidak ada data siswa yang valid untuk diimpor', 'error');
      return;
    }

    if (maxStudentsLimit) {
      const projectedCount = importMode === 'replace' ? validOnes.length : students.length + validOnes.length;
      if (projectedCount > maxStudentsLimit) {
        showToast(
          `Jumlah data (${projectedCount} siswa) melebihi batas kuota paket Anda (${maxStudentsLimit} siswa). Silakan sesuaikan jumlah data yang diimpor.`,
          'error'
        );
        return;
      }
    }

    // Launch calm progressive book loader
    setIsImporting(true);
    setImportProgress(15);
    setImportStatusMessage(`Membaca dan memvalidasi ${validOnes.length} baris data siswa...`);

    try {
      await new Promise((res) => setTimeout(res, 400));
      setImportProgress(40);
      setImportStatusMessage('Memetakan rombel belajar dan memverifikasi NISN siswa...');

      const currentClasses = [...classes];
      const createdClassMap = new Map<string, string>();

      const payload: Array<{ nisn: string; nama: string; gender: 'L' | 'P'; classId: string | null }> = [];

      for (const s of validOnes) {
        let targetClassId = s.matchedClassId || null;

        if (!targetClassId && s.classNameInput && isAdmin) {
          const inputClean = s.classNameInput.trim();
          if (createdClassMap.has(inputClean.toLowerCase())) {
            targetClassId = createdClassMap.get(inputClean.toLowerCase()) || null;
          } else {
            const existing = findMatchingClass(inputClean, currentClasses);
            if (existing) {
              targetClassId = existing.id;
            } else {
              const matchNum = inputClean.match(/\d+/);
              const autoGrade = matchNum ? parseInt(matchNum[0], 10) : 1;
              try {
                await addClass({
                  name: inputClean,
                  grade: autoGrade,
                  academicYear: schoolProfile?.tahunPelajaran || '2026/2027',
                  waliKelasTeacherId: null,
                  waliKelasName: null,
                });
                const newlyAdded = classes.find((c) => c.name.trim().toLowerCase() === inputClean.toLowerCase());
                if (newlyAdded) {
                  targetClassId = newlyAdded.id;
                  createdClassMap.set(inputClean.toLowerCase(), newlyAdded.id);
                }
              } catch (_) {}
            }
          }
        }

        if (!targetClassId) {
          targetClassId = selectedImportClassId || availableClasses[0]?.id || classes[0]?.id || null;
        }

        payload.push({
          nisn: s.nisn,
          nama: s.nama,
          gender: s.gender,
          classId: targetClassId,
        });
      }

      setImportProgress(75);
      setImportStatusMessage('Menyimpan data siswa ke database presensi sekolah...');
      await new Promise((res) => setTimeout(res, 400));

      await importStudents(payload, importMode === 'replace');

      setImportProgress(100);
      setImportStatusMessage('Selesai! Seluruh data siswa berhasil diperbarui.');
      await new Promise((res) => setTimeout(res, 350));

      setIsImportModalOpen(false);
      setParsedStudents([]);
      setPasteText('');
      setFileName('');
      showToast(`Berhasil mengimpor ${payload.length} data siswa.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses import data siswa', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportStatusMessage('');
    }
  };

  const validCount = parsedStudents.filter((p) => p.isValid).length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <Users size={18} />
          </div>
          <span>Data Siswa</span>
        </div>

        {/* Workspace / Quota Plan Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPersonalWorkspace && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold w-fit">
              <span>Ruang Kerja Individu</span>
              <span className="text-blue-300">•</span>
              <span>Kuota: {students.length} / {maxStudentsLimit || 32} Siswa</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Controls: Search, Filter Kelas, Sort By, Show count, Import button & Add button */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari NISN atau Nama siswa..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Buttons: Import Siswa (CSV/Excel) & Add Single Student */}
            {canInputStudents && (
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setParsedStudents([]);
                    setPasteText('');
                    setFileName('');
                    setSelectedImportClassId(availableClasses[0]?.id || '');
                    setIsImportModalOpen(true);
                  }}
                  id="btn-import-siswa-modal"
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Import Siswa</span>
                </button>

                <button
                  onClick={openAddModal}
                  id="btn-tambah-siswa"
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tambah Siswa</span>
                </button>
              </div>
            )}
          </div>

          {/* Secondary Controls Bar: Filter by Class and Show Entries */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter By Class */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                <Filter size={13} className="text-slate-400" />
                <span className="text-[11px] text-slate-500 font-bold">FILTER KELAS:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => {
                    setSelectedClassFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-extrabold text-slate-800 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">
                    {isWaliKelas && availableClasses.length === 1
                      ? `Semua Siswa Kelas ${availableClasses[0].name} (${accessibleStudents.length})`
                      : `Semua Kelas (${accessibleStudents.length})`}
                  </option>
                  {availableClasses.map((c) => {
                    const count = accessibleStudents.filter(
                      (s) =>
                        s.classId === c.id ||
                        (s.className && s.className.toLowerCase() === c.name.toLowerCase())
                    ).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({getFaseByClassName(c.name, c.grade)}) - {count} siswa
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Show entries pagination dropdown */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>SHOW:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value={10}>10 Baris</option>
                <option value={25}>25 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
              </select>
            </div>
          </div>
        </div>

        {/* Total Summary Badge */}
        <div className="flex items-center justify-between text-xs px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700">
              Menampilkan:{' '}
              <strong className="text-blue-600 font-extrabold">
                {filteredStudents.length} dari {accessibleStudents.length} Siswa{isWaliKelas ? ' Binaan' : ''}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Laki-laki: <strong className="text-sky-700">{filteredStudents.filter((s) => s.gender === 'L').length}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Perempuan: <strong className="text-rose-700">{filteredStudents.filter((s) => s.gender === 'P').length}</strong>
            </span>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
            title="Unduh format file template CSV untuk diisi"
          >
            <Download size={13} />
            <span>Unduh Template CSV</span>
          </button>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60 select-none">
                <th className="py-3.5 px-4 w-12 rounded-l-xl">NO</th>
                <th className="py-3.5 px-4">NAMA LENGKAP</th>
                <th className="py-3.5 px-4 text-center w-28">L/P</th>
                <th className="py-3.5 px-4 w-40">NISN</th>
                <th className={`py-3.5 px-4 text-center ${!showAksiColumn ? 'rounded-r-xl' : ''}`}>KELAS</th>
                {showAksiColumn && (
                  <th className="py-3.5 px-4 text-center w-24 rounded-r-xl">AKSI</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentStudents.length > 0 ? (
                currentStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 tracking-tight">
                      {s.nama}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                          s.gender === 'L'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{s.nisn}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span>{s.className || 'Belum ada kelas'}</span>
                        {s.className && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                              getFaseBadgeColor(getFaseByClassName(s.className)).bg
                            }`}
                          >
                            {getFaseByClassName(s.className)}
                          </span>
                        )}
                      </div>
                    </td>
                    {showAksiColumn && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Siswa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingId(s.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showAksiColumn ? 6 : 5} className="text-center py-10 text-slate-400 font-medium">
                    Tidak ada data siswa yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <div>
            SHOWING {filteredStudents.length > 0 ? startIndex + 1 : 0} TO{' '}
            {Math.min(startIndex + pageSize, filteredStudents.length)} OF {filteredStudents.length}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* IMPORT SISWA (EXCEL / CSV) MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Import Data Siswa (Excel / CSV)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Masukkan banyak siswa secara instan menggunakan file spreadsheet atau salin-tempel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                KELAS TUJUAN IMPORT
              </label>
              <select
                value={selectedImportClassId || availableClasses[0]?.id || ''}
                onChange={(e) => setSelectedImportClassId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-600 outline-none"
                required
              >
                {availableClasses.length > 1 && <option value="">Pilih kelas...</option>}
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({getFaseByClassName(c.name, c.grade)})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto space-y-5 py-4 flex-1 pr-1">
              {/* Step 1: Download Template Callout */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <AlertCircle size={15} className="text-blue-600" />
                    <span>Langkah 1: Unduh Format Template Standar</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Format urutan kolom: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">NAMA LENGKAP</code>,{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">L/P</code>,{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">NISN</code>,{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">KELAS</code>.
                  </p>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Kolom KELAS otomatis terintegrasi dengan Data Kelas (otomatis menghitung siswa L/P & total per kelas).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              {/* Step 2: Choose Method (Upload File vs Paste Text) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Langkah 2: Masukkan Data Siswa
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setImportTab('file')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        importTab === 'file'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload size={13} />
                      <span>Unggah File CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportTab('paste')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        importTab === 'paste'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardPaste size={13} />
                      <span>Tempel / Paste Teks</span>
                    </button>
                  </div>
                </div>

                {importTab === 'file' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-200 hover:border-emerald-500 bg-gradient-to-b from-blue-50/30 to-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .txt, .tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex justify-center py-1">
                      <BookVisual size="sm" showGlow={true} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {fileName ? (
                          <span className="text-emerald-700 font-extrabold">{fileName}</span>
                        ) : (
                          'Klik di sini untuk memilih file (.csv / .txt) dari komputer'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mendukung file hasil ekspor Excel (CSV UTF-8) atau teks dengan pemisah koma / titik koma / tab
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <textarea
                      rows={5}
                      value={pasteText}
                      onChange={(e) => handlePasteChange(e.target.value)}
                      placeholder="Salin kolom dari Excel dan tempel di sini...&#10;Format: NAMA LENGKAP	L/P	NISN	KELAS&#10;Contoh:&#10;ADLAN AR RASHAFI SUBHAN	L	3140787024	Kelas 1A&#10;AINUN FAJARIAH	P	3141380962	Kelas 1A&#10;AISYAH AZ ZAHRA	P	3149811568	Kelas 1B"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      Tips: Urutan kolom di Excel: NAMA LENGKAP, L/P, NISN, KELAS. Lalu blok baris, tekan Ctrl+C dan Ctrl+V di kotak ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Preview Parsed Data */}
              {parsedStudents.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800">
                        Pratinjau Data Terdeteksi:
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-xs">
                        {validCount} Siswa Siap Diimpor
                      </span>
                    </div>
                    {parsedStudents.length > validCount && (
                      <span className="text-xs font-bold text-rose-600">
                        {parsedStudents.length - validCount} Baris Tidak Valid
                      </span>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-10">NO</th>
                          <th className="p-2.5">NAMA LENGKAP</th>
                          <th className="p-2.5 w-16 text-center">L/P</th>
                          <th className="p-2.5 w-28">NISN</th>
                          <th className="p-2.5 w-32">KELAS</th>
                          <th className="p-2.5 w-20 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedStudents.map((item, idx) => (
                          <tr
                            key={idx}
                            className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.nama}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.gender === 'L'
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {item.gender === 'L' ? 'L' : 'P'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-700 font-medium">
                              {item.nisn || <span className="text-rose-500 italic">-</span>}
                            </td>
                            <td className="p-2.5">
                              <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                                {item.matchedClassName || item.classNameInput || availableClasses.find(c => c.id === selectedImportClassId)?.name || 'Default'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
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

              {/* Step 4: Import Mode Option */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Langkah 3: Opsi Penempatan Data
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Gantikan Seluruh Data Siswa
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menghapus data siswa lama dan mengisi dengan data baru (Ideal untuk Tahun Ajaran Baru).
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Tambahkan ke Data Siswa Saat Ini
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menyisipkan siswa baru ke daftar yang sudah ada tanpa menghapus siswa sebelumnya.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                {validCount > 0 ? `${validCount} siswa siap diproses` : 'Pilih file/tempel data untuk mulai'}
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
                  <span>Proses Import ({validCount} Siswa)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Single Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  NISN
                </label>
                <input
                  type="text"
                  required
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="Contoh: 3140787024"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  NAMA LENGKAP
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: ADLAN AR RASHAFI SUBHAN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  KELAS SISWA
                </label>
                <select
                  value={formData.classId || availableClasses[0]?.id || ''}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  required
                >
                  {availableClasses.length > 1 && <option value="">Pilih kelas siswa...</option>}
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({getFaseByClassName(c.name, c.grade)})
                    </option>
                  ))}
                </select>
                {isPersonalWorkspace && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    * Rombel aktif: {availableClasses.map((c) => c.name).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  JENIS KELAMIN
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
                      formData.gender === 'L'
                        ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      checked={formData.gender === 'L'}
                      onChange={() => setFormData({ ...formData, gender: 'L' })}
                      className="hidden"
                    />
                    <span>Laki-laki (L)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
                      formData.gender === 'P'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      checked={formData.gender === 'P'}
                      onChange={() => setFormData({ ...formData, gender: 'P' })}
                      className="hidden"
                    />
                    <span>Perempuan (P)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus data siswa?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Data siswa dan seluruh data terkait, termasuk riwayat absensi, akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => void handleDelete(deletingId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeletingStudent ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Book Loading Modal for Import Data Siswa */}
      <BookLoadingModal
        isOpen={isImporting}
        title="Mengimpor Data Siswa..."
        subtitle="Sistem sedang memproses berkas, memvalidasi NISN, dan menyusun rombel belajar."
        badgeText="PROSES IMPORT DATA SISWA"
        progress={importProgress}
        statusMessage={importStatusMessage}
      />
    </div>
  );
};
