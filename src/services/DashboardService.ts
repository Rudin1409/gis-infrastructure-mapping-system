import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';

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
  private poleRepo = getPoleRepository();
  private providerRepo = getProviderRepository();
  private segmentRepo = getSegmentRepository();

  async getStats(): Promise<DashboardStats> {
    const poles = await this.poleRepo.findAll();
    const providers = await this.providerRepo.findAll();
    const segments = await this.segmentRepo.findAll();

    const todayStr = new Date().toISOString().split('T')[0];

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

      if (pole.surveyDate === todayStr || (pole.createdAt && pole.createdAt.startsWith(todayStr))) {
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
