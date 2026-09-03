import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, BookMarked, Sparkles, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle, School, Users, GraduationCap } from 'lucide-react';
import { DataSekolahView } from './DataSekolahView';
import { DataGuruView } from './DataGuruView';
import { DataSiswaView } from './DataSiswaView';
import { DataKelasView } from './DataKelasView';
import { DataMapelView } from './DataMapelView';
import { getUserRoleScope } from '../utils/userScope';

type ReferensiTab = 'sekolah' | 'guru' | 'kelas' | 'siswa' | 'mapel';

const TAB_LABELS: Record<ReferensiTab, string> = {
  sekolah: 'Identitas Sekolah',
  guru: 'Data Guru',
  kelas: 'Data Kelas',
  siswa: 'Data Siswa',
  mapel: 'Data Mata Pelajaran',
};

const TAB_ORDER: ReferensiTab[] = ['sekolah', 'guru', 'kelas', 'siswa', 'mapel'];

export const DataReferensiView: React.FC = () => {
  const {
    currentUser,
    setActiveView,
    classes,
    subjects,
    teachers,
    students,
    schoolProfile,
    reconcileSchoolData,
  } = useApp();

  const [isReconciling, setIsReconciling] = useState(false);

  const userScope = useMemo(
    () => getUserRoleScope(currentUser, classes, subjects, teachers),
    [currentUser, classes, subjects, teachers]
  );

  const isRoleRestricted = userScope.isWaliKelas || userScope.isGuruMapel;

  const accessibleStudentsCount = useMemo(() => {
    if (!isRoleRestricted) return students.length;
    const targetClassIds = new Set(userScope.accessibleClassIds);
    const targetClassNames = new Set(userScope.accessibleClasses.map((c) => c.name.trim().toLowerCase()));
    return students.filter(
      (s) =>
        (s.classId && targetClassIds.has(s.classId)) ||
        (s.className && targetClassNames.has(s.className.trim().toLowerCase()))
    ).length;
  }, [students, isRoleRestricted, userScope.accessibleClassIds, userScope.accessibleClasses]);

  const handleCheckIntegration = async () => {
    try {
      setIsReconciling(true);
      await reconcileSchoolData(true);
    } finally {
      setIsReconciling(false);
    }
  };

  const allowedTabs = useMemo<ReferensiTab[]>(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') return TAB_ORDER;
    return ['sekolah', 'guru', 'kelas', 'siswa', 'mapel'];
  }, [currentUser]);

  // If Guru Mapel, prioritize 'mapel' tab by default
  const defaultTab = useMemo<ReferensiTab>(() => {
    try {
      const saved = localStorage.getItem('kawacanaan_last_referensi_tab') as ReferensiTab;
      if (saved && allowedTabs.includes(saved)) {
        return saved;
      }
    } catch (_) {}
    if (userScope.isGuruMapel) return 'mapel';
    return allowedTabs[0] || 'sekolah';
  }, [userScope.isGuruMapel, allowedTabs]);

  const [activeTab, setActiveTabState] = useState<ReferensiTab>(defaultTab);
  const setActiveTab = (tab: ReferensiTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('kawacanaan_last_referensi_tab', tab);
    } catch (_) {}
  };
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : (allowedTabs[0] || 'sekolah');

  const displayNip = currentUser?.nip && currentUser.nip !== '-'
    ? currentUser.nip
    : (userScope.currentTeacher?.nip || '-');

  const displayClasses = userScope.accessibleClasses.length > 0
    ? userScope.accessibleClasses.map((c) => c.name).join(', ')
    : (currentUser?.classNames?.join(', ') || 'Belum ada rombel terhubung');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-5 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          id="btn-back-dashboard"
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {isRoleRestricted && (
            <button
              onClick={handleCheckIntegration}
              disabled={isReconciling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              id="btn-periksa-integrasi"
              title="Periksa dan sinkronkan data referensi dengan data Admin Sekolah"
            >
              <RefreshCw size={13} className={isReconciling ? 'animate-spin' : ''} />
              <span>{isReconciling ? 'Memeriksa...' : 'Periksa Integrasi Admin'}</span>
            </button>
          )}

          {userScope.isGuruMapel && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold shadow-2xs">
              <Sparkles size={13} className="text-indigo-600" />
              <span>Akses Guru Mapel Aktif</span>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
          <BookMarked size={22} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Data Referensi</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola data induk sekolah, guru, mata pelajaran kurikulum SD, siswa, dan kelas dalam satu tempat.
          </p>
        </div>
      </div>

      {/* Integration Status Card for Wali Kelas & Guru Mapel */}
      {isRoleRestricted && (
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/60 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Status Integrasi Data Admin Sekolah
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  <CheckCircle2 size={10} />
                  <span>Terintegrasi</span>
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Sistem telah memeriksa dan mengintegrasikan akun Anda dengan data resmi yang dikelola Admin Sekolah.
              </p>
            </div>

            <button
              onClick={handleCheckIntegration}
              disabled={isReconciling}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isReconciling ? 'animate-spin text-blue-600' : 'text-blue-600'} />
              <span>{isReconciling ? 'Sedang Memeriksa...' : 'Periksa Ulang Data'}</span>
            </button>
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-blue-600" />
                <span>Data Guru Akun</span>
              </div>
              <div className="font-bold text-slate-800 truncate">{currentUser?.name || 'Guru'}</div>
              <div className="text-[11px] text-slate-600">
                NIP: <span className="font-mono font-semibold text-slate-900">{displayNip}</span>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <School size={12} className="text-indigo-600" />
                <span>{userScope.isWaliKelas ? 'Kelas Binaan' : 'Kelas yang Diajar'}</span>
              </div>
              <div className="font-bold text-indigo-900 truncate">{displayClasses}</div>
              <div className="text-[11px] text-slate-600">
                Total: <span className="font-semibold text-slate-900">{userScope.accessibleClasses.length} Rombel</span>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <GraduationCap size={12} className="text-emerald-600" />
                <span>Akses Data Siswa</span>
              </div>
              <div className="font-bold text-emerald-900 truncate">
                {accessibleStudentsCount} Siswa Terdaftar
              </div>
              <div className="text-[11px] text-slate-600">
                Sesuai rombel yang dibina/diajar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200 overflow-x-auto max-w-full">
        {TAB_ORDER.filter((t) => allowedTabs.includes(t)).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            id={`tab-referensi-${tab}`}
            className={`px-5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{TAB_LABELS[tab]}</span>
            {tab === 'mapel' && userScope.isGuruMapel && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === 'sekolah' && <DataSekolahView />}
      {currentTab === 'guru' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <DataGuruView />
        </div>
      )}
      {currentTab === 'kelas' && <DataKelasView />}
      {currentTab === 'siswa' && <DataSiswaView />}
      {currentTab === 'mapel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <DataMapelView />
        </div>
      )}
    </div>
  );
};
