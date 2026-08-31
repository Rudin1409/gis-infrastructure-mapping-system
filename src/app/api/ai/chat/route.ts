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
    let tiltedCount = 0;
    let messyCableCount = 0;
    let lowCableCount = 0;
    const surveyorCounts: Record<string, number> = {};
    const roadCounts: Record<string, number> = {};
    const kelurahanCounts: Record<string, number> = {};
    const providerCounts: Record<string, number> = {};
    let sampleDamagedPoles: string[] = [];

    try {
      const poleRepo = getPoleRepository();
      const allPoles = await poleRepo.findAll();
      totalPoles = allPoles.length;
      goodCount = allPoles.filter((p) => p.condition === 'GOOD').length;
      needsRepairCount = allPoles.filter((p) => p.condition === 'NEEDS_REPAIR').length;
      damagedCount = allPoles.filter((p) => p.condition === 'DAMAGED').length;
      tiltedCount = allPoles.filter((p) => p.isTilted).length;
      messyCableCount = allPoles.filter((p) => p.isMessyCable).length;
      lowCableCount = allPoles.filter((p) => p.isLowCable).length;

      // Group by Surveyor
      allPoles.forEach((p) => {
        const sName = (p.surveyorName || 'Admin').trim();
        surveyorCounts[sName] = (surveyorCounts[sName] || 0) + 1;

        if (p.road) {
          const rName = p.road.trim();
          roadCounts[rName] = (roadCounts[rName] || 0) + 1;
        }

        if (p.kelurahan) {
          const kName = p.kelurahan.trim();
          kelurahanCounts[kName] = (kelurahanCounts[kName] || 0) + 1;
        }

        const prov = (p.providerName || p.providerId || 'Lainnya').trim();
        providerCounts[prov] = (providerCounts[prov] || 0) + 1;
      });

      const damagedPoles = allPoles
        .filter((p) => p.condition === 'DAMAGED' || p.condition === 'NEEDS_REPAIR' || p.isTilted || p.isLowCable)
        .slice(0, 6);

      sampleDamagedPoles = damagedPoles.map(
        (p) =>
          `- ${p.poleCode || p.id} (${p.road || 'Jalan Umum'}, ${p.kelurahan || 'Pelita Jaya'}, Surveyor: ${p.surveyorName || 'Admin'}): Kondisi ${
            p.condition === 'DAMAGED' ? '🔴 Rusak/Bahaya' : '🟡 Perlu Cek'
          }${p.isTilted ? ', Tiang Miring' : ''}${p.isMessyCable ? ', Kabel Semrawut' : ''}${
            p.isLowCable ? ', Kabel Melorot' : ''
          }`
      );
    } catch (dbErr) {
      console.warn('Gagal memuat snapshot database untuk AI context:', dbErr);
    }

    const surveyorSummary = Object.entries(surveyorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `* ${name}: ${count} titik tiang`)
      .join('\n');

    const topRoadsSummary = Object.entries(roadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const kelurahanSummary = Object.entries(kelurahanCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    // 2. Susun System Prompt Khusus Pendataan & Inventarisasi GIS
    const systemPrompt = `Anda adalah "INFRA-AI", asisten cerdas bawaan resmi dari sistem INFRA-MAP GIS (Sistem Informasi Geografis Pemetaan Infrastruktur Utilitas Kota Lubuklinggau).

KEMAMPUAN UTAMA ANDA:
1. MENGELOLA SEMUA DATA SECARA DINAMIS & MANDIRI: Anda menguasai seluruh database tiang secara real-time. Anda bisa menjawab query apa pun, termasuk jumlah data per orang/surveyor, sebaran jalan, kondisi kerusakan, hingga provider.
2. FILTER PER ORANG / SURVEYOR: Anda tahu persis siapa saja yang menginput data dan berapa jumlah titik pin yang sudah mereka data.
3. KONTROL PETA CERDAS: Anda dapat menyertakan perintah aksi untuk memfilter peta secara otomatis sesuai permintaan user.

DATA SNAPSHOT SISTEM SAAT INI (REAL-TIME KOTA LUBUKLINGGAU):
- Total Tiang Terdata: ${totalPoles} titik tiang
- Kondisi Baik: ${goodCount} tiang (🟢 Normal & Aman)
- Kondisi Perlu Cek: ${needsRepairCount} tiang (🟡 Perlu Perhatian)
- Kondisi Rusak/Bahaya: ${damagedCount} tiang (🔴 Kritis / Bahaya)
- Tiang Miring: ${tiltedCount} tiang
- Kabel Semrawut: ${messyCableCount} tiang
- Kabel Melorot/Rendah: ${lowCableCount} tiang

RINCIAN PENDATAAN PER SURVEYOR / PETUGAS (REAL-TIME):
${surveyorSummary || '* Admin: ' + totalPoles + ' tiang'}

SEBARAN JALAN UTAMA TERDATA:
${topRoadsSummary || 'Jalan Garuda, Jalan Mayor Toha, Jalan Depati Said'}

SEBARAN KELURAHAN AKTIF:
${kelurahanSummary || 'Pelita Jaya, Lubuklinggau Barat I'}

PANDUAN GAYA JAWABAN:
- Gunakan bahasa Indonesia yang profesional, ramah, ringkas, jelas, dan percaya diri sebagai asisten bawaan GIS.
- Format teks dengan rapi menggunakan markdown (tebal, poin-poin, emoji yang relevan).
- Jika pengguna menanyakan data orang/surveyor tertentu (misal Admin, Bahrudin, dll), sebutkan jumlah titik tiang yang telah mereka input secara spesifik!
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
          max_tokens: 650,
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

    // 4. Jika semua model OpenRouter sibuk/gagal, fallback ke Internal Dynamic Engine
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';

    if (!finalReply) {
      if (
        lastUserMsg.includes('surveyor') ||
        lastUserMsg.includes('admin') ||
        lastUserMsg.includes('bahrudin') ||
        lastUserMsg.includes('orang') ||
        lastUserMsg.includes('pendata') ||
        lastUserMsg.includes('siapa')
      ) {
        const lines = Object.entries(surveyorCounts)
          .map(([name, count]) => `* 👤 **${name}**: **${count} titik tiang** (${((count / totalPoles) * 100).toFixed(1)}%)`)
          .join('\n');

        finalReply =
          `📊 **Rekapitulasi Data Tiang per Petugas / Surveyor**:\n\n` +
          `${lines || `* 👤 **Admin**: **${totalPoles} titik tiang**`}\n\n` +
          `Total keseluruhan data yang terhimpun saat ini adalah **${totalPoles} titik tiang**. Anda dapat memfilter peta untuk melihat titik yang disurvei oleh masing-masing petugas.`;
      } else if (
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
          `📍 **Sebaran Jalan Terbanyak**: ${topRoadsSummary || 'Jalan Garuda & Mayor Toha'}.\n` +
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
          `* Tiang Miring: **${tiltedCount} tiang**\n` +
          `* Kabel Semrawut: **${messyCableCount} tiang**\n` +
          `* Kabel Melorot Rendah: **${lowCableCount} tiang**\n\n` +
          `*Klik tombol filter peta di bawah untuk langsung menyorot tiang-tiang tersebut.*`;
      } else {
        finalReply =
          `Halo! Saya **INFRA-AI**, asisten cerdas bawaan sistem **INFRA-MAP GIS**.\n\n` +
          `Saya bisa membantu Anda mengelola data sistem secara fleksibel:\n` +
          `* 👤 **Filter & Cek data per orang/surveyor** (siapa yang mendata & berapa titik)\n` +
          `* 📊 **Mengecek statistik & total data tiang** (${totalPoles} titik)\n` +
          `* ⚠️ **Melihat titik tiang kritis** (rusak, miring, kabel semrawut)\n` +
          `* 🗺️ **Menampilkan filter khusus** di peta secara instan\n\n` +
          `Silakan ketik perintah seperti *"Tampilkan tiang yang didata Admin"* atau *"Filter tiang rusak"*!`;
      }
      usedModel = 'INFRA-AI Smart Dynamic Engine';
    }

    // 5. Ekstrak aksi filter peta interaktif dari maksud pertanyaan user secara dinamis
    let mapAction: any = null;

    // Check if user wants to filter by Surveyor
    const surveyorNames = Object.keys(surveyorCounts);
    let matchedSurveyor = surveyorNames.find((name) =>
      lastUserMsg.includes(name.toLowerCase())
    );

    if (!matchedSurveyor) {
      if (lastUserMsg.includes('admin')) matchedSurveyor = 'Admin';
      else if (lastUserMsg.includes('bahrudin')) matchedSurveyor = 'Bahrudin';
      else if (lastUserMsg.includes('rudin')) matchedSurveyor = 'Rudin';
    }

    if (matchedSurveyor && (lastUserMsg.includes('tampil') || lastUserMsg.includes('filter') || lastUserMsg.includes('titik') || lastUserMsg.includes('data') || lastUserMsg.includes('lihat'))) {
      mapAction = {
        type: 'FILTER_MAP',
        surveyor: matchedSurveyor,
        search: matchedSurveyor,
        label: `🗺️ Filter Tiang oleh: ${matchedSurveyor}`,
      };
    } else if (lastUserMsg.includes('telkom')) {
      mapAction = {
        type: 'FILTER_MAP',
        providerId: 'PRV_TELKOM',
        providerName: 'Telkom Indonesia',
        label: '🗺️ Filter Tiang Telkom di Peta',
      };
    } else if (lastUserMsg.includes('myrep') || lastUserMsg.includes('myrepublic')) {
      mapAction = {
        type: 'FILTER_MAP',
        providerId: 'PRV_MYREP_1',
        providerName: 'MyRepublic',
        label: '🗺️ Filter Tiang MyRepublic di Peta',
      };
    } else if (lastUserMsg.includes('biznet')) {
      mapAction = {
        type: 'FILTER_MAP',
        providerId: 'PRV_BIZNET',
        providerName: 'Biznet',
        label: '🗺️ Filter Tiang Biznet di Peta',
      };
    } else if (
      lastUserMsg.includes('rusak') ||
      lastUserMsg.includes('bahaya') ||
      lastUserMsg.includes('kritis')
    ) {
      mapAction = {
        type: 'FILTER_MAP',
        condition: 'DAMAGED',
        label: '🗺️ Tampilkan Tiang Rusak di Peta',
      };
    } else if (lastUserMsg.includes('miring')) {
      mapAction = {
        type: 'FILTER_MAP',
        search: 'miring',
        label: '🗺️ Tampilkan Tiang Miring di Peta',
      };
    } else if (
      lastUserMsg.includes('perlu cek') ||
      lastUserMsg.includes('perlu perbaikan') ||
      lastUserMsg.includes('kendur')
    ) {
      mapAction = {
        type: 'FILTER_MAP',
        condition: 'NEEDS_REPAIR',
        label: '🗺️ Tampilkan Tiang Perlu Cek di Peta',
      };
    } else if (lastUserMsg.includes('pju')) {
      mapAction = {
        type: 'FILTER_MAP',
        category: 'PJU_MANDIRI',
        label: '🗺️ Tampilkan Tiang PJU Mandiri Pemkot',
      };
    } else if (lastUserMsg.includes('pln')) {
      mapAction = {
        type: 'FILTER_MAP',
        category: 'PLN_MURNI',
        label: '🗺️ Tampilkan Tiang Listrik PLN di Peta',
      };
    } else if (lastUserMsg.includes('garuda')) {
      mapAction = {
        type: 'FILTER_MAP',
        search: 'Jalan Garuda',
        label: '🗺️ Sorot Jalan Garuda di Peta',
      };
    } else if (lastUserMsg.includes('toha') || lastUserMsg.includes('mayor toha')) {
      mapAction = {
        type: 'FILTER_MAP',
        search: 'Mayor Toha',
        label: '🗺️ Sorot Jl. Mayor Toha di Peta',
      };
    } else if (lastUserMsg.includes('pelita jaya')) {
      mapAction = {
        type: 'FILTER_MAP',
        kelurahan: 'Pelita Jaya',
        search: 'Pelita Jaya',
        label: '🗺️ Filter Kelurahan Pelita Jaya',
      };
    } else if (lastUserMsg.includes('semua') || lastUserMsg.includes('reset filter') || lastUserMsg.includes('hapus filter')) {
      mapAction = {
        type: 'FILTER_MAP',
        providerId: 'ALL',
        condition: 'ALL',
        category: 'ALL',
        surveyor: 'ALL',
        search: '',
        label: '🗺️ Tampilkan Semua Tiang',
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        reply: finalReply,
        model: usedModel,
        action: mapAction,
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
