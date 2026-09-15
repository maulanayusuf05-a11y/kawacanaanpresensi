import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  User,
  Phone,
  MessageSquare,
  Eye,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Check,
} from 'lucide-react';
import type { StudentLeaveRequest } from '../types';
import { LeaveAttachmentLightbox } from './LeaveAttachmentLightbox';

interface TeacherLeaveApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequests: StudentLeaveRequest[];
  onUpdateStatus: (
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ) => Promise<{ success: boolean; message?: string }>;
  selectedClassName?: string;
}

export const TeacherLeaveApprovalModal: React.FC<TeacherLeaveApprovalModalProps> = ({
  isOpen,
  onClose,
  leaveRequests,
  onUpdateStatus,
  selectedClassName,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredRequests = leaveRequests.filter((req) => {
    if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.studentName.toLowerCase().includes(q);
      const matchNisn = req.nisn?.toLowerCase().includes(q);
      const matchParent = req.requesterName.toLowerCase().includes(q);
      if (!matchName && !matchNisn && !matchParent) return false;
    }
    return true;
  });

  const pendingCount = leaveRequests.filter((r) => r.status === 'PENDING').length;

  const handleApprove = async (id: string) => {
    setIsProcessing(id);
    try {
      await onUpdateStatus(id, 'APPROVED');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSubmit = async (id: string) => {
    setIsProcessing(id);
    try {
      await onUpdateStatus(id, 'REJECTED', rejectReason || 'Ditolak oleh Wali Kelas');
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleChatWhatsApp = (phone: string, studentName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const text = encodeURIComponent(
      `Halo Bapak/Ibu Wali dari ${studentName}, kami dari pihak sekolah terkait surat permohonan izin/sakit yang diajukan...`
    );
    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-blue-200 flex items-center justify-center border border-white/10">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">Verifikasi Surat Izin & Sakit Siswa</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px]">
                    {pendingCount} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200">
                Pengajuan resmi dari Orang Tua / Wali Murid {selectedClassName ? `• ${selectedClassName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disetujui
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({leaveRequests.length})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau wali murid..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700">Tidak ada permohonan surat izin</p>
              <p className="text-xs text-slate-400">
                {filterStatus === 'PENDING'
                  ? 'Semua permohonan izin dan surat dokter telah ditindaklanjuti.'
                  : 'Belum ada data surat izin yang cocok dengan filter saat ini.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs ${
                  req.status === 'PENDING'
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : req.status === 'APPROVED'
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.leaveType === 'sakit'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {req.leaveType === 'sakit' ? '🤒 SAKIT' : '📝 IZIN RESMI'}
                      </span>
                      {req.subCategory && (
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {req.subCategory}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          req.status === 'PENDING'
                            ? 'bg-amber-200 text-amber-900'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {req.status === 'PENDING'
                          ? '⏳ Menunggu Verifikasi'
                          : req.status === 'APPROVED'
                          ? '✅ Disetujui'
                          : '❌ Ditolak'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900">
                      {req.studentName}{' '}
                      <span className="text-xs font-semibold text-slate-500">
                        ({req.className || 'Kelas'} • NISN: {req.nisn || '-'})
                      </span>
                    </h4>

                    {/* Rentang Tanggal & Pengaju */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-600 shrink-0" />
                        <span>
                          Tanggal: <strong className="text-slate-800">{req.startDate}</strong>
                          {req.endDate && req.endDate !== req.startDate ? ` s/d ${req.endDate}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-blue-600 shrink-0" />
                        <span>
                          Pemohon: <strong className="text-slate-800">{req.requesterName}</strong> ({req.requesterRole})
                        </span>
                      </div>
                    </div>

                    {/* Alasan */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 mt-2">
                      <span className="font-bold text-slate-800 block mb-0.5">Alasan / Catatan:</span>
                      <p className="italic">{req.reason}</p>
                    </div>

                    {/* Lampiran Bukti Foto Surat Dokter */}
                    {req.attachmentUrl && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxImage(req.attachmentUrl!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Lihat Foto Surat Dokter / Bukti Izin</span>
                        </button>
                      </div>
                    )}

                    {/* Informasi Review Sebelumnya */}
                    {req.reviewedBy && (
                      <div className="text-[10px] text-slate-500 pt-1">
                        Diverifikasi oleh: <strong className="text-slate-700">{req.reviewedBy}</strong>
                        {req.reviewNotes ? ` (${req.reviewNotes})` : ''}
                      </div>
                    )}
                  </div>

                  {/* Action Column */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    {req.requesterPhone && (
                      <button
                        type="button"
                        onClick={() => handleChatWhatsApp(req.requesterPhone!, req.studentName)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                        title="Chat WA Orang Tua"
                      >
                        <MessageSquare size={13} />
                        <span>Chat WA Ortu</span>
                      </button>
                    )}

                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isProcessing === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                        >
                          <Check size={13} />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing === req.id}
                          onClick={() => setRejectingId(req.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer transition-all"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reject note inline box */}
                {rejectingId === req.id && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-900">Masukkan alasan penolakan izin:</p>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Contoh: Surat dokter belum dilampirkan atau tanggal tidak sesuai..."
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-medium text-slate-800 outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSubmit(req.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg"
                      >
                        Konfirmasi Tolak
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menyetujui izin otomatis mencatat status Sakit/Izin di daftar absensi siswa.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox for previewing doctor notes / letters */}
      {lightboxImage && (
        <LeaveAttachmentLightbox
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage}
        />
      )}
    </div>
  );
};
