import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import { Plus, Edit2, Trash2, X, Search, UsersRound, UserPlus, CheckCircle2, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { validateTeacherRoleAssignment } from '../utils/packageSystem';

const GURU_OPTIONS: Array<'Wali Kelas' | 'Guru Mapel'> = ['Wali Kelas', 'Guru Mapel'];

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

  // Teacher record corresponding to current user
  const ownTeacherRecord = useMemo(() => {
    if (!currentUser) return null;
    const uName = (currentUser.name || '').trim().toLowerCase();
    const uUsername = (currentUser.username || '').trim().toLowerCase();
    return (
      teachers.find(
        (t) =>
          (t.id && t.id === currentUser.id) ||
          (t.nip && t.nip !== '-' && t.nip.trim().toLowerCase() === uUsername) ||
          (t.nama && t.nama.trim().toLowerCase() === uName)
      ) || teachers[0] || null
    );
  }, [currentUser, teachers]);

  const baseTeacherList = useMemo(() => {
    if (isPersonalWorkspace) {
      return ownTeacherRecord ? [ownTeacherRecord] : teachers.slice(0, 1);
    }
    return teachers;
  }, [isPersonalWorkspace, ownTeacherRecord, teachers]);

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

  const defaultPersonalRole = currentUser?.role === 'GURU_MAPEL' ? 'Guru Mapel' : 'Wali Kelas';

  const resetForm = () => {
    setNama('');
    setNip('');
    setJenisKelamin('L');
    setGuruType(isPersonalWorkspace ? defaultPersonalRole : 'Wali Kelas');
  };

  const openAdd = () => {
    if (isPersonalWorkspace && baseTeacherList.length >= 1) {
      showToast('Batas Kuota Paket Guru Pro: Ruang Kerja Individu dibatasi maksimal 1 guru (1 Wali Kelas atau 1 Guru Mapel). Membuka formulir edit profil guru Anda...', 'info');
      if (baseTeacherList[0]) {
        openEdit(baseTeacherList[0]);
      }
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
    const existingType = t.jabatan || t.jenisPTK || t.mataPelajaran || defaultPersonalRole;
    setGuruType(existingType.toLowerCase().includes('mapel') ? 'Guru Mapel' : 'Wali Kelas');
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <UsersRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isPersonalWorkspace ? 'Data Guru (Profil Saya)' : 'Data Guru'}
            </h2>
            <p className="text-xs text-slate-500">
              {isPersonalWorkspace
                ? 'Profil data guru Anda di Ruang Kerja Individu. Anda dapat memperbarui data pribadi dan penugasan Anda.'
                : 'Master pendidik sekolah. Penugasan Wali Kelas dan Guru Mapel bersifat eksklusif per tahun ajaran.'}
            </p>
          </div>
        </div>
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
                const displayType = t.jabatan || t.jenisPTK || t.mataPelajaran || 'Wali Kelas';
                const isGuruMapel = displayType.toLowerCase().includes('mapel');
                const account = getTeacherAccount(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.nama}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{t.nip || '—'}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">{t.jenisKelamin}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          isGuruMapel
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isGuruMapel ? 'Guru Mapel' : 'Wali Kelas'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {account ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          {account.role}
                        </span>
                      ) : !isPersonalWorkspace ? (
                        <button
                          type="button"
                          onClick={() => openCreateAccountModal(t)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <UserPlus size={11} />
                          Buat Akun
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Akun Pengguna</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Guru"
                          >
                            <Edit2 size={14} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeleting(t)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data Guru"
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
                <td colSpan={canEdit ? 7 : 6} className="py-12 text-center text-slate-400">
                  Belum ada data guru yang sesuai
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit */}
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

            <form onSubmit={save} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 198503152010011002 atau - jika non-PNS"
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
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
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

