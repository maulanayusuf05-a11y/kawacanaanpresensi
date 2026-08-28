import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  KeyRound,
  Power,
  Building2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  UserCheck,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  Trash2
} from 'lucide-react';

export const AdminsTab: React.FC<{
  call: any;
  showToast: any;
  initialSchoolId?: string;
}> = ({ call, showToast, initialSchoolId }) => {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(initialSchoolId || '');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetModal, setResetModal] = useState<{ userId: string; name: string; username: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; username: string; role: string; school_name?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'ADMIN',
  });

  // Load School List
  useEffect(() => {
    (async () => {
      setLoadingSchools(true);
      try {
        const res = await call('list');
        const list = res.schools || [];
        setSchools(list);
        if (!selectedSchoolId && list.length > 0) {
          setSelectedSchoolId(list[0].school_id || list[0].id);
        }
      } catch (e: any) {
        showToast(e.message, 'error');
      } finally {
        setLoadingSchools(false);
      }
    })();
  }, []);

  // Update selected if initialSchoolId changes
  useEffect(() => {
    if (initialSchoolId) {
      setSelectedSchoolId(initialSchoolId);
    }
  }, [initialSchoolId]);

  // Load All Users for Selected School
  const loadSchoolUsers = async () => {
    setLoading(true);
    try {
      // Panggil list_users dengan school_id (atau 'all' untuk lintas tenant)
      const res = await call('list_users', { school_id: selectedSchoolId || 'all' });
      setUsers(res.users || res.admins || []);
    } catch (e: any) {
      try {
        const fallbackRes = await call('list_admins', { school_id: selectedSchoolId || 'all' });
        setUsers(fallbackRes.admins || []);
      } catch (err: any) {
        showToast(err.message || e.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolUsers();
  }, [selectedSchoolId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchool = selectedSchoolId === 'all' ? (form as any).school_id : selectedSchoolId;
    if (!targetSchool) {
      showToast('Pilih sekolah atau ruang kerja tujuan terlebih dahulu.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await call('create_admin', {
        school_id: targetSchool,
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      showToast(`Akun ${form.role} (${form.name}) berhasil dibuat.`, 'success');
      setIsCreateOpen(false);
      setForm({ name: '', email: '', username: '', password: '', role: 'ADMIN' });
      loadSchoolUsers();
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat akun.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModal) return;
    setIsSubmitting(true);
    try {
      await call('reset_admin_password', {
        user_id: resetModal.userId,
        password: newPassword,
      });
      showToast(`Kata sandi untuk @${resetModal.username} berhasil direset.`, 'success');
      setResetModal(null);
      setNewPassword('');
    } catch (e: any) {
      showToast(e.message || 'Gagal mereset kata sandi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUser = async (usr: any) => {
    const next = !usr.is_active;
    try {
      await call('toggle_admin', { user_id: usr.id, is_active: next });
      showToast(`Status akun berhasil diubah menjadi ${next ? 'Aktif' : 'Nonaktif'}.`, 'success');
      loadSchoolUsers();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengubah status akun.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await call('delete_user', { user_id: userToDelete.id });
      showToast(res.message || `Pengguna ${userToDelete.name} berhasil dihapus.`, 'success');
      setUserToDelete(null);
      loadSchoolUsers();
    } catch (e: any) {
      showToast(e.message || 'Gagal menghapus pengguna.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSchool = useMemo(() => {
    return schools.find((s) => (s.school_id || s.id) === selectedSchoolId);
  }, [schools, selectedSchoolId]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length, ADMIN: 0, 'KEPALA SEKOLAH': 0, 'WALI KELAS': 0, 'GURU MAPEL': 0, SISWA: 0 };
    users.forEach((u) => {
      const r = u.role || 'ADMIN';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'KEPALA SEKOLAH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'WALI KELAS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'GURU MAPEL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SISWA':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Manajemen Akun & Pengguna Sekolah</h2>
          <p className="text-xs text-slate-500">Kelola seluruh akun pengguna (Admin, Kepala Sekolah, Wali Kelas, Guru) terintegrasi per sekolah.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          disabled={!selectedSchoolId}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/20 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} /> Tambah Akun Pengguna
        </button>
      </div>

      {/* School Selector & Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Pilih Tenant / Ruang Kerja:</label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">🌐 Semua Tenant & Ruang Kerja (Platform-wide)</option>
              {loadingSchools ? (
                <option disabled>Memuat daftar tenant sekolah & ruang kerja...</option>
              ) : (
                schools.map((s) => {
                  const id = s.school_id || s.id;
                  const p = (s.plan || 'mulai').toLowerCase();
                  const planLabel = (p === 'school' || p === 'sekolah') ? 'Sekolah' : (p === 'teacher' || p === 'guru') ? 'Guru Mandiri' : 'Mulai/Gratis';
                  return (
                    <option key={id} value={id}>
                      {s.name} [{planLabel}] {s.npsn ? `· NPSN: ${s.npsn}` : '· Ruang Individu'}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50"
            />
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'Semua Pengguna', count: roleCounts.all },
            { id: 'ADMIN', label: 'Admin Sekolah', count: roleCounts.ADMIN },
            { id: 'KEPALA SEKOLAH', label: 'Kepala Sekolah', count: roleCounts['KEPALA SEKOLAH'] },
            { id: 'WALI KELAS', label: 'Wali Kelas', count: roleCounts['WALI KELAS'] },
            { id: 'GURU MAPEL', label: 'Guru Mapel', count: roleCounts['GURU MAPEL'] },
            { id: 'SISWA', label: 'Siswa', count: roleCounts.SISWA },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                roleFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Building2 size={15} className="text-indigo-600" />
            {selectedSchoolId === 'all' ? 'Seluruh Tenant & Ruang Kerja Platform' : (selectedSchool ? selectedSchool.name : 'Sekolah Terpilih')}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">{filteredUsers.length} Pengguna Ditampilkan</span>
            <button
              onClick={loadSchoolUsers}
              title="Segarkan Data Pengguna"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Nama & Username</th>
                <th className="px-5 py-3.5">Tenant / Ruang Kerja</th>
                <th className="px-5 py-3.5">Peran / Role</th>
                <th className="px-5 py-3.5">Status Akun</th>
                <th className="px-5 py-3.5">Aktivitas Terakhir</th>
                <th className="px-5 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    <RefreshCw size={18} className="animate-spin text-indigo-600 mx-auto mb-2" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Belum ada akun untuk kategori peran ini di tenant terpilih.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => {
                  const sName = usr.school_name || (schools.find((s) => (s.school_id || s.id) === usr.school_id)?.name) || 'Ruang Kerja';
                  const sPlan = (usr.school_plan || schools.find((s) => (s.school_id || s.id) === usr.school_id)?.plan || 'mulai').toLowerCase();
                  const isSchool = sPlan === 'school' || sPlan === 'sekolah';
                  const isTeacher = sPlan === 'teacher' || sPlan === 'guru';

                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{usr.name || usr.username}</div>
                        <div className="font-mono text-slate-400 text-[11px]">@{usr.username}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{sName}</div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isSchool ? 'bg-indigo-50 text-indigo-700' : isTeacher ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isSchool ? 'Paket Sekolah' : isTeacher ? 'Paket Guru' : 'Paket Mulai/Gratis'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(usr.role)}`}>
                          {usr.role || 'ADMIN'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            usr.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${usr.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {usr.is_active !== false ? 'Aktif' : 'Dinonaktifkan'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {usr.last_seen_at ? new Date(usr.last_seen_at).toLocaleString('id-ID') : 'Belum pernah login'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setResetModal({
                                userId: usr.id,
                                name: usr.name,
                                username: usr.username,
                              })
                            }
                            title="Reset Kata Sandi"
                            className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleUser(usr)}
                            title={usr.is_active !== false ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            className={`p-2 rounded-xl transition cursor-pointer ${
                              usr.is_active !== false
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() =>
                              setUserToDelete({
                                id: usr.id,
                                name: usr.name,
                                username: usr.username,
                                role: usr.role,
                                school_name: usr.school_name,
                              })
                            }
                            title="Hapus Akun Pengguna"
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Buat Akun Pengguna</h3>
                  <p className="text-xs text-slate-500">Untuk {selectedSchool?.name || 'Sekolah Terpilih'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran / Hak Akses Akun</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800"
                >
                  <option value="ADMIN">ADMIN SEKOLAH (Akses Penuh Manajemen)</option>
                  <option value="KEPALA SEKOLAH">KEPALA SEKOLAH (Monitoring & Cetak Laporan)</option>
                  <option value="WALI KELAS">WALI KELAS (Presensi Harian Kelas & Rekap)</option>
                  <option value="GURU MAPEL">GURU MATA PELAJARAN (Presensi Per Mapel)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Google / Email Login</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
                />
                <p className="mt-1 text-[10px] text-slate-400">Isi dengan email Google pengguna jika ingin login Google.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Username Login</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ahmad_fauzi"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password Awal (Min. 8 Karakter)</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Buat Akun Pengguna'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Reset Kata Sandi</h3>
                  <p className="text-xs text-slate-500">Akun: @{resetModal.username} ({resetModal.name})</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi Baru (Min. 8 Karakter)</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setResetModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Reset Kata Sandi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hapus Akun Pengguna</h3>
                  <p className="text-xs text-slate-500">Tindakan ini permanen dan tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nama:</span>
                  <span className="font-bold text-slate-800">{userToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Username:</span>
                  <span className="font-mono text-slate-700">@{userToDelete.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Peran / Role:</span>
                  <span className="font-bold text-indigo-700">{userToDelete.role}</span>
                </div>
                {userToDelete.school_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Ruang Kerja:</span>
                    <span className="font-semibold text-slate-700">{userToDelete.school_name}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 text-rose-600 mt-0.5" />
                <span>
                  Akun autentikasi, profil guru/siswa, dan hak akses pengguna ini akan dihapus secara menyeluruh dari database.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteUser}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Hapus Pengguna
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
