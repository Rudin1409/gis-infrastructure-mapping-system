'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  FileSpreadsheet,
  MapPin,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Map,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { isAiFeatureActive } from '@/lib/ai/aiConfig';

interface MapAction {
  type: string;
  providerId?: string;
  providerName?: string;
  condition?: string;
  category?: string;
  search?: string;
  label: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: MapAction | null;
}

const QUICK_PROMPTS = [
  {
    label: '👤 Data per Surveyor',
    prompt: 'Berapa titik pin yang sudah didata oleh masing-masing orang / surveyor?',
  },
  {
    label: '🔴 Filter Tiang Rusak',
    prompt: 'Tolong bantu saya filter dan tampilkan tiang yang rusak/bahaya di peta.',
  },
  {
    label: '🌐 Filter Telkom Saja',
    prompt: 'Bantu saya filter hanya tiang Telkom Indonesia di peta GIS.',
  },
  {
    label: '💡 Filter Tiang PJU',
    prompt: 'Filter dan tampilkan tiang PJU Mandiri Pemkot Lubuklinggau di peta.',
  },
  {
    label: '📊 Rekap Total Tiang',
    prompt: 'Berapa total data tiang dan rincian kondisinya saat ini?',
  },
  {
    label: '🗺️ Reset Semua Filter',
    prompt: 'Tampilkan semua tiang dan reset semua filter peta.',
  },
];

export default function GisAiAssistantModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState<'MINIMIZED' | 'NORMAL' | 'EXPANDED'>('NORMAL');

  useEffect(() => {
    setIsAiEnabled(isAiFeatureActive());
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Halo! Saya **INFRA-AI**, asisten cerdas bawaan **INFRA-MAP GIS**.\n\nKetik permintaan seperti *"Filter tiang Telkom"* atau *"Tampilkan tiang rusak"*, dan saya akan langsung menggerakkan peta sesuai permintaan Anda!',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && viewState !== 'MINIMIZED') {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, viewState, messages]);

  const executeMapAction = (action: MapAction) => {
    if (typeof window !== 'undefined') {
      // 1. Dispatch custom event to GISOverviewMap
      window.dispatchEvent(new CustomEvent('gis:ai-action', { detail: action }));

      // 2. If user is currently not on /map, navigate to /map
      if (pathname !== '/map') {
        const params = new URLSearchParams();
        if (action.providerId && action.providerId !== 'ALL') params.set('provider', action.providerId);
        if (action.condition && action.condition !== 'ALL') params.set('condition', action.condition);
        if (action.search) params.set('q', action.search);
        router.push(`/map?${params.toString()}`);
      }

      // Automatically minimize on mobile so user can see the map instantly
      if (window.innerWidth < 640) {
        setViewState('MINIMIZED');
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

    if (viewState === 'MINIMIZED') {
      setViewState('NORMAL');
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: json.data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          action: json.data.action,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Auto execute action if on /map
        if (json.data.action && pathname === '/map') {
          executeMapAction(json.data.action);
        }
      } else {
        throw new Error(json.error || 'Gagal memproses pesan');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba kembali sesaat lagi.`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Riwayat percakapan dibersihkan. Silakan tanyakan status tiang atau minta saya memfilter peta!',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const parseInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const text = line.substring(2);
        return (
          <li key={idx} className="ml-3 list-disc my-0.5 leading-snug">
            {parseInlineBold(text)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+\.)\s(.*)$/);
        if (match) {
          return (
            <li key={idx} className="ml-3 list-decimal my-0.5 leading-snug">
              {parseInlineBold(match[2])}
            </li>
          );
        }
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1" />;
      }
      return (
        <p key={idx} className="leading-snug">
          {parseInlineBold(line)}
        </p>
      );
    });
  };

  if (!isAiEnabled) {
    return null;
  }

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Elevated above bottom navigation bar and all map controls) */}
      {!isOpen && (
        <div className="fixed bottom-28 right-3.5 z-[900] sm:bottom-8 sm:right-8 animate-in fade-in zoom-in duration-150">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setViewState('NORMAL');
            }}
            className="group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-2xl shadow-indigo-500/35 transition-all border border-white/25 cursor-pointer ring-2 ring-indigo-500/20"
            aria-label="Buka Asisten AI GIS"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>

            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="text-xs font-bold tracking-tight">Tanya AI</span>
          </button>
        </div>
      )}

      {/* COMPACT CHAT DRAWER / BOTTOM SHEET (Top-most z-index above all map buttons and controls) */}
      {isOpen && (
        <div
          className={`fixed z-[1000] transition-all duration-300 ease-out flex flex-col bg-white shadow-[0_25px_70px_rgba(15,23,42,0.4)] border border-slate-200 font-sans ${
            viewState === 'MINIMIZED'
              ? 'bottom-24 sm:bottom-8 right-3 sm:right-8 w-[calc(100vw-24px)] sm:w-[390px] h-[54px] rounded-2xl overflow-hidden'
              : viewState === 'EXPANDED'
              ? 'inset-3 sm:inset-6 rounded-3xl'
              : 'bottom-24 sm:bottom-8 right-3 sm:right-8 w-[calc(100vw-24px)] sm:w-[390px] h-[370px] sm:h-[480px] max-h-[60vh] sm:max-h-[calc(100vh-60px)] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="text-[11px] font-black tracking-tight text-white leading-tight">
                    INFRA-AI
                  </h3>
                  <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Smart Map
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 leading-none">
                  Kontrol Peta & Data Spasial
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {viewState === 'MINIMIZED' ? (
                <button
                  type="button"
                  onClick={() => setViewState('NORMAL')}
                  title="Buka Chat"
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewState('MINIMIZED')}
                  title="Perkecil ke Bawah"
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Percakapan"
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setViewState(viewState === 'EXPANDED' ? 'NORMAL' : 'EXPANDED')}
                title={viewState === 'EXPANDED' ? 'Ukuran Normal' : 'Perbesar Layar'}
                className="hidden sm:block p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {viewState === 'EXPANDED' ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup Asisten"
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Minimized Quick Bar View */}
          {viewState === 'MINIMIZED' ? (
            <div
              onClick={() => setViewState('NORMAL')}
              className="flex-1 px-3 flex items-center justify-between bg-slate-50 text-[11px] text-slate-600 font-bold cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 animate-pulse" />
                <span className="truncate">Klik untuk membuka asisten / ketik perintah peta...</span>
              </div>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </div>
          ) : (
            <>
              {/* Chat Messages Body */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 bg-slate-50/50 text-slate-800 text-[11px]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl p-2.5 shadow-2xs ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                          : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs leading-relaxed space-y-1'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div>{renderFormattedContent(msg.content)}</div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Interactive Map Action Trigger Button */}
                      {msg.action && (
                        <div className="pt-1.5 border-t border-slate-100 mt-1">
                          <button
                            type="button"
                            onClick={() => executeMapAction(msg.action!)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <span>{msg.action.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span
                        className={`block text-[8px] mt-0.5 text-right font-mono ${
                          msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs p-2 shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]"></span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1">
                        Memproses perintah...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Chips */}
              <div className="px-2 py-1.5 bg-white border-t border-slate-100 flex gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt)}
                    disabled={isLoading}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[9px] font-bold whitespace-nowrap transition-colors border border-slate-200/60 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-2 bg-white rounded-b-3xl border-t border-slate-100 flex items-center gap-1.5 flex-shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik 'filter Telkom' / 'tiang rusak'..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-[11px] text-slate-900 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Kirim"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
