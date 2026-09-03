export interface Subdistrict {
  id: string; // e.g. "KEL-T1-AK" or "KEL-WATURANG"
  name: string; // e.g. "Air Kuti"
  kecamatan: string; // e.g. "Lubuklinggau Timur I"
  code?: string; // e.g. "AK"
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DistrictGroup {
  name: string; // e.g. "Lubuklinggau Timur I"
  code?: string; // e.g. "T1"
  kelurahan: Subdistrict[];
}

export interface CreateSubdistrictInput {
  name: string;
  kecamatan: string;
  code?: string;
}

export interface UpdateSubdistrictInput {
  id: string;
  name: string;
  kecamatan: string;
  code?: string;
  oldName?: string; // Digunakan jika ingin cascade update nama tiang di DB
  cascadeUpdatePoles?: boolean; // Default true: update tiang yang menggunakan nama lama
}
