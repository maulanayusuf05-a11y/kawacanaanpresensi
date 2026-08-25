import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';

interface ParsedStudentItem {
  nisn: string;
  nama: string;
  gender: 'L' | 'P';
  isValid: boolean;
  error?: string;
}

export const DataSiswaView: React.FC = () => {
  const {
    currentUser,
    classes,
    students,
    schoolProfile,
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
  const isGuru = currentUser?.role === 'GURU' || currentUser?.role === 'GURU MAPEL';

  // Kelas yang diampu oleh Wali Kelas / Guru
  const myAssignedClasses = useMemo(() => {
    if (isAdmin || isPersonalWorkspace) return classes;
    const ids = new Set<string>();
    if (currentUser?.classIds && currentUser.classIds.length > 0) {
      currentUser.classIds.forEach((id) => ids.add(id));
    }
    classes.forEach((c) => {
      if (c.waliKelasId && (c.waliKelasId === currentUser?.id || c.waliKelasId === currentUser?.username)) {
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

  // Akses penuh input data siswa untuk Admin, Ruang Kerja Individu, Paket Mulai/Gratis, Wali Kelas, dan Guru
  const canInputStudents = isAdmin || isPersonalWorkspace || isWaliKelas || isGuru;

  // Kuota siswa pada paket mulai / gratis
  const maxStudentsLimit = currentUser?.maxStudents || (isPersonalWorkspace ? 32 : undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'class-asc' | 'class-desc' | 'name-asc' | 'name-desc' | 'nisn-asc' | 'nisn-desc'>('class-asc');
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

  // Import Modal States
  const [selectedImportClassId, setSelectedImportClassId] = useState(myAssignedClasses[0]?.id || classes[0]?.id || '');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map class lookup helper
  const classMap = useMemo(() => {
    const map = new Map<string, { grade: number; name: string }>();
    classes.forEach((c) => {
      map.set(c.id, { grade: c.grade, name: c.name });
    });
    return map;
  }, [classes]);

  // Available classes: integrated from onboarding registration / workspace classes
  const availableClasses = useMemo(() => {
    if (myAssignedClasses && myAssignedClasses.length > 0) {
      return myAssignedClasses;
    }
    if (classes && classes.length > 0) {
      return classes;
    }
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
  }, [myAssignedClasses, classes, schoolProfile, currentUser]);

  // Filter and sort students (dari kumpulan accessibleStudents)
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
      .sort((a, b) => {
        if (sortBy === 'class-asc' || sortBy === 'class-desc') {
          const classA = a.classId ? classMap.get(a.classId) : null;
          const classB = b.classId ? classMap.get(b.classId) : null;
          const gradeA = classA?.grade ?? 999;
          const gradeB = classB?.grade ?? 999;
          const nameA = classA?.name || a.className || 'ZZZ';
          const nameB = classB?.name || b.className || 'ZZZ';

          if (gradeA !== gradeB) {
            return sortBy === 'class-asc' ? gradeA - gradeB : gradeB - gradeA;
          }
          const classCompare = nameA.localeCompare(nameB, 'id');
          if (classCompare !== 0) {
            return sortBy === 'class-asc' ? classCompare : -classCompare;
          }
          return a.nama.localeCompare(b.nama, 'id');
        }

        if (sortBy === 'name-asc') {
          return a.nama.localeCompare(b.nama, 'id');
        }
        if (sortBy === 'name-desc') {
          return b.nama.localeCompare(a.nama, 'id');
        }
        if (sortBy === 'nisn-asc') {
          return a.nisn.localeCompare(b.nisn);
        }
        if (sortBy === 'nisn-desc') {
          return b.nisn.localeCompare(a.nisn);
        }
        return 0;
      });
  }, [accessibleStudents, searchTerm, selectedClassFilter, sortBy, classMap, availableClasses]);

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

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn.trim() || !formData.nama.trim()) return;

    const selectedCls = availableClasses.find((c) => c.id === formData.classId) || availableClasses[0];
    const targetClassId = selectedCls && selectedCls.id !== 'onboarding-class-default' ? selectedCls.id : null;

    if (editingStudent) {
      updateStudent(editingStudent.id, {
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
      addStudent({
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim().toUpperCase(),
        gender: formData.gender,
        classId: targetClassId,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteStudent(id);
    setDeletingId(null);
  };

  // Download Template CSV (Standardized for Excel with UTF-8 BOM)
  const handleDownloadTemplate = () => {
    const header = 'NISN,NAMA LENGKAP,JENIS KELAMIN\n';
    const sampleRows = [
      '3140787024,ADLAN AR RASHAFI SUBHAN,L',
      '3141380962,AINUN FAJARIAH,P',
      '3149811568,AISYAH AZ ZAHRA,P',
      '3145450700,ALBY FAKHRI ARSYAD,L',
      '3148157704,AQILA SHAFA MAHYA,P',
      '3146473211,BAGAS SATRIA PRATAMA,L',
      '3149021145,CITRA LESTARI DEWI,P',
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
  const parseRawTextToStudents = (text: string): ParsedStudentItem[] => {
    if (!text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const results: ParsedStudentItem[] = [];

    // Detect if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('nisn') ||
      firstLineLower.includes('nama') ||
      firstLineLower.includes('siswa') ||
      firstLineLower.includes('jenis') ||
      firstLineLower.includes('gender');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line) => {
      // Split by tab, semicolon, or comma
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t');
      } else if (line.includes(';')) {
        tokens = line.split(';');
      } else {
        // Basic CSV split
        tokens = line.split(',');
      }

      // Clean tokens
      tokens = tokens.map((t) => t.trim().replace(/^["']|["']$/g, ''));

      if (tokens.length >= 2) {
        let nisn = '';
        let nama = '';
        let genderRaw = '';

        // If 3 columns: NISN, Nama, Gender
        if (tokens.length >= 3) {
          nisn = tokens[0];
          nama = tokens[1];
          genderRaw = tokens[2];
        } else {
          // 2 columns: NISN, Nama (default L)
          nisn = tokens[0];
          nama = tokens[1];
        }

        // Clean gender
        let gender: 'L' | 'P' = 'L';
        const gUpper = genderRaw.trim().toUpperCase();
        if (
          gUpper === 'P' ||
          gUpper.startsWith('PEREMPUAN') ||
          gUpper.startsWith('PUTRI') ||
          gUpper === 'F' ||
          gUpper === 'W'
        ) {
          gender = 'P';
        } else {
          gender = 'L';
        }

        // Validation
        const isValid = nisn.length > 0 && nama.length > 0;
        let error = undefined;
        if (!nisn) error = 'NISN kosong';
        else if (!nama) error = 'Nama kosong';

        results.push({
          nisn,
          nama: nama.toUpperCase(),
          gender,
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

  const handleExecuteImport = () => {
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

    const targetClassId = selectedImportClassId || myAssignedClasses[0]?.id || classes[0]?.id || null;

    const payload = validOnes.map((s) => ({
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender,
      classId: targetClassId,
    }));

    importStudents(payload, importMode === 'replace', targetClassId || undefined);
    setIsImportModalOpen(false);
    setParsedStudents([]);
    setPasteText('');
    setFileName('');
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

        {/* Wali Kelas / Workspace / Quota Plan Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {isWaliKelas && myAssignedClasses.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Wali Kelas: {myAssignedClasses.map((c) => c.name).join(', ')}</span>
            </div>
          )}
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

          {/* Secondary Controls Bar: Filter by Class, Sort By, and Show Entries */}
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
                        {c.name} ({count} siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Sort By Dropdown (Sort By Class, Name, NISN) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                <ArrowUpDown size={13} className="text-slate-400" />
                <span className="text-[11px] text-slate-500 font-bold">URUTKAN (SORT BY):</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-extrabold text-blue-700 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="class-asc">Kelas (Kelas 1 - 6)</option>
                  <option value="class-desc">Kelas (Kelas 6 - 1)</option>
                  <option value="name-asc">Nama Siswa (A - Z)</option>
                  <option value="name-desc">Nama Siswa (Z - A)</option>
                  <option value="nisn-asc">NISN (Terkecil - Terbesar)</option>
                  <option value="nisn-desc">NISN (Terbesar - Terkecil)</option>
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
                <th
                  onClick={() => setSortBy(sortBy === 'nisn-asc' ? 'nisn-desc' : 'nisn-asc')}
                  className="py-3.5 px-4 w-40 cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NISN</span>
                    {sortBy.startsWith('nisn') ? (
                      sortBy === 'nisn-asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NAMA LENGKAP</span>
                    {sortBy.startsWith('name') ? (
                      sortBy === 'name-asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => setSortBy(sortBy === 'class-asc' ? 'class-desc' : 'class-asc')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>KELAS</span>
                    {sortBy.startsWith('class') ? (
                      sortBy === 'class-asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center w-28">L/P</th>
                <th className="py-3.5 px-4 text-center w-24 rounded-r-xl">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentStudents.length > 0 ? (
                currentStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{s.nisn}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 tracking-tight">
                      {s.nama}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600">{s.className || 'Belum ada kelas'}</td>
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
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit2 size={15} />
                        </button>
                        {canInputStudents && (
                          <button
                            onClick={() => setDeletingId(s.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
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
                    {c.name}
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
                    Format kolom yang didukung: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">NISN</code>,{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">NAMA LENGKAP</code>,{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">JENIS KELAMIN (L/P)</code>.
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
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .txt, .tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-xs">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {fileName ? (
                          <span className="text-emerald-700 font-extrabold">{fileName}</span>
                        ) : (
                          'Klik di sini untuk memilih file (.csv / .txt) dari komputer'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
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
                      placeholder="Salin kolom dari Excel dan tempel di sini...&#10;Contoh:&#10;3140787024	ADLAN AR RASHAFI SUBHAN	L&#10;3141380962	AINUN FAJARIAH	P"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      Tips: Cukup blok baris NISN, Nama, dan JK di Microsoft Excel / Google Docs, lalu tekan Ctrl+C dan Ctrl+V di kotak ini.
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
                          <th className="p-2.5 w-32">NISN</th>
                          <th className="p-2.5">NAMA LENGKAP</th>
                          <th className="p-2.5 w-20 text-center">L/P</th>
                          <th className="p-2.5 w-24 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedStudents.map((item, idx) => (
                          <tr
                            key={idx}
                            className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-slate-700 font-medium">
                              {item.nisn || <span className="text-rose-500 italic">-</span>}
                            </td>
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
                      {c.name}
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
            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus Data Siswa?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Tindakan ini akan menghapus siswa dan akun login terkait secara permanen.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
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
