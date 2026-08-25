import React, { useState } from 'react';
import {
  Home,
  Building2,
  CreditCard,
  Shield,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

// Section Components
import { OverviewSection } from '../components/superadmin/OverviewSection';
import { SchoolsSection } from '../components/superadmin/SchoolsSection';
import { BillingSection } from '../components/superadmin/BillingSection';
import { SecuritySection } from '../components/superadmin/SecuritySection';
import { SystemSection } from '../components/superadmin/SystemSection';

export type SuperAdminMainTab = 'beranda' | 'sekolah' | 'pembayaran' | 'keamanan' | 'pengaturan';

interface MainTabConfig {
  id: SuperAdminMainTab;
  label: string;
  icon: any;
  desc: string;
}

const mainTabs: MainTabConfig[] = [
  { id: 'beranda', label: 'Beranda', icon: Home, desc: 'Ringkasan sistem & peringatan penting' },
  { id: 'sekolah', label: 'Sekolah', icon: Building2, desc: 'Kelola data & detail seluruh sekolah' },
  { id: 'pembayaran', label: 'Pembayaran', icon: CreditCard, desc: 'Langganan, transaksi & masa aktif' },
  { id: 'keamanan', label: 'Keamanan', icon: Shield, desc: 'Riwayat aktivitas & kegiatan penting' },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, desc: 'Pengaturan sistem, login & kondisi' },
];

export const SuperAdminView: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [mainTab, setMainTab] = useState<SuperAdminMainTab>('beranda');
  
  // Specific active sub-tabs for direct deep navigation
  const [schoolsSubTab, setSchoolsSubTab] = useState<string>('semua');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [billingSubTab, setBillingSubTab] = useState<string>('ringkasan');
  const [securitySubTab, setSecuritySubTab] = useState<string>('aktivitas');
  const [systemSubTab, setSystemSubTab] = useState<string>('sistem');

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

  const handleNavigate = (tab: string, subTab?: string, extraId?: string) => {
    if (tab === 'sekolah' || tab === 'schools') {
      setMainTab('sekolah');
      if (extraId) setSelectedSchoolId(extraId);
      if (subTab) setSchoolsSubTab(subTab);
    } else if (tab === 'pembayaran' || tab === 'billing') {
      setMainTab('pembayaran');
      if (subTab) setBillingSubTab(subTab);
    } else if (tab === 'keamanan' || tab === 'security') {
      setMainTab('keamanan');
      if (subTab) setSecuritySubTab(subTab);
    } else if (tab === 'pengaturan' || tab === 'system') {
      setMainTab('pengaturan');
      if (subTab) setSystemSubTab(subTab);
    } else {
      setMainTab('beranda');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 antialiased">
      {/* Header Utama Super Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide">
              <ShieldCheck size={14} className="text-indigo-400" />
              Pusat Kendali Super Admin
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Super Admin
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pengelolaan menyeluruh seluruh sekolah, langganan, pembayaran, keamanan sistem, dan konfigurasi platform.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-md self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-inner">
              {currentUser?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {currentUser?.name || 'Super Administrator'}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Aktif
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">@{currentUser?.username || 'superadmin'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Utama Super Admin (Tepat 5 Menu Utama) */}
      <div className="bg-white border border-slate-200/80 p-2 rounded-2xl shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {mainTabs.map((mt) => {
            const isActive = mainTab === mt.id;
            const Icon = mt.icon;
            return (
              <button
                key={mt.id}
                onClick={() => {
                  setMainTab(mt.id);
                  if (mt.id === 'sekolah') setSelectedSchoolId(null);
                }}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{mt.label}</div>
                  <div className={`text-[11px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {mt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tampilan Konten Berdasarkan Menu Utama */}
      {mainTab === 'beranda' && (
        <OverviewSection
          call={call}
          showToast={showToast}
          onNavigate={handleNavigate}
        />
      )}

      {mainTab === 'sekolah' && (
        <SchoolsSection
          call={call}
          showToast={showToast}
          activeSubTab={schoolsSubTab}
          initialSchoolId={selectedSchoolId || undefined}
          onSubTabChange={setSchoolsSubTab}
        />
      )}

      {mainTab === 'pembayaran' && (
        <BillingSection
          call={call}
          showToast={showToast}
          activeSubTab={billingSubTab}
          onSubTabChange={setBillingSubTab}
          onNavigateToSchool={(id) => handleNavigate('sekolah', 'ringkasan', id)}
        />
      )}

      {mainTab === 'keamanan' && (
        <SecuritySection
          call={call}
          showToast={showToast}
          activeSubTab={securitySubTab}
          onSubTabChange={setSecuritySubTab}
        />
      )}

      {mainTab === 'pengaturan' && (
        <SystemSection
          call={call}
          showToast={showToast}
          activeSubTab={systemSubTab}
          onSubTabChange={setSystemSubTab}
        />
      )}
    </div>
  );
};



