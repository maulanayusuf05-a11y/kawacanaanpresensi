import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { buildAIAttendanceContext } from '../utils/aiContext';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Volume2,
  User,
} from 'lucide-react';

interface AIAttendanceAssistantProps {
  className?: string;
}

const EXAMPLE_QUESTIONS = [
  'Siapa siswa yang paling sering terlambat bulan ini?',
  'Siapa yang tidak hadir hari ini?',
  'Berapa persentase kehadiran kelas saya bulan ini?',
  'Siapa siswa yang memiliki kehadiran paling rendah?',
  'Bagaimana pola kehadiran kelas saya bulan ini?',
  'Buatkan ringkasan kehadiran kelas saya minggu ini.',
];

export const AIAttendanceAssistant: React.FC<AIAttendanceAssistantProps> = ({ className = '' }) => {
  const {
    currentUser,
    activeWorkspace,
    students,
    classes,
    teachers,
    subjects,
    attendanceRecords,
    showToast,
  } = useApp();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Web Speech API states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const handleVoiceInput = () => {
    setSpeechWarning(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechWarning('Input suara tidak didukung pada browser ini. Silakan gunakan input teks.');
      if (showToast) {
        showToast('Input suara tidak didukung pada browser ini. Silakan gunakan input teks.', 'warning');
      }
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechWarning('Izin mikrofon ditolak oleh browser. Silakan aktifkan izin mikrofon.');
        } else if (event.error === 'no-speech') {
          // No speech detected, quietly end
        } else {
          setSpeechWarning(`Gangguan pengenalan suara (${event.error}).`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Gagal menginisialisasi SpeechRecognition:', err);
      setIsListening(false);
      setSpeechWarning('Gagal mengaktifkan pengenalan suara.');
    }
  };

  const handleAskQuestion = async (promptToAsk?: string) => {
    const finalQuestion = (promptToAsk || question).trim();
    if (!finalQuestion || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSpeechWarning(null);
    setAskedQuestion(finalQuestion);

    try {
      // 1. Ambil session token dari Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (sessionError || !token) {
        throw new Error('Sesi autentikasi Anda tidak ditemukan. Silakan muat ulang atau masuk kembali.');
      }

      // 2. Bangun konteks absensi yang aman dan tersaring
      const context = buildAIAttendanceContext({
        currentUser,
        activeWorkspace,
        students,
        classes,
        teachers,
        subjects,
        attendanceRecords,
      });

      // 3. Panggil API Serverless /api/ai
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: finalQuestion,
          context,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Permintaan gagal dengan status ${response.status}`);
      }

      setAnswer(result.answer || 'Tidak ada tanggapan yang diterima.');
      setQuestion('');
    } catch (err: any) {
      console.error('[AIAttendanceAssistant] Error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat meminta analisis dari Asisten AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReset = () => {
    setAnswer(null);
    setAskedQuestion(null);
    setErrorMessage(null);
    setQuestion('');
  };

  return (
    <div
      id="card-ai-attendance-assistant"
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header Kartu */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-yellow-300 shadow-xs shrink-0">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                AI Asisten Absensi
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/40 border border-blue-300/30 text-[10px] font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-300" />
                Cloudflare AI
              </span>
            </div>
            <p className="text-xs text-blue-100/90 mt-0.5">
              Tanyakan apa saja tentang data kehadiran.
            </p>
          </div>
        </div>

        {answer && (
          <button
            type="button"
            onClick={handleReset}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20 relative z-10"
            id="btn-ai-reset"
          >
            <RotateCcw size={13} />
            <span>Tanya Baru</span>
          </button>
        )}
      </div>

      {/* Konten Utama */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Peringatan Input Suara Jika Tidak Didukung */}
        {speechWarning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{speechWarning}</span>
            </div>
            <button
              onClick={() => setSpeechWarning(null)}
              className="text-amber-700 hover:text-amber-900 text-[11px] font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Kotak Pertanyaan Terakhir & Jawaban AI */}
        {askedQuestion && (
          <div className="space-y-3">
            {/* Pertanyaan Pengguna */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                <User size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pertanyaan Anda
                </span>
                <p className="font-semibold text-slate-800 text-xs sm:text-sm mt-0.5">
                  "{askedQuestion}"
                </p>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-center gap-3 animate-pulse">
                <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
                <div className="text-xs font-semibold">
                  <span>AI sedang menganalisis data...</span>
                  <p className="text-[10px] text-blue-600/80 font-normal mt-0.5">
                    Memeriksa catatan kehadiran, rekap ketidakhadiran, dan pola keterlambatan siswa.
                  </p>
                </div>
              </div>
            )}

            {/* Pesan Error */}
            {errorMessage && !isLoading && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Gagal Menganalisis</span>
                  <span className="text-[11px]">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Jawaban AI yang Siap Dibaca */}
            {answer && !isLoading && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3 relative group">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Jawaban Asisten
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    title="Salin jawaban"
                    id="btn-ai-copy-answer"
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span className="text-[11px]">Salin</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap font-medium">
                  {answer}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Dihitung secara akurat dari data absensi ruang kerja Anda.</span>
                  <span>Model: GLM-4.7-Flash</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulir Input Pertanyaan & Mikrofon Suara */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tanyakan tentang absensi..."
                disabled={isLoading}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 min-h-[44px]"
                id="input-ai-attendance-question"
              />

              {/* Status Listening Mic */}
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-rose-600 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span className="hidden sm:inline">Mendengarkan...</span>
                </div>
              )}
            </div>

            {/* Tombol Mikrofon Suara */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isLoading}
              title={isListening ? 'Hentikan input suara' : speechSupported ? 'Gunakan suara' : 'Input suara tidak didukung'}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/30 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700'
              } disabled:opacity-50`}
              id="btn-ai-voice-input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Tombol Tanya AI */}
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-sm shadow-blue-700/20 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer shrink-0"
              id="btn-ai-ask-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="hidden sm:inline">Menganalisis...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-yellow-300" />
                  <span>Tanya AI</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Contoh Pertanyaan yang Dapat Diklik */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
            <HelpCircle size={13} className="text-blue-600" />
            <span>Contoh Pertanyaan Cepat:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {EXAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setQuestion(q);
                  handleAskQuestion(q);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] sm:text-xs font-medium transition-all text-left cursor-pointer disabled:opacity-50 active:scale-98"
                id={`btn-ai-example-${idx}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
