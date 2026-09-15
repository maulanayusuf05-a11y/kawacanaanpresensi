import QRCode from 'qrcode';
import { SchoolClass } from '../types';

export interface ClassQrData {
  app: 'KAWACANAAN_PRESENSI';
  version: string;
  classId: string;
  className: string;
  grade: number;
  schoolId?: string;
  createdTime?: number;
}

export function generateClassQrPayload(classItem: SchoolClass, schoolId?: string | null): string {
  const payload: ClassQrData = {
    app: 'KAWACANAAN_PRESENSI',
    version: '1.0',
    classId: classItem.id,
    className: classItem.name,
    grade: classItem.grade,
    schoolId: schoolId || undefined,
  };
  return JSON.stringify(payload);
}

export function parseClassQrPayload(raw: string): {
  valid: boolean;
  classId?: string;
  className?: string;
  grade?: number;
  error?: string;
} {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Kode QR kosong atau tidak terbaca.' };
  }

  // 1. Try parsing JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.app === 'KAWACANAAN_PRESENSI' && parsed.classId) {
        return {
          valid: true,
          classId: String(parsed.classId),
          className: parsed.className ? String(parsed.className) : undefined,
          grade: parsed.grade ? Number(parsed.grade) : undefined,
        };
      }
      if (parsed.classId) {
        return {
          valid: true,
          classId: String(parsed.classId),
          className: parsed.className ? String(parsed.className) : undefined,
        };
      }
    } catch {
      // not valid json, proceed to text fallback
    }
  }

  // 2. Try prefixed format (e.g. KAWACANAAN:CLASS:classId)
  if (trimmed.startsWith('KAWACANAAN:CLASS:')) {
    const parts = trimmed.split(':');
    const classId = parts[2];
    if (classId) {
      return { valid: true, classId };
    }
  }

  return {
    valid: false,
    error: 'Format QR Code bukan QR Presensi Rombel resmi Kawacanaan.',
  };
}

export async function generateClassQrDataUrl(
  classItem: SchoolClass,
  schoolId?: string | null,
  width: number = 400
): Promise<string> {
  const payload = generateClassQrPayload(classItem, schoolId);
  return QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a', // Deep slate / navy
      light: '#ffffff',
    },
  });
}
