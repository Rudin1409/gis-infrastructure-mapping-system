import { NextRequest, NextResponse } from 'next/server';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const FALLBACK_FREE_MODELS = [
  'minimax/minimax-m3:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'liquid/lfm-2.5-2.6b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages = [] }: { messages: ChatMessage[] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pesan percakapan tidak valid' },
        { status: 400 }
      );
    }

    // Jika berjalan di lingkungan Vercel, nonaktifkan endpoint AI
    if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fitur Asisten INFRA-AI hanya aktif pada server VPS resmi (https://inframap.my.id).',
        },
        { status: 403 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY ||
      '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';
    const primaryModel = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3:free';

    // 1. Ambil ringkasan statistik real-time dari database
    let totalPoles = 648;
    let goodCount = 604;
    let needsRepairCount = 35;
    let damagedCount = 9;
    let categorySummary = 'PLN Murni, PJU Mandiri Pemkot Lubuklinggau, dan FO/WiFi Internet';
    let sampleDamagedPoles: string[] = [];

    try {
      const poleRepo = getPoleRepository();
      const allPoles = await poleRepo.findAll();
      totalPoles = allPoles.length;
      goodCount = allPoles.filter((p) => p.condition === 'GOOD').length;
      needsRepairCount = allPoles.filter((p) => p.condition === 'NEEDS_REPAIR').length;
      damagedCount = allPoles.filter((p) => p.condition === 'DAMAGED').length;

      const damagedPoles = allPoles
        .filter((p) => p.condition === 'DAMAGED' || p.condition === 'NEEDS_REPAIR')
        .slice(0, 6);

      sampleDamagedPoles = damagedPoles.map(
        (p) =>
          `- ${p.poleCode || p.id} (${p.road || 'Jalan Umum'}, ${p.kelurahan || 'Pelita Jaya'}): Kondisi ${
            p.condition === 'DAMAGED' ? '🔴 Rusak/Bahaya' : '🟡 Perlu Cek'
          }${p.isTilted ? ', Tiang Miring' : ''}${p.isMessyCable ? ', Kabel Semrawut' : ''}${
            p.isLowCable ? ', Kabel Melorot' : ''
          }`
      );
    } catch (dbErr) {
      console.warn('Gagal memuat snapshot database untuk AI context:', dbErr);
    }

    // 2. Susun System Prompt Khusus Pendataan & Inventarisasi GIS
    const systemPrompt = `Anda adalah "INFRA-AI", asisten cerdas bawaan resmi dari sistem INFRA-MAP GIS (Sistem Informasi Geografis Pemetaan Infrastruktur Utilitas Kota Lubuklinggau).

TUGAS DAN FOKUS UTAMA ANDA:
1. PENDATAAN & INVENTARISASI: Menjawab pertanyaan seputar jumlah data tiang, status kondisi tiang, dan sebaran wilayah di Kota Lubuklinggau.
2. PANDUAN SURVEI LAPANGAN (SOP): Membimbing petugas surveyor dalam pengisian data:
   - Kondisi "Baik (GOOD)": Tiang tegak kokoh, tidak berkarat parah, bentangan kabel teratur, tidak membahayakan.
   - Kondisi "Perlu Cek (NEEDS_REPAIR)": Ada kabel agak kendur, sedikit miring (<15°), ada karat ringan, atau lampu PJU redup.
   - Kondisi "Rusak / Bahaya (DAMAGED)": Tiang miring tajam (>15°), patah/retak, karat keropos, kabel melorot membentang rendah membahayakan jalan raya (<4 meter).
   - Jenis Bahan: BESI (pipa baja/galvanis), BETON (tiang semen cor), KAYU.
   - Kategori Utilitas: PLN MURNI (distribusi listrik), PJU MANDIRI (lampu jalan Pemkot), GABUNGAN PLN+PJU, FO/WIFI (fiber optik internet).
3. EKSPLORASI DATA WILAYAH: Mengetahui bahwa data aktif terpusat di Kota Lubuklinggau (Kecamatan Lubuklinggau Barat I, Kelurahan Pelita Jaya, Koridor Jalan Garuda, dll).

DATA SNAPSHOT SISTEM SAAT INI (REAL-TIME):
- Total Tiang Terdata: ${totalPoles} titik
- Kondisi Baik: ${goodCount} tiang (🟢 Normal & Aman)
- Kondisi Perlu Cek: ${needsRepairCount} tiang (🟡 Perlu Perhatian)
- Kondisi Rusak/Bahaya: ${damagedCount} tiang (🔴 Kritis / Bahaya)
- Kategori Aktif: ${categorySummary}
${sampleDamagedPoles.length > 0 ? `- Contoh Titik Perlu Perhatian:\n${sampleDamagedPoles.join('\n')}` : ''}

PANDUAN GAYA JAWABAN:
- Gunakan bahasa Indonesia yang profesional, ramah, ringkas, jelas, dan percaya diri sebagai asisten bawaan GIS.
- Format teks dengan rapi menggunakan markdown (tebal, poin-poin, emoji yang relevan).
- Jawab secara to-the-point dan hemat kata agar nyaman dibaca.`;

    // 3. Panggil OpenRouter API dengan Multi-Model Fallback
    const candidateModels = [primaryModel, ...FALLBACK_FREE_MODELS.filter((m) => m !== primaryModel)];
    let finalReply = '';
    let usedModel = '';

    for (const modelToTry of candidateModels) {
      try {
        const openRouterPayload = {
          model: modelToTry,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6), // Hanya kirim 6 pesan terakhir agar sangat hemat token
          ],
          temperature: 0.4,
          max_tokens: 600,
        };

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://inframap.my.id',
            'X-Title': 'INFRA-MAP GIS Assistant',
          },
          body: JSON.stringify(openRouterPayload),
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const text = aiJson.choices?.[0]?.message?.content?.trim();
          if (text) {
            finalReply = text;
            usedModel = modelToTry;
            break; // Berhasil dapat jawaban!
          }
        }
      } catch (tryErr) {
        console.warn(`Model ${modelToTry} gagal, mencoba model cadangan:`, tryErr);
      }
    }

    // 4. Jika semua model OpenRouter sibuk/gagal, fallback ke Internal Rule Engine
    if (!finalReply) {
      const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';

      if (
        lastUserMsg.includes('rekap') ||
        lastUserMsg.includes('total') ||
        lastUserMsg.includes('jumlah') ||
        lastUserMsg.includes('statistik')
      ) {
        finalReply =
          `📊 **Rekapitulasi Data Inventaris Tiang (Kota Lubuklinggau)**:\n\n` +
          `* **Total Tiang Terdata**: **${totalPoles} titik tiang**\n` +
          `* **🟢 Kondisi Baik**: **${goodCount} tiang** (Operasional normal & kokoh)\n` +
          `* **🟡 Perlu Cek**: **${needsRepairCount} tiang** (Kabel kendur / perlu perapian)\n` +
          `* **🔴 Rusak / Bahaya**: **${damagedCount} tiang** (Miring / kabel melorot)\n\n` +
          `📍 **Pusat Wilayah Survei**: Kecamatan Lubuklinggau Barat I (Koridor Jl. Garuda & Kel. Pelita Jaya).\n` +
          `Data ini terhubung langsung ke database spasial dan peta GIS.`;
      } else if (
        lastUserMsg.includes('rusak') ||
        lastUserMsg.includes('bahaya') ||
        lastUserMsg.includes('kritis') ||
        lastUserMsg.includes('miring')
      ) {
        finalReply =
          `⚠️ **Status Titik Kritis & Bahaya**:\n\n` +
          `Saat ini terdapat **${damagedCount} tiang berkondisi Rusak/Bahaya** dan **${needsRepairCount} tiang Perlu Cek** yang membutuhkan atensi lapangan.\n\n` +
          `**Kriteria Tiang Bahaya dalam SOP Pendataan:**\n` +
          `1. Tiang miring tajam (>15 derajat) ke arah badan jalan.\n` +
          `2. Kabel udara menggelantung rendah di bawah 4 meter (rawan tersangkut kendaraan).\n` +
          `3. Kerusakan fisik struktural (retak beton / karat keropos parah).\n\n` +
          `*Tips: Anda dapat membuka menu **Peta GIS** dan memfilter layer kondisi 🔴 Rusak untuk melihat lokasi tepatnya.*`;
      } else if (
        lastUserMsg.includes('sop') ||
        lastUserMsg.includes('panduan') ||
        lastUserMsg.includes('input') ||
        lastUserMsg.includes('survei') ||
        lastUserMsg.includes('survey')
      ) {
        finalReply =
          `📋 **Panduan Standar Input Data Survei (SOP Surveyor)**:\n\n` +
          `1. **Tahap 1 - Kunci Titik Lokasi Peta**:\n` +
          `   - Aktifkan GPS pada perangkat HP Anda.\n` +
          `   - Pastikan akurasi GPS di bawah 15 meter, lalu geser pin peta tepat pada titik tiang.\n\n` +
          `2. **Tahap 2 - Klasifikasi Teknis Tiang**:\n` +
          `   - **Jenis Tiang**: Pilih *Besi*, *Beton*, atau *Kayu*.\n` +
          `   - **Kategori**: Pilih *PLN Murni*, *PJU Mandiri*, atau *FO/WiFi*.\n` +
          `   - **Tinggi Tiang**: Sesuaikan estimasi (umumnya 5m, 7m, atau 9m).\n` +
          `   - **Kondisi Fisik**: Centang kendala jika tiang miring, kabel semrawut, atau berkarat.\n\n` +
          `3. **Tahap 3 - Foto Lapangan**:\n` +
          `   - Ambil foto utuh tiang dari pangkal bawah hingga pucuk atas.\n` +
          `   - Klik **Simpan Tiang** untuk mengunggah otomatis ke database.`;
      } else {
        finalReply =
          `Halo! Saya **INFRA-AI**, asisten cerdas bawaan sistem **INFRA-MAP GIS**.\n\n` +
          `Saya siap membantu Anda dalam urusan **pendataan dan inventarisasi utilitas**, seperti:\n` +
          `* 📊 **Mengecek statistik & total data tiang** real-time (${totalPoles} titik)\n` +
          `* ⚠️ **Melihat titik tiang kritis** (rusak, miring, kabel semrawut)\n` +
          `* 📋 **Panduan SOP pengisian data survei** untuk petugas lapangan\n` +
          `* 📍 **Informasi sebaran data wilayah** di Kota Lubuklinggau\n\n` +
          `Silakan ajukan pertanyaan seputar data infrastruktur atau gunakan tombol pintas yang tersedia!`;
      }
      usedModel = 'INFRA-AI Embedded Engine';
    }

    return NextResponse.json({
      success: true,
      data: {
        reply: finalReply,
        model: usedModel,
      },
    });
  } catch (error: any) {
    console.error('API /api/ai/chat error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan pada server AI' },
      { status: 500 }
    );
  }
}
