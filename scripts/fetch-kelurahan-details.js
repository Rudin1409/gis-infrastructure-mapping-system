const https = require('https');
const fs = require('fs');

const KELURAHAN_NAMES = [
  'Pelita Jaya', 'Sukajadi', 'Kayu Ara', 'Lubuk Tanjung', 'Lubuk Aman', 'Tanjung Aman', 'Tanjung Indah',
  'Pasar Pemiri', 'Sidorejo', 'Tapak Lebar', 'Ulak Lebar', 'Wira Karya', 'Lubuklinggau Ilir', 'Lubuklinggau Ulu',
  'Taba Jemekeh', 'Watervang', 'Majapahit', 'Air Kuti', 'Nikan Jaya', 'Batu Urip Taba', 'Taba Koji', 'Taba Lestari',
  'Cereme Taba', 'Dempo', 'Jawa Kanan', 'Jawa Kiri', 'Karya Bakti', 'Mesat Jaya', 'Mesat Seni',
  'Kenanga', 'Batu Urip', 'Jogoboyo', 'Megang', 'Pasar Satelit', 'Ponorogo', 'Puncak Kemuning', 'Senalang', 'Ulak Surung',
  'Petanang Ilir', 'Petanang Ulu', 'Durian Rampak', 'Sumber Agung', 'Tanjung Raya', 'Marga Bakti', 'Belalau I', 'Belalau II',
  'Simpang Periuk', 'Air Kati', 'Jukung', 'Lubuk Binjai', 'Lubuk Kupang', 'Rahmah',
  'Marga Mulya', 'Tanah Periuk', 'Marga Rahayu', 'Eka Marga', 'Karang Ketuan', 'Moneng Sepati', 'Siring Agung', 'Taba Pingin'
];

function searchKelurahan(name) {
  return new Promise((resolve) => {
    const q = `${name}, Lubuklinggau, Indonesia`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&limit=1`;
    https.get(url, { headers: { 'User-Agent': 'InfraMap-KelurahanFetcher/1.0 (admin@inframap.my.id)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          if (arr && arr[0] && arr[0].geojson) {
            console.log(`✓ ${name}: ${arr[0].geojson.type}`);
            resolve({ name, data: arr[0] });
          } else {
            console.log(`- ${name}: no polygon`);
            resolve({ name, data: null });
          }
        } catch(e) {
          resolve({ name, data: null });
        }
      });
    }).on('error', () => resolve({ name, data: null }));
  });
}

async function run() {
  const list = [];
  for (const k of KELURAHAN_NAMES.slice(0, 15)) {
    const res = await searchKelurahan(k);
    if (res.data) list.push(res);
    await new Promise(r => setTimeout(r, 1100));
  }
  fs.writeFileSync('scripts/kelurahan_osm_results.json', JSON.stringify(list, null, 2));
  console.log(`Saved ${list.length} kelurahan results.`);
}

run();
