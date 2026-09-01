import React from 'react';
import { useApp } from '../context/AppContext';
import { WorkspaceMembership } from '../types';
import { BookLoadingModal } from '../components/BookLoader';
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
  } = useApp();

  const getWorkspaceIcon = (membership: WorkspaceMembership) => {
    if (membership.workspaceType === 'personal') {
      return membership.role === 'GURU MAPEL' ? <BookOpen size={24} className="text-emerald-600" /> : <UserCheck size={24} className="text-indigo-600" />;
    }
    if (membership.role === 'SUPER_ADMIN') {
      return <Shield size={24} className="text-purple-600" />;
    }
    if (membership.role === 'SISWA') {
      return <Users size={24} className="text-blue-600" />;
    }
    return <Building2 size={24} className="text-indigo-600" />;
  };

  const getRoleBadge = (membership: WorkspaceMembership) => {
    switch (membership.role) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">Super Admin</span>;
      case 'ADMIN':
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider">Admin Sekolah</span>;
      case 'WALI KELAS':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">Wali Kelas</span>;
      case 'GURU MAPEL':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">Guru Mata Pelajaran</span>;
      case 'SISWA':
        return <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">Siswa</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">{membership.role}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8 shadow-xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              K
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight uppercase text-slate-900 leading-tight">
                Kawacanaan Presensi
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Pilih Ruang Kerja (Workspace)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                {currentUser?.name || currentUser?.username}
              </span>
              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                {currentUser?.email}
              </span>
            </div>
            <button
              onClick={() => void logout()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Layers size={13} />
              2 Ruang Kerja Sistem
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Pilih Ruang Kerja
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sistem menyediakan 2 pilihan ruang kerja: <strong>Ruang Kerja Sekolah</strong> dan <strong>Ruang Kerja Individu</strong>. Silakan pilih ruang kerja yang ingin Anda buka:
            </p>
          </div>

          {/* List Kartu Workspace */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {userWorkspaces.map((ws) => {
              const isSelected = activeWorkspace?.workspaceId === ws.workspaceId;
              const isPersonal = ws.workspaceType === 'personal';

              return (
                <div
                  key={ws.id}
                  className={`bg-white border-2 ${
                    isSelected ? 'border-indigo-600 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-400 hover:shadow-md'
                  } rounded-2xl p-5 sm:p-6 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${isPersonal ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200'} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      {getWorkspaceIcon(ws)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {isPersonal ? 'Ruang Kerja Individu' : (ws.workspaceName || 'Ruang Kerja Sekolah')}
                        </h3>
                        {getRoleBadge(ws)}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            <CheckCircle2 size={11} />
                            Sedang Aktif
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        {isPersonal
                          ? 'Ruang kerja mandiri pendidik (Paket Mulai / Gratis) untuk kelola presensi kelas & siswa mandiri.'
                          : `Ruang kerja kelembagaan sekolah${ws.npsn ? ` (NPSN: ${ws.npsn})` : ''} terhubung antar pendidik & data sekolah.`}
                      </p>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                        <span>
                          Tipe: <strong className="text-slate-700">{isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'}</strong>
                        </span>
                        {ws.subscription && (
                          <span>
                            • Paket: <strong className="text-indigo-600 capitalize">{ws.subscription.package}</strong>
                          </span>
                        )}
                        {ws.className && <span>• Kelas: <strong>{ws.className}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void selectWorkspace(ws)}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-900 hover:bg-indigo-600 text-white active:scale-95'
                    }`}
                  >
                    <span>{isSelected ? 'Buka Sekarang' : 'Masuk'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>

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

