import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, usernameToEmail } from "../lib/supabase";
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  Subject,
  SubjectClassSchedule,
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
import { normalizeTeacherName, normalizeNip } from "../utils/userScope";

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
  isSwitchingWorkspace: boolean;
  switchingWorkspaceProgress: number;
  switchingWorkspaceTitle: string;
  switchingWorkspaceMessage: string;
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
    passwordMode?: "standard" | "random" | "custom";
    customPassword?: string;
  }) => Promise<GeneratedAccountResult[]>;
  resetUserToDefaultPassword: (user: UserAccount) => Promise<string>;
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
  reconcileSchoolData: (showFeedback?: boolean) => Promise<{ success: boolean; message: string }>;
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
    nip: p.nip || null,
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
    assignedClassIds: p.assigned_class_ids || p.assignedClassIds || [],
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
  const tugas = t.tugas_utama || t.tugasUtama || t._resolved_role || "Belum ditugaskan";
  return {
    id: t.id,
    nama: t.nama || "",
    nip: t.nip || "",
    jenisKelamin: t.jenis_kelamin || t.jenisKelamin || "L",
    tugasUtama: tugas,
    tugas_utama: tugas,
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

  const classDaysMap = new Map<string, Set<string>>();
  const generalDaysSet = new Set<string>();
  let customLessonPeriod = "";

  scheduleRows.forEach((r: any) => {
    const day = r.day_of_week;
    const lp = r.lesson_period || "";
    if (day) {
      if (lp.startsWith("cls:")) {
        const classId = lp.replace(/^cls:/, "").trim();
        if (classId) {
          if (!classDaysMap.has(classId)) {
            classDaysMap.set(classId, new Set());
          }
          classDaysMap.get(classId)!.add(day);
        }
      } else {
        generalDaysSet.add(day);
        if (lp) customLessonPeriod = lp;
      }
    }
  });

  const classSchedules: SubjectClassSchedule[] = [];
  targetClassIds.forEach((cid: string) => {
    const clsName = classMap?.get(cid)?.name || "";
    if (classDaysMap.has(cid)) {
      classSchedules.push({
        classId: cid,
        className: clsName,
        days: Array.from(classDaysMap.get(cid)!),
      });
    } else if (generalDaysSet.size > 0) {
      classSchedules.push({
        classId: cid,
        className: clsName,
        days: Array.from(generalDaysSet),
      });
    } else {
      classSchedules.push({
        classId: cid,
        className: clsName,
        days: [],
      });
    }
  });

  const allUniqueDays = new Set<string>([...generalDaysSet]);
  classSchedules.forEach((cs) => cs.days.forEach((d) => allUniqueDays.add(d)));

  return {
    id: x.id,
    name: x.name,
    code: x.code || undefined,
    isSpecialized: !!x.is_specialized,
    teacherId: x.teacher_id || null,
    teacherName: teacher?.nama || null,
    targetClassIds,
    targetClassNames,
    scheduleDays: Array.from(allUniqueDays),
    classSchedules,
    lessonPeriod: customLessonPeriod,
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
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] =
    useState<boolean>(false);
  const [switchingWorkspaceProgress, setSwitchingWorkspaceProgress] =
    useState<number>(0);
  const [switchingWorkspaceTitle, setSwitchingWorkspaceTitle] =
    useState<string>("");
  const [switchingWorkspaceMessage, setSwitchingWorkspaceMessage] =
    useState<string>("");

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
    // Invalidate any in-flight data loading requests
    loadRequestRef.current++;

    try {
      clearSessionTimers();
      localStorage.removeItem(CACHE_USER_SESSION_KEY);
      localStorage.removeItem(CACHE_LAST_VIEW_KEY);
      localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
      localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
      localStorage.removeItem("kawacanaan_last_workspace_id");
      
      // Clean all user-specific and sb- token keys from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("kawacanaan_last_workspace_id_") || key.startsWith("sb-") || key.includes("supabase.auth.token"))) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {}

    // Eksekusi Supabase Auth signOut() resmi dan tunggu hingga selesai
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[logout] supabase.auth.signOut error:", err);
    }

    // Verifikasi resmi bahwa Supabase session benar-benar sudah null / tidak tersedia
    try {
      const { data: verifySession } = await supabase.auth.getSession();
      if (verifySession?.session) {
        console.warn("[logout] Session still active after signOut, forcing cleanup...");
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase.auth.token"))) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (_) {}

    // Reset seluruh state aplikasi ke null dan default
    setCurrentUser(null);
    setUserWorkspaces([]);
    setActiveWorkspace(null);
    setIsOnboarding(false);
    setIsSelectingWorkspace(false);
    setIsAuthChecking(false);
    setRegistrationRequired(false);
    setPasswordRecovery(false);
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

    let baseTeachers = (teacherRows.data || []).map(dbTeacher);
    let rawClasses = classRows.data || [];
    let rawStudents = stu.data || [];

    // Authoritative service synchronization: ensures Wali Kelas and Guru Mapel get full Admin data and linked NIP/classes
    let masterJson: any = null;
    if (schoolId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || "";
        const masterRes = await fetch("/api/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: "get_school_master_data",
            school_id: schoolId,
            user_id: baseProfile?.id,
          }),
        });
        const mJson = await masterRes.json();
        if (mJson?.ok) {
          masterJson = mJson;
          if (Array.isArray(mJson.teachers) && (baseTeachers.length === 0 || mJson.teachers.length >= baseTeachers.length)) {
            baseTeachers = mJson.teachers.map(dbTeacher);
          }
          if (Array.isArray(mJson.classes) && (rawClasses.length === 0 || mJson.classes.length >= rawClasses.length)) {
            rawClasses = mJson.classes;
          }
          if (Array.isArray(mJson.students) && (rawStudents.length === 0 || mJson.students.length >= rawStudents.length)) {
            rawStudents = mJson.students;
          }
        }
      } catch (_) {}
    }

    setTeachers(baseTeachers);

    const classList = rawClasses.map((c: any) => {
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
    const ss = rawStudents.map((x: any) =>
      dbStudent({ ...x, class_name: x.classes?.name || x.class_name || "" }),
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

    let cachedPasswordMap: Record<string, string> = {};
    try {
      const rawPw = localStorage.getItem(`kawacanaan_account_passwords_${schoolId}`);
      if (rawPw) cachedPasswordMap = JSON.parse(rawPw);
    } catch (_) {}

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

      const cachedPwd = cachedPasswordMap[u.id] || (u.username ? cachedPasswordMap[u.username.toLowerCase()] : undefined);

      return {
        ...u,
        password: u.password || cachedPwd || undefined,
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

    // Reconcile and link teacher record to current user
    let myMatchedTeacher = baseTeachers.find((t) => t.id === me.teacherId);
    if (!myMatchedTeacher && masterJson?.matchedTeacher) {
      myMatchedTeacher = dbTeacher(masterJson.matchedTeacher);
    }
    if (!myMatchedTeacher) {
      const uNip = normalizeNip(me.nip) || normalizeNip(me.username);
      if (uNip && uNip.length >= 8) {
        myMatchedTeacher = baseTeachers.find((t) => normalizeNip(t.nip) === uNip);
      }
    }
    if (!myMatchedTeacher && me.name) {
      const cleanMeName = normalizeTeacherName(me.name);
      myMatchedTeacher = baseTeachers.find((t) => {
        const cleanTName = normalizeTeacherName(t.nama);
        return cleanTName === cleanMeName || (cleanMeName.length >= 4 && (cleanTName.includes(cleanMeName) || cleanMeName.includes(cleanTName)));
      });
    }

    if (myMatchedTeacher) {
      me.teacherId = myMatchedTeacher.id;
      if (myMatchedTeacher.nip && (!me.nip || me.nip === "-")) {
        me.nip = myMatchedTeacher.nip;
      }
    }

    if (me.role === "WALI KELAS") {
      const cleanMeName = normalizeTeacherName(me.name);
      const cleanTName = myMatchedTeacher ? normalizeTeacherName(myMatchedTeacher.nama) : "";
      let myWaliClasses = classList.filter(
        (c: any) =>
          (me.teacherId && c.waliKelasTeacherId === me.teacherId) ||
          (cleanTName && c.waliKelasName && normalizeTeacherName(c.waliKelasName) === cleanTName) ||
          (cleanMeName && c.waliKelasName && normalizeTeacherName(c.waliKelasName) === cleanMeName),
      );
      if (myWaliClasses.length === 0 && school.data?.kelas) {
        const spClass = classList.find((c: any) => normalizeTeacherName(c.name) === normalizeTeacherName(school.data.kelas));
        if (spClass) myWaliClasses = [spClass];
      }
      if (myWaliClasses.length === 0 && Array.isArray(masterJson?.resolvedClassIds) && masterJson.resolvedClassIds.length > 0) {
        myWaliClasses = classList.filter((c: any) => masterJson.resolvedClassIds.includes(c.id));
      }
      me.classIds = myWaliClasses.map((c: any) => c.id);
      me.classNames = myWaliClasses.map((c: any) => c.name);
    } else if (me.role === "GURU MAPEL") {
      const targetClassIds = new Set<string>(me.classIds || []);
      if (Array.isArray(masterJson?.resolvedClassIds) && masterJson.resolvedClassIds.length > 0) {
        masterJson.resolvedClassIds.forEach((cid: string) => targetClassIds.add(cid));
      }
      if (myMatchedTeacher) {
        const assignedSubIds = subjectTeacherScope.get(myMatchedTeacher.id) || [];
        assignedSubIds.forEach((sId) => {
          (subjectClassScope.get(sId) || []).forEach((cId) => targetClassIds.add(cId));
        });
      }
      me.classIds = Array.from(targetClassIds);
      me.classNames = me.classIds.map((cid: string) => classList.find((c: any) => c.id === cid)?.name || "").filter(Boolean);
    }

    setCurrentUser(me);
    try {
      localStorage.setItem(CACHE_USER_SESSION_KEY, JSON.stringify(me));
    } catch (_) {}
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
    const isPersonal =
      ws.workspaceType === "personal" || ws.workspaceType === "individu";
    const targetTitle = isPersonal
      ? "Ruang Kerja Individu"
      : ws.workspaceName || "Ruang Kerja Sekolah";

    setIsSwitchingWorkspace(true);
    setSwitchingWorkspaceProgress(25);
    setSwitchingWorkspaceTitle(`Beralih ke ${targetTitle}...`);
    setSwitchingWorkspaceMessage(
      "Menyiapkan otorisasi profil dan konfigurasi ruang kerja...",
    );

    try {
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

      setSwitchingWorkspaceProgress(60);
      setSwitchingWorkspaceMessage(
        "Memuat data rombel, profil pendidik, dan kalender presensi...",
      );

      const { data: baseProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", ws.userId)
        .maybeSingle();
      if (baseProfile) {
        await loadDataForSchool(ws.workspaceId, baseProfile, ws.role);
      }

      setSwitchingWorkspaceProgress(90);
      setSwitchingWorkspaceMessage("Menyelesaikan persiapan ruang kerja...");

      const saved = getSavedActiveView();
      const targetView = resolveInitialViewForRole(ws.role, saved);
      setActiveView(targetView);

      setSwitchingWorkspaceProgress(100);
      setSwitchingWorkspaceMessage("Ruang kerja siap digunakan!");
      await new Promise((res) => setTimeout(res, 300));
    } catch (err: any) {
      showToast(err?.message || "Gagal mengalihkan ruang kerja.", "error");
    } finally {
      setIsSwitchingWorkspace(false);
      setSwitchingWorkspaceProgress(0);
      setSwitchingWorkspaceTitle("");
      setSwitchingWorkspaceMessage("");
    }
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

    setIsSwitchingWorkspace(true);
    setSwitchingWorkspaceProgress(15);
    setSwitchingWorkspaceTitle("Beralih ke Ruang Kerja Sekolah...");
    setSwitchingWorkspaceMessage("Memeriksa keanggotaan ruang kerja sekolah...");

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
    } catch (err: any) {
      showToast(
        err?.message || "Gagal beralih ke ruang kerja sekolah.",
        "error",
      );
    } finally {
      setIsSwitchingWorkspace(false);
      setSwitchingWorkspaceProgress(0);
      setSwitchingWorkspaceTitle("");
      setSwitchingWorkspaceMessage("");
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

    setIsSwitchingWorkspace(true);
    setSwitchingWorkspaceProgress(15);
    setSwitchingWorkspaceTitle("Beralih ke Ruang Kerja Individu...");
    setSwitchingWorkspaceMessage(
      "Memeriksa keanggotaan ruang kerja mandiri pendidik...",
    );

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

      const personalWs = currentMemberships.find(
        (ws) =>
          ws.workspaceType === "personal" || ws.workspaceType === "individu",
      );

      if (personalWs) {
        await selectWorkspace(personalWs);
        showToast("Beralih ke Ruang Kerja Individu.", "success");
      } else {
        setSwitchingWorkspaceProgress(40);
        setSwitchingWorkspaceMessage("Membuat ruang kerja individu baru...");
        const resCreate = await fetch("/api/onboarding", {
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
        const jsonCreate = await resCreate.json();
        if (jsonCreate.success && jsonCreate.workspace) {
          const updated = [...currentMemberships, jsonCreate.workspace];
          setUserWorkspaces(updated);
          await selectWorkspace(jsonCreate.workspace);
          showToast("Ruang Kerja Individu baru berhasil dibuka.", "success");
        } else {
          showToast(
            jsonCreate.error || "Gagal membuka ruang kerja individu baru.",
            "error",
          );
        }
      }
    } catch (err: any) {
      showToast(
        err?.message || "Gagal membuat ruang kerja individu.",
        "error",
      );
    } finally {
      setIsSwitchingWorkspace(false);
      setSwitchingWorkspaceProgress(0);
      setSwitchingWorkspaceTitle("");
      setSwitchingWorkspaceMessage("");
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
  const ensureTeacherCanBeWaliKelas = async (teacherId: string, academicYear: string) => {
    const schoolId = currentUser?.schoolId || null;
    if (!schoolId) throw new Error("Sekolah aktif tidak ditemukan.");

    // Aturan utama: assignment Guru Mapel pada tahun ajaran aktif
    // membuat guru tidak boleh sekaligus menjadi Wali Kelas.
    const { data: mapelAssignments, error: mapelError } = await supabase
      .from("subject_teacher_assignments")
      .select("subject_id")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("academic_year", academicYear)
      .limit(1);
    if (mapelError) throw mapelError;

    if ((mapelAssignments || []).length > 0) {
      throw new Error(
        "Guru tersebut sudah memiliki assignment Guru Mapel pada tahun ajaran " +
          academicYear +
          " sehingga tidak dapat ditetapkan sebagai Wali Kelas.",
      );
    }
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
        await ensureTeacherCanBeWaliKelas(c.waliKelasTeacherId, academicYear);

        // Satu guru hanya boleh menjadi Wali Kelas untuk satu rombel
        // pada tahun ajaran yang sama. Jangan otomatis memindahkan kelas lama.
        const existingHomeroom = classes.find(
          (existing) =>
            existing.waliKelasTeacherId === c.waliKelasTeacherId &&
            existing.id !== undefined &&
            (!existing.academicYear || existing.academicYear === academicYear),
        );
        if (existingHomeroom) {
          throw new Error(
            `Guru ini sudah menjadi Wali Kelas di "${existingHomeroom.name}" untuk tahun ajaran ${academicYear}.`,
          );
        }
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
          await ensureTeacherCanBeWaliKelas(c.waliKelasTeacherId, academicYear);

          const existingHomeroom = classes.find(
            (existing) =>
              existing.id !== id &&
              existing.waliKelasTeacherId === c.waliKelasTeacherId &&
              (!existing.academicYear || existing.academicYear === academicYear),
          );
          if (existingHomeroom) {
            throw new Error(
              `Guru ini sudah menjadi Wali Kelas di "${existingHomeroom.name}" untuk tahun ajaran ${academicYear}.`,
            );
          }
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
      await loadData(currentUser?.id);
      showToast("Kelas berhasil dihapus.", "success");
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
    const rawTugas = (t.tugasUtama || t.tugas_utama || "").trim();
    const finalTugasUtama =
      rawTugas === "Wali Kelas"
        ? "Wali Kelas"
        : rawTugas === "Guru Mapel"
          ? "Guru Mapel"
          : rawTugas || "Belum ditugaskan";

    const { data, error } = await supabase
      .from("teachers")
      .insert({
        school_id: schoolId,
        nama: t.nama.trim(),
        nip: t.nip || null,
        jenis_kelamin: t.jenisKelamin || "L",
        tugas_utama: finalTugasUtama,
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
    const rawTugas = (t.tugasUtama || t.tugas_utama || "").trim();
    const finalTugasUtama =
      rawTugas === "Wali Kelas"
        ? "Wali Kelas"
        : rawTugas === "Guru Mapel"
          ? "Guru Mapel"
          : rawTugas || "Belum ditugaskan";

    const { data, error } = await supabase
      .from("teachers")
      .update({
        nama: t.nama.trim(),
        nip: t.nip || null,
        jenis_kelamin: t.jenisKelamin || "L",
        tugas_utama: finalTugasUtama,
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

    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from("teachers")
        .delete()
        .eq("school_id", schoolId);
      if (deleteError) throw deleteError;
    }

    for (const t of items) {
      const row = {
        school_id: schoolId,
        nama: t.nama.trim(),
        nip: t.nip && t.nip.trim() !== "-" ? t.nip.trim() : null,
        jenis_kelamin: t.jenisKelamin || "L",
        tugas_utama: t.tugasUtama || t.tugas_utama || "Belum ditugaskan",
      };

      if (row.nip && !replaceExisting) {
        const { data: existing, error: lookupError } = await supabase
          .from("teachers")
          .select("id")
          .eq("school_id", schoolId)
          .eq("nip", row.nip)
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existing) {
          const { error: updateError } = await supabase
            .from("teachers")
            .update({
              nama: row.nama,
              jenis_kelamin: row.jenis_kelamin,
              tugas_utama: row.tugas_utama,
            })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          continue;
        }
      }

      const { error: insertError } = await supabase.from("teachers").insert(row);
      if (insertError) throw insertError;
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
    try {
      if (!id) throw new Error("ID siswa tidak valid.");
      const { error } = await supabase.rpc("delete_student_by_id", {
        p_student_id: id,
      });
      if (error) throw error;
      await loadData(currentUser?.id);
      showToast("Data siswa berhasil dihapus.", "success");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus siswa.", "error");
      throw e;
    }
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
      if (!id) throw new Error("ID guru tidak valid.");
      const { error } = await supabase.rpc("delete_teacher", {
        p_teacher_id: id,
      });
      if (error) throw error;
      await loadData(currentUser?.id);
      showToast("Data guru berhasil dihapus.", "success");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus guru.", "error");
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
        .select("id,school_id,nama,tugas_utama")
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
        const targetSubjectIds = (mapelRows || []).map((r: any) => r.subject_id);
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
            tugas_utama: "Wali Kelas",
              })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  tugasUtama: "Wali Kelas",
                  tugas_utama: "Wali Kelas",
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
            tugas_utama: "Guru Mapel",
          })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  tugasUtama: "Guru Mapel",
                  tugas_utama: "Guru Mapel",
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
            tugas_utama: "Belum ditugaskan",
              })
          .eq("id", teacherId)
          .eq("school_id", schoolId);

        // Update state lokal teachers secara instan
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  tugasUtama: "Belum ditugaskan",
                  tugas_utama: "Belum ditugaskan",
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
    passwordMode?: "random" | "standard" | "custom";
    customPassword?: string;
  }): Promise<GeneratedAccountResult[]> => {
    const resetExisting = !!options?.resetExistingPasswords;
    const results: GeneratedAccountResult[] = [];
    const passwordMap = new Map<string, string>(); // username/id -> password
    const schoolId = currentUser?.schoolId || activeWorkspace?.workspaceId;
    if (!schoolId) {
      showToast("ID Sekolah tidak valid.", "error");
      return results;
    }

    const createAccountPassword = (): string => {
      return generateRandomPassword(8);
    };

    try {
      // 0. Ambil data referensi & penugasan peran (assignment_role) terbaru langsung dari database untuk school_id yang sama
      const [
        teachersRes,
        classesRes,
        subjectsRes,
        subjectTeacherScopeRes,
        subjectClassScopeRes,
        studentsRes,
        schoolProfileRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from("teachers").select("*").eq("school_id", schoolId).order("nama"),
        supabase.from("classes").select("*, wali:wali_kelas_teacher_id(id,nama,nip)").eq("school_id", schoolId).order("grade").order("name"),
        supabase.from("subjects").select("*").eq("school_id", schoolId),
        supabase.from("subject_teacher_assignments").select("subject_id,teacher_id,academic_year").eq("school_id", schoolId),
        supabase.from("subject_class_assignments").select("subject_id,class_id,academic_year").eq("school_id", schoolId),
        supabase.from("students").select("*, classes:class_id(id,name,grade,academic_year)").eq("school_id", schoolId).order("nama"),
        supabase.from("school_profile").select("*").eq("school_id", schoolId).maybeSingle(),
        supabase.from("profiles").select("*").eq("school_id", schoolId),
      ]);

      const dbTeachers = (teachersRes.data && teachersRes.data.length > 0) ? teachersRes.data.map(dbTeacher) : teachers;
      const dbClasses: SchoolClass[] = (classesRes.data && classesRes.data.length > 0)
        ? classesRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
            academicYear: c.academic_year,
            waliKelasTeacherId: c.wali_kelas_teacher_id || null,
            waliKelasName: c.wali?.nama || null,
          }))
        : classes;
      const dbSubjects: Subject[] = (subjectsRes.data && subjectsRes.data.length > 0)
        ? subjectsRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            teacherId: s.teacher_id,
            teacherName: s.teacher_name,
            targetClassIds: s.target_class_ids || [],
          }))
        : subjects;
      const dbStudents: Student[] = (studentsRes.data && studentsRes.data.length > 0)
        ? studentsRes.data.map((x: any) => dbStudent({ ...x, class_name: x.classes?.name || "" }))
        : students;
      const dbProfiles = profilesRes.data || [];

      const activeAcademicYear = String(
        schoolProfileRes.data?.tahun_pelajaran ||
        schoolProfile.tahunPelajaran ||
        "2026/2027"
      ).trim() || "2026/2027";

      // Pemetaan assignment Guru Mapel dari subject_teacher_assignments & subject_class_assignments
      const teacherSubjectScope = new Map<string, string[]>();
      const subjectClassScope = new Map<string, string[]>();

      (subjectTeacherScopeRes.data || [])
        .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
        .forEach((a: any) => {
          const ids = teacherSubjectScope.get(a.teacher_id) || [];
          if (!ids.includes(a.subject_id)) ids.push(a.subject_id);
          teacherSubjectScope.set(a.teacher_id, ids);
        });

      (subjectClassScopeRes.data || [])
        .filter((a: any) => !a.academic_year || a.academic_year === activeAcademicYear)
        .forEach((a: any) => {
          const ids = subjectClassScope.get(a.subject_id) || [];
          if (!ids.includes(a.class_id)) ids.push(a.class_id);
          subjectClassScope.set(a.subject_id, ids);
        });

      // 1. Data Kepala Sekolah
      const ksName = (schoolProfileRes.data?.nama_kepala_sekolah || schoolProfile.namaKepalaSekolah || "").trim();
      const ksNip = (schoolProfileRes.data?.nip_kepala_sekolah || schoolProfile.nipKepalaSekolah || "").trim();

      if (ksName) {
        const ksUsername = sanitizeUsername(ksNip || ksName, "ks");
        const existing = dbProfiles.find(
          (u: any) =>
            u.role === "KEPALA SEKOLAH" ||
            (u.username && u.username.toLowerCase() === ksUsername.toLowerCase())
        );

        if (!existing) {
          const newKsPassword = createAccountPassword();
          try {
            const res = await apiUser("create", {
              name: ksName,
              username: ksUsername,
              password: newKsPassword,
              role: "KEPALA SEKOLAH",
            });
            const ksUserId = res?.userId || "";
            if (ksUserId) passwordMap.set(ksUserId, newKsPassword);
            passwordMap.set(ksUsername.toLowerCase(), newKsPassword);
            results.push({
              id: ksUserId,
              name: ksName,
              username: ksUsername,
              password: newKsPassword,
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
        } else if (resetExisting || !passwordMap.has(existing.id)) {
          const newKsPassword = createAccountPassword();
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newKsPassword,
            });
            passwordMap.set(existing.id, newKsPassword);
            if (existing.username) passwordMap.set(existing.username.toLowerCase(), newKsPassword);
            results.push({
              id: existing.id,
              name: existing.name || ksName,
              username: existing.username || ksUsername,
              password: newKsPassword,
              role: existing.role || "KEPALA SEKOLAH",
              category: "KEPALA SEKOLAH",
              status: "UPDATED",
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name || ksName,
              username: existing.username || ksUsername,
              role: existing.role || "KEPALA SEKOLAH",
              category: "KEPALA SEKOLAH",
              status: "SKIPPED",
              error: err?.message,
            });
          }
        } else {
          const existingPwd = passwordMap.get(existing.id) || passwordMap.get((existing.username || "").toLowerCase()) || createAccountPassword();
          passwordMap.set(existing.id, existingPwd);
          if (existing.username) passwordMap.set(existing.username.toLowerCase(), existingPwd);
          results.push({
            id: existing.id,
            name: existing.name || ksName,
            username: existing.username || ksUsername,
            password: existingPwd,
            role: existing.role || "KEPALA SEKOLAH",
            category: "KEPALA SEKOLAH",
            status: "ACTIVE" as any,
          });
        }
      }

      // 2. Data Guru & Tenaga Kependidikan (diambil dari seluruh master data guru sekolah)
      for (const teacher of dbTeachers) {
        const teacherName = (teacher.nama || "").trim();
        const teacherUsername = sanitizeUsername(
          teacher.nip && teacher.nip !== "-" ? teacher.nip : teacher.nama,
          "guru",
        );

        // Cari akun profil yang sudah ada berdasarkan teacher_id, username, atau nama guru
        const existing = dbProfiles.find(
          (u: any) =>
            (u.teacher_id && u.teacher_id === teacher.id) ||
            (u.username && u.username.toLowerCase() === teacherUsername.toLowerCase()) ||
            (u.name && u.name.trim().toLowerCase() === teacherName.toLowerCase() &&
              (u.role === "WALI KELAS" || u.role === "GURU MAPEL" || u.role === "ADMIN")),
        );

        // Cari assignment Wali Kelas di database classes
        const linkedHomeroom = dbClasses.find(
          (c) =>
            c.waliKelasTeacherId === teacher.id ||
            (c.waliKelasName &&
              c.waliKelasName.trim().toLowerCase() === teacherName.toLowerCase()),
        );

        // Cari assignment Guru Mapel dari tabel penugasan database
        const assignedSubjectIds = teacherSubjectScope.get(teacher.id) || [];
        const directSubjects = dbSubjects.filter(
          (s) =>
            s.teacherId === teacher.id ||
            (s.teacherName && s.teacherName.trim().toLowerCase() === teacherName.toLowerCase()),
        );
        const combinedSubjectIds = Array.from(
          new Set([...assignedSubjectIds, ...directSubjects.map((s) => s.id)]),
        );
        const teacherSubjects = combinedSubjectIds
          .map((sid) => dbSubjects.find((s) => s.id === sid))
          .filter(Boolean) as Subject[];

        const isWali = !!linkedHomeroom || teacher.tugasUtama === "Wali Kelas" || (teacher as any).tugas_utama === "Wali Kelas";
        const isMapel = teacherSubjects.length > 0 || teacher.tugasUtama === "Guru Mapel" || (teacher as any).tugas_utama === "Guru Mapel";

        let role: UserRole = "GURU MAPEL";
        if (isWali && !isMapel) {
          role = "WALI KELAS";
        } else if (isMapel && !isWali) {
          role = "GURU MAPEL";
        } else if (isWali && isMapel) {
          role = (teacher.tugasUtama === "Wali Kelas" || (teacher as any).tugas_utama === "Wali Kelas") ? "WALI KELAS" : "GURU MAPEL";
        } else {
          role = (teacher.tugasUtama === "Wali Kelas" || (teacher as any).tugas_utama === "Wali Kelas") ? "WALI KELAS" : "GURU MAPEL";
        }

        let classIds: string[] = [];
        let assignmentDescription = "";

        if (role === "WALI KELAS") {
          if (linkedHomeroom) {
            classIds = [linkedHomeroom.id];
            assignmentDescription = `Wali Kelas ${linkedHomeroom.name}`;
          } else {
            assignmentDescription = "Wali Kelas";
          }
        } else if (role === "GURU MAPEL") {
          const mapelNames = teacherSubjects.map((s) => s.name).join(", ") || teacher.tugasUtama || (teacher as any).tugas_utama || "Guru Mapel";
          const targetClassIds: string[] = Array.from(
            new Set(
              teacherSubjects.flatMap((s) => {
                const fromScope = subjectClassScope.get(s.id) || [];
                const fromDirect = (s.targetClassIds || []) as string[];
                return [...fromScope, ...fromDirect];
              }),
            ),
          );
          classIds = targetClassIds;
          const targetClassNames = targetClassIds
            .map((cid) => dbClasses.find((c) => c.id === cid)?.name || "")
            .filter(Boolean);
          const classSuffix = targetClassNames.length > 0 ? ` (${targetClassNames.join(", ")})` : "";
          assignmentDescription = `${mapelNames}${classSuffix}`;
        } else {
          assignmentDescription = teacher.tugasUtama || (teacher as any).tugas_utama || "Tenaga Pendidik";
        }

        if (!existing) {
          const newTeacherPassword = createAccountPassword();
          let accountCreated = false;
          let teacherUserId = "";

          try {
            const res = await apiUser("create", {
              name: teacherName,
              username: teacherUsername,
              password: newTeacherPassword,
              role,
              classIds,
              subjectId: teacherSubjects[0]?.id || null,
              subjectName: teacherSubjects[0]?.name || null,
              teacherId: teacher.id,
            });
            teacherUserId = res?.userId || "";
            accountCreated = true;
            if (teacherUserId) passwordMap.set(teacherUserId, newTeacherPassword);
            passwordMap.set(teacherUsername.toLowerCase(), newTeacherPassword);
            const createdTeacherId = res?.teacherId || teacher.id;
            if (createdTeacherId && linkedHomeroom && role === "WALI KELAS") {
              await supabase
                .from("classes")
                .update({ wali_kelas_teacher_id: createdTeacherId })
                .eq("id", linkedHomeroom.id);
            }
          } catch (createErr: any) {
            // Jika gagal membuat baru karena profil ternyata sudah ada di DB, coba reset password akun yang ada
            try {
              const { data: fallbackProfile } = await supabase
                .from("profiles")
                .select("id,username,name,role")
                .eq("school_id", schoolId)
                .or(`username.ilike.${teacherUsername},name.ilike.${teacherName}`)
                .maybeSingle();

              if (fallbackProfile) {
                await apiUser("password", {
                  userId: fallbackProfile.id,
                  password: newTeacherPassword,
                });
                await apiUser("update", {
                  userId: fallbackProfile.id,
                  name: teacherName,
                  username: fallbackProfile.username || teacherUsername,
                  role,
                  classIds,
                  subjectId: teacherSubjects[0]?.id || null,
                  teacherId: teacher.id,
                }).catch(() => {});
                teacherUserId = fallbackProfile.id;
                accountCreated = true;
                passwordMap.set(fallbackProfile.id, newTeacherPassword);
                if (fallbackProfile.username) passwordMap.set(fallbackProfile.username.toLowerCase(), newTeacherPassword);
              }
            } catch (_) {}
          }

          if (accountCreated) {
            results.push({
              id: teacherUserId,
              name: teacherName,
              username: teacherUsername,
              password: newTeacherPassword,
              role,
              category: "GURU",
              className: assignmentDescription,
              status: "CREATED",
            });
          } else {
            results.push({
              name: teacherName,
              username: teacherUsername,
              password: newTeacherPassword,
              role,
              category: "GURU",
              className: assignmentDescription,
              status: "CREATED",
            });
          }
        } else if (resetExisting || !passwordMap.has(existing.id)) {
          const newTeacherPassword = createAccountPassword();
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newTeacherPassword,
            });
            await apiUser("update", {
              userId: existing.id,
              name: teacherName,
              username: existing.username,
              role,
              classIds,
              subjectId: teacherSubjects[0]?.id || null,
              teacherId: teacher.id,
            }).catch(() => {});
            passwordMap.set(existing.id, newTeacherPassword);
            if (existing.username) passwordMap.set(existing.username.toLowerCase(), newTeacherPassword);
            results.push({
              id: existing.id,
              name: existing.name || teacherName,
              username: existing.username,
              password: newTeacherPassword,
              role: role || existing.role,
              category: "GURU",
              className: assignmentDescription,
              status: "UPDATED",
            });
          } catch (err: any) {
            passwordMap.set(existing.id, newTeacherPassword);
            if (existing.username) passwordMap.set(existing.username.toLowerCase(), newTeacherPassword);
            results.push({
              id: existing.id,
              name: existing.name || teacherName,
              username: existing.username,
              password: newTeacherPassword,
              role: role || existing.role,
              category: "GURU",
              className: assignmentDescription,
              status: "UPDATED",
            });
          }
        } else {
          // Sinkronkan penugasan kelas dan role jika berubah di database
          await apiUser("update", {
            userId: existing.id,
            name: teacherName,
            username: existing.username,
            role,
            classIds,
            subjectId: teacherSubjects[0]?.id || null,
            teacherId: teacher.id,
          }).catch(() => {});
          const existingPwd = passwordMap.get(existing.id) || passwordMap.get((existing.username || "").toLowerCase()) || createAccountPassword();
          passwordMap.set(existing.id, existingPwd);
          if (existing.username) passwordMap.set(existing.username.toLowerCase(), existingPwd);
          results.push({
            id: existing.id,
            name: existing.name || teacherName,
            username: existing.username,
            password: existingPwd,
            role: role || existing.role,
            category: "GURU",
            className: assignmentDescription,
            status: "ACTIVE" as any,
          });
        }
      }

      // 3. Data Siswa (diambil dari database students dengan school_id yang sama)
      for (const student of dbStudents) {
        const studentName = (student.nama || "").trim();
        const studentUsername = sanitizeUsername(student.nisn || student.nama, "sis");
        const studentClass = dbClasses.find(
          (c) => c.id === student.classId || c.id === (student as any).class_id,
        );
        const studentClassName = studentClass?.name || student.className || "-";

        const existing = dbProfiles.find(
          (u: any) =>
            u.role === "SISWA" &&
            ((u.student_id && u.student_id === student.id) ||
              (u.username && u.username.toLowerCase() === studentUsername.toLowerCase())),
        );

        if (!existing) {
          const newStudentPassword = createAccountPassword();
          let studentCreated = false;
          let studentUserId = "";

          try {
            const res = await apiUser("create", {
              name: studentName,
              username: studentUsername,
              password: newStudentPassword,
              role: "SISWA",
              studentId: student.id,
            });
            studentUserId = res?.userId || "";
            studentCreated = true;
            if (studentUserId) passwordMap.set(studentUserId, newStudentPassword);
            passwordMap.set(studentUsername.toLowerCase(), newStudentPassword);
          } catch (createErr: any) {
            try {
              const { data: fallbackStudentProfile } = await supabase
                .from("profiles")
                .select("id,username,name,role,student_id")
                .eq("school_id", schoolId)
                .or(`username.ilike.${studentUsername},student_id.eq.${student.id}`)
                .maybeSingle();

              if (fallbackStudentProfile) {
                await apiUser("password", {
                  userId: fallbackStudentProfile.id,
                  password: newStudentPassword,
                });
                await apiUser("update", {
                  userId: fallbackStudentProfile.id,
                  name: studentName,
                  username: fallbackStudentProfile.username || studentUsername,
                  role: "SISWA",
                  studentId: student.id,
                }).catch(() => {});
                studentUserId = fallbackStudentProfile.id;
                studentCreated = true;
                passwordMap.set(fallbackStudentProfile.id, newStudentPassword);
                if (fallbackStudentProfile.username) passwordMap.set(fallbackStudentProfile.username.toLowerCase(), newStudentPassword);
              }
            } catch (_) {}
          }

          if (studentCreated) {
            results.push({
              id: studentUserId,
              name: studentName,
              username: studentUsername,
              password: newStudentPassword,
              role: "SISWA",
              category: "SISWA",
              className: studentClassName,
              status: "CREATED",
            });
          } else {
            results.push({
              name: studentName,
              username: studentUsername,
              password: newStudentPassword,
              role: "SISWA",
              category: "SISWA",
              className: studentClassName,
              status: "CREATED",
            });
          }
        } else if (resetExisting || !passwordMap.has(existing.id)) {
          const newStudentPassword = createAccountPassword();
          try {
            await apiUser("password", {
              userId: existing.id,
              password: newStudentPassword,
            });
            await apiUser("update", {
              userId: existing.id,
              name: studentName,
              username: existing.username,
              role: "SISWA",
              studentId: student.id,
            }).catch(() => {});
            passwordMap.set(existing.id, newStudentPassword);
            if (existing.username) passwordMap.set(existing.username.toLowerCase(), newStudentPassword);
            results.push({
              id: existing.id,
              name: existing.name || studentName,
              username: existing.username,
              password: newStudentPassword,
              role: "SISWA",
              category: "SISWA",
              className: studentClassName,
              status: "UPDATED",
            });
          } catch (err: any) {
            passwordMap.set(existing.id, newStudentPassword);
            if (existing.username) passwordMap.set(existing.username.toLowerCase(), newStudentPassword);
            results.push({
              id: existing.id,
              name: existing.name || studentName,
              username: existing.username,
              password: newStudentPassword,
              role: "SISWA",
              category: "SISWA",
              className: studentClassName,
              status: "UPDATED",
            });
          }
        } else {
          // Sinkronkan student_id jika belum terhubung
          if (!existing.student_id && student.id) {
            await apiUser("update", {
              userId: existing.id,
              name: studentName,
              username: existing.username,
              role: "SISWA",
              studentId: student.id,
            }).catch(() => {});
          }
          const existingPwd = passwordMap.get(existing.id) || passwordMap.get((existing.username || "").toLowerCase()) || createAccountPassword();
          passwordMap.set(existing.id, existingPwd);
          if (existing.username) passwordMap.set(existing.username.toLowerCase(), existingPwd);
          results.push({
            id: existing.id,
            name: existing.name || studentName,
            username: existing.username,
            password: existingPwd,
            role: "SISWA",
            category: "SISWA",
            className: studentClassName,
            status: "ACTIVE" as any,
          });
        }
      }

      // Persist all generated passwords into localStorage for this school
      if (passwordMap.size > 0 && schoolId) {
        try {
          const existingRaw = localStorage.getItem(`kawacanaan_account_passwords_${schoolId}`);
          const mergedMap = existingRaw ? { ...JSON.parse(existingRaw) } : {};
          passwordMap.forEach((val, key) => {
            mergedMap[key] = val;
          });
          localStorage.setItem(`kawacanaan_account_passwords_${schoolId}`, JSON.stringify(mergedMap));
        } catch (_) {}
      }

      // Refresh seluruh state aplikasi dari database secara menyeluruh
      if (schoolId && currentUser) {
        await loadDataForSchool(schoolId, currentUser, currentUser.role);
      } else {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("*")
          .eq("school_id", schoolId)
          .order("name");
        if (allProfiles) {
          const hydratedUsers = await Promise.all(
            allProfiles.map((p: any) => hydrateUser(p)),
          );
          setUsers(hydratedUsers);
        }
      }

      // Terapkan password acak baru ke state users lokal agar langsung tampil di UI tabel
      if (passwordMap.size > 0) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            const pwd =
              passwordMap.get(u.id) ||
              (u.username ? passwordMap.get(u.username.toLowerCase()) : undefined) ||
              u.password;
            return pwd ? { ...u, password: pwd } : u;
          }),
        );
      }

      const createdCount = results.filter((r) => r.status === "CREATED").length;
      const updatedCount = results.filter((r) => r.status === "UPDATED").length;
      if (createdCount > 0 || updatedCount > 0) {
        showToast(
          `Berhasil memproses ${results.length} akun (${createdCount} baru dibuat, ${updatedCount} password diacak ulang).`,
          "success",
        );
      } else {
        showToast(
          "Semua data referensi (Guru & Siswa) telah tersinkron dengan akun database.",
          "info",
        );
      }
      return results;
    } catch (e: any) {
      showToast(e.message || "Gagal men-generate akun pengguna", "error");
      return results;
    }
  };

  const resetUserToDefaultPassword = async (user: UserAccount): Promise<string> => {
    const newRandomPass = generateRandomPassword(8);
    await updateUserPassword(user.id, newRandomPass);
    const schoolId = currentUser?.schoolId || activeWorkspace?.workspaceId;
    if (schoolId) {
      try {
        const existingRaw = localStorage.getItem(`kawacanaan_account_passwords_${schoolId}`);
        const mergedMap = existingRaw ? { ...JSON.parse(existingRaw) } : {};
        mergedMap[user.id] = newRandomPass;
        if (user.username) mergedMap[user.username.toLowerCase()] = newRandomPass;
        localStorage.setItem(`kawacanaan_account_passwords_${schoolId}`, JSON.stringify(mergedMap));
      } catch (_) {}
    }
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === user.id ? { ...u, password: newRandomPass } : u)),
    );
    return newRandomPass;
  };

  const syncUsersWithStudents = async () => {
    await generateAccountsFromReferences({ resetExistingPasswords: false });
  };

  const reconcileSchoolData = async (showFeedback = true): Promise<{ success: boolean; message: string }> => {
    try {
      const activeSchoolId = currentUser?.schoolId || activeWorkspace?.workspaceId;
      if (!activeSchoolId) {
        throw new Error("ID sekolah tidak ditemukan.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "get_school_master_data",
          school_id: activeSchoolId,
          user_id: currentUser?.id,
        }),
      });

      const json = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || "Gagal menyinkronkan data master sekolah.");
      }

      let updatedTeachers = teachers;
      if (Array.isArray(json.teachers) && json.teachers.length > 0) {
        updatedTeachers = json.teachers.map(dbTeacher);
        setTeachers(updatedTeachers);
      }

      let updatedClasses = classes;
      if (Array.isArray(json.classes) && json.classes.length > 0) {
        updatedClasses = json.classes.map((c: any) => {
          const assignedTeacherId = c.wali_kelas_teacher_id || null;
          const matchedTeacher = updatedTeachers.find((t) => t.id === assignedTeacherId);
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
        setClasses(updatedClasses);
      }

      if (Array.isArray(json.students) && json.students.length > 0) {
        const updatedStudents = json.students.map((s: any) =>
          dbStudent({ ...s, class_name: s.classes?.name || s.class_name || "" }),
        );
        setStudents(updatedStudents);
      }

      if (currentUser) {
        const matchedTeacher = json.matchedTeacher ? dbTeacher(json.matchedTeacher) : null;
        const resolvedClassIds: string[] = Array.isArray(json.resolvedClassIds) ? json.resolvedClassIds : [];

        const updatedUser: UserAccount = {
          ...currentUser,
          ...(matchedTeacher ? {
            teacherId: matchedTeacher.id,
            nip: matchedTeacher.nip || currentUser.nip,
            name: currentUser.name || matchedTeacher.nama,
          } : {}),
          classIds: resolvedClassIds.length > 0 ? resolvedClassIds : currentUser.classIds,
          classNames: resolvedClassIds.length > 0
            ? resolvedClassIds.map((cid) => updatedClasses.find((c) => c.id === cid)?.name || "").filter(Boolean)
            : currentUser.classNames,
        };

        setCurrentUser(updatedUser);
        try {
          localStorage.setItem(CACHE_USER_SESSION_KEY, JSON.stringify(updatedUser));
        } catch (_) {}
      }

      if (showFeedback) {
        showToast("Integrasi data referensi dengan Admin Sekolah berhasil diperbarui!", "success");
      }
      return { success: true, message: "Sinkronisasi berhasil" };
    } catch (err: any) {
      if (showFeedback) {
        showToast(err?.message || "Gagal menyinkronkan data.", "error");
      }
      return { success: false, message: err?.message || "Gagal menyinkronkan data" };
    }
  };
  const updateUserPassword = async (id: string, p: string) => {
    try {
      await apiUser("password", { userId: id, password: p });
      const schoolId = currentUser?.schoolId || activeWorkspace?.workspaceId;
      if (schoolId) {
        try {
          const existingRaw = localStorage.getItem(`kawacanaan_account_passwords_${schoolId}`);
          const mergedMap = existingRaw ? { ...JSON.parse(existingRaw) } : {};
          mergedMap[id] = p;
          const matched = users.find((u) => u.id === id);
          if (matched?.username) mergedMap[matched.username.toLowerCase()] = p;
          localStorage.setItem(`kawacanaan_account_passwords_${schoolId}`, JSON.stringify(mergedMap));
        } catch (_) {}
      }
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === id ? { ...u, password: p } : u)),
      );
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
      const scheduleInserts: {
        school_id: string;
        subject_id: string;
        day_of_week: string;
        lesson_period: string | null;
      }[] = [];

      if (s.classSchedules && s.classSchedules.length > 0) {
        s.classSchedules.forEach((cs) => {
          (cs.days || []).forEach((day) => {
            scheduleInserts.push({
              school_id: schoolId,
              subject_id: data.id,
              day_of_week: day,
              lesson_period: `cls:${cs.classId}`,
            });
          });
        });
      } else if ((s.scheduleDays || []).length) {
        (s.scheduleDays || []).forEach((day) => {
          scheduleInserts.push({
            school_id: schoolId,
            subject_id: data.id,
            day_of_week: day,
            lesson_period: s.lessonPeriod || null,
          });
        });
      }

      if (scheduleInserts.length > 0) {
        const { error: e } = await supabase
          .from("subject_schedule_days")
          .insert(scheduleInserts);
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
      const updateScheduleInserts: {
        school_id: string;
        subject_id: string;
        day_of_week: string;
        lesson_period: string | null;
      }[] = [];

      if (s.classSchedules && s.classSchedules.length > 0) {
        s.classSchedules.forEach((cs) => {
          (cs.days || []).forEach((day) => {
            updateScheduleInserts.push({
              school_id: schoolId,
              subject_id: id,
              day_of_week: day,
              lesson_period: `cls:${cs.classId}`,
            });
          });
        });
      } else if ((s.scheduleDays || []).length) {
        (s.scheduleDays || []).forEach((day) => {
          updateScheduleInserts.push({
            school_id: schoolId,
            subject_id: id,
            day_of_week: day,
            lesson_period: s.lessonPeriod || null,
          });
        });
      }

      if (updateScheduleInserts.length > 0) {
        const { error: e } = await supabase
          .from("subject_schedule_days")
          .insert(updateScheduleInserts);
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
      // Akun WALI KELAS lama dapat memiliki teacher_id NULL karena akun
      // dibuat sebelum provisioning guru diperbaiki. Sinkronkan sekali melalui
      // endpoint server yang memakai service_role dan melakukan validasi role,
      // sekolah, NIP/nama, serta status tugas utama.
      let teacherId = currentUser?.teacherId || null;
      if (currentUser?.role === "WALI KELAS" && !teacherId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || "";
        if (token) {
          const response = await fetch("/api/sync-wali-kelas", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          const body = await response.json().catch(() => ({}));
          if (response.ok && body.teacherId) {
            teacherId = String(body.teacherId);
            setCurrentUser((u) => u ? { ...u, teacherId } : u);
          }
        }
      }

      const { data, error } = await supabase
        .from("classes")
        .select("id, wali_kelas_teacher_id, academic_year")
        .eq("id", classId)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (data.wali_kelas_teacher_id) {
        // Untuk WALI KELAS, identitas akun dan identitas wali pada kelas
        // wajib menunjuk teacher_id yang sama. Jangan hanya mempercayai ID
        // kelas ketika profile akun belum tersinkron.
        if (currentUser?.role === "WALI KELAS" && (!teacherId || data.wali_kelas_teacher_id !== teacherId)) return null;
        return data.wali_kelas_teacher_id;
      }

      if (!teacherId || currentUser?.role !== "WALI KELAS") return null;

      // Kelas tanpa ID wali dapat dipulihkan secara atomic oleh RPC. RPC hanya
      // menerima teacher_id yang sudah terhubung ke auth.uid().
      const { data: repairedId, error: repairError } = await supabase.rpc(
        "repair_wali_kelas_class_link",
        {
          p_school_id: schoolId,
          p_class_id: classId,
          p_teacher_id: teacherId,
        },
      );
      if (!repairError && repairedId) return repairedId as string;

      return null;
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
        isSwitchingWorkspace,
        switchingWorkspaceProgress,
        switchingWorkspaceTitle,
        switchingWorkspaceMessage,
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
        resetUserToDefaultPassword,
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
        reconcileSchoolData,
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
