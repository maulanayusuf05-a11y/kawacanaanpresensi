-- =========================================================================
-- SKRIP PERBAIKAN ROW LEVEL SECURITY (RLS) UNTUK TABEL "attendance_records"
-- Cara Penggunaan:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard)
-- 2. Masuk ke menu "SQL Editor" di bilah sebelah kiri
-- 3. Salin dan tempel seluruh perintah di bawah ini, lalu klik "Run"
-- =========================================================================

-- 1. Pastikan Row Level Security aktif pada tabel attendance_records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Hapus kebijakan (policies) lama yang membatasi hak akses selain Admin
DROP POLICY IF EXISTS "attendance_records_select_policy" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_policy" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_update_policy" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete_policy" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all for authenticated users in school" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_all" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_teacher_policy" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.attendance_records;

-- 3. Kebijakan SELECT: Pengguna dalam sekolah yang sama dapat melihat data absensi
CREATE POLICY "attendance_records_select_policy"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT p.school_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
);

-- 4. Kebijakan INSERT: Wali Kelas, Guru Mapel, Admin, Kepsek, dan Siswa dapat mencatat absensi
CREATE POLICY "attendance_records_insert_policy"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT p.school_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SISWA')
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
);

-- 5. Kebijakan UPDATE: Memperbarui record absensi yang sudah ada
CREATE POLICY "attendance_records_update_policy"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT p.school_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SISWA')
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
)
WITH CHECK (
  school_id IN (
    SELECT p.school_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL', 'SISWA')
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
);

-- 6. Kebijakan DELETE: Guru Wali Kelas, Guru Mapel, dan Admin dapat menghapus/mereset absensi
CREATE POLICY "attendance_records_delete_policy"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT p.school_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    AND p.role IN ('ADMIN', 'KEPALA SEKOLAH', 'WALI KELAS', 'GURU MAPEL')
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
);

-- 7. Berikan grant permission ke authenticated & service_role
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;

-- 8. Indeks performa untuk tabel attendance_records
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_date 
ON public.attendance_records (school_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date 
ON public.attendance_records (student_id, date);
