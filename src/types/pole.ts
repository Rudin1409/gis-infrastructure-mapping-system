export type PoleCondition = 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED' | 'UNKNOWN';

export type PoleType = 'BETON' | 'BESI' | 'KAYU' | 'LAINNYA' | 'TIDAK_DIKETAHUI';

export type ValidationStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type LocationMethod = 'MANUAL_MAP_PIN' | 'GPS_DEVICE' | 'IMPORT_DATA';

export type SisiJalan = 'KIRI' | 'KANAN' | 'MEDIAN' | 'TIDAK_DITENTUKAN';

export type OwnershipStatus = 'SENDIRI' | 'BERSAMA_PLN' | 'SEWA' | 'TIDAK_DIKETAHUI';

export type InfrastructureCategory =
  | 'FO_WIFI' // Tiang Fiber Optik / Provider Internet / WiFi
  | 'PJU_MANDIRI' // Tiang PJU Mandiri Pemkot Lubuklinggau
  | 'GABUNG_PLN_PJU' // Tiang PLN Gabung Lampu PJU
  | 'PLN_MURNI'; // Tiang PLN Distribusi Listrik

export type CableInstallationType =
  | 'UDARA' // Kabel Udara / Di Atas Tiang (Aerial)
  | 'BAWAH_TANAH' // Kabel Bawah Tanah / Tanam (Underground / Ducting)
  | 'TRANSISI_RISER'; // Transisi Riser Pole (Peralihan Udara ke Bawah Tanah)

export type LampuPjuType =
  | 'LED'
  | 'SON_T' // Kuning Sodium
  | 'SOLAR_CELL' // Tenaga Surya
  | 'MERKURI'
  | 'LAINNYA'
  | 'TIDAK_ADA';

export type LampuPjuCondition =
  | 'MENYALA_NORMAL'
  | 'REDUP'
  | 'MATI_TOTAL'
  | 'PECAH_RUSAK'
  | 'TIDAK_ADA';

export interface Pole {
  id: string; // e.g. "LL-0001" or "LLG-T1-TJ-463"
  poleCode?: string; // Physical tag/code on the pole
  poleLatitude: number; // Final manual map pin latitude
  poleLongitude: number; // Final manual map pin longitude
  deviceLatitude?: number; // Surveyor GPS device latitude
  deviceLongitude?: number; // Surveyor GPS device longitude
  gpsAccuracy?: number; // Device GPS accuracy in meters
  distanceFromDevice?: number; // Spatial distance in meters between pin and device
  locationMethod: LocationMethod;
  providerId: string;
  providerName?: string;
  poleType: PoleType;
  condition: PoleCondition;
  road: string;
  kelurahan: string;
  kecamatan: string;
  kota?: string; // "Kota Lubuklinggau"
  patokanLokasi?: string; // e.g. "Depan Kantor Lurah / Samping Minimarket"
  sisiJalan?: SisiJalan;
  height?: string; // "7m", "9m", "11m", "12m"
  ownershipStatus?: OwnershipStatus;

  // Tipe Pemasangan Jalur Kabel (Udara / Bawah Tanah / Riser)
  cableInstallationType?: CableInstallationType;

  // Kategori & Fungsi Infrastruktur Tiang (PJU / FO / PLN)
  infrastructureCategory?: InfrastructureCategory;
  pjuLampType?: LampuPjuType;
  pjuLampPower?: string; // "40W", "60W", "90W", "120W", "150W", "250W"
  pjuLampCondition?: LampuPjuCondition;
  hasKwhMeter?: boolean; // Ada KWh Meter atau Non-Meter (Abonemen)
  hasNetworkCable?: boolean; // Apakah ada kabel jaringan/FO yang menumpang di tiang PJU
  
  // Quick Safety & Condition Hazards (Yes/No flags)
  isTilted?: boolean; // Tiang Miring
  isMessyCable?: boolean; // Kabel Semrawut
  isLowCable?: boolean; // Kabel Terlalu Rendah
  isHazardous?: boolean; // Potensi Bahaya
  isCorroded?: boolean; // Berkarat / Retak
  isObstructing?: boolean; // Mengganggu Trotoar / Jalan

  description?: string;
  photoFileId?: string; // Google Drive file ID
  photoUrl?: string; // Preview or view URL
  additionalPhotoFileId?: string;
  additionalPhotoUrl?: string;

  surveyorId?: string;
  surveyorName?: string;
  surveyDate: string; // YYYY-MM-DD
  surveyTime?: string; // HH:mm:ss
  validationStatus: ValidationStatus;
  validationNote?: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface CreatePoleInput {
  poleCode?: string;
  poleLatitude: number;
  poleLongitude: number;
  deviceLatitude?: number;
  deviceLongitude?: number;
  gpsAccuracy?: number;
  distanceFromDevice?: number;
  locationMethod?: LocationMethod;
  providerId: string;
  providerName?: string;
  poleType: PoleType;
  condition: PoleCondition;
  road: string;
  kelurahan: string;
  kecamatan: string;
  kota?: string;
  patokanLokasi?: string;
  sisiJalan?: SisiJalan;
  height?: string;
  ownershipStatus?: OwnershipStatus;
  cableInstallationType?: CableInstallationType;

  // PJU / FO / PLN
  infrastructureCategory?: InfrastructureCategory;
  pjuLampType?: LampuPjuType;
  pjuLampPower?: string;
  pjuLampCondition?: LampuPjuCondition;
  hasKwhMeter?: boolean;
  hasNetworkCable?: boolean;

  isTilted?: boolean;
  isMessyCable?: boolean;
  isLowCable?: boolean;
  isHazardous?: boolean;
  isCorroded?: boolean;
  isObstructing?: boolean;
  description?: string;
  photoFileId?: string;
  photoUrl?: string;
  additionalPhotoFileId?: string;
  additionalPhotoUrl?: string;
  surveyorId?: string;
  surveyorName?: string;
  surveyDate?: string;
  surveyTime?: string;
  validationStatus?: ValidationStatus;
}

export interface UpdatePoleInput extends Partial<CreatePoleInput> {
  id: string;
}
