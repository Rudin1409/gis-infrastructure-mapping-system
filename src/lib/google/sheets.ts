import { google, sheets_v4 } from 'googleapis';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { NetworkSegment } from '@/types/segment';

export const POLE_SHEET_NAME = 'DATA_TIANG';
export const PROVIDER_SHEET_NAME = 'DATA_PROVIDER';
export const SEGMENT_SHEET_NAME = 'JALUR_KABEL_FO';
export const USER_SHEET_NAME = 'DATA_SURVEYOR';

export const POLE_HEADERS = [
  'ID_Tiang',
  'Kode_Fisik_Tiang',
  'Latitude_GIS',
  'Longitude_GIS',
  'Latitude_GPS_Device',
  'Longitude_GPS_Device',
  'Akurasi_GPS_Meter',
  'Jarak_Deviasi_Meter',
  'Metode_Penentuan_Lokasi',
  'ID_Provider',
  'Nama_Provider_Operator',
  'Jenis_Tiang',
  'Kondisi_Tiang',
  'Nama_Jalan_Lokasi',
  'Kelurahan',
  'Kecamatan',
  'Kota_Kabupaten',
  'Patokan_Lokasi',
  'Sisi_Jalan',
  'Tinggi_Tiang',
  'Status_Kepemilikan',
  'Bahaya_Tiang_Miring',
  'Bahaya_Kabel_Semrawut',
  'Bahaya_Kabel_Rendah',
  'Bahaya_Karat_Retak',
  'Mengganggu_Jalan_Trotoar',
  'Potensi_Bahaya_Lain',
  'Catatan_Keterangan_Lapangan',
  'ID_File_Google_Drive',
  'Link_Foto_Google_Drive',
  'ID_Surveyor',
  'Nama_Petugas_Surveyor',
  'Tanggal_Survey',
  'Waktu_Survey',
  'Status_Validasi',
  'Catatan_Validasi',
  'Waktu_Dibuat',
  'Waktu_Diperbarui',
  'Kategori_Infrastruktur',
  'Tipe_Lampu_PJU',
  'Daya_Lampu_Watt',
  'Kondisi_Lampu_PJU',
  'Ada_Kwh_Meter',
  'Tipe_Pemasangan_Kabel',
  'Kabel_Jaringan_Menumpang',
];

export const PROVIDER_HEADERS = [
  'ID_Provider',
  'Nama_Provider',
  'Kode_Singkatan',
  'Kode_Warna_Hex',
  'Status_Aktif',
];

export const SEGMENT_HEADERS = [
  'ID_Segmen',
  'Kode_Segmen_Kabel',
  'ID_Tiang_Pangkal',
  'ID_Tiang_Ujung',
  'ID_Provider',
  'Nama_Provider',
  'Jenis_Jaringan',
  'Tipe_Pemasangan',
  'Estimasi_Jarak_Meter',
  'Status_Jalur',
  'Keterangan_Jalur',
  'Waktu_Dibuat',
  'Waktu_Diperbarui',
];

export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

export function getGoogleSheetsClient(): sheets_v4.Sheets | null {
  if (!isGoogleConfigured()) return null;

  try {
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error);
    return null;
  }
}

/**
 * Mapping Pole object to Google Sheets row array
 */
export function poleToSheetRow(pole: Pole): (string | number)[] {
  return [
    pole.id || '',
    pole.poleCode || '',
    pole.poleLatitude !== undefined ? pole.poleLatitude : '',
    pole.poleLongitude !== undefined ? pole.poleLongitude : '',
    pole.deviceLatitude !== undefined ? pole.deviceLatitude : '',
    pole.deviceLongitude !== undefined ? pole.deviceLongitude : '',
    pole.gpsAccuracy !== undefined ? pole.gpsAccuracy : '',
    pole.distanceFromDevice !== undefined ? pole.distanceFromDevice : '',
    pole.locationMethod || 'MANUAL_MAP_PIN',
    pole.providerId || 'UNKNOWN',
    pole.providerName || '',
    pole.poleType || 'BETON',
    pole.condition || 'GOOD',
    pole.road || '',
    pole.kelurahan || '',
    pole.kecamatan || '',
    pole.kota || 'Kota Lubuklinggau',
    pole.patokanLokasi || '',
    pole.sisiJalan || 'TIDAK_DITENTUKAN',
    pole.height || '5m',
    pole.ownershipStatus || 'SENDIRI',
    pole.isTilted ? 'YA' : 'TIDAK',
    pole.isMessyCable ? 'YA' : 'TIDAK',
    pole.isLowCable ? 'YA' : 'TIDAK',
    pole.isCorroded ? 'YA' : 'TIDAK',
    pole.isObstructing ? 'YA' : 'TIDAK',
    pole.isHazardous ? 'YA' : 'TIDAK',
    pole.description || '',
    pole.photoFileId || '',
    pole.photoUrl || '',
    pole.surveyorId || 'USR-KOMINFO-ADMIN',
    pole.surveyorName || 'Admin DISKOMINFO (Admin Teknis & Jaringan)',
    pole.surveyDate || '',
    pole.surveyTime || '',
    pole.validationStatus || 'SUBMITTED',
    pole.validationNote || '',
    pole.createdAt || new Date().toISOString(),
    pole.updatedAt || new Date().toISOString(),
    pole.infrastructureCategory || 'FO_WIFI',
    pole.pjuLampType || '',
    pole.pjuLampPower || '',
    pole.pjuLampCondition || '',
    pole.hasKwhMeter ? 'YA' : 'TIDAK',
    pole.cableInstallationType || 'UDARA',
    pole.hasNetworkCable ? 'YA' : 'TIDAK',
  ];
}

/**
 * Mapping Google Sheets row array to Pole object
 */
export function sheetRowToPole(row: any[]): Pole | null {
  if (!row || row.length === 0 || !row[0]) return null;

  return {
    id: String(row[0] || ''),
    poleCode: row[1] ? String(row[1]) : undefined,
    poleLatitude: parseFloat(row[2]) || 0,
    poleLongitude: parseFloat(row[3]) || 0,
    deviceLatitude: row[4] ? parseFloat(row[4]) : undefined,
    deviceLongitude: row[5] ? parseFloat(row[5]) : undefined,
    gpsAccuracy: row[6] ? parseFloat(row[6]) : undefined,
    distanceFromDevice: row[7] ? parseFloat(row[7]) : undefined,
    locationMethod: row[8] || 'MANUAL_MAP_PIN',
    providerId: String(row[9] || 'UNKNOWN'),
    providerName: row[10] ? String(row[10]) : undefined,
    poleType: row[11] || 'BETON',
    condition: row[12] || 'GOOD',
    road: String(row[13] || ''),
    kelurahan: String(row[14] || ''),
    kecamatan: String(row[15] || ''),
    kota: row[16] ? String(row[16]) : 'Kota Lubuklinggau',
    patokanLokasi: row[17] ? String(row[17]) : undefined,
    sisiJalan: row[18] || 'TIDAK_DITENTUKAN',
    height: row[19] ? String(row[19]) : '5m',
    ownershipStatus: row[20] || 'SENDIRI',
    isTilted: row[21] === 'YA' || row[21] === 'TRUE' || row[21] === true,
    isMessyCable: row[22] === 'YA' || row[22] === 'TRUE' || row[22] === true,
    isLowCable: row[23] === 'YA' || row[23] === 'TRUE' || row[23] === true,
    isCorroded: row[24] === 'YA' || row[24] === 'TRUE' || row[24] === true,
    isObstructing: row[25] === 'YA' || row[25] === 'TRUE' || row[25] === true,
    isHazardous: row[26] === 'YA' || row[26] === 'TRUE' || row[26] === true,
    description: row[27] ? String(row[27]) : undefined,
    photoFileId: row[28] ? String(row[28]) : undefined,
    photoUrl: row[29] ? String(row[29]) : undefined,
    surveyorId: row[30] ? String(row[30]) : 'USR-KOMINFO-ADMIN',
    surveyorName: (row[31] && !String(row[31]).includes('Surveyor 1'))
      ? String(row[31])
      : 'Admin DISKOMINFO (Admin Teknis & Jaringan)',
    surveyDate: String(row[32] || ''),
    surveyTime: row[33] ? String(row[33]) : undefined,
    validationStatus: row[34] || 'SUBMITTED',
    validationNote: row[35] ? String(row[35]) : undefined,
    createdAt: String(row[36] || new Date().toISOString()),
    updatedAt: String(row[37] || new Date().toISOString()),
    infrastructureCategory: row[38] || 'FO_WIFI',
    pjuLampType: row[39] || undefined,
    pjuLampPower: row[40] || undefined,
    pjuLampCondition: row[41] || undefined,
    hasKwhMeter: row[42] === 'YA' || row[42] === 'TRUE' || row[42] === true,
    cableInstallationType: row[43] || 'UDARA',
    hasNetworkCable: row[44] === 'YA' || row[44] === 'TRUE' || row[44] === true,
  };
}

export function providerToSheetRow(provider: Provider): string[] {
  return [
    provider.id,
    provider.name,
    provider.code,
    provider.colorHex || '#3b82f6',
    provider.status,
  ];
}

export function sheetRowToProvider(row: any[]): Provider | null {
  if (!row || row.length === 0 || !row[0]) return null;

  return {
    id: String(row[0]),
    name: String(row[1] || ''),
    code: String(row[2] || ''),
    colorHex: String(row[3] || '#3b82f6'),
    status: row[4] || 'ACTIVE',
  };
}

export function segmentToSheetRow(segment: NetworkSegment): string[] {
  return [
    segment.id,
    segment.segmentCode || '',
    segment.fromNodeId,
    segment.toNodeId,
    segment.providerId,
    segment.providerName || '',
    segment.networkType || 'FIBER_OPTIC',
    segment.installationType || 'AERIAL',
    String(segment.estimatedDistance || 0),
    segment.status || 'ACTIVE',
    segment.description || '',
    segment.createdAt || new Date().toISOString(),
    segment.updatedAt || new Date().toISOString(),
  ];
}

export function sheetRowToSegment(row: any[]): NetworkSegment | null {
  if (!row || row.length === 0 || !row[0]) return null;

  return {
    id: String(row[0]),
    segmentCode: row[1] ? String(row[1]) : undefined,
    fromNodeId: String(row[2] || ''),
    toNodeId: String(row[3] || ''),
    providerId: String(row[4] || ''),
    providerName: row[5] ? String(row[5]) : undefined,
    networkType: row[6] || 'FIBER_OPTIC',
    installationType: row[7] || 'AERIAL',
    estimatedDistance: parseFloat(row[8]) || 0,
    status: row[9] || 'ACTIVE',
    description: row[10] ? String(row[10]) : undefined,
    createdAt: String(row[11] || new Date().toISOString()),
    updatedAt: String(row[12] || new Date().toISOString()),
  };
}
