import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';

export interface DashboardStats {
  totalPoles: number;
  goodCount: number;
  needsRepairCount: number;
  damagedCount: number;
  unknownCount: number;
  todayCount: number;
  totalSegments: number;
  totalEstimatedNetworkDistance: number; // in meters
  polesByProvider: { providerId: string; providerName: string; count: number; colorHex?: string }[];
  polesByKecamatan: { kecamatan: string; count: number }[];
}

export class DashboardService {
  async getStats(cachedPoles?: any[]): Promise<DashboardStats> {
    if (isPostgresConfigured() && !cachedPoles) {
      try {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
          new Date()
        );

        const [condRes, provRes, kecRes, providers, segments] = await Promise.all([
          dbQuery(
            `SELECT 
               count(*)::int as total,
               count(*) FILTER (WHERE condition = 'GOOD')::int as good,
               count(*) FILTER (WHERE condition = 'NEEDS_REPAIR')::int as needs_repair,
               count(*) FILTER (WHERE condition = 'DAMAGED')::int as damaged,
               count(*) FILTER (WHERE condition NOT IN ('GOOD', 'NEEDS_REPAIR', 'DAMAGED') OR condition IS NULL)::int as unknown,
               count(*) FILTER (WHERE survey_date = $1 OR created_at::text LIKE $2)::int as today
             FROM poles`,
            [todayStr, todayStr + '%']
          ),
          dbQuery(
            `SELECT provider_id, count(*)::int as count FROM poles WHERE provider_id IS NOT NULL GROUP BY provider_id`
          ),
          dbQuery(
            `SELECT kecamatan, count(*)::int as count FROM poles WHERE kecamatan IS NOT NULL GROUP BY kecamatan`
          ),
          getProviderRepository().findAll(),
          getSegmentRepository().findAll(),
        ]);

        const condRow = condRes.rows[0] || {};
        const providerCountMap: Record<string, number> = {};
        provRes.rows.forEach((r: any) => {
          if (r.provider_id) providerCountMap[r.provider_id] = Number(r.count) || 0;
        });

        const kecamatanCountMap: Record<string, number> = {};
        KECAMATAN_LUBUKLINGGAU.forEach((k) => {
          kecamatanCountMap[k.name] = 0;
        });
        kecRes.rows.forEach((r: any) => {
          if (r.kecamatan) kecamatanCountMap[r.kecamatan] = Number(r.count) || 0;
        });

        const polesByProvider = providers
          .map((p) => ({
            providerId: p.id,
            providerName: p.name,
            count: providerCountMap[p.id] || 0,
            colorHex: p.colorHex,
          }))
          .filter((p) => p.count > 0 || ['PRV001', 'PRV002', 'PRV003'].includes(p.providerId))
          .sort((a, b) => b.count - a.count);

        const polesByKecamatan = Object.keys(kecamatanCountMap).map((k) => ({
          kecamatan: k,
          count: kecamatanCountMap[k],
        }));

        const totalEstimatedNetworkDistance = segments.reduce(
          (sum, seg) => sum + (seg.estimatedDistance || 0),
          0
        );

        return {
          totalPoles: Number(condRow.total) || 0,
          goodCount: Number(condRow.good) || 0,
          needsRepairCount: Number(condRow.needs_repair) || 0,
          damagedCount: Number(condRow.damaged) || 0,
          unknownCount: Number(condRow.unknown) || 0,
          todayCount: Number(condRow.today) || 0,
          totalSegments: segments.length,
          totalEstimatedNetworkDistance,
          polesByProvider,
          polesByKecamatan,
        };
      } catch (err) {
        console.warn('Failed to get stats from fast postgres query, falling back:', err);
      }
    }

    const poles = cachedPoles || (await getPoleRepository().findAll());
    const providers = await getProviderRepository().findAll();
    const segments = await getSegmentRepository().findAll();

    // Indonesian Timezone (WIB = UTC+7) for today's survey count
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
      new Date()
    );

    let goodCount = 0;
    let needsRepairCount = 0;
    let damagedCount = 0;
    let unknownCount = 0;
    let todayCount = 0;

    const providerCountMap: Record<string, number> = {};
    const kecamatanCountMap: Record<string, number> = {};

    KECAMATAN_LUBUKLINGGAU.forEach((k) => {
      kecamatanCountMap[k.name] = 0;
    });

    poles.forEach((pole) => {
      if (pole.condition === 'GOOD') goodCount++;
      else if (pole.condition === 'NEEDS_REPAIR') needsRepairCount++;
      else if (pole.condition === 'DAMAGED') damagedCount++;
      else unknownCount++;

      const surveyDate = pole.surveyDate || (pole.createdAt ? pole.createdAt.split('T')[0] : '');
      if (surveyDate === todayStr) {
        todayCount++;
      }

      if (pole.providerId) {
        providerCountMap[pole.providerId] = (providerCountMap[pole.providerId] || 0) + 1;
      }

      if (pole.kecamatan) {
        kecamatanCountMap[pole.kecamatan] = (kecamatanCountMap[pole.kecamatan] || 0) + 1;
      }
    });

    const polesByProvider = providers
      .map((p) => ({
        providerId: p.id,
        providerName: p.name,
        count: providerCountMap[p.id] || 0,
        colorHex: p.colorHex,
      }))
      .filter((p) => p.count > 0 || ['PRV001', 'PRV002', 'PRV003'].includes(p.providerId))
      .sort((a, b) => b.count - a.count);

    const polesByKecamatan = Object.keys(kecamatanCountMap).map((k) => ({
      kecamatan: k,
      count: kecamatanCountMap[k],
    }));

    const totalEstimatedNetworkDistance = segments.reduce(
      (sum, seg) => sum + (seg.estimatedDistance || 0),
      0
    );

    return {
      totalPoles: poles.length,
      goodCount,
      needsRepairCount,
      damagedCount,
      unknownCount,
      todayCount,
      totalSegments: segments.length,
      totalEstimatedNetworkDistance,
      polesByProvider,
      polesByKecamatan,
    };
  }
}

export const dashboardService = new DashboardService();
