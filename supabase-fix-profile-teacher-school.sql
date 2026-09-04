-- ==============================================================================
-- FIX SUPABASE: VALIDASI & SINKRONISASI PROFILE DENGAN GURU (SCHOOL_ID)
-- Masalah: Keterangan "Profile dan guru harus berada pada sekolah yang sama"
--          saat beralih antara Ruang Kerja Sekolah dan Ruang Kerja Individu.
-- ==============================================================================

-- 1. Perbarui Function Trigger agar cerdas dan toleran saat transisi ruang kerja
CREATE OR REPLACE FUNCTION public.check_profile_teacher_school()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_school_id UUID;
BEGIN
  -- Jika teacher_id bernilai NULL, selalu diizinkan
  IF NEW.teacher_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ambil school_id dari data guru yang dirujuk
  SELECT school_id INTO v_teacher_school_id
  FROM public.teachers
  WHERE id = NEW.teacher_id;

  -- Jika data guru ditemukan namun sekolahnya berbeda dengan profil pengguna:
  IF v_teacher_school_id IS NOT NULL AND NEW.school_id IS NOT NULL AND v_teacher_school_id <> NEW.school_id THEN
    -- Fallback aman: jika terjadi perubahan ruang kerja (school_id berubah),
    -- lepaskan keterikatan teacher_id lama alih-alih melempar error,
    -- sehingga proses pergantian ruang kerja tetap berjalan lancar dan aman.
    IF TG_OP = 'UPDATE' AND (OLD.school_id IS DISTINCT FROM NEW.school_id) THEN
      NEW.teacher_id := NULL;
      RETURN NEW;
    END IF;

    -- Jika bukan proses perpindahan ruang kerja, pastikan integritas data tetap terjaga
    RAISE EXCEPTION 'Profile dan guru harus berada pada sekolah yang sama (Profile: %, Guru: %)', NEW.school_id, v_teacher_school_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Pasang Trigger pada tabel profiles
DROP TRIGGER IF EXISTS trg_check_profile_teacher_school ON public.profiles;
DROP TRIGGER IF EXISTS check_profile_teacher_school_trigger ON public.profiles;

CREATE TRIGGER trg_check_profile_teacher_school
BEFORE INSERT OR UPDATE OF school_id, teacher_id
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_teacher_school();

-- 3. Trigger proteksi pada tabel teachers agar pembaruan data guru tidak merusak profil
CREATE OR REPLACE FUNCTION public.check_teacher_profile_school()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.school_id IS DISTINCT FROM NEW.school_id) THEN
    UPDATE public.profiles
    SET teacher_id = NULL
    WHERE teacher_id = NEW.id AND school_id <> NEW.school_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_teacher_profile_school ON public.teachers;
CREATE TRIGGER trg_check_teacher_profile_school
BEFORE UPDATE OF school_id
ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.check_teacher_profile_school();

-- 4. Bersihkan data profil yang saat ini memiliki teacher_id tidak sinkron dengan school_id
UPDATE public.profiles p
SET teacher_id = NULL
WHERE p.teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = p.teacher_id AND t.school_id = p.school_id
  );
