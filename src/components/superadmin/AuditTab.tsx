import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Filter,
  Shield,
  Download,
  Clock,
  User,
  Building2,
  Calendar
} from 'lucide-react';

export const AuditTab: React.FC<{
  call: any;
  showToast: any;
}> = ({ call, showToast }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await call('audit', { limit: 150 });
      setLogs(res.logs || []);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.actor_username || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.school_name || '').toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === 'all' || l.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const header = ['Waktu', 'Aktor', 'Role', 'Sekolah Terkait', 'Aksi', 'IP Address', 'Detail'];
    const rows = filteredLogs.map((l) => [
      l.created_at ? new Date(l.created_at).toISOString() : '',
      l.actor_username || l.actor_id || '-',
      l.actor_role || '-',
      l.school_name || '-',
      l.action || '-',
      l.ip_address || '-',
      JSON.stringify(l.details || {}).replace(/"/g, '""'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Audit Forensik Keamanan Platform</h2>
          <p className="text-xs text-slate-500">Rekam jejak setiap perubahan kredensial, lisensi sekolah, status tenant, dan aktivitas super admin.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} /> Unduh CSV
          </button>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aktor, aksi, sekolah, atau detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700"
        >
          <option value="all">Semua Tipe Aksi</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Aktor / Pengguna</th>
                <th className="px-5 py-3.5">Aksi Sistem</th>
                <th className="px-5 py-3.5">Target / Sekolah</th>
                <th className="px-5 py-3.5">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Memuat rekaman jejak audit...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l, idx) => (
                  <tr key={l.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 text-slate-500 font-mono whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : 'Baru saja'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        {l.actor_username || l.actor_name || 'System / Auto'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{l.actor_role || 'SUPER_ADMIN'}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-bold">
                        {l.action}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-700 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" />
                        {l.school_name || 'Global Platform'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
