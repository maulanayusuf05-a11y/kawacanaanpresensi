-- ==============================================================================
-- SKRIP SQL SUPABASE: PERBAIKAN PENGHAPUSAN PENGGUNA (PROFILES & AUTH.USERS)
-- Masalah: Keterangan "Operasi akun gagal" saat Admin Sekolah menghapus pengguna.
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard)
-- 2. Pilih menu "SQL Editor" di bilah navigasi kiri
-- 3. Klik "New Query", salin dan tempel seluruh isi script ini, lalu klik "Run"
-- ==============================================================================

-- 1. Pastikan Foreign Key dari `profiles.id` ke `auth.users(id)` memakai ON DELETE CASCADE
--    Dengan ini, ketika user auth dihapus, data profiles otomatis ikut terhapus,
--    dan penghapusan akun tidak akan terblokir oleh foreign key constraint.
DO $$
BEGIN
  -- Hapus constraint lama jika ada
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  -- Pasang constraint baru dengan ON DELETE CASCADE
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint profiles_id_fkey telah disesuaikan atau dilewati: %', SQLERRM;
END $$;

-- 2. Pastikan foreign key teacher_id pada profiles aman saat data master diperbarui
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_teacher_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_teacher_id_fkey;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_teacher_id_fkey
      FOREIGN KEY (teacher_id)
      REFERENCES public.teachers(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint profiles_teacher_id_fkey disesuaikan: %', SQLERRM;
END $$;

-- 3. Pastikan foreign key student_id pada profiles aman
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_student_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_student_id_fkey;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_id_fkey
      FOREIGN KEY (student_id)
      REFERENCES public.students(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint profiles_student_id_fkey disesuaikan: %', SQLERRM;
END $$;

-- 4. Aktifkan RLS dan perbarui Policy DELETE pada tabel public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete users in their school" ON public.profiles;

CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  -- Super admin dapat menghapus akun pengguna manapun
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
  )
  -- Atau Admin sekolah dapat menghapus akun di sekolah yang sama (kecuali akun miliknya sendiri)
  OR (
    id <> auth.uid()
    AND school_id IN (
      SELECT p.school_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'ADMIN SEKOLAH')
    )
  )
);

-- 5. Berikan hak eksekusi dan pastikan service role / authenticated dapat mengelola profiles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
