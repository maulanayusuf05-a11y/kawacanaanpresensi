import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  UserCog,
  Users,
  Layers,
  RefreshCw,
  HeartPulse,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Send,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Hourglass,
  Ban,
  ArrowRight,
  Gift,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTenantLifecycleInfo } from '../../utils/tenantLifecycle';

export const DashboardTab: React.FC<{
  call: any;
  showToast: any;
  setTab: (t: string) => void;
}> = ({ call, showToast, setTab }) => {
  const { globalAnnouncement, updateGlobalAnnouncement, impersonateSchool } = useApp();
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState(globalAnnouncement?.message || '');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>(globalAnnouncement?.type || 'info');
  const [broadcastActive, setBroadcastActive] = useState<boolean>(globalAnnouncement?.active || false);
  const [savingBroadcast, setSavingBroadcast] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, hlth, annRes] = await Promise.all([
        call('dashboard'),
        call('health'),
        call('get_announcement').catch(() => null),
      ]);
      setData(dash);
      setHealth(hlth);
      if (annRes?.announcement) {
        setBroadcastMsg(annRes.announcement.message || '');
        setBroadcastType(annRes.announcement.type || 'info');
        setBroadcastActive(Boolean(annRes.announcement.active));
        await updateGlobalAnnouncement(annRes.announcement);
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

  useEffect(() => {
    if (globalAnnouncement) {
      setBroadcastMsg(globalAnnouncement.message || '');
      setBroadcastType(globalAnnouncement.type || 'info');
      setBroadcastActive(globalAnnouncement.active || false);
    }
  }, [globalAnnouncement]);

  const handleSaveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBroadcast(true);
    try {
      await call('save_announcement', {
        message: broadcastMsg,
        type: broadcastType,
        active: broadcastActive,
      });
      await updateGlobalAnnouncement({
        message: broadcastMsg,
        type: broadcastType,
        active: broadcastActive,
      });
      showToast('Pita pengumuman global platform berhasil disimpan & disiarkan.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengumuman platform.', 'error');
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handleQuickExtend = async (school: any, days: number, label: string) => {
    setActionLoading(`${school.school_id}-${days}`);
    try {
      const currentBase = school.subscription_expires_at ? new Date(school.subscription_expires_at) : new Date();
      const target = new Date(Math.max(Date.now(), currentBase.getTime()) + days * 24 * 60 * 60 * 1000);
      const newDateStr = target.toISOString().slice(0, 10);

      await call('update_school', {
        school_id: school.school_id,
        name: school.name,
        npsn: school.npsn,
        plan: school.plan,
        status: 'active',
        subscription_expires_at: newDateStr,
        notes: `${school.notes ? school.notes + ' | ' : ''}[+${days} hari ${label} pada ${new Date().toLocaleDateString('id-ID')}]`,
      });

      showToast(`Masa berlaku ${school.name} berhasil diperpanjang +${days} hari (${newDateStr}).`, 'success');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm space-y-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Memuat ringkasan platform & lisensi...</p>
      </div>
    );
  }

  const schools = data?.schools || [];
  
  // Categorize schools based on automated lifecycle
  const categorized = schools.map((s: any) => ({
    ...s,
    lifecycle: getTenantLifecycleInfo(s),
  }));

  const activeSchools = categorized.filter((s: any) => s.lifecycle.status === 'ACTIVE');
  const expiringSoonSchools = categorized.filter((s: any) => s.lifecycle.status === 'EXPIRING_SOON');
  const gracePeriodSchools = categorized.filter((s: any) => s.lifecycle.status === 'GRACE_PERIOD');
  const suspendedSchools = categorized.filter((s: any) => s.lifecycle.status === 'SUSPENDED');

  const attentionList = categorized
    .filter((s: any) => s.lifecycle.status !== 'ACTIVE')
    .sort((a: any, b: any) => (a.lifecycle.daysRemaining ?? 999) - (b.lifecycle.daysRemaining ?? 999));

  const t = data?.totals || {
    schools: schools.length,
    active: activeSchools.length,
    expiringSoon: expiringSoonSchools.length,
    gracePeriod: gracePeriodSchools.length,
    suspended: suspendedSchools.length,
    teachers: 0,
    students: 0,
    classes: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ringkasan Eksekutif Multi-Tenant</h2>
          <p className="text-xs text-slate-500">Status operasional otomatis seluruh tenant sekolah, pemantauan masa berlaku sistem, dan server health.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
          Perbarui Data
        </button>
      </div>

      {/* Subscription Lifecycle Status Pipeline Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Siklus Otomatis Masa Berlaku Sistem
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Sistem menghitung masa berlaku secara otomatis (Mulai + Durasi) dengan transisi berjenjang:
            </p>
          </div>

          {/* Pipeline Visual Stages */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>ACTIVE</span>
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1">
                {activeSchools.length}
              </span>
            </div>
            <ArrowRight size={13} className="text-slate-500 shrink-0" />
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock size={13} className="text-amber-400" />
              <span>EXPIRING_SOON</span>
              <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1">
                {expiringSoonSchools.length}
              </span>
            </div>
            <ArrowRight size={13} className="text-slate-500 shrink-0" />
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/30">
              <Hourglass size={13} className="text-orange-400" />
              <span>GRACE_PERIOD</span>
              <span className="bg-orange-500/30 text-orange-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1">
                {gracePeriodSchools.length}
              </span>
            </div>
            <ArrowRight size={13} className="text-slate-500 shrink-0" />
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Ban size={13} className="text-rose-400" />
              <span>SUSPENDED</span>
              <span className="bg-rose-500/30 text-rose-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1">
                {suspendedSchools.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Multi-Stage Lifecycle Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Stage */}
        <div 
          onClick={() => setTab('schools')}
          className="bg-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-emerald-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">1. Active</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{activeSchools.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Operasional normal</div>
        </div>

        {/* Expiring Soon Stage */}
        <div 
          onClick={() => setTab('schools')}
          className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">2. Expiring Soon</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{expiringSoonSchools.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Notifikasi H-30 s/d H-1</div>
        </div>

        {/* Grace Period Stage */}
        <div 
          onClick={() => setTab('schools')}
          className="bg-white border border-orange-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-orange-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">3. Grace Period</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition">
              <Hourglass size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-600 tracking-tight">{gracePeriodSchools.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Tenggang 7 hari sistem</div>
        </div>

        {/* Suspended Stage */}
        <div 
          onClick={() => setTab('schools')}
          className="bg-white border border-rose-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-rose-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">4. Suspended</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Ban size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">{suspendedSchools.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Akses ditangguhkan otomatis</div>
        </div>
      </div>

      {/* Aggregate Platform Capacity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tenant</span>
            <Building2 size={14} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{t.schools}</div>
          <div className="text-[10px] text-slate-400">Instansi & ruang kerja</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pendidik & Staff</span>
            <UserCog size={14} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{t.teachers}</div>
          <div className="text-[10px] text-slate-400">Guru, wali kelas, kepsek</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Siswa</span>
            <Users size={14} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{t.students}</div>
          <div className="text-[10px] text-slate-400">Data murid terhubung</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rombongan Belajar</span>
            <Layers size={14} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{t.classes}</div>
          <div className="text-[10px] text-slate-400">Kelas aktif</div>
        </div>
      </div>

      {/* Integrasi Semua Paket: Distribusi Paket Layanan Platform */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              Integrasi Seluruh Paket Layanan Platform
            </h3>
            <p className="text-xs text-slate-500">
              Pemantauan distribusi pengguna Paket Mulai / Gratis, Paket Guru Mandiri, dan Paket Institusi Sekolah.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Total {t.schools} Ruang Kerja Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Paket Mulai / Gratis Card */}
          <div
            onClick={() => setTab('schools')}
            className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-2 border-emerald-200/80 hover:border-emerald-500 rounded-2xl p-5 transition shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                Paket Mulai / Gratis
              </span>
              <span className="text-xs font-black text-emerald-700">Rp0 / bln</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 group-hover:text-emerald-700 transition">
                {t.planBreakdown?.mulai ?? schools.filter((s: any) => (s.plan === 'mulai' || s.plan === 'free')).length}
              </div>
              <span className="text-xs text-emerald-700 font-bold">
                {schools.length > 0
                  ? `${Math.round(((t.planBreakdown?.mulai ?? schools.filter((s: any) => (s.plan === 'mulai' || s.plan === 'free')).length) / schools.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              1 Guru Mandiri (Wali Kelas/Mapel), maks 32 siswa, 1 rombel.
            </p>
            <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
              <span>Buka Data Tenant &raquo;</span>
            </div>
          </div>

          {/* Paket Guru Card */}
          <div
            onClick={() => setTab('schools')}
            className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-2 border-blue-200/80 hover:border-blue-500 rounded-2xl p-5 transition shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300/60">
                Paket Guru Mandiri
              </span>
              <span className="text-xs font-black text-blue-700">Rp31.000 / bln</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 group-hover:text-blue-700 transition">
                {t.planBreakdown?.teacher ?? schools.filter((s: any) => (s.plan === 'teacher' || s.plan === 'guru')).length}
              </div>
              <span className="text-xs text-blue-700 font-bold">
                {schools.length > 0
                  ? `${Math.round(((t.planBreakdown?.teacher ?? schools.filter((s: any) => (s.plan === 'teacher' || s.plan === 'guru')).length) / schools.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              1 Guru Mandiri, ekspor lengkap, multi-guru per sekolah.
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-800 font-bold">
              <span>Buka Data Tenant &raquo;</span>
            </div>
          </div>

          {/* Paket Sekolah Card */}
          <div
            onClick={() => setTab('schools')}
            className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border-2 border-indigo-200/80 hover:border-indigo-500 rounded-2xl p-5 transition shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300/60">
                Paket Sekolah Institusi
              </span>
              <span className="text-xs font-black text-indigo-700">Rp270.000 / bln</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 group-hover:text-indigo-700 transition">
                {t.planBreakdown?.school ?? schools.filter((s: any) => (s.plan === 'school' || s.plan === 'sekolah')).length}
              </div>
              <span className="text-xs text-indigo-700 font-bold">
                {schools.length > 0
                  ? `${Math.round(((t.planBreakdown?.school ?? schools.filter((s: any) => (s.plan === 'school' || s.plan === 'sekolah')).length) / schools.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              8 Guru + 1 Kepsek, 8 Rombel, 256 Siswa, fitur penuh terbuka.
            </p>
            <div className="mt-3 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-indigo-800 font-bold">
              <span>Buka Data Tenant &raquo;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Expiration Alert & Quick Renewal Center */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Pusat Notifikasi Masa Berlaku & Override Cepat
                {attentionList.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                    {attentionList.length} Tenant
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Deteksi otomatis sekolah yang mendekati batas waktu (H-30 s/d H-1), masa tenggang, atau ditangguhkan dengan tombol tindakan cepat.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('schools')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200/60 transition cursor-pointer self-start sm:self-auto"
          >
            Kelola Semua Tenant <ArrowRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {attentionList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Seluruh Tenant Sekolah dalam Kondisi Aktif Normal</div>
              <p className="text-xs text-slate-400">Tidak ada tenant sekolah yang berada dalam masa peringatan, masa tenggang, atau suspended.</p>
            </div>
          ) : (
            attentionList.map((s: any) => {
              const lc = s.lifecycle;
              return (
                <div key={s.school_id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${lc.badgeClass}`}>
                        {lc.status}
                      </span>
                      {lc.alertMilestone && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                          {lc.alertMilestone}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap">
                      <span>
                        📅 Berakhir:{' '}
                        <strong>
                          {s.subscription_expires_at
                            ? new Date(s.subscription_expires_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </strong>
                      </span>
                      <span className={lc.alertSeverity === 'danger' || lc.alertSeverity === 'critical' ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {lc.description}
                      </span>
                    </div>
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleQuickExtend(s, 30, 'Paket 1 Bulan')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      +1 Bulan
                    </button>
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleQuickExtend(s, 365, 'Paket 1 Tahun')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      +1 Tahun
                    </button>
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleQuickExtend(s, 14, 'Kompensasi / Promo 14 Hari')}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      🎁 +14 Hari Promo
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Middle: Broadcast Banner & Platform Health */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Global Broadcast / Maintenance Banner Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Send size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Global Broadcast & Pengumuman Platform</h3>
                <p className="text-xs text-slate-500">Tampilkan pita pesan penting ke seluruh header dashboard sekolah dan guru.</p>
              </div>
            </div>
            {broadcastActive && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tayang Aktif
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBroadcast} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teks Pesan Pengumuman</label>
              <input
                type="text"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Contoh: Pemeliharaan server dijadwalkan pada hari Sabtu pukul 23:00 WIB."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe / Tingkat Kepentingan</label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700"
                >
                  <option value="info">ℹ️ Informasi Normal (Biru Indigo)</option>
                  <option value="warning">⚠️ Peringatan Pemeliharaan (Kuning Amber)</option>
                  <option value="alert">🚨 Gangguan Kritis / Darurat (Merah Rose)</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">Aktifkan Pita Banner</span>
                  <input
                    type="checkbox"
                    checked={broadcastActive}
                    onChange={(e) => setBroadcastActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Pembaruan akan langsung terlihat pada header seluruh pengguna tanpa perlu login ulang.
              </span>
              <button
                type="submit"
                disabled={savingBroadcast}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send size={13} />
                {savingBroadcast ? 'Menyimpan...' : 'Simpan & Siarkan'}
              </button>
            </div>
          </form>
        </div>

        {/* Server & DB Health Status */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <HeartPulse size={16} className="text-emerald-500" />
                Status Infrastruktur
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                health?.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {health?.ok ? 'Database Online' : 'Koneksi Gangguan'}
              </span>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Latensi Database:</span>
                <span className="font-mono font-bold text-slate-800">{health?.responseMs || 0} ms</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Sinkronisasi Edge:</span>
                <span className="font-bold text-emerald-600">Aktif & Sinkron</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Pengecekan Terakhir:</span>
                <span className="font-mono text-slate-600">
                  {health?.checkedAt ? new Date(health.checkedAt).toLocaleTimeString('id-ID') : '-'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setTab('schools')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            Buka Manajemen Sekolah <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Impersonate / School Highlights */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              Akses Cepat & Simulasi Tenant Sekolah
            </h3>
            <p className="text-xs text-slate-400">Masuk sebagai Admin sekolah untuk membantu troubleshooting kendala teknis.</p>
          </div>
          <button
            onClick={() => setTab('schools')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
          >
            Lihat Semua ({schools.length}) <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {schools.slice(0, 5).map((s: any) => (
            <div key={s.school_id} className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span>{s.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    s.plan === 'school' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {s.plan}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                  <span>NPSN: {s.npsn || '—'}</span>
                  <span>·</span>
                  <span>{s.student_count} Siswa</span>
                  <span>·</span>
                  <span>{s.teacher_admin_count} Guru</span>
                  <span>·</span>
                  <span className={s.status === 'active' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                    {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => impersonateSchool({ id: s.school_id, name: s.name, plan: s.plan })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Simulasi Login Sebagai Admin Sekolah"
                >
                  <ExternalLink size={13} />
                  Login As Admin
                </button>
                <button
                  onClick={() => setTab('schools')}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
