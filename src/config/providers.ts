import { Provider } from '@/types/provider';

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'PRV_TELKOM',
    name: '1. TELKOM INDONESIA',
    code: 'TLKM',
    colorHex: '#ef4444',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    midColor: '#dc2626',
    botColor: '#94a3b8',
    markingDescription: 'No. 1: Tiang hitam sabuk Merah & Abu-abu di tengah',
  },
  {
    id: 'PRV_MNC_1',
    name: '2. MNC PLAY (Tipe A)',
    code: 'MNC',
    colorHex: '#475569',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    stripCount: 2,
    botColor: '#ffffff',
    markingDescription: 'No. 2: Tiang hitam berundak dengan 2 garis strip putih di bawah',
  },
  {
    id: 'PRV_FIRSTMEDIA',
    name: '3. FIRST MEDIA',
    code: 'FM',
    colorHex: '#16a34a',
    status: 'ACTIVE',
    bodyColor: '#94a3b8',
    topColor: '#16a34a',
    markingDescription: 'No. 3: Tiang galvanis abu-abu polos dengan pucuk Hijau cerah',
  },
  {
    id: 'PRV_MNC_2',
    name: '4. MNC PLAY (Tipe B)',
    code: 'MNC',
    colorHex: '#475569',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    stripCount: 2,
    botColor: '#ffffff',
    markingDescription: 'No. 4: Tiang hitam panjang dengan 2 garis strip putih di bawah',
  },
  {
    id: 'PRV_BIZNET',
    name: '5. BIZNET NETWORKS',
    code: 'BIZ',
    colorHex: '#f97316',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#facc15',
    midColor: '#1e293b',
    markingDescription: 'No. 5: Tiang hitam dengan gelang Kuning & Hitam di pucuk',
  },
  {
    id: 'PRV_MORATEL_1',
    name: '6. MORATELINDO (Bawah Kuning)',
    code: 'MORA',
    colorHex: '#eab308',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    botColor: '#facc15',
    markingDescription: 'No. 6: Tiang hitam berundak dengan blok Kuning di bagian bawah',
  },
  {
    id: 'PRV_IFORTE',
    name: '7. IFORTE',
    code: 'IFORTE',
    colorHex: '#3b82f6',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#2563eb',
    midColor: '#ffffff',
    markingDescription: 'No. 7: Tiang hitam gelang kombinasi Biru - Putih - Biru di pucuk',
  },
  {
    id: 'PRV_LINTASARTA',
    name: '8. LINTASARTA (LA)',
    code: 'LA',
    colorHex: '#0ea5e9',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    midColor: '#38bdf8',
    textBadge: 'LA',
    markingDescription: 'No. 8: Tiang hitam blok Biru Muda di tengah & label teks LA di bawah',
  },
  {
    id: 'PRV_MSA',
    name: '9. MSA (Megasurya Angkasa)',
    code: 'MSA',
    colorHex: '#38bdf8',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#38bdf8',
    textBadge: 'MSA',
    markingDescription: 'No. 9: Tiang hitam strip Biru di pucuk & label teks MSA',
  },
  {
    id: 'PRV_MORATEL_2',
    name: '10. MORATELINDO (Tengah Merah)',
    code: 'MORA',
    colorHex: '#dc2626',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    midColor: '#dc2626',
    markingDescription: 'No. 10: Tiang hitam berundak dengan blok Merah di tengah tiang',
  },
  {
    id: 'PRV_H3I',
    name: '11. TRI / H3I (IOH)',
    code: 'H3I',
    colorHex: '#10b981',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#dc2626',
    midColor: '#22c55e',
    markingDescription: 'No. 11: Tiang hitam blok Hijau terang di tengah & Merah di pucuk',
  },
  {
    id: 'PRV_MYREP_1',
    name: '12. MYREPUBLIC (Pucuk Merah)',
    code: 'MYREP',
    colorHex: '#ef4444',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#dc2626',
    markingDescription: 'No. 12: Tiang hitam dengan pucuk Merah khas MyRepublic',
  },
  {
    id: 'PRV_MYREP_2',
    name: '13. MYREPUBLIC (Pucuk Ungu)',
    code: 'MYREP',
    colorHex: '#9333ea',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#9333ea',
    markingDescription: 'No. 13: Tiang hitam dengan pucuk Ungu khas MyRepublic',
  },
  {
    id: 'PRV_INDOSAT',
    name: '14. INDOSAT OOREDOO (ISAT)',
    code: 'ISAT',
    colorHex: '#f59e0b',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#facc15',
    textBadge: 'ISAT',
    markingDescription: 'No. 14: Tiang hitam strip Kuning di pucuk & label teks ISAT',
  },
  {
    id: 'PRV_XL',
    name: '15. XL AXIATA',
    code: 'XL',
    colorHex: '#1d4ed8',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    stripCount: 3,
    midColor: '#ffffff',
    markingDescription: 'No. 15: Tiang hitam dengan 3 garis strip putih di bagian tengah',
  },
  {
    id: 'PRV_FIBERSTAR',
    name: '16. FIBERSTAR',
    code: 'FSTAR',
    colorHex: '#ec4899',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#ec4899',
    midColor: '#ffffff',
    markingDescription: 'No. 16: Tiang hitam pucuk Pink Magenta & gelang putih',
  },
  {
    id: 'PRV_BALITOWER',
    name: '17. BALI TOWER',
    code: 'BALI',
    colorHex: '#64748b',
    status: 'ACTIVE',
    bodyColor: '#94a3b8',
    markingDescription: 'No. 17: Tiang baja galvanis abu-abu polos berundak',
  },
  {
    id: 'PRV_ALITA',
    name: '18. ALITA',
    code: 'ALITA',
    colorHex: '#db2777',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#db2777',
    midColor: '#94a3b8',
    markingDescription: 'No. 18: Tiang hitam pucuk Pink & sabuk abu-abu di tengah',
  },
  {
    id: 'PRV_CGS',
    name: '19. CGS (Cyberindo Guard)',
    code: 'CGS',
    colorHex: '#06b6d4',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#06b6d4',
    midColor: '#ec4899',
    markingDescription: 'No. 19: Tiang hitam pucuk kombinasi Biru Cyan & Pink',
  },
  {
    id: 'PRV_TELKOMSEL',
    name: '20. TELKOMSEL / MITRATEL',
    code: 'TSEL',
    colorHex: '#ef4444',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    midColor: '#dc2626',
    botColor: '#94a3b8',
    markingDescription: 'No. 20: Tiang hitam berundak sabuk Merah & Abu-abu di tengah',
  },
  {
    id: 'PRV_ICONNET',
    name: 'ICONNET (PLN Icon+)',
    code: 'ICN',
    colorHex: '#0284c7',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#0284c7',
    midColor: '#38bdf8',
    markingDescription: 'Tiang hitam / tiang PLN dengan strip biru Icon+ dan logo PLN',
  },
  {
    id: 'PRV_LOCAL',
    name: 'PROVIDER LOKAL / LAINNYA',
    code: 'LOKAL',
    colorHex: '#059669',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    midColor: '#10b981',
    markingDescription: 'ISP atau Operator Lokal Lubuklinggau (dapat diketik manual)',
  },
  {
    id: 'PRV_PJU_PEMKOT',
    name: 'PJU PEMERINTAH KOTA LUBUKLINGGAU',
    code: 'PJU',
    colorHex: '#f59e0b',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#f59e0b',
    markingDescription: 'Tiang Penerangan Jalan Umum (PJU) Mandiri milik Pemkot Lubuklinggau',
  },
  {
    id: 'PRV_PLN_PJU_GABUNG',
    name: 'PLN + PJU (TIANG GABUNGAN)',
    code: 'PLN+PJU',
    colorHex: '#0ea5e9',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#f59e0b',
    midColor: '#0284c7',
    markingDescription: 'Tiang distribusi listrik PLN yang ditumpangi instalasi lampu PJU jalan',
  },
  {
    id: 'PRV_PLN_DISTRIBUSI',
    name: 'PT PLN (PERSERO) DISTRIBUSI',
    code: 'PLN',
    colorHex: '#0284c7',
    status: 'ACTIVE',
    bodyColor: '#1e293b',
    topColor: '#0284c7',
    markingDescription: 'Tiang distribusi jaringan kabel listrik tegangan rendah/menengah PLN',
  },
  {
    id: 'UNKNOWN',
    name: 'TIDAK DIKETAHUI / BELUM TERIDENTIFIKASI',
    code: 'UNK',
    colorHex: '#6b7280',
    status: 'ACTIVE',
    bodyColor: '#475569',
    markingDescription: 'Tiang tanpa marka atau belum diketahui pemilik resminya',
  },
];

export function getProviderById(providerId?: string): Provider | undefined {
  if (!providerId) return undefined;
  const pId = providerId.toLowerCase().trim();
  return DEFAULT_PROVIDERS.find(
    (p) =>
      p.id.toLowerCase() === pId ||
      p.code.toLowerCase() === pId ||
      (pId === 'prv_myrepublic' && p.id === 'PRV_MYREP_1') ||
      (pId === 'myrepublic' && p.id === 'PRV_MYREP_1') ||
      (pId === 'myrep' && p.id === 'PRV_MYREP_1')
  );
}

export function resolveProviderInfo(params: {
  providerId?: string;
  providerName?: string;
  infrastructureCategory?: string;
}): {
  providerId: string;
  providerName: string;
  category: 'PLN_MURNI' | 'GABUNG_PLN_PJU' | 'PJU_MANDIRI' | 'FO_WIFI';
  selectedProviderObj?: Provider;
} {
  const { providerId, providerName, infrastructureCategory } = params;

  // 1. Kategori PLN Murni
  if (infrastructureCategory === 'PLN_MURNI' || providerId === 'PRV_PLN_DISTRIBUSI') {
    const pln = getProviderById('PRV_PLN_DISTRIBUSI') || DEFAULT_PROVIDERS.find((p) => p.id === 'PRV_PLN_DISTRIBUSI');
    return {
      providerId: 'PRV_PLN_DISTRIBUSI',
      providerName: 'PT PLN (PERSERO) DISTRIBUSI',
      category: 'PLN_MURNI',
      selectedProviderObj: pln,
    };
  }

  // 2. Kategori Gabungan PLN + PJU
  if (infrastructureCategory === 'GABUNG_PLN_PJU' || providerId === 'PRV_PLN_PJU_GABUNG') {
    const gabung = getProviderById('PRV_PLN_PJU_GABUNG') || DEFAULT_PROVIDERS.find((p) => p.id === 'PRV_PLN_PJU_GABUNG');
    return {
      providerId: 'PRV_PLN_PJU_GABUNG',
      providerName: 'PLN + PJU (TIANG GABUNGAN)',
      category: 'GABUNG_PLN_PJU',
      selectedProviderObj: gabung,
    };
  }

  // 3. Kategori PJU Mandiri Pemkot
  if (infrastructureCategory === 'PJU_MANDIRI' || providerId === 'PRV_PJU_PEMKOT') {
    const pju = getProviderById('PRV_PJU_PEMKOT') || DEFAULT_PROVIDERS.find((p) => p.id === 'PRV_PJU_PEMKOT');
    return {
      providerId: 'PRV_PJU_PEMKOT',
      providerName: 'PJU PEMERINTAH KOTA LUBUKLINGGAU',
      category: 'PJU_MANDIRI',
      selectedProviderObj: pju,
    };
  }

  // 4. Pencocokan berdasarkan ID Provider
  if (providerId) {
    const match = getProviderById(providerId);
    if (match) {
      return {
        providerId: match.id,
        providerName: match.name,
        category: 'FO_WIFI',
        selectedProviderObj: match,
      };
    }
  }

  // 5. Pencocokan jika providerName valid (bukan 'Unknown')
  if (providerName && providerName.trim() !== '' && providerName.toLowerCase() !== 'unknown') {
    const cleanName = providerName.toLowerCase().replace(/^\d+\.\s*/, '').trim();
    const nameMatch = DEFAULT_PROVIDERS.find(
      (p) =>
        p.name.toLowerCase() === providerName.toLowerCase() ||
        p.name.toLowerCase().replace(/^\d+\.\s*/, '').trim() === cleanName ||
        cleanName.includes(p.name.toLowerCase().replace(/^\d+\.\s*/, '').trim())
    );
    return {
      providerId: providerId || nameMatch?.id || 'PRV_LOCAL',
      providerName: nameMatch?.name || providerName,
      category: 'FO_WIFI',
      selectedProviderObj: nameMatch,
    };
  }

  const unk = getProviderById('UNKNOWN');
  return {
    providerId: providerId || 'UNKNOWN',
    providerName: 'TIDAK DIKETAHUI / BELUM TERIDENTIFIKASI',
    category: 'FO_WIFI',
    selectedProviderObj: unk,
  };
}
