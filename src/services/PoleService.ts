import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { PoleFilterOptions } from '@/repositories/interfaces/IPoleRepository';
import { evaluateLocationQC } from '@/lib/gis/haversine';

export class PoleService {
  private poleRepo = getPoleRepository();
  private providerRepo = getProviderRepository();

  async getPoles(filters?: PoleFilterOptions): Promise<Pole[]> {
    return this.poleRepo.findAll(filters);
  }

  async getPoleById(id: string): Promise<Pole | null> {
    return this.poleRepo.findById(id);
  }

  async createPole(input: CreatePoleInput): Promise<Pole> {
    // Resolve provider name if not supplied
    if (!input.providerName && input.providerId) {
      const provider = await this.providerRepo.findById(input.providerId);
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

    return this.poleRepo.create(input);
  }

  async updatePole(id: string, input: UpdatePoleInput): Promise<Pole> {
    return this.poleRepo.update(id, input);
  }

  async deletePole(id: string): Promise<boolean> {
    return this.poleRepo.delete(id);
  }
}

export const poleService = new PoleService();
