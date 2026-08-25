import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import { Plus, Edit2, Trash2, X, Search, UsersRound, UserPlus, CheckCircle2 } from 'lucide-react';

const GURU_OPTIONS: Array<'Wali Kelas' | 'Guru Mapel'> = ['Wali Kelas', 'Guru Mapel'];

export const DataGuruView: React.FC = () => {
  const { currentUser, teachers, users, classes, addTeacher, updateTeacher, deleteTeacher, addUser, showToast } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [open, setOpen] = useState(false);

  // Quick Create Account Modal State
  const [accountTeacher, setAccountTeacher] = useState<Teacher | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState<'GURU MAPEL' | 'WALI KELAS' | 'GURU'>('WALI KELAS');
  const [accountClassId, setAccountClassId] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [guruType, setGuruType] = useState<'Wali Kelas' | 'Guru Mapel'>('Wali Kelas');

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return teachers.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        (t.jabatan && t.jabatan.toLowerCase().includes(q)) ||
        (t.jenisPTK && t.jenisPTK.toLowerCase().includes(q)) ||
        (t.mataPelajaran && t.mataPelajaran.toLowerCase().includes(q))
    );
  }, [teachers, searchTerm]);

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

  const resetForm = () => {
    setNama('');
    setNip('');
    setJenisKelamin('L');
    setGuruType('Wali Kelas');
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setNama(t.nama);
    setNip(t.nip);
    setJenisKelamin(t.jenisKelamin);
    const existingType = t.jabatan || t.jenisPTK || t.mataPelajaran || 'Wali Kelas';
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
            <h2 className="text-lg font-black text-slate-900">Data Guru</h2>
            <p className="text-xs text-slate-500">Data master pendidik (Nama, NIP, Jenis Kelamin, dan Penugasan Guru).</p>
          </div>
        </div>
        {isAdmin && (
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
              {isAdmin && <th className="py-3.5 px-4 w-24 text-center rounded-r-xl">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t, idx) => {
                const displayType = t.jabatan || t.jenisPTK || t.mataPelajaran || 'Wali Kelas';
                const isGuruMapel = displayType.toLowerCase().includes('mapel');

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
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Guru"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Data Guru"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-slate-400 font-medium">
                  Belum ada data guru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Create Account Modal */}
      {accountTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Buat Akun Guru</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{accountTeacher.nama}</p>
                </div>
              </div>
              <button onClick={() => setAccountTeacher(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  USERNAME LOGIN
                </label>
                <input
                  type="text"
                  required
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value)}
                  placeholder="Username untuk login"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Otomatis menggunakan NIP atau nama guru.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  PASSWORD
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Password akun"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  HAK AKSES / PERAN
                </label>
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="WALI KELAS">WALI KELAS (Kelola 1 Kelas Binaan)</option>
                  <option value="GURU MAPEL">GURU MAPEL (Bisa Mengajar Multi Kelas)</option>
                </select>
              </div>

              {accountRole === 'WALI KELAS' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    KELAS BINAAN
                  </label>
                  <select
                    value={accountClassId}
                    onChange={(e) => setAccountClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="">Belum ditentukan / Pilih nanti</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  EMAIL GOOGLE (OPSIONAL)
                </label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="guru@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAccountTeacher(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isCreatingAccount ? 'Memproses...' : 'Buat Akun Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">{editing ? 'Edit Data Guru' : 'Tambah Data Guru'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">NAMA GURU</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama Lengkap & Gelar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  NIP / NUPTK (OPSIONAL)
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Nomor Induk Pegawai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">JENIS KELAMIN</label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">GURU</label>
                  <select
                    value={guruType}
                    onChange={(e) => setGuruType(e.target.value as 'Wali Kelas' | 'Guru Mapel')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none cursor-pointer"
                  >
                    {GURU_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editing ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Hapus Data Guru?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Apakah Anda yakin ingin menghapus data guru <strong className="text-slate-800">{deleting.nama}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={removeTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
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
