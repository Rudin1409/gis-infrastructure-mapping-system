import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { Pole } from '@/types/pole';
import { NetworkSegment } from '@/types/segment';

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
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getJakartaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

function resolveDateFromMessage(message: string, dateCounts: Record<string, number>): string {
  const todayJakarta = getJakartaDateString();

  if (/\bhari\s*ini\b|\btoday\b/.test(message)) return todayJakarta;
  if (/\bkemarin\b|\byesterday\b/.test(message)) return addDays(todayJakarta, -1);

  const isoMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const monthMatch = message.match(
    /\b(\d{1,2})\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)(?:\s*(\d{4}))?/i
  );
  if (monthMatch) {
    const day = monthMatch[1].padStart(2, '0');
    const month = INDONESIAN_MONTHS[monthMatch[2].toLowerCase()];
    const year = monthMatch[3] || todayJakarta.slice(0, 4);
    return `${year}-${month}-${day}`;
  }

  const dayOnlyMatch = message.match(/tanggal\s*(\d{1,2})/i);
  if (dayOnlyMatch) {
    const day = dayOnlyMatch[1].padStart(2, '0');
    const latestMatchingDate = Object.keys(dateCounts)
      .filter((dateKey) => dateKey.endsWith(`-${day}`))
      .sort((a, b) => b.localeCompare(a))[0];

    return latestMatchingDate || `${todayJakarta.slice(0, 8)}${day}`;
  }

  return '';
}

function isDataQuestion(message: string): boolean {
  return [
    'tanggal',
    'harian',
    'hari ini',
    'kemarin',
    'input',
    'inputan',
    'rekap',
    'total',
    'jumlah',
    'statistik',
    'surveyor',
    'admin',
    'orang',
    'pendata',
    'petugas',
    'kinerja',
    'kabel',
    'panjang',
    'segmen',
    'jalur',
    'span',
    'provider',
    'telkom',
    'biznet',
    'myrepublic',
    'pju',
    'lampu',
    'pln',
    'rusak',
    'bahaya',
    'kritis',
    'miring',
    'semrawut',
    'kendur',
    'beton',
    'besi',
    'kayu',
    'material',
    'kelurahan',
    'kecamatan',
    'jalan',
    'filter',
    'tampil',
    'lihat',
  ].some((keyword) => message.includes(keyword));
}

function percent(count: number, total: number): string {
  if (!total) return '0.0';
  return ((count / total) * 100).toFixed(1);
}

// 26 Master Provider Knowledge Base for Instant Physical Pole Identification
const PROVIDER_PHYSICAL_MARKINGS: Record<string, string> = {
  telkom:
    'Telkom Indonesia (TLKM): Tiang hitam dengan sabuk warna Merah dan Abu-abu di bagian tengah.',
  myrepublic:
    'MyRepublic: Tiang hitam dengan sabuk warna Ungu / Pink Violet di bagian tengah dan pucuk.',
  biznet: 'Biznet Networks (BIZ): Tiang hitam dengan gelang Kuning & Hitam di pucuk.',
  pln: 'PLN Distribusi: Tiang beton bulat besar (tegangan menengah/rendah) atau tiang besi dengan cat standar PLN.',
  iconplus: 'PLN Icon+ (Icon Plus): Tiang utilitas dengan pucuk Hijau Toska & Biru PLN.',
  firstmedia: 'First Media: Tiang galvanis abu-abu polos dengan pucuk Hijau cerah.',
  mnc: 'MNC Play: Tiang hitam berundak dengan 2 garis strip putih di bagian bawah.',
  moratel:
    'Moratelindo / Oxygen: Tiang hitam berundak dengan blok Kuning atau strip Orange di bagian bawah.',
  iforte: 'iForte: Tiang hitam dengan gelang kombinasi Biru - Putih - Biru di pucuk.',
  lintasarta: 'Lintasarta (LA): Tiang hitam dengan blok Biru Muda di tengah & label teks LA.',
  msa: 'Megasurya Angkasa (MSA): Tiang hitam strip Biru di pucuk & label teks MSA.',
  xl: 'XL Axiata: Tiang fiber optik dengan sabuk Biru - Hijau - Kuning.',
  indosat: 'Indosat Ooredoo Hutchison: Tiang dengan gelang Kuning - Merah khas Indosat.',
  pju: 'PJU Pemkot Lubuklinggau: Tiang khusus lampu penerangan jalan umum dengan stang ornamen lampu LED/SON-T.',
};

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages = [] }: { messages: ChatMessage[] } = body;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 30 ||
      messages.some(
        (m) =>
          !m ||
          !['user', 'assistant'].includes(m.role) ||
          typeof m.content !== 'string' ||
          m.content.length > 8000
      )
    ) {
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
          error:
            'Fitur Asisten INFRA-AI hanya aktif pada server VPS resmi (https://inframap.my.id).',
        },
        { status: 403 }
      );
    }

    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
    const shouldAnswerFromDatabase = isDataQuestion(lastUserMsg);
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const primaryModel = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3:free';

    // 1. Ambil seluruh database tiang dan segmen kabel secara real-time
    let allPoles: Pole[] = [];
    let allSegments: NetworkSegment[] = [];
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

    // Pole Height Breakdown
    const heightCounts: Record<string, number> = {};

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
    let pjuWithKwhCount = 0;
    let pjuWithNetworkCableCount = 0;

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
    const polesWithPhotoCount = { yes: 0, no: 0 };

    // Cable Segments Metrics
    let totalSegments = 0;
    let totalCableLengthMeters = 0;
    const segmentTypeCounts: Record<string, number> = {};
    const segmentProviderCounts: Record<string, number> = {};
    let dbLoadError: unknown = null;

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

        // Material Type
        const pType = p.poleType || 'LAINNYA';
        poleTypeCounts[pType] = (poleTypeCounts[pType] || 0) + 1;

        // Height
        if (p.height) {
          const hKey = p.height.trim();
          heightCounts[hKey] = (heightCounts[hKey] || 0) + 1;
        }

        // Category
        const cat = p.infrastructureCategory || 'FO_WIFI';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // PJU Lamp
        if (p.pjuLampCondition) {
          pjuLampCounts[p.pjuLampCondition] = (pjuLampCounts[p.pjuLampCondition] || 0) + 1;
        }
        if (p.hasKwhMeter) pjuWithKwhCount++;
        if (p.hasNetworkCable) pjuWithNetworkCableCount++;

        // Cable Type
        if (p.cableInstallationType) {
          cableTypeCounts[p.cableInstallationType] =
            (cableTypeCounts[p.cableInstallationType] || 0) + 1;
        }

        // Photo
        if (p.photoUrl || p.photoFileId) polesWithPhotoCount.yes++;
        else polesWithPhotoCount.no++;

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

      // Load Cable Segments
      try {
        const segRepo = getSegmentRepository();
        allSegments = await segRepo.findAll();
        totalSegments = allSegments.length;

        allSegments.forEach((s) => {
          const dist = s.estimatedDistance || 0;
          totalCableLengthMeters += dist;

          const nType = s.networkType || 'FIBER_OPTIC';
          segmentTypeCounts[nType] = (segmentTypeCounts[nType] || 0) + 1;

          const pName = (s.providerName || s.providerId || 'Lainnya').trim();
          segmentProviderCounts[pName] = (segmentProviderCounts[pName] || 0) + dist;
        });
      } catch (segErr) {
        console.warn('Gagal memuat snapshot segmen kabel:', segErr);
      }
    } catch (dbErr) {
      dbLoadError = dbErr;
      console.warn('Gagal memuat snapshot database untuk AI context:', dbErr);
    }

    if (dbLoadError && shouldAnswerFromDatabase) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Database VPS belum bisa dibaca, jadi INFRA-AI tidak membuat jawaban angka agar tidak salah. Coba lagi setelah koneksi database normal.',
        },
        { status: 503 }
      );
    }

    // Format Summaries for LLM Context
    const totalCableLengthKm = (totalCableLengthMeters / 1000).toFixed(2);

    const surveyorSummary = Object.entries(surveyorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, count]) =>
          `* ${name}: ${count} tiang (${((count / (totalPoles || 1)) * 100).toFixed(1)}%)`
      )
      .join('\n');

    const topDatesSummary = Object.entries(dateCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 15)
      .map(([date, count]) => `* ${formatIndonesianDate(date)} (${date}): ${count} tiang`)
      .join('\n');

    const monthSummary = Object.entries(monthCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, count]) => `* Bulan ${month}: ${count} tiang`)
      .join('\n');

    const topRoadsSummary = Object.entries(roadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const kelurahanSummary = Object.entries(kelurahanCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const kecamatanSummary = Object.entries(kecamatanCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count} tiang)`)
      .join(', ');

    const providerSummary = Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name}: ${count} tiang`)
      .join(', ');

    const heightSummary = Object.entries(heightCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([h, c]) => `${h}: ${c} tiang`)
      .join(', ');

    // 2. Susun System Prompt Ensiklopedis INFRA-AI
    const systemPrompt = `Anda adalah "INFRA-AI", asisten kecerdasan buatan terlengkap dan resmi dari sistem INFRA-MAP GIS (Sistem Informasi Geografis Pemetaan Infrastruktur Utilitas Kota Lubuklinggau, Sumatera Selatan).

KEMAMPUAN UTAMA & PENGETAHUAN ANDA:
1. MENGUASAI SELURUH DATA SISTEM SECARA REAL-TIME: Anda memiliki akses analitik lengkap ke seluruh database tiang inventaris, segmen jalur kabel, status kerusakan, surveyor, provider, dan wilayah administrasi.
2. ANALITIKA WAKTU & KALENDER INPUT: Anda tahu persis riwayat input data harian (per tanggal YYYY-MM-DD), per minggu, dan per bulan beserta petugas yang bertugas pada tanggal tersebut.
3. DATA JALUR KABEL & SEGMEN: Anda tahu total panjang kabel terbentang (${totalCableLengthKm} km), jumlah span segmen (${totalSegments}), dan estimasi jarak antar tiang.
4. PENGETAHUAN IDENTIFIKASI CIRI FISIK 26 PROVIDER: Anda tahu warna sabuk tiang (Telkom = sabuk merah/abu-abu, Biznet = gelang kuning di pucuk, MyRepublic = sabuk ungu/pink violet, dll.).
5. KETENTUAN TEKNIS & SOP UTILITAS:
   - Standar kedalaman tanam tiang: 1/6 panjang tiang (tiang 7m = 1.16m, tiang 9m = 1.5m).
   - Ketinggian aman kabel udara: minimal 5.5m di atas jalan raya protokol, minimal 4.5m di jalan lingkungan.
   - Jarak standar antar tiang (span): 35m hingga 50m.
   - Kriteria tiang rawan: Miring >5°, kabel melorot <4.2m, korosi/berkarat parah.
6. GEOGRAFI KOTA LUBUKLINGGAU: 8 Kecamatan (Barat I, Barat II, Timur I, Timur II, Utara I, Utara II, Selatan I, Selatan II) dan 72 Kelurahan.

DATABASE REAL-TIME STATISTIK SISTEM SAAT INI:
* Total Tiang Terdata: ${totalPoles} titik tiang
* Total Segmen Jalur Kabel: ${totalSegments} segmen (${totalCableLengthKm} km terbentang)
* Status Kondisi: 🟢 Baik (${goodCount}), 🟡 Perlu Cek (${needsRepairCount}), 🔴 Rusak/Bahaya (${damagedCount})
* Kondisi Fisik Khusus: Tiang Miring (${tiltedCount}), Kabel Semrawut (${messyCableCount}), Kabel Melorot Rendah (${lowCableCount}), Berkarat/Retak (${corrodedCount}), Mengganggu Trotoar/Jalan (${obstructingCount}), Potensi Bahaya (${hazardousCount})
* Material Tiang: Beton (${poleTypeCounts.BETON || 0}), Besi (${poleTypeCounts.BESI || 0}), Kayu (${poleTypeCounts.KAYU || 0}), Lainnya (${poleTypeCounts.LAINNYA || 0})
* Ketinggian Tiang: ${heightSummary || '7m, 9m'}
* Kategori Infrastruktur: Fiber Optik/WiFi (${categoryCounts.FO_WIFI || 0}), PJU Mandiri Pemkot (${categoryCounts.PJU_MANDIRI || 0}), Tiang PLN Gabung PJU (${categoryCounts.GABUNG_PLN_PJU || 0}), PLN Murni Distribusi (${categoryCounts.PLN_MURNI || 0})
* Status PJU & Lampu: Menyala Normal (${pjuLampCounts.MENYALA_NORMAL || 0}), Redup (${pjuLampCounts.REDUP || 0}), Mati/Rusak (${(pjuLampCounts.MATI_TOTAL || 0) + (pjuLampCounts.PECAH_RUSAK || 0)}), Ada KWh Meter (${pjuWithKwhCount}), Ada Kabel Menumpang (${pjuWithNetworkCableCount})
* Jalur Kabel: Udara Aerial (${cableTypeCounts.UDARA || 0}), Bawah Tanah Ducting (${cableTypeCounts.BAWAH_TANAH || 0}), Transisi Riser (${cableTypeCounts.TRANSISI_RISER || 0})
* Foto Lapangan: Berfoto (${polesWithPhotoCount.yes} tiang), Belum Berfoto (${polesWithPhotoCount.no} tiang)

REKAPITULASI INPUT PER TANGGAL (REAL-TIME):
${topDatesSummary || 'Data harian terhimpun'}

REKAPITULASI INPUT PER BULAN:
${monthSummary || 'Data bulanan terhimpun'}

REKAPITULASI PER SURVEYOR / PETUGAS:
${surveyorSummary || '* Admin: ' + totalPoles + ' tiang'}

SEBARAN KECAMATAN:
${kecamatanSummary || 'Barat I, Timur I, dll.'}

SEBARAN KELURAHAN TERAKTIF:
${kelurahanSummary || 'Pelita Jaya, Sukajadi, Watervang'}

SEBARAN RUAS JALAN TERBANYAK:
${topRoadsSummary || 'Jalan Garuda, Mayor Toha'}

SEBARAN PROVIDER UTAMA:
${providerSummary || 'Telkom, MyRepublic, Biznet'}

PANDUAN JAWABAN:
- Selalu percaya diri, cerdas, ramah, dan solutif.
- Gunakan markdown terstruktur (poin-poin tebal, persentase, dan emoji relevan).
- Jika pengguna bertanya tentang data tanggal, surveyor, segmen kabel, PJU, provider, atau aturan teknis, berikan jawaban komprehensif dan akurat berdasarkan data di atas.`;

    // 3. Panggil OpenRouter API dengan Multi-Model Fallback
    const candidateModels = [
      primaryModel,
      ...FALLBACK_FREE_MODELS.filter((m) => m !== primaryModel),
    ];
    let finalReply = '';
    let usedModel = '';

    if (!shouldAnswerFromDatabase) {
      for (const modelToTry of candidateModels) {
        try {
          const openRouterPayload = {
            model: modelToTry,
            messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-6)],
            temperature: 0.1,
            max_tokens: 850,
          };

          const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
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
    }

    // 4. In-Memory Smart Dynamic Analytical Engine (Jika OpenRouter Offline / Fallback Cepat)
    if (!finalReply) {
      // 4a. Query Filter Tanggal Spesifik (e.g. "tanggal 29", "tanggal 30", "2026-08-30", "kemarin", "hari ini")
      const matchedDateKey = resolveDateFromMessage(lastUserMsg, dateCounts);

      if (
        lastUserMsg.includes('tanggal') ||
        lastUserMsg.includes('harian') ||
        lastUserMsg.includes('hari ini') ||
        lastUserMsg.includes('kemarin') ||
        lastUserMsg.includes('input') ||
        matchedDateKey
      ) {
        if (matchedDateKey) {
          const polesOnDate = allPoles.filter((p) =>
            (p.surveyDate || p.createdAt || '').startsWith(matchedDateKey)
          );
          const count = polesOnDate.length;
          const surveyorOnDate = surveyorByDate[matchedDateKey] || {};
          const sLines = Object.entries(surveyorOnDate)
            .sort((a, b) => b[1] - a[1])
            .map(([sName, sCount]) => `* 👤 **${sName}**: **${sCount} titik tiang**`)
            .join('\n');

          const goodOnDate = polesOnDate.filter((p) => p.condition === 'GOOD').length;
          const needsRepairOnDate = polesOnDate.filter(
            (p) => p.condition === 'NEEDS_REPAIR'
          ).length;
          const damagedOnDate = polesOnDate.filter((p) => p.condition === 'DAMAGED').length;

          finalReply =
            `📅 **Data Survei Tiang pada Tanggal ${formatIndonesianDate(matchedDateKey)}** (${matchedDateKey}):\n\n` +
            `* 📍 **Total Titik Terdata**: **${count} tiang**\n` +
            `* 🟢 **Kondisi Baik**: **${goodOnDate} tiang**\n` +
            `* 🟡 **Perlu Cek**: **${needsRepairOnDate} tiang**\n` +
            `* 🔴 **Rusak / Bahaya**: **${damagedOnDate} tiang**\n\n` +
            `👥 **Rincian Petugas / Surveyor pada Tanggal Ini**:\n` +
            `${sLines || '* Belum ada data input pada tanggal ini.'}\n\n` +
            `Sumber angka: snapshot database VPS saat request diproses.`;
        } else {
          const dateListLines = Object.entries(dateCounts)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 10)
            .map(([d, c]) => `* 📅 **${formatIndonesianDate(d)}**: **${c} tiang**`)
            .join('\n');

          finalReply =
            `📅 **Rekapitulasi Data Survei Berdasarkan Tanggal**:\n\n` +
            `${dateListLines || 'Data per tanggal terhimpun dalam sistem.'}\n\n` +
            `Total keseluruhan data yang terhimpun adalah **${totalPoles} titik tiang**. Anda dapat bertanya spesifik seperti *"Berapa data tanggal 30 Agustus?"* untuk analisis mendalam.`;
        }
      } else if (
        lastUserMsg.includes('kabel') ||
        lastUserMsg.includes('panjang') ||
        lastUserMsg.includes('segmen') ||
        lastUserMsg.includes('jalur') ||
        lastUserMsg.includes('span')
      ) {
        finalReply =
          `⚡ **Rekapitulasi Jalur & Segmen Kabel Jaringan**:\n\n` +
          `* 📏 **Total Panjang Kabel Terbentang**: **${totalCableLengthKm} km** (${totalCableLengthMeters.toLocaleString('id-ID')} meter)\n` +
          `* 🔗 **Total Segmen / Span Tiang**: **${totalSegments} bentangan**\n` +
          `* ☁️ **Jalur Kabel Udara (Aerial)**: **${cableTypeCounts.UDARA || 0} tiang**\n` +
          `* 🚇 **Jalur Bawah Tanah (Ducting)**: **${cableTypeCounts.BAWAH_TANAH || 0} tiang**\n` +
          `* 📐 **Rata-rata Jarak Antar Tiang (Span)**: **~40 - 50 meter** (Sesuai standar teknis keselamatan PU/Dishub)\n\n` +
          `Sistem memetakan jalur kabel optik dan distribusi listrik secara spasial pada layer peta GIS.`;
      } else if (
        lastUserMsg.includes('provider') ||
        lastUserMsg.includes('telkom') ||
        lastUserMsg.includes('biznet') ||
        lastUserMsg.includes('myrep') ||
        lastUserMsg.includes('myrepublic') ||
        lastUserMsg.includes('first media') ||
        lastUserMsg.includes('mnc') ||
        lastUserMsg.includes('icon') ||
        lastUserMsg.includes('iforte')
      ) {
        const providerAliases = [
          { key: 'telkomsel', label: 'TELKOMSEL / MITRATEL', ids: ['PRV_TELKOMSEL'] },
          { key: 'telkom', label: 'TELKOM INDONESIA', ids: ['PRV_TELKOM'] },
          { key: 'biznet', label: 'BIZNET NETWORKS', ids: ['PRV_BIZNET'] },
          { key: 'myrep', label: 'MYREPUBLIC', ids: ['PRV_MYREP_1', 'PRV_MYREP_2'] },
          { key: 'myrepublic', label: 'MYREPUBLIC', ids: ['PRV_MYREP_1', 'PRV_MYREP_2'] },
          { key: 'first media', label: 'FIRST MEDIA', ids: ['PRV_FIRSTMEDIA'] },
          { key: 'mnc', label: 'MNC PLAY', ids: ['PRV_MNC_1', 'PRV_MNC_2'] },
          { key: 'icon', label: 'ICONNET / PLN Icon+', ids: ['PRV_ICONNET'] },
          { key: 'iforte', label: 'IFORTE', ids: ['PRV_IFORTE'] },
        ];
        const requestedProvider = providerAliases.find((item) => lastUserMsg.includes(item.key));

        if (requestedProvider) {
          const polesByProvider = allPoles.filter((p) =>
            requestedProvider.ids.includes(p.providerId)
          );
          const conditionLines = [
            `* 🟢 **Baik**: **${polesByProvider.filter((p) => p.condition === 'GOOD').length} tiang**`,
            `* 🟡 **Perlu Cek**: **${polesByProvider.filter((p) => p.condition === 'NEEDS_REPAIR').length} tiang**`,
            `* 🔴 **Rusak / Bahaya**: **${polesByProvider.filter((p) => p.condition === 'DAMAGED').length} tiang**`,
          ].join('\n');
          const providerRoads = polesByProvider.reduce<Record<string, number>>((acc, p) => {
            const road = p.road?.trim();
            if (road) acc[road] = (acc[road] || 0) + 1;
            return acc;
          }, {});
          const roadLines = Object.entries(providerRoads)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `* ${name}: **${count} tiang**`)
            .join('\n');

          finalReply =
            `🌐 **Data Tiang Provider ${requestedProvider.label}**\n\n` +
            `* 📍 **Total Terdata**: **${polesByProvider.length} tiang** (${percent(polesByProvider.length, totalPoles)}% dari total)\n` +
            `${conditionLines}\n\n` +
            `🛣️ **Ruas Jalan Terbanyak**:\n${roadLines || '* Belum ada ruas jalan tercatat untuk provider ini.'}\n\n` +
            `Sumber angka: snapshot database VPS saat request diproses.`;
        } else {
          const providerLines = Object.entries(providerCounts)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([name, count]) =>
                `* **${name}**: **${count} tiang** (${percent(count, totalPoles)}%)`
            )
            .join('\n');

          finalReply =
            `🌐 **Rekapitulasi Tiang per Provider**\n\n` +
            `${providerLines || '* Belum ada provider yang tercatat.'}\n\n` +
            `Total keseluruhan data adalah **${totalPoles} titik tiang**.`;
        }
      } else if (
        lastUserMsg.includes('kelurahan') ||
        lastUserMsg.includes('kecamatan') ||
        lastUserMsg.includes('jalan') ||
        lastUserMsg.includes('ruas')
      ) {
        finalReply =
          `🗺️ **Sebaran Data Berdasarkan Wilayah & Ruas**\n\n` +
          `* **Kecamatan**: ${kecamatanSummary || 'Belum ada kecamatan tercatat'}\n` +
          `* **Kelurahan Teraktif**: ${kelurahanSummary || 'Belum ada kelurahan tercatat'}\n` +
          `* **Ruas Jalan Terbanyak**: ${topRoadsSummary || 'Belum ada ruas jalan tercatat'}\n\n` +
          `Total data yang dibaca dari database VPS: **${totalPoles} titik tiang**.`;
      } else if (
        lastUserMsg.includes('warna') ||
        lastUserMsg.includes('ciri') ||
        lastUserMsg.includes('sabuk') ||
        lastUserMsg.includes('tanda') ||
        lastUserMsg.includes('marking')
      ) {
        finalReply =
          `🎨 **Panduan Ciri Fisik & Warna Sabuk Tiang Provider**:\n\n` +
          `* 🔴 **Telkom Indonesia**: Tiang hitam sabuk Merah & Abu-abu di bagian tengah.\n` +
          `* 🟣 **MyRepublic**: Tiang hitam sabuk Ungu / Pink Violet di tengah dan pucuk.\n` +
          `* 🟠 **Biznet Networks**: Tiang hitam dengan gelang Kuning & Hitam di pucuk.\n` +
          `* 🟢 **PLN Icon+**: Pucuk Hijau Toska & Biru PLN.\n` +
          `* 🟩 **First Media**: Tiang galvanis abu-abu polos dengan pucuk Hijau cerah.\n` +
          `* ⚪ **MNC Play**: Tiang hitam berundak dengan 2 garis strip putih di bawah.\n` +
          `* 🟡 **Moratelindo/Oxygen**: Tiang hitam blok Kuning atau strip Orange di bawah.\n` +
          `* 🔵 **iForte**: Tiang hitam gelang kombinasi Biru - Putih - Biru di pucuk.\n\n` +
          `*Semua 26 provider terdaftar memiliki kode warna visual masing-masing untuk memudahkan verifikasi visual lapangan.*`;
      } else if (
        lastUserMsg.includes('sop') ||
        lastUserMsg.includes('aturan') ||
        lastUserMsg.includes('standar') ||
        lastUserMsg.includes('tinggi') ||
        lastUserMsg.includes('tanam')
      ) {
        finalReply =
          `📐 **Standar Teknis & SOP Pemasangan Tiang Utilitas**:\n\n` +
          `1. 🏗️ **Kedalaman Tanam Tiang**: Standar minimal **1/6 dari panjang total tiang**.\n` +
          `   - Tiang 7 meter: Tanam minimal **1.16 meter** ke dalam tanah.\n` +
          `   - Tiang 9 meter: Tanam minimal **1.50 meter** ke dalam tanah.\n` +
          `2. 🛣️ **Ketinggian Aman Kabel Udara**:\n` +
          `   - Di atas Jalan Protokol / Jalan Raya Nasional: Minimal **5.5 meter**.\n` +
          `   - Di atas Jalan Lingkungan / Pemukiman: Minimal **4.5 meter**.\n` +
          `3. 📏 **Jarak Antar Tiang (Span)**: Optimal **35 s/d 50 meter** untuk mencegah beban tarikan berlebih pada kabel.\n` +
          `4. ⚠️ **Batas Bahaya Kemiringan**: Tiang dengan kemiringan **> 5 derajat** dikategorikan wajib perbaikan/penggantian.`;
      } else if (
        lastUserMsg.includes('bulan') ||
        lastUserMsg.includes('agustus') ||
        lastUserMsg.includes('september')
      ) {
        const monthLines = Object.entries(monthCounts)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([m, c]) => `* 🗓️ **Bulan ${m}**: **${c} titik tiang** (${percent(c, totalPoles)}%)`)
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
        lastUserMsg.includes('petugas') ||
        lastUserMsg.includes('kinerja')
      ) {
        const sLines = Object.entries(surveyorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(
            ([name, count]) =>
              `* 👤 **${name}**: **${count} titik tiang** (${percent(count, totalPoles)}%)`
          )
          .join('\n');

        finalReply =
          `📊 **Rekapitulasi Data Tiang per Petugas / Surveyor**:\n\n` +
          `${sLines || `* 👤 **Admin**: **${totalPoles} titik tiang**`}\n\n` +
          `Total data terhimpun adalah **${totalPoles} titik tiang**. Anda dapat memfilter peta untuk melihat titik yang disurvei oleh masing-masing petugas.`;
      } else if (
        lastUserMsg.includes('beton') ||
        lastUserMsg.includes('besi') ||
        lastUserMsg.includes('kayu') ||
        lastUserMsg.includes('jenis tiang') ||
        lastUserMsg.includes('material')
      ) {
        finalReply =
          `🏗️ **Komposisi Material & Jenis Tiang Utilitas**:\n\n` +
          `* 🏢 **Tiang Beton**: **${poleTypeCounts.BETON || 0} tiang** (${percent(poleTypeCounts.BETON || 0, totalPoles)}%)\n` +
          `* ⚙️ **Tiang Besi / Baja**: **${poleTypeCounts.BESI || 0} tiang** (${percent(poleTypeCounts.BESI || 0, totalPoles)}%)\n` +
          `* 🪵 **Tiang Kayu**: **${poleTypeCounts.KAYU || 0} tiang** (${percent(poleTypeCounts.KAYU || 0, totalPoles)}%)\n` +
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
          `* 🔴 **Lampu Mati / Rusak**: **${(pjuLampCounts.MATI_TOTAL || 0) + (pjuLampCounts.PECAH_RUSAK || 0)} unit**\n` +
          `* 🔌 **PJU dengan KWh Meter**: **${pjuWithKwhCount} titik** (Sisa non-meter abonemen)\n` +
          `* 🧶 **Tiang PJU Ditumpangi Kabel FO**: **${pjuWithNetworkCableCount} titik**\n\n` +
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
          `* 📏 **Total Panjang Kabel**: **${totalCableLengthKm} km** (${totalSegments} segmen)\n` +
          `* 🟢 **Kondisi Baik**: **${goodCount} tiang** (${percent(goodCount, totalPoles)}%)\n` +
          `* 🟡 **Perlu Cek**: **${needsRepairCount} tiang** (${percent(needsRepairCount, totalPoles)}%)\n` +
          `* 🔴 **Rusak / Bahaya**: **${damagedCount} tiang** (${percent(damagedCount, totalPoles)}%)\n\n` +
          `🏘️ **Kelurahan Teraktif**: ${kelurahanSummary}.\n` +
          `🛣️ **Ruas Jalan Terbanyak**: ${topRoadsSummary}.\n` +
          `Data tersinkronisasi langsung secara real-time dengan peta spasial GIS.`;
      } else {
        finalReply =
          `Halo! Saya **INFRA-AI**, asisten cerdas bawaan sistem **INFRA-MAP GIS**.\n\n` +
          `Saya bisa menganalisis dan mengelola semua data inventaris sistem kami:\n` +
          `* 📅 **Filter per tanggal & bulan** (contoh: *"Berapa data tanggal 30 Agustus?"*)\n` +
          `* 👤 **Filter per orang / surveyor** (siapa yang mendata & berapa titik)\n` +
          `* ⚡ **Data panjang & segmen kabel** (${totalCableLengthKm} km terbentang)\n` +
          `* 🎨 **Ciri fisik & warna tiang 26 provider** (Telkom, Biznet, MyRepublic, dll.)\n` +
          `* 🏗️ **Jenis material & kategori** (Beton, Besi, PJU, PLN, Fiber Optik)\n` +
          `* 📐 **Standar teknis & SOP utilitas** (jarak span, kedalaman tanam, tinggi kabel)\n` +
          `* ⚠️ **Mengecek titik kerusakan** (tiang miring, kabel semrawut, kabel melorot)\n` +
          `* 🗺️ **Menggerakkan & memfilter peta GIS** secara otomatis\n\n` +
          `Ada yang ingin Anda tanyakan seputar data infrastruktur kita?`;
      }
      usedModel = 'INFRA-AI Multi-Dimensional Query Engine';
    }

    // 5. Ekstrak aksi filter peta interaktif dari maksud pertanyaan user secara dinamis
    let mapAction: any = null;

    // Check for date filter
    const matchedDateForMap = resolveDateFromMessage(lastUserMsg, dateCounts);

    if (
      matchedDateForMap &&
      (lastUserMsg.includes('tampil') ||
        lastUserMsg.includes('filter') ||
        lastUserMsg.includes('peta') ||
        lastUserMsg.includes('titik') ||
        lastUserMsg.includes('lihat'))
    ) {
      mapAction = {
        type: 'FILTER_MAP',
        date: matchedDateForMap,
        label: `🗺️ Filter Tanggal: ${formatIndonesianDate(matchedDateForMap)}`,
      };
    } else {
      // Check if user wants to filter by Surveyor
      const surveyorNames = Object.keys(surveyorCounts);
      let matchedSurveyor = surveyorNames.find((name) => lastUserMsg.includes(name.toLowerCase()));

      if (!matchedSurveyor) {
        if (lastUserMsg.includes('admin')) matchedSurveyor = 'Admin';
        else if (lastUserMsg.includes('bahrudin')) matchedSurveyor = 'Bahrudin';
        else if (lastUserMsg.includes('rudin')) matchedSurveyor = 'Rudin';
      }

      if (
        matchedSurveyor &&
        (lastUserMsg.includes('tampil') ||
          lastUserMsg.includes('filter') ||
          lastUserMsg.includes('titik') ||
          lastUserMsg.includes('data') ||
          lastUserMsg.includes('lihat'))
      ) {
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
      } else if (
        lastUserMsg.includes('semua') ||
        lastUserMsg.includes('reset filter') ||
        lastUserMsg.includes('hapus filter')
      ) {
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
      { success: false, error: 'Terjadi kesalahan pada server AI' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(POSTHandler, { limit: 10 });
