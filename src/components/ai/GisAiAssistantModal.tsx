'use client';

import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    label: '📊 Rekap Data Tiang',
    prompt: 'Berapa total tiang yang sudah terdata dan bagaimana status kondisinya saat ini?',
    icon: FileSpreadsheet,
  },
  {
    label: '⚠️ Tiang Kritis & Bahaya',
    prompt: 'Berapa banyak tiang yang dalam kondisi rusak atau miring, dan apa kriteria tiang bahaya?',
    icon: AlertTriangle,
  },
  {
    label: '📋 Panduan SOP Input Survei',
    prompt: 'Bagaimana panduan SOP dan kriteria pengisian data survei tiang yang benar?',
    icon: HelpCircle,
  },
  {
    label: '📍 Sebaran Data Wilayah',
    prompt: 'Bagaimana sebaran data tiang di wilayah kecamatan dan kelurahan Kota Lubuklinggau?',
    icon: MapPin,
  },
];

import { isAiFeatureActive } from '@/lib/ai/aiConfig';

export default function GisAiAssistantModal() {
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsAiEnabled(isAiFeatureActive());
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Halo! Saya **INFRA-AI**, asisten cerdas bawaan sistem **INFRA-MAP GIS**.\n\nSaya siap membantu Anda dalam urusan **pendataan, inventarisasi tiang, audit kondisi fisik, dan panduan survei lapangan** di Kota Lubuklinggau.\n\nAda yang bisa saya bantu terkait data tiang hari ini?',
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
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

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
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
          'Riwayat percakapan telah dibersihkan. Silakan ajukan pertanyaan seputar **pendataan & inventarisasi tiang GIS** Kota Lubuklinggau.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper formatting simple markdown (bold, lists, code)
  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // Bullet list
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const text = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc my-0.5 leading-relaxed">
            {parseInlineBold(text)}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+\.)\s(.*)$/);
        if (match) {
          return (
            <li key={idx} className="ml-4 list-decimal my-0.5 leading-relaxed">
              {parseInlineBold(match[2])}
            </li>
          );
        }
      }
      // Empty line / paragraph gap
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular line
      return (
        <p key={idx} className="leading-relaxed">
          {parseInlineBold(line)}
        </p>
      );
    });
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

  if (!isAiEnabled) {
    return null;
  }

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6 animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-500/30 transition-all border border-white/20 cursor-pointer"
            aria-label="Buka Asisten AI GIS"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>

            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="tracking-wide">Asisten INFRA-AI</span>
          </button>
        </div>
      )}

      {/* CHAT MODAL / DRAWER */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-white shadow-2xl border border-slate-200/90 font-sans ${
            isExpanded
              ? 'inset-3 sm:inset-6 rounded-3xl'
              : 'bottom-2 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[420px] h-[580px] max-h-[calc(100vh-24px)] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-t-3xl flex items-center justify-between border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black tracking-wide text-white">
                    INFRA-AI Assistant
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    GIS Engine
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium">
                  Asisten Pendataan & Inventarisasi Tiang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Bersihkan Percakapan"
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Perkecil' : 'Perbesar'}
                className="hidden sm:block p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/50 text-slate-800 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs ${
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
                  <span
                    className={`block text-[9px] mt-1 text-right font-mono ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs p-3 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-bold text-slate-500 ml-1">
                    INFRA-AI sedang menganalisis data...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {QUICK_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[10px] font-bold whitespace-nowrap transition-colors border border-slate-200/60 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Icon className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white rounded-b-3xl border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
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
              placeholder="Tanyakan status tiang, SOP survei, dsb..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 rounded-2xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-md shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
