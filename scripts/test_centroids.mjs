import https from 'https';

// Complete dataset of all 72 Kelurahan centroids per Kecamatan in Kota Lubuklinggau
const KELURAHAN_CENTROIDS = [
  // 1. Lubuklinggau Timur I
  { name: 'Air Kuti', kecamatan: 'Lubuklinggau Timur I', lat: -3.2755, lng: 102.8790 },
  { name: 'Batu Urip Taba', kecamatan: 'Lubuklinggau Timur I', lat: -3.2820, lng: 102.8710 },
  { name: 'Majapahit', kecamatan: 'Lubuklinggau Timur I', lat: -3.2920, lng: 102.8680 },
  { name: 'Nikan Jaya', kecamatan: 'Lubuklinggau Timur I', lat: -3.2790, lng: 102.8850 },
  { name: 'Taba Jemekeh', kecamatan: 'Lubuklinggau Timur I', lat: -3.2964, lng: 102.8617 },
  { name: 'Taba Koji', kecamatan: 'Lubuklinggau Timur I', lat: -3.2990, lng: 102.8590 },
  { name: 'Taba Lestari', kecamatan: 'Lubuklinggau Timur I', lat: -3.2860, lng: 102.8640 },
  { name: 'Watervang', kecamatan: 'Lubuklinggau Timur I', lat: -3.2847, lng: 102.8805 },

  // 2. Lubuklinggau Timur II
  { name: 'Cereme Taba', kecamatan: 'Lubuklinggau Timur II', lat: -3.2980, lng: 102.8640 },
  { name: 'Dempo', kecamatan: 'Lubuklinggau Timur II', lat: -3.3020, lng: 102.8630 },
  { name: 'Jawa Kanan', kecamatan: 'Lubuklinggau Timur II', lat: -3.2985, lng: 102.8570 },
  { name: 'Jawa Kiri', kecamatan: 'Lubuklinggau Timur II', lat: -3.2995, lng: 102.8560 },
  { name: 'Karya Bakti', kecamatan: 'Lubuklinggau Timur II', lat: -3.3040, lng: 102.8600 },
  { name: 'Mesat Jaya', kecamatan: 'Lubuklinggau Timur II', lat: -3.3080, lng: 102.8640 },
  { name: 'Mesat Seni', kecamatan: 'Lubuklinggau Timur II', lat: -3.3110, lng: 102.8660 },
  { name: 'Wira Karya', kecamatan: 'Lubuklinggau Timur II', lat: -3.3010, lng: 102.8590 },
  { name: 'Zellaz', kecamatan: 'Lubuklinggau Timur II', lat: -3.3060, lng: 102.8580 },

  // 3. Lubuklinggau Barat I
  { name: 'Bandung Kiri', kecamatan: 'Lubuklinggau Barat I', lat: -3.2960, lng: 102.8460 },
  { name: 'Bandung Ujung', kecamatan: 'Lubuklinggau Barat I', lat: -3.2930, lng: 102.8420 },
  { name: 'Kayu Ara', kecamatan: 'Lubuklinggau Barat I', lat: -3.3020, lng: 102.8360 },
  { name: 'Lubuk Aman', kecamatan: 'Lubuklinggau Barat I', lat: -3.2990, lng: 102.8410 },
  { name: 'Lubuk Tanjung', kecamatan: 'Lubuklinggau Barat I', lat: -3.3050, lng: 102.8320 },
  { name: 'Pelita Jaya', kecamatan: 'Lubuklinggau Barat I', lat: -3.2890, lng: 102.8490 },
  { name: 'Pematang Wangi', kecamatan: 'Lubuklinggau Barat I', lat: -3.3090, lng: 102.8250 },
  { name: 'Sukajadi', kecamatan: 'Lubuklinggau Barat I', lat: -3.3080, lng: 102.8420 },
  { name: 'Tanjung Aman', kecamatan: 'Lubuklinggau Barat I', lat: -3.3020, lng: 102.8480 },
  { name: 'Tanjung Indah', kecamatan: 'Lubuklinggau Barat I', lat: -3.2970, lng: 102.8500 },
  { name: 'Watas Lubuk Durian', kecamatan: 'Lubuklinggau Barat I', lat: -3.3150, lng: 102.7850 },

  // 4. Lubuklinggau Barat II
  { name: 'Keputraan', kecamatan: 'Lubuklinggau Barat II', lat: -3.2930, lng: 102.8560 },
  { name: 'Lubuklinggau Ilir', kecamatan: 'Lubuklinggau Barat II', lat: -3.2910, lng: 102.8540 },
  { name: 'Lubuklinggau Ulu', kecamatan: 'Lubuklinggau Barat II', lat: -3.2880, lng: 102.8520 },
  { name: 'Pasar Permiri', kecamatan: 'Lubuklinggau Barat II', lat: -3.2955, lng: 102.8545 },
  { name: 'Sidorejo', kecamatan: 'Lubuklinggau Barat II', lat: -3.2970, lng: 102.8510 },
  { name: 'Tapak Lebar', kecamatan: 'Lubuklinggau Barat II', lat: -3.2940, lng: 102.8490 },
  { name: 'Ulak Lebar', kecamatan: 'Lubuklinggau Barat II', lat: -3.2860, lng: 102.8460 },
  { name: 'Wisma Karya', kecamatan: 'Lubuklinggau Barat II', lat: -3.2985, lng: 102.8525 },

  // 5. Lubuklinggau Selatan I
  { name: 'Air Kati', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3680, lng: 102.8300 },
  { name: 'Air Temam', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3480, lng: 102.8380 },
  { name: 'Bakti Karya', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3520, lng: 102.8450 },
  { name: 'Jukung', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3600, lng: 102.8520 },
  { name: 'Kelingi', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3420, lng: 102.8310 },
  { name: 'Lubuk Binjai', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3750, lng: 102.8220 },
  { name: 'Lubuk Kupang', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3380, lng: 102.8480 },
  { name: 'Perumnas Rahmah', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3590, lng: 102.8390 },
  { name: 'Rahmah', kecamatan: 'Lubuklinggau Selatan I', lat: -3.3650, lng: 102.8350 },

  // 6. Lubuklinggau Selatan II
  { name: 'Batu Urip', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3180, lng: 102.8720 },
  { name: 'Karang Ketuan', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3350, lng: 102.8650 },
  { name: 'Marga Mulya', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3190, lng: 102.8620 },
  { name: 'Marga Rahayu', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3240, lng: 102.8640 },
  { name: 'Moneng Sepati', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3150, lng: 102.8600 },
  { name: 'Simpang Periuk', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3282, lng: 102.8710 },
  { name: 'Siring Agung', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3380, lng: 102.8780 },
  { name: 'Tabarenah', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3220, lng: 102.8850 },
  { name: 'Tanah Periuk', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3320, lng: 102.8820 },

  // 7. Lubuklinggau Utara I
  { name: 'Belalau I', kecamatan: 'Lubuklinggau Utara I', lat: -3.2350, lng: 102.8720 },
  { name: 'Belalau II', kecamatan: 'Lubuklinggau Utara I', lat: -3.2280, lng: 102.8680 },
  { name: 'Durian Rampak', kecamatan: 'Lubuklinggau Utara I', lat: -3.2510, lng: 102.8790 },
  { name: 'Margasari', kecamatan: 'Lubuklinggau Utara I', lat: -3.2100, lng: 102.8850 },
  { name: 'Petanang Ilir', kecamatan: 'Lubuklinggau Utara I', lat: -3.2400, lng: 102.8950 },
  { name: 'Petanang Ulu', kecamatan: 'Lubuklinggau Utara I', lat: -3.2450, lng: 102.8900 },
  { name: 'Sumber Agung', kecamatan: 'Lubuklinggau Utara I', lat: -3.2180, lng: 102.8920 },
  { name: 'Tanjung Raya', kecamatan: 'Lubuklinggau Utara I', lat: -3.2550, lng: 102.8820 },
  { name: 'Taba Baru', kecamatan: 'Lubuklinggau Utara I', lat: -3.2480, lng: 102.8740 },

  // 8. Lubuklinggau Utara II
  { name: 'Batu Febri', kecamatan: 'Lubuklinggau Utara II', lat: -3.2800, lng: 102.8520 },
  { name: 'Kenanga', kecamatan: 'Lubuklinggau Utara II', lat: -3.2750, lng: 102.8550 },
  { name: 'Megang', kecamatan: 'Lubuklinggau Utara II', lat: -3.2820, lng: 102.8610 },
  { name: 'Pasar Satelit', kecamatan: 'Lubuklinggau Utara II', lat: -3.2780, lng: 102.8650 },
  { name: 'Ponorogo', kecamatan: 'Lubuklinggau Utara II', lat: -3.2710, lng: 102.8580 },
  { name: 'Puncak Kemuning', kecamatan: 'Lubuklinggau Utara II', lat: -3.2680, lng: 102.8630 },
  { name: 'Senalang', kecamatan: 'Lubuklinggau Utara II', lat: -3.2730, lng: 102.8680 },
  { name: 'Sumberejo', kecamatan: 'Lubuklinggau Utara II', lat: -3.2640, lng: 102.8550 },
  { name: 'Ulaksurung', kecamatan: 'Lubuklinggau Utara II', lat: -3.2840, lng: 102.8530 },
];

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestKelurahan(lat, lng, targetKecamatan = null) {
  let list = KELURAHAN_CENTROIDS;
  if (targetKecamatan) {
    list = list.filter(k => k.kecamatan.toLowerCase().includes(targetKecamatan.toLowerCase()));
  }
  let best = list[0];
  let minD = Infinity;
  for (const item of list) {
    const d = calcDistance(lat, lng, item.lat, item.lng);
    if (d < minD) {
      minD = d;
      best = item;
    }
  }
  return { ...best, distanceKm: minD };
}

const testCoords = [
  { name: 'Simpang Periuk', lat: -3.3282, lng: 102.8710 },
  { name: 'Watervang', lat: -3.2847, lng: 102.8805 },
  { name: 'Taba Jemekeh', lat: -3.2964, lng: 102.8617 },
  { name: 'Pasar Permiri', lat: -3.2955, lng: 102.8545 },
  { name: 'Sukajadi', lat: -3.3080, lng: 102.8420 },
  { name: 'Petanang Ulu', lat: -3.2450, lng: 102.8900 },
  { name: 'Kenanga', lat: -3.2750, lng: 102.8550 },
  { name: 'Rahmah', lat: -3.3650, lng: 102.8350 },
];

for (const tc of testCoords) {
  const match = findNearestKelurahan(tc.lat, tc.lng);
  console.log(`📍 ${tc.name}:`);
  console.log(`   -> Terdeteksi: Kel. ${match.name}, ${match.kecamatan} (Jarak ke pusat kelurahan: ${(match.distanceKm * 1000).toFixed(0)}m)`);
}
