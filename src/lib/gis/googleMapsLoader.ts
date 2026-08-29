'use client';

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps hanya tersedia di browser.'));
  }

  const existingGoogle = (window as any).google;
  if (existingGoogle?.maps?.StreetViewPanorama) {
    return Promise.resolve(existingGoogle.maps);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(
      new Error('Google Maps API key belum dikonfigurasi untuk Street View presisi.')
    );
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="street-view"]'
    );

    const finish = () => {
      const maps = (window as any).google?.maps;
      if (maps?.StreetViewPanorama) {
        resolve(maps);
      } else {
        reject(new Error('Google Maps gagal dimuat. Periksa API key dan pembatasan domain.'));
      }
    };

    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Jaringan gagal memuat Google Maps.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleMapsLoader = 'street-view';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Jaringan gagal memuat Google Maps.')),
      { once: true }
    );
    document.head.appendChild(script);
  }).catch((error) => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
}
