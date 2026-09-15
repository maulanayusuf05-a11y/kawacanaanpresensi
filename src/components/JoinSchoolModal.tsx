import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import {
  Building2,
  KeyRound,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  School,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  UserCheck
} from 'lucide-react';

interface JoinSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinSchoolModal: React.FC<JoinSchoolModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userWorkspaces, selectWorkspace, showToast, loadData, switchToSchoolWorkspace } = useApp();

  const existingSchoolWs = userWorkspaces.find(
    (ws) => ws.workspaceType !== 'personal' && ws.workspaceType !== 'individu'
  );

  const [schoolCode, setSchoolCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSchool, setVerifiedSchool] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Role in School
  const [role, setRole] = useState<'WALI KELAS' | 'GURU MAPEL'>('WALI KELAS');
  const [selectedSubjectClassIds, setSelectedSubjectClassIds] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState<string>('Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');

  const [teacherName, setTeacherName] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setTeacherName(currentUser.name || currentUser.username || '');
      setTeacherNip(currentUser.nip || '');
      if (currentUser.role === 'GURU MAPEL') {
        setRole('GURU MAPEL');
      } else {
        setRole('WALI KELAS');
      }
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (isOpen && existingSchoolWs?.workspaceCode && !schoolCode) {
      setSchoolCode(existingSchoolWs.workspaceCode);
    }
  }, [isOpen, existingSchoolWs]);

  if (!isOpen || !currentUser) return null;

  const handleVerifyCode = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || schoolCode).trim();
    if (!targetCode || targetCode.length < 3) {
      setVerifyError('Masukkan minimal 4-8 karakter kode sekolah.');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');
    setVerifiedSchool(null);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_schools', query: targetCode }),
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.schools) && data.schools.length > 0) {
        const found = data.schools[0];
        setVerifiedSchool(found);
        setSelectedSubjectClassIds([]);
      } else {
        setVerifyError('Sekolah tidak ditemukan dengan kode ini. Silakan tanyakan kode resmi kepada Administrator Sekolah.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Gagal memverifikasi kode sekolah.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedSchool) {
      setVerifyError('Silakan verifikasi kode sekolah terlebih dahulu.');
      return;
    }

    if (!teacherName.trim()) {
      showToast('Nama lengkap pendidik wajib diisi.', 'error');
      return;
    }

    const finalSubject = (isCustomSubject ? customSubjectName.trim() : subjectName.trim()) || 'Guru Mapel';

    if (role === 'GURU MAPEL') {
      if (!finalSubject) {
        showToast('Nama mata pelajaran wajib diisi.', 'error');
        return;
      }
      if (
        verifiedSchool.classes &&
        verifiedSchool.classes.length > 0 &&
        selectedSubjectClassIds.length === 0
      ) {
        showToast('Pilih minimal satu kelas yang diajar.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        action: 'join_school_workspace',
        userId: currentUser.id,
        user_id: currentUser.id,
        schoolId: verifiedSchool.id,
        schoolCode: verifiedSchool.code || schoolCode.trim(),
        role: role,
        teacherName: teacherName.trim(),
        name: teacherName.trim(),
        nip: teacherNip.trim() || null,
        subjectName: role === 'GURU MAPEL' ? finalSubject : '',
        classIds: role === 'GURU MAPEL' ? selectedSubjectClassIds : [],
        classId: null,
        className: null,
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesi login telah berakhir. Silakan login kembali.');

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.ok && !result.success) {
        throw new Error(result.error || 'Gagal terhubung ke ruang kerja sekolah.');
      }

      showToast(result.message || `Berhasil terhubung ke Ruang Kerja Sekolah: ${verifiedSchool.name}!`, 'success');
      onClose();

      if (result.workspace) {
        await selectWorkspace(result.workspace);
      } else {
        await loadData(currentUser.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat bergabung ke sekolah.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight uppercase">
                Gabung ke Ruang Kerja Sekolah
              </h3>
              <p className="text-xs text-blue-100">
                Masukkan kode sekolah resmi dari Administrator Sekolah
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleJoinSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick info if user already has an existing school workspace */}
          {existingSchoolWs && !verifiedSchool && (
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Sekolah Terdaftar Sebelumnya</span>
                <span className="font-bold text-indigo-950 truncate block text-sm">{existingSchoolWs.workspaceName}</span>
                {existingSchoolWs.workspaceCode && (
                  <span className="text-[11px] text-indigo-700 font-mono font-bold">Kode: {existingSchoolWs.workspaceCode}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (existingSchoolWs.workspaceCode) {
                    setSchoolCode(existingSchoolWs.workspaceCode);
                    void handleVerifyCode(existingSchoolWs.workspaceCode);
                  } else {
                    onClose();
                    void switchToSchoolWorkspace();
                  }
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-xs shrink-0 cursor-pointer"
              >
                Gunakan Kode Ini
              </button>
            </div>
          )}

          {/* Step 1: Input Kode Sekolah */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kode Sekolah / NPSN *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={schoolCode}
                  onChange={(e) => {
                    setSchoolCode(e.target.value.toUpperCase());
                    setVerifyError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyCode();
                    }
                  }}
                  placeholder="Contoh: 78AB2C atau 20101234"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isVerifying || !schoolCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mengecek...</span>
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    <span>Verifikasi</span>
                  </>
                )}
              </button>
            </div>
            {verifyError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}
          </div>

          {/* Verified School Card */}
          {verifiedSchool && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Sekolah Ditemukan</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase">
                  {verifiedSchool.jenjang || 'SD'}
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                {verifiedSchool.name}
              </h4>
              <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                {verifiedSchool.npsn && (
                  <span>NPSN: <strong className="font-mono">{verifiedSchool.npsn}</strong></span>
                )}
                {verifiedSchool.code && (
                  <span>Kode: <strong className="font-mono text-indigo-700">{verifiedSchool.code}</strong></span>
                )}
                {verifiedSchool.alamat && (
                  <span className="w-full text-[11px] text-slate-500 truncate">{verifiedSchool.alamat}</span>
                )}
              </div>
            </div>
          )}

          {/* Teacher Details & Role Form */}
          {verifiedSchool && (
            <div className="space-y-3.5 pt-2 border-t border-slate-100 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">
                    Nama Lengkap Pendidik *
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={teacherNip}
                    onChange={(e) => setTeacherNip(e.target.value)}
                    placeholder="— (Opsional)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Role Info Box */}
              <div className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/70">
                <div className="flex items-start gap-2.5">
                  {role === 'WALI KELAS' ? <UserCheck size={18} className="text-blue-600 shrink-0" /> : <BookOpen size={18} className="text-indigo-600 shrink-0" />}
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">
                      Penugasan di Sekolah: {role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel'}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Role akun Anda dikunci sebagai <strong>{role === 'WALI KELAS' ? 'Wali Kelas' : 'Guru Mapel'}</strong>.
                    </div>
                  </div>
                </div>
              </div>

              {/* If Wali Kelas: Penentuan Kelas oleh Admin */}
              {role === 'WALI KELAS' && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs">
                    <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                    <span>Penetapan Kelas oleh Administrator Sekolah</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-800">
                    Sesuai ketentuan, Anda bergabung sebagai <strong>Wali Kelas</strong>. Penentuan dan penetapan rombongan belajar (kelas) yang Anda bina akan ditentukan langsung oleh <strong>Administrator Sekolah</strong> melalui menu Data Kelas/Data Pengguna.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-blue-700 font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
                    <span>Giliran Administrator Sekolah menentukan rombel/kelas Anda setelah terhubung</span>
                  </div>
                </div>
              )}

              {/* If Guru Mapel: Mata Pelajaran & Kelas yang Diajarkan */}
              {role === 'GURU MAPEL' && (
                <div className="space-y-3">
                  {/* Subject Input */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Nama Mata Pelajaran *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSubject(!isCustomSubject)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {isCustomSubject ? 'Pilih dari Daftar Umum' : '+ Ketik Nama Mapel Lain'}
                      </button>
                    </div>

                    {isCustomSubject ? (
                      <input
                        type="text"
                        value={customSubjectName}
                        onChange={(e) => setCustomSubjectName(e.target.value)}
                        placeholder="Contoh: Informatika, Bahasa Arab, Koding, SBdP..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:border-indigo-600 outline-none text-xs"
                      />
                    ) : (
                      <select
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:border-indigo-600 outline-none text-xs"
                      >
                        <option value="Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)">Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)</option>
                        <option value="Pendidikan Agama Islam (PAI)">Pendidikan Agama Islam (PAI)</option>
                        <option value="Pendidikan Agama Kristen">Pendidikan Agama Kristen</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Bahasa Sunda / Daerah">Bahasa Sunda / Daerah</option>
                        <option value="Seni Budaya & Prakarya (SBdP)">Seni Budaya & Prakarya (SBdP)</option>
                        <option value="Pendidikan Pancasila & Kewarganegaraan (PPKn)">Pendidikan Pancasila & Kewarganegaraan (PPKn)</option>
                        <option value="Matematika">Matematika</option>
                        <option value="Ilmu Pengetahuan Alam dan Sosial (IPAS)">Ilmu Pengetahuan Alam dan Sosial (IPAS)</option>
                        <option value="Informatika / TIK">Informatika / TIK</option>
                      </select>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Guru Mapel dan Admin dapat mengisi atau menginput data mata pelajaran yang diajarkan.
                    </p>
                  </div>

                  {/* Classes Selection */}
                  <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Kelas yang Diajarkan *
                      </label>
                      <div className="flex items-center gap-2">
                        {verifiedSchool.classes && verifiedSchool.classes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedSubjectClassIds.length === verifiedSchool.classes.length) {
                                setSelectedSubjectClassIds([]);
                              } else {
                                setSelectedSubjectClassIds(verifiedSchool.classes.map((c: any) => c.id));
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            {selectedSubjectClassIds.length === verifiedSchool.classes.length ? 'Batal Semua' : 'Pilih Semua'}
                          </button>
                        )}
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {selectedSubjectClassIds.length} dipilih
                        </span>
                      </div>
                    </div>

                    {verifiedSchool.classes && verifiedSchool.classes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {verifiedSchool.classes.map((c: any) => {
                          const checked = selectedSubjectClassIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                                checked ? 'border-indigo-500 bg-indigo-50/80' : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedSubjectClassIds((prev) =>
                                    checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  )
                                }
                                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-800">
                        Belum ada data rombel di sekolah ini. Anda tetap dapat bergabung dan Administrator Sekolah dapat menambahkan kelas serta menugaskannya kepada Anda.
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Pilih semua rombel yang Anda ajar. Administrator dan Guru Mapel dapat mengelola data kelas ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !verifiedSchool}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <span>Gabung Ruang Kerja Sekolah</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
