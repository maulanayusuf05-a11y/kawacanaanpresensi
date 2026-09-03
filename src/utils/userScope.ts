import { UserAccount, SchoolClass, Subject, Teacher } from '../types';

export interface UserRoleScope {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isKepalaSekolah: boolean;
  isWaliKelas: boolean;
  isGuruMapel: boolean;
  isSiswa: boolean;

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
  const isWaliKelas = role === 'WALI KELAS';
  const isGuruMapel = role === 'GURU MAPEL';
  const isSiswa = role === 'SISWA';

  // Prefer explicit teacher identity, with fallback to NIP / Name matching
  const currentTeacherId = currentUser.teacherId || null;
  const currentTeacher = currentTeacherId
    ? teachers.find((teacher) => teacher.id === currentTeacherId) || null
    : teachers.find((teacher) => {
        if (currentUser.nip && currentUser.nip !== '-' && teacher.nip && teacher.nip.trim() === currentUser.nip.trim()) return true;
        if (currentUser.name && teacher.nama && teacher.nama.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
        return false;
      }) || null;

  const effectiveTeacherId = currentTeacherId || currentTeacher?.id || null;

  // WALI KELAS: explicit classes.wali_kelas_teacher_id relation, classIds, or verified name
  const assignedWaliClass = isWaliKelas
    ? classes.find((schoolClass) => {
        if (effectiveTeacherId && schoolClass.waliKelasTeacherId === effectiveTeacherId) return true;
        if (currentUser.classIds?.includes(schoolClass.id)) return true;
        if (currentTeacher?.nama && schoolClass.waliKelasName && schoolClass.waliKelasName.trim().toLowerCase() === currentTeacher.nama.trim().toLowerCase()) return true;
        if (currentUser.name && schoolClass.waliKelasName && schoolClass.waliKelasName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
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
    if (currentTeacher?.nama) {
      const byTeacherName = subjects.filter(
        (s) => s.teacherName && s.teacherName.trim().toLowerCase() === currentTeacher.nama.trim().toLowerCase()
      );
      byTeacherName.forEach((s) => {
        if (!assignedSubjects.some((sub) => sub.id === s.id)) {
          assignedSubjects.push(s);
        }
      });
    }
    if (currentUser.name) {
      const byUserName = subjects.filter(
        (s) => s.teacherName && s.teacherName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      );
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
