import { Pole } from '@/types/pole';
import { resolveProviderInfo } from '@/config/providers';

/**
 * Clean and escape XML/HTML strings for safe KML embedding.
 */
function escapeXml(unsafe: string | number | boolean | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape CSV fields according to RFC 4180.
 */
function escapeCsv(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Provider color styles for Google Earth Placemarks.
 * KML color format is AABBGGRR (Alpha, Blue, Green, Red) in hex.
 */
const PROVIDER_KML_COLORS: Record<string, { color: string; hex: string }> = {
  PRV_TELKOM: { color: 'ff0000ff', hex: '#EF4444' }, // Red (Telkom)
  PRV_PLN: { color: 'ffff0000', hex: '#2563EB' }, // Blue (PLN)
  PRV_PJU: { color: 'ff00d0ff', hex: '#EAB308' }, // Yellow/Gold (PJU)
  PRV_IFORTE: { color: 'ffff0080', hex: '#8B5CF6' }, // Purple (iForte)
  PRV_INDOSAT: { color: 'ff0080ff', hex: '#F97316' }, // Orange (Indosat)
  PRV_XL: { color: 'ffffff00', hex: '#06B6D4' }, // Cyan (XL)
  PRV_ICONPLUS: { color: 'ff00aa00', hex: '#10B981' }, // Green (Icon+)
  DEFAULT: { color: 'ffaaaaaa', hex: '#64748B' }, // Slate Gray
};

function getProviderStyleId(providerId?: string): string {
  if (!providerId) return 'style_DEFAULT';
  const cleanId = providerId.toUpperCase();
  if (cleanId.includes('TELKOM')) return 'style_PRV_TELKOM';
  if (cleanId.includes('PLN')) return 'style_PRV_PLN';
  if (cleanId.includes('PJU')) return 'style_PRV_PJU';
  if (cleanId.includes('IFORTE')) return 'style_PRV_IFORTE';
  if (cleanId.includes('INDOSAT')) return 'style_PRV_INDOSAT';
  if (cleanId.includes('XL')) return 'style_PRV_XL';
  if (cleanId.includes('ICON')) return 'style_PRV_ICONPLUS';
  return 'style_DEFAULT';
}

/**
 * 1. GENERATE KML (Google Earth & Google My Maps)
 * - Strict coordinates order: longitude,latitude,altitude (0)
 * - Beautiful HTML popup balloon with full technical attributes and photo
 * - Grouped by Provider or Kecamatan into KML Folders
 */
export function generateKml(
  poles: Pole[],
  title: string = 'Pemetaan Tiang Infrastruktur Kota Lubuklinggau'
): string {
  // Group poles by Provider for organized Google Earth folder layers
  const folderMap = new Map<string, Pole[]>();

  for (const pole of poles) {
    const resolved = resolveProviderInfo({
      providerId: pole.providerId,
      providerName: pole.providerName,
      infrastructureCategory: pole.infrastructureCategory,
    });
    const folderName = resolved.providerName || 'Provider Lainnya';
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, []);
    }
    folderMap.get(folderName)!.push(pole);
  }

  const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>${escapeXml(title)}</name>
    <description>Sistem Inventarisasi Spasial dan Pemetaan GIS Tiang Kota Lubuklinggau - DISKOMINFOTIKSAN</description>
    <open>1</open>

    <!-- Pin Styles per Provider -->
    <Style id="style_PRV_TELKOM">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_TELKOM.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_PLN">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_PLN.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_PJU">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_PJU.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_IFORTE">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_IFORTE.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/purple-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_INDOSAT">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_INDOSAT.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_XL">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_XL.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/cyan-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_PRV_ICONPLUS">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.PRV_ICONPLUS.color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>

    <Style id="style_DEFAULT">
      <IconStyle>
        <color>${PROVIDER_KML_COLORS.DEFAULT.color}</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>
`;

  let foldersXml = '';

  for (const [folderName, folderPoles] of folderMap.entries()) {
    foldersXml += `    <Folder>\n      <name>${escapeXml(folderName)} (${folderPoles.length} Tiang)</name>\n`;

    for (const pole of folderPoles) {
      const resolved = resolveProviderInfo({
        providerId: pole.providerId,
        providerName: pole.providerName,
        infrastructureCategory: pole.infrastructureCategory,
      });

      const styleId = getProviderStyleId(pole.providerId);
      const poleTitle = pole.poleCode
        ? `${pole.poleCode} - ${pole.road}`
        : `Tiang ${resolved.providerName} - ${pole.road}`;

      // Build rich HTML balloon description
      const photoHtml = pole.photoUrl
        ? `<div style="margin-bottom:12px;text-align:center;"><img src="${escapeXml(pole.photoUrl)}" style="width:100%;max-width:320px;height:auto;border-radius:8px;border:1px solid #ddd;" alt="Foto Tiang"/></div>`
        : '';

      const hazards = [];
      if (pole.isTilted) hazards.push('Tiang Miring');
      if (pole.isMessyCable) hazards.push('Kabel Semrawut');
      if (pole.isLowCable) hazards.push('Kabel Rendah');
      if (pole.isHazardous) hazards.push('Potensi Bahaya');
      if (pole.isCorroded) hazards.push('Karat / Retak');
      if (pole.isObstructing) hazards.push('Mengganggu Jalan');
      const hazardsText = hazards.length > 0 ? hazards.join(', ') : 'Aman (Tidak Ada Bahaya)';

      const descriptionHtml = `<![CDATA[
        <div style="font-family:Arial,sans-serif;font-size:12px;color:#1e293b;max-width:350px;line-height:1.5;">
          <div style="background:#0f172a;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:10px;">
            <strong style="font-size:14px;display:block;">${escapeXml(pole.poleCode || pole.id)}</strong>
            <span style="font-size:11px;color:#94a3b8;">${escapeXml(resolved.providerName)} • ${escapeXml(pole.road)}</span>
          </div>

          ${photoHtml}

          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Provider:</td><td style="padding:4px 0;">${escapeXml(resolved.providerName)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Kategori:</td><td style="padding:4px 0;">${escapeXml(pole.infrastructureCategory || 'FO_WIFI')}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Kondisi Tiang:</td><td style="padding:4px 0;">${escapeXml(pole.condition)} (${escapeXml(pole.poleType)} - ${escapeXml(pole.height || '7m')})</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Kelurahan/Kec:</td><td style="padding:4px 0;">${escapeXml(pole.kelurahan)}, ${escapeXml(pole.kecamatan)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Sisi Jalan:</td><td style="padding:4px 0;">${escapeXml(pole.sisiJalan || '-')}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Koordinat GPS:</td><td style="padding:4px 0;font-family:monospace;">${pole.poleLatitude.toFixed(6)}, ${pole.poleLongitude.toFixed(6)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Hasil Bahaya:</td><td style="padding:4px 0;color:${hazards.length > 0 ? '#b91c1c' : '#15803d'};font-weight:bold;">${escapeXml(hazardsText)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:4px 0;font-weight:bold;color:#64748b;">Surveyor:</td><td style="padding:4px 0;">${escapeXml(pole.surveyorName || 'Petugas GIS')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#64748b;">Waktu Survei:</td><td style="padding:4px 0;">${escapeXml(pole.surveyDate)} ${escapeXml(pole.surveyTime || '')}</td></tr>
          </table>

          ${pole.description ? `<div style="margin-top:8px;padding:6px;background:#f1f5f9;border-radius:4px;font-style:italic;">Catatan: ${escapeXml(pole.description)}</div>` : ''}
        </div>
      ]]>`;

      foldersXml += `      <Placemark>
        <name>${escapeXml(poleTitle)}</name>
        <styleUrl>#${styleId}</styleUrl>
        <description>${descriptionHtml}</description>
        <Point>
          <coordinates>${pole.poleLongitude},${pole.poleLatitude},0</coordinates>
        </Point>
      </Placemark>\n`;
    }

    foldersXml += `    </Folder>\n`;
  }

  const kmlFooter = `  </Document>\n</kml>`;
  return kmlHeader + foldersXml + kmlFooter;
}

/**
 * 2. GENERATE CSV / EXCEL
 * - UTF-8 with BOM (\uFEFF) for immediate native Microsoft Excel compatibility
 * - All 33 data columns matching municipal GIS specifications
 */
export function generateCsv(poles: Pole[]): string {
  const headers = [
    'ID Sistem',
    'Kode Tiang Fisik',
    'Latitude',
    'Longitude',
    'Akurasi GPS (m)',
    'Jarak dari Surveyor (m)',
    'Metode Lokasi',
    'ID Provider',
    'Nama Provider',
    'Jenis Tiang',
    'Kondisi Fisik',
    'Tinggi Tiang',
    'Status Kepemilikan',
    'Tipe Kabel',
    'Kategori Infrastruktur',
    'Nama Jalan',
    'Patokan Lokasi',
    'Kelurahan',
    'Kecamatan',
    'Kota',
    'Sisi Jalan',
    'Tipe Lampu PJU',
    'Daya Lampu PJU',
    'Kondisi Lampu PJU',
    'Ada KWh Meter',
    'Ada Kabel Numpang',
    'Tiang Miring',
    'Kabel Semrawut',
    'Kabel Rendah',
    'Potensi Bahaya',
    'Berkarat/Retak',
    'Mengganggu Trotoar',
    'Catatan Lapangan',
    'Tautan Foto Tiang',
    'ID Petugas',
    'Nama Surveyor',
    'Tanggal Survei',
    'Waktu Survei',
    'Status Validasi',
  ];

  const rows = poles.map((p) => {
    const resolved = resolveProviderInfo({
      providerId: p.providerId,
      providerName: p.providerName,
      infrastructureCategory: p.infrastructureCategory,
    });

    return [
      escapeCsv(p.id),
      escapeCsv(p.poleCode || ''),
      p.poleLatitude,
      p.poleLongitude,
      p.gpsAccuracy !== undefined ? p.gpsAccuracy : '',
      p.distanceFromDevice !== undefined ? p.distanceFromDevice : '',
      escapeCsv(p.locationMethod || 'MANUAL_MAP_PIN'),
      escapeCsv(resolved.providerId),
      escapeCsv(resolved.providerName),
      escapeCsv(p.poleType),
      escapeCsv(p.condition),
      escapeCsv(p.height || '7m'),
      escapeCsv(p.ownershipStatus || 'SENDIRI'),
      escapeCsv(p.cableInstallationType || 'UDARA'),
      escapeCsv(p.infrastructureCategory || 'FO_WIFI'),
      escapeCsv(p.road),
      escapeCsv(p.patokanLokasi || ''),
      escapeCsv(p.kelurahan),
      escapeCsv(p.kecamatan),
      escapeCsv(p.kota || 'Kota Lubuklinggau'),
      escapeCsv(p.sisiJalan || 'TIDAK_DITENTUKAN'),
      escapeCsv(p.pjuLampType || ''),
      escapeCsv(p.pjuLampPower || ''),
      escapeCsv(p.pjuLampCondition || ''),
      p.hasKwhMeter ? 'YA' : 'TIDAK',
      p.hasNetworkCable ? 'YA' : 'TIDAK',
      p.isTilted ? 'YA' : 'TIDAK',
      p.isMessyCable ? 'YA' : 'TIDAK',
      p.isLowCable ? 'YA' : 'TIDAK',
      p.isHazardous ? 'YA' : 'TIDAK',
      p.isCorroded ? 'YA' : 'TIDAK',
      p.isObstructing ? 'YA' : 'TIDAK',
      escapeCsv(p.description || ''),
      escapeCsv(p.photoUrl || ''),
      escapeCsv(p.surveyorId || ''),
      escapeCsv(p.surveyorName || ''),
      escapeCsv(p.surveyDate),
      escapeCsv(p.surveyTime || ''),
      escapeCsv(p.validationStatus || 'SUBMITTED'),
    ].join(',');
  });

  // Prepend UTF-8 BOM so Excel opens accents, symbols, and formatting properly
  return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
}

/**
 * 3. GENERATE GEOJSON (QGIS, ArcGIS, Mapbox, Leaflet)
 * - Standard RFC 7946 GeoJSON FeatureCollection
 */
export function generateGeoJson(poles: Pole[]): object {
  const features = poles.map((p) => {
    const resolved = resolveProviderInfo({
      providerId: p.providerId,
      providerName: p.providerName,
      infrastructureCategory: p.infrastructureCategory,
    });

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.poleLongitude, p.poleLatitude],
      },
      properties: {
        id: p.id,
        poleCode: p.poleCode || null,
        providerId: resolved.providerId,
        providerName: resolved.providerName,
        poleType: p.poleType,
        condition: p.condition,
        height: p.height || '7m',
        road: p.road,
        kelurahan: p.kelurahan,
        kecamatan: p.kecamatan,
        kota: p.kota || 'Kota Lubuklinggau',
        patokanLokasi: p.patokanLokasi || null,
        sisiJalan: p.sisiJalan || null,
        infrastructureCategory: p.infrastructureCategory || 'FO_WIFI',
        cableInstallationType: p.cableInstallationType || 'UDARA',
        pjuLampType: p.pjuLampType || null,
        pjuLampPower: p.pjuLampPower || null,
        pjuLampCondition: p.pjuLampCondition || null,
        isTilted: Boolean(p.isTilted),
        isMessyCable: Boolean(p.isMessyCable),
        isLowCable: Boolean(p.isLowCable),
        isHazardous: Boolean(p.isHazardous),
        isCorroded: Boolean(p.isCorroded),
        isObstructing: Boolean(p.isObstructing),
        photoUrl: p.photoUrl || null,
        surveyorName: p.surveyorName || null,
        surveyDate: p.surveyDate,
        surveyTime: p.surveyTime || null,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    name: 'InfraMap_Lubuklinggau_Poles',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };
}

/**
 * Trigger client-side file download in browser.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
