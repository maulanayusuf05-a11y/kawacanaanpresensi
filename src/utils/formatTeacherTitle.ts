/**
 * Utility untuk menyederhanakan dan merapikan gelar/jabatan tanda tangan Guru Mata Pelajaran
 * pada hasil cetak laporan / printout absensi sekolah dasar.
 *
 * Contoh:
 * - "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)" -> "Guru PJOK"
 * - "Pendidikan Agama & Budi Pekerti (PABP)" -> "Guru PABP"
 * - "Pendidikan Lingkungan dan Budaya Jakarta (PLBJ)" -> "Guru PLBJ"
 * - "Seni Budaya & Prakarya (SBdP)" -> "Guru SBdP"
 * - "Bahasa Inggris" -> "Guru Bahasa Inggris" (pengecualian tetap lengkap)
 */

export function formatSubjectTeacherTitle(rawSubjectName?: string | null): string {
  if (!rawSubjectName || !rawSubjectName.trim()) {
    return 'Guru Mata Pelajaran';
  }

  const name = rawSubjectName.trim();
  const lower = name.toLowerCase();

  // 1. PJOK (Pendidikan Jasmani, Olahraga & Kesehatan)
  if (
    lower.includes('pjok') ||
    lower.includes('jasmani') ||
    lower.includes('olahraga') ||
    lower.includes('penjas')
  ) {
    return 'Guru PJOK';
  }

  // 2. PABP / PAI / Pendidikan Agama & Budi Pekerti
  if (
    lower.includes('pabp') ||
    lower.includes('budi pekerti') ||
    lower.includes('agama & budi') ||
    lower.includes('agama dan budi') ||
    lower.includes('pendidikan agama islam') ||
    lower.includes('pai')
  ) {
    if (lower.includes('kristen')) return 'Guru PABP (Kristen)';
    if (lower.includes('katolik')) return 'Guru PABP (Katolik)';
    if (lower.includes('hindu')) return 'Guru PABP (Hindu)';
    if (lower.includes('buddha') || lower.includes('budha')) return 'Guru PABP (Buddha)';
    if (lower.includes('konghucu')) return 'Guru PABP (Konghucu)';
    return 'Guru PABP';
  }

  // 3. PLBJ (Pendidikan Lingkungan dan Budaya Jakarta)
  if (
    lower.includes('plbj') ||
    lower.includes('budaya jakarta') ||
    lower.includes('lingkungan dan budaya jakarta') ||
    lower.includes('lingkungan & budaya jakarta')
  ) {
    return 'Guru PLBJ';
  }

  // 4. SBdP (Seni Budaya & Prakarya)
  if (
    lower.includes('sbdp') ||
    lower.includes('seni budaya') ||
    lower.includes('prakarya')
  ) {
    return 'Guru SBdP';
  }

  // 5. Pengecualian khusus: Bahasa Inggris tetap "Guru Bahasa Inggris"
  if (lower.includes('inggris') || lower.includes('english')) {
    return 'Guru Bahasa Inggris';
  }

  // 6. Bahasa Daerah / Muatan Lokal (Mulok)
  if (
    lower.includes('bahasa daerah') ||
    lower.includes('sunda') ||
    lower.includes('jawa') ||
    lower.includes('mulok') ||
    lower.includes('muatan lokal')
  ) {
    if (lower.includes('sunda')) return 'Guru Bahasa Sunda';
    if (lower.includes('jawa')) return 'Guru Bahasa Jawa';
    if (lower.includes('bali')) return 'Guru Bahasa Bali';
    return 'Guru Muatan Lokal';
  }

  // 7. PPKn / Pendidikan Pancasila
  if (
    lower.includes('ppkn') ||
    lower.includes('pancasila') ||
    lower.includes('kewarganegaraan')
  ) {
    return 'Guru Pendidikan Pancasila';
  }

  // 8. IPAS (Ilmu Pengetahuan Alam dan Sosial)
  if (lower.includes('ipas') || (lower.includes('alam') && lower.includes('sosial'))) {
    return 'Guru IPAS';
  }

  // 9. Matematika
  if (lower.includes('matematika') || lower.includes('mtk')) {
    return 'Guru Matematika';
  }

  // 10. Bahasa Indonesia
  if (lower.includes('bahasa indonesia')) {
    return 'Guru Bahasa Indonesia';
  }

  // 11. Jika terdapat singkatan dalam tanda kurung, misal "Teknologi Informasi & Komunikasi (TIK)" -> "Guru TIK"
  const matchParen = name.match(/\(([^)]+)\)/);
  if (matchParen && matchParen[1] && matchParen[1].length <= 6) {
    return `Guru ${matchParen[1].toUpperCase()}`;
  }

  // 12. Fallback bersih
  const cleanName = name
    .replace(/^mata\s+pelajaran\s+/i, '')
    .replace(/^mapel\s+/i, '')
    .trim();

  return `Guru ${cleanName}`;
}

/**
 * Utility untuk memformat gelar/jabatan tanda tangan Guru Kelas / Wali Kelas
 * pada hasil cetak laporan / printout absensi sekolah dasar.
 *
 * Mencegah kata "Kelas" menjadi double/duplikat (misal: "Guru Kelas Kelas 5" -> "Guru Kelas 5").
 *
 * Contoh:
 * - "Kelas 5" -> "Guru Kelas 5 / Wali Kelas"
 * - "5" -> "Guru Kelas 5 / Wali Kelas"
 * - "Kelas 5A" -> "Guru Kelas 5A / Wali Kelas"
 * - "Semua Kelas" atau null -> "Guru Kelas / Wali Kelas"
 */
export function formatHomeroomTeacherTitle(rawClassName?: string | null): string {
  if (!rawClassName || !rawClassName.trim()) {
    return 'Guru Kelas / Wali Kelas';
  }

  const name = rawClassName.trim();
  const lower = name.toLowerCase();

  if (lower === 'semua kelas' || lower === 'semua' || lower === 'all') {
    return 'Guru Kelas / Wali Kelas';
  }

  // Bersihkan prefiks kata "Kelas" atau "kelas" yang sudah ada
  const cleanClassName = name.replace(/^kelas\s*/i, '').trim();

  if (!cleanClassName) {
    return 'Guru Kelas / Wali Kelas';
  }

  return `Guru Kelas ${cleanClassName} / Wali Kelas`;
}
