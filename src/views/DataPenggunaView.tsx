import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserAccount, UserRole, GeneratedAccountResult } from '../types';
import { exportGeneratedAccountsPdf } from '../utils/exportGeneratedAccountsPdf';
import {
  ArrowLeft,
  UserCheck,
  Search,
  Key,
  X,
  Trash2,
  Edit2,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Users,
  ShieldCheck,
  School,
  FileText,
  Eye,
  EyeOff,
  ChevronDown,
  Printer,
} from 'lucide-react';

export const DataPenggunaView: React.FC = () => {
  const {
    currentUser,
    users,
    classes,
    students,
    teachers,
    subjects,
    schoolProfile,
    systemConfig,
    deleteUser,
    updateUser,
    generateAccountsFromReferences,
    updateUserPassword,
    setActiveView,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'administrator' | 'guru' | 'siswa'>('administrator');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Generate Accounts Modal & Result State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResetExisting, setGenerateResetExisting] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedAccountResult[] | null>(null);
  const [resultFilterTab, setResultFilterTab] = useState<'ALL' | 'GURU' | 'SISWA' | 'KEPALA SEKOLAH'>('ALL');
  const [resultSearchTerm, setResultSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Edit User Modal State
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('ADMIN');
  const [editStudentId, setEditStudentId] = useState('');
  const [editTeacherType, setEditTeacherType] = useState<'wali_kelas' | 'guru_mapel'>('wali_kelas');
  const [editSingleClassId, setEditSingleClassId] = useState('');
  const [editClassIds, setEditClassIds] = useState<string[]>([]);

  // Change Password Modal State
  const [targetPasswordUser, setTargetPasswordUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(true);

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Password Display Check
  const isGoogleUser = (u: UserAccount): boolean => {
    if (u.isGoogleAuth === true || u.authProvider === 'google' || (u as any).provider === 'google') return true;
    const email = (u.email || '').trim().toLowerCase();
    if (email.endsWith('@gmail.com') || email.endsWith('@googlemail.com') || email.includes('belajar.id') || email.includes('google')) {
      return true;
    }
    return false;
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isTeacherRole = u.role === 'GURU' || u.role === 'WALI KELAS' || u.role === 'GURU MAPEL' || u.role === 'KEPALA SEKOLAH';
      const matchesTab =
        activeTab === 'siswa' ? u.role === 'SISWA' : activeTab === 'administrator' ? u.role === 'ADMIN' : isTeacherRole;
      const q = searchTerm.toLowerCase();
      return matchesTab && (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    });
  }, [users, searchTerm, activeTab]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const isTeacherRole = (role: UserRole) => role === 'GURU' || role === 'WALI KELAS' || role === 'GURU MAPEL';

  const getRoleBadge = (u: UserAccount) => {
    switch (u.role) {
      case 'ADMIN':
        return (
          <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">
            ADMIN
          </span>
        );
      case 'KEPALA SEKOLAH':
        return (
          <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-sky-700 border border-sky-200">
            KEPALA SEKOLAH
          </span>
        );
      case 'GURU':
      case 'GURU MAPEL':
      case 'WALI KELAS': {
        const uNameClean = (u.name || '').trim().toLowerCase();
        const uUsernameClean = (u.username || '').trim().toLowerCase();
        const matchedTeacher = teachers.find(
          (t) =>
            (t.nip && t.nip !== '-' && t.nip.trim().toLowerCase() === uUsernameClean) ||
            (t.nama && t.nama.trim().toLowerCase() === uNameClean)
        );

        // Explicit check for Guru Mapel
        const isExplicitMapel =
          u.role === 'GURU MAPEL' ||
          (u.classIds && u.classIds.length > 1) ||
          (matchedTeacher && (
            matchedTeacher.jabatan?.toLowerCase().includes('mapel') ||
            matchedTeacher.jenisPTK?.toLowerCase().includes('mapel') ||
            matchedTeacher.mataPelajaran?.toLowerCase() === 'guru mapel'
          )) ||
          subjects.some(
            (s) =>
              s.teacherId === u.id ||
              (matchedTeacher && s.teacherId === matchedTeacher.id) ||
              (s.teacherName && s.teacherName.trim().toLowerCase() === uNameClean)
          );

        // Check if explicitly assigned as Wali Kelas
        const isAssignedWali =
          u.role === 'WALI KELAS' ||
          (u.classIds && u.classIds.length === 1) ||
          classes.some(
            (c) =>
              c.waliKelasId === u.id ||
              (matchedTeacher && c.waliKelasId === matchedTeacher.id) ||
              (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === uNameClean)
          ) ||
          (matchedTeacher && (
            matchedTeacher.jabatan?.toLowerCase().includes('wali') ||
            matchedTeacher.jenisPTK?.toLowerCase().includes('wali') ||
            matchedTeacher.mataPelajaran?.toLowerCase() === 'wali kelas'
          ));

        if (isAssignedWali && !isExplicitMapel) {
          return (
            <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
              GURU (WALI KELAS)
            </span>
          );
        }

        return (
          <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
            GURU (MAPEL)
          </span>
        );
      }
      case 'SISWA':
      default:
        return (
          <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            SISWA
          </span>
        );
    }
  };

  const openEditUser = (u: UserAccount) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email || '');
    setEditUsername(u.username);
    setEditRole(u.role === 'WALI KELAS' ? 'GURU' : u.role);
    setEditStudentId(u.studentId || '');

    const existingClassIds = u.classIds || [];
    if (existingClassIds.length === 1) {
      setEditTeacherType('wali_kelas');
      setEditSingleClassId(existingClassIds[0]);
      setEditClassIds(existingClassIds);
    } else {
      setEditTeacherType(existingClassIds.length > 1 ? 'guru_mapel' : 'wali_kelas');
      setEditSingleClassId(existingClassIds[0] || '');
      setEditClassIds(existingClassIds);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editName.trim() || !editUsername.trim()) return;

    let targetClasses: string[] = [];
    if (isTeacherRole(editRole)) {
      if (editTeacherType === 'wali_kelas') {
        targetClasses = editSingleClassId ? [editSingleClassId] : [];
      } else {
        targetClasses = editClassIds;
      }
    }

    updateUser(editUser.id, {
      name: editName.trim(),
      email: editEmail.trim() || null,
      username: editUsername.trim(),
      role: editRole,
      studentId: editRole === 'SISWA' ? (editStudentId || null) : null,
      classIds: isTeacherRole(editRole) ? targetClasses : [],
    });

    setEditUser(null);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasswordUser || !newPassword.trim()) return;

    updateUserPassword(targetPasswordUser.id, newPassword.trim());
    setTargetPasswordUser(null);
    setNewPassword('');
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  const handleGenerateSubmit = async () => {
    setIsGenerating(true);
    try {
      const results = await generateAccountsFromReferences({
        resetExistingPasswords: generateResetExisting,
      });
      setGeneratedResults(results);
      setIsGenerateModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPassword = (pwd: string, idx: number) => {
    navigator.clipboard.writeText(pwd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to map UserAccount[] to GeneratedAccountResult[] for PDF export
  const mapUsersToExportAccounts = (userList: UserAccount[]): GeneratedAccountResult[] => {
    return userList.map((u) => {
      let category: 'ADMIN' | 'GURU' | 'SISWA' | 'KEPALA SEKOLAH' = 'ADMIN';
      let className = '';

      if (u.role === 'SISWA') {
        category = 'SISWA';
        const s = students.find((st) => st.id === u.studentId || st.nisn === u.username);
        className = s?.className || '';
        if (!className && u.classIds && u.classIds.length > 0) {
          const c = classes.find((cl) => cl.id === u.classIds![0]);
          className = c?.name || '';
        }
      } else if (u.role === 'KEPALA SEKOLAH') {
        category = 'KEPALA SEKOLAH';
      } else if (u.role === 'GURU' || u.role === 'WALI KELAS' || u.role === 'GURU MAPEL') {
        category = 'GURU';
        if (u.classIds && u.classIds.length > 0) {
          className = u.classIds
            .map((cid) => classes.find((c) => c.id === cid)?.name || cid)
            .join(', ');
        }
      } else {
        category = 'ADMIN';
      }

      let pwdDisplay = u.password || '';
      if (isGoogleUser(u)) {
        pwdDisplay = 'Google SSO';
      } else if (!pwdDisplay) {
        pwdDisplay = 'Tersimpan (Aman)';
      }

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        password: pwdDisplay,
        role: u.role,
        category,
        className,
        status: 'ACTIVE' as any,
      };
    });
  };

  // Export PDF handler from Generated Results Modal (Guru / Siswa)
  const handleExportGeneratedPDF = async (scope: 'GURU' | 'SISWA') => {
    if (!generatedResults || generatedResults.length === 0) {
      showToast('Tidak ada data akun hasil generate untuk diekspor.', 'error');
      return;
    }

    setIsExportingPdf(true);
    setShowExportMenu(false);
    try {
      let targetAccounts: GeneratedAccountResult[] = [];
      let filterCategory = 'ALL';
      let docTitle = 'DAFTAR HASIL GENERATE AKUN PENGGUNA & PASSWORD RESMI';

      if (scope === 'GURU') {
        targetAccounts = generatedResults.filter(
          (r) =>
            r.category === 'GURU' ||
            r.category === 'KEPALA SEKOLAH' ||
            r.role === 'GURU' ||
            r.role === 'WALI KELAS' ||
            r.role === 'GURU MAPEL' ||
            r.role === 'KEPALA SEKOLAH'
        );
        filterCategory = 'GURU';
        docTitle = 'DAFTAR HASIL GENERATE AKUN GURU, PENDIDIK & KEPALA SEKOLAH';
      } else if (scope === 'SISWA') {
        targetAccounts = generatedResults.filter(
          (r) => r.category === 'SISWA' || r.role === 'SISWA'
        );
        filterCategory = 'SISWA';
        docTitle = 'DAFTAR HASIL GENERATE AKUN PESERTA DIDIK (SISWA)';
      }

      if (targetAccounts.length === 0) {
        showToast(
          scope === 'GURU'
            ? 'Tidak ada data akun Guru / Pendidik untuk diekspor.'
            : 'Tidak ada data akun Siswa untuk diekspor.',
          'warning'
        );
        return;
      }

      await exportGeneratedAccountsPdf({
        schoolProfile,
        systemConfig,
        accounts: targetAccounts,
        categoryFilter: filterCategory,
        adminName: currentUser?.name || currentUser?.username || 'Administrator Sekolah',
        documentTitle: docTitle,
      });

      showToast(`Dokumen PDF ${scope === 'GURU' ? 'Akun Guru' : 'Akun Siswa'} berhasil diekspor dengan kop surat resmi.`, 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Gagal membuat dokumen PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredGeneratedResults = useMemo(() => {
    if (!generatedResults) return [];
    return generatedResults.filter((r) => {
      const matchTab =
        resultFilterTab === 'ALL'
          ? true
          : resultFilterTab === 'GURU'
          ? r.category === 'GURU'
          : resultFilterTab === 'SISWA'
          ? r.category === 'SISWA'
          : r.category === 'KEPALA SEKOLAH';
      const q = resultSearchTerm.toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        (r.className && r.className.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }, [generatedResults, resultFilterTab, resultSearchTerm]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div>
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          id="btn-back-dashboard"
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <UserCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Data Pengguna</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Kelola akun login (Administrator, Guru Wali Kelas / Mapel, Kepala Sekolah, dan Siswa).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            id="btn-generate-akun"
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Generate semua akun pengguna otomatis dari data referensi Guru & Siswa dengan password yang diacak"
          >
            <Sparkles size={15} />
            <span>Generate</span>
          </button>
        </div>
      </div>

      {/* Info Banner on User & Password Policy */}
      <div className="p-3.5 sm:p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
          <UserCheck size={16} />
        </div>
        <div className="space-y-0.5">
          <p className="font-bold text-blue-950">Struktur Peran Pengguna & Pembuatan Akun:</p>
          <p className="text-blue-800 leading-relaxed">
            • <b>Administrator</b>: Akses penuh ke seluruh konfigurasi, master data, dan akun pengguna.<br />
            • <b>Guru</b>: Terdiri dari <span className="font-bold text-blue-950">Guru Wali Kelas</span> (1 kelas binaan) dan <span className="font-bold text-blue-950">Guru Mapel</span> (beberapa rombel kelas).<br />
            • <b>Generate Akun</b>: Membuat akun & password acak otomatis dari data referensi, serta dilengkapi dengan fitur <b>Export PDF resmi</b> ber-kop surat pada jendela hasil generate.
          </p>
        </div>
      </div>

      {/* Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Tab Pengguna */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab('administrator'); setCurrentPage(1); }}
            className={`px-5 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTab === 'administrator' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Administrator
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('guru'); setCurrentPage(1); }}
            className={`px-5 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTab === 'guru' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Guru & KS
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('siswa'); setCurrentPage(1); }}
            className={`px-5 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTab === 'siswa' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Siswa
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari Username atau Nama..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>TAMPILKAN:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50/60">
                <th className="py-3.5 px-4 w-12 rounded-l-xl">NO</th>
                <th className="py-3.5 px-4">NAMA PENGGUNA</th>
                <th className="py-3.5 px-4 w-48">USERNAME</th>
                <th className="py-3.5 px-4 text-center w-44">PASSWORD</th>
                <th className="py-3.5 px-4 text-center w-44">HAK AKSES</th>
                <th className="py-3.5 px-4 text-center w-28 rounded-r-xl">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentUsers.length > 0 ? (
                currentUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{u.username}</td>
                    <td className="py-3.5 px-4 text-center">
                      {isGoogleUser(u) ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs hover:bg-slate-200/80 transition-all select-none"
                          title="Akun ini terdaftar / masuk menggunakan Akun Google (SSO)"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span className="font-extrabold text-[11px] text-slate-800 tracking-tight">Google</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 text-xs font-bold shadow-2xs hover:bg-emerald-100/80 transition-all select-none"
                          title="Akun ini menggunakan Auth Sistem (Username & Password)"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 109 113" fill="none">
                            <path d="M63.7076 110.284C60.848 113.885 55.0502 111.902 54.9854 107.307L53.9726 35.6662H97.7446C104.912 35.6662 108.823 44.0532 104.148 49.9406L63.7076 110.284Z" fill="#3ECF8E"/>
                            <path d="M45.297 2.71599C48.1566 -0.885444 53.9544 1.09789 54.0192 5.69264L54.5884 77.3338H11.2554C4.08838 77.3338 0.177372 68.9468 4.85237 63.0594L45.297 2.71599Z" fill="#249361"/>
                          </svg>
                          <span className="font-extrabold text-[11px] text-emerald-950 tracking-tight">Terenkripsi</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getRoleBadge(u)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Data & Username Pengguna"
                          id={`btn-edit-user-${u.id}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setTargetPasswordUser(u);
                            setNewPassword(u.password || '');
                            setShowModalPassword(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Ubah Password"
                          id={`btn-change-password-${u.id}`}
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Akun"
                          id={`btn-delete-user-${u.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Tidak ada akun pengguna yang terdaftar atau sesuai pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <div>
            TOTAL {filteredUsers.length} PENGGUNA
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" />
                <span>Edit Data Pengguna</span>
              </h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  NAMA PENGGUNA
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  EMAIL GOOGLE / EMAIL LOGIN
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="contoh: guru@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  USERNAME
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  HAK AKSES (ROLE)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="ADMIN">ADMINISTRATOR</option>
                  <option value="GURU">GURU (Wali Kelas / Guru Mapel)</option>
                  <option value="KEPALA SEKOLAH">KEPALA SEKOLAH</option>
                  <option value="SISWA">SISWA</option>
                </select>
              </div>

              {isTeacherRole(editRole) && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <label className="block text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                    TIPE PENUGASAN GURU
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTeacherType('wali_kelas')}
                      className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                        editTeacherType === 'wali_kelas'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} />
                        <span>Wali Kelas</span>
                      </div>
                      <p className={`text-[10px] mt-1 font-normal ${editTeacherType === 'wali_kelas' ? 'text-blue-100' : 'text-slate-400'}`}>
                        Hanya mengajar 1 kelas
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditTeacherType('guru_mapel')}
                      className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                        editTeacherType === 'guru_mapel'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={14} />
                        <span>Guru Mapel</span>
                      </div>
                      <p className={`text-[10px] mt-1 font-normal ${editTeacherType === 'guru_mapel' ? 'text-blue-100' : 'text-slate-400'}`}>
                        Mengajar beberapa kelas
                      </p>
                    </button>
                  </div>

                  {editTeacherType === 'wali_kelas' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                        PILIH KELAS BINAAN (1 KELAS)
                      </label>
                      <select
                        value={editSingleClassId}
                        onChange={(e) => setEditSingleClassId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-600 outline-none"
                      >
                        <option value="">Belum ditentukan (Pilih nanti)</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                        PILIH KELAS YANG DIAJAR (BISA LEBIH DARI 1)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                        {classes.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editClassIds.includes(c.id)}
                              onChange={(e) =>
                                setEditClassIds((v) =>
                                  e.target.checked ? [...v, c.id] : v.filter((id) => id !== c.id)
                                )
                              }
                              className="rounded text-blue-600"
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editRole === 'SISWA' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">HUBUNGKAN DENGAN SISWA</label>
                  <select
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="">Pilih siswa yang terhubung...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} — {s.nisn} ({s.className || 'Tanpa Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {targetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key size={16} className="text-blue-600" />
                <span>Ubah Password Akun</span>
              </h3>
              <button
                onClick={() => setTargetPasswordUser(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Pengguna:</span>
                  <span className="font-bold text-slate-800">{targetPasswordUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Username:</span>
                  <span className="font-mono text-slate-700">{targetPasswordUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Password Saat Ini:</span>
                  <span className="font-mono font-bold text-blue-700 select-all">
                    {targetPasswordUser.password || '-'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    PASSWORD BARU
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
                      let gen = '';
                      for (let i = 0; i < 6; i++) {
                        gen += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewPassword(gen);
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Acak Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-semibold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Password dapat langsung dilihat tanpa sensor.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetPasswordUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Hapus Akun Pengguna?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{userToDelete.name}</strong> (@{userToDelete.username})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Confirmation Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Generate Akun Pengguna & Password Acak</h3>
                  <p className="text-[11px] text-slate-500">Sinkronisasi & pembuatan akun otomatis dari Data Referensi</p>
                </div>
              </div>
              <button
                onClick={() => !isGenerating && setIsGenerateModalOpen(false)}
                disabled={isGenerating}
                className="text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="block text-lg font-black text-blue-700">{teachers.length}</span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Data Guru</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="block text-lg font-black text-emerald-700">{students.length}</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Data Siswa</span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="block text-lg font-black text-purple-700">{schoolProfile.namaKepalaSekolah ? '1' : '0'}</span>
                  <span className="text-[10px] font-bold text-purple-600 uppercase">Kepala Sekolah</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-700" />
                  Bagaimana Proses Generate Bekerja?
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                  <li>Membaca semua data Guru dan Siswa yang telah tersimpan di Data Referensi.</li>
                  <li>Membuatkan akun login dan <b>men-generate password acak 8 karakter</b> untuk masing-masing pengguna.</li>
                  <li>Menyimpan dan menghubungkan pembagian kelas bagi Guru Wali Kelas dan Guru Mapel secara otomatis.</li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={generateResetExisting}
                  onChange={(e) => setGenerateResetExisting(e.target.checked)}
                  disabled={isGenerating}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">Acak ulang password akun yang sudah terdaftar</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Centang opsi ini jika Anda ingin memperbarui dan mengganti password lama seluruh guru dan siswa dengan password acak baru.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSubmit}
                  disabled={isGenerating}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-75"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sedang Mengenerate...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Mulai Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Accounts Result Modal */}
      {generatedResults && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Check size={20} className="stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Hasil Generate Akun & Password Acak</h3>
                  <p className="text-xs text-slate-500">
                    Total {generatedResults.length} akun diproses ({generatedResults.filter(r => r.status === 'CREATED').length} akun baru dibuat, {generatedResults.filter(r => r.status === 'UPDATED').length} password diacak ulang).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Export PDF Button with 2 Choices: Guru / Siswa */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExportMenu((prev) => !prev)}
                    disabled={isExportingPdf || !generatedResults || generatedResults.length === 0}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Pilih untuk mengekspor PDF Akun Guru atau Akun Siswa"
                    id="btn-export-pdf-generated"
                  >
                    {isExportingPdf ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Printer size={13} />
                    )}
                    <span>Export PDF</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-slate-800">
                        <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Pilihan Cetak Dokumen PDF
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleExportGeneratedPDF('GURU')}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50/80 flex items-center gap-3 transition-colors cursor-pointer group"
                          id="btn-export-pdf-guru"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
                            <GraduationCap size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                              Export PDF Guru
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Cetak Akun Guru & Tendik ({generatedResults?.filter(r => r.category === 'GURU' || r.category === 'KEPALA SEKOLAH' || r.role === 'GURU' || r.role === 'WALI KELAS' || r.role === 'GURU MAPEL' || r.role === 'KEPALA SEKOLAH').length || 0} akun)
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportGeneratedPDF('SISWA')}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50/80 flex items-center gap-3 transition-colors cursor-pointer group"
                          id="btn-export-pdf-siswa"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
                            <Users size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                              Export PDF Siswa
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Cetak Akun Peserta Didik ({generatedResults?.filter(r => r.category === 'SISWA' || r.role === 'SISWA').length || 0} akun)
                            </div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setGeneratedResults(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setResultFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    resultFilterTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua ({generatedResults.length})
                </button>
                <button
                  onClick={() => setResultFilterTab('GURU')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    resultFilterTab === 'GURU' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Guru ({generatedResults.filter(r => r.category === 'GURU').length})
                </button>
                <button
                  onClick={() => setResultFilterTab('SISWA')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    resultFilterTab === 'SISWA' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Siswa ({generatedResults.filter(r => r.category === 'SISWA').length})
                </button>
                <button
                  onClick={() => setResultFilterTab('KEPALA SEKOLAH')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    resultFilterTab === 'KEPALA SEKOLAH' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kepala Sekolah ({generatedResults.filter(r => r.category === 'KEPALA SEKOLAH').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={resultSearchTerm}
                  onChange={(e) => setResultSearchTerm(e.target.value)}
                  placeholder="Cari nama / username..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Result Table Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredGeneratedResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">Tidak ada data akun yang cocok dengan filter / pencarian.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">No</th>
                        <th className="py-2.5 px-3">Nama Pengguna</th>
                        <th className="py-2.5 px-3">Username (ID Login)</th>
                        <th className="py-2.5 px-3">Peran / Kategori</th>
                        <th className="py-2.5 px-3">Password Acak</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGeneratedResults.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {r.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 text-[11px]">
                            {r.username}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                r.category === 'GURU'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : r.category === 'SISWA'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                            >
                              {r.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {r.password ? (
                              <div className="flex items-center gap-1.5">
                                <code className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg font-mono font-black text-xs">
                                  {r.password}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(r.password!, idx)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="Salin password"
                                >
                                  {copiedIndex === idx ? (
                                    <Check size={13} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Tidak diubah</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {r.className || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.status === 'CREATED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Baru Dibuat
                              </span>
                            ) : r.status === 'UPDATED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                Diacak Ulang
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                Sudah Ada
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 rounded-b-2xl">
              <p className="text-[11px] text-slate-500">
                💡 <b>Catatan:</b> Anda dapat mengekspor daftar akun hasil generate ini ke dokumen PDF resmi ber-kop surat melalui tombol <b>Export PDF</b> (Guru / Siswa) di pojok kanan atas.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setGeneratedResults(null)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
