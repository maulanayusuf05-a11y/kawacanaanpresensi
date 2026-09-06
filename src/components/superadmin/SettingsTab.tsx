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
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Zap,
  Activity
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

  const [midtrans, setMidtrans] = useState({
    client_key: '',
    server_key: '',
    is_server_key_configured: false,
    is_production: false,
    merchant_id: '',
    enabled: false,
  });
  const [showServerKey, setShowServerKey] = useState(false);
  const [testingMidtrans, setTestingMidtrans] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

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

      const midRes = await call('get_midtrans_config');
      if (midRes?.midtrans) {
        setMidtrans((prev) => ({ ...prev, ...midRes.midtrans }));
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

  const handleTestMidtrans = async () => {
    setTestingMidtrans(true);
    try {
      const res = await call('test_midtrans');
      if (res.ok) {
        showToast(res.message, 'success');
      } else {
        showToast(res.error || 'Uji koneksi Midtrans gagal.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal terhubung ke Midtrans API', 'error');
    } finally {
      setTestingMidtrans(false);
    }
  };

  const handleCopyWebhook = () => {
    const origin = window.location.origin;
    const webhookUrl = `${origin}/api/midtrans-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showToast('URL Webhook berhasil disalin!', 'success');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

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

      await Promise.all([
        call('update_config', { config: payloadConfig }),
        call('update_midtrans_config', { midtrans })
      ]);
      showToast('Konfigurasi paket & Midtrans Gateway berhasil disimpan.', 'success');
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

        {/* Input Parameters: Harga Bulanan, Harga Tahunan, Durasi, Kapasitas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Harga Bulanan (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={pkg.hargaBulanan ?? pkg.harga}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                handlePackageFieldChange(key, 'hargaBulanan', val);
                handlePackageFieldChange(key, 'harga', val);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Harga Tahunan (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={pkg.hargaTahunan ?? (pkg.harga * 10)}
              onChange={(e) => handlePackageFieldChange(key, 'hargaTahunan', Math.max(0, Number(e.target.value)))}
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
        </div>

        {/* Input Maks. Guru, Maks Kelas, & Deskripsi */}
        <div className="grid sm:grid-cols-4 gap-3 text-xs pt-1">
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
              Keterangan Singkat
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
        {/* PAYMENT GATEWAY MIDTRANS CONFIGURATION */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <CreditCard size={16} />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Integrasi Payment Gateway Midtrans (Snap & QRIS/VA)
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    ▲ SANDBOX (MIDTRANS_IS_PRODUCTION = false)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Otomatisasi pembayaran langganan Paket Guru & Sekolah via Snap popup (QRIS, VA Mandiri/BCA/BRI/BNI, GoPay, ShopeePay).
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestMidtrans}
                disabled={testingMidtrans}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1.5 transition border border-sky-200 cursor-pointer disabled:opacity-50"
              >
                <Activity size={13} className={testingMidtrans ? 'animate-spin' : ''} />
                <span>{testingMidtrans ? 'Menguji...' : 'Uji Koneksi Sandbox'}</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 text-xs">Aktifkan Gateway Midtrans</div>
                <div className="text-[11px] text-slate-500">Izinkan checkout otomatis online via Snap Midtrans</div>
              </div>
              <input
                type="checkbox"
                checked={midtrans.enabled}
                onChange={(e) => setMidtrans({ ...midtrans, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-800 text-xs">Lingkungan Sistem (Environment)</div>
                <div className="text-[11px] text-slate-500">
                  Mode Simulator Sandbox (Uji Coba)
                </div>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-900 text-xs font-bold font-mono">
                is_production: false
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Client Key Sandbox</label>
              <input
                type="text"
                value={midtrans.client_key}
                onChange={(e) => setMidtrans({ ...midtrans, client_key: e.target.value })}
                placeholder="Masukkan Client Key dari Sandbox Dashboard"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-sky-500/10 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Kunci publik aman untuk memuat Snap.js di browser pengguna.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Server Key Sandbox</span>
                {midtrans.is_server_key_configured && (
                  <span className="text-[10px] text-emerald-600 font-medium">Terkonfigurasi di Server</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showServerKey ? 'text' : 'password'}
                  value={midtrans.server_key}
                  onChange={(e) => setMidtrans({ ...midtrans, server_key: e.target.value })}
                  placeholder={midtrans.is_server_key_configured ? '•••••••••••••••• (Tersimpan aman di server)' : 'Masukkan Server Key dari Sandbox Dashboard'}
                  className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-sky-500/10 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowServerKey(!showServerKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showServerKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Kunci rahasia server (hanya disimpan & dijalankan di backend, tidak pernah diekspos ke browser).
              </span>
            </div>
          </div>

          {/* Webhook notification URL Helper */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sky-900 flex items-center gap-1.5">
                <Zap size={14} className="text-sky-600" />
                URL Webhook Notifikasi Pembayaran (Midtrans Dashboard):
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 hover:bg-sky-100 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                {copiedWebhook ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedWebhook ? 'Tersalin!' : 'Salin URL'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-sky-100 text-slate-700 select-all overflow-x-auto">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/midtrans-webhook` : '/api/midtrans-webhook'}
            </div>
            <p className="text-[10px] text-sky-700 leading-relaxed">
              Pasang URL di atas pada <strong>Midtrans Dashboard &gt; Settings &gt; Configuration &gt; Payment Notification URL</strong> agar sistem otomatis memperpanjang masa aktif saat sekolah/guru menyelesaikan pembayaran.
            </p>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderPackageCard('sekolah_gratis', 'bg-slate-100 text-slate-700')}
            {renderPackageCard('sekolah_uji_coba', 'bg-amber-100 text-amber-800')}
            {renderPackageCard('sekolah_pro', 'bg-indigo-100 text-indigo-800')}
            {renderPackageCard('sekolah_custom', 'bg-purple-100 text-purple-800')}
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

