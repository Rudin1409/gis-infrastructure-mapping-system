import { NextResponse } from 'next/server';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getKecamatanCode, getKelurahanCode } from '@/lib/gis/geocoding';

export const dynamic = 'force-dynamic';

/**
 * POST /api/poles/fix-codes
 * One-time migration: Renumber all poles that have duplicate poleCode endings (e.g., all ending with -001).
 * Groups poles by their kecamatan+kelurahan prefix, then assigns sequential numbers
 * based on their surveyDate/created_at order.
 *
 * IMPORTANT: Only updates poleCode field - does NOT touch any other data.
 */
export async function POST() {
  try {
    const poleRepo = getPoleRepository();
    const allPoles = await poleRepo.findAll();

    if (allPoles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada data tiang untuk diperbaiki.',
        fixed: 0,
      });
    }

    // Group poles by their kecamatan+kelurahan code prefix
    const groups: Record<string, typeof allPoles> = {};

    for (const pole of allPoles) {
      const kecCode = getKecamatanCode(pole.kecamatan || '');
      const kelCode = getKelurahanCode(pole.kelurahan || '');
      const prefix = `LLG-${kecCode}-${kelCode}`;

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(pole);
    }

    let totalFixed = 0;
    const fixLog: { id: string; oldCode: string; newCode: string }[] = [];

    for (const [prefix, polesInGroup] of Object.entries(groups)) {
      // Sort by surveyDate (oldest first), then by created_at, then by ID for stability
      polesInGroup.sort((a, b) => {
        const dateA = a.surveyDate || a.createdAt || '';
        const dateB = b.surveyDate || b.createdAt || '';
        if (dateA !== dateB) return dateA < dateB ? -1 : 1;

        // If same date, sort by surveyTime
        const timeA = a.surveyTime || '';
        const timeB = b.surveyTime || '';
        if (timeA !== timeB) return timeA < timeB ? -1 : 1;

        // Last resort: by ID
        return a.id < b.id ? -1 : 1;
      });

      // Assign sequential numbers
      for (let i = 0; i < polesInGroup.length; i++) {
        const pole = polesInGroup[i];
        const seqNum = i + 1;
        const newCode = `${prefix}-${String(seqNum).padStart(3, '0')}`;
        const oldCode = pole.poleCode || '';

        // Only update if code is different
        if (oldCode !== newCode) {
          try {
            await poleRepo.update(pole.id, { poleCode: newCode } as any);
            totalFixed++;
            fixLog.push({ id: pole.id, oldCode, newCode });
          } catch (updateErr: any) {
            console.error(`Failed to update pole ${pole.id}:`, updateErr.message);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbaiki ${totalFixed} kode tiang dari ${allPoles.length} total tiang.`,
      fixed: totalFixed,
      total: allPoles.length,
      groups: Object.keys(groups).length,
      log: fixLog.slice(0, 50), // Return first 50 for preview
    });
  } catch (error: any) {
    console.error('API POST /api/poles/fix-codes error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbaiki kode tiang' },
      { status: 500 }
    );
  }
}
