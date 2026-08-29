import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  UsersRound,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Download,
  Check,
  AlertCircle,
  GraduationCap,
  BookOpen,
  UserCog,
  Info
} from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';
import { supabase } from '../lib/supabase';

interface ParsedTeacherItem {
  nama: string;
  nip: string;
  jenisKelamin: 'L' | 'P';
  jabatan: string;
  statusKepegawaian: string;
  noHp: string;
  isValid: boolean;
  error?: string;
}

export const DataGuruView: React.FC = () => {
  const {
    currentUser,
    teachers,
    users,
    classes,
    subjects,
    schoolProfile,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    importTeachers,
    executeTeacherAssignment,
    addUser,
    showToast,
    activeWorkspace,
    loadData,
  } = useApp();

  const isPersonalWorkspace =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    (currentUser?.subscriptionPlan === 'mulai' && !currentUser?.schoolId);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const canAdd = isAdmin || isPersonalWorkspace;
  const canEdit = isAdmin || isPersonalWorkspace;
  const canDelete = isAdmin || isPersonalWorkspace;

  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);
  const [open, setOpen] = useState(false);

  // Assignment Modal for Admin Sekolah
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [assignRoleType, setAssignRoleType] = useState<'NONE' | 'WALI_KELAS' | 'GURU_MAPEL'>('NONE');
  const [assignWaliClassId, setAssignWaliClassId] = useState<string>('');
  const [assignSubjectId, setAssignSubjectId] = useState<string>('');
  const [assignMapelClassIds, setAssignMapelClassIds] = useState<string[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Quick Create Account Modal State
  const [accountTeacher, setAccountTeacher] = useState<Teacher | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState<'GURU MAPEL' | 'WALI KELAS'>('WALI KELAS');
  const [accountClassId, setAccountClassId] = useState('');
  const [accountClassIds, setAccountClassIds] = useState<string[]>([]);
  const [accountSubjectId, setAccountSubjectId] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');

  // Tugas Utama state in Add/Edit Teacher Modal (hanya 2: Wali Kelas dan Guru Mapel)
  const [modalRoleType, setModalRoleType] = useState<'WALI_KELAS' | 'GURU_MAPEL'>('WALI_KELAS');
  const [modalWaliClassId, setModalWaliClassId] = useState<string>('');
  const [modalSubjectId, setModalSubjectId] = useState<string>('');
  const [modalMapelClassIds, setModalMapelClassIds] = useState<string[]>([]);

  // Import Guru Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacherItem[]>([]);

  // Helper to get detailed assignment info for a teacher based on actual assignments & role
  const getTeacherAssignmentDetails = (t: Teacher) => {
    if (!t) {
      return {
        type: 'Belum Ditugaskan' as const,
        label: 'BELUM DITUGASKAN',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
        badges: [
          {
            type: 'Belum Ditugaskan' as const,
            label: 'BELUM DITUGASKAN',
            badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
          },
        ],
      };
    }

    const homeroomClasses = (classes || []).filter(
      (c) => c.waliKelasTeacherId === t.id
    );

    const assignedSubjects = (subjects || []).filter(
      (s) => s.teacherId === t.id
    );

    const badges: Array<{
      type: 'Wali Kelas' | 'Guru Mapel' | 'Belum Ditugaskan';
      label: string;
      badgeColor: string;
    }> = [];

    // Prioritas 1: Rombel aktif Wali Kelas atau status eksplisit Wali Kelas
    if (homeroomClasses.length > 0) {
      homeroomClasses.forEach((hc) => {
        badges.push({
          type: 'Wali Kelas',
          label: `Wali Kelas ${hc.name || ''}`.trim(),
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        });
      });
    } else if ((t.jabatan || '').trim() === 'Wali Kelas') {
      badges.push({
        type: 'Wali Kelas',
        label: 'Wali Kelas',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      });
    }

    // Prioritas 2: Penugasan Mapel aktif atau status eksplisit Guru Mapel
    if (assignedSubjects.length > 0) {
      assignedSubjects.forEach((sub) => {
        const targetNames = (sub.targetClassIds || [])
          .map((cid) => (classes || []).find((c) => c.id === cid)?.name || '')
          .filter(Boolean);
        const classText = targetNames.length > 0 ? ` (${targetNames.join(', ')})` : '';
        badges.push({
          type: 'Guru Mapel',
          label: `${sub.name || 'Guru Mapel'}${classText}`,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        });
      });
    } else if ((t.jabatan || '').trim() === 'Guru Mapel' && badges.length === 0) {
      badges.push({
        type: 'Guru Mapel',
        label: 'Guru Mapel',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      });
    }

    // Default mutlak: BELUM DITUGASKAN
    if (badges.length === 0) {
      badges.push({
        type: 'Belum Ditugaskan',
        label: 'BELUM DITUGASKAN',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      });
    }

    return {
      type: badges[0].type,
      label: badges.map((b) => b.label).join(', '),
      badgeColor: badges[0].badgeColor,
      badges,
    };
  };

  const baseTeacherList = useMemo(() => {
    return teachers || [];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return baseTeacherList;
    return baseTeacherList.filter((t) => {
      if (!t) return false;
      const namaMatch = (t.nama || '').toLowerCase().includes(q);
      const nipMatch = (t.nip || '').toLowerCase().includes(q);
      const assign = getTeacherAssignmentDetails(t);
      const roleMatch =
        (assign.label || '').toLowerCase().includes(q) ||
        (assign.type || '').toLowerCase().includes(q);
      const statusMatch = (t.statusKepegawaian || '').toLowerCase().includes(q);
      return namaMatch || nipMatch || roleMatch || statusMatch;
    });
  }, [baseTeacherList, searchTerm, classes, subjects, users]);

  // Helper untuk mengecek akun guru
  const getTeacherAccount = (t: Teacher) => {
    if (!t) return undefined;
    const teacherNip = (t.nip || '').trim().toLowerCase();
    const teacherName = (t.nama || '').trim().toLowerCase();
    return (users || []).find(
      (u) =>
        (teacherNip && teacherNip !== '-' && (u.username || '').toLowerCase() === teacherNip) ||
        ((u.name || '').trim().toLowerCase() === teacherName && teacherName.length > 0)
    );
  };

  const resetForm = () => {
    setNama('');
    setNip('');
    setJenisKelamin('L');
    setModalRoleType('WALI_KELAS');
    setModalWaliClassId('');
    setModalSubjectId('');
    setModalMapelClassIds([]);
  };

  const openAdd = () => {
    if (isPersonalWorkspace && baseTeacherList.length >= 1) {
      showToast('Ruang Kerja Individu dikhususkan untuk 1 akun pendidik mandiri. Penambahan banyak akun/data guru hanya tersedia di Ruang Kerja Sekolah.', 'warning');
      return;
    }
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setNama(t.nama);
    setNip(t.nip);
    setJenisKelamin(t.jenisKelamin);

    // Initial state for Tugas Utama in edit modal based on assignments and current teacher role
    const homeroomClass = classes.find((c) => c.waliKelasTeacherId === t.id);
    const assignedSubject = subjects.find((s) => s.teacherId === t.id);
    const normJabatan = (t.jabatan || '').trim().toLowerCase();
    const normPTK = (t.jenisPTK || '').trim().toLowerCase();

    if (homeroomClass || normJabatan.includes('wali') || normPTK.includes('wali')) {
      setModalRoleType('WALI_KELAS');
      setModalWaliClassId(homeroomClass ? homeroomClass.id : '');
    } else {
      setModalRoleType('GURU_MAPEL');
      setModalWaliClassId('');
    }

    setOpen(true);
  };

  const openAssignModal = (t: Teacher) => {
    setAssigningTeacher(t);
    const homeroomClass = classes.find((c) => c.waliKelasTeacherId === t.id);
    const assignedSubject = subjects.find((s) => s.teacherId === t.id);
    const normJabatan = (t.jabatan || '').trim().toLowerCase();
    const normPTK = (t.jenisPTK || '').trim().toLowerCase();

    if (homeroomClass || normJabatan.includes('wali') || normPTK.includes('wali')) {
      setAssignRoleType('WALI_KELAS');
      setAssignWaliClassId(homeroomClass ? homeroomClass.id : '');
    } else {
      setAssignRoleType('GURU_MAPEL');
      setAssignWaliClassId('');
    }
  };

  const handleSaveDirectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher) return;
    setIsSavingAssignment(true);
    try {
      await executeTeacherAssignment(
        assigningTeacher.id,
        assignRoleType
      );
      setAssigningTeacher(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan penugasan guru', 'error');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const openCreateAccountModal = (t: Teacher) => {
    setAccountTeacher(t);
    const cleanNip = (t.nip || '').trim();
    const defaultUsername = cleanNip && cleanNip !== '-' 
      ? cleanNip.toLowerCase().replace(/[^a-z0-9]/g, '')
      : t.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    
    // Cari apakah guru ini ditugaskan di salah satu Data Kelas
    const matchedClass = classes.find(
      (c) => c.waliKelasTeacherId === t.id || (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === t.nama.trim().toLowerCase())
    );

    const assignedSubject = subjects.find((sub) => sub.teacherId === t.id && (sub.targetClassIds || []).length > 0);
    const isWali = !!matchedClass;
    setAccountUsername(defaultUsername);
    setAccountPassword('123456');
    setAccountEmail('');
    setAccountRole(isWali ? 'WALI KELAS' : 'GURU MAPEL');
    setAccountClassId(matchedClass ? matchedClass.id : '');
    setAccountClassIds(assignedSubject?.targetClassIds || (matchedClass ? [matchedClass.id] : []));
    setAccountSubjectId(assignedSubject?.id || '');
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTeacher || !accountUsername.trim() || !accountPassword.trim()) return;
    if (accountRole === 'GURU MAPEL') {
      if (!accountSubjectId) {
        showToast('Guru Mapel harus ditetapkan ke Mata Pelajaran terlebih dahulu.', 'error');
        return;
      }
      if (accountClassIds.length === 0) {
        showToast('Guru Mapel harus mempunyai minimal satu kelas yang diajar.', 'error');
        return;
      }
      const chosenSubject = subjects.find((s) => s.id === accountSubjectId);
      if (chosenSubject?.teacherId && chosenSubject.teacherId !== accountTeacher.id) {
        showToast('Mata Pelajaran tersebut sudah ditugaskan kepada guru lain. Pilih mapel yang belum dimiliki guru lain.', 'error');
        return;
      }
    }

    // Validate role exclusivity
    const targetRole = accountRole === 'WALI KELAS' ? 'wali_kelas' : 'guru_mapel';
    const validation = validateTeacherRoleAssignment(
      accountTeacher.id,
      targetRole,
      classes,
      subjects,
      schoolProfile.tahunPelajaran
    );

    if (!validation.valid) {
      showToast(validation.errorMessage || 'Konflik peran guru terdeteksi.', 'error');
      return;
    }

    setIsCreatingAccount(true);
    try {
      await addUser({
        name: accountTeacher.nama.trim(),
        username: accountUsername.trim().toLowerCase(),
        password: accountPassword.trim(),
        email: accountEmail.trim() || null,
        role: accountRole,
        classIds: accountRole === 'GURU MAPEL' ? accountClassIds : (accountClassId ? [accountClassId] : []),
        subjectId: accountRole === 'GURU MAPEL' ? accountSubjectId : null,
        subjectName: accountRole === 'GURU MAPEL' ? (subjects.find((s) => s.id === accountSubjectId)?.name || null) : null,
      });
      setAccountTeacher(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat akun', 'error');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return showToast('Nama guru wajib diisi', 'error');

    if (!editing && isPersonalWorkspace && baseTeacherList.length >= 1) {
      showToast('Batas Kuota Paket Guru Pro: Ruang Kerja Individu dibatasi maksimal 1 guru (1 Wali Kelas atau 1 Guru Mapel).', 'error');
      return;
    }

    const payload = {
      nama: nama.trim(),
      nip: nip.trim(),
      jenisKelamin,
      jabatan: modalRoleType === 'WALI_KELAS' ? 'Wali Kelas' : modalRoleType === 'GURU_MAPEL' ? 'Guru Mapel' : 'Belum ditugaskan',
      jenisPTK: modalRoleType === 'WALI_KELAS' ? 'Wali Kelas' : modalRoleType === 'GURU_MAPEL' ? 'Guru Mapel' : 'Guru',
      mataPelajaran: '',
      statusKepegawaian: 'PNS',
      noHp: '',
    };

    try {
      let targetTeacherId = editing?.id;
      if (editing) {
        await updateTeacher(editing.id, payload);
      } else {
        const created = await addTeacher(payload);
        targetTeacherId = (created as any)?.id;
      }

      // If in school workspace as Admin and penugasan is configured in modal
      if (isAdmin && !isPersonalWorkspace && targetTeacherId && modalRoleType) {
        await executeTeacherAssignment(
          targetTeacherId,
          modalRoleType
        );
      }

      setOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data guru', 'error');
    }
  };

  const removeTeacher = async () => {
    if (!deleting || isDeletingTeacher) return;
    setIsDeletingTeacher(true);
    try {
      await deleteTeacher(deleting.id);
      setDeleting(null);
    } catch {
      // Error handling and toast are handled inside deleteTeacher
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  // Download Template CSV Guru
  const handleDownloadTemplate = () => {
    const header = 'NAMA GURU,NIP,JENIS KELAMIN,STATUS KEPEGAWAIAN,NO HP\n';
    const sampleRows = [
      'Budi Santoso, S.Pd.,198503152010011012,L,PNS,081234567890',
      'Siti Aminah, M.Pd.,199008222015022003,P,PPPK,081398765432',
      'Rahmat Hidayat, S.Pd.,198811102012011005,L,PNS,085612345678',
      'Dewi Lestari, S.Pd.,-,P,Honorer,087812345678',
    ].join('\n');

    const csvContent = '\uFEFF' + header + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Data_Guru.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Template file CSV Guru berhasil diunduh. Silakan isi dan unggah kembali.', 'success');
  };

  // Parser helper function for CSV / TSV text for Teachers
  const parseRawTextToTeachers = (text: string): ParsedTeacherItem[] => {
    if (!text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const results: ParsedTeacherItem[] = [];
    const seenNipsInBatch = new Set<string>();

    // Detect if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('nama') ||
      firstLineLower.includes('nip') ||
      firstLineLower.includes('guru') ||
      firstLineLower.includes('gender') ||
      firstLineLower.includes('jenis kelamin') ||
      firstLineLower.includes('status') ||
      firstLineLower.includes('jabatan');

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
        const rawNama = tokens[0] || '';
        const rawNip = tokens[1] || '-';
        const rawGender = tokens[2] || 'L';

        let rawStatus = 'PNS';
        let rawNoHp = '';

        if (tokens.length >= 6) {
          rawStatus = tokens[4] || 'PNS';
          rawNoHp = tokens[5] || '';
        } else if (tokens.length === 5) {
          const t3Upper = (tokens[3] || '').toUpperCase();
          if (
            t3Upper.includes('PNS') ||
            t3Upper.includes('PPPK') ||
            t3Upper.includes('HONOR') ||
            t3Upper.includes('TETAP') ||
            t3Upper.includes('GTT') ||
            t3Upper.includes('KONTRAK') ||
            t3Upper.includes('NON')
          ) {
            rawStatus = tokens[3];
            rawNoHp = tokens[4] || '';
          } else {
            rawStatus = tokens[4] || 'PNS';
            rawNoHp = '';
          }
        } else if (tokens.length === 4) {
          rawStatus = tokens[3] || 'PNS';
          rawNoHp = '';
        }

        // Clean gender
        let gender: 'L' | 'P' = 'L';
        const gUpper = rawGender.trim().toUpperCase();
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

        const cleanNip = rawNip.trim() && rawNip.trim() !== '-' ? rawNip.trim() : null;

        let isValid = rawNama.trim().length > 0;
        let error = undefined;
        if (!rawNama.trim()) {
          isValid = false;
          error = 'Nama guru kosong';
        } else if (cleanNip) {
          if (seenNipsInBatch.has(cleanNip)) {
            isValid = false;
            error = 'Duplikat NIP dalam file';
          } else {
            seenNipsInBatch.add(cleanNip);
          }
        }

        results.push({
          nama: rawNama.trim(),
          nip: cleanNip || '-',
          jenisKelamin: gender,
          jabatan: 'Belum Ditugaskan',
          statusKepegawaian: rawStatus.trim() || 'PNS',
          noHp: rawNoHp.trim(),
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
      const parsed = parseRawTextToTeachers(content);
      setParsedTeachers(parsed);
      if (parsed.length === 0) {
        showToast('Tidak ada data guru yang dapat dibaca dari file ini', 'error');
      } else {
        showToast(`Berhasil membaca ${parsed.length} baris data dari ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const parsed = parseRawTextToTeachers(text);
    setParsedTeachers(parsed);
  };

  const handleExecuteImport = async () => {
    const validOnes = parsedTeachers.filter((p) => p.isValid);
    if (validOnes.length === 0) {
      showToast('Tidak ada data guru yang valid untuk diimpor', 'error');
      return;
    }

    const payload = validOnes.map((t) => ({
      nama: t.nama,
      nip: t.nip && t.nip !== '-' ? t.nip : null,
      jenisKelamin: t.jenisKelamin,
      jabatan: 'Belum ditugaskan',
      jenisPTK: 'Belum ditugaskan',
      mataPelajaran: '',
      statusKepegawaian: t.statusKepegawaian || 'PNS',
      noHp: t.noHp || '',
    }));

    await importTeachers(payload, importMode === 'replace');
    setIsImportModalOpen(false);
    setParsedTeachers([]);
    setPasteText('');
    setFileName('');
  };

  const validCount = parsedTeachers.filter((p) => p.isValid).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <UsersRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Data Guru
            </h2>
            <p className="text-xs text-slate-500">
              {isPersonalWorkspace
                ? 'Daftar data pendidik di Ruang Kerja Individu. Anda dapat menambahkan, mengedit, atau menghapus data pendidik.'
                : 'Master pendidik sekolah. Penugasan Wali Kelas dan Guru Mapel bersifat eksklusif per tahun ajaran.'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Import Guru (Ruang Kerja Sekolah) & Tambah Guru */}
        <div className="flex items-center gap-2">
          {canAdd && !isPersonalWorkspace && (
            <button
              onClick={() => {
                setParsedTeachers([]);
                setPasteText('');
                setFileName('');
                setIsImportModalOpen(true);
              }}
              id="btn-import-guru-modal"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Import Guru</span>
            </button>
          )}

          {canAdd && (
            <button
              onClick={openAdd}
              id="btn-tambah-guru"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Guru</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari Nama, NIP, atau Tugas Utama (Wali Kelas / Guru Mapel)..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60">
              <th className="py-3.5 px-4 w-12 rounded-l-xl">NO</th>
              <th className="py-3.5 px-4">NAMA GURU</th>
              <th className="py-3.5 px-4 w-44">NIP</th>
              <th className="py-3.5 px-4 w-24 text-center">JK</th>
              <th className="py-3.5 px-4 text-center">TUGAS UTAMA</th>
              {canEdit && <th className="py-3.5 px-4 w-32 text-center rounded-r-xl">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t, idx) => {
                const assignDetails = getTeacherAssignmentDetails(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{t.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {t.statusKepegawaian || 'PNS'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{t.nip || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          t.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}
                      >
                        {t.jenisKelamin === 'L' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {assignDetails.badges.map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${b.badgeColor}`}
                          >
                            {b.type === 'Wali Kelas' && <GraduationCap size={13} className="shrink-0" />}
                            {b.type === 'Guru Mapel' && <BookOpen size={13} className="shrink-0" />}
                            <span>{b.label}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isAdmin && !isPersonalWorkspace && (
                            <button
                              type="button"
                              onClick={() => openAssignModal(t)}
                              title="Tentukan Tugas Utama (Wali Kelas / Guru Mapel)"
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            >
                              <UserCog size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            title="Edit Data Guru"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleting(t)}
                              title="Hapus Guru"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-slate-400">
                  Tidak ada data guru yang ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Penugasan Tugas Utama oleh Admin Sekolah */}
      {assigningTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserCog size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Tentukan Tugas Utama Pendidik
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tentukan tugas utama untuk: <strong className="text-slate-800">{assigningTeacher.nama}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTeacher(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDirectAssignment} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Pilih Tugas Utama *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAssignRoleType('WALI_KELAS')}
                    className={`p-3.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      assignRoleType === 'WALI_KELAS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap size={20} className={assignRoleType === 'WALI_KELAS' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-xs">Wali Kelas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignRoleType('GURU_MAPEL')}
                    className={`p-3.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      assignRoleType === 'GURU_MAPEL'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen size={20} className={assignRoleType === 'GURU_MAPEL' ? 'text-amber-600' : 'text-slate-400'} />
                    <span className="text-xs">Guru Mapel</span>
                  </button>
                </div>
              </div>

              {assignRoleType === 'WALI_KELAS' && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-950 text-xs">Tugas Utama: Wali Kelas</h4>
                      <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                        Guru ini terdaftar dengan tugas utama sebagai <strong>Wali Kelas</strong>. Rombel/kelas binaan dapat dipilih langsung saat menambah kelas di menu <strong>Data Kelas</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {assignRoleType === 'GURU_MAPEL' && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-xs">Tugas Utama: Guru Mapel</h4>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Guru ini terdaftar dengan tugas utama sebagai <strong>Guru Mapel</strong>. Penetapan mata pelajaran yang diampu dan kelas target dapat ditentukan melalui menu <strong>Data Mata Pelajaran</strong> dan <strong>Data Kelas</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAssigningTeacher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isSavingAssignment ? 'Menyimpan ke Supabase...' : 'Simpan Tugas Utama'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Guru (Ruang Kerja Sekolah) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Import Data Guru Masal</h3>
                  <p className="text-xs text-slate-500">Unggah file CSV/Excel atau tempel teks data pendidik</p>
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
                  <h4 className="font-extrabold text-xs text-emerald-950">Gunakan Template Standar</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Format: <strong>NAMA GURU, NIP, JENIS KELAMIN (L/P), PENUGASAN, STATUS, NO HP</strong>
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
                  Metode Input Data
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
                    placeholder="Tempel data guru dari spreadsheet Excel di sini...&#10;Contoh:&#10;Budi Santoso, S.Pd.&#9;198503152010011012&#9;L&#9;PNS&#9;081234567890&#10;Siti Aminah, M.Pd.&#9;199008222015022003&#9;P&#9;PPPK&#9;081398765432"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              )}

              {/* Data Preview Table */}
              {parsedTeachers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Pratinjau Data ({parsedTeachers.length} Baris Terdeteksi)
                    </label>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {validCount} Baris Valid
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="p-2 w-8">#</th>
                          <th className="p-2">Nama Guru</th>
                          <th className="p-2">NIP</th>
                          <th className="p-2 text-center w-12">JK</th>
                          <th className="p-2">Kepegawaian</th>
                          <th className="p-2">Status Awal</th>
                          <th className="p-2 text-center w-16">Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedTeachers.map((item, i) => (
                          <tr key={i} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                            <td className="p-2 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                            <td className="p-2 font-bold text-slate-800">{item.nama}</td>
                            <td className="p-2 font-mono text-slate-600">{item.nip}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                                }`}
                              >
                                {item.jenisKelamin}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600 font-medium">
                              {item.statusKepegawaian || 'PNS'}
                            </td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {item.jabatan}
                              </span>
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
                  Opsi Penempatan Data
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
                      name="teacherImportMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Tambahkan ke Data Guru Saat Ini
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menyisipkan guru baru tanpa menghapus daftar pendidik yang sudah ada.
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
                      name="teacherImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Gantikan Seluruh Data Guru
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Menghapus data guru lama dan mengganti dengan data yang baru diimpor.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                {validCount > 0 ? `${validCount} guru siap diproses` : 'Pilih file/tempel data untuk mulai'}
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
                  <span>Proses Import ({validCount} Guru)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Single Teacher */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editing ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Guru *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  placeholder="Contoh: 198503152010011012 atau isi -"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tugas Utama *</label>
                  {isAdmin && !isPersonalWorkspace ? (
                    <select
                      value={modalRoleType}
                      onChange={(e) => setModalRoleType(e.target.value as 'WALI_KELAS' | 'GURU_MAPEL')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white focus:border-blue-600 outline-none text-slate-800"
                    >
                      <option value="WALI_KELAS">Wali Kelas</option>
                      <option value="GURU_MAPEL">Guru Mapel</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 font-medium">
                      Otomatis
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && !isPersonalWorkspace && modalRoleType === 'WALI_KELAS' && (
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-950 text-xs">Tugas Utama: Wali Kelas</h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Data guru akan terdaftar dengan tugas utama <strong>Wali Kelas</strong>. Rombel/nama kelas binaan dapat ditentukan langsung saat menambah kelas di menu <strong>Data Kelas</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && !isPersonalWorkspace && modalRoleType === 'GURU_MAPEL' && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-xs">Tugas Utama: Guru Mapel</h4>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Data guru akan terdaftar dengan tugas utama <strong>Guru Mapel</strong>. Penetapan mata pelajaran dan kelas yang diajar dapat ditentukan melalui menu <strong>Data Mata Pelajaran</strong> dan <strong>Data Kelas</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isPersonalWorkspace ? (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900">
                  <ShieldCheck size={14} className="shrink-0 mt-0.5 text-indigo-600" />
                  <span>
                    <strong>Paket Guru Pro:</strong> Ruang Kerja Individu dibatasi maksimal 1 guru (1 Wali Kelas atau 1 Guru Mapel).
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-800">
                  <ShieldCheck size={14} className="shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Aturan Penugasan:</strong> Seorang guru tidak dapat bertindak ganda sebagai Wali Kelas sekaligus Guru Mapel dalam tahun ajaran yang sama.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Create Account */}
      {accountTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Buat Akun Pengguna untuk {accountTeacher.nama}
              </h3>
              <button
                type="button"
                onClick={() => setAccountTeacher(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Awal *</label>
                <input
                  type="text"
                  required
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Akun</label>
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value as 'WALI KELAS' | 'GURU MAPEL')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white focus:border-blue-600 outline-none"
                >
                  <option value="WALI KELAS">Wali Kelas</option>
                  <option value="GURU MAPEL">Guru Mapel</option>
                </select>
              </div>

              {accountRole === 'GURU MAPEL' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran *</label>
                    <select
                      required
                      value={accountSubjectId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setAccountSubjectId(id);
                        const sub = subjects.find((x) => x.id === id);
                        setAccountClassIds(sub?.targetClassIds || []);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white focus:border-blue-600 outline-none"
                    >
                      <option value="">Pilih mata pelajaran...</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}{sub.teacherId && sub.teacherId !== accountTeacher.id ? ' — sudah ditugaskan ke guru lain' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kelas yang Diajar *</label>
                    <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {classes.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={accountClassIds.includes(c.id)}
                            onChange={(e) => setAccountClassIds((v) => e.target.checked ? [...new Set([...v, c.id])] : v.filter((id) => id !== c.id))}
                            className="rounded text-blue-600"
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Penugasan kelas disimpan melalui subject_class_assignments.</p>
                  </div>
                </>
              )}

              {accountRole === 'WALI KELAS' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas Wali *</label>
                  <select
                    required
                    value={accountClassId}
                    onChange={(e) => setAccountClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="">Pilih kelas...</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Satu Wali Kelas hanya boleh memiliki satu kelas.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAccountTeacher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingAccount ? 'Memproses...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-sm">Hapus data guru?</h3>
              <p className="text-xs text-slate-500">
                Data guru dan seluruh data terkait, termasuk riwayat absensi, akan dihapus. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={isDeletingTeacher}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={removeTeacher}
                disabled={isDeletingTeacher}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingTeacher ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
