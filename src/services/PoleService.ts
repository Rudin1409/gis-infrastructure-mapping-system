import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { PoleFilterOptions } from '@/repositories/interfaces/IPoleRepository';
import { evaluateLocationQC } from '@/lib/gis/haversine';

import { resolveProviderInfo } from '@/config/providers';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';

export class PoleService {
  async getPoles(filters?: PoleFilterOptions): Promise<Pole[]> {
    return getPoleRepository().findAll(filters);
  }

  async getSummaryCounts(): Promise<{ total: number; good: number; audit: number }> {
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery(
          `SELECT 
             count(*)::int as total, 
             count(*) FILTER (WHERE condition = 'GOOD')::int as good, 
             count(*) FILTER (WHERE condition != 'GOOD')::int as audit 
           FROM poles`
        );
        if (rows && rows.length > 0) {
          return {
            total: Number(rows[0].total) || 0,
            good: Number(rows[0].good) || 0,
            audit: Number(rows[0].audit) || 0,
          };
        }
      } catch (err) {
        console.warn('Failed to query fast summary counts from Postgres, falling back:', err);
      }
    }

    const allPoles = await getPoleRepository().findAll();
    return {
      total: allPoles.length,
      good: allPoles.filter((p) => p.condition === 'GOOD').length,
      audit: allPoles.filter((p) => p.condition !== 'GOOD').length,
    };
  }

  async getPoleById(id: string): Promise<Pole | null> {
    return getPoleRepository().findById(id);
  }

  async createPole(input: CreatePoleInput): Promise<Pole> {
    // Otomatis tentukan Instansi / Provider Name jika PLN / PJU atau belum ada
    const resolved = resolveProviderInfo({
      providerId: input.providerId,
      providerName: input.providerName,
      infrastructureCategory: input.infrastructureCategory,
    });

    input.providerId = resolved.providerId;
    input.providerName = resolved.providerName;

    // Set status kepemilikan yang sesuai jika PLN
    if (
      input.infrastructureCategory === 'PLN_MURNI' ||
      input.infrastructureCategory === 'GABUNG_PLN_PJU'
    ) {
      if (!input.ownershipStatus || input.ownershipStatus === 'SENDIRI') {
        input.ownershipStatus = 'BERSAMA_PLN';
      }
    }

    // Auto compute distance from device if device coords provided and not set
    if (
      input.deviceLatitude !== undefined &&
      input.deviceLongitude !== undefined &&
      input.distanceFromDevice === undefined
    ) {
      const qc = evaluateLocationQC(
        { lat: input.poleLatitude, lng: input.poleLongitude },
        { lat: input.deviceLatitude, lng: input.deviceLongitude }
      );
      input.distanceFromDevice = qc.distanceFromDevice;
    }

    return getPoleRepository().create(input);
  }

  async updatePole(id: string, input: UpdatePoleInput): Promise<Pole> {
    if (input.providerId || input.infrastructureCategory || input.providerName) {
      const resolved = resolveProviderInfo({
        providerId: input.providerId,
        providerName: input.providerName,
        infrastructureCategory: input.infrastructureCategory,
      });
      input.providerId = resolved.providerId;
      input.providerName = resolved.providerName;
    }

    return getPoleRepository().update(id, input);
  }

  async deletePole(id: string): Promise<boolean> {
    return getPoleRepository().delete(id);
  }
}

export const poleService = new PoleService();
