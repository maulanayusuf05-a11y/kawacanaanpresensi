import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { ChangePasswordView } from './views/ChangePasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { DashboardView } from './views/DashboardView';
import { DataReferensiView } from './views/DataReferensiView';
import { DataPenggunaView } from './views/DataPenggunaView';
import { KalenderAkademikView } from './views/KalenderAkademikView';
import { AbsensiView } from './views/AbsensiView';
import { RekapitulasiView } from './views/RekapitulasiView';
import { LaporanView } from './views/LaporanView';
import { PengaturanView } from './views/PengaturanView';
import { PortalSiswaView } from './views/PortalSiswaView';
import { LandingPageView } from './views/LandingPageView';
import { SuperAdminView } from './views/SuperAdminView';
import { SetupSuperAdminView } from './views/SetupSuperAdminView';
import { OnboardingView } from './views/OnboardingView';
import { WorkspaceSelectorView } from './views/WorkspaceSelectorView';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ActiveView, UserRole } from './types';

// Peta akses per-role untuk setiap view. Ini adalah lapisan pertahanan kedua di sisi klien:
// data sesungguhnya tetap dilindungi oleh RLS Supabase + /api/admin-users, tapi tanpa guard ini
// UI sensitif (mis. Manajemen Pengguna, Pengaturan Sistem) bisa ter-render hanya karena
// `activeView` di-set lewat state, meski tautan menunya sudah disembunyikan.
const VIEW_ACCESS: Record<ActiveView, UserRole[] | 'all'> = {
  login: 'all',
  dashboard: ['ADMIN', 'KEPALA SEKOLAH', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  superadmin: ['SUPER_ADMIN'],
  'data-referensi': ['ADMIN', 'KEPALA SEKOLAH', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  'data-pengguna': ['ADMIN'],
  'kalender-akademik': ['ADMIN', 'KEPALA SEKOLAH', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  absensi: ['ADMIN', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  rekapitulasi: ['ADMIN', 'KEPALA SEKOLAH', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  laporan: ['ADMIN', 'KEPALA SEKOLAH', 'GURU', 'WALI KELAS', 'GURU MAPEL'],
  pengaturan: ['ADMIN'],
  'portal-siswa': ['SISWA'],
};

const defaultViewForRole = (role: UserRole): ActiveView => role === 'SUPER_ADMIN' ? 'superadmin' : (role === 'SISWA' ? 'portal-siswa' : 'dashboard');

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 sm:p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-900/10'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-900/10'
              : 'bg-white text-slate-800 border-slate-200 shadow-slate-900/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-600 flex-shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-1 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};


import { getTenantLifecycleInfo } from './utils/tenantLifecycle';

const SubscriptionGate: React.FC = () => {
  const { currentUser, logout } = useApp();
  const lifecycle = getTenantLifecycleInfo({
    status: currentUser?.subscriptionStatus,
    subscription_expires_at: currentUser?.subscriptionExpiresAt,
  });

  if (!currentUser || currentUser.role === 'SUPER_ADMIN' || lifecycle.canAccessApp) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-lg animate-in fade-in zoom-in-95">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-black">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Akses Operasional Ditangguhkan</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {lifecycle.description || 'Masa aktif paket sekolah Anda dan masa tenggang telah berakhir atau sekolah sedang dinonaktifkan.'} Data tetap tersimpan aman di sistem dan dapat diakses kembali setelah langganan diperpanjang oleh Administrator.
        </p>
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-around">
          <span>Paket: <strong className="text-slate-900">{currentUser?.subscriptionPlan || 'Standar'}</strong></span>
          <span>Kedaluwarsa: <strong className="text-rose-600">{currentUser?.subscriptionExpiresAt || '-'}</strong></span>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              void logout();
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Keluar (Logout)
          </button>
        </div>
      </div>
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    showToast, 
    passwordRecovery, 
    isOnboarding, 
    isSelectingWorkspace, 
    selectWorkspace, 
    openOnboarding, 
    loadUserDataAfterOnboarding 
  } = useApp();
  const [showLanding, setShowLanding] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') !== 'login' && params.get('page') !== 'setup';
  });
  const isSetupPage = new URLSearchParams(window.location.search).get('page') === 'setup';

  if (isSetupPage && !currentUser) return <SetupSuperAdminView />;

  if (passwordRecovery) {
    return <ResetPasswordView />;
  }

  // Jika user sedang dalam proses Onboarding (mis. registrasi akun pertama via Google / Baru)
  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <OnboardingView onCompleted={(userId) => void loadUserDataAfterOnboarding(userId)} />
        <ToastContainer />
      </div>
    );
  }

  // Jika user memiliki multi-workspace dan perlu memilih ruang kerja aktif (Ruang Kerja Sekolah / Ruang Kerja Individu)
  if (isSelectingWorkspace) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <WorkspaceSelectorView
          onSelectWorkspace={(ws) => void selectWorkspace(ws)}
        />
        <ToastContainer />
      </div>
    );
  }

  if (showLanding && !currentUser) {
    return <LandingPageView onEnterSystem={() => { setShowLanding(false); setActiveView('login'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />;
  }

  if (!currentUser || activeView === 'login') {
    return <LoginView />;
  }

  // Wajib ganti password sebelum akses lain mana pun — berlaku untuk semua role.
  if (currentUser.mustChangePassword) {
    return <ChangePasswordView />;
  }

  if (currentUser.role !== 'SUPER_ADMIN') {
    const lifecycle = getTenantLifecycleInfo({
      status: currentUser.subscriptionStatus,
      subscription_expires_at: currentUser.subscriptionExpiresAt,
    });
    if (!lifecycle.canAccessApp) {
      return <SubscriptionGate />;
    }
  }

  // Defense-in-depth: jangan pernah render view yang perannya tidak diizinkan,
  // apa pun cara `activeView` bisa berubah.
  const allowedRoles = VIEW_ACCESS[activeView];
  const isAllowed = allowedRoles === 'all' || allowedRoles.includes(currentUser.role);

  if (!isAllowed) {
    const fallback = defaultViewForRole(currentUser.role);
    // Jangan setState saat render; jadwalkan redirect lalu tampilkan layar kosong sesaat.
    setTimeout(() => {
      showToast('Anda tidak memiliki akses ke halaman tersebut.', 'error');
      setActiveView(fallback);
    }, 0);
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Universal Top Header */}
      <Header />

      {/* Dynamic View Body */}
      <main className="flex-1 pb-12">
        {activeView === 'superadmin' && <SuperAdminView />}
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'data-referensi' && <DataReferensiView />}
        {activeView === 'data-pengguna' && <DataPenggunaView />}
        {activeView === 'kalender-akademik' && <KalenderAkademikView />}
        {activeView === 'absensi' && <AbsensiView />}
        {activeView === 'rekapitulasi' && <RekapitulasiView />}
        {activeView === 'laporan' && <LaporanView />}
        {activeView === 'pengaturan' && <PengaturanView />}
        {activeView === 'portal-siswa' && <PortalSiswaView />}
      </main>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
