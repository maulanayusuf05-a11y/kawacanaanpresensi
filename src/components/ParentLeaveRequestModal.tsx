import React, { useState, useRef } from 'react';
import {
  X,
  Send,
  Upload,
  Image as ImageIcon,
  FileText,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Student, StudentLeaveRequest } from '../types';

interface ParentLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSubmit: (req: Omit<StudentLeaveRequest, 'id' | 'status' | 'submittedAt'>) => Promise<{ success: boolean; message?: string }>;
  defaultDate?: string;
}

export const ParentLeaveRequestModal: React.FC<ParentLeaveRequestModalProps> = ({
  isOpen,
  onClose,
  student,
  onSubmit,
  defaultDate = new Date().toISOString().slice(0, 10),
}) => {
  const [leaveType, setLeaveType] = useState<'sakit' | 'izin'>('sakit');
  const [subCategory, setSubCategory] = useState<string>('Sakit (Surat Dokter)');
  const [startDate, setStartDate] = useState<string>(defaultDate);
  const [endDate, setEndDate] = useState<string>(defaultDate);
  const [requesterName, setRequesterName] = useState<string>(student.namaWali || '');
  const [requesterRole, setRequesterRole] = useState<'Ayah' | 'Ibu' | 'Wali' | 'Siswa'>(
    (student.hubungannya as any) || 'Orang Tua' === student.hubungannya ? 'Ibu' : 'Ayah'
  );
  const [requesterPhone, setRequesterPhone] = useState<string>(student.noHpWali || '');
  const [reason, setReason] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLeaveTypeChange = (type: 'sakit' | 'izin') => {
    setLeaveType(type);
    if (type === 'sakit') {
      setSubCategory('Sakit (Surat Dokter)');
    } else {
      setSubCategory('Acara Keluarga / Mendesak');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMsg('Harap pilih file gambar (JPG, PNG) atau PDF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB.');
      return;
    }

    setErrorMsg('');
    setAttachmentName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Alasan pengajuan izin / sakit wajib diisi.');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMsg('Nama Orang Tua / Wali pengaju wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await onSubmit({
        studentId: student.id,
        studentName: student.nama,
        nisn: student.nisn,
        classId: student.classId,
        className: student.className,
        requesterName: requesterName.trim(),
        requesterRole,
        requesterPhone: requesterPhone.trim() || undefined,
        leaveType,
        subCategory,
        startDate,
        endDate,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
      });

      if (res.success) {
        onClose();
      } else if (res.message) {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim pengajuan surat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full my-auto overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Surat Izin & Sakit Resmi</h3>
              <p className="text-[11px] text-slate-500">
                Untuk Siswa: <strong className="text-slate-800">{student.nama}</strong> ({student.className || 'Kelas'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toggle Jenis Izin */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Jenis Permohonan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLeaveTypeChange('sakit')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  leaveType === 'sakit'
                    ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs ring-2 ring-sky-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🤒</span>
                <span>Sakit (S)</span>
              </button>
              <button
                type="button"
                onClick={() => handleLeaveTypeChange('izin')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  leaveType === 'izin'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-2 ring-amber-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">📝</span>
                <span>Izin Resmi (I)</span>
              </button>
            </div>
          </div>

          {/* Sub Kategori */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Kategori Keterangan
            </label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
            >
              {leaveType === 'sakit' ? (
                <>
                  <option value="Sakit (Surat Dokter)">Sakit (Dengan Surat Keterangan Dokter)</option>
                  <option value="Sakit (Istirahat di Rumah)">Sakit (Istirahat di Rumah / Rawat Jalan)</option>
                  <option value="Sakit (Rawat Inap / Rumah Sakit)">Sakit (Rawat Inap / Rumah Sakit)</option>
                </>
              ) : (
                <>
                  <option value="Acara Keluarga / Mendesak">Acara Keluarga / Keperluan Mendesak</option>
                  <option value="Dispensasi Kegiatan / Lomba">Dispensasi Kegiatan / Perlombaan Resmi</option>
                  <option value="Ibadah / Keagamaan">Kegiatan Ibadah / Keagamaan</option>
                  <option value="Lainnya">Keperluan Mendesak Lainnya</option>
                </>
              )}
            </select>
          </div>

          {/* Rentang Tanggal Izin */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={11} />
                <span>Mulai Tanggal</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={11} />
                <span>Sampai Tanggal</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Identitas Pengaju (Orang Tua / Wali) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Identitas Pemohon (Orang Tua / Wali)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Contoh: Bapak Hendra"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Hubungan Keluarga
                </label>
                <select
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="Ayah">Ayah Kandung</option>
                  <option value="Ibu">Ibu Kandung</option>
                  <option value="Wali">Wali Murid</option>
                  <option value="Siswa">Siswa Bersangkutan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Phone size={11} className="text-emerald-600" />
                <span>Nomor WhatsApp Aktif</span>
              </label>
              <input
                type="tel"
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Wali kelas dapat menghubungi nomor ini jika membutuhkan konfirmasi.
              </span>
            </div>
          </div>

          {/* Alasan Detail */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Keterangan / Alasan Lengkap
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan kondisi sakit ananda atau alasan keperluan izin secara singkat dan jelas..."
              rows={3}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-600 focus:bg-white resize-none"
            />
          </div>

          {/* Upload Foto Surat Dokter / Bukti Surat Izin */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Lampirkan Foto Surat Dokter / Surat Izin</span>
              <span className="text-slate-400 font-normal">Opsional (Sangat Dianjurkan)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
            />

            {attachmentUrl ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={attachmentUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">
                      {attachmentName || 'Surat_Keterangan.jpg'}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Foto Terlampir
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl bg-slate-50/60 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shadow-2xs">
                  <Upload size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">
                  Ambil Foto / Pilih Berkas Surat
                </span>
                <span className="text-[10px] text-slate-400">
                  Format JPG, PNG, atau PDF (Maks. 5MB)
                </span>
              </button>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-60 transition-all active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Mengirim Permohonan...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Kirim ke Wali Kelas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
