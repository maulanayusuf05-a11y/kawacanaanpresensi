import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const SYSTEM_PROMPT = `Kamu adalah Asisten Absensi untuk aplikasi administrasi khusus jenjang sekolah dasar.
Jawab berdasarkan DATA ABSENSI yang diberikan aplikasi.
Jangan mengarang data.
Jangan membuat nama siswa, angka, tanggal, atau status yang tidak terdapat dalam data.
Jika data tidak cukup, katakan bahwa data tidak cukup.
Gunakan Bahasa Indonesia yang jelas, singkat, profesional, dan mudah dipahami guru.
Kamu hanya boleh menganalisis data yang diberikan dalam konteks.
Kamu tidak memiliki akses langsung ke database.
Jangan mengklaim telah melakukan tindakan yang sebenarnya tidak dilakukan.
Jika pertanyaan membutuhkan perhitungan sederhana seperti jumlah siswa, persentase, jumlah hadir, sakit, izin, alfa, atau keterlambatan, hitung berdasarkan data yang diberikan.`;

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

  // 5. Verify Cloudflare Workers AI credentials (server-side only, never returned)
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!cfAccountId || !cfApiToken) {
    return json(res, 500, {
      ok: false,
      error: 'Konfigurasi CLOUDFLARE_ACCOUNT_ID atau CLOUDFLARE_API_TOKEN belum tersedia pada server/Vercel environment.',
    });
  }

  // 6. Parse and validate request body
  const body = req.body || {};
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

  // 7. Call Cloudflare Workers AI REST API
  // Model: @cf/zai-org/glm-4.7-flash
  const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    cfAccountId
  )}/ai/run/@cf/zai-org/glm-4.7-flash`;

  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n=== DATA ABSENSI & KONTEKS GURU ===\n${
        sanitizedContext || 'Data absensi belum tersedia atau kosong untuk konteks saat ini.'
      }`,
    },
    {
      role: 'user',
      content: sanitizedQuestion,
    },
  ];

  try {
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
        error: `Gagal memperoleh respon dari Cloudflare AI: ${errorMsg}`,
      });
    }

    // Extract answer from Cloudflare response safely across potential schema structures
    const answer =
      cfData?.result?.response ||
      cfData?.result?.output ||
      cfData?.result?.text ||
      cfData?.result?.choices?.[0]?.message?.content ||
      (typeof cfData?.result === 'string' ? cfData.result : null);

    if (!answer) {
      return json(res, 200, {
        ok: true,
        answer: 'Maaf, model AI tidak memberikan jawaban. Silakan coba ajukan pertanyaan kembali dengan kalimat lain.',
      });
    }

    return json(res, 200, {
      ok: true,
      answer: String(answer).trim(),
    });
  } catch (err: any) {
    console.error('[AI Assistant API] Execution error:', err?.message);
    return json(res, 500, {
      ok: false,
      error: err?.message || 'Terjadi kesalahan sistem saat menghubungi layanan AI.',
    });
  }
}
