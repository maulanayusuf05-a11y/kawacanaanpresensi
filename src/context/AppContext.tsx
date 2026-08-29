import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, usernameToEmail } from "../lib/supabase";
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  Subject,
  UserAccount,
  UserAccountInput,
  SchoolProfile,
  AcademicEvent,
  SystemConfig,
  ActiveView,
  SchoolClass,
  Teacher,
  GeneratedAccountResult,
  UserRole,
  WorkspaceMembership,
} from "../types";
import {
  INITIAL_SCHOOL_PROFILE,
  INITIAL_SYSTEM_CONFIG,
  DEFAULT_SD_SUBJECTS,
} from "../data/initialData";

interface Toast {
  id: string;
  type: "success" | "info" | "error";
  message: string;
}
interface AppContextType {
  currentUser: UserAccount | null;
  setCurrentUser: (u: UserAccount | null) => void;
  logout: () => Promise<void>;
  registrationRequired: boolean;
  setRegistrationRequired: (v: boolean) => void;
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  isDataLoading: boolean;
  isAuthChecking: boolean;
  // Workspace & Onboarding
  userWorkspaces: WorkspaceMembership[];
  activeWorkspace: WorkspaceMembership | null;
  isOnboarding: boolean;
  setIsOnboarding: (v: boolean) => void;
  isSelectingWorkspace: boolean;
  setIsSelectingWorkspace: (v: boolean) => void;
  isJoinSchoolModalOpen: boolean;
  setIsJoinSchoolModalOpen: (v: boolean) => void;
  selectWorkspace: (ws: WorkspaceMembership) => Promise<void>;
  switchToSchoolWorkspace: () => Promise<void>;
  switchToPersonalWorkspace: () => Promise<void>;
  openOnboarding: () => void;
  returnToWorkspaceSelector: () => void;
  loadUserDataAfterOnboarding: (userId: string) => Promise<void>;
  loadData: (userId?: string) => Promise<void>;
  schoolProfile: SchoolProfile;
  updateSchoolProfile: (p: SchoolProfile) => Promise<void>;
  systemConfig: SystemConfig;
  updateSystemConfig: (c: SystemConfig) => Promise<void>;
  classes: SchoolClass[];
  addClass: (c: Omit<SchoolClass, "id">) => Promise<void>;
  updateClass: (id: string, c: Omit<SchoolClass, "id">) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  assignTeacherClasses: (
    teacherId: string,
    classIds: string[],
  ) => Promise<void>;
  importClasses: (
    items: Array<Omit<SchoolClass, "id"> & { waliKelasNameInput?: string }>,
    replaceExisting?: boolean,
  ) => Promise<void>;
  teachers: Teacher[];
  addTeacher: (t: Omit<Teacher, "id">) => Promise<void>;
  updateTeacher: (id: string, t: Omit<Teacher, "id">) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  importTeachers: (
    t: Omit<Teacher, "id">[],
    replaceExisting?: boolean,
  ) => Promise<void>;
  executeTeacherAssignment: (
    teacherId: string,
    roleType: "NONE" | "WALI_KELAS" | "GURU_MAPEL",
    subjectId?: string,
    targetClassIds?: string[],
  ) => Promise<void>;
  subjects: Subject[];
  addSubject: (s: Omit<Subject, "id">) => Promise<void>;
  updateSubject: (id: string, s: Omit<Subject, "id">) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  students: Student[];
  addStudent: (s: Omit<Student, "id">) => Promise<void>;
  updateStudent: (id: string, s: Omit<Student, "id">) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteStudentsByClass: (classId: string) => Promise<void>;
  importStudents: (
    s: Omit<Student, "id">[],
    replaceExisting?: boolean,
    targetClassId?: string,
  ) => Promise<void>;
  users: UserAccount[];
  addUser: (u: UserAccountInput) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<UserAccount>) => Promise<void>;
  syncUsersWithStudents: () => Promise<void>;
  generateAccountsFromReferences: (options?: {
    resetExistingPasswords?: boolean;
  }) => Promise<GeneratedAccountResult[]>;
  updateUserPassword: (id: string, p: string) => Promise<void>;
  academicEvents: AcademicEvent[];
  addAcademicEvent: (e: Omit<AcademicEvent, "id">) => Promise<void>;
  deleteAcademicEvent: (id: string) => Promise<void>;
  activeStudyDays: number[];
  updateActiveStudyDays: (d: number[]) => Promise<void>;
  effectiveDaysConfig: { [key: string]: number };
  updateEffectiveDays: (key: string, d: number) => Promise<void>;
  getBaseStudyDaysForMonth: (year: number, month: number) => number;
  getEffectiveDaysForMonth: (year: number | string, month?: number) => number;
  getDateStatus: (date: string) => {
    isStudyDay: boolean;
    isHoliday: boolean;
    isEffective: boolean;
    label: string;
    badgeColor: string;
    eventTitle?: string;
  };
  attendanceRecords: AttendanceRecord[];
  currentAttendanceDate: string;
  setCurrentAttendanceDate: (d: string) => void;
  saveDailyAttendance: (
    date: string,
    r: AttendanceRecord[],
    options?: {
      type?: AttendanceType;
      subjectId?: string | null;
      subjectName?: string | null;
      classId?: string | null;
    },
  ) => Promise<void>;
  getAttendanceForDate: (
    date: string,
    options?: {
      type?: AttendanceType;
      subjectId?: string | null;
      classId?: string | null;
    },
  ) => AttendanceRecord[];
  submitStudentAttendance: (
    studentId: string,
    type: "masuk" | "pulang" | "izin" | "sakit",
    notes?: string,
    customDate?: string,
  ) => Promise<{ success: boolean; message: string }>;
  changeOwnPassword: (
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  resetAllDataToProductionReady: () => Promise<void>;
  toasts: Toast[];
  showToast: (m: string, t?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  impersonateSchool: (school: {
    id: string;
    name: string;
    plan?: string;
  }) => void;
  stopImpersonation: () => void;
  globalAnnouncement: {
    id?: string;
    message: string;
    type: "info" | "warning" | "alert";
    active: boolean;
    updatedAt?: string;
  } | null;
  updateGlobalAnnouncement: (announcement: {
    message: string;
    type: "info" | "warning" | "alert";
    active: boolean;
  }) => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyUser = (p: any): UserAccount => {
  const email = (p.email || "").trim().toLowerCase();
  const isGoogle =
    !!p.is_google_auth ||
    !!p.isGoogleAuth ||
    p.auth_provider === "google" ||
    p.provider === "google" ||
    email.endsWith("@gmail.com") ||
    email.endsWith("@googlemail.com") ||
    email.includes("belajar.id") ||
    email.includes("google");
  return {
    id: p.id,
    teacherId: p.teacher_id || null,
    name: p.name || "",
    username: p.username || "",
    password: p.password || undefined,
    role: p.role,
    email: p.email || null,
    authProvider: p.auth_provider || p.provider || (isGoogle ? "google" : null),
    isGoogleAuth: isGoogle,
    studentId: p.student_id || null,
    schoolId: p.school_id || null,
    schoolCode: p.school_code || p.schoolCode || p.code || null,
    mustChangePassword: !!p.must_change_password,
    classIds: p.class_ids || [],
    classNames: p.class_names || [],
    subscriptionPlan: p.subscription_plan || null,
    subscriptionStatus: p.subscription_status || null,
    subscriptionExpiresAt: p.subscription_expires_at || null,
    maxTeachers: p.max_teachers,
    maxStudents: p.max_students,
    maxClasses: p.max_classes,
  };
};
const dbStudent = (s: any): Student => ({
  id: s.id,
  nisn: s.nisn,
  nama: s.nama,
  gender: s.gender,
  classId: s.class_id || null,
  className: s.class_name || "",
});
const dbTeacher = (t: any): Teacher => {
  return {
    id: t.id,
    nama: t.nama || "",
    nip: t.nip || "",
    jenisKelamin: t.jenis_kelamin || t.jenisKelamin || "L",
    jabatan: t.jabatan || t._resolved_role || "Belum ditugaskan",
    jenisPTK: t.jenis_ptk || t.jenisPTK || "Belum ditugaskan",
    mataPelajaran: t.mata_pelajaran || t.mataPelajaran || "",
    statusKepegawaian: t.status_kepegawaian || t.statusKepegawaian || "PNS",
    noHp: t.no_hp || t.noHp || "",
  };
};

const dbSubject = (
  x: any,
  teacherMap?: Map<string, any>,
  classMap?: Map<string, any>,
  scheduleMap?: Map<string, any[]>,
): Subject => {
  const teacher = x.teacher_id ? teacherMap?.get(x.teacher_id) : null;
  const targetClassIds = Array.isArray(x._targetClassIds)
    ? x._targetClassIds
    : [];
  const targetClassNames = targetClassIds
    .map((id: string) => classMap?.get(id)?.name || "")
    .filter(Boolean);
  const scheduleRows = scheduleMap?.get(x.id) || [];
  return {
    id: x.id,
    name: x.name,
    code: x.code || undefined,
    isSpecialized: !!x.is_specialized,
    teacherId: x.teacher_id || null,
    teacherName: teacher?.nama || null,
    targetClassIds,
    targetClassNames,
    scheduleDays: scheduleRows.map((r: any) => r.day_of_week).filter(Boolean),
    lessonPeriod:
      scheduleRows.find((r: any) => r.lesson_period)?.lesson_period || "",
  };
};

const dbAttendance = (r: any, students: Student[]): AttendanceRecord => ({
  id: r.id,
  date: r.date,
  studentId: r.student_id,
  studentName: students.find((s) => s.id === r.student_id)?.nama || "",
  status: r.status,
  checkInTime: r.check_in_time ? String(r.check_in_time).slice(0, 5) : "-",
  checkOutTime: r.check_out_time ? String(r.check_out_time).slice(0, 5) : "-",
  notes: r.notes || "",
  type: r.type || "DAILY",
  subjectId: r.subject_id || null,
  subjectName: r.subject_name || null,
  classId:
    r.class_id || students.find((s) => s.id === r.student_id)?.classId || null,
  teacherId: r.teacher_id || null,
});
const dbEvent = (e: any): AcademicEvent => ({
  id: e.id,
  date: e.date,
  dateDisplay: e.date_display || e.date,
  title: e.title,
  isEffective: e.is_effective,
  notes: e.notes || "",
});
const formatFullAlamat = (p: {
  jalan?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kabupatenKota?: string;
  provinsi?: string;
  kodePos?: string;
}): string => {
  const parts = [
    p.jalan,
    p.desaKelurahan ? `Desa/Kel. ${p.desaKelurahan}` : "",
    p.kecamatan ? `Kec. ${p.kecamatan}` : "",
    p.kabupatenKota,
    p.provinsi,
    p.kodePos ? `Kode Pos ${p.kodePos}` : "",
  ].filter(Boolean);
  return parts.join(", ");
};

const dbSchool = (p: any, extraCode?: string): SchoolProfile => {
  if (!p)
    return {
      ...INITIAL_SCHOOL_PROFILE,
      kodeSekolah: extraCode
        ? String(extraCode)
            .replace(/^SCH-?/i, "")
            .trim()
            .toUpperCase()
        : "",
    };
  let ext: any = {};
  const rawAlamat = String(p.alamat || "").trim();
  if (rawAlamat.startsWith("{") || rawAlamat.startsWith("__EXTJSON__:")) {
    try {
      const raw = rawAlamat.startsWith("__EXTJSON__:")
        ? rawAlamat.slice(12)
        : rawAlamat;
      ext = JSON.parse(raw);
    } catch (_) {}
  }
  const rawCode =
    extraCode ||
    p.code ||
    p.kode_sekolah ||
    p.kodeSekolah ||
    ext.kodeSekolah ||
    ext.kode_sekolah ||
    "";
  const cleanKodeSekolah = rawCode
    ? String(rawCode)
        .replace(/^SCH-?/i, "")
        .trim()
        .toUpperCase()
    : "";
  const jenjang = ext.jenjang || p.jenjang || "SD/MI";
  const jalan =
    ext.jalan !== undefined && ext.jalan !== null
      ? ext.jalan
      : p.jalan ||
        (rawAlamat.startsWith("__EXTJSON__:") || rawAlamat.startsWith("{")
          ? ""
          : rawAlamat);
  const desaKelurahan =
    ext.desaKelurahan ||
    ext.desa_kelurahan ||
    ext.kelurahan ||
    p.desa_kelurahan ||
    p.kelurahan ||
    p.desaKelurahan ||
    "";
  const kecamatan = ext.kecamatan || p.kecamatan || "";
  const kabupatenKota =
    ext.kabupatenKota ||
    ext.kabupaten_kota ||
    ext.kota ||
    p.kabupaten_kota ||
    p.kota ||
    p.kabupatenKota ||
    "";
  const provinsi = ext.provinsi || p.provinsi || "";
  const kodePos = ext.kodePos || ext.kode_pos || p.kode_pos || p.kodePos || "";
  const teleponFax =
    ext.teleponFax ||
    ext.telepon_fax ||
    ext.telepon ||
    p.telepon_fax ||
    p.telepon ||
    p.teleponFax ||
    "";
  const email = ext.email || p.email || "";
  const website = ext.website || p.website || "";

  const formattedAddress = formatFullAlamat({
    jalan,
    desaKelurahan,
    kecamatan,
    kabupatenKota,
    provinsi,
    kodePos,
  });
  const fullAlamat =
    ext.full ||
    formattedAddress ||
    (rawAlamat.startsWith("__EXTJSON__:") || rawAlamat.startsWith("{")
      ? ""
      : rawAlamat);

  const namaKepalaSekolah =
    p.nama_kepala_sekolah ||
    p.namaKepalaSekolah ||
    ext.namaKepalaSekolah ||
    ext.nama_kepala_sekolah ||
    "";
  const nipKepalaSekolah =
    p.nip_kepala_sekolah ||
    p.nipKepalaSekolah ||
    ext.nipKepalaSekolah ||
    ext.nip_kepala_sekolah ||
    "";

  let semester = p.semester || ext.semester || "1 (Ganjil)";
  if (semester === "1") semester = "1 (Ganjil)";
  if (semester === "2") semester = "2 (Genap)";

  return {
    namaSekolah: p.nama_sekolah || p.namaSekolah || ext.namaSekolah || "",
    jenjang,
    npsn: p.npsn || ext.npsn || "",
    kodeSekolah: cleanKodeSekolah,
    alamat: fullAlamat,
    jalan,
    desaKelurahan,
    kecamatan,
    kabupatenKota,
    provinsi,
    kodePos,
    teleponFax,
    email,
    website,
    tahunPelajaran:
      p.tahun_pelajaran ||
      p.tahunPelajaran ||
      ext.tahunPelajaran ||
      "2025/2026",
    semester,
    kelas: p.kelas || "",
    namaKepalaSekolah,
    nipKepalaSekolah,
    namaWaliKelas: p.nama_wali_kelas || p.namaWaliKelas || "",
    nipWaliKelas: p.nip_wali_kelas || p.nipWaliKelas || "",
  };
};
const dbConfig = (c: any): SystemConfig => ({
  appTitle: c.app_title || INITIAL_SYSTEM_CONFIG.appTitle,
  appSubtitle: c.app_subtitle || "",
  footerCopyright: c.footer_copyright || INITIAL_SYSTEM_CONFIG.footerCopyright,
  schoolLogoUrl: c.school_logo_url || "",
  letterheadType: c.letterhead_type || "standard_text",
  letterheadImageUrl: c.letterhead_image_url || "",
  showLetterhead: c.show_letterhead ?? true,
  defaultCheckInTime: c.default_check_in_time || "06:30 AM",
  defaultCheckOutTime: c.default_check_out_time || "12:20 PM",
  reportPlace: c.report_place || "",
  reportDate: c.report_date || new Date().toISOString().slice(0, 10),
  activeStudyDays: c.active_study_days || [1, 2, 3, 4, 5],
  studentSelfAttendanceEnabled: c.student_self_attendance_enabled ?? true,
  checkInStartTime: String(c.check_in_start_time || "06:00").slice(0, 5),
  checkInDeadlineTime: String(c.check_in_deadline_time || "07:00").slice(0, 5),
  checkOutStartTime: String(c.check_out_start_time || "12:30").slice(0, 5),
  autoMarkLate: c.auto_mark_late ?? true,
});

const CACHE_USER_SESSION_KEY = "kawacanaan_cached_user_session";
const CACHE_LAST_VIEW_KEY = "kawacanaan_last_active_view";
const SESSION_LOGIN_TIME_KEY = "kawacanaan_session_login_time";
const SESSION_LAST_ACTIVE_KEY = "kawacanaan_session_last_active";

// Timeout keamanan sesi: Idle Timeout 10 menit, Absolute Timeout 8 jam
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 jam

export const checkSessionTimeouts = (): {
  expired: boolean;
  reason?: "idle" | "absolute";
} => {
  if (typeof window === "undefined" || !window.localStorage)
    return { expired: false };
  try {
    const loginTimeRaw = localStorage.getItem(SESSION_LOGIN_TIME_KEY);
    const lastActiveRaw = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
    if (!loginTimeRaw || !lastActiveRaw) {
      return { expired: false };
    }
    const loginTime = parseInt(loginTimeRaw, 10);
    const lastActive = parseInt(lastActiveRaw, 10);
    const now = Date.now();

    if (now - loginTime > ABSOLUTE_TIMEOUT_MS) {
      return { expired: true, reason: "absolute" };
    }
    if (now - lastActive > IDLE_TIMEOUT_MS) {
      return { expired: true, reason: "idle" };
    }
  } catch (_) {}
  return { expired: false };
};

export const recordSessionActivity = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const now = Date.now();
    if (!localStorage.getItem(SESSION_LOGIN_TIME_KEY)) {
      localStorage.setItem(SESSION_LOGIN_TIME_KEY, String(now));
    }
    localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now));
  } catch (_) {}
};

export const clearSessionTimers = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
    localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
  } catch (_) {}
};

export const VIEW_ROLE_PERMISSIONS: Record<ActiveView, UserRole[] | "all"> = {
  login: "all",
  dashboard: ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  superadmin: ["SUPER_ADMIN"],
  "data-referensi": ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  "data-pengguna": ["ADMIN"],
  "kalender-akademik": ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  absensi: ["ADMIN", "WALI KELAS", "GURU MAPEL"],
  rekapitulasi: ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  laporan: ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  pengaturan: ["ADMIN", "KEPALA SEKOLAH", "WALI KELAS", "GURU MAPEL"],
  "portal-siswa": ["SISWA"],
};

export const isViewAllowedForRole = (
  view: ActiveView,
  role: UserRole,
): boolean => {
  const allowed = VIEW_ROLE_PERMISSIONS[view];
  if (!allowed) return false;
  if (allowed === "all") return true;
  return allowed.includes(role);
};

export const resolveInitialViewForRole = (
  role: UserRole,
  targetView?: ActiveView | null,
): ActiveView => {
  if (
    targetView &&
    targetView !== "login" &&
    isViewAllowedForRole(targetView, role)
  ) {
    return targetView;
  }
  if (role === "SUPER_ADMIN") return "superadmin";
  if (role === "SISWA") return "portal-siswa";
  return "dashboard";
};

export const hasPersistedAuthToken = (): boolean => {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const timeoutStatus = checkSessionTimeouts();
    if (timeoutStatus.expired) {
      clearSessionTimers();
      try {
        localStorage.removeItem(CACHE_USER_SESSION_KEY);
        localStorage.removeItem(CACHE_LAST_VIEW_KEY);
      } catch (_) {}
      return false;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val && val.includes("access_token")) return true;
      }
    }
    if (localStorage.getItem(CACHE_USER_SESSION_KEY)) return true;
  } catch (_) {}
  return false;
};

const getSavedActiveView = (): ActiveView | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(CACHE_LAST_VIEW_KEY);
    if (raw && raw in VIEW_ROLE_PERMISSIONS) {
      return raw as ActiveView;
    }
  } catch (_) {}
  return null;
};

const getCachedUserSession = (): UserAccount | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const timeoutStatus = checkSessionTimeouts();
    if (timeoutStatus.expired) {
      clearSessionTimers();
      try {
        localStorage.removeItem(CACHE_USER_SESSION_KEY);
        localStorage.removeItem(CACHE_LAST_VIEW_KEY);
      } catch (_) {}
      return null;
    }
    const hasToken = hasPersistedAuthToken();
    if (!hasToken) return null;
    const raw = localStorage.getItem(CACHE_USER_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.role) {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasPersistedAuthToken();
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return getCachedUserSession();
  });
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Workspace & Onboarding State
  const [userWorkspaces, setUserWorkspaces] = useState<WorkspaceMembership[]>(
    [],
  );
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceMembership | null>(null);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [isSelectingWorkspace, setIsSelectingWorkspace] =
    useState<boolean>(false);
  const [isJoinSchoolModalOpen, setIsJoinSchoolModalOpen] =
    useState<boolean>(false);

  const [activeView, setActiveViewState] = useState<ActiveView>(() => {
    const cached = getCachedUserSession();
    const saved = getSavedActiveView();
    if (cached) {
      return resolveInitialViewForRole(cached.role, saved);
    }
    if (hasPersistedAuthToken() && saved && saved !== "login") {
      return saved;
    }
    return "login";
  });
  const activeViewRef = React.useRef<ActiveView>(activeView);
  const loadRequestRef = React.useRef(0);
  const navigationIntentRef = React.useRef(0);
  const setActiveView = (view: ActiveView) => {
    navigationIntentRef.current += 1;
    activeViewRef.current = view;
    setActiveViewState(view);
    if (view !== "login") {
      try {
        localStorage.setItem(CACHE_LAST_VIEW_KEY, view);
      } catch (_) {}
    }
  };
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(
    INITIAL_SCHOOL_PROFILE,
  );
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(
    INITIAL_SYSTEM_CONFIG,
  );
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SD_SUBJECTS);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [activeStudyDays, setActiveStudyDays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [effectiveDaysConfig, setEffectiveDaysConfig] = useState<{
    [key: string]: number;
  }>({});
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [currentAttendanceDate, setCurrentAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    id?: string;
    message: string;
    type: "info" | "warning" | "alert";
    active: boolean;
    updatedAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") return;
    supabase
      .from("platform_settings")
      .select("integrations")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const ann = (data as any)?.integrations?.announcement;
        if (ann && ann.message) {
          setGlobalAnnouncement(ann);
        }
      });
  }, [currentUser]);

  const updateGlobalAnnouncement = async (ann: {
    message: string;
    type: "info" | "warning" | "alert";
    active: boolean;
  }) => {
    try {
      const { data: current } = await supabase
        .from("platform_settings")
        .select("integrations")
        .eq("id", 1)
        .maybeSingle();
      const nextIntegrations = {
        ...(current?.integrations || {}),
        announcement: { ...ann, updatedAt: new Date().toISOString() },
      };
      await supabase
        .from("platform_settings")
        .update({ integrations: nextIntegrations })
        .eq("id", 1);
      setGlobalAnnouncement({ ...ann, updatedAt: new Date().toISOString() });
      showToast("Pengumuman global berhasil diperbarui.", "success");
    } catch (e: any) {
      showToast(e.message || "Gagal menyimpan pengumuman.", "error");
    }
  };

  const impersonateSchool = (school: {
    id: string;
    name: string;
    plan?: string;
  }) => {
    showToast(
      `Mode impersonasi langsung dinonaktifkan untuk keamanan RLS. Gunakan akun ADMIN sekolah untuk masuk sebagai tenant ${school.name}.`,
      "info",
    );
  };
  const stopImpersonation = () => {
    if (currentUser?.impersonatedFrom) {
      setCurrentUser(currentUser.impersonatedFrom);
      setActiveView("superadmin");
    }
  };
  const showToast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((p) => [...p, { id, type, message }]);
    window.setTimeout(
      () => setToasts((p) => p.filter((t) => t.id !== id)),
      3500,
    );
  };

  const logout = async () => {
    try {
      clearSessionTimers();
      localStorage.removeItem(CACHE_USER_SESSION_KEY);
      localStorage.removeItem(CACHE_LAST_VIEW_KEY);
    } catch (_) {}
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserWorkspaces([]);
    setActiveWorkspace(null);
    setIsOnboarding(false);
    setIsSelectingWorkspace(false);
    setIsAuthChecking(false);
    activeViewRef.current = "login";
    setActiveViewState("login");
    setStudents([]);
    setClasses([]);
    setTeachers([]);
    setUsers([]);
    setAttendanceRecords([]);
  };
  const removeToast = (id: string) =>
    setToasts((p) => p.filter((t) => t.id !== id));

  const loadDataForSchool = async (
    schoolId: string,
    baseProfile: any,
    targetRole: UserRole,
  ) => {
    setIsDataLoading(true);
    let tenantSchool: any = null;
    {
      const res = await supabase
        .from("schools")
        .select(
          "name,npsn,code,plan,status,subscription_expires_at,max_teachers,max_students,max_classes,workspace_type,is_personal",
        )
        .eq("id", schoolId)
        .maybeSingle();
      if (res.error) {
        console.warn("[loadData] schools read failed:", res.error.message);
      } else {
        tenantSchool = res.data;
      }
    }
    let authoritativeSchoolCode = tenantSchool?.code
      ? String(tenantSchool.code)
          .replace(/^SCH-?/i, "")
          .trim()
          .toUpperCase()
      : "";
    const hydratedBase = {
      ...baseProfile,
      school_id: schoolId,
      school_code: authoritativeSchoolCode || null,
      role: targetRole,
      subscription_plan: tenantSchool?.plan || "teacher",
      subscription_status: tenantSchool?.status || "active",
      subscription_expires_at: tenantSchool?.subscription_expires_at,
      max_teachers: tenantSchool?.max_teachers,
      max_students: tenantSchool?.max_students,
      max_classes: tenantSchool?.max_classes,
    };

    const [
      ,
      stu,
      school,
      config,
      events,
      effective,
      attendance,
      allProfiles,
      classRows,
      teacherRows,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", baseProfile.id)
        .maybeSingle(),
      supabase
        .from("students")
        .select("*, classes:class_id(id,name,grade,academic_year)")
        .eq("school_id", schoolId)
        .order("nama"),
      supabase
        .from("school_profile")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle(),
      supabase
        .from("system_config")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle(),
      supabase
        .from("academic_events")
        .select("*")
        .eq("school_id", schoolId)
        .order("date"),
      supabase.from("effective_days").select("*").eq("school_id", schoolId),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("school_id", schoolId)
        .order("date"),
      supabase
        .from("profiles")
        .select("*")
        .eq("school_id", schoolId)
        .order("name"),
      supabase
        .from("classes")
        .select("*, wali:wali_kelas_teacher_id(id,nama)")
        .eq("school_id", schoolId)
        .order("grade")
        .order("name"),
      supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .order("nama"),
    ]);

    // Master-data reads are intentionally independent. A failure in an
    // auxiliary table (for example attendance/events/profile due to RLS)
    // must NOT prevent Guru/Kelas/Siswa from rendering.
    const readErrors = [
      ["students", stu],
      ["school_profile", school],
      ["system_config", config],
      ["academic_events", events],
      ["effective_days", effective],
      ["attendance_records", attendance],
      ["profiles", allProfiles],
      ["classes", classRows],
      ["teachers", teacherRows],
    ].filter(([, r]: any) => r?.error);
    if (readErrors.length)
      console.warn(
        "[loadData] partial read errors:",
        readErrors
          .map(([name, r]: any) => `${name}: ${r.error.message}`)
          .join(" | "),
      );

    const baseTeachers = (teacherRows.data || []).map(dbTeacher);
    setTeachers(baseTeachers);

    const classList = (classRows.data || []).map((c: any) => {
      const assignedTeacherId = c.wali_kelas_teacher_id || null;
      const matchedTeacher = baseTeachers.find(
        (t) => t.id === assignedTeacherId,
      );
      const waliName = matchedTeacher?.nama || c.wali?.nama || null;

      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        academicYear: c.academic_year,
        waliKelasTeacherId: assignedTeacherId,
        waliKelasName: waliName,
      };
    });
    setClasses(classList);
    const ss = (stu.data || []).map((x: any) =>
      dbStudent({ ...x, class_name: x.classes?.name || "" }),
    );
    setStudents(ss);

    const subjectTeacherScope = new Map<string, string[]>();
    const subjectClassScope = new Map<string, string[]>();
    const activeAcademicYear =
      String(
        school.data?.tahun_pelajaran ||
          baseProfile?.tahun_pelajaran ||
          "2026/2027",
      ).trim() || "2026/2027";
    const [scopeTeacherRows, scopeClassRows] = await Promise.all([
      supabase
        .from("subject_teacher_assignments")
        .select("subject_id,teacher_id,academic_year")
        .eq("school_id", schoolId),
      supabase
        .from("subject_class_assignments")
        .select("subject_id,class_id,academic_year")
        .eq("school_id", schoolId),
    ]);
    if (scopeTeacherRows.error)
      console.warn(
        "[loadData] subject_teacher_assignments read failed:",
        scopeTeacherRows.error.message,
      );
    if (scopeClassRows.error)
      console.warn(
        "[loadData] subject_class_assignments read failed:",
        scopeClassRows.error.message,
      );
    (scopeTeacherRows.data || [])
      .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
      .forEach((a: any) => {
        const ids = subjectTeacherScope.get(a.teacher_id) || [];
        ids.push(a.subject_id);
        subjectTeacherScope.set(a.teacher_id, ids);
      });
    (scopeClassRows.data || [])
      .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
      .forEach((a: any) => {
        const ids = subjectClassScope.get(a.subject_id) || [];
        ids.push(a.class_id);
        subjectClassScope.set(a.subject_id, ids);
      });
    // Master teachers state directly from teachers table
    setTeachers(baseTeachers);

    const hydratedUsers = (allProfiles.data || []).map((p: any) => {
      const u = emptyUser(p);
      const isWali = u.teacherId && classList.some((c: any) => c.waliKelasTeacherId === u.teacherId && (!c.academicYear || c.academicYear === activeAcademicYear));
      const hasMapel = u.teacherId && (subjectTeacherScope.get(u.teacherId) || []).length > 0;

      let effectiveRole = u.role;
      if (u.role === "WALI KELAS" || u.role === "GURU MAPEL") {
        if (isWali && !hasMapel) effectiveRole = "WALI KELAS";
        else if (hasMapel && !isWali) effectiveRole = "GURU MAPEL";
        else if (isWali && hasMapel) effectiveRole = u.role || "WALI KELAS";
      }

      let ids: string[] = [];
      if (isWali) {
        ids = classList
          .filter((c: any) => c.waliKelasTeacherId === u.teacherId && (!c.academicYear || c.academicYear === activeAcademicYear))
          .map((c: any) => c.id);
      }
      if (hasMapel) {
        const unique = new Set<string>(ids);
        (subjectTeacherScope.get(u.teacherId) || []).forEach((subjectId) => {
          (subjectClassScope.get(subjectId) || []).forEach((classId) =>
            unique.add(classId),
          );
        });
        ids = [...unique];
      }
      return {
        ...u,
        role: effectiveRole,
        classIds: ids,
        classNames: ids
          .map(
            (id: string) => classList.find((c: any) => c.id === id)?.name || "",
          )
          .filter(Boolean),
      };
    });
    const matchedMe = hydratedUsers.find((u: any) => u.id === baseProfile.id);
    const me = {
      ...emptyUser(hydratedBase),
      ...(matchedMe || {}),
      schoolCode:
        authoritativeSchoolCode ||
        (baseProfile as any)?.school_code ||
        (baseProfile as any)?.schoolCode ||
        null,
    };
    if (me.role === "WALI KELAS") {
      const myWaliClasses = classList.filter(
        (c: any) => c.waliKelasTeacherId === me.teacherId,
      );
      me.classIds = myWaliClasses.map((c: any) => c.id);
      me.classNames = myWaliClasses.map((c: any) => c.name);
    }
    setCurrentUser(me);
    setUsers(hydratedUsers);
    let rawSchoolData = school.data;
    if ((!rawSchoolData || !authoritativeSchoolCode) && schoolId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || "";
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: "get_school_profile",
            school_id: schoolId,
          }),
        });
        const json = await res.json();
        if (json.ok) {
          if (json.profile && !rawSchoolData) {
            rawSchoolData = json.profile;
          }
          if (!authoritativeSchoolCode && json.school?.code) {
            authoritativeSchoolCode = String(json.school.code)
              .replace(/^SCH-?/i, "")
              .trim()
              .toUpperCase();
          }
        }
      } catch (_) {}
    }
    let loadedSchool = rawSchoolData
      ? dbSchool(rawSchoolData, authoritativeSchoolCode)
      : dbSchool(null, authoritativeSchoolCode);

    if (schoolId) {
      try {
        const cachedStr = localStorage.getItem(
          `kawacanaan_school_profile_${schoolId}`,
        );
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          loadedSchool = {
            ...loadedSchool,
            namaSekolah: loadedSchool.namaSekolah || cached.namaSekolah || "",
            jenjang: loadedSchool.jenjang || cached.jenjang || "SD/MI",
            npsn: loadedSchool.npsn || cached.npsn || "",
            kodeSekolah:
              authoritativeSchoolCode ||
              loadedSchool.kodeSekolah ||
              cached.kodeSekolah ||
              "",
            jalan: loadedSchool.jalan || cached.jalan || "",
            desaKelurahan:
              loadedSchool.desaKelurahan || cached.desaKelurahan || "",
            kecamatan: loadedSchool.kecamatan || cached.kecamatan || "",
            kabupatenKota:
              loadedSchool.kabupatenKota || cached.kabupatenKota || "",
            provinsi: loadedSchool.provinsi || cached.provinsi || "",
            kodePos: loadedSchool.kodePos || cached.kodePos || "",
            teleponFax: loadedSchool.teleponFax || cached.teleponFax || "",
            email: loadedSchool.email || cached.email || "",
            website: loadedSchool.website || cached.website || "",
            namaKepalaSekolah:
              loadedSchool.namaKepalaSekolah || cached.namaKepalaSekolah || "",
            nipKepalaSekolah:
              loadedSchool.nipKepalaSekolah || cached.nipKepalaSekolah || "",
            tahunPelajaran:
              loadedSchool.tahunPelajaran ||
              cached.tahunPelajaran ||
              "2025/2026",
            semester: loadedSchool.semester || cached.semester || "1 (Ganjil)",
          };
          loadedSchool.alamat =
            formatFullAlamat(loadedSchool) || loadedSchool.alamat || "";
        }
      } catch (_) {}
    }
    const myClass =
      (me.role === "WALI KELAS" || me.role === "GURU MAPEL") &&
      me.classIds?.length === 1
        ? classList.find((c: any) => c.id === me.classIds?.[0])
        : null;
    setSchoolProfile(
      myClass
        ? { ...loadedSchool, kelas: myClass.name, namaWaliKelas: me.name }
        : loadedSchool,
    );
    const cfg = config.data ? dbConfig(config.data) : INITIAL_SYSTEM_CONFIG;
    setSystemConfig(cfg);
    setActiveStudyDays(cfg.activeStudyDays || [1, 2, 3, 4, 5]);
    setAcademicEvents((events.data || []).map(dbEvent));
    const ed: any = {};
    (effective.data || []).forEach((x: any) => (ed[x.month_key] = x.days));
    setEffectiveDaysConfig(ed);
    setAttendanceRecords(
      (attendance.data || []).map((r: any) => dbAttendance(r, ss)),
    );
    const { data: subjectRows, error: subjectRowsError } = await supabase
      .from("subjects")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    const { data: subjectTeacherRows, error: subjectTeacherRowsError } =
      await supabase
        .from("subject_teacher_assignments")
        .select("subject_id, teacher_id, academic_year")
        .eq("school_id", schoolId)
        .eq("academic_year", activeAcademicYear);
    const { data: subjectClassRows, error: subjectClassRowsError } =
      await supabase
        .from("subject_class_assignments")
        .select("subject_id, class_id, academic_year")
        .eq("school_id", schoolId)
        .eq("academic_year", activeAcademicYear);
    const { data: subjectScheduleRows, error: subjectScheduleRowsError } =
      await supabase
        .from("subject_schedule_days")
        .select("subject_id, day_of_week, lesson_period")
        .eq("school_id", schoolId);
    if (subjectRowsError)
      console.warn(
        "[loadData] subjects read failed:",
        subjectRowsError.message,
      );
    if (subjectTeacherRowsError)
      console.warn(
        "[loadData] subject_teacher_assignments read failed:",
        subjectTeacherRowsError.message,
      );
    if (subjectClassRowsError)
      console.warn(
        "[loadData] subject_class_assignments read failed:",
        subjectClassRowsError.message,
      );
    if (subjectScheduleRowsError)
      console.warn(
        "[loadData] subject_schedule_days read failed:",
        subjectScheduleRowsError.message,
      );
    const teacherMap = new Map<string, any>(
      (baseTeachers || []).map((t: any) => [t.id, t]),
    );
    const classMap = new Map<string, any>(
      (classList || []).map((c: any) => [c.id, c]),
    );
    const teacherBySubject = new Map<string, string>();
    (subjectTeacherRows || []).forEach((r: any) =>
      teacherBySubject.set(r.subject_id, r.teacher_id),
    );
    const classesBySubject = new Map<string, string[]>();
    (subjectClassRows || []).forEach((r: any) => {
      const arr = classesBySubject.get(r.subject_id) || [];
      arr.push(r.class_id);
      classesBySubject.set(r.subject_id, arr);
    });
    const schedulesBySubject = new Map<string, any[]>();
    (subjectScheduleRows || []).forEach((r: any) => {
      const arr = schedulesBySubject.get(r.subject_id) || [];
      arr.push(r);
      schedulesBySubject.set(r.subject_id, arr);
    });
    setSubjects(
      (subjectRows || []).map((row: any) =>
        dbSubject(
          {
            ...row,
            teacher_id: teacherBySubject.get(row.id) || null,
            _targetClassIds: classesBySubject.get(row.id) || [],
          },
          teacherMap,
          classMap,
          schedulesBySubject,
        ),
      ),
    );
    setIsDataLoading(false);
  };

  const selectWorkspace = async (ws: WorkspaceMembership) => {
    setActiveWorkspace(ws);
    setIsSelectingWorkspace(false);
    setIsOnboarding(false);
    if (ws.userId) {
      localStorage.setItem(
        `kawacanaan_last_workspace_id_${ws.userId}`,
        ws.workspaceId,
      );
    }
    localStorage.setItem("kawacanaan_last_workspace_id", ws.workspaceId);
    const { data: baseProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", ws.userId)
      .maybeSingle();
    if (baseProfile) {
      await loadDataForSchool(ws.workspaceId, baseProfile, ws.role);
    }

    const saved = getSavedActiveView();
    const targetView = resolveInitialViewForRole(ws.role, saved);
    setActiveView(targetView);
  };

  const switchToSchoolWorkspace = async () => {
    if (!currentUser) return;
    if (
      currentUser.role === "ADMIN" ||
      currentUser.role === "KEPALA SEKOLAH" ||
      currentUser.role === "SUPER_ADMIN" ||
      currentUser.role === "SISWA"
    ) {
      showToast(
        "Fitur ganti ruang kerja hanya untuk Wali Kelas dan Guru Mapel.",
        "info",
      );
      return;
    }

    let currentMemberships = [...userWorkspaces];
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "get_user_workspaces" }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.workspaces)) {
        currentMemberships = json.workspaces;
        setUserWorkspaces(json.workspaces);
      }
    } catch (_) {}

    const schoolWs = currentMemberships.find(
      (ws) =>
        ws.workspaceType !== "personal" && ws.workspaceType !== "individu",
    );

    if (schoolWs) {
      await selectWorkspace(schoolWs);
      showToast(
        `Beralih ke Ruang Kerja Sekolah: ${schoolWs.workspaceName}`,
        "success",
      );
    } else {
      setIsJoinSchoolModalOpen(true);
    }
  };

  const switchToPersonalWorkspace = async () => {
    if (!currentUser) return;
    if (
      currentUser.role === "ADMIN" ||
      currentUser.role === "KEPALA SEKOLAH" ||
      currentUser.role === "SUPER_ADMIN" ||
      currentUser.role === "SISWA"
    ) {
      showToast(
        "Fitur ganti ruang kerja hanya untuk Wali Kelas dan Guru Mapel.",
        "info",
      );
      return;
    }

    let currentMemberships = [...userWorkspaces];
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "get_user_workspaces" }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.workspaces)) {
        currentMemberships = json.workspaces;
        setUserWorkspaces(json.workspaces);
      }
    } catch (_) {}

    const personalWs = currentMemberships.find(
      (ws) =>
        ws.workspaceType === "personal" || ws.workspaceType === "individu",
    );

    if (personalWs) {
      await selectWorkspace(personalWs);
      showToast("Beralih ke Ruang Kerja Individu.", "success");
    } else {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || "";
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: "create_personal_workspace",
            fullName: currentUser.name || currentUser.username,
            nip: currentUser.nip,
          }),
        });
        const json = await res.json();
        if (json.success && json.workspace) {
          const updated = [...currentMemberships, json.workspace];
          setUserWorkspaces(updated);
          await selectWorkspace(json.workspace);
          showToast("Ruang Kerja Individu baru berhasil dibuka.", "success");
        } else {
          showToast(
            json.error || "Gagal membuka ruang kerja individu baru.",
            "error",
          );
        }
      } catch (err: any) {
        showToast(
          err.message || "Gagal membuat ruang kerja individu.",
          "error",
        );
      }
    }
  };

  const openOnboarding = () => {
    setIsOnboarding(true);
    setIsSelectingWorkspace(false);
  };

  const returnToWorkspaceSelector = () => {
    setIsOnboarding(false);
    if (userWorkspaces.length > 0) {
      setIsSelectingWorkspace(true);
    } else {
      setActiveView("login");
    }
  };

  const loadUserDataAfterOnboarding = async (userId: string) => {
    setIsOnboarding(false);
    setIsSelectingWorkspace(false);
    await loadData(userId);
  };

  const loadData = async (userId: string) => {
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData.session?.user?.id || "";
    }
    if (!userId) {
      setIsOnboarding(false);
      setCurrentUser(null);
      setActiveView("login");
      setIsAuthChecking(false);
      try {
        localStorage.removeItem(CACHE_USER_SESSION_KEY);
        localStorage.removeItem(CACHE_LAST_VIEW_KEY);
      } catch (_) {}
      return;
    }

    const requestId = ++loadRequestRef.current;

    // Ambil daftar ruang kerja / membership user dan profil secara paralel dengan Promise.all
    let memberships: WorkspaceMembership[] = [];
    let baseProfile: any = null;
    try {
      const [onboardingRes, profileRes] = await Promise.all([
        (async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token || "";
          return fetch("/api/onboarding", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ action: "get_user_workspaces" }),
          }).then((r) => r.json());
        })(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);
      if (onboardingRes?.success && Array.isArray(onboardingRes.workspaces)) {
        memberships = onboardingRes.workspaces;
      }
      baseProfile = profileRes?.data || null;
    } catch (_) {}

    // Jika profil belum ada di Supabase client tapi memberships ditemukan (mis. baru selesai onboarding), buat objek baseProfile
    if (!baseProfile && memberships.length > 0) {
      const chosen = memberships[0];
      baseProfile = {
        id: userId,
        school_id: chosen.workspaceId,
        role: chosen.role || "WALI KELAS",
        name: "Pengguna",
        username: "user_" + userId.slice(0, 8),
        is_active: true,
      };
    }

    // Jika profil belum ada dan belum punya ruang kerja sama sekali -> Arahkan ke Onboarding
    if (!baseProfile && memberships.length === 0) {
      setIsOnboarding(true);
      setIsSelectingWorkspace(false);
      setRegistrationRequired(false);
      return;
    }

    if (baseProfile && baseProfile.is_active === false) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setActiveView("login");
      showToast("Akun Anda dinonaktifkan oleh administrator.", "error");
      return;
    }

    if (baseProfile && baseProfile.role === "SUPER_ADMIN") {
      const { data: platform } = await supabase
        .from("platform_settings")
        .select("security")
        .eq("id", 1)
        .maybeSingle();
      if (platform?.security?.mfaRequiredForSuperAdmin) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = (factors?.totp || []).some(
          (f: any) => f.status === "verified",
        );
        if (!verified) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setActiveView("login");
          setIsAuthChecking(false);
          try {
            localStorage.removeItem(CACHE_USER_SESSION_KEY);
            localStorage.removeItem(CACHE_LAST_VIEW_KEY);
          } catch (_) {}
          showToast(
            "MFA wajib untuk akun Super Admin. Aktifkan authenticator terlebih dahulu.",
            "error",
          );
          return;
        }
      }
      try {
        await supabase.rpc("touch_presence");
      } catch (_) {
        /* presence is non-blocking */
      }
      setRegistrationRequired(false);
      setIsOnboarding(false);
      setIsSelectingWorkspace(false);
      const superAdminUser = emptyUser(baseProfile);
      setCurrentUser(superAdminUser);
      try {
        localStorage.setItem(
          CACHE_USER_SESSION_KEY,
          JSON.stringify(superAdminUser),
        );
      } catch (_) {}
      const saved = getSavedActiveView();
      const targetView = resolveInitialViewForRole("SUPER_ADMIN", saved);
      setActiveView(targetView);
      setIsAuthChecking(false);
      return;
    }

    // Fallback jika belum ada record multi-workspace di endpoint: bangun dari baseProfile
    if (memberships.length === 0 && baseProfile && baseProfile.school_id) {
      const { data: schoolRow } = await supabase
        .from("schools")
        .select("name, npsn, code, plan, workspace_type, is_personal")
        .eq("id", baseProfile.school_id)
        .maybeSingle();
      const schoolRowCode = schoolRow?.code
        ? String(schoolRow.code)
            .replace(/^SCH-?/i, "")
            .trim()
            .toUpperCase()
        : null;
      const isPersonal =
        (baseProfile as any).workspace_type === "personal" ||
        (baseProfile as any).registration_mode === "personal" ||
        schoolRow?.workspace_type === "personal" ||
        (schoolRow as any)?.is_personal === true ||
        schoolRow?.plan === "mulai";

      memberships.push({
        id: "ws-mem-" + baseProfile.id,
        userId: baseProfile.id,
        workspaceId: baseProfile.school_id,
        workspaceCode: schoolRowCode,
        role: baseProfile.role as UserRole,
        workspaceName:
          schoolRow?.name ||
          (isPersonal ? "Ruang Kerja Individu" : "Ruang Kerja Sekolah"),
        workspaceType: isPersonal ? "personal" : "school",
        npsn: schoolRow?.npsn || null,
        subscriptionPlan: (schoolRow?.plan ||
          (isPersonal ? "mulai" : "sekolah")) as any,
        joinedAt: baseProfile.created_at || new Date().toISOString(),
      });
    }

    setUserWorkspaces(memberships);

    if (memberships.length === 0) {
      setIsOnboarding(true);
      setIsSelectingWorkspace(false);
      return;
    }

    // Tentukan ruang kerja aktif secara otomatis (berdasarkan ruang kerja terakhir yang digunakan)
    const lastUsedWsId =
      localStorage.getItem(`kawacanaan_last_workspace_id_${userId}`) ||
      localStorage.getItem("kawacanaan_last_workspace_id");

    let chosenWorkspace: WorkspaceMembership | null = null;

    if (lastUsedWsId) {
      chosenWorkspace =
        memberships.find((ws) => ws.workspaceId === lastUsedWsId) || null;
    }

    if (!chosenWorkspace && baseProfile?.school_id) {
      chosenWorkspace =
        memberships.find((ws) => ws.workspaceId === baseProfile.school_id) ||
        null;
    }

    if (!chosenWorkspace) {
      chosenWorkspace =
        memberships.find(
          (ws) =>
            ws.workspaceType !== "personal" && ws.workspaceType !== "individu",
        ) || memberships[0];
    }

    setActiveWorkspace(chosenWorkspace);
    setIsSelectingWorkspace(false);
    setIsOnboarding(false);

    if (userId) {
      localStorage.setItem(
        `kawacanaan_last_workspace_id_${userId}`,
        chosenWorkspace.workspaceId,
      );
    }
    localStorage.setItem(
      "kawacanaan_last_workspace_id",
      chosenWorkspace.workspaceId,
    );

    // Set basic currentUser and transition view immediately so dashboard mounts with zero delay
    const initialMe = emptyUser({
      ...baseProfile,
      school_id: chosenWorkspace.workspaceId,
      role: chosenWorkspace.role,
    });
    setCurrentUser(initialMe);
    try {
      localStorage.setItem(CACHE_USER_SESSION_KEY, JSON.stringify(initialMe));
    } catch (_) {}

    const saved = getSavedActiveView();
    const targetView = resolveInitialViewForRole(chosenWorkspace.role, saved);
    setActiveView(targetView);
    setIsAuthChecking(false);

    await loadDataForSchool(
      chosenWorkspace.workspaceId,
      baseProfile,
      chosenWorkspace.role,
    );
  };
  useEffect(() => {
    let mounted = true;

    // Password recovery harus diperlakukan berbeda dari login biasa.
    // Supabase akan membuat session recovery saat link dari email diklik.
    // Jangan loadData()/redirect ke dashboard pada event ini.
    const handleAuthEvent = (event: string, session: any) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setCurrentUser(null);
        setRegistrationRequired(false);
        setActiveView("login");
        setIsAuthChecking(false);
        return;
      }

      if (session?.user) {
        setPasswordRecovery(false);
        if (
          typeof window !== "undefined" &&
          window.location.hash &&
          (window.location.hash.includes("access_token=") ||
            window.location.hash.includes("refresh_token="))
        ) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
        setTimeout(() => loadData(session.user.id), 0);
        return;
      }

      setPasswordRecovery(false);
      setCurrentUser(null);
      setRegistrationRequired(false);
      setActiveView("login");
      setIsAuthChecking(false);
      try {
        localStorage.removeItem(CACHE_USER_SESSION_KEY);
        localStorage.removeItem(CACHE_LAST_VIEW_KEY);
      } catch (_) {}
      setStudents([]);
      setClasses([]);
      setTeachers([]);
      setUsers([]);
      setAttendanceRecords([]);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const timeoutStatus = checkSessionTimeouts();
      if (timeoutStatus.expired) {
        clearSessionTimers();
        try {
          localStorage.removeItem(CACHE_USER_SESSION_KEY);
          localStorage.removeItem(CACHE_LAST_VIEW_KEY);
        } catch (_) {}
        void supabase.auth.signOut();
        setCurrentUser(null);
        setActiveView("login");
        setIsAuthChecking(false);
        if (timeoutStatus.reason === "idle") {
          showToast(
            "Sesi Anda berakhir otomatis karena tidak ada aktivitas selama 10 menit. Silakan login kembali.",
            "info",
          );
        } else if (timeoutStatus.reason === "absolute") {
          showToast(
            "Sesi login Anda telah mencapai batas maksimal (8 jam). Silakan login kembali demi keamanan akses.",
            "info",
          );
        }
        return;
      }

      // Jika user membuka /reset-password tanpa event recovery (misalnya
      // refresh setelah link diproses), tetap tampilkan form selama ada session.
      if (window.location.pathname === "/reset-password" && data.session) {
        setPasswordRecovery(true);
        return;
      }
      if (data.session?.user) {
        loadData(data.session.user.id);
      } else {
        try {
          localStorage.removeItem(CACHE_USER_SESSION_KEY);
          localStorage.removeItem(CACHE_LAST_VIEW_KEY);
        } catch (_) {}
        setCurrentUser(null);
        setActiveView("login");
        setIsAuthChecking(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(handleAuthEvent);
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Keamanan Akses: Idle Timeout (10 menit tanpa aktivitas) & Absolute Timeout (maksimal 8 jam sesi login)
  useEffect(() => {
    if (!currentUser?.id) return;

    // Inisialisasi timer sesi jika belum ada
    recordSessionActivity();

    let lastThrottledUpdate = Date.now();

    const handleUserActivity = () => {
      const currentNow = Date.now();
      // Throttle update localStorage setiap 5 detik agar tetap ringan
      if (currentNow - lastThrottledUpdate > 5000) {
        lastThrottledUpdate = currentNow;
        try {
          localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(currentNow));
        } catch (_) {}
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const checkTimeout = () => {
      const timeoutStatus = checkSessionTimeouts();
      if (timeoutStatus.expired) {
        void logout();
        if (timeoutStatus.reason === "idle") {
          showToast(
            "Sesi Anda berakhir otomatis karena tidak ada aktivitas selama 10 menit. Silakan login kembali.",
            "info",
          );
        } else if (timeoutStatus.reason === "absolute") {
          showToast(
            "Sesi login Anda telah mencapai batas maksimal (8 jam). Silakan login kembali demi keamanan akses.",
            "info",
          );
        }
      }
    };

    // Periksa setiap 10 detik
    const timerInterval = window.setInterval(checkTimeout, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTimeout();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkTimeout);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.clearInterval(timerInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkTimeout);
    };
  }, [currentUser?.id]);

  // Presensi sesi ringan: menandai akun ini "sedang aktif" agar terlihat di
  // Monitoring Real-Time Super Admin (lihat public.touch_presence() & tabel
  // active_sessions pada 02_superadmin_pro.sql). Tidak berpengaruh
  // apa pun pada akun yang bukan Super Admin selain baris last_seen_at sendiri.
  useEffect(() => {
    if (!currentUser?.id) return;
    const ping = () => {
      supabase.rpc("touch_presence").then(undefined, () => {});
    };
    ping();
    const id = window.setInterval(ping, 60000);
    return () => window.clearInterval(id);
  }, [currentUser?.id]);

  const apiUser = async (action: string, payload: any = {}) => {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/admin-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || "Operasi akun gagal");
    return body;
  };
  const updateSchoolProfile = async (p: SchoolProfile) => {
    const fullAlamat = formatFullAlamat(p) || p.alamat || "";
    const extPayload = {
      full: fullAlamat,
      jenjang: p.jenjang || "SD/MI",
      jalan: p.jalan || "",
      desaKelurahan: p.desaKelurahan || "",
      kecamatan: p.kecamatan || "",
      kabupatenKota: p.kabupatenKota || "",
      provinsi: p.provinsi || "",
      kodePos: p.kodePos || "",
      teleponFax: p.teleponFax || "",
      email: p.email || "",
      website: p.website || "",
      namaKepalaSekolah: p.namaKepalaSekolah || "",
      nipKepalaSekolah: p.nipKepalaSekolah || "",
      tahunPelajaran: p.tahunPelajaran || "2025/2026",
      semester: p.semester || "1 (Ganjil)",
    };
    const serializedAlamat = `__EXTJSON__:${JSON.stringify(extPayload)}`;
    const schoolId =
      currentUser?.schoolId || activeWorkspace?.workspaceId || null;

    const normalizedProfile: SchoolProfile = {
      ...p,
      kodeSekolah: p.kodeSekolah || schoolProfile.kodeSekolah || "",
      alamat: fullAlamat,
      jenjang: p.jenjang || "SD/MI",
      jalan: p.jalan || "",
      desaKelurahan: p.desaKelurahan || "",
      kecamatan: p.kecamatan || "",
      kabupatenKota: p.kabupatenKota || "",
      provinsi: p.provinsi || "",
      kodePos: p.kodePos || "",
      teleponFax: p.teleponFax || "",
      email: p.email || "",
      website: p.website || "",
      namaKepalaSekolah: p.namaKepalaSekolah || "",
      nipKepalaSekolah: p.nipKepalaSekolah || "",
      tahunPelajaran: p.tahunPelajaran || "2025/2026",
      semester: p.semester || "1 (Ganjil)",
      kelas: p.kelas || "",
      namaWaliKelas: p.namaWaliKelas || "",
      nipWaliKelas: p.nipWaliKelas || "",
    };

    // 1. Langsung update state global agar UI stabil & instan tanpa flicker
    setSchoolProfile(normalizedProfile);
    if (p.namaSekolah && activeWorkspace) {
      setActiveWorkspace((prev) =>
        prev ? { ...prev, workspaceName: p.namaSekolah } : null,
      );
    }
    if (p.namaSekolah && currentUser) {
      setCurrentUser((prev) =>
        prev ? { ...prev, schoolName: p.namaSekolah } : null,
      );
    }

    // 2. Simpan cache per school ID ke localStorage agar tahan refresh & switch tab
    if (schoolId) {
      try {
        localStorage.setItem(
          `kawacanaan_school_profile_${schoolId}`,
          JSON.stringify(normalizedProfile),
        );
      } catch (_) {}
    }

    // 3. Simpan dan sinkronisasi ke tabel school_profile dan schools (Superadmin) via API service-role
    let apiSuccess = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "save_school_profile",
          schoolId,
          namaSekolah: p.namaSekolah,
          npsn: p.npsn,
          jenjang: p.jenjang || "SD/MI",
          alamat: serializedAlamat,
          tahunPelajaran: p.tahunPelajaran || "2025/2026",
          semester: p.semester || "1 (Ganjil)",
          kelas: p.kelas || "",
          namaKepalaSekolah: p.namaKepalaSekolah || "",
          nipKepalaSekolah: p.nipKepalaSekolah || "",
          namaWaliKelas: p.namaWaliKelas || "",
          nipWaliKelas: p.nipWaliKelas || "",
        }),
      });
      const jsonRes = await res.json().catch(() => ({}));
      if (res.ok && (jsonRes.ok || jsonRes.success)) {
        apiSuccess = true;
      }
    } catch (err: any) {
      console.warn("API save_school_profile warning:", err?.message);
    }

    // 4. Fallback upsert langsung jika API gagal atau untuk multi-redundansi
    if (schoolId) {
      try {
        await supabase.from("school_profile").upsert(
          {
            school_id: schoolId,
            nama_sekolah: p.namaSekolah,
            npsn: p.npsn || null,
            alamat: serializedAlamat,
            tahun_pelajaran: p.tahunPelajaran || "2025/2026",
            semester: p.semester || "1 (Ganjil)",
            kelas: p.kelas || "",
            nama_kepala_sekolah: p.namaKepalaSekolah || "",
            nip_kepala_sekolah: p.nipKepalaSekolah || "",
            nama_wali_kelas: p.namaWaliKelas || "",
            nip_wali_kelas: p.nipWaliKelas || "",
          },
          { onConflict: "school_id" },
        );

        if (p.namaSekolah || p.npsn) {
          const schUp: any = {};
          if (p.namaSekolah) schUp.name = p.namaSekolah;
          if (p.npsn) schUp.npsn = p.npsn;
          await supabase.from("schools").update(schUp).eq("id", schoolId);
        }
      } catch (upsertErr: any) {
        console.warn(
          "Direct upsert school_profile warning:",
          upsertErr?.message,
        );
      }
    }

    showToast("Identitas Sekolah berhasil disimpan");
  };
  const updateSystemConfig = async (c: SystemConfig) => {
    const { error } = await supabase
      .from("system_config")
      .upsert(
        {
          school_id: currentUser?.schoolId || null,
          app_title: c.appTitle,
          app_subtitle: c.appSubtitle,
          footer_copyright: c.footerCopyright,
          school_logo_url: c.schoolLogoUrl || "",
          letterhead_type: c.letterheadType || "standard_text",
          letterhead_image_url: c.letterheadImageUrl || "",
          show_letterhead: c.showLetterhead ?? true,
          default_check_in_time: c.defaultCheckInTime,
          default_check_out_time: c.defaultCheckOutTime,
          report_place: c.reportPlace,
          report_date: c.reportDate,
          active_study_days: c.activeStudyDays || activeStudyDays,
          student_self_attendance_enabled: c.studentSelfAttendanceEnabled,
          check_in_start_time: c.checkInStartTime,
          check_in_deadline_time: c.checkInDeadlineTime,
          check_out_start_time: c.checkOutStartTime,
          auto_mark_late: c.autoMarkLate,
        },
        { onConflict: "school_id" },
      );
    if (error) return showToast(error.message, "error");
    setSystemConfig(c);
    setActiveStudyDays(c.activeStudyDays || activeStudyDays);
    showToast("Pengaturan Sistem berhasil diperbarui");
  };
  const resolveWaliKelas = async (inputTeacherId: string | null, targetClassId?: string | null) => {
    if (!inputTeacherId) return { dbWaliTeacherId: null, waliName: null };
    const schoolId = currentUser?.schoolId || null;
    const year = schoolProfile.tahunPelajaran || "2026/2027";

    // Validasi aturan: Satu guru hanya boleh menjadi Wali Kelas untuk satu kelas dalam tahun ajaran yang sama
    const existingHomeroom = classes.find(
      (c) =>
        c.waliKelasTeacherId === inputTeacherId &&
        (!c.academicYear || c.academicYear === year) &&
        (!targetClassId || c.id !== targetClassId),
    );
    if (existingHomeroom) {
      throw new Error(
        `Guru ini sudah ditugaskan sebagai Wali Kelas pada "${existingHomeroom.name}" untuk tahun ajaran ${year}. Satu guru hanya boleh menjadi Wali Kelas untuk satu rombel kelas.`,
      );
    }

    const teacherMatch = teachers.find((t) => t.id === inputTeacherId);
    if (teacherMatch) {
      return { dbWaliTeacherId: teacherMatch.id, waliName: teacherMatch.nama };
    }
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const { data: teacher, error } = await supabase
      .from("teachers")
      .select("id,nama,school_id")
      .eq("id", inputTeacherId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (error) throw error;
    if (!teacher)
      throw new Error("Guru wali kelas tidak ditemukan pada sekolah aktif.");
    return { dbWaliTeacherId: teacher.id, waliName: teacher.nama };
  };
  const addClass = async (c: Omit<SchoolClass, "id">) => {
    try {
      const schoolId = currentUser?.schoolId || null;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");

      const academicYear =
        c.academicYear || schoolProfile.tahunPelajaran || "2026/2027";
      const { data: duplicateClass } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .ilike("name", c.name.trim())
        .maybeSingle();
      if (duplicateClass) {
        throw new Error(`Rombel "${c.name.trim()}" sudah ada pada tahun ajaran ${academicYear}.`);
      }
      if (c.waliKelasTeacherId) {
        // Lepaskan assignment kelas lain jika guru ini sebelumnya menjadi wali kelas di kelas lain
        await supabase
          .from("classes")
          .update({ wali_kelas_teacher_id: null })
          .eq("school_id", schoolId)
          .eq("wali_kelas_teacher_id", c.waliKelasTeacherId);
      }

      const { data: insertedData, error } = await supabase
        .from("classes")
        .insert({
          name: c.name.trim(),
          grade: c.grade,
          academic_year: academicYear,
          wali_kelas_teacher_id: c.waliKelasTeacherId || null,
          school_id: schoolId,
        })
        .select("*, wali:wali_kelas_teacher_id(id,nama)")
        .single();
      if (error) throw error;
      setClasses((p) => [
        ...p.map((x) =>
          c.waliKelasTeacherId && x.waliKelasTeacherId === c.waliKelasTeacherId
            ? { ...x, waliKelasTeacherId: null, waliKelasName: null }
            : x,
        ),
        {
          id: insertedData.id,
          name: insertedData.name,
          grade: insertedData.grade,
          academicYear: insertedData.academic_year,
          waliKelasTeacherId: insertedData.wali_kelas_teacher_id || null,
          waliKelasName: insertedData.wali?.nama || null,
        },
      ]);
      showToast(`Kelas ${insertedData.name} berhasil ditambahkan`);
    } catch (e: any) {
      showToast(e.message || "Gagal menambahkan kelas.", "error");
      throw e;
    }
  };
  const updateClass = async (id: string, c: Omit<SchoolClass, "id">) => {
    try {
      const schoolId = currentUser?.schoolId || null;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const academicYear =
        c.academicYear || schoolProfile.tahunPelajaran || "2026/2027";
      const { data: duplicateClass } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .ilike("name", c.name.trim())
        .neq("id", id)
        .maybeSingle();
      if (duplicateClass) {
        throw new Error(`Rombel "${c.name.trim()}" sudah ada pada tahun ajaran ${academicYear}.`);
      }
      const classUpdate: any = {
        name: c.name.trim(),
        grade: c.grade,
        academic_year: academicYear,
      };
      if (Object.prototype.hasOwnProperty.call(c, "waliKelasTeacherId")) {
        if (c.waliKelasTeacherId) {
          // Lepaskan assignment kelas lain jika guru ini sebelumnya menjadi wali kelas di kelas lain
          await supabase
            .from("classes")
            .update({ wali_kelas_teacher_id: null })
            .eq("school_id", schoolId)
            .neq("id", id)
            .eq("wali_kelas_teacher_id", c.waliKelasTeacherId);
        }
        classUpdate.wali_kelas_teacher_id = c.waliKelasTeacherId || null;
      }
      const { data: updatedData, error } = await supabase
        .from("classes")
        .update(classUpdate)
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*, wali:wali_kelas_teacher_id(id,nama)")
        .single();
      if (error) throw error;
      setClasses((p) =>
        p.map((x) => {
          if (x.id === id) {
            return {
              id: updatedData.id,
              name: updatedData.name,
              grade: updatedData.grade,
              academicYear: updatedData.academic_year,
              waliKelasTeacherId: updatedData.wali_kelas_teacher_id || null,
              waliKelasName: updatedData.wali?.nama || null,
            };
          }
          if (
            updatedData.wali_kelas_teacher_id &&
            x.waliKelasTeacherId === updatedData.wali_kelas_teacher_id
          ) {
            return {
              ...x,
              waliKelasTeacherId: null,
              waliKelasName: null,
            };
          }
          return x;
        }),
      );
      showToast(`Kelas ${updatedData.name} berhasil diperbarui`);
    } catch (e: any) {
      showToast(e.message || "Gagal memperbarui kelas.", "error");
      throw e;
    }
  };
  const deleteClass = async (id: string) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      setClasses((p) => p.filter((x) => x.id !== id));
      setStudents((p) =>
        p.map((s) =>
          s.classId === id ? { ...s, classId: null, className: "" } : s,
        ),
      );
      showToast("Kelas berhasil dihapus", "info");
    } catch (e: any) {
      showToast(e.message || "Gagal menghapus kelas.", "error");
      throw e;
    }
  };
  const importClasses = async (
    items: Array<Omit<SchoolClass, "id"> & { waliKelasNameInput?: string }>,
    replaceExisting = false,
  ) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    if (!items.length)
      throw new Error("Tidak ada data kelas yang valid untuk diimpor");
    const payload = items.map((c) => {
      let waliId = c.waliKelasTeacherId || null;
      if (!waliId && c.waliKelasNameInput) {
        const m = teachers.find(
          (t) =>
            t.nama.trim().toLowerCase() ===
            c.waliKelasNameInput!.trim().toLowerCase(),
        );
        waliId = m?.id || null;
      }
      return {
        name: c.name.trim(),
        grade: c.grade,
        academic_year:
          c.academicYear || schoolProfile.tahunPelajaran || "2026/2027",
        wali_kelas_teacher_id: waliId,
      };
    });
    const { error } = await supabase.rpc("import_classes_atomic", {
      p_school_id: schoolId,
      p_items: payload,
      p_replace_existing: replaceExisting,
      p_actor_user_id: currentUser?.id || null,
    });
    if (error) throw error;
    await loadData(currentUser?.id);
    showToast(`Berhasil mengimpor ${items.length} data kelas.`);
  };
  const addTeacher = async (t: Omit<Teacher, "id">) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const rawJabatan = (t.jabatan || "").trim();
    const finalJabatan =
      rawJabatan === "Wali Kelas"
        ? "Wali Kelas"
        : rawJabatan === "Guru Mapel"
          ? "Guru Mapel"
          : rawJabatan || "Belum ditugaskan";
    const finalJenisPTK =
      t.jenisPTK ||
      (finalJabatan === "Wali Kelas"
        ? "Wali Kelas"
        : finalJabatan === "Guru Mapel"
          ? "Guru Mapel"
          : "Guru");

    const { data, error } = await supabase
      .from("teachers")
      .insert({
        school_id: schoolId,
        nama: t.nama.trim(),
        nip: t.nip || null,
        jenis_kelamin: t.jenisKelamin || "L",
        status_kepegawaian: t.statusKepegawaian || null,
        no_hp: t.noHp || null,
        mata_pelajaran: t.mataPelajaran || null,
        jabatan: finalJabatan,
        jenis_ptk: finalJenisPTK,
      })
      .select("*")
      .single();
    if (error) throw error;
    const newT = dbTeacher(data);
    setTeachers((p) => [...p, newT]);
    showToast(`Data guru ${t.nama} berhasil ditambahkan`);
    return newT;
  };
  const updateTeacher = async (id: string, t: Omit<Teacher, "id">) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const rawJabatan = (t.jabatan || "").trim();
    const finalJabatan =
      rawJabatan === "Wali Kelas"
        ? "Wali Kelas"
        : rawJabatan === "Guru Mapel"
          ? "Guru Mapel"
          : rawJabatan || "Belum ditugaskan";
    const finalJenisPTK =
      t.jenisPTK ||
      (finalJabatan === "Wali Kelas"
        ? "Wali Kelas"
        : finalJabatan === "Guru Mapel"
          ? "Guru Mapel"
          : "Guru");

    const { data, error } = await supabase
      .from("teachers")
      .update({
        nama: t.nama.trim(),
        nip: t.nip || null,
        jenis_kelamin: t.jenisKelamin || "L",
        status_kepegawaian: t.statusKepegawaian || null,
        no_hp: t.noHp || null,
        mata_pelajaran: t.mataPelajaran || null,
        jabatan: finalJabatan,
        jenis_ptk: finalJenisPTK,
      })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*")
      .single();
    if (error) throw error;
    const updatedT = dbTeacher(data);
    setTeachers((p) => p.map((x) => (x.id === id ? updatedT : x)));
    showToast(`Data guru ${t.nama} berhasil diperbarui`);
  };
  const importTeachers = async (
    items: Omit<Teacher, "id">[],
    replaceExisting = false,
  ) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const payload = items.map((t) => {
      return {
        nama: t.nama.trim(),
        nip: t.nip && t.nip.trim() !== "-" ? t.nip.trim() : null,
        jenis_kelamin: t.jenisKelamin || "L",
        status_kepegawaian: t.statusKepegawaian || "PNS",
        no_hp: t.noHp || null,
        mata_pelajaran: null,
        jabatan: "Belum ditugaskan",
        jenis_ptk: "Belum ditugaskan",
      };
    });

    const { error } = await supabase.rpc("import_teachers_atomic", {
      p_school_id: schoolId,
      p_items: payload,
      p_replace_existing: replaceExisting,
      p_actor_user_id: currentUser?.id || null,
    });

    if (error) {
      console.warn("import_teachers_atomic error, falling back to direct batch insert:", error);
      if (replaceExisting) {
        await supabase.from("teachers").delete().eq("school_id", schoolId);
      }
      for (const row of payload) {
        if (row.nip && !replaceExisting) {
          const { data: existing } = await supabase
            .from("teachers")
            .select("id")
            .eq("school_id", schoolId)
            .eq("nip", row.nip)
            .maybeSingle();
          if (existing) {
            await supabase
              .from("teachers")
              .update({
                nama: row.nama,
                jenis_kelamin: row.jenis_kelamin,
                status_kepegawaian: row.status_kepegawaian,
                no_hp: row.no_hp,
                jabatan: "Belum ditugaskan",
                jenis_ptk: "Belum ditugaskan",
                mata_pelajaran: null,
              })
              .eq("id", existing.id);
            continue;
          }
        }
        await supabase.from("teachers").insert({
          school_id: schoolId,
          ...row,
        });
      }
    }

    await loadData(currentUser?.id);
    showToast(`Berhasil mengimpor ${items.length} data guru.`);
  };
  const addStudent = async (st: Omit<Student, "id">) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const { data, error } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,
        nama: st.nama.trim(),
        nisn: st.nisn || null,
        gender: st.gender || "L",
        class_id: st.classId || null,
      })
      .select("*,classes:class_id(id,name)")
      .single();
    if (error) throw error;
    setStudents((p) => [
      ...p,
      dbStudent({ ...data, class_name: data.classes?.name || "" }),
    ]);
  };
  const updateStudent = async (id: string, st: Omit<Student, "id">) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const { data, error } = await supabase
      .from("students")
      .update({
        nama: st.nama.trim(),
        nisn: st.nisn || null,
        gender: st.gender || "L",
        class_id: st.classId || null,
      })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*,classes:class_id(id,name)")
      .single();
    if (error) throw error;
    setStudents((p) =>
      p.map((x) =>
        x.id === id
          ? dbStudent({ ...data, class_name: data.classes?.name || "" })
          : x,
      ),
    );
  };
  const deleteStudent = async (id: string) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) throw error;
    setStudents((p) => p.filter((x) => x.id !== id));
  };
  const deleteStudentsByClass = async (classId: string) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("school_id", schoolId)
      .eq("class_id", classId);
    if (error) throw error;
    setStudents((p) => p.filter((x) => x.classId !== classId));
  };
  const importStudents = async (
    items: Omit<Student, "id">[],
    replaceExisting = false,
    targetClassId?: string,
  ) => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
    const payload = items.map((st) => ({
      nama: st.nama.trim(),
      nisn: st.nisn || null,
      gender: st.gender || "L",
      class_id: st.classId || null,
    }));
    const { error } = await supabase.rpc("import_students_atomic", {
      p_school_id: schoolId,
      p_items: payload,
      p_replace_existing: replaceExisting,
      p_target_class_id: targetClassId || null,
      p_actor_user_id: currentUser?.id || null,
    });
    if (error) throw error;
    await loadData(currentUser?.id);
    showToast(`Berhasil mengimpor ${items.length} data siswa.`);
  };
  const deleteTeacher = async (id: string) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const { data: teacher, error: teacherErr } = await supabase
        .from("teachers")
        .select("id,nama")
        .eq("id", id)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (teacherErr) throw teacherErr;
      if (!teacher) throw new Error("Guru tidak ditemukan pada sekolah aktif.");
      const { error: clearWaliErr } = await supabase
        .from("classes")
        .update({ wali_kelas_teacher_id: null })
        .eq("school_id", schoolId)
        .eq("wali_kelas_teacher_id", id);
      if (clearWaliErr) throw clearWaliErr;
      const { error: staErr } = await supabase
        .from("subject_teacher_assignments")
        .delete()
        .eq("school_id", schoolId)
        .eq("teacher_id", id);
      if (staErr) throw staErr;
      // Hapus akun/profil melalui API bila ada; kegagalan API tidak boleh disembunyikan.
      const linkedUser = users.find((u) => u.teacherId === id);
      if (linkedUser) {
        try {
          await apiUser("delete", { userId: linkedUser.id });
        } catch (apiErr: any) {
          throw new Error(
            `Data guru siap dihapus, tetapi akun login gagal dihapus: ${apiErr?.message || "kesalahan server"}`,
          );
        }
      }
      const { error: delErr } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (delErr) throw delErr;
      setTeachers((p) => p.filter((x) => x.id !== id));
      setClasses((p) =>
        p.map((c) =>
          c.waliKelasTeacherId === id
            ? { ...c, waliKelasTeacherId: null, waliKelasName: null }
            : c,
        ),
      );
      setUsers((p) => p.filter((u) => u.teacherId !== id));
      showToast("Data guru berhasil dihapus", "info");
    } catch (e: any) {
      showToast(e.message || "Gagal menghapus guru.", "error");
      throw e;
    }
  };
  const assignTeacherClasses = async (
    teacherId: string,
    classIds: string[],
  ) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const uniqueClassIds: string[] = [...new Set<string>(classIds)];
      const academicYear = schoolProfile.tahunPelajaran || "2026/2027";
      const { data: teacherRow, error: teacherErr } = await supabase
        .from("teachers")
        .select("id,school_id,nama,jabatan,mata_pelajaran")
        .eq("id", teacherId)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (teacherErr) throw teacherErr;
      if (!teacherRow)
        throw new Error("Guru tidak ditemukan pada sekolah aktif.");
      const { data: waliRows } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("wali_kelas_teacher_id", teacherId)
        .limit(1);
      const { data: mapelRows } = await supabase
        .from("subject_teacher_assignments")
        .select("subject_id")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("teacher_id", teacherId);

      const isWali = (waliRows || []).length > 0;
      const isMapel = (mapelRows || []).length > 0;

      if (isWali && !isMapel) {
        if (uniqueClassIds.length > 1)
          throw new Error("Wali Kelas hanya boleh memiliki 1 kelas.");
        const { error } = await supabase.rpc("assign_homeroom_teacher", {
          p_school_id: schoolId,
          p_teacher_id: teacherId,
          p_class_id: uniqueClassIds[0] || null,
          p_academic_year: academicYear,
          p_actor_user_id: currentUser?.id || null,
        });
        if (error) throw error;
      } else if (isMapel || (mapelRows || []).length > 0) {
        let targetSubjectIds = (mapelRows || []).map((r: any) => r.subject_id);
        if (targetSubjectIds.length === 0) {
          const matchedSubject = subjects.find(
            (s) =>
              s.teacherId === teacherId ||
              (teacherRow.mata_pelajaran &&
                s.name
                  .toLowerCase()
                  .includes(teacherRow.mata_pelajaran.toLowerCase())),
          );
          if (matchedSubject) {
            targetSubjectIds = [matchedSubject.id];
          }
        }
        for (const subId of targetSubjectIds) {
          const { error } = await supabase.rpc("replace_subject_assignment", {
            p_school_id: schoolId,
            p_subject_id: subId,
            p_teacher_id: teacherId,
            p_class_ids: uniqueClassIds,
            p_academic_year: academicYear,
            p_actor_user_id: currentUser?.id || null,
          });
          if (error) throw error;
        }
      } else if (uniqueClassIds.length) {
        throw new Error(
          "Guru belum mempunyai assignment Wali Kelas atau Guru Mapel. Tetapkan role melalui Data Guru terlebih dahulu.",
        );
      }
      await loadData(currentUser?.id || "");
      showToast("Penugasan guru berhasil diperbarui");
    } catch (e: any) {
      showToast(e.message || "Gagal memperbarui penugasan guru.", "error");
      throw e;
    }
  };

  const executeTeacherAssignment = async (
    teacherId: string,
    roleType: "NONE" | "WALI_KELAS" | "GURU_MAPEL",
    subjectId?: string,
    targetClassIds?: string[],
  ) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const activeAcademicYear = schoolProfile.tahunPelajaran || "2026/2027";

      if (roleType === "WALI_KELAS") {
        if (targetClassIds && targetClassIds.length > 1) {
          throw new Error("Satu guru hanya boleh menjadi Wali Kelas untuk satu rombel pada satu tahun ajaran.");
        }

        // Hapus penugasan mapel jika ada pada sekolah aktif
        await supabase
          .from("subject_teacher_assignments")
          .delete()
          .eq("school_id", schoolId)
          .eq("teacher_id", teacherId);

        if (targetClassIds && targetClassIds.length > 0) {
          const targetClassId = targetClassIds[0];
          const { data: targetClass, error: targetClassError } = await supabase
            .from("classes")
            .select("id,academic_year")
            .eq("school_id", schoolId)
            .eq("id", targetClassId)
            .maybeSingle();
          if (targetClassError) throw targetClassError;
          if (!targetClass) throw new Error("Rombel tujuan tidak ditemukan pada sekolah aktif.");
          if (targetClass.academic_year && targetClass.academic_year !== activeAcademicYear) {
            throw new Error(`Rombel tersebut bukan bagian dari tahun ajaran aktif ${activeAcademicYear}.`);
          }
          // Lepaskan assignment Wali Kelas guru ini pada sekolah aktif.
          const { error: clearError } = await supabase
            .from("classes")
            .update({ wali_kelas_teacher_id: null })
            .eq("school_id", schoolId)
            .eq("wali_kelas_teacher_id", teacherId);
          if (clearError) throw clearError;

          // Satu rombel aktif hanya boleh memiliki satu wali.
          const { error: assignError } = await supabase
            .from("classes")
            .update({ wali_kelas_teacher_id: teacherId })
            .eq("school_id", schoolId)
            .eq("id", targetClassId);
          if (assignError) throw assignError;
        }

        // Perbarui tabel teachers agar kolom STATUS PENUGASAN (ADMIN) otomatis tersimpan & terbaca
        await supabase
          .from("teachers")
          .update({
            jabatan: "Wali Kelas",
            jenis_ptk: "Wali Kelas",
            mata_pelajaran: null,
          })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  jabatan: "Wali Kelas",
                  jenisPTK: "Wali Kelas",
                  mataPelajaran: "",
                }
              : t,
          ),
        );

        const linkedUser = users.find((u) => u.teacherId === teacherId);
        if (linkedUser) {
          const userClassIds = classes
            .filter((c) => c.waliKelasTeacherId === teacherId)
            .map((c) => c.id);
          await supabase
            .from("profiles")
            .update({
              role: "WALI KELAS",
              subject_id: null,
              subject_name: null,
              class_ids: targetClassIds || userClassIds,
            })
            .eq("id", linkedUser.id)
            .eq("school_id", schoolId);
        }
      } else if (roleType === "GURU_MAPEL") {
        const chosenSubject = subjectId ? subjects.find((s) => s.id === subjectId) : null;
        const subjectName = chosenSubject?.name || null;

        // Lepas wali kelas jika sebelumnya ditugaskan sebagai wali kelas
        await supabase
          .from("classes")
          .update({ wali_kelas_teacher_id: null })
          .eq("school_id", schoolId)
          .eq("wali_kelas_teacher_id", teacherId);

        if (subjectId && chosenSubject) {
          const uniqueTargetClassIds = [...new Set((targetClassIds || []).filter(Boolean))];
          if (uniqueTargetClassIds.length) {
            const { data: targetClasses, error: targetClassesError } = await supabase
              .from("classes")
              .select("id,academic_year")
              .eq("school_id", schoolId)
              .in("id", uniqueTargetClassIds);
            if (targetClassesError) throw targetClassesError;
            if ((targetClasses || []).length !== uniqueTargetClassIds.length) {
              throw new Error("Ada Rombel tujuan yang tidak valid.");
            }
          }

          // Assignment Guru + Mapel
          const { error: staDeleteError } = await supabase
            .from("subject_teacher_assignments")
            .delete()
            .eq("school_id", schoolId)
            .eq("teacher_id", teacherId);
          if (staDeleteError) throw staDeleteError;

          const { error: staErr } = await supabase
            .from("subject_teacher_assignments")
            .insert({
              school_id: schoolId,
              subject_id: subjectId,
              teacher_id: teacherId,
              academic_year: activeAcademicYear,
            });
          if (staErr) throw staErr;

          // Sinkronkan kelas
          const { error: scaDeleteError } = await supabase
            .from("subject_class_assignments")
            .delete()
            .eq("school_id", schoolId)
            .eq("subject_id", subjectId);
          if (scaDeleteError) throw scaDeleteError;

          if (uniqueTargetClassIds.length) {
            const classInserts = uniqueTargetClassIds.map((cid) => ({
              school_id: schoolId,
              subject_id: subjectId,
              class_id: cid,
              academic_year: activeAcademicYear,
            }));
            const { error: scaInsertError } = await supabase
              .from("subject_class_assignments")
              .insert(classInserts);
            if (scaInsertError) throw scaInsertError;
          }
        }

        // Perbarui tabel teachers agar kolom STATUS PENUGASAN (ADMIN) otomatis tersimpan & terbaca
        await supabase
          .from("teachers")
          .update({
            jabatan: "Guru Mapel",
            jenis_ptk: "Guru Mapel",
            mata_pelajaran: subjectName || null,
          })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  jabatan: "Guru Mapel",
                  jenisPTK: "Guru Mapel",
                  mataPelajaran: subjectName || "",
                }
              : t,
          ),
        );

        const linkedUser = users.find((u) => u.teacherId === teacherId);
        if (linkedUser) {
          await supabase
            .from("profiles")
            .update({
              role: "GURU MAPEL",
              subject_id: subjectId || null,
              subject_name: subjectName || null,
              class_ids: targetClassIds || linkedUser.classIds || [],
            })
            .eq("id", linkedUser.id)
            .eq("school_id", schoolId);
        }
      } else {
        await supabase
          .from("classes")
          .update({ wali_kelas_teacher_id: null })
          .eq("school_id", schoolId)
          .eq("wali_kelas_teacher_id", teacherId);

        await supabase
          .from("subject_teacher_assignments")
          .delete()
          .eq("school_id", schoolId)
          .eq("teacher_id", teacherId);

        // Perbarui tabel teachers agar kolom STATUS PENUGASAN (ADMIN) otomatis tersimpan & terbaca
        await supabase
          .from("teachers")
          .update({
            jabatan: "Belum ditugaskan",
            jenis_ptk: "Belum ditugaskan",
            mata_pelajaran: null,
          })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  jabatan: "Belum ditugaskan",
                  jenisPTK: "Belum ditugaskan",
                  mataPelajaran: "",
                }
              : t,
          ),
        );

        const linkedUser = users.find((u) => u.teacherId === teacherId);
        if (linkedUser) {
          await supabase
            .from("profiles")
            .update({
              class_ids: [],
              subject_id: null,
              subject_name: null,
            })
            .eq("id", linkedUser.id)
            .eq("school_id", schoolId);
        }
      }

      await loadData(currentUser?.id || "");
      showToast("Penugasan guru berhasil disimpan ke database.");
    } catch (e: any) {
      console.error("executeTeacherAssignment error:", e);
      showToast(
        e.message || "Gagal memperbarui penugasan guru di database.",
        "error",
      );
      throw e;
    }
  };
  const hydrateUser = async (p: any): Promise<UserAccount> => {
    const base = emptyUser(p);
    const teacherId = base.teacherId || null;
    const schoolId = base.schoolId || currentUser?.schoolId || null;
    if (!teacherId || !schoolId)
      return { ...base, classIds: [], classNames: [] };
    let ids: string[] = [];
    if (base.role === "WALI KELAS") {
      const { data, error } = await supabase
        .from("classes")
        .select("id,name")
        .eq("school_id", schoolId)
        .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027")
        .eq("wali_kelas_teacher_id", teacherId);
      if (error) throw error;
      ids = (data || []).map((x: any) => x.id);
      return {
        ...base,
        classIds: ids,
        classNames: (data || []).map((x: any) => x.name),
      };
    }
    if (base.role === "GURU MAPEL") {
      const { data: sta, error: staErr } = await supabase
        .from("subject_teacher_assignments")
        .select("subject_id")
        .eq("school_id", schoolId)
        .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027")
        .eq("teacher_id", teacherId);
      if (staErr) throw staErr;
      const subjectIds = (sta || []).map((x: any) => x.subject_id);
      if (subjectIds.length) {
        const { data: sca, error: scaErr } = await supabase
          .from("subject_class_assignments")
          .select("class_id")
          .eq("school_id", schoolId)
          .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027")
          .in("subject_id", subjectIds);
        if (scaErr) throw scaErr;
        ids = Array.from(
          new Set<string>((sca || []).map((x: any) => String(x.class_id))),
        );
      }
      const names = ids
        .map((id) => classes.find((c) => c.id === id)?.name || "")
        .filter(Boolean);
      return { ...base, classIds: ids, classNames: names };
    }
    return { ...base, classIds: [], classNames: [] };
  };
  const addUser = async (u: UserAccountInput) => {
    try {
      const result = await apiUser("create", {
        name: u.name,
        email: u.email || null,
        username: u.username,
        password: u.password,
        role: u.role,
        studentId: u.studentId || null,
        classIds: u.classIds || [],
        subjectId: u.subjectId || null,
        subjectName: u.subjectName || null,
      });
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", u.username.toLowerCase())
        .single();
      if (error) throw error;
      const teacherId = result?.teacherId || data?.teacher_id || null;
      const nu = await hydrateUser({ ...data, teacher_id: teacherId });
      setUsers((p) => [...p.filter((x) => x.id !== nu.id), nu]);
      if (u.role === "WALI KELAS" && teacherId) {
        const ids = nu.classIds || [];
        setClasses((prev) =>
          prev.map((c) =>
            ids.includes(c.id)
              ? {
                  ...c,
                  waliKelasTeacherId: teacherId,
                  waliKelasName: data.name,
                }
              : c,
          ),
        );
      }
      showToast(`Akun pengguna ${u.name} berhasil ditambahkan`);
    } catch (e: any) {
      showToast(e.message || "Gagal membuat akun pengguna.", "error");
      throw e;
    }
  };
  const deleteUser = async (id: string) => {
    try {
      await apiUser("delete", { userId: id });
      setUsers((p) => p.filter((x) => x.id !== id));
      if (currentUser?.id === id) await supabase.auth.signOut();
      showToast("Akun pengguna berhasil dihapus", "info");
    } catch (e: any) {
      showToast(e.message, "error");
      throw e;
    }
  };
  const updateUser = async (id: string, data: Partial<UserAccount>) => {
    try {
      await apiUser("update", {
        userId: id,
        name: data.name,
        email: data.email || null,
        username: data.username,
        role: data.role,
        studentId: data.studentId || null,
        classIds: data.classIds || [],
        subjectId: data.subjectId || null,
        subjectName: data.subjectName || null,
      });
      const { data: profileAfter, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!profileAfter)
        throw new Error("Profil pengguna setelah pembaruan tidak ditemukan.");
      const teacherId = profileAfter.teacher_id || null;
      const nu = await hydrateUser({ ...profileAfter, teacher_id: teacherId });
      setUsers((p) => p.map((x) => (x.id === id ? { ...x, ...nu } : x)));
      if (currentUser?.id === id)
        setCurrentUser((p) => (p ? { ...p, ...nu } : p));
      setClasses((prev) =>
        prev.map((c) =>
          c.waliKelasTeacherId === teacherId && nu.role !== "WALI KELAS"
            ? { ...c, waliKelasTeacherId: null, waliKelasName: null }
            : c,
        ),
      );
      showToast("Data akun pengguna berhasil diperbarui");
    } catch (e: any) {
      showToast(e.message || "Gagal memperbarui akun pengguna.", "error");
      throw e;
    }
  };
  const generateRandomPassword = (length = 8): string => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    let pwd = "";
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 3; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  };

  const sanitizeUsername = (raw: string, fallbackPrefix: string): string => {
    let cleaned = (raw || "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (cleaned.length < 3) {
      cleaned = `${fallbackPrefix}_${cleaned || Math.floor(1000 + Math.random() * 9000)}`;
    }
    return cleaned.slice(0, 60);
  };

  const generateAccountsFromReferences = async (options?: {
    resetExistingPasswords?: boolean;
  }): Promise<GeneratedAccountResult[]> => {
    const resetExisting = !!options?.resetExistingPasswords;
    const results: GeneratedAccountResult[] = [];
    const schoolId = currentUser?.schoolId;
    if (!schoolId) {
      showToast("ID Sekolah tidak valid.", "error");
      return results;
    }

    try {
      // 1. Data Kepala Sekolah
      if (schoolProfile.namaKepalaSekolah && schoolProfile.nipKepalaSekolah) {
        const ksName = schoolProfile.namaKepalaSekolah.trim();
        const ksUsername = sanitizeUsername(
          schoolProfile.nipKepalaSekolah,
          "ks",
        );
        const existing = users.find(
          (u) =>
            u.role === "KEPALA SEKOLAH" ||
            u.username.toLowerCase() === ksUsername.toLowerCase(),
        );

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            await apiUser("create", {
              name: ksName,
              username: ksUsername,
              password,
              role: "KEPALA SEKOLAH",
            });
            results.push({
              name: ksName,
              username: ksUsername,
              password,
              role: "KEPALA SEKOLAH",
              category: "KEPALA SEKOLAH",
              status: "CREATED",
            });
          } catch (err: any) {
            results.push({
              name: ksName,
              username: ksUsername,
              role: "KEPALA SEKOLAH",
              category: "KEPALA SEKOLAH",
              status: "SKIPPED",
              error: err?.message,
            });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newPassword,
            });
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              password: newPassword,
              role: existing.role,
              category: "KEPALA SEKOLAH",
              status: "UPDATED",
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              role: existing.role,
              category: "KEPALA SEKOLAH",
              status: "SKIPPED",
              error: err?.message,
            });
          }
        }
      }

      // 2. Data Guru
      for (const teacher of teachers) {
        const teacherName = teacher.nama.trim();
        const teacherUsername = sanitizeUsername(
          teacher.nip && teacher.nip !== "-" ? teacher.nip : teacher.nama,
          "guru",
        );
        const existing = users.find(
          (u) =>
            u.username.toLowerCase() === teacherUsername.toLowerCase() ||
            (u.name.trim().toLowerCase() === teacherName.toLowerCase() &&
              (u.role === "WALI KELAS" || u.role === "GURU MAPEL")),
        );

        const linkedClass = classes.find(
          (c) =>
            c.waliKelasTeacherId === teacher.id ||
            (c.waliKelasName &&
              c.waliKelasName.trim().toLowerCase() ===
                teacherName.toLowerCase()),
        );
        const classIds = linkedClass ? [linkedClass.id] : [];
        const role: UserRole =
          teacher.jabatan === "Wali Kelas" || linkedClass
            ? "WALI KELAS"
            : "GURU MAPEL";

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            const res = await apiUser("create", {
              name: teacherName,
              username: teacherUsername,
              password,
              role,
              classIds,
            });
            const createdTeacherId = res?.teacherId;
            if (createdTeacherId && linkedClass) {
              await supabase
                .from("classes")
                .update({ wali_kelas_teacher_id: createdTeacherId })
                .eq("id", linkedClass.id);
              setClasses((prev) =>
                prev.map((c) =>
                  c.id === linkedClass.id
                    ? {
                        ...c,
                        waliKelasTeacherId: createdTeacherId,
                        waliKelasName: teacherName,
                      }
                    : c,
                ),
              );
            }
            results.push({
              name: teacherName,
              username: teacherUsername,
              password,
              role,
              category: "GURU",
              className: linkedClass?.name,
              status: "CREATED",
            });
          } catch (err: any) {
            results.push({
              name: teacherName,
              username: teacherUsername,
              role,
              category: "GURU",
              className: linkedClass?.name,
              status: "SKIPPED",
              error: err?.message,
            });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newPassword,
            });
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              password: newPassword,
              role: existing.role,
              category: "GURU",
              className: existing.classNames?.join(", ") || linkedClass?.name,
              status: "UPDATED",
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              role: existing.role,
              category: "GURU",
              status: "SKIPPED",
              error: err?.message,
            });
          }
        }
      }

      // 3. Data Siswa
      for (const student of students) {
        const studentName = student.nama.trim();
        const studentUsername = sanitizeUsername(student.nisn, "sis");
        const existing = users.find(
          (u) =>
            u.role === "SISWA" &&
            (u.studentId === student.id ||
              u.username.toLowerCase() === studentUsername.toLowerCase()),
        );

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            await apiUser("create", {
              name: studentName,
              username: studentUsername,
              password,
              role: "SISWA",
              studentId: student.id,
            });
            results.push({
              name: studentName,
              username: studentUsername,
              password,
              role: "SISWA",
              category: "SISWA",
              className: student.className,
              status: "CREATED",
            });
          } catch (err: any) {
            results.push({
              name: studentName,
              username: studentUsername,
              role: "SISWA",
              category: "SISWA",
              className: student.className,
              status: "SKIPPED",
              error: err?.message,
            });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newPassword,
            });
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              password: newPassword,
              role: "SISWA",
              category: "SISWA",
              className: student.className,
              status: "UPDATED",
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              role: "SISWA",
              category: "SISWA",
              status: "SKIPPED",
              error: err?.message,
            });
          }
        }
      }

      // Refresh users state dari assignment otoritatif:
      // Wali Kelas -> classes.wali_kelas_teacher_id
      // Guru Mapel -> subject_teacher_assignments + subject_class_assignments
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");
      if (allProfilesError) throw allProfilesError;
      const hydratedUsers = await Promise.all(
        (allProfiles || []).map((p: any) => hydrateUser(p)),
      );
      setUsers(hydratedUsers);

      const createdCount = results.filter((r) => r.status === "CREATED").length;
      const updatedCount = results.filter((r) => r.status === "UPDATED").length;
      if (createdCount > 0 || updatedCount > 0) {
        showToast(
          `Berhasil men-generate ${createdCount} akun baru dan mengacak ${updatedCount} password akun.`,
        );
      } else {
        showToast(
          "Semua data referensi (Guru & Siswa) sudah memiliki akun pengguna.",
          "info",
        );
      }
      return results;
    } catch (e: any) {
      showToast(e.message || "Gagal men-generate akun pengguna", "error");
      return results;
    }
  };

  const syncUsersWithStudents = async () => {
    await generateAccountsFromReferences({ resetExistingPasswords: false });
  };
  const updateUserPassword = async (id: string, p: string) => {
    try {
      await apiUser("password", { userId: id, password: p });
      showToast("Password akun berhasil diperbarui");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };
  const checkCalendarAdminAuth = (): boolean => {
    if (!currentUser) return false;
    return true;
  };
  const addAcademicEvent = async (e: Omit<AcademicEvent, "id">) => {
    if (!checkCalendarAdminAuth()) return;
    try {
      const { data, error } = await supabase
        .from("academic_events")
        .insert({
          date: e.date,
          date_display: e.dateDisplay,
          title: e.title,
          is_effective: e.isEffective,
          notes: e.notes || "",
          school_id: currentUser?.schoolId || null,
        })
        .select()
        .single();
      if (error) {
        const fallbackEvent: AcademicEvent = {
          id: "ev-" + Date.now(),
          date: e.date,
          dateDisplay: e.dateDisplay || e.date,
          title: e.title,
          isEffective: e.isEffective,
          notes: e.notes || "",
        };
        setAcademicEvents((p) => [...p, fallbackEvent]);
        showToast("Agenda akademik berhasil ditambahkan");
        return;
      }
      setAcademicEvents((p) => [...p, dbEvent(data)]);
      showToast("Agenda akademik berhasil ditambahkan");
    } catch (x: any) {
      const fallbackEvent: AcademicEvent = {
        id: "ev-" + Date.now(),
        date: e.date,
        dateDisplay: e.dateDisplay || e.date,
        title: e.title,
        isEffective: e.isEffective,
        notes: e.notes || "",
      };
      setAcademicEvents((p) => [...p, fallbackEvent]);
      showToast("Agenda akademik berhasil ditambahkan");
    }
  };
  const deleteAcademicEvent = async (id: string) => {
    if (!checkCalendarAdminAuth()) return;
    try {
      await supabase.from("academic_events").delete().eq("id", id);
    } catch (_) {}
    setAcademicEvents((p) => p.filter((e) => e.id !== id));
    showToast("Agenda akademik telah dihapus", "info");
  };
  const updateActiveStudyDays = async (days: number[]) => {
    if (!checkCalendarAdminAuth()) return;
    const c = { ...systemConfig, activeStudyDays: days };
    await updateSystemConfig(c);
  };
  const updateEffectiveDays = async (monthKey: string, days: number) => {
    if (!checkCalendarAdminAuth()) return;
    const { error } = await supabase
      .from("effective_days")
      .upsert(
        { school_id: currentUser?.schoolId || null, month_key: monthKey, days },
        { onConflict: "school_id,month_key" },
      );
    if (error) return showToast(error.message, "error");
    setEffectiveDaysConfig((p) => ({ ...p, [monthKey]: days }));
    showToast("Hari belajar efektif diperbarui");
  };
  const getBaseStudyDaysForMonth = (year: number, month: number) => {
    let c = 0,
      total = new Date(year, month, 0).getDate();
    for (let d = 1; d <= total; d++) {
      if (activeStudyDays.includes(new Date(year, month - 1, d).getDay())) c++;
    }
    return c;
  };
  const getEffectiveDaysForMonth = (year: number | string, month?: number) => {
    const key =
      typeof year === "string"
        ? year
        : `${year}-${String(month).padStart(2, "0")}`;
    const [y, m] = key.split("-").map(Number);
    const base = effectiveDaysConfig[key] ?? getBaseStudyDaysForMonth(y, m);
    const holidays = academicEvents
      .filter((e) => e.date.startsWith(key) && !e.isEffective)
      .filter((e) => {
        try {
          const [ey, em, ed] = e.date.split("-").map(Number);
          const day = new Date(ey, em - 1, ed).getDay();
          return activeStudyDays.includes(day);
        } catch {
          return false;
        }
      }).length;
    return Math.max(0, base - holidays);
  };
  const getDateStatus = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    const isStudyDay = activeStudyDays.includes(day);
    const ev = academicEvents.find((e) => e.date === date);
    if (ev && !ev.isEffective)
      return {
        isStudyDay,
        isHoliday: true,
        isEffective: false,
        label: `Libur: ${ev.title}`,
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        eventTitle: ev.title,
      };
    if (ev && ev.isEffective)
      return {
        isStudyDay: true,
        isHoliday: false,
        isEffective: true,
        label: `Agenda Efektif: ${ev.title}`,
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        eventTitle: ev.title,
      };
    if (!isStudyDay)
      return {
        isStudyDay: false,
        isHoliday: false,
        isEffective: false,
        label: "Libur Rutin (Bukan Hari Belajar)",
        badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
      };
    return {
      isStudyDay: true,
      isHoliday: false,
      isEffective: true,
      label: "Hari Efektif Belajar",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  };
  const reloadSubjects = async () => {
    const schoolId = currentUser?.schoolId;
    if (!schoolId) return;
    const [
      { data: rows },
      { data: assignments },
      { data: classAssignments },
      { data: schedules },
      { data: teacherRows },
      { data: classRows },
    ] = await Promise.all([
      supabase
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .order("name"),
      supabase
        .from("subject_teacher_assignments")
        .select("subject_id, teacher_id, academic_year")
        .eq("school_id", schoolId)
        .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027"),
      supabase
        .from("subject_class_assignments")
        .select("subject_id, class_id, academic_year")
        .eq("school_id", schoolId)
        .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027"),
      supabase
        .from("subject_schedule_days")
        .select("subject_id, day_of_week, lesson_period")
        .eq("school_id", schoolId),
      supabase.from("teachers").select("id,nama").eq("school_id", schoolId),
      supabase
        .from("classes")
        .select("id,name,academic_year")
        .eq("school_id", schoolId),
    ]);
    const teacherMap = new Map<string, any>(
      (teacherRows || []).map((t: any) => [t.id, t]),
    );
    const classMap = new Map<string, any>(
      (classRows || []).map((c: any) => [c.id, c]),
    );
    const teacherBySubject = new Map<string, string>();
    (assignments || []).forEach((r: any) =>
      teacherBySubject.set(r.subject_id, r.teacher_id),
    );
    const classesBySubject = new Map<string, string[]>();
    (classAssignments || []).forEach((r: any) => {
      const a = classesBySubject.get(r.subject_id) || [];
      a.push(r.class_id);
      classesBySubject.set(r.subject_id, a);
    });
    const schedulesBySubject = new Map<string, any[]>();
    (schedules || []).forEach((r: any) => {
      const a = schedulesBySubject.get(r.subject_id) || [];
      a.push(r);
      schedulesBySubject.set(r.subject_id, a);
    });
    setSubjects(
      (rows || []).map((row: any) =>
        dbSubject(
          {
            ...row,
            teacher_id: teacherBySubject.get(row.id) || null,
            _targetClassIds: classesBySubject.get(row.id) || [],
          },
          teacherMap,
          classMap,
          schedulesBySubject,
        ),
      ),
    );
  };

  const addSubject = async (s: Omit<Subject, "id">) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const { data, error } = await supabase
        .from("subjects")
        .insert({
          school_id: schoolId,
          name: s.name.trim(),
          code: (s.code || s.name.slice(0, 4)).toUpperCase().trim(),
          is_specialized: !!s.isSpecialized,
        })
        .select()
        .single();
      if (error) throw error;
      if (s.teacherId) {
        const year = schoolProfile.tahunPelajaran || "2026/2027";
        const { error: e } = await supabase.rpc("replace_subject_assignment", {
          p_school_id: schoolId,
          p_subject_id: data.id,
          p_teacher_id: s.teacherId,
          p_class_ids: s.targetClassIds || [],
          p_academic_year: year,
          p_actor_user_id: currentUser?.id || null,
        });
        if (e) throw e;
      } else if ((s.targetClassIds || []).length) {
        const rows = (s.targetClassIds || []).map((classId) => ({
          school_id: schoolId,
          subject_id: data.id,
          class_id: classId,
          academic_year:
            classes.find((c) => c.id === classId)?.academicYear ||
            schoolProfile.tahunPelajaran ||
            "2026/2027",
        }));
        const { error: e } = await supabase
          .from("subject_class_assignments")
          .insert(rows);
        if (e) throw e;
      }
      if ((s.scheduleDays || []).length) {
        const { error: e } = await supabase
          .from("subject_schedule_days")
          .insert(
            (s.scheduleDays || []).map((day) => ({
              school_id: schoolId,
              subject_id: data.id,
              day_of_week: day,
              lesson_period: s.lessonPeriod || null,
            })),
          );
        if (e) throw e;
      }
      await reloadSubjects();
      showToast("Mata pelajaran " + s.name + " berhasil ditambahkan!");
    } catch (e: any) {
      showToast(e.message || "Gagal menyimpan mata pelajaran.", "error");
    }
  };

  const updateSubject = async (id: string, s: Omit<Subject, "id">) => {
    try {
      const schoolId = currentUser?.schoolId;
      if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");
      const { error } = await supabase
        .from("subjects")
        .update({
          name: s.name.trim(),
          code: (s.code || s.name.slice(0, 4)).toUpperCase().trim(),
          is_specialized: !!s.isSpecialized,
        })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      const year = schoolProfile.tahunPelajaran || "2026/2027";
      const { error: scheduleDeleteError } = await supabase
        .from("subject_schedule_days")
        .delete()
        .eq("subject_id", id)
        .eq("school_id", schoolId);
      if (scheduleDeleteError) throw scheduleDeleteError;
      const { data: currentAssignment } = await supabase
        .from("subject_teacher_assignments")
        .select("teacher_id")
        .eq("subject_id", id)
        .eq("school_id", schoolId)
        .eq("academic_year", year)
        .maybeSingle();
      if (currentAssignment?.teacher_id) {
        const { error: e } = await supabase.rpc("replace_subject_assignment", {
          p_school_id: schoolId,
          p_subject_id: id,
          p_teacher_id: s.teacherId || currentAssignment.teacher_id,
          p_class_ids: s.targetClassIds || [],
          p_academic_year: year,
          p_actor_user_id: currentUser?.id || null,
        });
        if (e) throw e;
      } else {
        const { error: delAssignmentError } = await supabase
          .from("subject_class_assignments")
          .delete()
          .eq("subject_id", id)
          .eq("school_id", schoolId)
          .eq("academic_year", year);
        if (delAssignmentError) throw delAssignmentError;
        if (s.teacherId) {
          const { error: e } = await supabase.rpc(
            "replace_subject_assignment",
            {
              p_school_id: schoolId,
              p_subject_id: id,
              p_teacher_id: s.teacherId,
              p_class_ids: s.targetClassIds || [],
              p_academic_year: year,
              p_actor_user_id: currentUser?.id || null,
            },
          );
          if (e) throw e;
        } else if ((s.targetClassIds || []).length) {
          const rows = (s.targetClassIds || []).map((classId) => ({
            school_id: schoolId,
            subject_id: id,
            class_id: classId,
            academic_year:
              classes.find((c) => c.id === classId)?.academicYear || year,
          }));
          const { error: e } = await supabase
            .from("subject_class_assignments")
            .insert(rows);
          if (e) throw e;
        }
      }
      if ((s.scheduleDays || []).length) {
        const { error: e } = await supabase
          .from("subject_schedule_days")
          .insert(
            (s.scheduleDays || []).map((day) => ({
              school_id: schoolId,
              subject_id: id,
              day_of_week: day,
              lesson_period: s.lessonPeriod || null,
            })),
          );
        if (e) throw e;
      }
      await reloadSubjects();
      showToast("Mata pelajaran " + s.name + " berhasil diperbarui");
    } catch (e: any) {
      showToast(e.message || "Gagal memperbarui mata pelajaran.", "error");
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id)
        .eq("school_id", currentUser?.schoolId || "");
      if (error) throw error;
      setSubjects((p) => p.filter((s) => s.id !== id));
      showToast("Mata pelajaran berhasil dihapus", "info");
    } catch (e: any) {
      showToast(e.message || "Gagal menghapus mata pelajaran.", "error");
    }
  };
  const getAttendanceForDate = (
    date: string,
    options?: {
      type?: AttendanceType;
      subjectId?: string | null;
      classId?: string | null;
    },
  ): AttendanceRecord[] => {
    const targetType: AttendanceType = options?.type || "DAILY";
    const targetSubjectId = options?.subjectId || null;
    const targetClassId = options?.classId || null;
    const targetStudents = targetClassId
      ? students.filter((s) => s.classId === targetClassId)
      : students;
    const sortedStudents = [...targetStudents].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
    const dailyRecordsMap = new Map<string, AttendanceRecord>(
      attendanceRecords
        .filter((a) => a.date === date && (!a.type || a.type === "DAILY"))
        .map((a) => [a.studentId, a]),
    );
    const specificRecordsMap = new Map<string, AttendanceRecord>(
      attendanceRecords
        .filter((a) => {
          if (a.date !== date) return false;
          if (targetType === "SUBJECT") {
            return a.type === "SUBJECT" && a.subjectId === targetSubjectId;
          }
          return !a.type || a.type === "DAILY";
        })
        .map((a) => [a.studentId, a]),
    );
    return sortedStudents.map((s) => {
      const existing = specificRecordsMap.get(s.id);
      if (existing) return existing;
      if (targetType === "SUBJECT") {
        const dailyRec = dailyRecordsMap.get(s.id);
        const isPermitOrSick =
          dailyRec?.status === "Sakit" || dailyRec?.status === "Izin";
        const inheritedStatus = isPermitOrSick
          ? dailyRec.status
          : ("" as AttendanceStatus);
        const inheritedNotes = isPermitOrSick
          ? "(Sinkron Wali Kelas: " + dailyRec.status + ")"
          : "";
        return {
          id:
            "att-subj-" + date + "-" + (targetSubjectId || "gen") + "-" + s.id,
          date,
          studentId: s.id,
          studentName: s.nama,
          status: inheritedStatus,
          checkInTime: isPermitOrSick ? dailyRec?.checkInTime || "" : "",
          checkOutTime: isPermitOrSick ? dailyRec?.checkOutTime || "" : "",
          notes: inheritedNotes,
          type: "SUBJECT" as AttendanceType,
          subjectId: targetSubjectId,
          classId: targetClassId || s.classId || null,
        };
      }
      return {
        id: "att-" + date + "-" + s.id,
        date,
        studentId: s.id,
        studentName: s.nama,
        status: "" as AttendanceStatus,
        checkInTime: "",
        checkOutTime: "",
        notes: "",
        type: "DAILY" as AttendanceType,
        classId: targetClassId || s.classId || null,
      };
    });
  };
  // Resolve the teacher identity strictly from database IDs.
  // Names and updated_by are never used as the source of truth.
  const resolveAttendanceTeacherId = async (
    type: AttendanceType,
    classId: string | null,
    subjectId: string | null,
  ): Promise<string | null> => {
    const schoolId = currentUser?.schoolId || null;
    if (!schoolId || !classId) return null;

    if (type === "DAILY") {
      const { data, error } = await supabase
        .from("classes")
        .select("wali_kelas_teacher_id")
        .eq("id", classId)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (error) throw error;
      return data?.wali_kelas_teacher_id || null;
    }

    if (!subjectId || !currentUser?.teacherId) return null;

    const { data: classAssignment, error: classError } = await supabase
      .from("subject_class_assignments")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027")
      .maybeSingle();
    if (classError) throw classError;
    if (!classAssignment) return null;

    const { data: teacherAssignment, error: teacherError } = await supabase
      .from("subject_teacher_assignments")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .eq("subject_id", subjectId)
      .eq("teacher_id", currentUser.teacherId)
      .eq("academic_year", schoolProfile.tahunPelajaran || "2026/2027")
      .maybeSingle();
    if (teacherError) throw teacherError;
    return teacherAssignment?.teacher_id || null;
  };

  const saveDailyAttendance = async (
    date: string,
    records: AttendanceRecord[],
    options?: {
      type?: AttendanceType;
      subjectId?: string | null;
      subjectName?: string | null;
      classId?: string | null;
    },
  ) => {
    try {
      const dateStatus = getDateStatus(date);
      if (!dateStatus.isEffective) {
        showToast(
          `Presensi tanggal ${date} dikunci karena ${dateStatus.label}`,
          "error",
        );
        return;
      }
      const targetType: AttendanceType =
        options?.type || records[0]?.type || "DAILY";
      const targetSubjectId =
        options?.subjectId ?? records[0]?.subjectId ?? null;
      const targetSubjectName =
        options?.subjectName ?? records[0]?.subjectName ?? null;
      const targetClassId = options?.classId ?? records[0]?.classId ?? null;
      const targetTeacherId = await resolveAttendanceTeacherId(
        targetType,
        targetClassId,
        targetSubjectId,
      );
      if (!targetTeacherId) {
        throw new Error(
          targetType === "DAILY"
            ? "Guru wali kelas untuk kelas ini belum terhubung melalui ID guru."
            : "Guru mapel tidak memiliki assignment ID yang valid untuk kelas dan mapel ini.",
        );
      }

      const targetStudentIds = records.map((r) => r.studentId).filter(Boolean);

      // Always delete existing records for the targeted students on this date & mode
      if (targetStudentIds.length > 0) {
        let del = supabase
          .from("attendance_records")
          .delete()
          .eq("date", date)
          .eq("type", targetType)
          .in("student_id", targetStudentIds);

        if (currentUser?.schoolId) {
          del = del.eq("school_id", currentUser.schoolId);
        }
        if (targetType === "SUBJECT" && targetSubjectId) {
          del = del.eq("subject_id", targetSubjectId);
        }
        const { error: delError } = await del;
        if (delError) throw delError;
      }

      const payload = records
        .filter((r) => r.status && r.status !== "-")
        .map((r) => ({
          school_id: currentUser?.schoolId || null,
          date,
          student_id: r.studentId,
          class_id:
            r.classId ||
            students.find((s) => s.id === r.studentId)?.classId ||
            null,
          type: targetType,
          subject_id: targetSubjectId || null,
          teacher_id: targetTeacherId,
          status: r.status,
          check_in_time:
            r.checkInTime && r.checkInTime !== "-" ? r.checkInTime : null,
          check_out_time:
            r.checkOutTime && r.checkOutTime !== "-" ? r.checkOutTime : null,
          notes: r.notes || null,
          updated_by: currentUser?.id || null,
        }));

      if (payload.length > 0) {
        const { error: insertError } = await supabase
          .from("attendance_records")
          .insert(payload);
        if (insertError) throw insertError;
      }

      const activeRecords: AttendanceRecord[] = records
        .filter((r) => Boolean(r.status && r.status !== "-"))
        .map((r) => ({
          ...r,
          type: targetType,
          subjectId: targetSubjectId,
          subjectName: targetSubjectName,
          classId: targetClassId || r.classId,
          teacherId: targetTeacherId,
          teacherName: currentUser?.name,
        }));

      const targetStudentIdSet = new Set(targetStudentIds);

      setAttendanceRecords((prev) => {
        const filtered = prev.filter((r) => {
          if (r.date !== date) return true;
          if (targetType === "SUBJECT") {
            return !(
              r.type === "SUBJECT" &&
              r.subjectId === targetSubjectId &&
              targetStudentIdSet.has(r.studentId)
            );
          }
          return !(
            (!r.type || r.type === "DAILY") &&
            targetStudentIdSet.has(r.studentId)
          );
        });
        return [...filtered, ...activeRecords];
      });

      const modeLabel =
        targetType === "SUBJECT"
          ? "Mata Pelajaran " + (targetSubjectName || "")
          : "Harian (Wali Kelas)";
      if (payload.length === 0) {
        showToast(
          "Data absensi " +
            modeLabel +
            " tanggal " +
            date +
            " berhasil di-reset!",
          "info",
        );
      } else {
        showToast(
          "Data absensi " +
            modeLabel +
            " tanggal " +
            date +
            " berhasil disimpan!",
          "success",
        );
      }
    } catch (e: any) {
      showToast(e.message || "Gagal memproses data absensi", "error");
    }
  };
  const submitStudentAttendance = async (
    studentId: string,
    type: "masuk" | "pulang" | "izin" | "sakit",
    notes?: string,
    customDate?: string,
  ) => {
    try {
      if (!currentUser || currentUser.role !== "SISWA") {
        return {
          success: false,
          message: "Hanya akun SISWA yang dapat menggunakan presensi mandiri.",
        };
      }
      if (studentId !== currentUser.studentId) {
        return {
          success: false,
          message: "Akses presensi tidak valid untuk akun ini.",
        };
      }
      const target = customDate || currentAttendanceDate;
      const dateStatus = getDateStatus(target);
      if (!dateStatus.isEffective) {
        const msg = `Presensi tanggal ${target} dikunci karena ${dateStatus.label}`;
        showToast(msg, "error");
        return { success: false, message: msg };
      }
      if (!systemConfig.studentSelfAttendanceEnabled) {
        const msg =
          "Presensi mandiri siswa sedang dinonaktifkan oleh pihak sekolah.";
        showToast(msg, "error");
        return { success: false, message: msg };
      }

      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentMinutes = currentH * 60 + currentM;
      const currentTimeStr = `${String(currentH).padStart(2, "0")}:${String(currentM).padStart(2, "0")}`;

      let finalNotes = notes || "";

      // Enforce Jam Buka Presensi Masuk & Batas Masuk Tepat Waktu
      if (type === "masuk") {
        if (systemConfig.checkInStartTime) {
          const [startH, startM] = systemConfig.checkInStartTime
            .split(":")
            .map(Number);
          const startMinutes = (startH || 0) * 60 + (startM || 0);
          if (currentMinutes < startMinutes) {
            const msg = `Presensi masuk belum dibuka. Jam buka presensi masuk: ${systemConfig.checkInStartTime} WIB.`;
            showToast(msg, "error");
            return { success: false, message: msg };
          }
        }

        if (systemConfig.checkInDeadlineTime) {
          const [dlH, dlM] = systemConfig.checkInDeadlineTime
            .split(":")
            .map(Number);
          const deadlineMinutes = (dlH || 7) * 60 + (dlM || 0);
          if (
            currentMinutes > deadlineMinutes &&
            systemConfig.autoMarkLate !== false
          ) {
            finalNotes = finalNotes ? `${finalNotes} (Terlambat)` : "Terlambat";
          }
        }
      }

      // Enforce Jam Buka Presensi Pulang
      if (type === "pulang") {
        if (systemConfig.checkOutStartTime) {
          const [outH, outM] = systemConfig.checkOutStartTime
            .split(":")
            .map(Number);
          const outMinutes = (outH || 12) * 60 + (outM || 30);
          if (currentMinutes < outMinutes) {
            const msg = `Presensi pulang belum dibuka. Jam buka presensi pulang: ${systemConfig.checkOutStartTime} WIB.`;
            showToast(msg, "error");
            return { success: false, message: msg };
          }
        }
      }

      // Attempt RPC first, with robust fallback to direct table operation if RPC fails
      let mappedResult: AttendanceRecord | null = null;
      try {
        const { data, error } = await supabase.rpc(
          "submit_student_attendance",
          {
            p_student_id: studentId,
            p_action: type,
            p_notes: finalNotes || null,
            p_target_date: target,
          },
        );
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) {
          mappedResult = dbAttendance(row, students);
        }
      } catch (rpcErr) {
        // Fallback: direct table operation
        const existingRecord = attendanceRecords.find(
          (r) =>
            r.date === target &&
            r.studentId === studentId &&
            (!r.type || r.type === "DAILY"),
        );
        const studentObj = students.find((s) => s.id === studentId);
        const selfTeacherId = await resolveAttendanceTeacherId(
          "DAILY",
          studentObj?.classId || null,
          null,
        );
        if (!selfTeacherId) {
          throw new Error(
            "Guru wali kelas siswa belum terhubung melalui ID guru.",
          );
        }

        const updatePayload: any = {
          school_id: currentUser.schoolId || null,
          student_id: studentId,
          class_id: studentObj?.classId || null,
          date: target,
          type: "DAILY",
          teacher_id: selfTeacherId,
          updated_by: currentUser.id,
        };

        if (type === "masuk") {
          updatePayload.status = "Hadir";
          updatePayload.check_in_time = currentTimeStr;
          updatePayload.notes = finalNotes || null;
        } else if (type === "pulang") {
          updatePayload.check_out_time = currentTimeStr;
        } else if (type === "izin") {
          updatePayload.status = "Izin";
          updatePayload.notes = notes || "Izin";
        } else if (type === "sakit") {
          updatePayload.status = "Sakit";
          updatePayload.notes = notes || "Sakit";
        }

        if (existingRecord?.id) {
          const { data: upData, error: upErr } = await supabase
            .from("attendance_records")
            .update(updatePayload)
            .eq("id", existingRecord.id)
            .select()
            .single();
          if (upErr) throw upErr;
          mappedResult = dbAttendance(upData, students);
        } else {
          const { data: inData, error: inErr } = await supabase
            .from("attendance_records")
            .insert(updatePayload)
            .select()
            .single();
          if (inErr) throw inErr;
          mappedResult = dbAttendance(inData, students);
        }
      }

      if (mappedResult) {
        setAttendanceRecords((p) => [
          ...p.filter(
            (r) =>
              r.id !== mappedResult!.id &&
              !(
                r.date === mappedResult!.date &&
                r.studentId === mappedResult!.studentId &&
                (!r.type || r.type === "DAILY")
              ),
          ),
          mappedResult,
        ]);
      }

      const isLateArrival =
        type === "masuk" && finalNotes.includes("Terlambat");
      const label =
        type === "izin" || type === "sakit"
          ? `Pengajuan ${type.toUpperCase()} berhasil dikirim ke Wali Kelas`
          : type === "masuk"
            ? isLateArrival
              ? `Presensi Masuk berhasil dicatat (Terlambat - Pukul ${currentTimeStr} WIB)`
              : `Presensi Masuk berhasil dicatat pukul ${currentTimeStr} WIB`
            : `Presensi Pulang berhasil dicatat pukul ${currentTimeStr} WIB`;

      showToast(
        label,
        type === "izin" || type === "sakit"
          ? "info"
          : isLateArrival
            ? "info"
            : "success",
      );
      return { success: true, message: "Berhasil" };
    } catch (e: any) {
      const message = e?.message || "Presensi gagal diproses.";
      showToast(message, "error");
      return { success: false, message };
    }
  };
  const resetAllDataToProductionReady = async () => {
    showToast(
      "Reset data demo tidak digunakan pada versi Supabase. Gunakan SQL Editor untuk reset database secara sengaja.",
      "info",
    );
  };
  const changeOwnPassword = async (
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!newPassword || newPassword.length < 8)
        return { success: false, message: "Password minimal 8 karakter." };
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw authError;
      const { error: rpcError } = await supabase.rpc("mark_password_changed");
      if (rpcError) throw rpcError;
      setCurrentUser((p) => (p ? { ...p, mustChangePassword: false } : p));
      showToast("Password berhasil diganti.");
      return { success: true, message: "Berhasil" };
    } catch (e: any) {
      const message = e?.message || "Gagal mengganti password.";
      showToast(message, "error");
      return { success: false, message };
    }
  };
  return (
    <AppContext.Provider
      value={{
        isAuthChecking,
        isDataLoading,
        logout,
        classes,
        addClass,
        updateClass,
        deleteClass,
        assignTeacherClasses,
        importClasses,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        importTeachers,
        executeTeacherAssignment,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        currentUser,
        setCurrentUser,
        registrationRequired,
        setRegistrationRequired,
        passwordRecovery,
        setPasswordRecovery,
        activeView,
        setActiveView,
        userWorkspaces,
        activeWorkspace,
        isOnboarding,
        setIsOnboarding,
        isSelectingWorkspace,
        setIsSelectingWorkspace,
        isJoinSchoolModalOpen,
        setIsJoinSchoolModalOpen,
        selectWorkspace,
        switchToSchoolWorkspace,
        switchToPersonalWorkspace,
        openOnboarding,
        returnToWorkspaceSelector,
        loadUserDataAfterOnboarding,
        loadData,
        schoolProfile,
        updateSchoolProfile,
        systemConfig,
        updateSystemConfig,
        students,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudentsByClass,
        importStudents,
        users,
        addUser,
        deleteUser,
        updateUser,
        syncUsersWithStudents,
        generateAccountsFromReferences,
        updateUserPassword,
        academicEvents,
        addAcademicEvent,
        deleteAcademicEvent,
        activeStudyDays,
        updateActiveStudyDays,
        effectiveDaysConfig,
        updateEffectiveDays,
        getBaseStudyDaysForMonth,
        getEffectiveDaysForMonth,
        getDateStatus,
        attendanceRecords,
        currentAttendanceDate,
        setCurrentAttendanceDate,
        saveDailyAttendance,
        getAttendanceForDate,
        submitStudentAttendance,
        changeOwnPassword,
        resetAllDataToProductionReady,
        toasts,
        showToast,
        removeToast,
        impersonateSchool,
        stopImpersonation,
        globalAnnouncement,
        updateGlobalAnnouncement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used within an AppProvider");
  return c;
};
