import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { sheetsBackupService } from '@/services/sheetsBackupService';
import { calculateHaversineDistance } from '@/lib/gis/haversine';
import { Pole } from '@/types/pole';
import { NetworkSegment } from '@/types/segment';
import { isDataMutationAllowed } from '@/lib/ai/aiConfig';

export const dynamic = 'force-dynamic';

interface BatchCreateCorridorPayload {
  poles: Array<{
    existingPoleId?: string;
    poleLatitude: number;
    poleLongitude: number;
    poleCode?: string;
    road: string;
    kelurahan: string;
    kecamatan: string;
    providerId: string;
    providerName?: string;
    poleType?: string;
    condition?: string;
    height?: string;
    infrastructureCategory?: string;
    pjuLampType?: string;
    pjuLampPower?: string;
    pjuLampCondition?: string;
    hasKwhMeter?: boolean;
    hasNetworkCable?: boolean;
    ownershipStatus?: string;
    cableInstallationType?: string;
    sisiJalan?: string;
    surveyorId?: string;
    surveyorName?: string;
    surveyDate?: string;
  }>;
  createSegments?: boolean;
  networkType?: string;
  installationType?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!isDataMutationAllowed()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Penambahan data dinonaktifkan pada versi demo. Silakan gunakan server resmi VPS.',
        },
        { status: 403 }
      );
    }

    const body: BatchCreateCorridorPayload = await request.json();

    if (!body.poles || !Array.isArray(body.poles) || body.poles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Daftar tiang (poles) kosong atau tidak valid' },
        { status: 400 }
      );
    }

    const createdPoles: Pole[] = [];
    const segmentRepo = getSegmentRepository();
    const createdSegments: NetworkSegment[] = [];

    // 1. Create or resolve all poles sequentially in Supabase
    for (let i = 0; i < body.poles.length; i++) {
      const p = body.poles[i];

      // If this waypoint is already an existing pole, reuse it!
      if (p.existingPoleId) {
        const existing = await poleService.getPoleById(p.existingPoleId);
        if (existing) {
          createdPoles.push(existing);
          continue;
        }
      }

      const newPole = await poleService.createPole({
        poleLatitude: p.poleLatitude,
        poleLongitude: p.poleLongitude,
        poleCode: p.poleCode,
        road: p.road || 'Jalan Kota',
        kelurahan: p.kelurahan || 'Pelita Jaya',
        kecamatan: p.kecamatan || 'Lubuklinggau Barat I',
        kota: 'Kota Lubuklinggau',
        providerId: p.providerId || 'PRV_TELKOM',
        providerName: p.providerName || 'PT Telkom Indonesia',
        poleType: (p.poleType as any) || 'BETON',
        condition: (p.condition as any) || 'GOOD',
        height: p.height || '5m',
        sisiJalan: (p.sisiJalan as any) || 'KIRI',
        infrastructureCategory: (p.infrastructureCategory as any) || 'FO_WIFI',
        hasNetworkCable: p.hasNetworkCable !== undefined ? p.hasNetworkCable : undefined,
        pjuLampType: (p.pjuLampType as any) || undefined,
        pjuLampPower: p.pjuLampPower || undefined,
        pjuLampCondition: (p.pjuLampCondition as any) || undefined,
        hasKwhMeter: p.hasKwhMeter !== undefined ? p.hasKwhMeter : undefined,
        ownershipStatus: (p.ownershipStatus as any) || 'SENDIRI',
        cableInstallationType: (p.cableInstallationType as any) || 'UDARA',
        locationMethod: 'MANUAL_MAP_PIN',
        surveyorId: p.surveyorId || 'USR-KOMINFO-ADMIN',
        surveyorName: p.surveyorName || 'Admin DISKOMINFO (Admin Teknis & Jaringan)',
        surveyDate: p.surveyDate || new Date().toISOString().split('T')[0],
      });

      createdPoles.push(newPole);

      // Fire-and-forget backup to Google Sheets
      sheetsBackupService.backupPoleToSheets(newPole).catch(() => {});
    }

    // 2. Optionally create interconnecting cable segments between adjacent poles
    if (body.createSegments !== false && createdPoles.length >= 2) {
      for (let i = 0; i < createdPoles.length - 1; i++) {
        const fromPole = createdPoles[i];
        const toPole = createdPoles[i + 1];

        const distanceMeters = Math.round(
          calculateHaversineDistance(
            { lat: fromPole.poleLatitude, lng: fromPole.poleLongitude },
            { lat: toPole.poleLatitude, lng: toPole.poleLongitude }
          )
        );

        const segmentCode = `SEG-${fromPole.poleCode || fromPole.id}-${toPole.poleCode || toPole.id}`;

        try {
          const seg = await segmentRepo.create({
            segmentCode,
            fromNodeId: fromPole.id,
            toNodeId: toPole.id,
            providerId: fromPole.providerId,
            providerName: fromPole.providerName,
            networkType: (body.networkType as any) || 'FIBER_OPTIC',
            installationType: (body.installationType as any) || 'AERIAL',
            estimatedDistance: distanceMeters,
            status: 'ACTIVE',
            description: `Segmen otomatis jalur ${fromPole.road || 'Jalur'} (${distanceMeters}m)`,
          });
          createdSegments.push(seg);
        } catch (segErr) {
          console.warn(`Gagal membuat segmen ${segmentCode}:`, segErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil generate ${createdPoles.length} tiang dan ${createdSegments.length} segmen kabel secara otomatis!`,
        data: {
          poles: createdPoles,
          segments: createdSegments,
          countPoles: createdPoles.length,
          countSegments: createdSegments.length,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API POST /api/poles/batch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal generate batch tiang' },
      { status: 500 }
    );
  }
}
