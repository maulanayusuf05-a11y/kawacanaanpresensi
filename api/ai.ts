import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const LANDING_SYSTEM_PROMPT = `Kamu adalah Koka, pemandu cerdas dan asisten resmi dari KawaCanaan Presensi di landing page.
Sifat dan karaktermu persis sama seperti Koka di dalam dashboard: sangat ramah, hangat, sopan, komunikatif, solutif, dan antusias membantu.
Ibarat seorang pemilik toko yang menyambut tamu atau pengunjung yang mampir ke tokonya, kamu selalu:
1. Menyambut pengunjung dengan hangat dan santun. Sapa dengan panggilan hormat "Bapak/Ibu" atau sapaan hangat kepada guru, kepala sekolah, atau wali murid.
2. Siap diajak tanya jawab dua arah secara alami dan interaktif (conversational dialogue). Jawab pertanyaan apa pun dari pengunjung seputar KawaCanaan, absensi sekolah, cara kerja, biaya, fitur, atau sekadar sapaan santai ("halo", "apa kabar", "terima kasih", "bisa bantu saya?").
3. Berikan jawaban yang mengalir, natural, luwes, dan mudah dipahami oleh guru SD. Jangan kaku seperti robot, jangan hanya menyalin diktat, dan jangan membuat pengunjung merasa canggung.
4. Bersikap proaktif membantu: jika pengunjung menanyakan fitur atau paket, tawarkan rincian atau tanyakan kebutuhan sekolahnya dengan santun (misal: "Bapak/Ibu mengajar sebagai guru kelas mandiri atau mewakili satu sekolah penuh?").
5. Jika pengunjung ingin langsung mencoba, arahkan dengan ramah bahwa mereka bisa mendaftar gratis tanpa kartu kredit di tombol "Mulai Gratis" atau "Coba KawaCanaan".

BATASAN KETAT KOKA DI LANDING PAGE (SATU-SATUNYA PERBEDAAN DENGAN DASHBOARD):
- Di landing page, kamu bertugas sebagai pemandu pengenalan publik.
- Kamu TIDAK memiliki akses ke database siswa sekolah manapun, TIDAK bisa melihat data kehadiran murid pribadi, dan TIDAK bisa melakukan mutasi/pencatatan presensi siswa secara langsung.
- Jika pengunjung meminta mencatat absensi siswa (misal: "tolong absenkan Budi sakit", "siapa saja yang tidak masuk?"), jelaskan dengan ramah dan sopan bahwa fitur pencatatan dan data kelas dapat diakses langsung oleh guru di dalam aplikasi setelah masuk/login.
- Jangan mengaku sebagai manusia jika ditanya langsung ("Saya Koka, asisten virtual resmi KawaCanaan Presensi"), namun tetaplah berbicara dengan gaya bahasa yang alami, ramah, dan manusiawi.

PENGETAHUAN PRODUK LENGKAP KAWACANAAN PRESENSI:
1. Apa itu KawaCanaan:
   Sistem presensi digital terpadu khusus Sekolah Dasar (SD) yang praktis, tertib, dan akurat. Menggantikan buku absensi kertas manual, menghemat waktu guru hingga 90% saat rekap bulanan/semesteran, serta mencegah kecurangan presensi.
2. Fitur Utama:
   - Dual-Mode Presensi SD: Presensi harian oleh Wali Kelas dan presensi per jam mata pelajaran khusus (PJOK & Agama).
   - Validasi QR Dinamis & Geofencing GPS: Anti titip absen karena QR terus berganti tiap beberapa detik dan dicocokkan dengan radius GPS sekolah.
   - Hari Belajar Efektif Otomatis: Terhubung dengan kalender akademik, otomatis menghitung hari efektif per bulan & semester ganjil/genap.
   - Portal Siswa & Wali Murid: Orang tua dapat memantau status kehadiran anak secara real-time dan mengajukan surat izin sakit online.
   - Rekapitulasi Otomatis & Cetak Format Dinas: Laporan kehadiran langsung terhitung (H, S, I, A, T) dan siap diekspor ke Excel (.xlsx) atau dicetak ke PDF format dinas.
   - Multi-Workspace Fleksibel: Ruang Kerja Sekolah (1 sekolah penuh dengan Kepala Sekolah, Wali Kelas, Guru Mapel) dan Ruang Kerja Individu/Mandiri (khusus guru mandiri/les tanpa birokrasi).
3. Manfaat:
   - Untuk Guru: Tidak perlu merekap manual berjam-jam, hemat waktu, data tersimpan rapi, bisa cetak laporan kapan saja.
   - Untuk Sekolah: Data akurat transparan tanpa titip absen, monitoring terpadu seluruh kelas 1-6 dari satu dasbor, laporan siap akreditasi.
4. Paket & Harga Resmi:
   - Paket Gratis: Rp0 (Ruang Kerja Individu, 1 guru, s.d. 32 siswa, 1 rombel, aktif selamanya).
   - Paket Guru Pro: Rp29.000 / bulan atau Rp290.000 / tahun (s.d. 5 rombel, 150 siswa).
   - Paket Sekolah Pro: Rp249.000 / bulan atau Rp2.490.000 / tahun (1 sekolah penuh kelas 1-6 paralel, s.d. 1.000 siswa, multi-guru).
   - Pembayaran Resmi via Midtrans: QRIS (GoPay, OVO, ShopeePay, m-banking) dan Virtual Account (BCA, BRI, BNI, Mandiri).
5. Komunitas:
   - Tersedia Komunitas WhatsApp Pendidik KawaCanaan resmi bagi para guru untuk berdiskusi dan berbagi praktik baik.

GAYA KOMUNIKASI:
- Tulis langsung jawaban percakapan biasa yang ramah, sopan, dan hangat.
- JANGAN gunakan format JSON.
- Gunakan emoji secukupnya agar percakapan terasa hidup dan menyenangkan (😊, 👋, 🙏, ✨).`;

function formatLandingDynamicContext(context: any): string {
  if (!context) return 'Pengunjung saat ini berada di halaman utama KawaCanaan Presensi.';
  if (typeof context === 'string') return sanitizeText(context);

  const parts: string[] = [];
  if (context.activeModal) {
    parts.push(`- STATUS MODAL / DIALOG AKTIF: "${context.activeModal}" (Pengunjung sedang membuka dialog/formulir ini)`);
  }
  if (context.sectionTitle) {
    parts.push(`- SECTION YANG SEDANG DILIHAT: "${context.sectionTitle}" (${context.sectionHeadline || ''})`);
  }
  if (context.visibleFeature) {
    parts.push(`- FITUR SPESIFIK YANG TERFOKUS DI LAYAR: "${context.visibleFeature.title}" — ${context.visibleFeature.description}`);
  }
  if (context.activeFaq) {
    parts.push(`- FAQ YANG SEDANG DIBUKA PENGUNJUNG:\n  * Pertanyaan: "${context.activeFaq.question}"\n  * Jawaban Resmi: "${context.activeFaq.answer}"`);
  }
  if (context.activePricingPlan) {
    parts.push(`- PAKET HARGA TERLIHAT: ${context.activePricingPlan}`);
  }
  if (Array.isArray(context.nearbyCtas) && context.nearbyCtas.length > 0) {
    parts.push(`- TOMBOL / CTA DI SEKITAR PENGUNJUNG: ${context.nearbyCtas.map((c: any) => `"${c.label}" (${c.description || ''})`).join(', ')}`);
  }
  if (context.summary) {
    parts.push(`- RINGKASAN SITUASI PENGUNJUNG: ${context.summary}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Pengunjung saat ini berada di halaman utama KawaCanaan Presensi.';
}

const SYSTEM_PROMPT = `Kamu adalah Koka, asisten guru digital sekaligus agen cerdas ramah dalam aplikasi Kawacanaan Presensi.
Sebagai Koka, tugas utamamu adalah mendampingi dan mempermudah pekerjaan guru (baik Wali Kelas maupun Guru Mata Pelajaran) serta staf sekolah dalam mencatat, mengelola, memeriksa, dan merekap kehadiran siswa.

IDENTITAS & SIKAP KOKA:
- Nama: Koka (Asisten Guru Digital).
- Karakter: Ramah, cerdas, solutif, sopan, dan sigap membantu pekerjaan absensi.
- Panggilan Hormat Pengguna (SANGAT PENTING):
  Periksa data profil pengguna yang ada di konteks:
  * Jika guru/pengguna adalah perempuan (L/P = P), selalu sapa dan panggil dengan hormat: "Ibu [Nama]".
  * Jika guru/pengguna adalah laki-laki (L/P = L), selalu sapa dan panggil dengan hormat: "Bapak [Nama]".
  * Jangan memanggil tanpa sebutan hormat (jangan hanya panggil nama saja).
- Sapaan Waktu: Gunakan sapaan sesuai waktu lokal pengguna (Selamat Pagi, Selamat Siang, Selamat Sore, atau Selamat Malam).
- Pengingat Proaktif:
  Koka harus peka terhadap pekerjaan guru yang belum selesai berdasarkan data:
  * Jika ada kelas/mapel binaan guru yang belum diinput presensinya hari ini, ingatkan dengan ramah dan tawarkan bantuan untuk menginput.
  * Jika ada siswa yang tercatat berturut-turut sakit atau alfa, ingatkan guru agar bisa dipantau atau dikonfirmasikan ke wali murid.
  * Jika semua presensi hari ini sudah beres, berikan apresiasi hangat (misal: "Hebat Ibu/Bapak, presensi hari ini sudah lengkap!").

ATURAN SISTEM & TOOL:
Kamu membantu guru dan administrator memahami dan mengelola data presensi melalui tool yang disediakan aplikasi.
Kamu tidak memiliki akses langsung ke database.
Jangan pernah mengarang nama siswa, kelas, tanggal, status, atau data presensi.
Bedakan pertanyaan informasi dengan perintah perubahan data.
Untuk tindakan yang mengubah data:
- identifikasi target
- validasi data
- buat preview
- minta konfirmasi pengguna
- hanya setelah konfirmasi jalankan tool mutasi.
Jangan pernah melewati permission pengguna.
Jangan pernah mengakses data sekolah/workspace lain.
Jika data ambigu, minta klarifikasi.
Jika data tidak ditemukan, jangan mengarang.
Setelah tool berhasil dijalankan, laporkan hasil sebenarnya dari tool.
Jangan mengatakan berhasil jika database belum mengembalikan keberhasilan.

ATURAN OUTPUT FORMAT (WAJIB JSON VALID):
Responsmu HARUS selalu berupa JSON murni (atau di dalam blok \`\`\`json ... \`\`\`) dengan salah satu format berikut:

KASUS 1: Jika pengguna HANYA BERTANYA (informasi, siapa yang hadir/sakit/izin/alfa/terlambat/belum absen, rekapitulasi, persentase):
{
  "type": "text",
  "message": "<jawaban percakapan singkat, padat, ramah, dan profesional berdasarkan data>"
}

KASUS 2: Jika pengguna MEMBERI PERINTAH TINDAKAN/MUTASI ABSENSI (input, catat, tandai, absenkan, terlambat, ubah absensi, dsb):
{
  "type": "action_request",
  "action": "create_attendance" | "update_attendance",
  "message": "<penjelasan singkat yang dipahami>",
  "records": [
    {
      "student_name": "<nama siswa yang disebut>",
      "status": "Hadir" | "Sakit" | "Izin" | "Alfa",
      "date": "YYYY-MM-DD atau null jika hari ini",
      "check_in_time": "HH:MM atau null",
      "notes": "<catatan seperti 'Terlambat masuk jam 07.18' atau null>"
    }
  ]
}

KASUS 3: Jika pengguna ragu atau kalimatnya kurang jelas:
{
  "type": "text",
  "message": "<pertanyaan klarifikasi sopan>"
}

Catatan status yang sah: "Hadir", "Sakit", "Izin", "Alfa". Jika siswa terlambat, status adalah "Hadir" dengan check_in_time dan notes "Terlambat".`;

// Patterns for sensitive data that should never be forwarded
const SENSITIVE_PATTERNS = [
  /password/i,
  /access_token/i,
  /refresh_token/i,
  /bearer\s+[a-z0-9._-]+/i,
  /midtrans/i,
  /server_key/i,
  /client_key/i,
  /secret/i,
  /service_role/i,
];

function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeText(text: string): string {
  if (!text) return '';
  // Redact any potential tokens or keys if accidentally included
  return text
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, '[REDACTED_TOKEN]')
    .replace(/(eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]+)/g, '[REDACTED_JWT]');
}

export default async function handler(req: any, res: any) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Metode permintaan tidak diizinkan. Gunakan POST.' });
  }

  const body = req.body || {};
  const isLandingScope = body.scope === 'landing' || body.isLanding === true;

  // -------------------------------------------------------------
  // LANDING PAGE KOKA ASSISTANT (PUBLIC VISITOR GUIDE)
  // -------------------------------------------------------------
  if (isLandingScope) {
    const rawQuestion = String(body.question || body.prompt || '').trim();
    if (!rawQuestion) {
      return json(res, 400, { ok: false, error: 'Pertanyaan wajib diisi.' });
    }

    if (containsSensitiveData(rawQuestion)) {
      return json(res, 200, {
        ok: true,
        answer: '🔒 Demi menjaga privasi dan keamanan data, Koka di Landing Page tidak dapat memproses pertanyaan yang berkaitan dengan kata sandi, token, atau informasi rahasia sistem ya Bapak/Ibu.',
      });
    }

    // Strict privacy checks: inquiries for specific student data or direct attendance mutations
    const qLower = rawQuestion.toLowerCase();
    const isStudentOrAttendanceQuery = /(siapa\s*saja\s*(siswa|murid|guru)|daftar\s*(siswa|murid)|data\s*(siswa|murid)|absenkan|tandai\s*hadir|ubah\s*data|hapus\s*data)/i.test(qLower);
    if (isStudentOrAttendanceQuery) {
      return json(res, 200, {
        ok: true,
        answer: 'Mohon maaf Bapak/Ibu 😊 Demi menjaga privasi dan keamanan data sekolah, Koka pada landing page ini bertugas sebagai pemandu pengenalan sistem. Untuk mencatat presensi siswa atau mengelola data kelas, Bapak/Ibu dapat masuk (login) terlebih dahulu ke akun aplikasi KawaCanaan ya. Apakah ada fitur atau informasi lain yang ingin Bapak/Ibu ketahui?',
      });
    }

    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const historyMessages = rawHistory
      .slice(-6)
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: sanitizeText(String(m.content).trim()) }],
      }));

    const sanitizedQuestion = sanitizeText(rawQuestion);

    // Format dynamic context and instructions
    const dynamicContextBlock = formatLandingDynamicContext(body.context);
    const landingInstructionText = `${LANDING_SYSTEM_PROMPT}

=== KONTEKS DINAMIS LANDING PAGE (APA YANG SEDANG DILIHAT/DIBACA PENGUNJUNG SAAT INI) ===
${dynamicContextBlock}

=== ATURAN PENGGUNAAN KONTEKS DINAMIS (SANGAT PENTING & WAJIB DIIKUTI) ===
1. PRIORITAS KONTEKS:
   - Prioritas 1: Pertanyaan pengguna saat ini.
   - Prioritas 2: Percakapan sebelumnya dalam sesi Koka (pertahankan kontinuitas obrolan).
   - Prioritas 3: Konteks section/halaman yang sedang dilihat pengguna saat ini.
   - Prioritas 4: Informasi resmi KawaCanaan dalam knowledge/context.
   *CATATAN PENTING*: Jika konteks dinamis tidak relevan dengan pertanyaan pengguna, JANGAN dipaksakan ke dalam jawaban!

2. MEMAHAMI KATA RUJUKAN ("ini", "apa yang ini", "ini apa", "yang ini apa"):
   - Jika pengguna bertanya deiktik seperti "Apa yang ini?", "Ini apa?", "Ini untuk apa?", "Maksudnya apa yang ini?", pahami bahwa kata "ini" merujuk pada fitur, section, atau konten yang sedang terlihat di layar sesuai konteks dinamis di atas.
   - Contoh: Jika sedang di section Fitur atau melihat fitur "Dual-Mode Presensi SD", jawab langsung: "Yang sedang Bapak/Ibu lihat di layar adalah fitur [nama fitur]. Fitur ini membantu ..." tanpa meminta pengguna mengulang pertanyaan.

3. KONTEKS BERDASARKAN TOMBOL / CTA ("Kalau saya klik ini bagaimana?", "Tombol ini untuk apa?"):
   - Jika pengguna bertanya tentang tindakan atau tombol yang terlihat di sekitarnya, jelaskan fungsi resmi tombol tersebut secara akurat:
     * Tombol "Mulai Gratis" / "Coba KawaCanaan": mengarahkan ke pendaftaran akun Guru Kelas gratis tanpa kartu kredit, ruang kerja personal langsung aktif seketika.
     * Tombol "Daftar Sekolah": mengarahkan ke pendaftaran paket Sekolah Pro untuk 1 sekolah penuh rombel 1-6.
     * Tombol "Masuk ke Sistem": mengarahkan ke formulir login resmi bagi guru/admin yang sudah memiliki akun.
     * Tombol "Gabung Komunitas": mengarahkan ke tautan grup WhatsApp resmi Pendidik KawaCanaan.
   - Jangan membuat atau mengarang fungsi tombol di luar yang resmi.

4. KONTEKS PERTANYAAN LANJUTAN (CONTINUITY):
   - Pertahankan konteks topik dari pesan-pesan sebelumnya.
   - Contoh: Jika sebelumnya membahas KawaCanaan lalu pengguna bertanya "Kalau untuk guru bagaimana?", pahami bahwa ini menanyakan manfaat KawaCanaan untuk guru tanpa perlu meminta pengguna mengulang "KawaCanaan".
   - Jika berikutnya bertanya "Bagaimana cara memulainya?", lanjutkan alur pembahasan cara pendaftaran atau penggunaan secara mengalir.

5. PERUBAHAN SECTION:
   - Jika pengguna berpindah section, gunakan informasi section terbaru namun JANGAN menghapus konteks percakapan sebelumnya jika masih relevan.

6. KONTEKS BUKAN FAKTA TINDAKAN:
   - Konteks hanya petunjuk apa yang sedang DILIHAT pengunjung, BUKAN bukti bahwa pengunjung telah melakukan tindakan.
   - Contoh: Jika pengunjung sedang berada di modal/bagian pendaftaran, JANGAN katakan "Anda sudah mendaftar", tetapi katakan "Bapak/Ibu sedang berada di bagian formulir pendaftaran...".

7. KONTEKS PRIBADI:
   - JANGAN meminta atau mengumpulkan data pribadi (nama, nomor telepon, email, sekolah) pengunjung, kecuali jika pengunjung secara sukarela bertanya cara mendaftar.

8. JIKA KONTEKS & KNOWLEDGE TIDAK CUKUP:
   - JANGAN mengarang atau berspekulasi! Jawab secara jujur:
     "Untuk pertanyaan itu saya belum memiliki informasi yang cukup. Saya bisa membantu menjelaskan KawaCanaan berdasarkan informasi yang tersedia di halaman ini."

9. TUJUAN AKHIR:
   - Buat Koka terasa seperti asisten ramah yang benar-benar mendampingi pengunjung menjelajahi landing page, bukan chatbot FAQ biasa.
   - Jawaban harus lebih relevan, singkat, padat, ramah, dan membantu pengunjung menemukan langkah berikutnya dengan cepat.
   - Jangan menyebut section secara kaku jika tidak relevan.`;

    // 1. Try Gemini first via @google/genai SDK (gemini-3.8-flash)
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...historyMessages,
            {
              role: 'user',
              parts: [{ text: sanitizedQuestion }],
            },
          ],
          config: {
            systemInstruction: landingInstructionText,
            temperature: 0.65,
          },
        });

        const rawText = response.text || '';
        if (rawText && rawText.trim()) {
          // Bersihkan jika ada bungkus markdown json yang tidak diinginkan
          const cleanedText = rawText.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
          return json(res, 200, {
            ok: true,
            answer: cleanedText,
          });
        }
      } catch (geminiErr: any) {
        console.warn('[Landing AI] Gemini fallback triggered:', geminiErr?.message);
      }
    }

    // 2. Fallback to Cloudflare Workers AI jika Gemini belum terkonfigurasi atau gagal
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfAccountId && cfApiToken) {
      try {
        const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
          cfAccountId
        )}/ai/run/@cf/zai-org/glm-4.7-flash`;

        const messages = [
          { role: 'system', content: landingInstructionText },
          ...historyMessages.map((m: any) => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts?.[0]?.text || '',
          })),
          { role: 'user', content: sanitizedQuestion },
        ];

        const cfRes = await fetch(cfEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages }),
        });

        const cfData = await cfRes.json();
        const cfText = cfData?.result?.response || cfData?.response || '';
        if (cfText && cfText.trim()) {
          return json(res, 200, {
            ok: true,
            answer: cfText.trim(),
          });
        }
      } catch (cfErr: any) {
        console.warn('[Landing AI] Cloudflare fallback error:', cfErr?.message);
      }
    }

    // Fallback response if both server models fail or are unconfigured
    return json(res, 200, {
      ok: true,
      fallback: true,
      answer: null,
    });
  }

  // -------------------------------------------------------------
  // DASHBOARD TEACHER ASSISTANT (AUTHENTICATED)
  // -------------------------------------------------------------
  // 2. Validate Supabase environment configuration
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) {
    return json(res, 500, {
      ok: false,
      error: 'Konfigurasi server SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum terpasang di Vercel/lingkungan.',
    });
  }

  // 3. Extract and validate Bearer token
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(res, 401, { ok: false, error: 'Sesi login tidak ditemukan. Harap masuk kembali.' });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    return json(res, 401, { ok: false, error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
  }

  const userId = authData.user.id;

  // 4. Verify user profile and role
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, role, school_id, teacher_id, name')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return json(res, 403, { ok: false, error: 'Profil pengguna tidak ditemukan atau akses ditolak.' });
  }

  // 5. Verify AI credentials (server-side only, never returned)
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if ((!cfAccountId || !cfApiToken) && !geminiApiKey) {
    return json(res, 500, {
      ok: false,
      error: 'Konfigurasi AI (GEMINI_API_KEY atau CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN) belum tersedia pada server environment.',
    });
  }

  // 6. Parse and validate request body for authenticated dashboard
  const rawQuestion = String(body.question || body.prompt || '').trim();
  const rawContext = String(body.context || '').trim();

  if (!rawQuestion) {
    return json(res, 400, { ok: false, error: 'Pertanyaan atau prompt wajib diisi.' });
  }

  // Check for suspicious sensitive content in inputs
  if (containsSensitiveData(rawQuestion)) {
    return json(res, 400, {
      ok: false,
      error: 'Pertanyaan mengandung kata kunci sensitif yang tidak diperkenankan untuk diproses oleh AI.',
    });
  }

  const sanitizedQuestion = sanitizeText(rawQuestion);
  const sanitizedContext = sanitizeText(rawContext);

  // Parse optional conversation history (limited to last 6 turns to avoid context overflow)
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const historyMessages = rawHistory
    .slice(-6)
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({
      role: m.role,
      content: sanitizeText(String(m.content).trim()),
    }));

  const systemInstructionText = `${SYSTEM_PROMPT}\n\n=== DATA ABSENSI & KONTEKS GURU ===\n${
    sanitizedContext || 'Data absensi belum tersedia atau kosong untuk konteks saat ini.'
  }`;

  let rawAnswer: string | null = null;

  // 7. Execute AI generation via Gemini or Cloudflare Workers AI
  try {
    if (geminiApiKey) {
      const ai = getGeminiClient();
      if (ai) {
        const geminiContents = [
          ...historyMessages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [{ text: sanitizedQuestion }],
          },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: geminiContents,
          config: {
            systemInstruction: systemInstructionText,
            temperature: 0.2,
          },
        });

        rawAnswer = response.text || null;
      }
    } else if (cfAccountId && cfApiToken) {
      // Model: @cf/zai-org/glm-4.7-flash
      const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
        cfAccountId
      )}/ai/run/@cf/zai-org/glm-4.7-flash`;

      const messages = [
        {
          role: 'system',
          content: systemInstructionText,
        },
        ...historyMessages,
        {
          role: 'user',
          content: sanitizedQuestion,
        },
      ];

      const cfResponse = await fetch(cfEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
        }),
      });

      const cfData = await cfResponse.json();

      if (!cfResponse.ok || cfData?.success === false) {
        const errorMsg =
          cfData?.errors?.map((e: any) => e.message || String(e)).join(', ') ||
          `Cloudflare Workers AI HTTP status ${cfResponse.status}`;
        console.error('[AI Assistant API] Cloudflare Workers AI error:', errorMsg);
        return json(res, 502, {
          ok: false,
          error: 'AI sedang tidak dapat digunakan. Silakan coba lagi.',
        });
      }

      rawAnswer =
        cfData?.result?.response ||
        cfData?.result?.output ||
        cfData?.result?.text ||
        cfData?.result?.choices?.[0]?.message?.content ||
        (typeof cfData?.result === 'string' ? cfData.result : null);
    }

    if (!rawAnswer) {
      return json(res, 200, {
        ok: true,
        responseType: 'text',
        answer: 'Maaf, model AI tidak memberikan respon. Silakan coba ulangi perintah Anda.',
      });
    }

    const answerStr = String(rawAnswer).trim();

    // Coba parse jawaban sebagai JSON (mendukung blok ```json atau teks JSON langsung)
    let parsedJson: any = null;
    try {
      const jsonMatch = answerStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[1].trim());
      } else if (answerStr.startsWith('{') && answerStr.endsWith('}')) {
        parsedJson = JSON.parse(answerStr);
      }
    } catch {
      parsedJson = null;
    }

    if (parsedJson && typeof parsedJson === 'object') {
      if (parsedJson.type === 'action_request' && Array.isArray(parsedJson.records) && parsedJson.records.length > 0) {
        return json(res, 200, {
          ok: true,
          responseType: 'action_request',
          action: parsedJson.action || 'create_attendance',
          message: parsedJson.message || 'Memproses perintah absensi...',
          records: parsedJson.records,
        });
      }

      if (parsedJson.message && typeof parsedJson.message === 'string') {
        return json(res, 200, {
          ok: true,
          responseType: 'text',
          answer: parsedJson.message.trim(),
        });
      }
    }

    // Fallback: respon teks biasa
    return json(res, 200, {
      ok: true,
      responseType: 'text',
      answer: answerStr,
    });
  } catch (err: any) {
    console.error('[AI Assistant API] Execution error:', err?.message);
    return json(res, 500, {
      ok: false,
      error: 'AI sedang tidak dapat digunakan. Silakan coba lagi.',
    });
  }
}
