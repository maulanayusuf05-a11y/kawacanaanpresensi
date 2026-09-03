import { UserAccount, SchoolClass, Subject, Teacher } from '../types';

export function normalizeTeacherName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(dr|dra|drs|h|hj|prof|ir)\b\.?/gi, '')
    .replace(/,\s*(s\.pd|m\.pd|s\.pd\.i|m\.pd\.i|s\.ag|m\.ag|s\.si|m\.si|s\.kom|m\.kom|s\.e|m\.m|gr|b\.a|m\.a)\.?/gi, '')
    .replace(/\b(s\.pd|m\.pd|s\.pd\.i|m\.pd\.i|s\.ag|m\.ag|s\.si|m\.si|s\.kom|m\.kom|s\.e|m\.m|gr)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

export function normalizeNip(nip: string | null | undefined): string {
  if (!nip) return '';
  return nip.replace(/\D/g, '').trim();
}

export interface UserRoleScope {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isKepalaSekolah: boolean;
  isWaliKelas: boolean;
  isGuruMapel: boolean;
  isSiswa: boolean;

  currentTeacher: Teacher | null;

  assignedWaliClass: SchoolClass | null;
  assignedWaliClassId: string | null;
  assignedWaliClassName: string | null;

  assignedSubjects: Subject[];
  assignedSubjectIds: string[];
  primarySubject: Subject | null;

  accessibleClasses: SchoolClass[];
  accessibleClassIds: string[];

  roleBadgeLabel: string;
  scopeDescription: string;
}

/**
 * Resolves the UI scope from authoritative identity/assignment fields.
 *
 * SECURITY NOTE:
 * This function is intentionally fail-closed. It is only a UX filter;
 * Supabase RLS remains the actual security boundary.
 *
 * Never infer authorization from display names, the first class, or a
 * "specialized" subject fallback. Missing assignment means no access.
 */
export function getUserRoleScope(
  currentUser: UserAccount | null | undefined,
  classes: SchoolClass[],
  subjects: Subject[],
  teachers: Teacher[] = []
): UserRoleScope {
  const empty = (overrides: Partial<UserRoleScope> = {}): UserRoleScope => ({
    isSuperAdmin: false,
    isAdmin: false,
    isKepalaSekolah: false,
    isWaliKelas: false,
    isGuruMapel: false,
    isSiswa: false,
    currentTeacher: null,
    assignedWaliClass: null,
    assignedWaliClassId: null,
    assignedWaliClassName: null,
    assignedSubjects: [],
    assignedSubjectIds: [],
    primarySubject: null,
    accessibleClasses: [],
    accessibleClassIds: [],
    roleBadgeLabel: 'Pengguna',
    scopeDescription: '',
    ...overrides,
  });

  if (!currentUser) return empty();

  const role = currentUser.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isKepalaSekolah = role === 'KEPALA SEKOLAH';
  const isSiswa = role === 'SISWA';

  // Prefer explicit teacher identity, with fallback to NIP / Name matching with normalization
  const currentTeacherId = currentUser.teacherId || null;
  const cleanUserName = normalizeTeacherName(currentUser.name);
  const userNip = normalizeNip(currentUser.nip);
  const usernameNip = /^\d{8,}$/.test(currentUser.username || '') ? normalizeNip(currentUser.username) : '';

  const currentTeacher = currentTeacherId
    ? teachers.find((teacher) => teacher.id === currentTeacherId) || null
    : teachers.find((teacher) => {
        const teacherNip = normalizeNip(teacher.nip);
        if (userNip && teacherNip && userNip === teacherNip) return true;
        if (usernameNip && teacherNip && usernameNip === teacherNip) return true;
        if (cleanUserName && teacher.nama) {
          const cleanTName = normalizeTeacherName(teacher.nama);
          if (cleanTName === cleanUserName) return true;
          if (cleanUserName.length >= 4 && (cleanTName.includes(cleanUserName) || cleanUserName.includes(cleanTName))) return true;
        }
        return false;
      }) || null;

  const effectiveTeacherId = currentTeacherId || currentTeacher?.id || null;
  const cleanTeacherName = currentTeacher?.nama ? normalizeTeacherName(currentTeacher.nama) : '';

  // Authoritative role resolution for teachers:
  // In Supabase DB: "For teacher assignment scope, classes and subject_*_assignments are authoritative."
  const hasAuthoritativeWaliClass = !!classes.find((schoolClass) => {
    if (effectiveTeacherId && schoolClass.waliKelasTeacherId === effectiveTeacherId) return true;
    if (currentUser.classIds?.includes(schoolClass.id)) return true;
    if (schoolClass.waliKelasName) {
      const cleanWaliName = normalizeTeacherName(schoolClass.waliKelasName);
      if (cleanTeacherName && cleanWaliName === cleanTeacherName) return true;
      if (cleanUserName && cleanWaliName === cleanUserName) return true;
    }
    return false;
  });

  const hasAuthoritativeSubjects = !!(
    (effectiveTeacherId && subjects.some((s) => s.teacherId === effectiveTeacherId)) ||
    (currentUser.subjectId && subjects.some((s) => s.id === currentUser.subjectId))
  );

  let isWaliKelas = role === 'WALI KELAS';
  let isGuruMapel = role === 'GURU MAPEL';

  if (!isAdmin && !isSuperAdmin && !isKepalaSekolah && !isSiswa) {
    if (isGuruMapel && hasAuthoritativeWaliClass && !hasAuthoritativeSubjects) {
      // Role akun GURU MAPEL tetapi guru secara sah ditugaskan sebagai Wali Kelas di classes
      isWaliKelas = true;
      isGuruMapel = false;
    } else if (isWaliKelas && hasAuthoritativeSubjects && !hasAuthoritativeWaliClass) {
      // Role akun WALI KELAS tetapi guru ditugaskan mengampu mapel tanpa rombel binaan
      isWaliKelas = false;
      isGuruMapel = true;
    }
  }

  // WALI KELAS: explicit classes.wali_kelas_teacher_id relation, classIds, or verified name
  const assignedWaliClass = isWaliKelas
    ? classes.find((schoolClass) => {
        if (effectiveTeacherId && schoolClass.waliKelasTeacherId === effectiveTeacherId) return true;
        if (currentUser.classIds?.includes(schoolClass.id)) return true;
        if (schoolClass.waliKelasName) {
          const cleanWaliName = normalizeTeacherName(schoolClass.waliKelasName);
          if (cleanTeacherName && cleanWaliName === cleanTeacherName) return true;
          if (cleanUserName && cleanWaliName === cleanUserName) return true;
        }
        return false;
      }) || null
    : null;

  // GURU MAPEL: subject assignment must be explicit.
  let assignedSubjects: Subject[] = [];
  if (isGuruMapel) {
    if (effectiveTeacherId) {
      assignedSubjects = subjects.filter((subject) => subject.teacherId === effectiveTeacherId);
    }
    if (currentUser.subjectId) {
      const directSubject = subjects.find((subject) => subject.id === currentUser.subjectId);
      if (directSubject && !assignedSubjects.some((subject) => subject.id === directSubject.id)) {
        assignedSubjects.push(directSubject);
      }
    }
    if (cleanTeacherName) {
      const byTeacherName = subjects.filter((s) => {
        if (!s.teacherName) return false;
        const cleanSubTeacher = normalizeTeacherName(s.teacherName);
        return cleanSubTeacher === cleanTeacherName || (cleanTeacherName.length >= 4 && cleanSubTeacher.includes(cleanTeacherName));
      });
      byTeacherName.forEach((s) => {
        if (!assignedSubjects.some((sub) => sub.id === s.id)) {
          assignedSubjects.push(s);
        }
      });
    }
    if (cleanUserName) {
      const byUserName = subjects.filter((s) => {
        if (!s.teacherName) return false;
        const cleanSubTeacher = normalizeTeacherName(s.teacherName);
        return cleanSubTeacher === cleanUserName || (cleanUserName.length >= 4 && cleanSubTeacher.includes(cleanUserName));
      });
      byUserName.forEach((s) => {
        if (!assignedSubjects.some((sub) => sub.id === s.id)) {
          assignedSubjects.push(s);
        }
      });
    }
  }

  // Class scope for Guru Mapel is the classes they teach (targetClassIds / targetClassNames / classIds).
  let accessibleClasses: SchoolClass[] = [];
  if (isSuperAdmin || isAdmin || isKepalaSekolah) {
    accessibleClasses = classes;
  } else if (isWaliKelas) {
    accessibleClasses = assignedWaliClass ? [assignedWaliClass] : [];
    if (currentUser.classIds && currentUser.classIds.length > 0) {
      const extra = classes.filter((c) => currentUser.classIds?.includes(c.id));
      extra.forEach((c) => {
        if (!accessibleClasses.some((ac) => ac.id === c.id)) {
          accessibleClasses.push(c);
        }
      });
    }
  } else if (isGuruMapel) {
    const targetClassIds = new Set<string>();
    assignedSubjects.forEach((subject) => {
      (subject.targetClassIds || []).forEach((classId) => targetClassIds.add(classId));
      if (subject.targetClassNames && subject.targetClassNames.length > 0) {
        classes.forEach((c) => {
          if (subject.targetClassNames?.some((cn) => cn.trim().toLowerCase() === c.name.trim().toLowerCase())) {
            targetClassIds.add(c.id);
          }
        });
      }
    });
    if (currentUser.classIds && currentUser.classIds.length > 0) {
      currentUser.classIds.forEach((cid) => targetClassIds.add(cid));
    }
    accessibleClasses = classes.filter((schoolClass) => targetClassIds.has(schoolClass.id));
  } else if (isSiswa) {
    accessibleClasses = currentUser.classIds?.length
      ? classes.filter((schoolClass) => currentUser.classIds?.includes(schoolClass.id))
      : [];
  }

  let roleBadgeLabel: string = role;
  let scopeDescription = '';

  if (isSuperAdmin) {
    roleBadgeLabel = 'Super Admin';
    scopeDescription = 'Akses penuh ke seluruh sekolah & platform';
  } else if (isAdmin) {
    roleBadgeLabel = 'Administrator';
    scopeDescription = 'Akses penuh ke seluruh data & kelas sekolah';
  } else if (isKepalaSekolah) {
    roleBadgeLabel = 'Kepala Sekolah';
    scopeDescription = 'Akses supervisi & rekapitulasi data sekolah';
  } else if (isWaliKelas) {
    const className = assignedWaliClass?.name || 'Tidak ada kelas';
    roleBadgeLabel = `Wali Kelas ${className}`;
    scopeDescription = assignedWaliClass
      ? `Kewenangan khusus Kelas ${className}`
      : 'Belum memiliki assignment Wali Kelas';
  } else if (isGuruMapel) {
    const subjectNames = assignedSubjects.map((subject) => subject.name).join(', ') || 'Tidak ada mapel';
    roleBadgeLabel = `Guru ${assignedSubjects[0]?.code || assignedSubjects[0]?.name || 'Mapel'}`;
    scopeDescription = assignedSubjects.length > 0
      ? `Kewenangan Guru Mapel (${subjectNames}) untuk ${accessibleClasses.length} Rombel`
      : 'Belum memiliki assignment Guru Mapel';
  } else if (isSiswa) {
    roleBadgeLabel = 'Siswa';
    scopeDescription = 'Portal kehadiran mandiri siswa';
  }

  return {
    isSuperAdmin,
    isAdmin,
    isKepalaSekolah,
    isWaliKelas,
    isGuruMapel,
    isSiswa,
    currentTeacher,
    assignedWaliClass,
    assignedWaliClassId: assignedWaliClass?.id || null,
    assignedWaliClassName: assignedWaliClass?.name || null,
    assignedSubjects,
    assignedSubjectIds: assignedSubjects.map((subject) => subject.id),
    primarySubject: assignedSubjects[0] || null,
    accessibleClasses,
    accessibleClassIds: accessibleClasses.map((schoolClass) => schoolClass.id),
    roleBadgeLabel,
    scopeDescription,
  };
}
