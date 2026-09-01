import { NextRequest, NextResponse } from 'next/server';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { Pole } from '@/types/pole';

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

// Helper to format ISO or YYYY-MM-DD to Indonesian human date
function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateStr;
  }
}

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

    // 1. Ambil seluruh database tiang secara real-time dan hitung seluruh dimensi data
    let allPoles: Pole[] = [];
    let totalPoles = 0;
    let goodCount = 0;
    let needsRepairCount = 0;
    let damagedCount = 0;

    // Physical Defects
    let tiltedCount = 0;
    let messyCableCount = 0;
    let lowCableCount = 0;
    let corrodedCount = 0;
    let hazardousCount = 0;
    let obstructingCount = 0;

    // Pole Material Types
    const poleTypeCounts: Record<string, number> = {
      BETON: 0,
      BESI: 0,
      KAYU: 0,
      LAINNYA: 0,
    };

    // Categories
    const categoryCounts: Record<string, number> = {
      FO_WIFI: 0,
      PJU_MANDIRI: 0,
      GABUNG_PLN_PJU: 0,
      PLN_MURNI: 0,
    };

    // PJU Lamp Conditions
    const pjuLampCounts: Record<string, number> = {
      MENYALA_NORMAL: 0,
      REDUP: 0,
      MATI_TOTAL: 0,
      PECAH_RUSAK: 0,
      TIDAK_ADA: 0,
    };

    // Cable Installation Types
    const cableTypeCounts: Record<string, number> = {
      UDARA: 0,
      BAWAH_TANAH: 0,
      TRANSISI_RISER: 0,
    };

    // Multi-dimensional Groupings
    const surveyorCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};
    const monthCounts: Record<string, number> = {};
    const surveyorByDate: Record<string, Record<string, number>> = {};
    const roadCounts: Record<string, number> = {};
    const kelurahanCounts: Record<string, number> = {};
    const kecamatanCounts: Record<string, number> = {};
    const providerCounts: Record<string, number> = {};

    try {
      const poleRepo = getPoleRepository();
      allPoles = await poleRepo.findAll();
      totalPoles = allPoles.length;

      allPoles.forEach((p) => {
        // Condition
        if (p.condition === 'GOOD') goodCount++;
        else if (p.condition === 'NEEDS_REPAIR') needsRepairCount++;
        else if (p.condition === 'DAMAGED') damagedCount++;

        // Defects
        if (p.isTilted) tiltedCount++;
        if (p.isMessyCable) messyCableCount++;
        if (p.isLowCable) lowCableCount++;
        if (p.isCorroded) corrodedCount++;
        if (p.isHazardous) hazardousCount++;
        if (p.isObstructing) obstructingCount++;

        // Pole Type
        const pType = p.poleType || 'LAINNYA';
        poleTypeCounts[pType] = (poleTypeCounts[pType] || 0) + 1;

        // Category
        const cat = p.infrastructureCategory || 'FO_WIFI';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // PJU Lamp
        if (p.pjuLampCondition) {
          pjuLampCounts[p.pjuLampCondition] = (pjuLampCounts[p.pjuLampCondition] || 0) + 1;
        }

        // Cable Type
        if (p.cableInstallationType) {
          cableTypeCounts[p.cableInstallationType] = (cableTypeCounts[p.cableInstallationType] || 0) + 1;
        }

        // Surveyor
        const sName = (p.surveyorName || 'Admin').trim();
        surveyorCounts[sName] = (surveyorCounts[sName] || 0) + 1;

        // Date (YYYY-MM-DD)
        const rawDate = (p.surveyDate || p.createdAt || '').slice(0, 10);
        if (rawDate && rawDate.length === 10) {
          dateCounts[rawDate] = (dateCounts[rawDate] || 0) + 1;

          const monthKey = rawDate.slice(0, 7); // YYYY-MM
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;

          if (!surveyorByDate[rawDate]) surveyorByDate[rawDate] = {};
          surveyorByDate[rawDate][sName] = (surveyorByDate[rawDate][sName] || 0) + 1;
        }

        // Spatial (Road, Kelurahan, Kecamatan)
        if (p.road) {
          const rName = p.road.trim();
          roadCounts[rName] = (roadCounts[rName] || 0) + 1;
        }
        if (p.kelurahan) {
          const kName = p.kelurahan.trim();
          kelurahanCounts[kName] = (kelurahanCounts[kName] || 0) + 1;
        }
        if (p.kecamatan) {
          const kecName = p.kecamatan.trim();
          kecamatanCounts[kecName] = (kecamatanCounts[kecName] || 0) + 1;
        }

        // Provider
        const prov = (p.providerName || p.providerId || 'Lainnya').trim();
        providerCounts[prov] = (providerCounts[prov] || 0) + 1;
      });
    } catch (dbErr) {
      console.warn('Gagal memuat snapshot database untuk AI context:', dbErr);
    }

    // Generate Human Summaries for System Prompt
    const surveyorSummary = Object.entries(surveyorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `* ${name}: ${count} tiang (${((count / (totalPoles || 1)) * 100).toFixed(1)}%)`)
      .join('\n');

    const topDatesSummary = Object.entries(dateCounts)
      .sort((a, b) => b[0].localeCompare(a[0])) // latest dates first
      .slice(0, 10)
      .map(([date, count]) => `* ${formatIndonesianDate(date)} (${date}): ${count} tiang`)
      .join('\n');

    const monthSummary = Object.entries(monthCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, count]) => `* Bulan ${month}: ${count} tiang`)
      .join('\n');

    const topRoadsSummary = Object.entries(roadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const kelurahanSummary = Object.entries(kelurahanCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const providerSummary = Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name}: ${count} tiang`)
      .join(', ');

    // 2. Susun System Prompt Khusus Analitika & Inventarisasi GIS
    const systemPrompt = `Anda adalah "INFRA-AI", asisten kecerdasan buatan resmi dari sistem INFRA-MAP GIS (Sistem Informasi Geografis Pemetaan Infrastruktur Utilitas Kota Lubuklinggau).

KEMAMPUAN UTAMA ANDA:
1. MENGUASAI SELURUH DATA SISTEM SECARA REAL-TIME: Anda memiliki akses analitik lengkap ke seluruh database tiang inventaris. Anda dapat menjawab query filter pertanggal, perbulan, per surveyor/orang, per kelurahan/kecamatan, per kondisi fisik, hingga jenis material dan kategori jaringan.
2. ANALITIKA TANGGAL & WAKTU: Anda tahu persis riwayat input data harian, mingguan, dan bulanan beserta siapa petugas yang mendata pada tanggal tersebut.
3. KONTROL PETA CERDAS (MAP ACTION): Anda dapat menginstruksikan peta untuk memfilter layer berdasarkan tanggal, surveyor, lokasi, atau kondisi kerusakan.

DATABASE REAL-TIME STATISTIK SISTEM (KOTA LUBUKLINGGAU):
* Total Tiang Terdata: ${totalPoles} titik tiang
* Kondisi: 🟢 Baik (${goodCount}), 🟡 Perlu Cek (${needsRepairCount}), 🔴 Rusak/Bahaya (${damagedCount})
* Kondisi Fisik Khusus: Tiang Miring (${tiltedCount}), Kabel Semrawut (${messyCableCount}), Kabel Melorot (${lowCableCount}), Berkarat (${corrodedCount}), Menghalangi Jalan (${obstructingCount})
* Jenis Tiang: Beton (${poleTypeCounts.BETON || 0}), Besi (${poleTypeCounts.BESI || 0}), Kayu (${poleTypeCounts.KAYU || 0}), Lainnya (${poleTypeCounts.LAINNYA || 0})
* Kategori Infrastruktur: Fiber Optik/WiFi (${categoryCounts.FO_WIFI || 0}), PJU Mandiri Pemkot (${categoryCounts.PJU_MANDIRI || 0}), Tiang PLN Gabung PJU (${categoryCounts.GABUNG_PLN_PJU || 0}), PLN Distribusi Listrik (${categoryCounts.PLN_MURNI || 0})
* Jalur Kabel: Udara (${cableTypeCounts.UDARA || 0}), Bawah Tanah/Tanam (${cableTypeCounts.BAWAH_TANAH || 0}), Transisi Riser (${cableTypeCounts.TRANSISI_RISER || 0})

REKAPITULASI INPUT PER TANGGAL (TERBARU):
${topDatesSummary || 'Data harian terhimpun'}

REKAPITULASI PER BULAN:
${monthSummary || 'Data bulanan terhimpun'}

REKAPITULASI PER SURVEYOR / PETUGAS:
${surveyorSummary || '* Admin: ' + totalPoles + ' tiang'}

SEBARAN JALAN UTAMA:
${topRoadsSummary || 'Jalan Garuda, Mayor Toha'}

SEBARAN KELURAHAN AKTIF:
${kelurahanSummary || 'Pelita Jaya, Sukajadi, Watervang'}

SEBARAN PROVIDER:
${providerSummary || 'Telkom, MyRepublic, Biznet'}

PANDUAN GAYA JAWABAN:
- Gunakan bahasa Indonesia yang ramah, profesional, cerdas, akurat, dan berwawasan data.
- Sajikan jawaban dengan format markdown yang terstruktur rapi (poin tebal, angka persentase, dan emoji yang relevan).
- Jika pengguna menanyakan tanggal tertentu (misal "tanggal 29", "tanggal 30", "hari ini", "bulan Agustus"), sebutkan angka pasti dan rincian petugas yang bekerja pada tanggal tersebut!
- Jawab secara to-the-point dan informatif.`;

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
            ...messages.slice(-6),
          ],
          temperature: 0.3,
          max_tokens: 750,
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
            break;
          }
        }
      } catch (tryErr) {
        console.warn(`Model ${modelToTry} gagal, mencoba fallback:`, tryErr);
      }
    }

    // 4. In-Memory Smart Dynamic Query Engine (Jika OpenRouter Offline / Fallback Cepat)
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';

    if (!finalReply) {
      // 4a. Query Filter Tanggal Spesifik (e.g. "tanggal 29", "tanggal 30", "2026-08-30", "kemarin", "hari ini")
      const dateMatch = lastUserMsg.match(/tanggal\s*(\d{1,2})|\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2})\s*(agustus|september|oktober|november|desember|januari|februari|maret|april|mei|juni|juli)/i);

      let matchedDateKey = '';
      if (dateMatch) {
        if (dateMatch[2]) {
          matchedDateKey = dateMatch[2];
        } else if (dateMatch[1]) {
          const dayNum = dateMatch[1].padStart(2, '0');
          // Find matching key in dateCounts ending with -DD
          matchedDateKey = Object.keys(dateCounts).find((k) => k.endsWith(`-${dayNum}`)) || '';
        }
      }

      if (lastUserMsg.includes('tanggal') || lastUserMsg.includes('harian') || matchedDateKey) {
        if (matchedDateKey && dateCounts[matchedDateKey] !== undefined) {
          const count = dateCounts[matchedDateKey];
          const surveyorOnDate = surveyorByDate[matchedDateKey] || {};
          const sLines = Object.entries(surveyorOnDate)
            .map(([sName, sCount]) => `* 👤 **${sName}**: **${sCount} titik tiang**`)
            .join('\n');

          const polesOnDate = allPoles.filter(p => (p.surveyDate || p.createdAt || '').startsWith(matchedDateKey));
          const goodOnDate = polesOnDate.filter(p => p.condition === 'GOOD').length;
          const badOnDate = polesOnDate.filter(p => p.condition === 'DAMAGED' || p.condition === 'NEEDS_REPAIR').length;

          finalReply =
            `📅 **Data Survei Tiang pada Tanggal ${formatIndonesianDate(matchedDateKey)}** (${matchedDateKey}):\n\n` +
            `* 📍 **Total Titik Terdata**: **${count} tiang**\n` +
            `* 🟢 **Kondisi Baik**: **${goodOnDate} tiang**\n` +
            `* 🟡🔴 **Perlu Cek / Rusak**: **${badOnDate} tiang**\n\n` +
            `👥 **Rincian Petugas / Surveyor pada Tanggal Ini**:\n` +
            `${sLines || '* 👤 Admin: ' + count + ' tiang'}\n\n` +
            `*Anda dapat melihat titik-titik tanggal ini langsung di peta GIS.*`;
        } else {
          const dateListLines = Object.entries(dateCounts)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 8)
            .map(([d, c]) => `* 📅 **${formatIndonesianDate(d)}**: **${c} tiang**`)
            .join('\n');

          finalReply =
            `📅 **Rekapitulasi Data Survei Berdasarkan Tanggal**:\n\n` +
            `${dateListLines || 'Data per tanggal terhimpun dalam sistem.'}\n\n` +
            `Total keseluruhan data yang terhimpun adalah **${totalPoles} titik tiang**. Anda dapat bertanya spesifik seperti *"Berapa data tanggal 30 Agustus?"* untuk analisis mendalam.`;
        }
      } else if (
        lastUserMsg.includes('bulan') ||
        lastUserMsg.includes('agustus') ||
        lastUserMsg.includes('september')
      ) {
        const monthLines = Object.entries(monthCounts)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([m, c]) => `* 🗓️ **Bulan ${m}**: **${c} titik tiang** (${((c / totalPoles) * 100).toFixed(1)}%)`)
          .join('\n');

        finalReply =
          `🗓️ **Rekapitulasi Data Inventaris Tiang per Bulan**:\n\n` +
          `${monthLines}\n\n` +
          `Total inventaris Kota Lubuklinggau saat ini mencapai **${totalPoles} titik tiang**.`;
      } else if (
        lastUserMsg.includes('surveyor') ||
        lastUserMsg.includes('admin') ||
        lastUserMsg.includes('bahrudin') ||
        lastUserMsg.includes('orang') ||
        lastUserMsg.includes('pendata') ||
        lastUserMsg.includes('petugas')
      ) {
        const sLines = Object.entries(surveyorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `* 👤 **${name}**: **${count} titik tiang** (${((count / totalPoles) * 100).toFixed(1)}%)`)
          .join('\n');

        finalReply =
          `📊 **Rekapitulasi Data Tiang per Petugas / Surveyor**:\n\n` +
          `${sLines || `* 👤 **Admin**: **${totalPoles} titik tiang**`}\n\n` +
          `Total keseluruhan data yang terhimpun saat ini adalah **${totalPoles} titik tiang**. Anda dapat memfilter peta untuk melihat titik yang disurvei oleh masing-masing petugas.`;
      } else if (
        lastUserMsg.includes('beton') ||
        lastUserMsg.includes('besi') ||
        lastUserMsg.includes('kayu') ||
        lastUserMsg.includes('jenis tiang') ||
        lastUserMsg.includes('material')
      ) {
        finalReply =
          `🏗️ **Komposisi Material & Jenis Tiang Utilitas**:\n\n` +
          `* 🏢 **Tiang Beton**: **${poleTypeCounts.BETON || 0} tiang** (${(((poleTypeCounts.BETON || 0) / totalPoles) * 100).toFixed(1)}%)\n` +
          `* ⚙️ **Tiang Besi / Baja**: **${poleTypeCounts.BESI || 0} tiang** (${(((poleTypeCounts.BESI || 0) / totalPoles) * 100).toFixed(1)}%)\n` +
          `* 🪵 **Tiang Kayu**: **${poleTypeCounts.KAYU || 0} tiang** (${(((poleTypeCounts.KAYU || 0) / totalPoles) * 100).toFixed(1)}%)\n` +
          `* 🏷️ **Lainnya**: **${poleTypeCounts.LAINNYA || 0} tiang**\n\n` +
          `Karakteristik tiang dicatat lengkap dengan jalur kabel udara (${cableTypeCounts.UDARA || 0}) maupun bawah tanah (${cableTypeCounts.BAWAH_TANAH || 0}).`;
      } else if (
        lastUserMsg.includes('pju') ||
        lastUserMsg.includes('lampu') ||
        lastUserMsg.includes('penerangan')
      ) {
        finalReply =
          `💡 **Status Jaringan & Lampu PJU (Penerangan Jalan Umum)**:\n\n` +
          `* 💡 **Tiang PJU Mandiri Pemkot**: **${categoryCounts.PJU_MANDIRI || 0} tiang**\n` +
          `* ⚡ **Tiang PLN Gabung PJU**: **${categoryCounts.GABUNG_PLN_PJU || 0} tiang**\n` +
          `* 🟢 **Lampu Menyala Normal**: **${pjuLampCounts.MENYALA_NORMAL || 0} unit**\n` +
          `* 🟡 **Lampu Redup**: **${pjuLampCounts.REDUP || 0} unit**\n` +
          `* 🔴 **Lampu Mati / Rusak**: **${(pjuLampCounts.MATI_TOTAL || 0) + (pjuLampCounts.PECAH_RUSAK || 0)} unit**\n\n` +
          `PJU dikelola terintegrasi untuk efisiensi energi dan pemeliharaan lampu jalan Kota Lubuklinggau.`;
      } else if (
        lastUserMsg.includes('rusak') ||
        lastUserMsg.includes('bahaya') ||
        lastUserMsg.includes('kritis') ||
        lastUserMsg.includes('miring') ||
        lastUserMsg.includes('semrawut') ||
        lastUserMsg.includes('kendur')
      ) {
        finalReply =
          `⚠️ **Status Titik Kritis, Kerusakan & Bahaya**:\n\n` +
          `Saat ini terdapat **${damagedCount} tiang Rusak/Bahaya** dan **${needsRepairCount} tiang Perlu Cek**:\n\n` +
          `* 📐 Tiang Miring: **${tiltedCount} tiang**\n` +
          `* 🧶 Kabel Semrawut: **${messyCableCount} tiang**\n` +
          `* 📉 Kabel Melorot Rendah: **${lowCableCount} tiang**\n` +
          `* 🔩 Berkarat / Retak: **${corrodedCount} tiang**\n` +
          `* ⛔ Mengganggu Jalan / Trotoar: **${obstructingCount} tiang**\n\n` +
          `*Gunakan tombol filter di bawah untuk langsung menyorot tiang bermasalah di peta.*`;
      } else if (
        lastUserMsg.includes('rekap') ||
        lastUserMsg.includes('total') ||
        lastUserMsg.includes('jumlah') ||
        lastUserMsg.includes('statistik')
      ) {
        finalReply =
          `📊 **Rekapitulasi Eksekutif Inventaris Tiang (Kota Lubuklinggau)**:\n\n` +
          `* 📍 **Total Tiang Terdata**: **${totalPoles} titik tiang**\n` +
          `* 🟢 **Kondisi Baik**: **${goodCount} tiang** (${((goodCount / totalPoles) * 100).toFixed(1)}%)\n` +
          `* 🟡 **Perlu Cek**: **${needsRepairCount} tiang** (${((needsRepairCount / totalPoles) * 100).toFixed(1)}%)\n` +
          `* 🔴 **Rusak / Bahaya**: **${damagedCount} tiang** (${((damagedCount / totalPoles) * 100).toFixed(1)}%)\n\n` +
          `🏘️ **Kelurahan Teraktif**: ${kelurahanSummary}.\n` +
          `🛣️ **Ruas Jalan Terbanyak**: ${topRoadsSummary}.\n` +
          `Data tersinkronisasi langsung secara real-time dengan peta spasial GIS.`;
      } else {
        finalReply =
          `Halo! Saya **INFRA-AI**, asisten cerdas bawaan sistem **INFRA-MAP GIS**.\n\n` +
          `Saya bisa menganalisis dan mengelola semua data inventaris sistem kami:\n` +
          `* 📅 **Filter per tanggal & bulan** (contoh: *"Berapa data tanggal 30 Agustus?"*)\n` +
          `* 👤 **Filter per orang / surveyor** (siapa yang mendata & berapa titik)\n` +
          `* 🏗️ **Filter jenis material & kategori** (Beton, Besi, PJU, PLN, Fiber Optik)\n` +
          `* ⚠️ **Mengecek titik kerusakan** (tiang miring, kabel semrawut, kabel melorot)\n` +
          `* 🗺️ **Menggerakkan & memfilter peta GIS** secara otomatis\n\n` +
          `Ada yang ingin Anda tanyakan seputar data infrastruktur kita?`;
      }
      usedModel = 'INFRA-AI Multi-Dimensional Query Engine';
    }

    // 5. Ekstrak aksi filter peta interaktif dari maksud pertanyaan user secara dinamis
    let mapAction: any = null;

    // Check for date filter
    const dateMatchForMap = lastUserMsg.match(/tanggal\s*(\d{1,2})|\b(\d{4}-\d{2}-\d{2})\b/i);
    let matchedDateForMap = '';
    if (dateMatchForMap) {
      if (dateMatchForMap[2]) {
        matchedDateForMap = dateMatchForMap[2];
      } else if (dateMatchForMap[1]) {
        const dayNum = dateMatchForMap[1].padStart(2, '0');
        matchedDateForMap = Object.keys(dateCounts).find((k) => k.endsWith(`-${dayNum}`)) || '';
      }
    }

    if (matchedDateForMap && (lastUserMsg.includes('tampil') || lastUserMsg.includes('filter') || lastUserMsg.includes('peta') || lastUserMsg.includes('titik') || lastUserMsg.includes('lihat'))) {
      mapAction = {
        type: 'FILTER_MAP',
        date: matchedDateForMap,
        label: `🗺️ Filter Tanggal: ${formatIndonesianDate(matchedDateForMap)}`,
      };
    } else {
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
      } else if (lastUserMsg.includes('beton')) {
        mapAction = {
          type: 'FILTER_MAP',
          typeFilter: 'BETON',
          label: '🗺️ Filter Tiang Beton di Peta',
        };
      } else if (lastUserMsg.includes('besi')) {
        mapAction = {
          type: 'FILTER_MAP',
          typeFilter: 'BESI',
          label: '🗺️ Filter Tiang Besi di Peta',
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
          reset: true,
          label: '🗺️ Tampilkan Semua Tiang',
        };
      }
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
