import React, { useState, useEffect } from 'react';
import {
  Settings2,
  Database,
  Globe,
  Sliders,
  Shield,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const SettingsTab: React.FC<{
  call: any;
  showToast: any;
}> = ({ call, showToast }) => {
  const [config, setConfig] = useState<any>({
    platform_name: 'Sistem Informasi Presensi Sekolah',
    allow_registration: false,
    maintenance_mode: false,
    grace_period_days: 7,
    max_free_students: 30,
    max_free_teachers: 1,
    max_free_classes: 1,
    max_teacher_students: 32,
    max_teacher_teachers: 1,
    max_teacher_classes: 1,
    max_school_students: 384,
    max_school_teachers: 16,
    max_school_classes: 12,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await call('get_config');
      if (res.config) {
        setConfig((prev: any) => ({ ...prev, ...res.config }));
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await call('update_config', { config });
      showToast('Konfigurasi platform berhasil diperbarui.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Konfigurasi Global & Batas Kuota</h2>
          <p className="text-xs text-slate-500">Sesuaikan aturan lisensi default, masa tenggang (grace period), dan parameter operasional.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Identity & Operational Mode */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Globe size={16} className="text-indigo-600" />
            Identitas & Mode Operasional Platform
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Brand Platform</label>
              <input
                type="text"
                value={config.platform_name}
                onChange={(e) => setConfig({ ...config, platform_name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Masa Tenggang / Grace Period (Hari)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={config.grace_period_days || 7}
                onChange={(e) => setConfig({ ...config, grace_period_days: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Sekolah tetap bisa akses 'read-only' selama N hari setelah expired sebelum terkunci total.
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 text-xs">Pendaftaran Publik Mandiri</div>
                <div className="text-[11px] text-slate-500">Izinkan sekolah mendaftar sendiri dari halaman awal</div>
              </div>
              <input
                type="checkbox"
                checked={config.allow_registration || false}
                onChange={(e) => setConfig({ ...config, allow_registration: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 cursor-pointer">
              <div>
                <div className="font-bold text-rose-900 text-xs">Mode Pemeliharaan (Maintenance)</div>
                <div className="text-[11px] text-rose-700">Kunci akses seluruh tenant sekolah kecuali Super Admin</div>
              </div>
              <input
                type="checkbox"
                checked={config.maintenance_mode || false}
                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </label>
          </div>
        </div>

        {/* Tier Defaults */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Sliders size={16} className="text-indigo-600" />
            Batas Kuota Standar per Paket (Tier Limits)
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs">
            {/* Free Tier */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Free Tier</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                  Gratis
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">Maks. Siswa</label>
                  <input
                    type="number"
                    value={config.max_free_students || 30}
                    onChange={(e) => setConfig({ ...config, max_free_students: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">Maks. Guru</label>
                  <input
                    type="number"
                    value={config.max_free_teachers || 1}
                    onChange={(e) => setConfig({ ...config, max_free_teachers: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">Maks. Kelas</label>
                  <input
                    type="number"
                    value={config.max_free_classes || 1}
                    onChange={(e) => setConfig({ ...config, max_free_classes: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Teacher Plan */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="font-bold text-blue-950 flex items-center justify-between">
                <span>Teacher Plan</span>
                <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-800 text-[10px] font-black uppercase">
                  Guru / Kelas
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-blue-900 font-semibold mb-1">Maks. Siswa</label>
                  <input
                    type="number"
                    value={config.max_teacher_students || 32}
                    onChange={(e) => setConfig({ ...config, max_teacher_students: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-blue-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-blue-900 font-semibold mb-1">Maks. Guru</label>
                  <input
                    type="number"
                    value={config.max_teacher_teachers || 1}
                    onChange={(e) => setConfig({ ...config, max_teacher_teachers: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-blue-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-blue-900 font-semibold mb-1">Maks. Kelas</label>
                  <input
                    type="number"
                    value={config.max_teacher_classes || 1}
                    onChange={(e) => setConfig({ ...config, max_teacher_classes: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-blue-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
              </div>
            </div>

            {/* School Plan */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
              <div className="font-bold text-indigo-950 flex items-center justify-between">
                <span>School Plan</span>
                <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-800 text-[10px] font-black uppercase">
                  Enterprise
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-indigo-900 font-semibold mb-1">Maks. Siswa</label>
                  <input
                    type="number"
                    value={config.max_school_students || 384}
                    onChange={(e) => setConfig({ ...config, max_school_students: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-indigo-900 font-semibold mb-1">Maks. Guru</label>
                  <input
                    type="number"
                    value={config.max_school_teachers || 16}
                    onChange={(e) => setConfig({ ...config, max_school_teachers: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-indigo-900 font-semibold mb-1">Maks. Kelas</label>
                  <input
                    type="number"
                    value={config.max_school_classes || 12}
                    onChange={(e) => setConfig({ ...config, max_school_classes: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg bg-white font-mono text-center text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            {saving ? 'Menyimpan Konfigurasi...' : 'Simpan Semua Konfigurasi'}
          </button>
        </div>
      </form>
    </div>
  );
};
