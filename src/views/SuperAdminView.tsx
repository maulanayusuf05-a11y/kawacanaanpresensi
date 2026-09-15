import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Calendar,
  Megaphone,
  Plus,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Activity,
  CheckCircle2,
  KeyRound,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SchoolLogo } from '../components/SchoolLogo';

// 4 Rumpun Terpadu Sections
import { OverviewSection } from '../components/superadmin/OverviewSection';
import { SchoolsSection } from '../components/superadmin/SchoolsSection';
import { BillingSection } from '../components/superadmin/BillingSection';
import { SystemSection } from '../components/superadmin/SystemSection';

export type SuperAdminCluster = 'dashboard' | 'sekolah' | 'billing' | 'sistem';

interface ClusterConfig {
  id: SuperAdminCluster;
  label: string;
  sublabel: string;
  icon: any;
  badge?: string;
}

const clusters: ClusterConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sublabel: 'Metrik, KPI & Tren Platform',
    icon: LayoutDashboard,
  },
  {
    id: 'sekolah',
    label: 'Kelola Sekolah',
    sublabel: 'Direktori & Pengguna Tenant',
    icon: Building2,
  },
  {
    id: 'billing',
    label: 'Billing & Lisensi',
    sublabel: 'Transaksi, Paket & QRIS',
    icon: CreditCard,
  },
  {
    id: 'sistem',
    label: 'Pusat Sistem',
    sublabel: 'Audit, Siaran & Cadangan',
    icon: ShieldCheck,
  },
];

export const SuperAdminView: React.FC = () => {
  const { currentUser, showToast, logout, globalAnnouncement } = useApp();

  const [activeCluster, setActiveClusterState] = useState<SuperAdminCluster>(() => {
    try {
      const saved = localStorage.getItem('kawacanaan_superadmin_cluster') as SuperAdminCluster;
      if (saved && ['dashboard', 'sekolah', 'billing', 'sistem'].includes(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'dashboard';
  });

  const setActiveCluster = (cluster: SuperAdminCluster) => {
    setActiveClusterState(cluster);
    try {
      localStorage.setItem('kawacanaan_superadmin_cluster', cluster);
    } catch (_) {}
    setIsMobileSidebarOpen(false);
  };

  // State untuk navigasi spesifik antar sub-fitur
  const [schoolsSubTab, setSchoolsSubTab] = useState<string>('semua');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [billingSubTab, setBillingSubTab] = useState<string>('ringkasan');
  const [systemSubTab, setSystemSubTab] = useState<string>('audit');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const token = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  };

  const call = async (action: string, p: any = {}) => {
    const r = await fetch('/api/superadmin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ action, ...p }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || 'Operasi gagal dieksekusi.');
    return b;
  };

  // Handler integrasi navigasi universal dari OverviewSection / kartu metrik
  const handleNavigate = (tab: string, subTab?: string, extraId?: string) => {
    if (tab === 'sekolah' || tab === 'schools') {
      setActiveCluster('sekolah');
      if (extraId) setSelectedSchoolId(extraId);
      if (subTab) setSchoolsSubTab(subTab);
    } else if (tab === 'pembayaran' || tab === 'billing') {
      setActiveCluster('billing');
      if (subTab) setBillingSubTab(subTab);
    } else if (tab === 'keamanan' || tab === 'security') {
      setActiveCluster('sistem');
      setSystemSubTab('audit');
    } else if (tab === 'pengaturan' || tab === 'system' || tab === 'sistem') {
      setActiveCluster('sistem');
      if (subTab) setSystemSubTab(subTab);
    } else {
      setActiveCluster('dashboard');
    }
  };

  // Tanggal terformat bahasa Indonesia
  const getFormattedDate = () => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    showToast('Memperbarui data super admin...', 'info');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Data berhasil diperbarui.', 'success');
    }, 600);
  };

  const currentClusterConfig = clusters.find((c) => c.id === activeCluster) || clusters[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 antialiased selection:bg-indigo-600 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR KIRI DESKTOP & OVERLAY MOBILE                                */}
      {/* ========================================================================= */}

      {/* Backdrop Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-slate-900 text-slate-100 flex flex-col justify-between z-50 transition-transform duration-300 ease-in-out border-r border-slate-800 shadow-xl ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Atas Sidebar: Logo & Identitas Super Admin */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-black">
                <SchoolLogo size={24} className="brightness-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-base tracking-tight">KAWACANAAN</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-2xs">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                  KONTROL MULTI-TENANT
                </p>
              </div>
            </div>

            {/* Tombol Tutup pada Layar Mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status Koneksi Platform Ringkas */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-300">Supabase & API Normal</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Port 3000</span>
          </div>
        </div>

        {/* Tengah Sidebar: 4 Rumpun Menu Utama & Tombol Cepat */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              RUMPUN UTAMA PLATFORM
            </div>

            <nav className="space-y-1.5">
              {clusters.map((c) => {
                const isActive = activeCluster === c.id;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCluster(c.id);
                      if (c.id === 'sekolah') setSelectedSchoolId(null);
                    }}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-left transition-all duration-150 cursor-pointer group select-none ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black truncate">{c.label}</span>
                        {isActive && <ChevronRight size={14} className="text-indigo-200 shrink-0" />}
                      </div>
                      <p
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-indigo-100 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {c.sublabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Pintasan Aksi Cepat */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="px-3 pb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              AKSI CEPAT OPERASIONAL
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveCluster('sekolah');
                  setSchoolsSubTab('tambah');
                  setSelectedSchoolId(null);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Plus size={14} />
                </div>
                <span>Tambah Sekolah Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCluster('sistem');
                  setSystemSubTab('siaran');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Megaphone size={14} />
                </div>
                <span>Siaran Pengumuman Global</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bawah Sidebar: Profil Pengguna & Tombol Keluar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-inner shrink-0">
                {currentUser?.name?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Super Administrator'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  @{currentUser?.username || 'superadmin'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Keluar dari sesi Super Administrator?')) {
                  void logout();
                }
              }}
              title="Keluar dari sistem"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. AREA UTAMA (TOPBAR RAMPING + KONTEN WORKSPACE)                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Universal Topbar Minimalis Super Admin */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          {/* Sisi Kiri: Hamburger Mobile + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 select-none">
              <span className="hover:text-indigo-600 transition">Super Admin</span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-900 font-black text-sm">{currentClusterConfig.label}</span>
            </div>
          </div>

          {/* Sisi Kanan: Aksi Cepat, Tanggal, & Refresh */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Tanggal Hari Ini */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold select-none shadow-2xs">
              <Calendar size={13} className="text-slate-400" />
              <span>{getFormattedDate()}</span>
            </div>

            {/* Tombol Siaran Pengumuman Cepat */}
            <button
              type="button"
              onClick={() => {
                setActiveCluster('sistem');
                setSystemSubTab('siaran');
              }}
              title="Kelola Siaran Pengumuman Global"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
            >
              <Megaphone size={13} className="text-indigo-600" />
              <span>Siaran Pengumuman</span>
              {globalAnnouncement?.active && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* Tombol Tambah Sekolah Cepat */}
            <button
              type="button"
              onClick={() => {
                setActiveCluster('sekolah');
                setSchoolsSubTab('tambah');
                setSelectedSchoolId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Tambah Sekolah</span>
            </button>

            {/* Tombol Refresh Data */}
            <button
              type="button"
              onClick={handleManualRefresh}
              title="Segarkan Data"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </header>

        {/* Konten Utama Workspace Berdasarkan Rumpun Terpilih */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto space-y-6">
          {/* 1. Rumpun Dashboard */}
          {activeCluster === 'dashboard' && (
            <OverviewSection
              call={call}
              showToast={showToast}
              onNavigate={handleNavigate}
            />
          )}

          {/* 2. Rumpun Kelola Sekolah */}
          {activeCluster === 'sekolah' && (
            <SchoolsSection
              call={call}
              showToast={showToast}
              activeSubTab={schoolsSubTab}
              initialSchoolId={selectedSchoolId || undefined}
              onSubTabChange={setSchoolsSubTab}
            />
          )}

          {/* 3. Rumpun Billing & Lisensi */}
          {activeCluster === 'billing' && (
            <BillingSection
              call={call}
              showToast={showToast}
              activeSubTab={billingSubTab}
              onSubTabChange={setBillingSubTab}
              onNavigateToSchool={(id) => handleNavigate('sekolah', 'ringkasan', id)}
            />
          )}

          {/* 4. Rumpun Pusat Sistem */}
          {activeCluster === 'sistem' && (
            <SystemSection
              call={call}
              showToast={showToast}
              activeSubTab={systemSubTab}
              onSubTabChange={setSystemSubTab}
            />
          )}
        </main>
      </div>
    </div>
  );
};
