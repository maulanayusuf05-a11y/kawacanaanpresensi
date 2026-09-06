import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const json = (res: any, status: number, body: unknown) =>
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));

// Midtrans Configuration Types
interface MidtransConfig {
  client_key: string;
  server_key: string;
  is_production: boolean;
  merchant_id?: string;
  enabled: boolean;
}

/**
 * Mengambil konfigurasi Midtrans dari database platform_settings atau environment variables.
 * ATURAN KETAT:
 * - Jangan pernah ada nilai default/fallback palsu atau hardcoded keys.
 * - MIDTRANS_IS_PRODUCTION untuk kondisi sekarang harus bernilai false (Sandbox).
 * - Server Key hanya disimpan dan digunakan di backend/server-side.
 */
async function getMidtransConfig(db: any): Promise<MidtransConfig> {
  let dbConfig: any = null;
  try {
    const { data } = await db.from('platform_settings').select('integrations').eq('id', 1).single();
    dbConfig = data?.integrations?.midtrans_config;
  } catch (_) {}

  // Sesuai instruksi: MIDTRANS_IS_PRODUCTION untuk kondisi sekarang harus bernilai false
  const isProd = false;

  // Nilai diambil murni dari DB atau Environment Variable tanpa nilai pengganti/dummy jika kosong
  const clientKey =
    dbConfig?.client_key?.trim() ||
    process.env.MIDTRANS_CLIENT_KEY?.trim() ||
    '';

  const serverKey =
    dbConfig?.server_key?.trim() ||
    process.env.MIDTRANS_SERVER_KEY?.trim() ||
    '';

  const merchantId =
    dbConfig?.merchant_id?.trim() ||
    process.env.MIDTRANS_MERCHANT_ID?.trim() ||
    '';

  const enabled =
    dbConfig?.enabled !== undefined
      ? Boolean(dbConfig.enabled)
      : Boolean(clientKey && serverKey);

  return {
    client_key: clientKey,
    server_key: serverKey,
    is_production: isProd,
    merchant_id: merchantId,
    enabled,
  };
}

export default async function handler(req: any, res: any) {
  // Allow POST and GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) {
    return json(res, 500, { error: 'Supabase server configuration is missing.' });
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const midtrans = await getMidtransConfig(db);

  const b = req.body || {};
  const q = req.query || {};
  const action = b.action || q.action || '';

  // --------------------------------------------------------------------------
  // 1. GET PUBLIC CLIENT CONFIG (Client Key & Environment Mode)
  // Aman dipanggil frontend karena Server Key TIDAK dibagikan.
  // --------------------------------------------------------------------------
  if (action === 'get_client_config' || (req.method === 'GET' && !b.order_id && !q.order_id)) {
    const isConfigured = Boolean(midtrans.client_key && midtrans.server_key);
    return json(res, 200, {
      ok: true,
      client_key: midtrans.client_key || '',
      is_production: false, // Selalu false untuk Sandbox
      enabled: midtrans.enabled && isConfigured,
      is_configured: isConfigured,
      snap_url: 'https://app.sandbox.midtrans.com/snap/snap.js',
    });
  }

  // --------------------------------------------------------------------------
  // 2. MIDTRANS WEBHOOK NOTIFICATION HANDLER
  // Dipanggil otomatis oleh Midtrans saat ada perubahan status pembayaran.
  // --------------------------------------------------------------------------
  const isWebhookNotification = Boolean(
    b.order_id && b.status_code && b.signature_key && (b.transaction_status || b.status_message)
  );

  if (isWebhookNotification || action === 'webhook') {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = b;

    if (!order_id || !signature_key) {
      return json(res, 400, { error: 'Invalid notification payload' });
    }

    if (!midtrans.server_key) {
      console.error('[Midtrans Webhook] Server Key belum dikonfigurasi di server');
      return json(res, 500, { error: 'Midtrans Server Key belum dikonfigurasi di server.' });
    }

    // Verifikasi Signature SHA512
    const inputSig = `${order_id}${status_code}${gross_amount}${midtrans.server_key}`;
    const expectedSig = crypto.createHash('sha512').update(inputSig).digest('hex');

    if (signature_key !== expectedSig) {
      console.warn(`[Midtrans Webhook] Invalid signature for order: ${order_id}`);
      return json(res, 403, { error: 'Signature verification failed' });
    }

    console.log(`[Midtrans Webhook] Received status ${transaction_status} for ${order_id}`);

    // Tentukan apakah pembayaran berhasil
    const isSuccess =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    const isFailed =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    const dbStatus = isSuccess ? 'SETTLED' : isFailed ? 'EXPIRED' : 'PENDING';

    // Cari transaksi di tabel payments
    const { data: existingPayment } = await db
      .from('payments')
      .select('*')
      .eq('invoice_no', order_id)
      .single();

    if (existingPayment) {
      // Update status pembayaran
      await db
        .from('payments')
        .update({
          status: dbStatus,
          payment_method: payment_type || 'MIDTRANS',
          paid_at: isSuccess ? new Date().toISOString() : existingPayment.paid_at,
        })
        .eq('invoice_no', order_id);

      // Jika berhasil, perpanjang masa aktif langganan sekolah / guru
      if (isSuccess && existingPayment.school_id) {
        const { data: school } = await db
          .from('schools')
          .select('*')
          .eq('id', existingPayment.school_id)
          .single();

        if (school) {
          const isYearly =
            existingPayment.plan_name?.toLowerCase().includes('tahun') ||
            existingPayment.amount >= 200000;
          const durationDays = isYearly ? 365 : 30;

          // Hitung tanggal kedaluwarsa baru
          const now = new Date();
          const currentExpiry = school.subscription_expires_at
            ? new Date(school.subscription_expires_at)
            : now;

          const baseDate = currentExpiry > now ? currentExpiry : now;
          const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

          const targetPlan = existingPayment.plan_name?.toLowerCase().includes('guru')
            ? 'guru_pro'
            : 'sekolah_pro';

          await db
            .from('schools')
            .update({
              status: 'active',
              plan: targetPlan,
              subscription_expires_at: newExpiry.toISOString(),
            })
            .eq('id', school.id);

          // Catat audit log
          await db.from('audit_logs').insert({
            school_id: school.id,
            actor_name: 'Midtrans Payment Gateway',
            actor_role: 'SYSTEM',
            action: 'MIDTRANS_PAYMENT_SETTLED',
            details: {
              order_id,
              gross_amount,
              payment_type,
              previous_expiry: school.subscription_expires_at,
              new_expiry: newExpiry.toISOString(),
            },
          });
        }
      }
    }

    return json(res, 200, { ok: true, message: 'Notification processed successfully' });
  }

  // --------------------------------------------------------------------------
  // 3. CREATE SNAP TRANSACTION
  // --------------------------------------------------------------------------
  if (action === 'create_transaction') {
    // Validasi konfigurasi server-side
    if (!midtrans.server_key) {
      return json(res, 400, {
        error: 'Midtrans Server Key belum dikonfigurasi. Harap atur MIDTRANS_SERVER_KEY di environment variables atau di Super Admin.',
        code: 'MIDTRANS_SERVER_KEY_MISSING'
      });
    }

    if (!midtrans.client_key) {
      return json(res, 400, {
        error: 'Midtrans Client Key belum dikonfigurasi. Harap atur MIDTRANS_CLIENT_KEY di environment variables atau di Super Admin.',
        code: 'MIDTRANS_CLIENT_KEY_MISSING'
      });
    }

    if (!midtrans.enabled) {
      return json(res, 400, { error: 'Gateway pembayaran Midtrans sedang dinonaktifkan oleh administrator.' });
    }

    const {
      plan_id = 'teacher',
      billing_cycle = 'monthly',
      school_id,
      school_name,
      npsn,
      contact_name,
      contact_phone,
      email,
    } = b;

    // Ambil harga dari konfigurasi paket di database jika ada
    let packagesConfig: any = null;
    try {
      const { data } = await db.from('platform_settings').select('integrations').eq('id', 1).single();
      packagesConfig = data?.integrations?.platform_config?.packages_config;
    } catch (_) {}

    const isSchool = plan_id === 'school' || plan_id === 'sekolah_pro';
    const isYearly = billing_cycle === 'yearly';

    let amount = 0;
    let planTitle = '';

    if (isSchool) {
      const schConfig = packagesConfig?.sekolah_pro;
      amount = isYearly
        ? (schConfig?.hargaTahunan ?? 2490000)
        : (schConfig?.hargaBulanan ?? schConfig?.harga ?? 249000);
      planTitle = `Paket Sekolah Dasar (${isYearly ? '1 Tahun' : '1 Bulan'})`;
    } else {
      const teachConfig = packagesConfig?.guru_pro;
      amount = isYearly
        ? (teachConfig?.hargaTahunan ?? 290000)
        : (teachConfig?.hargaBulanan ?? teachConfig?.harga ?? 29000);
      planTitle = `Paket Guru Mandiri (${isYearly ? '1 Tahun' : '1 Bulan'})`;
    }

    // Buat Order ID Unik
    const cleanPrefix = isSchool ? 'SCH' : 'GRU';
    const timeStamp = Math.floor(Date.now() / 1000);
    const randomSuffix = Math.floor(Math.random() * 899 + 100);
    const orderId = `KWC-${cleanPrefix}-${timeStamp}-${randomSuffix}`;

    // Sesuai konteks: Selalu gunakan Sandbox Endpoint
    const snapEndpoint = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = `Basic ${Buffer.from(`${midtrans.server_key}:`).toString('base64')}`;

    const snapPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: (contact_name || 'Pelanggan Kawacanaan').slice(0, 50),
        email: email || 'billing@kawacanaan.id',
        phone: contact_phone || '081234567890',
      },
      item_details: [
        {
          id: `${plan_id}_${billing_cycle}`,
          price: amount,
          quantity: 1,
          name: planTitle.slice(0, 50),
        },
      ],
      expiry: {
        unit: 'minute',
        duration: 60 * 24, // 24 jam batas pembayaran
      },
    };

    try {
      const snapRes = await fetch(snapEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(snapPayload),
      });

      const snapData = await snapRes.json();

      if (!snapRes.ok || !snapData.token) {
        console.error('[Midtrans Snap Error]', snapData);
        return json(res, snapRes.status || 400, {
          error: snapData.error_messages?.join(', ') || 'Gagal membuat sesi pembayaran Midtrans Snap.',
          details: snapData,
        });
      }

      // Catat transaksi awal di tabel payments
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      await db.from('payments').upsert(
        {
          invoice_no: orderId,
          school_id: school_id || null,
          plan_name: planTitle,
          amount: amount,
          unique_code: 0,
          total_amount: amount,
          status: 'PENDING',
          payment_method: 'MIDTRANS',
          school_name: school_name || 'Sekolah Dasar',
          npsn: npsn || null,
          contact_name: contact_name || 'Wali Kelas / Guru',
          contact_phone: contact_phone || null,
          email: email || null,
          created_at: now.toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'invoice_no' }
      );

      return json(res, 200, {
        ok: true,
        order_id: orderId,
        snap_token: snapData.token,
        redirect_url: snapData.redirect_url,
        amount,
        plan_title: planTitle,
        client_key: midtrans.client_key,
        is_production: midtrans.is_production,
      });
    } catch (err: any) {
      console.error('[Midtrans Request Failed]', err);
      return json(res, 500, {
        error: `Koneksi ke Midtrans gagal: ${err?.message || 'Network error'}`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. CHECK TRANSACTION STATUS (Manual Inquiry via Midtrans Core API)
  // --------------------------------------------------------------------------
  if (action === 'check_status') {
    const orderId = b.order_id || q.order_id;
    if (!orderId) {
      return json(res, 400, { error: 'order_id wajib diisi' });
    }

    if (!midtrans.server_key) {
      return json(res, 400, {
        error: 'Midtrans Server Key belum dikonfigurasi di server. Harap isi variabel MIDTRANS_SERVER_KEY.',
        code: 'MIDTRANS_SERVER_KEY_MISSING'
      });
    }

    // Sesuai konteks: Selalu gunakan Sandbox Endpoint
    const checkUrl = `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const authHeader = `Basic ${Buffer.from(`${midtrans.server_key}:`).toString('base64')}`;

    try {
      const response = await fetch(checkUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: authHeader,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        return json(res, response.status, { error: data.status_message || 'Gagal cek status' });
      }

      const isSuccess =
        data.transaction_status === 'settlement' ||
        (data.transaction_status === 'capture' && data.fraud_status === 'accept');

      if (isSuccess) {
        const { data: existingPayment } = await db
          .from('payments')
          .select('*')
          .eq('invoice_no', orderId)
          .single();

        await db
          .from('payments')
          .update({
            status: 'SETTLED',
            paid_at: new Date().toISOString(),
            payment_method: data.payment_type || 'MIDTRANS',
          })
          .eq('invoice_no', orderId);

        if (existingPayment && existingPayment.status !== 'SETTLED' && existingPayment.school_id) {
          const { data: school } = await db
            .from('schools')
            .select('*')
            .eq('id', existingPayment.school_id)
            .single();

          if (school) {
            const isYearly =
              existingPayment.plan_name?.toLowerCase().includes('tahun') ||
              existingPayment.amount >= 200000;
            const durationDays = isYearly ? 365 : 30;

            const now = new Date();
            const currentExpiry = school.subscription_expires_at
              ? new Date(school.subscription_expires_at)
              : now;

            const baseDate = currentExpiry > now ? currentExpiry : now;
            const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            const targetPlan = existingPayment.plan_name?.toLowerCase().includes('guru')
              ? 'guru_pro'
              : 'sekolah_pro';

            await db
              .from('schools')
              .update({
                status: 'active',
                plan: targetPlan,
                subscription_expires_at: newExpiry.toISOString(),
              })
              .eq('id', school.id);

            await db.from('audit_logs').insert({
              school_id: school.id,
              actor_name: 'Midtrans Status Check',
              actor_role: 'SYSTEM',
              action: 'MIDTRANS_STATUS_CHECK_SETTLED',
              details: {
                order_id: orderId,
                previous_expiry: school.subscription_expires_at,
                new_expiry: newExpiry.toISOString(),
              },
            });
          }
        }
      }

      return json(res, 200, {
        ok: true,
        status: data.transaction_status,
        payment_type: data.payment_type,
        gross_amount: data.gross_amount,
        is_settled: isSuccess,
      });
    } catch (err: any) {
      return json(res, 500, { error: err.message });
    }
  }

  return json(res, 400, { error: 'Aksi Midtrans tidak dikenali.' });
}
