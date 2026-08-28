import { UserAccount, SchoolClass, Subject, Teacher, Student } from '../types';

export interface UserRoleScope {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isKepalaSekolah: boolean;
  isWaliKelas: boolean;
  isGuruMapel: boolean;
  isSiswa: boolean;

  // Wali Kelas specific scope
  assignedWaliClass: SchoolClass | null;
  assignedWaliClassId: string | null;
  assignedWaliClassName: string | null;

  // Guru Mapel specific scope
  assignedSubjects: Subject[];
  assignedSubjectIds: string[];
  primarySubject: Subject | null;

  // Accessible rombels / classes
  accessibleClasses: SchoolClass[];
  
  // Display text & role badge
  roleBadgeLabel: string;
  scopeDescription: string;
}

/**
 * Resolves the role-based authority and class/subject scope for the currently authenticated user.
 */
export function getUserRoleScope(
  currentUser: UserAccount | null | undefined,
  classes: SchoolClass[],
  subjects: Subject[],
  teachers: Teacher[] = []
): UserRoleScope {
  if (!currentUser) {
    return {
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
      accessibleClasses: classes,
      roleBadgeLabel: 'Pengguna',
      scopeDescription: '',
    };
  }

  const role = currentUser.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isKepalaSekolah = role === 'KEPALA SEKOLAH';
  const isSiswa = role === 'SISWA';

  // 1. Check if user is linked to teacher record
  const currentUserNameClean = (currentUser.name || '').trim().toLowerCase();
  const currentUserUsernameClean = (currentUser.username || '').trim().toLowerCase();
  
  const matchedTeacher = teachers.find(
    (t) =>
      (t.nip && t.nip !== '-' && t.nip.trim().toLowerCase() === currentUserUsernameClean) ||
      (t.nama && t.nama.trim().toLowerCase() === currentUserNameClean)
  );

  // 2. Identify Wali Kelas assignment
  let assignedWaliClass: SchoolClass | null = null;

  // Check 1: class where waliKelasTeacherId matches user id or teacher id
  if (currentUser.teacherId) {
    assignedWaliClass = classes.find((c) => c.waliKelasTeacherId === currentUser.teacherId) || null;
  }
  if (!assignedWaliClass && matchedTeacher?.id) {
    assignedWaliClass = classes.find((c) => c.waliKelasTeacherId === matchedTeacher.id) || null;
  }

  // Check 2: classIds stored on currentUser account
  if (!assignedWaliClass && currentUser.classIds && currentUser.classIds.length > 0) {
    assignedWaliClass = classes.find((c) => currentUser.classIds?.includes(c.id)) || null;
  }

  // Check 3: name matching on class.waliKelasName
  if (!assignedWaliClass && currentUserNameClean) {
    assignedWaliClass = classes.find(
      (c) => c.waliKelasName && c.waliKelasName.trim().toLowerCase() === currentUserNameClean
    ) || null;
  }

  // Check 4: teacher record has matching class name or assignment
  if (!assignedWaliClass && matchedTeacher) {
    assignedWaliClass = classes.find(
      (c) => c.waliKelasName && c.waliKelasName.trim().toLowerCase() === matchedTeacher.nama.trim().toLowerCase()
    ) || null;
  }

  // 3. Identify Guru Mapel subject assignment
  let assignedSubjects: Subject[] = [];

  // Match by teacherId on subjects
  if (currentUser.teacherId) {
    assignedSubjects = subjects.filter((s) => s.teacherId === currentUser.teacherId);
  }
  if (assignedSubjects.length === 0 && matchedTeacher?.id) {
    assignedSubjects = subjects.filter((s) => s.teacherId === matchedTeacher.id);
  }

  // Match by teacherName on subjects
  if (assignedSubjects.length === 0 && currentUserNameClean) {
    assignedSubjects = subjects.filter(
      (s) => s.teacherName && s.teacherName.trim().toLowerCase() === currentUserNameClean
    );
  }

  // Match by subjectId on currentUser
  if (currentUser.subjectId) {
    const directSubject = subjects.find((s) => s.id === currentUser.subjectId);
    if (directSubject && !assignedSubjects.some((s) => s.id === directSubject.id)) {
      assignedSubjects.push(directSubject);
    }
  }

  // If role is GURU MAPEL and still no subject matched, check teacher's mataPelajaran or provide specialized subjects
  const isGuruMapelRole = role === 'GURU MAPEL';
  const isWaliRole = role === 'WALI KELAS';
  const isTeacherRole = isWaliRole || isGuruMapelRole;

  if (isGuruMapelRole && assignedSubjects.length === 0) {
    if (matchedTeacher?.mataPelajaran) {
      const mpLower = matchedTeacher.mataPelajaran.toLowerCase();
      const foundByMp = subjects.find(
        (s) => mpLower.includes(s.name.toLowerCase()) || (s.code && mpLower.includes(s.code.toLowerCase()))
      );
      if (foundByMp) assignedSubjects.push(foundByMp);
    }
    // Fallback: if still empty, assign all specialized subjects or all subjects
    if (assignedSubjects.length === 0) {
      const specialized = subjects.filter((s) => s.isSpecialized);
      assignedSubjects = specialized.length > 0 ? specialized : subjects;
    }
  }

  // Determine final isWaliKelas and isGuruMapel boolean flags
  let isWaliKelas = false;
  let isGuruMapel = false;

  if (!isAdmin && !isKepalaSekolah && !isSiswa) {
    if (isWaliRole) {
      isWaliKelas = true;
      isGuruMapel = false;
    } else if (role === 'GURU MAPEL') {
      isGuruMapel = true;
      isWaliKelas = false;
    }
  }

  // If user is Wali Kelas but assignedWaliClass was not found in DB, fallback to first class
  if (isWaliKelas && !assignedWaliClass && classes.length > 0) {
    assignedWaliClass = classes[0];
  }

  // Accessible rombels / classes calculation
  let accessibleClasses: SchoolClass[] = classes;

  if (isWaliKelas && assignedWaliClass) {
    accessibleClasses = [assignedWaliClass];
  } else if (isGuruMapel) {
    // If the Guru Mapel's subjects specify targetClassIds, collect those classes
    const targetClassIdSet = new Set<string>();
    assignedSubjects.forEach((sub) => {
      if (sub.targetClassIds && sub.targetClassIds.length > 0) {
        sub.targetClassIds.forEach((cid) => targetClassIdSet.add(cid));
      }
    });

    if (currentUser.classIds && currentUser.classIds.length > 0) {
      currentUser.classIds.forEach((cid) => targetClassIdSet.add(cid));
    }

    if (targetClassIdSet.size > 0) {
      const filtered = classes.filter((c) => targetClassIdSet.has(c.id));
      accessibleClasses = filtered.length > 0 ? filtered : classes;
    } else {
      // If no specific target class restriction was set, Guru Mapel can teach all rombels in the school
      accessibleClasses = classes;
    }
  }

  // Determine user friendly badge label and scope description
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
    scopeDescription = 'Akses supervisi & rekapitulasi seluruh kelas';
  } else if (isWaliKelas) {
    const className = assignedWaliClass?.name || 'Binaan';
    roleBadgeLabel = `Wali Kelas ${className}`;
    scopeDescription = `Kewenangan khusus Kelas ${className} (Absensi & Laporan Harian)`;
  } else if (isGuruMapel) {
    const subjectNames = assignedSubjects.map((s) => s.name).join(', ') || 'Mata Pelajaran';
    roleBadgeLabel = `Guru ${assignedSubjects[0]?.code || assignedSubjects[0]?.name || 'Mapel'}`;
    scopeDescription = `Kewenangan Guru Mapel (${subjectNames}) untuk ${accessibleClasses.length} Rombel`;
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
    assignedSubjectIds: assignedSubjects.map((s) => s.id),
    primarySubject: assignedSubjects[0] || null,
    accessibleClasses,
    roleBadgeLabel,
    scopeDescription,
  };
}
