import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { generatePoleId } from '@/lib/utils/idGenerator';

let MOCK_POLES: Pole[] = [];

export class MockLocalPoleRepository implements IPoleRepository {
  async findAll(options?: PoleFilterOptions): Promise<Pole[]> {
    let result = [...MOCK_POLES];

    if (options?.providerId && options.providerId !== 'ALL') {
      result = result.filter((p) => p.providerId === options.providerId);
    }
    if (options?.condition && options.condition !== 'ALL') {
      result = result.filter((p) => p.condition === options.condition);
    }
    if (options?.kecamatan && options.kecamatan !== 'ALL') {
      result = result.filter((p) => p.kecamatan === options.kecamatan);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.road.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.kelurahan.toLowerCase().includes(q) ||
          (p.providerName && p.providerName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async findById(id: string): Promise<Pole | null> {
    const pole = MOCK_POLES.find((p) => p.id === id);
    return pole || null;
  }

  async getExistingIds(): Promise<string[]> {
    return MOCK_POLES.map((p) => p.id);
  }

  async create(input: CreatePoleInput): Promise<Pole> {
    const now = new Date().toISOString();
    const newPole: Pole = {
      id: generatePoleId(),
      ...input,
      surveyDate: input.surveyDate || now.split('T')[0],
      locationMethod: input.locationMethod || 'MANUAL_MAP_PIN',
      validationStatus: input.validationStatus || 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    MOCK_POLES.unshift(newPole);
    return newPole;
  }

  async update(id: string, input: UpdatePoleInput): Promise<Pole> {
    const index = MOCK_POLES.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Pole with ID ${id} not found`);
    }

    const existing = MOCK_POLES[index];
    const updated: Pole = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    MOCK_POLES[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = MOCK_POLES.length;
    MOCK_POLES = MOCK_POLES.filter((p) => p.id !== id);
    return MOCK_POLES.length < initialLen;
  }

  async count(options?: PoleFilterOptions): Promise<number> {
    const list = await this.findAll(options);
    return list.length;
  }
}
