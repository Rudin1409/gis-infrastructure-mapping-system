import fs from 'fs';

const envText = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const locationIqKey = env.LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_API_KEY;

const testPoints = [
  { name: 'Simpang Periuk', lat: -3.3282, lng: 102.871 },
  { name: 'Watervang', lat: -3.2847, lng: 102.8805 },
  { name: 'Taba Jemekeh', lat: -3.2964, lng: 102.8617 },
  { name: 'Pasar Permiri / Mesat', lat: -3.297, lng: 102.855 },
  { name: 'Sukajadi', lat: -3.308, lng: 102.842 },
  { name: 'Petanang Ulu', lat: -3.245, lng: 102.89 },
  { name: 'Kenanga', lat: -3.275, lng: 102.855 },
  { name: 'Rahmah', lat: -3.365, lng: 102.835 },
];

function summarizeAddress(data) {
  const address = data?.address || {};
  return {
    road:
      address.road ||
      address.pedestrian ||
      address.residential ||
      address.footway ||
      address.path ||
      address.neighbourhood ||
      '',
    village: address.village || address.suburb || address.city_district || '',
    city: address.city || address.county || '',
    state: address.state || '',
    displayName: data?.display_name || '',
  };
}

async function reverseLocationIq(lat, lng) {
  if (!locationIqKey) return null;
  const url = new URL('https://us1.locationiq.com/v1/reverse');
  url.searchParams.set('key', locationIqKey);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('normalizeaddress', '1');
  url.searchParams.set('accept-language', 'id,en');

  const response = await fetch(url);
  if (!response.ok) {
    return { error: `LocationIQ HTTP ${response.status}` };
  }
  return response.json();
}

async function reverseOsm(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '19');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'InfraMap-Lubuklinggau-GIS/2.0 (admin@lubuklinggaukota.go.id)',
      'Accept-Language': 'id,en',
    },
  });
  if (!response.ok) {
    return { error: `OSM HTTP ${response.status}` };
  }
  return response.json();
}

async function run() {
  console.log('Testing LocationIQ vs OSM reverse geocoding on Lubuklinggau points');
  console.log(`LocationIQ key configured: ${locationIqKey ? 'yes' : 'no'}`);

  for (const point of testPoints) {
    const [locationIqData, osmData] = await Promise.all([
      reverseLocationIq(point.lat, point.lng),
      reverseOsm(point.lat, point.lng),
    ]);

    console.log(`\n${point.name} (${point.lat}, ${point.lng})`);
    console.log(
      'LocationIQ:',
      JSON.stringify(
        locationIqData?.error ? locationIqData : summarizeAddress(locationIqData),
        null,
        2
      )
    );
    console.log(
      'OSM:',
      JSON.stringify(osmData?.error ? osmData : summarizeAddress(osmData), null, 2)
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

run().catch((error) => {
  console.error('LocationIQ test failed:', error.message || error);
  process.exit(1);
});
