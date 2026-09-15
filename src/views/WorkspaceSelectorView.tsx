import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkspaceMembership } from '../types';
import { BookLoadingModal } from '../components/BookLoader';
import { JoinSchoolModal } from '../components/JoinSchoolModal';
import {
  Building2,
  UserCheck,
  BookOpen,
  Users,
  Shield,
  ArrowRight,
  LogOut,
  Layers,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  School,
  GraduationCap,
} from 'lucide-react';

interface WorkspaceSelectorViewProps {
  onSelectWorkspace?: (ws: WorkspaceMembership) => void;
}

export const WorkspaceSelectorView: React.FC<WorkspaceSelectorViewProps> = () => {
  const {
    userWorkspaces,
    selectWorkspace,
    currentUser,
    logout,
    activeWorkspace,
    isSwitchingWorkspace,
    switchingWorkspaceProgress,
    switchingWorkspaceTitle,
    switchingWorkspaceMessage,
    switchToSchoolWorkspace,
    switchToPersonalWorkspace,
    setIsSelectingWorkspace,
  } = useApp();

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const schoolWs = userWorkspaces.find(
    (ws) => ws.workspaceType !== 'personal' && ws.workspaceType !== 'individu'
  );

  const personalWs = userWorkspaces.find(
    (ws) => ws.workspaceType === 'personal' || ws.workspaceType === 'individu'
  );

  const isCurrentlyPersonal =
    activeWorkspace?.workspaceType === 'personal' ||
    activeWorkspace?.workspaceType === 'individu' ||
    (currentUser?.subscriptionPlan === 'mulai' && !currentUser?.schoolId);

  const getRoleBadge = (membership: WorkspaceMembership) => {
    switch (membership.role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">Super Admin</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider">Admin Sekolah</span>;
      case 'KEPALA SEKOLAH':
        return <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">Kepala Sekolah</span>;
      case 'WALI KELAS':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">Wali Kelas</span>;
      case 'GURU MAPEL':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">Guru Mapel</span>;
      case 'SISWA':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">Siswa</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">{membership.role}</span>;
    }
  };

  const handleOpenSchoolWs = async () => {
    if (schoolWs) {
      await selectWorkspace(schoolWs);
    } else {
      await switchToSchoolWorkspace();
    }
    setIsSelectingWorkspace(false);
  };

  const handleOpenPersonalWs = async () => {
    if (personalWs) {
      await selectWorkspace(personalWs);
    } else {
      await switchToPersonalWorkspace();
    }
    setIsSelectingWorkspace(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header - Compact & Clean */}
      <header className="bg-white border-b border-slate-200/90 py-3 px-3.5 sm:px-6 lg:px-8 shadow-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs shrink-0">
              K
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight uppercase text-slate-900 truncate">
                Kawacanaan Presensi
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                Pilih Ruang Kerja (Workspace)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[170px]">
                {currentUser?.name || currentUser?.username}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                {currentUser?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              id="btn-workspace-logout"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Compact & Balanced */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 lg:py-10 flex flex-col justify-center">
        <div className="space-y-6 sm:space-y-8">
          {/* Header Title Section */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold uppercase tracking-wider">
              <Layers size={13} />
              <span>Ruang Kerja Sistem</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
              Pilih Ruang Kerja Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              Sistem memisahkan akses secara tertata antara <strong>Ruang Kerja Sekolah</strong> (kelembagaan resmi terpadu) dan <strong>Ruang Kerja Individu</strong> (mandiri pendidik).
            </p>
          </div>

          {/* 2 Primary Workspace Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* 1. Ruang Kerja Sekolah */}
            <div
              className={`bg-white rounded-2xl border-2 transition-all p-5 sm:p-6 flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                !isCurrentlyPersonal && schoolWs
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Active Badge */}
              {!isCurrentlyPersonal && schoolWs && (
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>Sedang Aktif</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Card Icon & Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Building2 size={22} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-20">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
                        KELEMBAGAAN
                      </span>
                      {schoolWs && getRoleBadge(schoolWs)}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {schoolWs?.workspaceName || currentUser?.schoolName || 'Ruang Kerja Sekolah'}
                    </h3>
                    {schoolWs?.npsn && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        NPSN: <strong>{schoolWs.npsn}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Ruang kerja terhubung dengan data kelembagaan sekolah, sinkronisasi antar pendidik (Wali Kelas, Guru Mapel, Kepala Sekolah), dan data siswa terintegrasi.
                </p>

                {/* Key Features List */}
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Terhubung ke basis data dan kalender akademik sekolah</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Presensi per jam pelajaran mapel & harian wali kelas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <span>Rekapitulasi dan laporan resmi lembaga</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-slate-100 flex flex-col gap-2">
                {schoolWs ? (
                  <button
                    type="button"
                    onClick={handleOpenSchoolWs}
                    className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px] ${
                      !isCurrentlyPersonal
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-900 hover:bg-blue-600 text-white active:scale-98'
                    }`}
                    id="btn-select-school-ws"
                  >
                    <span>{!isCurrentlyPersonal ? 'Buka Ruang Kerja Sekolah' : 'Beralih ke Ruang Kerja Sekolah'}</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(true)}
                      className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px]"
                      id="btn-join-school-code"
                    >
                      <PlusCircle size={15} />
                      <span>Hubungkan dengan Kode Sekolah</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                      Masukkan kode undangan dari operator / admin sekolah Anda
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Ruang Kerja Individu */}
            <div
              className={`bg-white rounded-2xl border-2 transition-all p-5 sm:p-6 flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                isCurrentlyPersonal
                  ? 'border-emerald-600 ring-2 ring-emerald-100'
                  : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              {/* Active Badge */}
              {isCurrentlyPersonal && (
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Sedang Aktif</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Card Icon & Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <UserCheck size={22} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-20">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                        MANDIRI PENDIDIK
                      </span>
                      {personalWs ? getRoleBadge(personalWs) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                          Pendidik Mandiri
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      Ruang Kerja Individu
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Paket Mandiri • Fleksibel & Cepat
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Ruang kerja independen untuk guru mengelola daftar siswa, mencatat presensi harian / mata pelajaran secara mandiri tanpa membutuhkan akun kelembagaan.
                </p>

                {/* Key Features List */}
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Fleksibel dan praktis digunakan guru secara perorangan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Kelola kelas binaan dan daftar siswa mandiri</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Cetak dan unduh rekapitulasi presensi mandiri</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleOpenPersonalWs}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px] ${
                    isCurrentlyPersonal
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-emerald-600 text-white active:scale-98'
                  }`}
                  id="btn-select-personal-ws"
                >
                  <span>{isCurrentlyPersonal ? 'Buka Ruang Kerja Individu' : 'Beralih ke Ruang Kerja Individu'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Any other workspaces (e.g. Super Admin or multi-school) */}
          {userWorkspaces.length > 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Ruang Kerja Lainnya ({userWorkspaces.length})
              </h4>
              <div className="divide-y divide-slate-100">
                {userWorkspaces.map((ws) => {
                  const isSelected = activeWorkspace?.workspaceId === ws.workspaceId;
                  return (
                    <div
                      key={ws.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {ws.workspaceType === 'personal' ? (
                          <UserCheck size={16} className="text-emerald-600 shrink-0" />
                        ) : ws.role === 'SUPER_ADMIN' ? (
                          <Shield size={16} className="text-purple-600 shrink-0" />
                        ) : (
                          <Building2 size={16} className="text-blue-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 truncate">
                          {ws.workspaceName || (ws.workspaceType === 'personal' ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah')}
                        </span>
                        {getRoleBadge(ws)}
                      </div>
                      <button
                        type="button"
                        onClick={() => void selectWorkspace(ws)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Aktif' : 'Pilih'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Join School Modal */}
      <JoinSchoolModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {/* Visual Book Loading Modal for Workspace Switch */}
      <BookLoadingModal
        isOpen={isSwitchingWorkspace}
        title={switchingWorkspaceTitle || "Memuat Ruang Kerja..."}
        subtitle="Sistem sedang mengalihkan profil, izin akses rombel kelas, dan basis data presensi."
        badgeText="PERGANTIAN RUANG KERJA"
        progress={switchingWorkspaceProgress}
        statusMessage={switchingWorkspaceMessage}
      />
    </div>
  );
};


