import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { generateKml, generateCsv, generateGeoJson } from '@/lib/gis/exportSpatialData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'kml').toLowerCase();
    const providerId = searchParams.get('providerId') || undefined;
    const condition = searchParams.get('condition') || undefined;
    const kecamatan = searchParams.get('kecamatan') || undefined;
    const kelurahan = searchParams.get('kelurahan') || undefined;
    const search = searchParams.get('search') || undefined;

    const poles = await poleService.getPoles({
      providerId,
      condition,
      kecamatan,
      kelurahan,
      search,
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const baseName = `inframap-lubuklinggau-${dateStr}`;

    if (format === 'csv') {
      const csvData = generateCsv(poles);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    if (format === 'geojson' || format === 'json') {
      const geojsonData = generateGeoJson(poles);
      return new NextResponse(JSON.stringify(geojsonData, null, 2), {
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.geojson"`,
        },
      });
    }

    // Default: KML for Google Earth & Google My Maps
    const title = kecamatan
      ? `Pemetaan Tiang - Kec. ${kecamatan}`
      : 'Pemetaan Tiang Infrastruktur Kota Lubuklinggau';
    const kmlData = generateKml(poles, title);

    return new NextResponse(kmlData, {
      headers: {
        'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.kml"`,
      },
    });
  } catch (error: any) {
    console.error('API /api/poles/export error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengekspor data tiang' },
      { status: 500 }
    );
  }
}
