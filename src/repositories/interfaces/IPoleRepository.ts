import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';

export interface PoleFilterOptions {
  providerId?: string;
  condition?: string;
  kecamatan?: string;
  kelurahan?: string;
  poleType?: string;
  search?: string;
}

export interface IPoleRepository {
  findAll(filters?: PoleFilterOptions): Promise<Pole[]>;
  findById(id: string): Promise<Pole | null>;
  create(data: CreatePoleInput): Promise<Pole>;
  update(id: string, data: UpdatePoleInput): Promise<Pole>;
  delete(id: string): Promise<boolean>;
  getExistingIds(): Promise<string[]>;
}
