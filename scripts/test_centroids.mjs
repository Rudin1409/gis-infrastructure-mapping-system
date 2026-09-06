import https from 'https';

// Complete dataset of all 72 Kelurahan centroids per Kecamatan in Kota Lubuklinggau
const KELURAHAN_CENTROIDS = [
  // 1. Lubuklinggau Timur I
  { name: 'Air Kuti', kecamatan: 'Lubuklinggau Timur I', lat: -3.2755, lng: 102.879 },
  { name: 'Batu Urip Taba', kecamatan: 'Lubuklinggau Timur I', lat: -3.282, lng: 102.871 },
  { name: 'Majapahit', kecamatan: 'Lubuklinggau Timur I', lat: -3.292, lng: 102.868 },
  { name: 'Nikan Jaya', kecamatan: 'Lubuklinggau Timur I', lat: -3.279, lng: 102.885 },
  { name: 'Taba Jemekeh', kecamatan: 'Lubuklinggau Timur I', lat: -3.2964, lng: 102.8617 },
  { name: 'Taba Koji', kecamatan: 'Lubuklinggau Timur I', lat: -3.299, lng: 102.859 },
  { name: 'Taba Lestari', kecamatan: 'Lubuklinggau Timur I', lat: -3.286, lng: 102.864 },
  { name: 'Watervang', kecamatan: 'Lubuklinggau Timur I', lat: -3.2847, lng: 102.8805 },

  // 2. Lubuklinggau Timur II
  { name: 'Cereme Taba', kecamatan: 'Lubuklinggau Timur II', lat: -3.298, lng: 102.864 },
  { name: 'Dempo', kecamatan: 'Lubuklinggau Timur II', lat: -3.302, lng: 102.863 },
  { name: 'Jawa Kanan', kecamatan: 'Lubuklinggau Timur II', lat: -3.2985, lng: 102.857 },
  { name: 'Jawa Kiri', kecamatan: 'Lubuklinggau Timur II', lat: -3.2995, lng: 102.856 },
  { name: 'Karya Bakti', kecamatan: 'Lubuklinggau Timur II', lat: -3.304, lng: 102.86 },
  { name: 'Mesat Jaya', kecamatan: 'Lubuklinggau Timur II', lat: -3.308, lng: 102.864 },
  { name: 'Mesat Seni', kecamatan: 'Lubuklinggau Timur II', lat: -3.311, lng: 102.866 },
  { name: 'Wira Karya', kecamatan: 'Lubuklinggau Timur II', lat: -3.301, lng: 102.859 },
  { name: 'Zellaz', kecamatan: 'Lubuklinggau Timur II', lat: -3.306, lng: 102.858 },

  // 3. Lubuklinggau Barat I
  { name: 'Bandung Kiri', kecamatan: 'Lubuklinggau Barat I', lat: -3.296, lng: 102.846 },
  { name: 'Bandung Ujung', kecamatan: 'Lubuklinggau Barat I', lat: -3.293, lng: 102.842 },
  { name: 'Kayu Ara', kecamatan: 'Lubuklinggau Barat I', lat: -3.302, lng: 102.836 },
  { name: 'Lubuk Aman', kecamatan: 'Lubuklinggau Barat I', lat: -3.299, lng: 102.841 },
  { name: 'Lubuk Tanjung', kecamatan: 'Lubuklinggau Barat I', lat: -3.305, lng: 102.832 },
  { name: 'Pelita Jaya', kecamatan: 'Lubuklinggau Barat I', lat: -3.289, lng: 102.849 },
  { name: 'Pematang Wangi', kecamatan: 'Lubuklinggau Barat I', lat: -3.309, lng: 102.825 },
  { name: 'Sukajadi', kecamatan: 'Lubuklinggau Barat I', lat: -3.308, lng: 102.842 },
  { name: 'Tanjung Aman', kecamatan: 'Lubuklinggau Barat I', lat: -3.302, lng: 102.848 },
  { name: 'Tanjung Indah', kecamatan: 'Lubuklinggau Barat I', lat: -3.297, lng: 102.85 },
  { name: 'Watas Lubuk Durian', kecamatan: 'Lubuklinggau Barat I', lat: -3.315, lng: 102.785 },

  // 4. Lubuklinggau Barat II
  { name: 'Keputraan', kecamatan: 'Lubuklinggau Barat II', lat: -3.293, lng: 102.856 },
  { name: 'Lubuklinggau Ilir', kecamatan: 'Lubuklinggau Barat II', lat: -3.291, lng: 102.854 },
  { name: 'Lubuklinggau Ulu', kecamatan: 'Lubuklinggau Barat II', lat: -3.288, lng: 102.852 },
  { name: 'Pasar Permiri', kecamatan: 'Lubuklinggau Barat II', lat: -3.2955, lng: 102.8545 },
  { name: 'Sidorejo', kecamatan: 'Lubuklinggau Barat II', lat: -3.297, lng: 102.851 },
  { name: 'Tapak Lebar', kecamatan: 'Lubuklinggau Barat II', lat: -3.294, lng: 102.849 },
  { name: 'Ulak Lebar', kecamatan: 'Lubuklinggau Barat II', lat: -3.286, lng: 102.846 },
  { name: 'Wisma Karya', kecamatan: 'Lubuklinggau Barat II', lat: -3.2985, lng: 102.8525 },

  // 5. Lubuklinggau Selatan I
  { name: 'Air Kati', kecamatan: 'Lubuklinggau Selatan I', lat: -3.368, lng: 102.83 },
  { name: 'Air Temam', kecamatan: 'Lubuklinggau Selatan I', lat: -3.348, lng: 102.838 },
  { name: 'Bakti Karya', kecamatan: 'Lubuklinggau Selatan I', lat: -3.352, lng: 102.845 },
  { name: 'Jukung', kecamatan: 'Lubuklinggau Selatan I', lat: -3.36, lng: 102.852 },
  { name: 'Kelingi', kecamatan: 'Lubuklinggau Selatan I', lat: -3.342, lng: 102.831 },
  { name: 'Lubuk Binjai', kecamatan: 'Lubuklinggau Selatan I', lat: -3.375, lng: 102.822 },
  { name: 'Lubuk Kupang', kecamatan: 'Lubuklinggau Selatan I', lat: -3.338, lng: 102.848 },
  { name: 'Perumnas Rahmah', kecamatan: 'Lubuklinggau Selatan I', lat: -3.359, lng: 102.839 },
  { name: 'Rahmah', kecamatan: 'Lubuklinggau Selatan I', lat: -3.365, lng: 102.835 },

  // 6. Lubuklinggau Selatan II
  { name: 'Batu Urip', kecamatan: 'Lubuklinggau Selatan II', lat: -3.318, lng: 102.872 },
  { name: 'Karang Ketuan', kecamatan: 'Lubuklinggau Selatan II', lat: -3.335, lng: 102.865 },
  { name: 'Marga Mulya', kecamatan: 'Lubuklinggau Selatan II', lat: -3.319, lng: 102.862 },
  { name: 'Marga Rahayu', kecamatan: 'Lubuklinggau Selatan II', lat: -3.324, lng: 102.864 },
  { name: 'Moneng Sepati', kecamatan: 'Lubuklinggau Selatan II', lat: -3.315, lng: 102.86 },
  { name: 'Simpang Periuk', kecamatan: 'Lubuklinggau Selatan II', lat: -3.3282, lng: 102.871 },
  { name: 'Siring Agung', kecamatan: 'Lubuklinggau Selatan II', lat: -3.338, lng: 102.878 },
  { name: 'Tabarenah', kecamatan: 'Lubuklinggau Selatan II', lat: -3.322, lng: 102.885 },
  { name: 'Tanah Periuk', kecamatan: 'Lubuklinggau Selatan II', lat: -3.332, lng: 102.882 },

  // 7. Lubuklinggau Utara I
  { name: 'Belalau I', kecamatan: 'Lubuklinggau Utara I', lat: -3.235, lng: 102.872 },
  { name: 'Belalau II', kecamatan: 'Lubuklinggau Utara I', lat: -3.228, lng: 102.868 },
  { name: 'Durian Rampak', kecamatan: 'Lubuklinggau Utara I', lat: -3.251, lng: 102.879 },
  { name: 'Margasari', kecamatan: 'Lubuklinggau Utara I', lat: -3.21, lng: 102.885 },
  { name: 'Petanang Ilir', kecamatan: 'Lubuklinggau Utara I', lat: -3.24, lng: 102.895 },
  { name: 'Petanang Ulu', kecamatan: 'Lubuklinggau Utara I', lat: -3.245, lng: 102.89 },
  { name: 'Sumber Agung', kecamatan: 'Lubuklinggau Utara I', lat: -3.218, lng: 102.892 },
  { name: 'Tanjung Raya', kecamatan: 'Lubuklinggau Utara I', lat: -3.255, lng: 102.882 },
  { name: 'Taba Baru', kecamatan: 'Lubuklinggau Utara I', lat: -3.248, lng: 102.874 },

  // 8. Lubuklinggau Utara II
  { name: 'Batu Febri', kecamatan: 'Lubuklinggau Utara II', lat: -3.28, lng: 102.852 },
  { name: 'Kenanga', kecamatan: 'Lubuklinggau Utara II', lat: -3.275, lng: 102.855 },
  { name: 'Megang', kecamatan: 'Lubuklinggau Utara II', lat: -3.282, lng: 102.861 },
  { name: 'Pasar Satelit', kecamatan: 'Lubuklinggau Utara II', lat: -3.278, lng: 102.865 },
  { name: 'Ponorogo', kecamatan: 'Lubuklinggau Utara II', lat: -3.271, lng: 102.858 },
  { name: 'Puncak Kemuning', kecamatan: 'Lubuklinggau Utara II', lat: -3.268, lng: 102.863 },
  { name: 'Senalang', kecamatan: 'Lubuklinggau Utara II', lat: -3.273, lng: 102.868 },
  { name: 'Sumberejo', kecamatan: 'Lubuklinggau Utara II', lat: -3.264, lng: 102.855 },
  { name: 'Ulaksurung', kecamatan: 'Lubuklinggau Utara II', lat: -3.284, lng: 102.853 },
];

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestKelurahan(lat, lng, targetKecamatan = null) {
  let list = KELURAHAN_CENTROIDS;
  if (targetKecamatan) {
    list = list.filter((k) => k.kecamatan.toLowerCase().includes(targetKecamatan.toLowerCase()));
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
  { name: 'Simpang Periuk', lat: -3.3282, lng: 102.871 },
  { name: 'Watervang', lat: -3.2847, lng: 102.8805 },
  { name: 'Taba Jemekeh', lat: -3.2964, lng: 102.8617 },
  { name: 'Pasar Permiri', lat: -3.2955, lng: 102.8545 },
  { name: 'Sukajadi', lat: -3.308, lng: 102.842 },
  { name: 'Petanang Ulu', lat: -3.245, lng: 102.89 },
  { name: 'Kenanga', lat: -3.275, lng: 102.855 },
  { name: 'Rahmah', lat: -3.365, lng: 102.835 },
];

for (const tc of testCoords) {
  const match = findNearestKelurahan(tc.lat, tc.lng);
  console.log(`📍 ${tc.name}:`);
  console.log(
    `   -> Terdeteksi: Kel. ${match.name}, ${match.kecamatan} (Jarak ke pusat kelurahan: ${(match.distanceKm * 1000).toFixed(0)}m)`
  );
}
