import {
  Subdistrict,
  DistrictGroup,
  CreateSubdistrictInput,
  UpdateSubdistrictInput,
} from '@/types/district';

export interface IDistrictRepository {
  /**
   * Get all grouped kecamatan with their list of subdistricts.
   */
  getGroupedDistricts(): Promise<DistrictGroup[]>;

  /**
   * Get flat list of all subdistricts.
   */
  findAll(): Promise<Subdistrict[]>;

  /**
   * Find subdistrict by ID.
   */
  findById(id: string): Promise<Subdistrict | null>;

  /**
   * Create a new subdistrict.
   */
  create(input: CreateSubdistrictInput): Promise<Subdistrict>;

  /**
   * Update an existing subdistrict.
   * If cascadeUpdatePoles is true and oldName is provided, also updates poles in DB.
   */
  update(input: UpdateSubdistrictInput): Promise<Subdistrict>;

  /**
   * Delete a subdistrict by ID.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Reset all subdistricts to the official default 72 kelurahan.
   */
  resetToDefaults(): Promise<Subdistrict[]>;
}
