import React from 'react';
import { Bot, Sparkles, MessageSquare, ChevronRight, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AIAttendanceAssistantProps {
  className?: string;
}

const QUICK_PROMPTS = [
  'Siapa yang terlambat hari ini?',
  'Siapa yang tidak hadir hari ini?',
  'Berapa persentase kehadiran kelas saya?',
  'Siswa dengan kehadiran paling rendah?',
];

export const AIAttendanceAssistant: React.FC<AIAttendanceAssistantProps> = ({ className = '' }) => {
  const { currentUser } = useApp();

  const handleOpenChat = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent('open-kawa-ai-chat', {
        detail: { prompt },
      })
    );
  };

  return (
    <div
      id="card-ai-attendance-banner"
      className={`bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm border border-indigo-500/20 relative overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-yellow-300 shadow-sm backdrop-blur-xs">
              <Bot size={26} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-900 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black tracking-tight text-white">
                Kawa AI — Asisten Absensi
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-300/30 text-[10px] font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-300" />
                Live Chat
              </span>
            </div>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed">
              Tanyakan ringkasan kehadiran, siswa yang terlambat, atau rekap absensi melalui live chat widget interaktif di pojok kanan bawah.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenChat()}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-blue-50 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0 active:scale-98"
          id="btn-open-live-chat-from-dashboard"
        >
          <MessageSquare size={16} className="text-indigo-600" />
          <span>Buka Obrolan</span>
          <ChevronRight size={14} className="text-indigo-400" />
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center gap-2 flex-wrap relative z-10">
        <span className="text-[11px] font-bold text-blue-200 flex items-center gap-1">
          <HelpCircle size={12} />
          Tanya Cepat:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleOpenChat(prompt)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-medium transition-colors cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
