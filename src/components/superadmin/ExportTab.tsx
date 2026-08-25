import React, { useState } from 'react';
import {
  Download,
  Building2,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Layers,
  Database
} from 'lucide-react';

export const ExportTab: React.FC<{
  call: any;
  showToast: any;
}> = ({ call, showToast }) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSchools = async () => {
    setDownloading('schools');
    try {
      const res = await call('list');
      const schools = res.schools || [];
      const headers = ['ID', 'Nama Sekolah', 'NPSN', 'Paket', 'Status', 'Siswa Terdaftar', 'Guru Terdaftar', 'Masa Berlaku'];
      const rows = schools.map((s: any) => [
        s.school_id,
        s.name,
        s.npsn || '-',
        s.plan,
        s.status,
        s.student_count || 0,
        s.teacher_admin_count || 0,
        s.subscription_expires_at || 'Tanpa Batas',
      ]);
      downloadCSV('data_tenant_sekolah', headers, rows);
      showToast('Data tenant sekolah berhasil diekspor.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportAudit = async () => {
    setDownloading('audit');
    try {
      const res = await call('audit', { limit: 500 });
      const logs = res.logs || [];
      const headers = ['Waktu', 'Aktor', 'Role', 'Sekolah Terkait', 'Aksi', 'IP Address', 'Detail'];
      const rows = logs.map((l: any) => [
        l.created_at ? new Date(l.created_at).toISOString() : '',
        l.actor_username || l.actor_id || '-',
        l.actor_role || '-',
        l.school_name || '-',
        l.action || '-',
        l.ip_address || '-',
        JSON.stringify(l.details || {}),
      ]);
      downloadCSV('data_audit_forensik', headers, rows);
      showToast('Rekaman audit forensik berhasil diekspor.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportUsers = async () => {
    setDownloading('users');
    try {
      const res = await call('list_users', { school_id: 'all' });
      const users = res.users || [];
      const headers = ['ID', 'Nama', 'Username', 'Email', 'Peran', 'Tenant / Sekolah', 'Paket', 'Status', 'Dibuat Pada'];
      const rows = users.map((u: any) => [
        u.id,
        u.name || '-',
        u.username || '-',
        u.email || '-',
        u.role || 'ADMIN',
        u.school_name || 'Ruang Kerja Individu',
        u.school_plan || 'mulai',
        u.is_active !== false ? 'Aktif' : 'Nonaktif',
        u.created_at || '-',
      ]);
      downloadCSV('data_pengguna_platform', headers, rows);
      showToast('Data seluruh pengguna platform berhasil diekspor.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Pusat Ekspor Data Multi-Tenant & Multi-Paket</h2>
        <p className="text-xs text-slate-500">Unduh cadangan data instansi, pengguna seluruh paket, dan catatan forensik sistem dalam format CSV.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Card 1: Tenant List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Direktori Tenant & Ruang Kerja</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Daftar seluruh instansi sekolah & ruang kerja (Paket Mulai, Guru, Sekolah), kuota kapasitas, NPSN, dan masa aktif.
            </p>
          </div>

          <button
            onClick={handleExportSchools}
            disabled={downloading === 'schools'}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {downloading === 'schools' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh CSV Tenant
          </button>
        </div>

        {/* Card 2: User List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Direktori Seluruh Pengguna</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Daftar akun admin, kepala sekolah, wali kelas, guru mata pelajaran, dan siswa lintas semua paket platform.
            </p>
          </div>

          <button
            onClick={handleExportUsers}
            disabled={downloading === 'users'}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {downloading === 'users' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh CSV Pengguna
          </button>
        </div>

        {/* Card 3: Audit Logs */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Log Audit Forensik Sistem</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Riwayat lengkap tindakan keamanan, pembuatan tenant, mutasi kredensial admin, dan status toggle (maks. 500 riwayat).
            </p>
          </div>

          <button
            onClick={handleExportAudit}
            disabled={downloading === 'audit'}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {downloading === 'audit' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh CSV Audit Forensik
          </button>
        </div>
      </div>
    </div>
  );
};
