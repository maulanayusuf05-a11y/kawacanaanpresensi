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
  AlertTriangle,
  User,
  Building2,
  Sparkles,
  Layers,
  Coins,
  Clock,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import {
  DEFAULT_MASTER_PAKET,
  MasterPaketSettings,
  PaketConfig,
  formatRupiah
} from '../../utils/packageSystem';

export const SettingsTab: React.FC<{
  call: any;
  showToast: any;
}> = ({ call, showToast }) => {
  const [config, setConfig] = useState<any>({
    platform_name: 'Sistem Informasi Presensi Sekolah',
    allow_registration: true,
    maintenance_mode: false,
    grace_period_days: 7,
    packages_config: DEFAULT_MASTER_PAKET,
  });
  const [packages, setPackages] = useState<MasterPaketSettings>(DEFAULT_MASTER_PAKET);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePackageGroup, setActivePackageGroup] = useState<'all' | 'guru' | 'sekolah'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await call('get_config');
      if (res.config) {
        setConfig((prev: any) => ({ ...prev, ...res.config }));
        if (res.config.packages_config) {
          setPackages({
            ...DEFAULT_MASTER_PAKET,
            ...res.config.packages_config
          });
        }
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

  const handlePackageFieldChange = (
    pkgKey: keyof MasterPaketSettings,
    field: keyof PaketConfig,
    value: any
  ) => {
    setPackages((prev) => ({
      ...prev,
      [pkgKey]: {
        ...prev[pkgKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payloadConfig = {
        ...config,
        packages_config: packages,
        // Backward-compatibility legacy tier limits
        max_free_students: packages.guru_gratis.kapasitasSiswa,
        max_free_teachers: packages.guru_gratis.kapasitasGuru,
        max_free_classes: packages.guru_gratis.kapasitasKelas,
        max_teacher_students: packages.guru_pro.kapasitasSiswa,
        max_teacher_teachers: packages.guru_pro.kapasitasGuru,
        max_teacher_classes: packages.guru_pro.kapasitasKelas,
        max_school_students: packages.sekolah_pro.kapasitasSiswa,
        max_school_teachers: packages.sekolah_pro.kapasitasGuru,
        max_school_classes: packages.sekolah_pro.kapasitasKelas,
      };

      await call('update_config', { config: payloadConfig });
      showToast('Konfigurasi paket & platform berhasil diperbarui.', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPackagesDefault = () => {
    if (confirm('Kembalikan seluruh harga, durasi, dan kuota paket ke pengaturan awal pabrik?')) {
      setPackages(DEFAULT_MASTER_PAKET);
      showToast('Pengaturan paket direset ke default.', 'info');
    }
  };

  const renderPackageCard = (key: keyof MasterPaketSettings, badgeColor: string) => {
    const pkg = packages[key] || DEFAULT_MASTER_PAKET[key];
    const isGuru = pkg.tipeRuangKerja === 'individu';

    return (
      <div
        key={key}
        className={`bg-white border rounded-2xl p-5 shadow-xs transition-all space-y-4 ${
          pkg.statusPaket === 'pro'
            ? 'border-indigo-200 ring-1 ring-indigo-500/10'
            : pkg.statusPaket === 'uji_coba'
            ? 'border-amber-200'
            : 'border-slate-200'
        }`}
      >
        {/* Header Paket */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                {pkg.statusPaket}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {isGuru ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 mt-1">{pkg.nama}</h4>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">Harga Paket</span>
            <span className="text-sm font-black text-indigo-700 font-mono">
              {pkg.harga === 0 ? 'Gratis' : formatRupiah(pkg.harga)}
            </span>
          </div>
        </div>

        {/* Input Parameters: Harga, Durasi, Kapasitas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Harga (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={pkg.harga}
              onChange={(e) => handlePackageFieldChange(key, 'harga', Math.max(0, Number(e.target.value)))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Durasi (Hari)
            </label>
            <input
              type="number"
              min="0"
              value={pkg.durasiHari}
              placeholder="0 = Tanpa Batas"
              onChange={(e) => handlePackageFieldChange(key, 'durasiHari', Math.max(0, Number(e.target.value)))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
            <span className="text-[9px] text-slate-400">0 = Selamanya</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Maks. Siswa
            </label>
            <input
              type="number"
              min="1"
              value={pkg.kapasitasSiswa}
              onChange={(e) => handlePackageFieldChange(key, 'kapasitasSiswa', Math.max(1, Number(e.target.value)))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Maks. Kelas
            </label>
            <input
              type="number"
              min="1"
              value={pkg.kapasitasKelas}
              onChange={(e) => handlePackageFieldChange(key, 'kapasitasKelas', Math.max(1, Number(e.target.value)))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Input Maks. Guru & Deskripsi */}
        <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Maks. Guru / Pengajar
            </label>
            <input
              type="number"
              min="1"
              value={pkg.kapasitasGuru}
              onChange={(e) => handlePackageFieldChange(key, 'kapasitasGuru', Math.max(1, Number(e.target.value)))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Keterangan & Fitur Ringkas
            </label>
            <input
              type="text"
              value={pkg.deskripsi}
              onChange={(e) => handlePackageFieldChange(key, 'deskripsi', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Fitur Highlights */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-600">Daftar Fitur Paket (Dipisahkan koma atau baris):</div>
          <textarea
            rows={2}
            value={Array.isArray(pkg.fitur) ? pkg.fitur.join('\n') : ''}
            onChange={(e) => {
              const lines = e.target.value
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
              handlePackageFieldChange(key, 'fitur', lines);
            }}
            placeholder="Tuliskan daftar fitur per baris..."
            className="w-full p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 resize-none outline-none focus:border-indigo-400"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Konfigurasi Paket, Ruang Kerja, & Kuota
          </h2>
          <p className="text-xs text-slate-500">
            Atur harga, durasi uji coba, kapasitas siswa, guru, kelas, serta izin fitur dinamis untuk setiap paket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetPackagesDefault}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Identity & Operational Mode */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none"
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500/10 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tenant yang kedaluwarsa tetap dapat mengakses sistem secara read-only tanpa kehilangan data.
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 text-xs">Pendaftaran Publik Mandiri</div>
                <div className="text-[11px] text-slate-500">Izinkan pendaftaran Ruang Kerja Individu & Sekolah dari halaman depan</div>
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

        {/* ------------------------------------------------------------- */}
        {/* 1. PAKET RUANG KERJA INDIVIDU (UNTUK GURU) */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. Paket Ruang Kerja Individu (Untuk Guru)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Alur: Guru Gratis → Uji Coba (14 Hari) → Pro (Bayar) → Jika habis tanpa bayar kembali ke Gratis (Data tetap utuh).
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {renderPackageCard('guru_gratis', 'bg-slate-100 text-slate-700')}
            {renderPackageCard('guru_uji_coba', 'bg-amber-100 text-amber-800')}
            {renderPackageCard('guru_pro', 'bg-blue-100 text-blue-800')}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. PAKET RUANG KERJA SEKOLAH (UNTUK SEKOLAH) */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  2. Paket Ruang Kerja Sekolah (Untuk Sekolah)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Alur: Sekolah Gratis → Uji Coba (14 Hari) → Pro (Bayar) → Jika habis tanpa bayar kembali ke Gratis (Data tetap utuh).
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {renderPackageCard('sekolah_gratis', 'bg-slate-100 text-slate-700')}
            {renderPackageCard('sekolah_uji_coba', 'bg-amber-100 text-amber-800')}
            {renderPackageCard('sekolah_pro', 'bg-indigo-100 text-indigo-800')}
          </div>
        </div>

        {/* Save Button Sticky Footer */}
        <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
          <div className="text-xs text-slate-300">
            <strong>Catatan Keamanan & Integritas:</strong> Perubahan batas kuota & harga akan langsung aktif dinamis pada alur upgrade dan ruang kerja tanpa menghapus riwayat presensi yang telah dibuat.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer shrink-0 ml-4"
          >
            <Save size={15} />
            {saving ? 'Menyimpan Semua Konfigurasi...' : 'Simpan Semua Konfigurasi'}
          </button>
        </div>
      </form>
    </div>
  );
};

