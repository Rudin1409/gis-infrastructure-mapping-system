'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  Database,
  Map,
  Layers,
  ShieldCheck,
  ChevronLeft,
  Activity,
  Lightbulb,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

const FEATURE_CARDS = [
  {
    title: 'Rekapitulasi Data Tiang',
    desc: 'Cek total inventaris, kondisi fisik 🟢 Baik / 🟡 Perlu Cek / 🔴 Rusak.',
    prompt: 'Tolong berikan ringkasan data inventaris tiang dan status kondisinya saat ini.',
    icon: FileSpreadsheet,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    title: 'Deteksi Titik Kritis',
    desc: 'Daftar tiang miring, kabel melorot, dan kriteria keselamatan.',
    prompt: 'Berapa banyak tiang yang dalam kondisi rusak atau miring, dan apa kriteria tiang bahaya?',
    icon: AlertTriangle,
    color: 'from-amber-500 to-rose-600',
  },
  {
    title: 'Panduan SOP Survei',
    desc: 'Standar pengisian formulir, akurasi GPS, dan klasifikasi tiang.',
    prompt: 'Bagaimana panduan SOP dan kriteria pengisian data survei tiang yang benar?',
    icon: HelpCircle,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Sebaran Wilayah Lubuklinggau',
    desc: 'Statistik persebaran tiang di kecamatan dan ruas jalan protokol.',
    prompt: 'Bagaimana sebaran data tiang di wilayah kecamatan dan kelurahan Kota Lubuklinggau?',
    icon: MapPin,
    color: 'from-purple-500 to-pink-600',
  },
];

import { isAiFeatureActive } from '@/lib/ai/aiConfig';

export default function AiAssistantPage() {
  const [isAiEnabled, setIsAiEnabled] = useState(true);

  useEffect(() => {
    setIsAiEnabled(isAiFeatureActive());
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Selamat datang di **INFRA-AI**, asisten cerdas terpadu **INFRA-MAP GIS Kota Lubuklinggau**.\n\nSaya terhubung langsung dengan **648+ titik data inventaris tiang** dan siap membantu Anda dalam **audit data, panduan teknis survei lapangan (SOP), dan analisa sebaran wilayah**.\n\nApa yang ingin Anda ketahui atau analisa hari ini?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      model: 'INFRA-AI Core Engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMsg].map((m) => ({
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
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: json.data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          model: json.data.model,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(json.error || 'Gagal memproses pesan');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba kembali sesaat lagi.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          <li key={idx} className="ml-4 list-disc my-0.5 leading-relaxed">
            {parseInlineBold(text)}
          </li>
        );
      }
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
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="leading-relaxed">
          {parseInlineBold(line)}
        </p>
      );
    });
  };

  if (!isAiEnabled) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4 pt-16">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-base font-black text-slate-900">
          Modul INFRA-AI Khusus Server VPS
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Fitur Asisten Cerdas INFRA-AI hanya aktif pada server produksi VPS resmi (<strong>inframap.my.id</strong>).
        </p>
        <div className="pt-2">
          <a
            href="https://inframap.my.id/ai"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
          >
            Buka di Server VPS Resmi
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto font-sans text-slate-800 pb-20">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <BackButton fallbackUrl="/map" label="Kembali ke Peta" />

        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all"
          >
            <Map className="w-3.5 h-3.5 text-blue-600" />
            <span>Peta GIS</span>
          </Link>
          <Link
            href="/poles"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Data Tiang</span>
          </Link>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-7 text-white shadow-xl border border-slate-800">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modul Asisten Cerdas Bawaan Sistem</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>INFRA-AI Workspace</span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono uppercase">
                v2.0
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pusat konsultasi cerdas untuk audit inventaris tiang, analisis titik kritis, dan panduan pengisian data teknis lapangan di Kota Lubuklinggau.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs font-bold flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>648 Titik Terhubung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Topic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURE_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(card.prompt)}
              disabled={isLoading}
              className="p-3.5 bg-white hover:bg-slate-50/80 active:scale-[0.98] rounded-2xl border border-slate-200/80 shadow-2xs transition-all text-left group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {card.title}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Chat Terminal Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 leading-none">
                Sesi Tanya Jawab INFRA-AI
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">
                Respon Cepat & Data Spasial Real-Time
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Chat</span>
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40 text-slate-800 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs leading-relaxed space-y-1.5'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div>{renderFormattedContent(msg.content)}</div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/60 mt-2">
                  <span
                    className={`text-[9px] font-mono ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp} {msg.model ? `• ${msg.model}` : ''}
                  </span>

                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-2xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-3xl rounded-bl-xs p-4 shadow-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs font-bold text-slate-600 ml-1">
                  INFRA-AI sedang memproses jawaban data...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200/80 flex items-center gap-2 flex-shrink-0">
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
            placeholder="Tanyakan status inventaris tiang, kriteria bahaya, SOP survei..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 rounded-2xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/25 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <span>Kirim</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
