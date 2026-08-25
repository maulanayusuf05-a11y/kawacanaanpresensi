import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  BookOpen,
  Users,
  Building2,
  UserCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  School,
  Lock,
  ChevronRight,
  LogOut,
  Zap,
  Eye,
  EyeOff,
  Mail,
  User,
  Phone,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { supabase, signInWithEmail } from '../lib/supabaseClient';

type OnboardingRole = 'homeroom' | 'subject' | 'student';
type OnboardingPath = 'school' | 'personal';

interface OnboardingViewProps {
  onCompleted?: (userId: string) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onCompleted }) => {
  const { showToast, logout, loadUserDataAfterOnboarding } = useApp();

  // Current authenticated user info from Supabase session (for Google SSO users)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [hasGoogleSession, setHasGoogleSession] = useState<boolean>(false);

  // Step state: 1 = Pilih Peran, 2 = Form Pengisian Identitas & Ruang Kerja
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>('school');

  // Supabase Auth Registration States (username, password, email, full name)
  const [accountFullName, setAccountFullName] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  // Profile & Role details
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherGender, setTeacherGender] = useState<'L' | 'P'>('L');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmploymentStatus, setTeacherEmploymentStatus] = useState<string>('PNS');

  // School Search & Assign States
  const [schoolQuery, setSchoolQuery] = useState('');
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);
  const [searchedSchools, setSearchedSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schoolJoinClassMode, setSchoolJoinClassMode] = useState<'select' | 'new'>('select');
  const [schoolNewGrade, setSchoolNewGrade] = useState<number>(5);
  const [schoolNewClassName, setSchoolNewClassName] = useState<string>('Kelas 5');

  // Personal Workspace States
  const [customClassName, setCustomClassName] = useState('Kelas 4A');
  const [customGrade, setCustomGrade] = useState<number>(4);
  const [customWorkspaceName, setCustomWorkspaceName] = useState('');
  const [subjectName, setSubjectName] = useState('Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)');

  // Student specific states
  const [studentNisn, setStudentNisn] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any | null>(null);
  const [studentSearchError, setStudentSearchError] = useState('');

  // Submit loading & error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Detect existing Supabase session (e.g. from Google SSO)
  useEffect(() => {
    const updateUserFromSession = (user: any) => {
      if (user) {
        setHasGoogleSession(true);
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || '');
        const meta = user.user_metadata || {};
        const name = meta.full_name || meta.name || user.email?.split('@')[0] || '';
        setCurrentUserName(name);
        setAccountFullName((prev) => prev || name);
        setAccountEmail((prev) => prev || user.email || '');
        setAccountUsername((prev) => prev || (user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') : ''));
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        updateUserFromSession(data.session.user);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        updateUserFromSession(session.user);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Auto-generate suggested username from Full Name if not manually edited
  const handleFullNameChange = (name: string) => {
    setAccountFullName(name);
    if (!usernameManuallyEdited && !hasGoogleSession) {
      const sanitized = name
        .toLowerCase()
        .replace(/dr\.|dra\.|drs\.|s\.pd\.|m\.pd\.|h\.|hj\./gi, '')
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
        .slice(0, 24);
      if (sanitized) {
        setAccountUsername(sanitized);
      }
    }
  };

  // Handle selecting the role in Step 1
  const handleSelectRole = (role: OnboardingRole) => {
    setSelectedRole(role);
    setFormError('');
    if (role === 'student') {
      setSelectedPath('school');
    } else {
      setSelectedPath('school');
    }
    setStep(2);
  };

  // Search / Lookup schools via /api/onboarding using School Join Code
  const handleSearchSchool = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    const codeToSearch = (overrideCode || schoolQuery).trim().toUpperCase();
    if (!codeToSearch) {
      setFormError('Harap masukkan Kode Undangan Sekolah terlebih dahulu.');
      return;
    }

    setIsSearchingSchool(true);
    setFormError('');
    setSelectedSchool(null);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_school', code: codeToSearch, query: codeToSearch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memverifikasi kode sekolah');

      if (!data.schools || data.schools.length === 0) {
        throw new Error(`Kode sekolah "${codeToSearch}" tidak ditemukan. Pastikan kode yang dimasukkan sudah benar.`);
      }

      setSearchedSchools(data.schools);
      const school = data.schools[0];
      setSelectedSchool(school);
      if (school.classes?.length > 0) {
        setSelectedClassId(school.classes[0].id);
        setSchoolJoinClassMode('select');
      } else {
        setSelectedClassId('__NEW_CLASS__');
        setSchoolJoinClassMode('new');
      }
      showToast(`Sekolah "${school.name}" berhasil ditemukan dan diverifikasi!`, 'success');
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat memverifikasi kode sekolah.');
      setSearchedSchools([]);
      setSelectedSchool(null);
    } finally {
      setIsSearchingSchool(false);
    }
  };

  // Search student via /api/onboarding
  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = studentNisn.replace(/\D/g, '').trim();
    if (!cleanNisn) {
      setStudentSearchError('Harap masukkan NISN siswa yang valid.');
      return;
    }

    setIsSearchingStudent(true);
    setStudentSearchError('');
    setFoundStudent(null);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_student', nisn: cleanNisn }),
      });
      const data = await res.json();
      if (!res.ok || !data.student) {
        setStudentSearchError(
          data.error || 'Data siswa belum ditemukan. Silakan hubungi wali kelas atau administrator sekolah.'
        );
        return;
      }
      setFoundStudent(data.student);
      if (!accountFullName) {
        setAccountFullName(data.student.nama);
      }
      if (!accountUsername) {
        setAccountUsername(`siswa.${data.student.nisn}`);
      }
    } catch (err: any) {
      setStudentSearchError(
        err.message || 'Data siswa belum ditemukan. Silakan hubungi wali kelas atau administrator sekolah.'
      );
    } finally {
      setIsSearchingStudent(false);
    }
  };

  // Submit Onboarding
  const handleSubmitOnboarding = async () => {
    setFormError('');
    setIsSubmitting(true);

    try {
      // 1. Validasi Input Identitas jika registrasi baru Supabase Auth
      if (!hasGoogleSession) {
        if (!accountFullName.trim()) {
          throw new Error('Nama lengkap wajib diisi.');
        }
        if (!accountUsername.trim()) {
          throw new Error('Username wajib diisi sebagai identitas akun.');
        }
        if (accountUsername.trim().length < 3) {
          throw new Error('Username minimal terdiri dari 3 karakter.');
        }
        if (!accountPassword) {
          throw new Error('Kata sandi wajib diisi.');
        }
        if (accountPassword.length < 6) {
          throw new Error('Kata sandi minimal 6 karakter demi keamanan.');
        }
        if (accountPassword !== accountConfirmPassword) {
          throw new Error('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
        }
      }

      // 2. Validasi Khusus Peran
      if (selectedRole === 'homeroom' || selectedRole === 'subject') {
        if (selectedPath === 'school' && !selectedSchool) {
          throw new Error('Silakan cari dan pilih sekolah tempat Anda bertugas terlebih dahulu.');
        }
      } else if (selectedRole === 'student') {
        if (!selectedSchool) {
          throw new Error('Silakan cari melalui NPSN atau nama sekolah dan pilih sekolah tempat Anda belajar.');
        }
        if (!selectedClassId || !selectedSchool?.classes?.length) {
          throw new Error('Silakan pilih rombel / kelas yang tersedia di sekolah tersebut.');
        }
      }

      const roleStr = selectedRole === 'homeroom' ? 'WALI KELAS' : selectedRole === 'subject' ? 'GURU' : 'SISWA';

      // 3. Eksekusi Flow: Registrasi Akun Baru vs Akun Google SSO yang Sudah Login
      if (!hasGoogleSession) {
        // Mode A: REGISTRASI SUPABASE AUTH (Buat Akun Gratis)
        let payload: any;

        if (selectedRole === 'student') {
          payload = {
            action: 'register_and_onboard',
            fullName: accountFullName.trim(),
            username: accountUsername.trim().toLowerCase(),
            email: accountEmail.trim().toLowerCase() || `${accountUsername.trim().toLowerCase()}@login.edushift.local`,
            password: accountPassword,
            role: 'SISWA',
            mode: 'school',
            gender: teacherGender,
            phone: '-',
            schoolId: selectedSchool.id,
            schoolName: selectedSchool.name,
            classId: selectedClassId,
            studentId: null,
            nisn: studentNisn.trim() || null,
            workspaceName: `Portal Siswa ${selectedSchool?.name || ''}`,
          };
        } else {
          const isCreatingNewInSchool =
            !selectedClassId ||
            selectedClassId === '__NEW_CLASS__' ||
            schoolJoinClassMode === 'new' ||
            !selectedSchool?.classes ||
            selectedSchool.classes.length === 0;

          payload = {
            action: 'register_and_onboard',
            fullName: accountFullName.trim(),
            username: accountUsername.trim().toLowerCase(),
            email: accountEmail.trim().toLowerCase() || `${accountUsername.trim().toLowerCase()}@login.edushift.local`,
            password: accountPassword,
            role: roleStr,
            mode: selectedPath,
            nip: teacherNip.trim() || '-',
            gender: teacherGender,
            phone: teacherPhone.trim() || '-',
            employmentStatus: teacherEmploymentStatus,
            schoolId: selectedSchool?.id || null,
            schoolName: selectedSchool?.name || '',
            classId: isCreatingNewInSchool ? null : selectedClassId,
            className:
              selectedPath === 'school'
                ? isCreatingNewInSchool
                  ? schoolNewClassName || `Kelas ${schoolNewGrade || 5}`
                  : undefined
                : customClassName || 'Kelas 4A',
            grade:
              selectedPath === 'school'
                ? isCreatingNewInSchool
                  ? schoolNewGrade || 5
                  : undefined
                : customGrade || 4,
            subjectName: subjectName || 'Pendidikan Jasmani / Agama',
            workspaceName:
              customWorkspaceName ||
              (selectedRole === 'homeroom'
                ? `Ruang Kelas ${accountFullName.trim()}`
                : `Ruang Mengajar ${subjectName} - ${accountFullName.trim()}`),
            studentId: null,
            nisn: null,
          };
        }

        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Gagal mendaftarkan akun dan ruang kerja.');
        }

        // Login otomatis ke Supabase Auth dengan kredensial baru
        const loginIdentifier = result.email || accountUsername.trim();
        const loginResult = await signInWithEmail(loginIdentifier, accountPassword);
        if (loginResult.error) {
          // Jika login otomatis gagal, tetap informasikan berhasil dan arahkan reload
          console.warn('Auto sign-in warning:', loginResult.error);
        }

        showToast(result.message || 'Pendaftaran berhasil! Membuka ruang kerja...', 'success');

        if (onCompleted) {
          onCompleted(result.userId);
        } else if (loadUserDataAfterOnboarding) {
          await loadUserDataAfterOnboarding(result.userId);
        } else {
          window.location.reload();
        }
      } else {
        // Mode B: GOOGLE SSO (Sudah punya token sesi)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error('Sesi autentikasi Google telah berakhir. Silakan login kembali.');
        }

        let payload: any = {};

        if (selectedRole === 'homeroom') {
          if (selectedPath === 'school') {
            const isCreatingNewInSchool =
              !selectedClassId ||
              selectedClassId === '__NEW_CLASS__' ||
              schoolJoinClassMode === 'new' ||
              !selectedSchool.classes ||
              selectedSchool.classes.length === 0;

            payload = {
              action: 'onboard_homeroom',
              mode: 'school',
              schoolId: selectedSchool.id,
              schoolName: selectedSchool.name,
              npsn: selectedSchool.npsn,
              teacherName: accountFullName || currentUserName || 'Wali Kelas',
              nip: teacherNip || '-',
              gender: teacherGender,
              phone: teacherPhone || '-',
              employmentStatus: teacherEmploymentStatus,
              classId: isCreatingNewInSchool ? null : selectedClassId,
              className: isCreatingNewInSchool ? schoolNewClassName || `Kelas ${schoolNewGrade || 5}` : undefined,
              grade: isCreatingNewInSchool ? schoolNewGrade || 5 : undefined,
            };
          } else {
            payload = {
              action: 'onboard_homeroom',
              mode: 'personal',
              teacherName: accountFullName || currentUserName || 'Wali Kelas',
              nip: teacherNip || '-',
              gender: teacherGender,
              phone: teacherPhone || '-',
              employmentStatus: teacherEmploymentStatus,
              workspaceName: customWorkspaceName || `Ruang Kelas ${accountFullName || currentUserName || 'Wali Kelas'}`,
              className: customClassName || 'Kelas 4',
              grade: customGrade || 4,
            };
          }
        } else if (selectedRole === 'subject') {
          if (selectedPath === 'school') {
            payload = {
              action: 'onboard_subject_teacher',
              mode: 'school',
              schoolId: selectedSchool.id,
              schoolName: selectedSchool.name,
              npsn: selectedSchool.npsn,
              teacherName: accountFullName || currentUserName || 'Guru Mapel',
              nip: teacherNip || '-',
              gender: teacherGender,
              phone: teacherPhone || '-',
              employmentStatus: teacherEmploymentStatus,
              subjectName: subjectName || 'Pendidikan Jasmani / Agama',
            };
          } else {
            payload = {
              action: 'onboard_subject_teacher',
              mode: 'personal',
              teacherName: accountFullName || currentUserName || 'Guru Mapel',
              nip: teacherNip || '-',
              gender: teacherGender,
              phone: teacherPhone || '-',
              employmentStatus: teacherEmploymentStatus,
              workspaceName: customWorkspaceName || `Ruang Mengajar ${subjectName} - ${accountFullName || currentUserName}`,
              subjectName: subjectName || 'Pendidikan Jasmani / Agama',
            };
          }
        } else if (selectedRole === 'student') {
          payload = {
            action: 'onboard_student',
            schoolId: selectedSchool.id,
            classId: selectedClassId,
            studentName: accountFullName.trim() || currentUserName,
            gender: teacherGender,
            phone: '-',
            nisn: studentNisn.trim() || null,
          };
        }

        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Gagal menyelesaikan onboarding ruang kerja.');
        }

        const effectiveUserId = result.userId || currentUserId || sessionData.session?.user?.id;
        showToast(result.message || 'Pendaftaran berhasil! Membuka aplikasi...', 'success');

        if (onCompleted) {
          await onCompleted(effectiveUserId);
        } else if (loadUserDataAfterOnboarding) {
          await loadUserDataAfterOnboarding(effectiveUserId);
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.error('Onboarding submit error:', err);
      setFormError(err.message || 'Terjadi kendala saat memproses pendaftaran.');
      showToast(err.message || 'Gagal menyelesaikan pendaftaran.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Top Bar Navigation */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              K
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight uppercase text-slate-900 leading-tight">
                Kawacanaan Presensi
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {hasGoogleSession ? 'Aktivasi Akun Google & Ruang Kerja' : 'Pendaftaran Akun Baru & Ruang Kerja'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasGoogleSession ? (
              <>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                    {currentUserName || 'Pengguna Google'}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {currentUserEmail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Keluar / Ganti Akun Google"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void logout()}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                id="btn-onboarding-back-to-login"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* ========================================================================= */}
        {/* LANGKAH 1: PILIH PERAN                                                    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={13} />
                Langkah 1 dari 2: Tentukan Peran Anda
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Pilih Peran Anda dalam Aplikasi
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {hasGoogleSession
                  ? 'Akun Google Anda berhasil diverifikasi. Silakan pilih bagaimana Anda akan beraktivitas di Kawacanaan Presensi.'
                  : 'Daftar akun gratis dan pilih peran Anda untuk mulai mengelola kehadiran, siswa, dan ruang kerja digital.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* KARTU 1: WALI KELAS */}
              <button
                type="button"
                onClick={() => handleSelectRole('homeroom')}
                className="group relative bg-white border-2 border-slate-200 hover:border-indigo-600 hover:shadow-xl rounded-2xl p-6 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                id="btn-select-role-homeroom"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                      1. WALI KELAS
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-normal">
                      Kelola kehadiran harian, absensi rombel kelas, jurnal harian, dan rekapitulasi data siswa.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span>Pilih Wali Kelas</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* KARTU 2: GURU MATA PELAJARAN */}
              <button
                type="button"
                onClick={() => handleSelectRole('subject')}
                className="group relative bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-xl rounded-2xl p-6 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                id="btn-select-role-subject"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                      2. GURU MATA PELAJARAN
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-normal">
                      Kelola presensi per jam pelajaran (PJOK, PAI, Bahasa Inggris, SBdP) di berbagai kelas.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                  <span>Pilih Guru Mapel</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* KARTU 3: SISWA */}
              <button
                type="button"
                onClick={() => handleSelectRole('student')}
                className="group relative bg-white border-2 border-slate-200 hover:border-blue-600 hover:shadow-xl rounded-2xl p-6 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-4 focus:ring-blue-100"
                id="btn-select-role-student"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                      3. SISWA
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-normal">
                      Cari sekolah melalui NPSN, pilih kelas Anda, dan bergabung untuk memantau presensi serta mengajukan izin.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Pilih Siswa & Gabung Kelas</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 2: FORM PENGISIAN IDENTITAS, KATA SANDI & DETAIL RUANG KERJA     */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Form */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFormError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Ganti Pilihan Peran</span>
              </button>

              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                {selectedRole === 'homeroom'
                  ? 'Peran: Wali Kelas'
                  : selectedRole === 'subject'
                  ? 'Peran: Guru Mata Pelajaran'
                  : 'Peran: Siswa'}
              </span>
            </div>

            {/* ERROR BANNER */}
            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. SEKSI KREDENSIAL AKUN SUPABASE AUTH GURU (JIKA BUKAN SISWA)            */}
            {/* ========================================================================= */}
            {(selectedRole === 'homeroom' || selectedRole === 'subject') && !hasGoogleSession && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 text-indigo-950 pb-2 border-b border-indigo-100/60">
                  <ShieldCheck size={18} className="text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      1. Identitas Akun Masuk (Supabase Auth)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Gunakan informasi ini untuk masuk ke aplikasi Kawacanaan Presensi nantinya.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Nama Lengkap */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Nama Lengkap & Gelar: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={accountFullName}
                        onChange={(e) => handleFullNameChange(e.target.value)}
                        placeholder="Contoh: Dra. Hj. Siti Rahmawati, M.Pd."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-indigo-600 outline-none"
                        id="input-onboarding-fullname"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Username (ID Login): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={accountUsername}
                      onChange={(e) => {
                        setUsernameManuallyEdited(true);
                        setAccountUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                      }}
                      placeholder="Contoh: sitirahmawati / guru.siti"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-indigo-600 outline-none"
                      id="input-onboarding-username"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Hanya huruf kecil, angka, titik, atau tanda hubung.
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Alamat Email (Opsional):
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder="email@sekolah.sch.id / pribadi"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-indigo-600 outline-none"
                        id="input-onboarding-email"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Untuk pemulihan kata sandi & notifikasi akun.
                    </p>
                  </div>

                  {/* Kata Sandi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Kata Sandi (Password): <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="Minimal 6 karakter..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-indigo-600 outline-none"
                        id="input-onboarding-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Kata Sandi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Konfirmasi Kata Sandi: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={accountConfirmPassword}
                        onChange={(e) => setAccountConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi..."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-indigo-600 outline-none"
                        id="input-onboarding-confirm-password"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. DETAIL UNTUK WALI KELAS ATAU GURU MATA PELAJARAN                       */}
            {/* ========================================================================= */}
            {(selectedRole === 'homeroom' || selectedRole === 'subject') && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {hasGoogleSession ? 'Pilihan Model Ruang Kerja' : '2. Pilihan Model Ruang Kerja'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih apakah Anda ingin bergabung ke instansi sekolah yang sudah ada atau membuat ruang kerja mandiri.
                  </p>
                </div>

                {/* TAB PILIHAN PATH */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPath('school');
                      setFormError('');
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPath === 'school'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    id="btn-path-school"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedPath === 'school'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900 tracking-tight">
                          RUANG KERJA SEKOLAH : Bergabung ke Sekolah
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {selectedRole === 'homeroom'
                            ? 'Saya adalah wali kelas di sekolah yang sudah menggunakan aplikasi.'
                            : 'Saya adalah guru di sekolah yang sudah menggunakan aplikasi.'}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPath('personal');
                      setFormError('');
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPath === 'personal'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    id="btn-path-personal"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedPath === 'personal'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900 tracking-tight">
                          RUANG KERJA INDIVIDU : Kelola Kelas Sendiri
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Buat ruang kerja pribadi untuk mengelola kelas saya sendiri.
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* FORM INPUT SESUAI MODEL RUANG KERJA (Untuk Google SSO dan Akun Baru) */}
                <div className="space-y-4 pt-1">
                  {/* Jika Bergabung ke Sekolah */}
                  {selectedPath === 'school' && (
                    <div className="space-y-4">
                      {/* Step A: Masukkan & Verifikasi Kode Undangan Sekolah */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <KeyRound size={15} className="text-indigo-600" />
                            <span>Masukkan Kode Undangan Sekolah:</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          {selectedSchool && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 size={13} />
                              Terverifikasi
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={schoolQuery}
                            onChange={(e) => setSchoolQuery(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSearchSchool();
                            }}
                            placeholder="Contoh: SCH-7849"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none uppercase tracking-wider"
                            id="input-school-code-teacher"
                          />
                          <button
                            type="button"
                            onClick={() => handleSearchSchool()}
                            disabled={isSearchingSchool || !schoolQuery.trim()}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                            id="btn-verify-school-code-teacher"
                          >
                            {isSearchingSchool ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            <span>Verifikasi Kode</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          💡 <strong>Petunjuk:</strong> Tanyakan 6-8 digit Kode Undangan Sekolah kepada Kepala Sekolah, Kurikulum, atau Administrator Sekolah Anda.
                        </p>

                        {/* Sekolah Terpilih / Terverifikasi */}
                        {selectedSchool && (
                          <div className="mt-2 p-3.5 rounded-xl bg-white border border-emerald-300 shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Sekolah Terhubung</span>
                              </div>
                              <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                                {selectedSchool.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Kode: <strong className="text-indigo-700">{selectedSchool.code || schoolQuery.toUpperCase()}</strong> • NPSN: {selectedSchool.npsn || '-'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchool(null);
                                setSelectedClassId('');
                                setSchoolQuery('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer shrink-0"
                            >
                              Ganti Kode
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Step B: Formulir Penugasan Kelas / Mapel di Sekolah Terpilih */}
                      {selectedSchool && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in">
                          {/* Penugasan Kelas / Rombel untuk Wali Kelas */}
                          {selectedRole === 'homeroom' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Penetapan Rombel / Kelas yang Diampu: <span className="text-rose-500">*</span>
                                </label>
                                {selectedSchool.classes && selectedSchool.classes.length > 0 && (
                                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSchoolJoinClassMode('select');
                                        if (selectedSchool.classes?.length > 0) {
                                          setSelectedClassId(selectedSchool.classes[0].id);
                                        }
                                      }}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                        schoolJoinClassMode === 'select'
                                          ? 'bg-white text-indigo-700 shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Pilih yang Ada
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSchoolJoinClassMode('new');
                                        setSelectedClassId('__NEW_CLASS__');
                                      }}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                        schoolJoinClassMode === 'new'
                                          ? 'bg-white text-indigo-700 shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      + Buat Rombel Baru
                                    </button>
                                  </div>
                                )}
                              </div>

                              {selectedSchool.classes && selectedSchool.classes.length > 0 && schoolJoinClassMode === 'select' ? (
                                <div className="space-y-2">
                                  <select
                                    value={selectedClassId}
                                    onChange={(e) => {
                                      if (e.target.value === '__NEW_CLASS__') {
                                        setSchoolJoinClassMode('new');
                                        setSelectedClassId('__NEW_CLASS__');
                                      } else {
                                        setSelectedClassId(e.target.value);
                                      }
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white text-slate-900 focus:border-indigo-600 outline-none cursor-pointer"
                                  >
                                    {selectedSchool.classes.map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                    <option value="__NEW_CLASS__">➕ Kelas Anda Belum Ada? Buat Rombel Baru...</option>
                                  </select>
                                  <p className="text-[11px] text-slate-500">
                                    Pilih kelas yang tersedia di sekolah, atau buat baru jika belum terdaftar.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                                  <div className="flex items-start gap-2 text-indigo-900 text-xs">
                                    <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">
                                        Buat Rombel Kelas Mandiri (Otomatis Aktif)
                                      </span>
                                      <p className="text-[11px] text-indigo-700/90 mt-0.5">
                                        Data rombel langsung aktif dan Anda terdaftar sebagai Wali Kelas di sekolah tersebut.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                        Kelas:
                                      </label>
                                      <select
                                        value={schoolNewGrade}
                                        onChange={(e) => {
                                          const g = Number(e.target.value);
                                          setSchoolNewGrade(g);
                                          setSchoolNewClassName(`Kelas ${g}`);
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-indigo-600 outline-none cursor-pointer"
                                      >
                                        {[1, 2, 3, 4, 5, 6].map((g) => (
                                          <option key={g} value={g}>
                                            Kelas {g} SD
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                        Nama Rombel Kelas:
                                      </label>
                                      <input
                                        type="text"
                                        value={schoolNewClassName}
                                        onChange={(e) => setSchoolNewClassName(e.target.value)}
                                        placeholder="Contoh: Kelas 5, Kelas 5A, 5B..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-indigo-600 outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Jika Guru Mapel */}
                          {selectedRole === 'subject' && (
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Mata Pelajaran yang Diampu: <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                placeholder="Contoh: PJOK, Pendidikan Agama Islam, Bahasa Inggris..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white text-slate-900 focus:border-indigo-600 outline-none"
                              />
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {[
                                  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
                                  'Pendidikan Agama Islam (PAI)',
                                  'Pendidikan Agama Kristen',
                                  'Bahasa Inggris',
                                  'Seni Budaya & Prakarya',
                                  'Informatika / Komputer',
                                ].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSubjectName(s)}
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Jika Kelola Sendiri (Personal Workspace) */}
                  {selectedPath === 'personal' && (
                    <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                      {selectedRole === 'subject' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Mata Pelajaran yang Diampu: <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="Contoh: Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:border-indigo-600 outline-none"
                          />
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[
                              'PJOK',
                              'Pendidikan Agama Islam (PAI)',
                              'Pendidikan Agama Kristen',
                              'Bahasa Inggris',
                              'Seni Budaya',
                              'Informatika',
                            ].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSubjectName(s)}
                                className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-700 text-slate-700 text-[10px] font-semibold transition cursor-pointer"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info Langganan Personal */}
                      <div className="p-3.5 rounded-xl bg-white border border-indigo-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-indigo-600 shrink-0" />
                          <span className="text-slate-700">
                            Paket Langganan: <strong>Paket Mulai / Gratis</strong> (Personal Workspace)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase shrink-0">
                          Gratis Rp0/bln
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Simpan Guru */}
                <button
                  type="button"
                  onClick={handleSubmitOnboarding}
                  disabled={isSubmitting || (selectedPath === 'school' && !selectedSchool)}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  id="btn-submit-onboarding-teacher"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{hasGoogleSession ? 'Menyiapkan Ruang Kerja...' : 'Mendaftarkan Akun & Menyiapkan Ruang Kerja...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>
                        {hasGoogleSession
                          ? selectedRole === 'homeroom'
                            ? 'Lanjutkan ke Ruang Kerja Wali Kelas'
                            : 'Lanjutkan ke Ruang Kerja Guru Mapel'
                          : selectedRole === 'homeroom'
                          ? 'Daftar & Masuk Dashboard Wali Kelas'
                          : 'Daftar & Masuk Dashboard Guru Mapel'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. FORMULIR PENDAFTARAN SISWA (SATU FORMULIR TUNGGAL TERPADU)             */}
            {/* ========================================================================= */}
            {selectedRole === 'student' && (
              <div className="p-5 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
                {/* Header Formulir */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1.5">
                      <GraduationCap size={16} />
                      <span>Pendaftaran Akun Siswa</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      Formulir Pendaftaran Siswa
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Lengkapi identitas diri, masukkan Kode Undangan Sekolah yang diberikan guru/sekolah, lalu tentukan kelas Anda.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                    Portal Siswa
                  </span>
                </div>

                {/* 1. Identitas & Biodata Siswa */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-600" />
                    <span>1. Identitas & Biodata Siswa</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Lengkap Siswa (Tanpa Teks Gelar) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Nama Lengkap Siswa: <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={accountFullName}
                          onChange={(e) => handleFullNameChange(e.target.value)}
                          placeholder="Contoh: Muhammad Rizky Pratama"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                          id="input-onboarding-student-fullname"
                        />
                      </div>
                    </div>

                    {/* Jika registrasi baru Supabase Auth: Username, Email, Password, Konfirmasi */}
                    {!hasGoogleSession && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Username (ID Login): <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={accountUsername}
                            onChange={(e) => {
                              setUsernameManuallyEdited(true);
                              setAccountUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                            }}
                            placeholder="Contoh: rizky.pratama"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                            id="input-onboarding-student-username"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Gunakan huruf kecil, angka, atau titik untuk ID login Anda.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Email <span className="text-[11px] font-normal text-slate-500 lowercase">(opsional)</span>:
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              value={accountEmail}
                              onChange={(e) => setAccountEmail(e.target.value)}
                              placeholder="email@gmail.com"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                              id="input-onboarding-student-email"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Kata Sandi (Password): <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={accountPassword}
                              onChange={(e) => setAccountPassword(e.target.value)}
                              placeholder="Minimal 6 karakter..."
                              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                              id="input-onboarding-student-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Konfirmasi Kata Sandi: <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={accountConfirmPassword}
                              onChange={(e) => setAccountConfirmPassword(e.target.value)}
                              placeholder="Ketik ulang kata sandi..."
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                              id="input-onboarding-student-confirm-password"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Jenis Kelamin */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Jenis Kelamin: <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTeacherGender('L')}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            teacherGender === 'L'
                              ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Laki-laki (L)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherGender('P')}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            teacherGender === 'P'
                              ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Perempuan (P)
                        </button>
                      </div>
                    </div>

                    {/* NISN (Opsional) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        NISN <span className="text-[11px] font-normal text-slate-500 lowercase">(opsional)</span>:
                      </label>
                      <input
                        type="text"
                        value={studentNisn}
                        onChange={(e) => setStudentNisn(e.target.value.replace(/\D/g, ''))}
                        placeholder="Contoh: 0012345678"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
                        id="input-onboarding-student-nisn"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* 2. Pencarian Sekolah & Pemilihan Kelas */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <KeyRound size={16} className="text-blue-600" />
                    <span>2. Verifikasi Kode Undangan Sekolah & Pemilihan Kelas</span>
                  </div>

                  {/* Input Verifikasi Kode Sekolah */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <KeyRound size={15} className="text-blue-600" />
                        <span>Masukkan Kode Undangan Sekolah:</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      {selectedSchool && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={13} />
                          Terverifikasi
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearchSchool();
                        }}
                        placeholder="Contoh: SCH-7849"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none uppercase tracking-wider"
                        id="input-search-school-student"
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchSchool()}
                        disabled={isSearchingSchool || !schoolQuery.trim()}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                        id="btn-search-school-student"
                      >
                        {isSearchingSchool ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        <span>Verifikasi Kode</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      💡 <strong>Petunjuk:</strong> Tanyakan 6-8 digit Kode Undangan Sekolah kepada Bapak/Ibu Wali Kelas atau Guru Anda.
                    </p>

                    {/* Sekolah Terpilih & Pemilihan Kelas yang Tersedia */}
                    {selectedSchool && (
                      <div className="mt-3 p-4 rounded-xl bg-white border border-emerald-300 shadow-xs space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>Sekolah Terhubung</span>
                            </div>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mt-0.5">
                              {selectedSchool.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Kode: <strong className="text-blue-700">{selectedSchool.code || schoolQuery.toUpperCase()}</strong> • NPSN: {selectedSchool.npsn || '-'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchool(null);
                              setSelectedClassId('');
                              setSchoolQuery('');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                          >
                            Ganti Kode
                          </button>
                        </div>

                        {/* Dropdown Kelas Tersedia (HANYA KELAS YANG TERSEDIA DI DATABASE SEKOLAH) */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                            Pilih Kelas Anda di Sekolah Ini: <span className="text-rose-500">*</span>
                          </label>

                          {selectedSchool.classes && selectedSchool.classes.length > 0 ? (
                            <div className="space-y-1.5">
                              <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold bg-white text-slate-900 focus:border-blue-600 outline-none cursor-pointer shadow-xs"
                                id="select-student-class"
                              >
                                {selectedSchool.classes.map((c: any) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.grade ? `(Tingkat ${c.grade})` : ''}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-slate-500">
                                Pilih rombongan belajar / kelas yang Anda tempati pada tahun ajaran aktif ini.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Belum Ada Kelas Terdaftar di Sekolah Ini</span>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                  Sekolah ini belum mendaftarkan data kelas. Silakan hubungi wali kelas atau pihak sekolah untuk mendaftarkan kelas terlebih dahulu sebelum siswa dapat bergabung.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Gabung ke Kelas & Buka Portal Siswa */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitOnboarding}
                    disabled={isSubmitting || !selectedSchool || !selectedClassId || !selectedSchool?.classes?.length}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    id="btn-submit-onboarding-student"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Mendaftarkan Akun & Menghubungkan ke Kelas...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Gabung ke Kelas & Buka Portal Siswa</span>
                      </>
                    )}
                  </button>
                  {(!selectedSchool || !selectedClassId) && (
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      * Cari dan pilih sekolah serta kelas Anda terlebih dahulu untuk mengaktifkan tombol gabung.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
