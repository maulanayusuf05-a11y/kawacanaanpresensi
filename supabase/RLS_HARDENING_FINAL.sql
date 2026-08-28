-- ============================================================
-- KAWACANAAN - RLS HARDENING FINAL
-- ============================================================
-- Tujuan:
--   SUPER_ADMIN : lintas sekolah
--   ADMIN       : kelola seluruh data sekolahnya
--   WALI KELAS  : hanya kelas yang menjadi tanggung jawabnya
--   GURU MAPEL  : hanya kelas + mata pelajaran yang di-assignment
--   SISWA       : hanya data dirinya sendiri
--
-- Prinsip penting:
--   1. RLS adalah security boundary. Filter frontend bukan security.
--   2. Missing assignment = NO ACCESS, bukan fallback ke semua data.
--   3. school_id tidak boleh dipercaya dari client.
--   4. Role/identity diambil dari profiles berdasarkan auth.uid().
--   5. SUPER_ADMIN tidak dibatasi school_id.
--
-- PRASYARAT SCHEMA yang dipakai file ini:
--   profiles(id, role, school_id, teacher_id, student_id)
--   schools(id)
--   school_profile(school_id, ...)
--   teachers(id, school_id, ...)
--   students(id, school_id, ...)
--   classes(id, school_id, wali_kelas_teacher_id, ...)
--   subjects(id, school_id, ...)
--   teacher_class_assignments(id, school_id, teacher_id, class_id)
--   subject_teacher_assignments(id, school_id, subject_id, teacher_id)
--   subject_class_assignments(id, school_id, subject_id, class_id)
--   subject_schedule_days(id, school_id, subject_id, ...)
--   attendance_records(id, school_id, student_id, class_id, teacher_id,
--                      subject_id, type, ...)
--
-- CATATAN:
--   Jalankan di Supabase SQL Editor sebagai database owner.
--   Backup database terlebih dahulu.
--   File ini TIDAK menghapus data.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. Helper authorization functions
-- ============================================================
-- SECURITY DEFINER dipakai agar helper dapat membaca profiles tanpa
-- terkena recursive RLS. search_path dibatasi untuk menghindari
-- search_path hijacking.

CREATE OR REPLACE FUNCTION public.app_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.school_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.teacher_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.student_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_current_role() = 'SUPER_ADMIN', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_current_role() IN ('ADMIN', 'SUPER_ADMIN'), false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_wali_kelas()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_current_role() = 'WALI KELAS', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_guru_mapel()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_current_role() = 'GURU MAPEL', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_siswa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_current_role() = 'SISWA', false);
$$;

-- Wali kelas hanya berhak atas kelas yang eksplisit ditandai di classes.
CREATE OR REPLACE FUNCTION public.app_can_access_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.app_is_super_admin()
    OR (
      public.app_is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = p_class_id
          AND c.school_id = public.app_current_school_id()
      )
    )
    OR (
      public.app_is_wali_kelas()
      AND EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = p_class_id
          AND c.school_id = public.app_current_school_id()
          AND c.wali_kelas_teacher_id = public.app_current_teacher_id()
      )
    )
    OR (
      public.app_is_guru_mapel()
      AND EXISTS (
        SELECT 1
        FROM public.subject_teacher_assignments sta
        JOIN public.subject_class_assignments sca
          ON sca.school_id = sta.school_id
         AND sca.subject_id = sta.subject_id
        WHERE sta.school_id = public.app_current_school_id()
          AND sta.teacher_id = public.app_current_teacher_id()
          AND sca.class_id = p_class_id
      )
    )
    OR (
      public.app_is_siswa()
      AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = public.app_current_student_id()
          AND s.school_id = public.app_current_school_id()
          AND s.class_id = p_class_id
      )
    );
$$;

-- Siswa: hanya dirinya sendiri. Guru mapel harus mempunyai pasangan
-- subject + class yang sah sebelum dapat melihat siswa.
CREATE OR REPLACE FUNCTION public.app_can_access_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.app_is_super_admin()
    OR (
      public.app_is_admin()
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = p_student_id
          AND s.school_id = public.app_current_school_id()
      )
    )
    OR (
      public.app_is_wali_kelas()
      AND EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = p_student_id
          AND s.school_id = public.app_current_school_id()
          AND c.school_id = s.school_id
          AND c.wali_kelas_teacher_id = public.app_current_teacher_id()
      )
    )
    OR (
      public.app_is_guru_mapel()
      AND EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.subject_class_assignments sca
          ON sca.school_id = s.school_id
         AND sca.class_id = s.class_id
        JOIN public.subject_teacher_assignments sta
          ON sta.school_id = sca.school_id
         AND sta.subject_id = sca.subject_id
        WHERE s.id = p_student_id
          AND s.school_id = public.app_current_school_id()
          AND sta.teacher_id = public.app_current_teacher_id()
      )
    )
    OR (
      public.app_is_siswa()
      AND p_student_id = public.app_current_student_id()
    );
$$;

-- Guru Mapel hanya boleh melihat/menulis kombinasi subject + class
-- yang benar-benar mempunyai dua assignment:
--   teacher -> subject
--   subject -> class
CREATE OR REPLACE FUNCTION public.app_can_access_subject_class(
  p_subject_id uuid,
  p_class_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.app_is_super_admin()
    OR (
      public.app_is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.subjects s
        JOIN public.classes c ON c.school_id = s.school_id
        WHERE s.id = p_subject_id
          AND c.id = p_class_id
          AND s.school_id = public.app_current_school_id()
      )
    )
    OR (
      public.app_is_guru_mapel()
      AND EXISTS (
        SELECT 1
        FROM public.subject_teacher_assignments sta
        JOIN public.subject_class_assignments sca
          ON sca.school_id = sta.school_id
         AND sca.subject_id = sta.subject_id
        WHERE sta.school_id = public.app_current_school_id()
          AND sta.teacher_id = public.app_current_teacher_id()
          AND sta.subject_id = p_subject_id
          AND sca.class_id = p_class_id
      )
    );
$$;

-- Attendance authorization.
CREATE OR REPLACE FUNCTION public.app_can_access_attendance(
  p_student_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_subject_id uuid,
  p_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.app_is_super_admin()
    OR (
      public.app_is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = p_student_id
          AND s.school_id = public.app_current_school_id()
          AND c.school_id = s.school_id
          AND c.id = p_class_id
      )
    )
    OR (
      public.app_is_wali_kelas()
      AND p_type = 'DAILY'
      AND p_teacher_id = public.app_current_teacher_id()
      AND EXISTS (
        SELECT 1
        FROM public.classes c
        JOIN public.students s ON s.class_id = c.id
        WHERE c.id = p_class_id
          AND c.school_id = public.app_current_school_id()
          AND c.wali_kelas_teacher_id = public.app_current_teacher_id()
          AND s.id = p_student_id
          AND s.school_id = c.school_id
      )
    )
    OR (
      public.app_is_guru_mapel()
      AND p_type = 'SUBJECT'
      AND p_teacher_id = public.app_current_teacher_id()
      AND p_subject_id IS NOT NULL
      AND public.app_can_access_subject_class(p_subject_id, p_class_id)
      AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = p_student_id
          AND s.class_id = p_class_id
          AND s.school_id = public.app_current_school_id()
      )
    )
    OR (
      public.app_is_siswa()
      AND p_student_id = public.app_current_student_id()
    );
$$;

-- Helper functions tidak boleh dieksekusi anonymous.
REVOKE ALL ON FUNCTION public.app_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_current_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_current_teacher_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_current_student_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_wali_kelas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_guru_mapel() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_siswa() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_subject_class(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_attendance(uuid, uuid, uuid, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_wali_kelas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_guru_mapel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_siswa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_subject_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_attendance(uuid, uuid, uuid, uuid, text) TO authenticated;

-- ============================================================
-- Authorization-field protection for profiles
-- ============================================================
-- Non-SUPER_ADMIN must never be able to promote an account, move it
-- across schools, or re-link teacher/student identity through a direct
-- client UPDATE. Administrative account provisioning should use the
-- trusted server/API path.
CREATE OR REPLACE FUNCTION public.protect_profile_authorization_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.app_is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'PROFILE AUTHORIZATION FIELDS ARE IMMUTABLE FOR THIS ROLE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_authorization_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_authorization_fields
BEFORE UPDATE OF role, school_id, teacher_id, student_id
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_authorization_fields();

REVOKE ALL ON FUNCTION public.protect_profile_authorization_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_authorization_fields() TO authenticated;

-- ============================================================
-- 1. PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_hardened" ON public.profiles;
CREATE POLICY "profiles_select_hardened"
ON public.profiles
FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR id = auth.uid()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "profiles_insert_hardened" ON public.profiles;
CREATE POLICY "profiles_insert_hardened"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "profiles_update_hardened" ON public.profiles;
CREATE POLICY "profiles_update_hardened"
ON public.profiles
FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR id = auth.uid()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    id = auth.uid()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "profiles_delete_hardened" ON public.profiles;
CREATE POLICY "profiles_delete_hardened"
ON public.profiles
FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND id <> auth.uid()
  )
);

-- ============================================================
-- 2. SCHOOLS
-- ============================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select_hardened" ON public.schools;
CREATE POLICY "schools_select_hardened"
ON public.schools FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR id = public.app_current_school_id()
);

DROP POLICY IF EXISTS "schools_insert_hardened" ON public.schools;
CREATE POLICY "schools_insert_hardened"
ON public.schools FOR INSERT TO authenticated
WITH CHECK (public.app_is_super_admin());

DROP POLICY IF EXISTS "schools_update_hardened" ON public.schools;
CREATE POLICY "schools_update_hardened"
ON public.schools FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR id = public.app_current_school_id()
)
WITH CHECK (
  public.app_is_super_admin()
  OR id = public.app_current_school_id()
);

DROP POLICY IF EXISTS "schools_delete_hardened" ON public.schools;
CREATE POLICY "schools_delete_hardened"
ON public.schools FOR DELETE TO authenticated
USING (public.app_is_super_admin());

-- ============================================================
-- 3. SCHOOL_PROFILE
-- ============================================================
ALTER TABLE public.school_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_profile_select_hardened" ON public.school_profile;
CREATE POLICY "school_profile_select_hardened"
ON public.school_profile FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR school_id = public.app_current_school_id()
);

DROP POLICY IF EXISTS "school_profile_insert_hardened" ON public.school_profile;
CREATE POLICY "school_profile_insert_hardened"
ON public.school_profile FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "school_profile_update_hardened" ON public.school_profile;
CREATE POLICY "school_profile_update_hardened"
ON public.school_profile FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "school_profile_delete_hardened" ON public.school_profile;
CREATE POLICY "school_profile_delete_hardened"
ON public.school_profile FOR DELETE TO authenticated
USING (public.app_is_super_admin());

-- ============================================================
-- 4. TEACHERS
-- ============================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_select_hardened" ON public.teachers;
CREATE POLICY "teachers_select_hardened"
ON public.teachers FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND id = public.app_current_teacher_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND id = public.app_current_teacher_id()
  )
);

DROP POLICY IF EXISTS "teachers_insert_hardened" ON public.teachers;
CREATE POLICY "teachers_insert_hardened"
ON public.teachers FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "teachers_update_hardened" ON public.teachers;
CREATE POLICY "teachers_update_hardened"
ON public.teachers FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "teachers_delete_hardened" ON public.teachers;
CREATE POLICY "teachers_delete_hardened"
ON public.teachers FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 5. CLASSES
-- ============================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_hardened" ON public.classes;
CREATE POLICY "classes_select_hardened"
ON public.classes FOR SELECT TO authenticated
USING (public.app_can_access_class(id));

DROP POLICY IF EXISTS "classes_insert_hardened" ON public.classes;
CREATE POLICY "classes_insert_hardened"
ON public.classes FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "classes_update_hardened" ON public.classes;
CREATE POLICY "classes_update_hardened"
ON public.classes FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "classes_delete_hardened" ON public.classes;
CREATE POLICY "classes_delete_hardened"
ON public.classes FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 6. STUDENTS
-- ============================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select_hardened" ON public.students;
CREATE POLICY "students_select_hardened"
ON public.students FOR SELECT TO authenticated
USING (public.app_can_access_student(id));

DROP POLICY IF EXISTS "students_insert_hardened" ON public.students;
CREATE POLICY "students_insert_hardened"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "students_update_hardened" ON public.students;
CREATE POLICY "students_update_hardened"
ON public.students FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_siswa()
    AND id = public.app_current_student_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_siswa()
    AND id = public.app_current_student_id()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "students_delete_hardened" ON public.students;
CREATE POLICY "students_delete_hardened"
ON public.students FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 7. TEACHER_CLASS_ASSIGNMENTS
-- ============================================================
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_class_assignments_select_hardened" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_select_hardened"
ON public.teacher_class_assignments FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND teacher_id = public.app_current_teacher_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND teacher_id = public.app_current_teacher_id()
  )
);

DROP POLICY IF EXISTS "teacher_class_assignments_insert_hardened" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_insert_hardened"
ON public.teacher_class_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "teacher_class_assignments_update_hardened" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_update_hardened"
ON public.teacher_class_assignments FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "teacher_class_assignments_delete_hardened" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_delete_hardened"
ON public.teacher_class_assignments FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 8. SUBJECTS
-- ============================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_select_hardened" ON public.subjects;
CREATE POLICY "subjects_select_hardened"
ON public.subjects FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.subject_teacher_assignments sta
      WHERE sta.school_id = subjects.school_id
        AND sta.subject_id = subjects.id
        AND sta.teacher_id = public.app_current_teacher_id()
    )
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.subject_class_assignments sca
      WHERE sca.school_id = subjects.school_id
        AND sca.subject_id = subjects.id
        AND public.app_can_access_class(sca.class_id)
    )
  )
);

DROP POLICY IF EXISTS "subjects_insert_hardened" ON public.subjects;
CREATE POLICY "subjects_insert_hardened"
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "subjects_update_hardened" ON public.subjects;
CREATE POLICY "subjects_update_hardened"
ON public.subjects FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "subjects_delete_hardened" ON public.subjects;
CREATE POLICY "subjects_delete_hardened"
ON public.subjects FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 9. SUBJECT_TEACHER_ASSIGNMENTS
-- ============================================================
-- PENTING: tidak lagi "same school for everyone".
-- Hanya SUPER_ADMIN / ADMIN yang boleh mengelola assignment.
-- Guru hanya membaca assignment dirinya.
-- ============================================================
ALTER TABLE public.subject_teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_teacher_same_school" ON public.subject_teacher_assignments;
DROP POLICY IF EXISTS "subject_teacher_select_hardened" ON public.subject_teacher_assignments;
CREATE POLICY "subject_teacher_select_hardened"
ON public.subject_teacher_assignments FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND teacher_id = public.app_current_teacher_id()
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
  )
);

DROP POLICY IF EXISTS "subject_teacher_insert_hardened" ON public.subject_teacher_assignments;
CREATE POLICY "subject_teacher_insert_hardened"
ON public.subject_teacher_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_teacher_update_hardened" ON public.subject_teacher_assignments;
CREATE POLICY "subject_teacher_update_hardened"
ON public.subject_teacher_assignments FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_teacher_delete_hardened" ON public.subject_teacher_assignments;
CREATE POLICY "subject_teacher_delete_hardened"
ON public.subject_teacher_assignments FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 10. SUBJECT_CLASS_ASSIGNMENTS
-- ============================================================
ALTER TABLE public.subject_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_class_same_school" ON public.subject_class_assignments;
DROP POLICY IF EXISTS "subject_class_select_hardened" ON public.subject_class_assignments;
CREATE POLICY "subject_class_select_hardened"
ON public.subject_class_assignments FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.subject_teacher_assignments sta
      WHERE sta.school_id = subject_class_assignments.school_id
        AND sta.subject_id = subject_class_assignments.subject_id
        AND sta.teacher_id = public.app_current_teacher_id()
    )
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND public.app_can_access_class(class_id)
  )
);

DROP POLICY IF EXISTS "subject_class_insert_hardened" ON public.subject_class_assignments;
CREATE POLICY "subject_class_insert_hardened"
ON public.subject_class_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_class_update_hardened" ON public.subject_class_assignments;
CREATE POLICY "subject_class_update_hardened"
ON public.subject_class_assignments FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_class_delete_hardened" ON public.subject_class_assignments;
CREATE POLICY "subject_class_delete_hardened"
ON public.subject_class_assignments FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 11. SUBJECT_SCHEDULE_DAYS
-- ============================================================
ALTER TABLE public.subject_schedule_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_schedule_same_school" ON public.subject_schedule_days;
DROP POLICY IF EXISTS "subject_schedule_select_hardened" ON public.subject_schedule_days;
CREATE POLICY "subject_schedule_select_hardened"
ON public.subject_schedule_days FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.subject_teacher_assignments sta
      WHERE sta.school_id = subject_schedule_days.school_id
        AND sta.subject_id = subject_schedule_days.subject_id
        AND sta.teacher_id = public.app_current_teacher_id()
    )
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.subject_class_assignments sca
      WHERE sca.school_id = subject_schedule_days.school_id
        AND sca.subject_id = subject_schedule_days.subject_id
        AND public.app_can_access_class(sca.class_id)
    )
  )
);

DROP POLICY IF EXISTS "subject_schedule_insert_hardened" ON public.subject_schedule_days;
CREATE POLICY "subject_schedule_insert_hardened"
ON public.subject_schedule_days FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_schedule_update_hardened" ON public.subject_schedule_days;
CREATE POLICY "subject_schedule_update_hardened"
ON public.subject_schedule_days FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
)
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.school_id = school_id
    )
  )
);

DROP POLICY IF EXISTS "subject_schedule_delete_hardened" ON public.subject_schedule_days;
CREATE POLICY "subject_schedule_delete_hardened"
ON public.subject_schedule_days FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
);

-- ============================================================
-- 12. ATTENDANCE_RECORDS
-- ============================================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_hardened" ON public.attendance_records;
CREATE POLICY "attendance_select_hardened"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  public.app_can_access_attendance(
    student_id,
    class_id,
    teacher_id,
    subject_id,
    type::text
  )
);

DROP POLICY IF EXISTS "attendance_insert_hardened" ON public.attendance_records;
CREATE POLICY "attendance_insert_hardened"
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_wali_kelas()
    AND type::text = 'DAILY'
    AND teacher_id = public.app_current_teacher_id()
    AND school_id = public.app_current_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.students s ON s.class_id = c.id
      WHERE c.id = attendance_records.class_id
        AND c.school_id = attendance_records.school_id
        AND c.wali_kelas_teacher_id = public.app_current_teacher_id()
        AND s.id = attendance_records.student_id
        AND s.school_id = attendance_records.school_id
    )
  )
  OR (
    public.app_is_guru_mapel()
    AND type::text = 'SUBJECT'
    AND teacher_id = public.app_current_teacher_id()
    AND subject_id IS NOT NULL
    AND school_id = public.app_current_school_id()
    AND public.app_can_access_subject_class(subject_id, class_id)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = attendance_records.student_id
        AND s.class_id = attendance_records.class_id
        AND s.school_id = attendance_records.school_id
    )
  )
);

DROP POLICY IF EXISTS "attendance_update_hardened" ON public.attendance_records;
CREATE POLICY "attendance_update_hardened"
ON public.attendance_records FOR UPDATE TO authenticated
USING (
  public.app_can_access_attendance(
    student_id, class_id, teacher_id, subject_id, type::text
  )
  AND (
    public.app_is_super_admin()
    OR public.app_is_admin()
    OR (public.app_is_wali_kelas() AND type::text = 'DAILY' AND teacher_id = public.app_current_teacher_id())
    OR (public.app_is_guru_mapel() AND type::text = 'SUBJECT' AND teacher_id = public.app_current_teacher_id())
  )
)
WITH CHECK (
  school_id = public.app_current_school_id()
  AND (
    public.app_is_super_admin()
    OR public.app_is_admin()
    OR (
      public.app_is_wali_kelas()
      AND type::text = 'DAILY'
      AND teacher_id = public.app_current_teacher_id()
      AND public.app_can_access_attendance(student_id, class_id, teacher_id, subject_id, type::text)
    )
    OR (
      public.app_is_guru_mapel()
      AND type::text = 'SUBJECT'
      AND teacher_id = public.app_current_teacher_id()
      AND subject_id IS NOT NULL
      AND public.app_can_access_subject_class(subject_id, class_id)
      AND public.app_can_access_attendance(student_id, class_id, teacher_id, subject_id, type::text)
    )
  )
);

DROP POLICY IF EXISTS "attendance_delete_hardened" ON public.attendance_records;
CREATE POLICY "attendance_delete_hardened"
ON public.attendance_records FOR DELETE TO authenticated
USING (
  public.app_is_super_admin()
  OR (
    public.app_is_admin()
    AND school_id = public.app_current_school_id()
  )
  OR (
    public.app_is_wali_kelas()
    AND school_id = public.app_current_school_id()
    AND type::text = 'DAILY'
    AND teacher_id = public.app_current_teacher_id()
    AND public.app_can_access_attendance(student_id, class_id, teacher_id, subject_id, type::text)
  )
  OR (
    public.app_is_guru_mapel()
    AND school_id = public.app_current_school_id()
    AND type::text = 'SUBJECT'
    AND teacher_id = public.app_current_teacher_id()
    AND subject_id IS NOT NULL
    AND public.app_can_access_subject_class(subject_id, class_id)
    AND public.app_can_access_attendance(student_id, class_id, teacher_id, subject_id, type::text)
  )
);

-- ============================================================
-- 13. SCHOOL CALENDAR / CONFIGURATION
-- ============================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_select_hardened" ON public.system_config;
CREATE POLICY "system_config_select_hardened"
ON public.system_config FOR SELECT TO authenticated
USING (
  public.app_is_super_admin()
  OR school_id = public.app_current_school_id()
);

DROP POLICY IF EXISTS "system_config_insert_hardened" ON public.system_config;
CREATE POLICY "system_config_insert_hardened"
ON public.system_config FOR INSERT TO authenticated
WITH CHECK (
  public.app_is_super_admin()
  OR (public.app_is_admin() AND school_id = public.app_current_school_id())
);

DROP POLICY IF EXISTS "system_config_update_hardened" ON public.system_config;
CREATE POLICY "system_config_update_hardened"
ON public.system_config FOR UPDATE TO authenticated
USING (
  public.app_is_super_admin()
  OR (public.app_is_admin() AND school_id = public.app_current_school_id())
)
WITH CHECK (
  public.app_is_super_admin()
  OR (public.app_is_admin() AND school_id = public.app_current_school_id())
);

DROP POLICY IF EXISTS "system_config_delete_hardened" ON public.system_config;
CREATE POLICY "system_config_delete_hardened"
ON public.system_config FOR DELETE TO authenticated
USING (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_events_select_hardened" ON public.academic_events;
CREATE POLICY "academic_events_select_hardened"
ON public.academic_events FOR SELECT TO authenticated
USING (public.app_is_super_admin() OR school_id = public.app_current_school_id());

DROP POLICY IF EXISTS "academic_events_insert_hardened" ON public.academic_events;
CREATE POLICY "academic_events_insert_hardened"
ON public.academic_events FOR INSERT TO authenticated
WITH CHECK (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

DROP POLICY IF EXISTS "academic_events_update_hardened" ON public.academic_events;
CREATE POLICY "academic_events_update_hardened"
ON public.academic_events FOR UPDATE TO authenticated
USING (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()))
WITH CHECK (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

DROP POLICY IF EXISTS "academic_events_delete_hardened" ON public.academic_events;
CREATE POLICY "academic_events_delete_hardened"
ON public.academic_events FOR DELETE TO authenticated
USING (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

ALTER TABLE public.effective_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "effective_days_select_hardened" ON public.effective_days;
CREATE POLICY "effective_days_select_hardened"
ON public.effective_days FOR SELECT TO authenticated
USING (public.app_is_super_admin() OR school_id = public.app_current_school_id());

DROP POLICY IF EXISTS "effective_days_insert_hardened" ON public.effective_days;
CREATE POLICY "effective_days_insert_hardened"
ON public.effective_days FOR INSERT TO authenticated
WITH CHECK (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

DROP POLICY IF EXISTS "effective_days_update_hardened" ON public.effective_days;
CREATE POLICY "effective_days_update_hardened"
ON public.effective_days FOR UPDATE TO authenticated
USING (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()))
WITH CHECK (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

DROP POLICY IF EXISTS "effective_days_delete_hardened" ON public.effective_days;
CREATE POLICY "effective_days_delete_hardened"
ON public.effective_days FOR DELETE TO authenticated
USING (public.app_is_super_admin() OR (public.app_is_admin() AND school_id = public.app_current_school_id()));

-- Platform settings are global platform configuration: SUPER_ADMIN only.
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select_hardened" ON public.platform_settings;
CREATE POLICY "platform_settings_select_hardened"
ON public.platform_settings FOR SELECT TO authenticated
USING (public.app_is_super_admin());

DROP POLICY IF EXISTS "platform_settings_insert_hardened" ON public.platform_settings;
CREATE POLICY "platform_settings_insert_hardened"
ON public.platform_settings FOR INSERT TO authenticated
WITH CHECK (public.app_is_super_admin());

DROP POLICY IF EXISTS "platform_settings_update_hardened" ON public.platform_settings;
CREATE POLICY "platform_settings_update_hardened"
ON public.platform_settings FOR UPDATE TO authenticated
USING (public.app_is_super_admin())
WITH CHECK (public.app_is_super_admin());

DROP POLICY IF EXISTS "platform_settings_delete_hardened" ON public.platform_settings;
CREATE POLICY "platform_settings_delete_hardened"
ON public.platform_settings FOR DELETE TO authenticated
USING (public.app_is_super_admin());

-- ============================================================
-- 14. Defensive integrity constraints / indexes
-- ============================================================
-- Index yang mendukung RLS dan join assignment.
CREATE INDEX IF NOT EXISTS idx_profiles_authz
  ON public.profiles(id, school_id, role, teacher_id, student_id);

CREATE INDEX IF NOT EXISTS idx_classes_rls_wali
  ON public.classes(school_id, wali_kelas_teacher_id, id);

CREATE INDEX IF NOT EXISTS idx_students_rls_class
  ON public.students(school_id, class_id, id);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_rls
  ON public.teacher_class_assignments(school_id, teacher_id, class_id);

CREATE INDEX IF NOT EXISTS idx_subject_teacher_assignments_rls
  ON public.subject_teacher_assignments(school_id, teacher_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_subject_class_assignments_rls
  ON public.subject_class_assignments(school_id, class_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_rls
  ON public.attendance_records(school_id, student_id, class_id, teacher_id, subject_id, type);

-- ============================================================
-- 15. DATA INTEGRITY AUDIT
-- ============================================================
-- Tidak mengubah data. Hanya memastikan assignment lintas sekolah tidak ada.
DO $$
DECLARE
  v_bad bigint;
BEGIN
  SELECT COUNT(*) INTO v_bad
  FROM public.teacher_class_assignments tca
  JOIN public.teachers t ON t.id = tca.teacher_id
  JOIN public.classes c ON c.id = tca.class_id
  WHERE tca.school_id IS DISTINCT FROM t.school_id
     OR tca.school_id IS DISTINCT FROM c.school_id;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'RLS HARDENING ABORTED: teacher_class_assignments memiliki % baris lintas sekolah', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM public.subject_teacher_assignments sta
  JOIN public.subjects s ON s.id = sta.subject_id
  JOIN public.teachers t ON t.id = sta.teacher_id
  WHERE sta.school_id IS DISTINCT FROM s.school_id
     OR sta.school_id IS DISTINCT FROM t.school_id;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'RLS HARDENING ABORTED: subject_teacher_assignments memiliki % baris lintas sekolah', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM public.subject_class_assignments sca
  JOIN public.subjects s ON s.id = sca.subject_id
  JOIN public.classes c ON c.id = sca.class_id
  WHERE sca.school_id IS DISTINCT FROM s.school_id
     OR sca.school_id IS DISTINCT FROM c.school_id;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'RLS HARDENING ABORTED: subject_class_assignments memiliki % baris lintas sekolah', v_bad;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- 16. VERIFICATION / SECURITY TESTS
-- ============================================================
-- Jalankan SET ROLE / JWT claims melalui Supabase test environment.
-- Jangan menjalankan test sebagai postgres karena postgres dapat bypass RLS.
--
-- A. Identitas saat login:
-- select public.app_current_role(),
--        public.app_current_school_id(),
--        public.app_current_teacher_id(),
--        public.app_current_student_id();
--
-- B. WALI KELAS:
-- select id, name from public.classes;
--   -> hanya kelas yang wali_kelas_teacher_id = teacher_id user.
-- select id, nama, class_id from public.students;
--   -> hanya siswa pada kelas wali.
--
-- C. GURU MAPEL:
-- select id, name from public.subjects;
--   -> hanya subject yang memiliki subject_teacher_assignments untuk guru.
-- select id, name from public.classes;
--   -> hanya class yang punya pasangan subject assignment + teacher assignment.
-- select id, nama, class_id from public.students;
--   -> hanya siswa dari class yang diajar guru.
--
-- D. SISWA:
-- select id, nama, class_id from public.students;
--   -> tepat 1 baris: dirinya sendiri.
-- select id, student_id, class_id, teacher_id, subject_id from public.attendance_records;
--   -> hanya attendance miliknya.
--
-- E. CROSS SCHOOL NEGATIVE TEST:
-- SELECT * FROM public.students WHERE school_id = '<SCHOOL-LAIN>'::uuid;
-- SELECT * FROM public.classes WHERE school_id = '<SCHOOL-LAIN>'::uuid;
-- SELECT * FROM public.subject_teacher_assignments WHERE school_id = '<SCHOOL-LAIN>'::uuid;
-- SELECT * FROM public.attendance_records WHERE school_id = '<SCHOOL-LAIN>'::uuid;
--   -> harus 0 baris untuk ADMIN/WALI/GURU/SISWA.
--   -> SUPER_ADMIN boleh melihat.
--
-- F. GURU MAPEL NEGATIVE TEST:
-- SELECT * FROM public.attendance_records
-- WHERE type::text = 'SUBJECT'
--   AND teacher_id <> public.app_current_teacher_id();
--   -> 0 baris.
--
-- G. WALI NEGATIVE TEST:
-- SELECT * FROM public.attendance_records
-- WHERE type::text = 'DAILY'
--   AND teacher_id <> public.app_current_teacher_id();
--   -> 0 baris.
--
-- ============================================================
-- END
-- ============================================================
