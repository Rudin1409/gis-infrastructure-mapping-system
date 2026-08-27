import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { PoleFilterOptions } from '@/repositories/interfaces/IPoleRepository';
import { evaluateLocationQC } from '@/lib/gis/haversine';

export class PoleService {
  async getPoles(filters?: PoleFilterOptions): Promise<Pole[]> {
    return getPoleRepository().findAll(filters);
  }

  async getPoleById(id: string): Promise<Pole | null> {
    return getPoleRepository().findById(id);
  }

  async createPole(input: CreatePoleInput): Promise<Pole> {
    // Resolve provider name if not supplied
    if (!input.providerName && input.providerId) {
      const provider = await getProviderRepository().findById(input.providerId);
      if (provider) {
        input.providerName = provider.name;
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
    return getPoleRepository().update(id, input);
  }

  async deletePole(id: string): Promise<boolean> {
    return getPoleRepository().delete(id);
  }
}

export const poleService = new PoleService();
