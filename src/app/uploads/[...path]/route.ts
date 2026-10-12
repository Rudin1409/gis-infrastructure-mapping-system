import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { resolveLocalPhotoPath } from '@/lib/storage/localStorage';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathParts = resolvedParams.path || [];
    const fullSubPath = pathParts.join('/');

    const resolved = resolveLocalPhotoPath(fullSubPath);
    if (!resolved) {
      return NextResponse.json(
        { error: 'File tidak ditemukan di storage server' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(resolved.filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': resolved.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[Uploads Route] Error serving file:', error?.message || error);
    return NextResponse.json({ error: 'Gagal memuat file gambar' }, { status: 500 });
  }
}
