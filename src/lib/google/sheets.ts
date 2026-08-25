import { google, sheets_v4 } from 'googleapis';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { NetworkSegment } from '@/types/segment';

export const POLE_SHEET_NAME = 'POLES';
export const PROVIDER_SHEET_NAME = 'PROVIDERS';
export const SEGMENT_SHEET_NAME = 'NETWORK_SEGMENTS';

export const POLE_HEADERS = [
  'id',
  'poleCode',
  'poleLatitude',
  'poleLongitude',
  'deviceLatitude',
  'deviceLongitude',
  'gpsAccuracy',
  'distanceFromDevice',
  'locationMethod',
  'providerId',
  'providerName',
  'poleType',
  'condition',
  'road',
  'kelurahan',
  'kecamatan',
  'kota',
  'patokanLokasi',
  'sisiJalan',
  'height',
  'ownershipStatus',
  'isTilted',
  'isMessyCable',
  'isLowCable',
  'isHazardous',
  'isCorroded',
  'isObstructing',
  'description',
  'photoFileId',
  'photoUrl',
  'surveyorId',
  'surveyorName',
  'surveyDate',
  'surveyTime',
  'validationStatus',
  'validationNote',
  'createdAt',
  'updatedAt',
];

export const PROVIDER_HEADERS = [
  'id',
  'name',
  'code',
  'colorHex',
  'status',
];

export const SEGMENT_HEADERS = [
  'id',
  'segmentCode',
  'fromNodeId',
  'toNodeId',
  'providerId',
  'providerName',
  'networkType',
  'installationType',
  'estimatedDistance',
  'status',
  'description',
  'createdAt',
  'updatedAt',
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
export function poleToSheetRow(pole: Pole): string[] {
  return [
    pole.id || '',
    pole.poleCode || '',
    pole.poleLatitude !== undefined ? String(pole.poleLatitude) : '',
    pole.poleLongitude !== undefined ? String(pole.poleLongitude) : '',
    pole.deviceLatitude !== undefined ? String(pole.deviceLatitude) : '',
    pole.deviceLongitude !== undefined ? String(pole.deviceLongitude) : '',
    pole.gpsAccuracy !== undefined ? String(pole.gpsAccuracy) : '',
    pole.distanceFromDevice !== undefined ? String(pole.distanceFromDevice) : '',
    pole.locationMethod || 'MANUAL_MAP_PIN',
    pole.providerId || '',
    pole.providerName || '',
    pole.poleType || 'BETON',
    pole.condition || 'GOOD',
    pole.road || '',
    pole.kelurahan || '',
    pole.kecamatan || '',
    pole.kota || 'Kota Lubuklinggau',
    pole.patokanLokasi || '',
    pole.sisiJalan || 'TIDAK_DITENTUKAN',
    pole.height || '7m',
    pole.ownershipStatus || 'SENDIRI',
    pole.isTilted ? 'YA' : 'TIDAK',
    pole.isMessyCable ? 'YA' : 'TIDAK',
    pole.isLowCable ? 'YA' : 'TIDAK',
    pole.isHazardous ? 'YA' : 'TIDAK',
    pole.isCorroded ? 'YA' : 'TIDAK',
    pole.isObstructing ? 'YA' : 'TIDAK',
    pole.description || '',
    pole.photoFileId || '',
    pole.photoUrl || '',
    pole.surveyorId || '',
    pole.surveyorName || '',
    pole.surveyDate || '',
    pole.surveyTime || '',
    pole.validationStatus || 'SUBMITTED',
    pole.validationNote || '',
    pole.createdAt || new Date().toISOString(),
    pole.updatedAt || new Date().toISOString(),
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
    locationMethod: (row[8] as any) || 'MANUAL_MAP_PIN',
    providerId: String(row[9] || 'UNKNOWN'),
    providerName: row[10] ? String(row[10]) : undefined,
    poleType: (row[11] as any) || 'BETON',
    condition: (row[12] as any) || 'GOOD',
    road: String(row[13] || ''),
    kelurahan: String(row[14] || ''),
    kecamatan: String(row[15] || ''),
    kota: row[16] ? String(row[16]) : 'Kota Lubuklinggau',
    patokanLokasi: row[17] ? String(row[17]) : undefined,
    sisiJalan: (row[18] as any) || 'TIDAK_DITENTUKAN',
    height: row[19] ? String(row[19]) : '7m',
    ownershipStatus: (row[20] as any) || 'SENDIRI',
    isTilted: row[21] === 'YA',
    isMessyCable: row[22] === 'YA',
    isLowCable: row[23] === 'YA',
    isHazardous: row[24] === 'YA',
    isCorroded: row[25] === 'YA',
    isObstructing: row[26] === 'YA',
    description: row[27] ? String(row[27]) : '',
    photoFileId: row[28] ? String(row[28]) : undefined,
    photoUrl: row[29] ? String(row[29]) : undefined,
    surveyorId: row[30] ? String(row[30]) : undefined,
    surveyorName: row[31] ? String(row[31]) : undefined,
    surveyDate: String(row[32] || new Date().toISOString().split('T')[0]),
    surveyTime: row[33] ? String(row[33]) : undefined,
    validationStatus: (row[34] as any) || 'SUBMITTED',
    validationNote: row[35] ? String(row[35]) : undefined,
    createdAt: String(row[36] || new Date().toISOString()),
    updatedAt: String(row[37] || new Date().toISOString()),
  };
}

/**
 * Provider object to row mapping
 */
export function providerToSheetRow(p: Provider): string[] {
  return [p.id, p.name, p.code, p.colorHex || '', p.status];
}

export function sheetRowToProvider(row: any[]): Provider | null {
  if (!row || !row[0]) return null;
  return {
    id: String(row[0]),
    name: String(row[1] || ''),
    code: String(row[2] || ''),
    colorHex: row[3] ? String(row[3]) : undefined,
    status: (row[4] as any) || 'ACTIVE',
  };
}

/**
 * Network segment to row mapping
 */
export function segmentToSheetRow(seg: NetworkSegment): string[] {
  return [
    seg.id,
    seg.segmentCode || '',
    seg.fromNodeId,
    seg.toNodeId,
    seg.providerId,
    seg.providerName || '',
    seg.networkType,
    seg.installationType,
    String(seg.estimatedDistance),
    seg.status,
    seg.description || '',
    seg.createdAt,
    seg.updatedAt,
  ];
}

export function sheetRowToSegment(row: any[]): NetworkSegment | null {
  if (!row || !row[0]) return null;
  return {
    id: String(row[0]),
    segmentCode: row[1] ? String(row[1]) : undefined,
    fromNodeId: String(row[2]),
    toNodeId: String(row[3]),
    providerId: String(row[4]),
    providerName: row[5] ? String(row[5]) : undefined,
    networkType: (row[6] as any) || 'FIBER_OPTIC',
    installationType: (row[7] as any) || 'AERIAL',
    estimatedDistance: parseFloat(row[8]) || 0,
    status: (row[9] as any) || 'ACTIVE',
    description: row[10] ? String(row[10]) : undefined,
    createdAt: String(row[11] || new Date().toISOString()),
    updatedAt: String(row[12] || new Date().toISOString()),
  };
}
