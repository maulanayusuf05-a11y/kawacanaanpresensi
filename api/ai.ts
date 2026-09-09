import { createClient } from '@supabase/supabase-js';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

const SYSTEM_PROMPT = `Kamu adalah AI Assistant Absensi untuk aplikasi KawaCanaan Presensi.
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
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        geminiApiKey
      )}`;

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

      const geminiResponse = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents: geminiContents,
        }),
      });

      const geminiData = await geminiResponse.json();

      if (!geminiResponse.ok || geminiData?.error) {
        const errorMsg = geminiData?.error?.message || `Gemini HTTP status ${geminiResponse.status}`;
        console.error('[AI Assistant API] Gemini error:', errorMsg);
        return json(res, 502, {
          ok: false,
          error: 'AI sedang tidak dapat digunakan. Silakan coba lagi.',
        });
      }

      rawAnswer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
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
