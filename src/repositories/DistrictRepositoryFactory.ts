import { IDistrictRepository } from './interfaces/IDistrictRepository';
import { SupabaseDistrictRepository } from './SupabaseDistrictRepository';

let districtRepoInstance: IDistrictRepository | null = null;

export function getDistrictRepository(): IDistrictRepository {
  if (!districtRepoInstance) {
    districtRepoInstance = new SupabaseDistrictRepository();
  }
  return districtRepoInstance;
}
