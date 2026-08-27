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
  AlertCircle
} from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';

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
    addUser,
    showToast,
    activeWorkspace,
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
  const [open, setOpen] = useState(false);

  // Quick Create Account Modal State
  const [accountTeacher, setAccountTeacher] = useState<Teacher | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState<'GURU MAPEL' | 'WALI KELAS'>('WALI KELAS');
  const [accountClassId, setAccountClassId] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [guruType, setGuruType] = useState<'Wali Kelas' | 'Guru Mapel'>('Wali Kelas');

  // Import Guru Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacherItem[]>([]);

  const baseTeacherList = useMemo(() => {
    return teachers;
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return baseTeacherList.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        (t.jabatan && t.jabatan.toLowerCase().includes(q)) ||
        (t.jenisPTK && t.jenisPTK.toLowerCase().includes(q)) ||
        (t.mataPelajaran && t.mataPelajaran.toLowerCase().includes(q))
    );
  }, [baseTeacherList, searchTerm]);

  // Helper untuk mengecek akun guru
  const getTeacherAccount = (t: Teacher) => {
    const teacherNip = (t.nip || '').trim().toLowerCase();
    const teacherName = (t.nama || '').trim().toLowerCase();
    return users.find(
      (u) =>
        (teacherNip && teacherNip !== '-' && u.username.toLowerCase() === teacherNip) ||
        u.name.trim().toLowerCase() === teacherName
    );
  };

  const defaultPersonalRole =
    currentUser?.role === 'GURU MAPEL' || currentUser?.role === 'GURU_MAPEL' ? 'Guru Mapel' : 'Wali Kelas';

  const resetForm = () => {
    setNama('');
    setNip('');
    setJenisKelamin('L');
    setGuruType(isPersonalWorkspace ? defaultPersonalRole : 'Wali Kelas');
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
    
    // Ambil penugasan jabatan sesuai data yang disimpan
    const explicitJabatan = String(t.jabatan || t.jenisPTK || t.mataPelajaran || '').trim().toLowerCase();
    let resolvedType: 'Wali Kelas' | 'Guru Mapel' = 'Wali Kelas';

    if (explicitJabatan.includes('mapel') || explicitJabatan.includes('mata pelajaran')) {
      resolvedType = 'Guru Mapel';
    } else if (explicitJabatan.includes('wali') || explicitJabatan.includes('kelas')) {
      resolvedType = 'Wali Kelas';
    } else if (t.jabatan === 'Guru Mapel' || t.jabatan === 'Wali Kelas') {
      resolvedType = t.jabatan;
    } else if (t.mataPelajaran && t.mataPelajaran !== '-' && !t.mataPelajaran.toLowerCase().includes('wali')) {
      resolvedType = 'Guru Mapel';
    } else {
      resolvedType = 'Wali Kelas';
    }

    setGuruType(resolvedType);
    setOpen(true);
  };

  const openCreateAccountModal = (t: Teacher) => {
    setAccountTeacher(t);
    const cleanNip = (t.nip || '').trim();
    const defaultUsername = cleanNip && cleanNip !== '-' 
      ? cleanNip.toLowerCase().replace(/[^a-z0-9]/g, '')
      : t.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    
    // Cari apakah guru ini ditugaskan di salah satu Data Kelas
    const matchedClass = classes.find(
      (c) => c.waliKelasId === t.id || (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === t.nama.trim().toLowerCase())
    );

    const isWali = (t.jabatan || '').toLowerCase().includes('wali') || !!matchedClass;
    setAccountUsername(defaultUsername);
    setAccountPassword('123456');
    setAccountEmail('');
    setAccountRole(isWali ? 'WALI KELAS' : 'GURU MAPEL');
    setAccountClassId(matchedClass ? matchedClass.id : '');
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTeacher || !accountUsername.trim() || !accountPassword.trim()) return;

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
        classIds: accountClassId ? [accountClassId] : [],
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

    const targetRole = guruType === 'Wali Kelas' ? 'wali_kelas' : 'guru_mapel';
    if (editing) {
      const validation = validateTeacherRoleAssignment(
        editing.id,
        targetRole,
        classes,
        subjects,
        schoolProfile.tahunPelajaran
      );
      if (!validation.valid) {
        showToast(validation.errorMessage || 'Konflik peran guru terdeteksi.', 'error');
        return;
      }
    }

    const payload = {
      nama: nama.trim(),
      nip: nip.trim(),
      jenisKelamin,
      jabatan: guruType,
      jenisPTK: guruType,
      mataPelajaran: guruType,
      statusKepegawaian: 'PNS',
      noHp: '',
    };

    if (editing) await updateTeacher(editing.id, payload);
    else await addTeacher(payload);
    setOpen(false);
  };

  const removeTeacher = async () => {
    if (!deleting) return;
    await deleteTeacher(deleting.id);
    setDeleting(null);
  };

  // Download Template CSV Guru
  const handleDownloadTemplate = () => {
    const header = 'NAMA GURU,NIP,JENIS KELAMIN,PENUGASAN,STATUS KEPEGAWAIAN,NO HP\n';
    const sampleRows = [
      'Budi Santoso, S.Pd.,198503152010011012,L,Wali Kelas,PNS,081234567890',
      'Siti Aminah, M.Pd.,199008222015022003,P,Guru Mapel,PPPK,081398765432',
      'Rahmat Hidayat, S.Pd.,198811102012011005,L,Wali Kelas,PNS,085612345678',
      'Dewi Lestari, S.Pd.,-,P,Guru Mapel,Honorer,087812345678',
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

    // Detect if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('nama') ||
      firstLineLower.includes('nip') ||
      firstLineLower.includes('guru') ||
      firstLineLower.includes('gender') ||
      firstLineLower.includes('jenis kelamin') ||
      firstLineLower.includes('penugasan') ||
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
        const rawJabatan = tokens[3] || 'Wali Kelas';
        const rawStatus = tokens[4] || 'PNS';
        const rawNoHp = tokens[5] || '';

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

        // Clean penugasan
        let jabatan = 'Wali Kelas';
        const jLower = rawJabatan.toLowerCase();
        if (jLower.includes('mapel') || jLower.includes('mata pelajaran')) {
          jabatan = 'Guru Mapel';
        }

        const isValid = rawNama.trim().length > 0;
        let error = undefined;
        if (!rawNama.trim()) error = 'Nama guru kosong';

        results.push({
          nama: rawNama.trim(),
          nip: rawNip.trim() || '-',
          jenisKelamin: gender,
          jabatan,
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
      nip: t.nip,
      jenisKelamin: t.jenisKelamin,
      jabatan: t.jabatan,
      jenisPTK: t.jabatan,
      mataPelajaran: t.jabatan,
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
          placeholder="Cari Nama, NIP, atau Wali Kelas / Guru Mapel..."
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
              <th className="py-3.5 px-4 w-36 text-center">PENUGASAN</th>
              <th className="py-3.5 px-4 w-36 text-center">STATUS AKUN</th>
              {canEdit && <th className="py-3.5 px-4 w-24 text-center rounded-r-xl">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t, idx) => {
                const explicitJabatan = String(t.jabatan || t.jenisPTK || t.mataPelajaran || '').trim().toLowerCase();
                let displayType: 'Wali Kelas' | 'Guru Mapel' = 'Wali Kelas';

                if (explicitJabatan.includes('mapel') || explicitJabatan.includes('mata pelajaran')) {
                  displayType = 'Guru Mapel';
                } else if (explicitJabatan.includes('wali') || explicitJabatan.includes('kelas')) {
                  displayType = 'Wali Kelas';
                } else if (t.jabatan === 'Guru Mapel' || t.jabatan === 'Wali Kelas') {
                  displayType = t.jabatan;
                } else if (t.mataPelajaran && t.mataPelajaran !== '-' && !t.mataPelajaran.toLowerCase().includes('wali')) {
                  displayType = 'Guru Mapel';
                } else {
                  displayType = 'Wali Kelas';
                }

                const isGuruMapel = displayType === 'Guru Mapel';
                const account = getTeacherAccount(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.nama}</td>
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
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isGuruMapel ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {displayType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {account ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          <span>{account.username}</span>
                        </span>
                      ) : (
                        isAdmin && (
                          <button
                            type="button"
                            onClick={() => openCreateAccountModal(t)}
                            title="Buat akun login pengguna untuk guru ini"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition cursor-pointer"
                          >
                            <UserPlus size={12} />
                            <span>Buat Akun</span>
                          </button>
                        )
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleting(t)}
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
                    placeholder="Tempel data guru dari spreadsheet Excel di sini...&#10;Contoh:&#10;Budi Santoso, S.Pd.&#9;198503152010011012&#9;L&#9;Wali Kelas&#10;Siti Aminah, M.Pd.&#9;199008222015022003&#9;P&#9;Guru Mapel"
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
                          <th className="p-2">Penugasan</th>
                          <th className="p-2 text-center w-16">Status</th>
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
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
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
                  <label className="block font-bold text-slate-700 mb-1">Penugasan Jabatan</label>
                  <select
                    value={guruType}
                    onChange={(e) => setGuruType(e.target.value as 'Wali Kelas' | 'Guru Mapel')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Guru Mapel">Guru Mapel</option>
                  </select>
                </div>
              </div>

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
              <h3 className="font-extrabold text-slate-900 text-sm">Hapus Data Guru?</h3>
              <p className="text-xs text-slate-500">
                Data guru <strong>{deleting.nama}</strong> akan dihapus dari daftar master guru.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={removeTeacher}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 cursor-pointer"
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
