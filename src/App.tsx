import React from 'react';
import { AppProvider, useApp, hasPersistedAuthToken } from './context/AppContext';
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
import { AppAuthLoadingSkeleton } from './components/DashboardSkeleton';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ActiveView, UserRole } from './types';

// Peta akses per-role untuk setiap view. Ini adalah lapisan pertahanan kedua di sisi klien:
// data sesungguhnya tetap dilindungi oleh RLS Supabase + /api/admin-users, tapi tanpa guard ini
// UI sensitif (mis. Manajemen Pengguna, Pengaturan Sistem) bisa ter-render hanya karena
// `activeView` di-set lewat state, meski tautan menunya sudah disembunyikan.
const VIEW_ACCESS: Record<ActiveView, UserRole[] | 'all'> = {
  login: 'all',
  dashboard: ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  superadmin: ['SUPER_ADMIN'],
  'data-referensi': ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  'data-pengguna': ['ADMIN'],
  'kalender-akademik': ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  absensi: ['ADMIN', 'WALI KELAS', 'GURU MAPEL'],
  rekapitulasi: ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  laporan: ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  pengaturan: ['ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL'],
  'portal-siswa': ['SISWA'],
};

const defaultViewForRole = (role: UserRole): ActiveView => role === 'SUPER_ADMIN' ? 'superadmin' : (role === 'SISWA' ? 'portal-siswa' : 'dashboard');

const isAllowedForRole = (view: ActiveView, role: UserRole): boolean => {
  const allowed = VIEW_ACCESS[view];
  if (!allowed) return false;
  if (allowed === 'all') return true;
  return allowed.includes(role);
};

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
    loadUserDataAfterOnboarding,
    isAuthChecking
  } = useApp();

  // Track browser URL path and query parameters
  const [currentPath, setCurrentPath] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  });

  const [currentSearch, setCurrentSearch] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  });

  // Browser navigation listener (Back / Forward button support)
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      setCurrentPath(path);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = React.useCallback((path: string, replace = false) => {
    if (typeof window === 'undefined') return;
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    const cleanPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    setCurrentPath(cleanPath);
    setCurrentSearch(window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const searchParams = React.useMemo(() => new URLSearchParams(currentSearch), [currentSearch]);
  const pageParam = searchParams.get('page')?.toLowerCase();
  const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';

  const hasRecoveryHash =
    hash.includes('type=recovery') ||
    hash.includes('type=signup') ||
    hash.includes('type=invite') ||
    (hash.includes('access_token=') && hash.includes('type=recovery'));

  const isResetPassword = currentPath === '/reset-password' || hasRecoveryHash || passwordRecovery;
  const isSetupPage = currentPath === '/setup' || pageParam === 'setup';
  const isLoginPage = currentPath === '/login' || pageParam === 'login' || activeView === 'login';
  const isLandingPage = currentPath === '/' && !pageParam && !isLoginPage && !isSetupPage && !isResetPassword;

  // ROUTE GUARD 1: User is already logged in and navigates to /login
  // Redirect logged-in user to /dashboard (or role default view)
  React.useEffect(() => {
    if (currentUser && (currentPath === '/login' || pageParam === 'login')) {
      const initialView = defaultViewForRole(currentUser.role);
      setActiveView(initialView);
      navigateTo(`/${initialView}`, true);
    }
  }, [currentUser, currentPath, pageParam, navigateTo, setActiveView]);

  // ROUTE GUARD 2: User is NOT logged in and tries to access /dashboard or any private route
  // Redirect unauthenticated user to /login
  React.useEffect(() => {
    if (!isAuthChecking && !currentUser) {
      const isPrivatePath = 
        currentPath === '/dashboard' ||
        currentPath === '/portal-siswa' ||
        currentPath === '/superadmin' ||
        currentPath === '/data-referensi' ||
        currentPath === '/data-pengguna' ||
        currentPath === '/kalender-akademik' ||
        currentPath === '/absensi' ||
        currentPath === '/rekapitulasi' ||
        currentPath === '/laporan' ||
        currentPath === '/pengaturan';

      if (isPrivatePath) {
        showToast('Halaman dashboard bersifat privat. Silakan login terlebih dahulu.', 'info');
        setActiveView('login');
        navigateTo('/login', true);
      }
    }
  }, [isAuthChecking, currentUser, currentPath, navigateTo, setActiveView, showToast]);

  // Sync activeView with path for authenticated user when URL matches known views
  React.useEffect(() => {
    if (currentUser) {
      const viewMap: Record<string, ActiveView> = {
        '/dashboard': 'dashboard',
        '/portal-siswa': 'portal-siswa',
        '/superadmin': 'superadmin',
        '/data-referensi': 'data-referensi',
        '/data-pengguna': 'data-pengguna',
        '/kalender-akademik': 'kalender-akademik',
        '/absensi': 'absensi',
        '/rekapitulasi': 'rekapitulasi',
        '/laporan': 'laporan',
        '/pengaturan': 'pengaturan',
      };
      const matched = viewMap[currentPath];
      if (matched && matched !== activeView && isAllowedForRole(matched, currentUser.role)) {
        setActiveView(matched);
      }
    }
  }, [currentUser, currentPath, activeView, setActiveView]);

  if (isSetupPage && !currentUser) return <SetupSuperAdminView />;

  if (isResetPassword) {
    return <ResetPasswordView />;
  }

  // Jika sedang memeriksa sesi auth dan profil pengguna belum ter-hydrate, tampilkan skeleton loading
  if (isAuthChecking && !currentUser) {
    return <AppAuthLoadingSkeleton />;
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

  // 1. LANDING PAGE (/) - Publicly accessible without login. User is never redirected to /login when opening /
  if (isLandingPage && !currentUser) {
    return (
      <LandingPageView 
        onEnterSystem={() => {
          setActiveView('login');
          navigateTo('/login');
        }} 
      />
    );
  }

  // If logged-in user visits landing page (/), allow viewing it or navigating to /dashboard
  if (isLandingPage && currentUser) {
    return (
      <LandingPageView 
        onEnterSystem={() => {
          const target = defaultViewForRole(currentUser.role);
          setActiveView(target);
          navigateTo(`/${target}`);
        }} 
      />
    );
  }

  // 2. LOGIN PAGE (/login) - Only for authentication when user is not logged in
  if (!currentUser || isLoginPage) {
    return (
      <LoginView 
        onBackToLanding={() => {
          navigateTo('/');
        }} 
      />
    );
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

  // Defense-in-depth: jangan pernah render view yang perannya tidak diizinkan
  const allowedRoles = VIEW_ACCESS[activeView];
  const isAllowed = allowedRoles === 'all' || allowedRoles.includes(currentUser.role);

  if (!isAllowed) {
    const fallback = defaultViewForRole(currentUser.role);
    // Jangan setState saat render; jadwalkan redirect lalu tampilkan layar kosong sesaat.
    setTimeout(() => {
      showToast('Anda tidak memiliki akses ke halaman tersebut.', 'error');
      setActiveView(fallback);
      navigateTo(`/${fallback}`, true);
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
