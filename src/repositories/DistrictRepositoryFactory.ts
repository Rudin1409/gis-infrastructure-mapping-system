import { IDistrictRepository } from './interfaces/IDistrictRepository';
import { SupabaseDistrictRepository } from './SupabaseDistrictRepository';

let districtRepoInstance: IDistrictRepository | null = null;

export function getDistrictRepository(): IDistrictRepository {
  // Nama kelas historis; implementasinya juga mendukung PostgreSQL langsung.
  if (!districtRepoInstance) {
    districtRepoInstance = new SupabaseDistrictRepository();
  }
  return districtRepoInstance;
}
