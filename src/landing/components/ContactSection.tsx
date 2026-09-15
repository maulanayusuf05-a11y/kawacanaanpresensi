import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MapPin, 
  MessageSquare, 
  Users, 
  School, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Maximize2, 
  Smartphone, 
  Clock, 
  ChevronRight
} from 'lucide-react';
import QRCode from 'qrcode';
import { KawacanaanEmblem } from '../../components/KawacanaanEmblem';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import kawacanaanLogo from '../../assets/images/kawacanaan_logo_1787055634013.jpg';

interface ContactSectionProps {
  lang: 'ID' | 'EN';
  onOpenRegister?: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ lang, onOpenRegister }) => {
  const whatsappCommunityLink = 'https://chat.whatsapp.com/DfK5WYAavgLJVuHAGFetha?s=cl&p=a&mlu=4&ilr=4';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Generate high-resolution scannable QR Code
  useEffect(() => {
    QRCode.toDataURL(whatsappCommunityLink, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#071F42', // Deep navy for high-contrast scanning
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Gagal membuat QR Code WhatsApp:', err);
      });
  }, [whatsappCommunityLink]);

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsappCommunityLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = whatsappCommunityLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  // Generate downloadable flyer image (canvas export)
  const handleDownloadFlyer = () => {
    if (!qrDataUrl) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 920;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsDownloading(false);
        return;
      }

      // Background
      ctx.fillStyle = '#128C7E'; // WhatsApp green header background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card container
      const cardX = 40;
      const cardY = 120;
      const cardW = 560;
      const cardH = 680;
      const cardRadius = 32;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.fill();

      // Top title text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lang === 'ID' ? 'KOMUNITAS RESMI' : 'OFFICIAL COMMUNITY', canvas.width / 2, 75);

      // QR Image load and draw
      const qrImg = new Image();
      qrImg.onload = () => {
        // Draw Emblem inside white circular pill on top of card
        const emblemImg = new Image();
        emblemImg.onload = () => {
          const emblemSize = 90;
          const emblemX = (canvas.width - emblemSize) / 2;
          const emblemY = cardY - (emblemSize / 2);

          // White ring around emblem
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, cardY, (emblemSize / 2) + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.restore();

          // Clip circle for emblem
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, cardY, emblemSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(emblemImg, emblemX, emblemY, emblemSize, emblemSize);
          ctx.restore();

          // Card Titles
          ctx.fillStyle = '#0B2F64';
          ctx.font = 'bold 30px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Kawacanaan Presensi', canvas.width / 2, cardY + 80);

          ctx.fillStyle = '#64748B';
          ctx.font = '600 18px sans-serif';
          ctx.fillText('Grup WhatsApp', canvas.width / 2, cardY + 110);

          // Draw QR Code
          const qrSize = 360;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = cardY + 140;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // WhatsApp Center Pin on QR
          const pinSize = 54;
          const pinX = (canvas.width - pinSize) / 2;
          const pinY = qrY + (qrSize - pinSize) / 2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, qrY + (qrSize / 2), (pinSize / 2) + 4, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(canvas.width / 2, qrY + (qrSize / 2), pinSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#25D366';
          ctx.fill();
          ctx.restore();

          // Footer instruction on card
          ctx.fillStyle = '#334155';
          ctx.font = '600 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Pindai kode QR ini menggunakan kamera WhatsApp', canvas.width / 2, cardY + 540);
          ctx.fillText('untuk bergabung ke grup ini', canvas.width / 2, cardY + 565);

          // Sub footer tag
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('TERVERIFIKASI RESMI • KAWACANAAN PRESENSI', canvas.width / 2, cardY + 620);

          // Bottom card note
          ctx.fillStyle = '#E2E8F0';
          ctx.font = '13px sans-serif';
          ctx.fillText('https://kawacanaan.sch.id', canvas.width / 2, 855);

          // Trigger download
          const link = document.createElement('a');
          link.download = 'Barcode-QR-WhatsApp-Kawacanaan-Presensi.png';
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setIsDownloading(false);
        };
        emblemImg.src = kawacanaanLogo;
      };
      qrImg.src = qrDataUrl;
    } catch (err) {
      console.error('Gagal mengunduh gambar barcode:', err);
      setIsDownloading(false);
    }
  };

  return (
    <section id="kontak" className="py-14 sm:py-20 lg:py-24 bg-white text-slate-900 relative border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Educational Style */}
        <div className="text-left max-w-3xl space-y-3 sm:space-y-4 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span>{lang === 'ID' ? 'HUBUNGI KAMI & KOMUNITAS' : 'CONTACT & COMMUNITY'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl lg:text-5xl font-black text-[#0B2F64] tracking-tight uppercase leading-[1.08]">
            {lang === 'ID' ? (
              <>
                KONSULTASI & ADOPSI<br />
                <span className="text-blue-600 whitespace-nowrap">PRESENSI SEKOLAH DASAR</span>
              </>
            ) : (
              <>
                CONSULTATION & ADOPTION<br />
                <span className="text-blue-600 whitespace-nowrap">PRIMARY ATTENDANCE</span>
              </>
            )}
          </h2>
          <p className="text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed border-l-4 border-blue-600 pl-3 sm:pl-4 font-normal">
            {lang === 'ID'
              ? 'Konsultasikan kebutuhan presensi rombel kelas 1-6 dan format administrasi Dinas untuk sekolah Anda, atau bergabung langsung dengan komunitas pendidik kami.'
              : 'Consult attendance requirements for Grade 1-6 cohorts and official Dinas reporting formats, or join our educator community directly.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
            <a
              href="#komunitas-wa"
              className="px-5 py-3 sm:px-6 sm:py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider transition-all rounded-lg shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'ID' ? 'GABUNG KOMUNITAS' : 'JOIN COMMUNITY'}</span>
            </a>
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white border border-blue-200 hover:border-blue-700 text-blue-900 font-bold text-xs uppercase tracking-wider transition-all rounded-lg shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <School className="w-4 h-4 text-blue-700" />
              <span>{lang === 'ID' ? 'DAFTARKAN SEKOLAH' : 'REGISTER SCHOOL'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Left (Official Channels) & Right (WhatsApp Community + QR Barcode) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
          
          {/* ==================== LEFT: CONTACT INFO (4 Columns) ==================== */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 font-mono">
                  {lang === 'ID' ? 'Informasi Kontak' : 'Contact Information'}
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#0B2F64]">
                  {lang === 'ID' ? 'Saluran Bantuan Resmi' : 'Official Support Channel'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'ID'
                    ? 'Layanan pendampingan teknis dan konsultasi implementasi presensi sekolah.'
                    : 'Technical support and school attendance implementation consultation.'}
                </p>
              </div>
              
              <div className="space-y-4 text-sm text-slate-700">
                {/* WhatsApp Support Item */}
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'ID' ? 'WhatsApp Helpdesk' : 'WhatsApp Helpdesk'}
                    </div>
                    <div className="font-black text-slate-900 text-base sm:text-lg">0813-1249-8919</div>
                    <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{lang === 'ID' ? 'Senin - Sabtu: 07.00 - 17.00 WIB' : 'Mon - Sat: 07:00 - 17:00 WIB'}</span>
                    </div>
                  </div>
                </div>

                {/* Email Item */}
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'ID' ? 'Email Resmi' : 'Official Email'}
                    </div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm break-all">
                      maulanayusuf05@guru.sd.belajar.id
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {lang === 'ID' ? 'Balasan dalam 1x24 jam kerja' : 'Response within 1x24 business hours'}
                    </div>
                  </div>
                </div>

                {/* Office Location Item */}
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-lg bg-slate-200/60 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'ID' ? 'Kantor Layanan' : 'Service Office'}
                    </div>
                    <div className="font-medium text-slate-800 text-xs leading-relaxed mt-0.5">
                      Jl. Pendidikan No. 123, Kel. Merdeka, Kec. Nusantara, Kota Jakarta Pusat, DKI Jakarta 10110
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action Button */}
              <a
                href="https://wa.me/6281312498919?text=Halo%20Tim%20Kawacanaan,%20kami%20ingin%20berkonsultasi%20mengenai%20sistem%20presensi%20digital%20Sekolah%20Dasar."
                target="_blank"
                rel="noreferrer"
                id="btn-consult-whatsapp"
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 rounded-xl"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{lang === 'ID' ? 'Konsultasi via WhatsApp' : 'Consult via WhatsApp'}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-80" />
              </a>

              {/* Trust badges */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Respon Cepat</span>
                </span>
                <span>•</span>
                <span>Standar Dinas Pendidikan</span>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT: KOMUNITAS WHATSAPP + BARCODE QR (8 Columns) ==================== */}
          <div 
            id="komunitas-wa" 
            className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs relative overflow-hidden text-left"
          >
            {/* Alias anchor for any existing links targeting #form-kontak */}
            <span id="form-kontak" className="sr-only" aria-hidden="true" />

            {/* Decorative subtle ambient glows */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-50 rounded-full blur-3xl opacity-80 pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-80 pointer-events-none" />

            <div className="relative z-10 space-y-6">
              
              {/* Top Banner: Badge & Intro */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === 'ID' ? 'Komunitas Resmi Pengguna' : 'Official User Community'}</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase">
                    WhatsApp Group
                  </span>
                </div>
                
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'ID' ? 'Terbuka & Gratis' : 'Free & Open'}</span>
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-[#0B2F64]">
                  {lang === 'ID' ? 'Komunitas KawaCanaan Presensi' : 'KawaCanaan Presensi Community'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {lang === 'ID' 
                    ? 'Bergabung bersama guru, wali kelas, operator, dan kepala sekolah dasar seluruh Indonesia. Berbagi pengalaman, berdiskusi mengenai administrasi presensi kurikulum, dan dapatkan berita rilis fitur terbaru.'
                    : 'Join teachers, homeroom educators, school operators, and primary principals across Indonesia. Share best practices, discuss curriculum attendance filings, and receive direct updates.'}
                </p>
              </div>

              {/* 4 Compact Value Proposition Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{lang === 'ID' ? 'Praktik Baik' : 'Best Practice'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {lang === 'ID' ? 'Diskusi rombel 1-6' : 'Cohorts discussion'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{lang === 'ID' ? 'Update Rilis' : 'App Updates'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {lang === 'ID' ? 'Fitur & format dinas' : 'Features & formats'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{lang === 'ID' ? 'Tanya Jawab' : 'Fast Q&A'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {lang === 'ID' ? 'Solusi kendala teknis' : 'Technical guidance'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{lang === 'ID' ? 'Grup Resmi' : 'Verified'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {lang === 'ID' ? 'Bebas biaya selamanya' : 'Free forever'}
                  </p>
                </div>
              </div>

              {/* ================= DUAL-ACTION CONTAINER: TAUTAN & BARCODE QR ================= */}
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50/90 to-slate-100/60 border border-slate-200/90 space-y-4">
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                      {lang === 'ID' ? 'DUA CARA BERGABUNG MUDAH' : 'TWO EASY WAYS TO JOIN'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {lang === 'ID' ? 'Tautan Langsung & Barcode QR' : 'Direct Link & Barcode QR'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                  
                  {/* METODE 1: GABUNG VIA TAUTAN (MD:COL-SPAN-7) */}
                  <div className="md:col-span-7 flex flex-col justify-between p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                          1
                        </span>
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                          {lang === 'ID' ? 'Gabung via Tautan Langsung' : 'Join via Direct Link'}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {lang === 'ID'
                          ? 'Gunakan opsi ini jika Anda sedang mengakses website dari browser ponsel pintar (smartphone) untuk langsung membuka aplikasi WhatsApp.'
                          : 'Ideal if you are visiting via mobile browser to open WhatsApp automatically.'}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Primary Green Action Button */}
                      <a
                        href={whatsappCommunityLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        id="btn-join-whatsapp-community"
                        className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all rounded-xl shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {/* WhatsApp Icon */}
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span>{lang === 'ID' ? 'Gabung Komunitas WhatsApp' : 'Join WhatsApp Community'}</span>
                        <ExternalLink className="w-4 h-4 ml-0.5 shrink-0" />
                      </a>

                      {/* Secondary Action: Copy Link */}
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        id="btn-copy-whatsapp-link"
                        className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          copied
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>
                          {copied
                            ? (lang === 'ID' ? '✓ Tautan Berhasil Disalin!' : '✓ Link Copied!')
                            : (lang === 'ID' ? 'Salin Tautan Undangan' : 'Copy Invitation Link')}
                        </span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tautan resmi grup WhatsApp Kawacanaan Presensi</span>
                    </div>
                  </div>

                  {/* METODE 2: PINDAI BARCODE QR (MD:COL-SPAN-5) */}
                  <div className="md:col-span-5 flex flex-col justify-between p-4 sm:p-5 bg-white rounded-xl border-2 border-emerald-500/30 shadow-xs relative">
                    
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                          2
                        </span>
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                          {lang === 'ID' ? 'Pindai Barcode QR' : 'Scan Barcode QR'}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-tight">
                        {lang === 'ID' 
                          ? 'Gunakan kamera WhatsApp ponsel untuk scan kode ini'
                          : 'Use WhatsApp camera to scan this barcode'}
                      </p>
                    </div>

                    {/* QR Code Card Frame (Modeled after official WhatsApp QR invitation) */}
                    <div className="my-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center relative group">
                      
                      {/* Top mini emblem & title */}
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <KawacanaanEmblem size={24} className="ring-1 ring-slate-200" />
                        <span className="font-black text-[11px] text-[#0B2F64] uppercase tracking-tight">
                          Kawacanaan Presensi
                        </span>
                      </div>

                      {/* Scannable QR Code Canvas */}
                      <div 
                        className="relative inline-block mx-auto cursor-pointer"
                        onClick={() => setIsModalOpen(true)}
                        title="Klik untuk memperbesar QR Code"
                      >
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Barcode QR WhatsApp Komunitas Kawacanaan"
                            className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg border border-slate-200 bg-white p-1 mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-36 h-36 sm:w-40 sm:h-40 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                            <QrCode className="w-10 h-10 animate-pulse" />
                          </div>
                        )}

                        {/* WhatsApp Center Badge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white p-0.5 shadow-md border border-slate-100 flex items-center justify-center pointer-events-none">
                          <div className="w-full h-full rounded-full bg-[#25D366] flex items-center justify-center text-white">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-900/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 backdrop-blur-2xs">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Perbesar</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-medium mt-2">
                        {lang === 'ID' 
                          ? 'Pindai menggunakan kamera WhatsApp' 
                          : 'Scan with WhatsApp camera'}
                      </div>
                    </div>

                    {/* QR Action Buttons: Download & Enlarge */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadFlyer}
                        disabled={isDownloading}
                        className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title="Unduh flyer barcode format cetak/bagikan"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="truncate">{isDownloading ? 'Menyiapkan...' : (lang === 'ID' ? 'Unduh Barcode' : 'Download QR')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Tampilkan layar penuh"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>{lang === 'ID' ? 'Perbesar' : 'Enlarge'}</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* WhatsApp QR Modal for High-Resolution Scan & Download */}
      <WhatsAppQrModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        qrDataUrl={qrDataUrl}
        communityUrl={whatsappCommunityLink}
        lang={lang}
        onDownloadQr={handleDownloadFlyer}
      />
    </section>
  );
};

