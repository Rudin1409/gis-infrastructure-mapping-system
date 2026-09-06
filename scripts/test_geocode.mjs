import https from 'https';

const testPoints = [
  { name: 'Simpang Periuk (Selatan II)', lat: -3.3282, lng: 102.871 },
  { name: 'Watervang (Timur I)', lat: -3.2847, lng: 102.8805 },
  { name: 'Taba Jemekeh (Timur I)', lat: -3.2964, lng: 102.8617 },
  { name: 'Pasar Permiri / Mesat (Barat II)', lat: -3.297, lng: 102.855 },
  { name: 'Sukajadi (Barat I)', lat: -3.308, lng: 102.842 },
  { name: 'Petanang Ulu (Utara I)', lat: -3.245, lng: 102.89 },
  { name: 'Kenanga (Utara II)', lat: -3.275, lng: 102.855 },
  { name: 'Rahmah (Selatan I)', lat: -3.365, lng: 102.835 },
];

function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1`;
    const options = {
      headers: {
        'User-Agent': 'InfraMap-Lubuklinggau/1.0 (admin@lubuklinggaukota.go.id)',
        'Accept-Language': 'id,en',
      },
    };
    https
      .get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on('error', (err) => resolve(null));
  });
}

async function run() {
  console.log('Testing reverse geocoding on Lubuklinggau points:');
  for (const pt of testPoints) {
    const data = await reverseGeocode(pt.lat, pt.lng);
    console.log(`\n📍 ${pt.name} (${pt.lat}, ${pt.lng}):`);
    if (data && data.address) {
      console.log('   Address Details:', JSON.stringify(data.address, null, 2));
      console.log('   Display Name:', data.display_name);
    } else {
      console.log('   Failed to get OSM data:', data);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

run();
