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

  // Prefer the explicit teacher identity. Do not match by name/NIP because
  // names are mutable display data and can create accidental authorization.
  const currentTeacherId = currentUser.teacherId || null;
  const currentTeacher = currentTeacherId
    ? teachers.find((teacher) => teacher.id === currentTeacherId) || null
    : null;

  // WALI KELAS: only an explicit classes.wali_kelas_teacher_id relation.
  const assignedWaliClass = isWaliKelas && currentTeacherId
    ? classes.find((schoolClass) => schoolClass.waliKelasTeacherId === currentTeacherId) || null
    : null;

  // GURU MAPEL: subject assignment must be explicit. The normalized subject
  // data should expose teacherId + targetClassIds after AppContext hydration.
  // We deliberately do not fall back to all subjects/classes.
  let assignedSubjects: Subject[] = [];
  if (isGuruMapel && currentTeacherId) {
    assignedSubjects = subjects.filter((subject) => subject.teacherId === currentTeacherId);

    // A profile may carry an explicit subjectId as a compatibility bridge,
    // but it is accepted only when the subject itself points to this teacher.
    if (currentUser.subjectId) {
      const directSubject = subjects.find(
        (subject) => subject.id === currentUser.subjectId && subject.teacherId === currentTeacherId
      );
      if (directSubject && !assignedSubjects.some((subject) => subject.id === directSubject.id)) {
        assignedSubjects.push(directSubject);
      }
    }
  }

  // Class scope for Guru Mapel is the intersection implied by their assigned
  // subjects. An empty assignment intentionally produces an empty scope.
  let accessibleClasses: SchoolClass[] = [];
  if (isSuperAdmin || isAdmin || isKepalaSekolah) {
    accessibleClasses = classes;
  } else if (isWaliKelas) {
    accessibleClasses = assignedWaliClass ? [assignedWaliClass] : [];
  } else if (isGuruMapel) {
    const targetClassIds = new Set<string>();
    assignedSubjects.forEach((subject) => {
      (subject.targetClassIds || []).forEach((classId) => targetClassIds.add(classId));
    });
    accessibleClasses = classes.filter((schoolClass) => targetClassIds.has(schoolClass.id));
  } else if (isSiswa) {
    // Student UI normally filters its own records using studentId. We do not
    // use currentUser.classIds as an authorization fallback here.
    accessibleClasses = currentUser.classIds?.length
      ? classes.filter((schoolClass) => currentUser.classIds?.includes(schoolClass.id))
      : [];
  }

  let roleBadgeLabel = role;
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
