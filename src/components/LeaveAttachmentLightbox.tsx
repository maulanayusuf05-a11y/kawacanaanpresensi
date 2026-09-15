import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface LeaveAttachmentLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const LeaveAttachmentLightbox: React.FC<LeaveAttachmentLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Bukti Surat Izin / Keterangan Dokter',
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h3>
            <p className="text-[11px] text-slate-500">Lampiran bukti permohonan ketidakhadiran</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
              title="Buka di tab baru"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-slate-200"
          />
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Format: Gambar Dokumen Digital</span>
          <a
            href={imageUrl}
            download="surat-izin.png"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold"
          >
            <Download size={14} />
            <span>Unduh Berkas</span>
          </a>
        </div>
      </div>
    </div>
  );
};
