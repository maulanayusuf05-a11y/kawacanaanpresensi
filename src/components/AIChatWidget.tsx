import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { buildAIAttendanceContext } from '../utils/aiContext';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Bot,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
  ChevronDown,
  Palette,
  User,
  CornerDownLeft,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ChatTheme = 'blue' | 'indigo' | 'emerald' | 'violet';

interface ThemeConfig {
  name: string;
  badge: string;
  gradientHeader: string;
  userBubble: string;
  primaryBtn: string;
  activeRing: string;
  avatarBg: string;
}

const THEMES: Record<ChatTheme, ThemeConfig> = {
  indigo: {
    name: 'Indigo Kawacanaan',
    badge: 'bg-indigo-500/20 text-indigo-700',
    gradientHeader: 'from-blue-700 via-indigo-700 to-indigo-900',
    userBubble: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
    primaryBtn: 'bg-indigo-700 hover:bg-indigo-800 text-white',
    activeRing: 'focus:border-indigo-600 focus:ring-indigo-100',
    avatarBg: 'bg-gradient-to-tr from-blue-600 to-indigo-700 text-white',
  },
  blue: {
    name: 'Biru Edukasi',
    badge: 'bg-blue-500/20 text-blue-700',
    gradientHeader: 'from-sky-600 via-blue-600 to-blue-800',
    userBubble: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    activeRing: 'focus:border-blue-600 focus:ring-blue-100',
    avatarBg: 'bg-gradient-to-tr from-sky-600 to-blue-700 text-white',
  },
  emerald: {
    name: 'Emerald Segar',
    badge: 'bg-emerald-500/20 text-emerald-700',
    gradientHeader: 'from-emerald-700 via-teal-700 to-teal-900',
    userBubble: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    primaryBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    activeRing: 'focus:border-emerald-600 focus:ring-emerald-100',
    avatarBg: 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white',
  },
  violet: {
    name: 'Violet Kreatif',
    badge: 'bg-violet-500/20 text-violet-700',
    gradientHeader: 'from-violet-700 via-purple-700 to-purple-900',
    userBubble: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
    primaryBtn: 'bg-violet-700 hover:bg-violet-800 text-white',
    activeRing: 'focus:border-violet-600 focus:ring-violet-100',
    avatarBg: 'bg-gradient-to-tr from-violet-600 to-purple-700 text-white',
  },
};

const DEFAULT_SUGGESTIONS = [
  'Siapa yang terlambat hari ini?',
  'Siapa yang tidak hadir hari ini?',
  'Berapa persentase kehadiran kelas bulan ini?',
  'Siapa siswa dengan kehadiran paling rendah?',
];

export const AIChatWidget: React.FC = () => {
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

  // Hanya tampilkan widget untuk akun staf/guru/admin yang login
  if (!currentUser || currentUser.role === 'SISWA') {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ChatTheme>('indigo');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Web Speech API
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const storageKey = `kawa_ai_chat_${currentUser.id}_${activeWorkspace?.id || 'default'}`;

  // Soft notification sound using Web Audio API
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };

  // 1. Inisialisasi Riwayat Percakapan dari LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (_) {}

    // Initial greeting if no messages yet
    const initialGreeting: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Halo Bapak/Ibu ${currentUser.name || 'Guru'}! 👋 Saya **Kawa AI**, asisten digital absensi Anda. Ada yang ingin ditanyakan seputar kehadiran siswa, rekap hari ini, atau pola keterlambatan?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
  }, [storageKey, currentUser.name]);

  // Simpan riwayat chat ke LocalStorage setiap ada perubahan pesan
  const persistMessages = (updated: ChatMessage[]) => {
    setMessages(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated.slice(-30)));
    } catch (_) {}
  };

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Fokus input saat chat window dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // 2. Setup Supabase Realtime Channel
  useEffect(() => {
    const channelName = `ai-chat:${currentUser.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const next = [...prev, payload];
            try {
              localStorage.setItem(storageKey, JSON.stringify(next.slice(-30)));
            } catch (_) {}
            return next;
          });
          if (payload.role === 'assistant') {
            playNotificationSound();
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setIsTyping(Boolean(payload?.isTyping));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel connected
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUser.id, storageKey, soundEnabled]);

  // 3. Listen to custom window event to open chat from anywhere
  useEffect(() => {
    const handleOpenChat = (event: any) => {
      setIsOpen(true);
      const prompt = event?.detail?.prompt;
      if (prompt) {
        setTimeout(() => {
          handleSendMessage(prompt);
        }, 200);
      }
    };

    window.addEventListener('open-kawa-ai-chat', handleOpenChat);
    return () => {
      window.removeEventListener('open-kawa-ai-chat', handleOpenChat);
    };
  }, [currentUser, activeWorkspace, students, classes, teachers, subjects, attendanceRecords]);

  // 4. Voice Input via Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (showToast) {
        showToast('Browser Anda belum mendukung input suara. Silakan gunakan teks.', 'warning');
      }
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };
      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech error:', err);
      setIsListening(false);
    }
  };

  // 5. Kirim Pesan & Dapatkan Jawaban AI
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isTyping) return;

    setErrorMessage(null);
    setInputText('');

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Pesan Pengguna
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: textToSend,
      timestamp: timeString,
    };

    // Tambahkan dan broadcast pesan pengguna
    const updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);

    // Broadcast event realtime pesan pengguna
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: userMsg,
      });
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping: true },
      });
    }

    setIsTyping(true);

    try {
      // Dapatkan token Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (sessionError || !token) {
        throw new Error('Sesi autentikasi Anda tidak ditemukan. Harap muat ulang halaman.');
      }

      // Bangun konteks absensi
      const context = buildAIAttendanceContext({
        currentUser,
        activeWorkspace,
        students,
        classes,
        teachers,
        subjects,
        attendanceRecords,
      });

      // Format dialog history (5 turn terakhir)
      const history = updatedMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Panggil backend API Cloudflare AI
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: textToSend,
          context,
          history,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Gagal menghubungi AI (Status ${response.status})`);
      }

      const answerText = result.answer || 'Maaf, belum ada data yang dapat dirangkum.';

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'assistant',
        content: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Matikan status typing dan broadcast pesan AI
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { isTyping: false },
        });
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: assistantMsg,
        });
      }

      setIsTyping(false);
      persistMessages([...updatedMessages, assistantMsg]);
      playNotificationSound();
    } catch (err: any) {
      console.error('[AIChatWidget] error:', err);
      setIsTyping(false);
      setErrorMessage(err.message || 'Gagal memproses jawaban.');

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { isTyping: false },
        });
      }
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearChat = () => {
    const freshGreeting: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Riwayat obrolan telah dibersihkan. Ada lagi data presensi yang ingin Anda diskusikan?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    persistMessages([freshGreeting]);
    setErrorMessage(null);
  };

  const activeTheme = THEMES[theme] || THEMES.indigo;

  return (
    <>
      {/* 1. FLOATING CHAT BUBBLE (IKON CHAT DI POJOK BAWAH) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group relative h-14 w-14 sm:h-15 sm:w-15 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border-2 border-white focus:outline-none focus:ring-4 focus:ring-indigo-300/50 ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900 text-white rotate-90'
              : 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-800 text-white hover:scale-105 active:scale-95'
          }`}
          aria-label={isOpen ? 'Tutup obrolan AI' : 'Buka Asisten Absensi AI'}
          id="btn-floating-ai-chat"
        >
          {isOpen ? (
            <X size={26} className="transition-transform duration-200" />
          ) : (
            <>
              <div className="relative">
                <Bot size={28} className="text-white drop-shadow-xs" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                </span>
              </div>
            </>
          )}

          {/* Tooltip Hover di Desktop */}
          {!isOpen && (
            <span className="hidden sm:group-hover:flex absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-xs text-white text-xs font-bold whitespace-nowrap shadow-lg border border-slate-700 items-center gap-1.5 transition-all">
              <Sparkles size={12} className="text-yellow-400" />
              Tanya Kawa AI
            </span>
          )}
        </button>
      </div>

      {/* 2. JENDELA CHAT (POPUP LIVE CHAT WINDOW) */}
      {isOpen && (
        <div
          id="window-ai-live-chat"
          className="fixed bottom-22 sm:bottom-24 right-3 sm:right-6 z-40 w-[calc(100vw-24px)] sm:w-[420px] h-[580px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200"
        >
          {/* HEADER JENDELA CHAT */}
          <div
            className={`p-4 bg-gradient-to-r ${activeTheme.gradientHeader} text-white flex items-center justify-between relative shrink-0 select-none`}
          >
            {/* Background Glow Deco */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              {/* Avatar Asisten di Header */}
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/30 backdrop-blur-xs flex items-center justify-center text-yellow-300 shadow-xs">
                  <Bot size={22} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-indigo-900 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight">Kawa AI</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1">
                    <Sparkles size={9} className="text-yellow-300" />
                    Asisten Absensi
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Online • Supabase Realtime</span>
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 relative z-10">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                title={soundEnabled ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Theme Picker Dropdown Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowThemePicker((prev) => !prev)}
                  title="Ganti warna tema"
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <Palette size={16} />
                </button>

                {showThemePicker && (
                  <div className="absolute right-0 top-9 w-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 text-slate-800 text-xs z-50 animate-in fade-in zoom-in-95">
                    <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                      Warna Tema
                    </div>
                    {(Object.keys(THEMES) as ChatTheme[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTheme(key);
                          setShowThemePicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                          theme === key ? 'bg-slate-100 text-indigo-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full bg-gradient-to-r ${THEMES[key].gradientHeader}`}
                        />
                        <span>{THEMES[key].name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear Chat */}
              <button
                type="button"
                onClick={handleClearChat}
                title="Bersihkan riwayat obrolan"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup jendela chat"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* BADGE SCOPE KELAS / ROLE GURU */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span className="truncate max-w-[260px] font-medium">
              Guru: <strong className="text-slate-800">{currentUser.name || 'Pendidik'}</strong> ({currentUser.role})
            </span>
            <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md font-semibold shrink-0">
              GLM-4.7-Flash
            </span>
          </div>

          {/* DAFTAR PESAN (CHAT MESSAGE LIST) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8FAFC]/60">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {/* Avatar Asisten di Sebelah Kiri */}
                  {isAssistant && (
                    <div
                      className={`w-7 h-7 rounded-xl ${activeTheme.avatarBg} flex items-center justify-center shrink-0 shadow-2xs text-yellow-300 border border-white`}
                    >
                      <Bot size={15} />
                    </div>
                  )}

                  {/* Bubble Pesan */}
                  <div
                    className={`relative group max-w-[84%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed transition-all shadow-2xs ${
                      isAssistant
                        ? 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs font-normal'
                        : `${activeTheme.userBubble} rounded-br-xs font-medium`
                    }`}
                  >
                    {/* Header Label Bubble */}
                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                      <span className="font-bold tracking-tight">
                        {isAssistant ? 'Kawa AI' : 'Anda'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Isi Pesan dengan Format Percakapan Singkat */}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                    {/* Tombol Copy untuk Pesan Asisten */}
                    {isAssistant && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Salin jawaban"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Avatar Pengguna di Sebelah Kanan */}
                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs font-bold text-[11px] border border-white">
                      <User size={14} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* ANIMASI INDIKATOR "SEDANG MENGETIK..." (TYPING INDICATOR) */}
            {isTyping && (
              <div className="flex items-end gap-2.5 justify-start animate-in fade-in duration-200">
                {/* Avatar Asisten di Sebelah Kiri */}
                <div
                  className={`w-7 h-7 rounded-xl ${activeTheme.avatarBg} flex items-center justify-center shrink-0 shadow-2xs text-yellow-300 border border-white`}
                >
                  <Bot size={15} />
                </div>

                {/* Bubble Typing dengan 3 Titik Animasi */}
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2 text-slate-500">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Kawa AI sedang mengetik
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Pesan Kesalahan Jika Ada */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Gagal Merespon</span>
                  <span className="text-[11px]">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHIP REKOMENDASI PERTANYAAN (QUICK SUGGESTIONS) */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {DEFAULT_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isTyping}
                onClick={() => handleSendMessage(sug)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-medium border border-slate-200/80 hover:border-indigo-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* FOOTER FORMULIR INPUT CHAT */}
          <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Mendengarkan ucapan Anda...'
                      : 'Ketik pertanyaan absensi...'
                  }
                  disabled={isTyping}
                  className={`w-full pl-3.5 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-[13px] text-slate-800 bg-white outline-none transition-all ${activeTheme.activeRing} focus:ring-2 disabled:opacity-50 min-h-[42px]`}
                  id="input-live-ai-chat"
                />

                {isListening && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                )}
              </div>

              {/* Tombol Suara Mikrofon */}
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isTyping}
                title={isListening ? 'Hentikan rekaman' : 'Kirim dengan suara (Mikrofon)'}
                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center min-h-[42px] min-w-[42px] cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-indigo-700'
                } disabled:opacity-50`}
                id="btn-voice-live-ai-chat"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Tombol Kirim Pesan */}
              <button
                type="submit"
                disabled={isTyping || !inputText.trim()}
                className={`p-2.5 rounded-2xl ${activeTheme.primaryBtn} transition-all shadow-sm flex items-center justify-center min-h-[42px] min-w-[42px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                id="btn-send-live-ai-chat"
                title="Kirim pesan (Enter)"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Tekan Enter untuk mengirim</span>
              <span>Cloudflare AI & Supabase Realtime</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
