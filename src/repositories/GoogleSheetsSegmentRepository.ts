import {
  getGoogleSheetsClient,
  isGoogleConfigured,
  SEGMENT_SHEET_NAME,
  SEGMENT_HEADERS,
  segmentToSheetRow,
  sheetRowToSegment,
} from '@/lib/google/sheets';
import { ISegmentRepository } from './interfaces/ISegmentRepository';
import { NetworkSegment, CreateSegmentInput } from '@/types/segment';
import { generateSegmentId } from '@/lib/utils/idGenerator';

let MOCK_SEGMENTS: NetworkSegment[] = [
  {
    id: 'SEG-0001',
    segmentCode: 'FO-MJP-01',
    fromNodeId: 'LL-0001',
    toNodeId: 'LL-0002',
    providerId: 'PRV_TELKOM',
    providerName: 'Telkom Indonesia',
    networkType: 'FIBER_OPTIC',
    installationType: 'AERIAL',
    estimatedDistance: 45.2,
    status: 'ACTIVE',
    description: 'Jalur kabel FO 24 core Jl. Majapahit No. 12 ke No. 28',
    createdAt: '2026-08-25T03:00:00.000Z',
    updatedAt: '2026-08-25T03:00:00.000Z',
  },
  {
    id: 'SEG-0002',
    segmentCode: 'FO-MJP-02',
    fromNodeId: 'LL-0002',
    toNodeId: 'LL-0003',
    providerId: 'PRV_ICONNET',
    providerName: 'Iconnet (PLN Icon+)',
    networkType: 'FIBER_OPTIC',
    installationType: 'AERIAL',
    estimatedDistance: 48.0,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Jl. Majapahit No. 28 ke No. 45 (Tikungan Kenanga I)',
    createdAt: '2026-08-25T03:05:00.000Z',
    updatedAt: '2026-08-25T03:05:00.000Z',
  },
  {
    id: 'SEG-0003',
    segmentCode: 'FO-MJP-03',
    fromNodeId: 'LL-0003',
    toNodeId: 'LL-0004',
    providerId: 'PRV_BIZNET',
    providerName: 'Biznet Networks',
    networkType: 'FIBER_OPTIC',
    installationType: 'AERIAL',
    estimatedDistance: 54.6,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Tikungan Kenanga ke Depan Masjid Al-Ikhlas',
    createdAt: '2026-08-25T03:10:00.000Z',
    updatedAt: '2026-08-25T03:10:00.000Z',
  },
  {
    id: 'SEG-0004',
    segmentCode: 'FO-MJP-04',
    fromNodeId: 'LL-0004',
    toNodeId: 'LL-0005',
    providerId: 'PRV_TELKOM',
    providerName: 'Telkom Indonesia',
    networkType: 'FIBER_OPTIC',
    installationType: 'AERIAL',
    estimatedDistance: 55.0,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Masjid Al-Ikhlas ke Simpang Kenanga II',
    createdAt: '2026-08-25T03:15:00.000Z',
    updatedAt: '2026-08-25T03:15:00.000Z',
  },
  {
    id: 'SEG-0005',
    segmentCode: 'FO-MJP-05',
    fromNodeId: 'LL-0005',
    toNodeId: 'LL-0006',
    providerId: 'PRV_XL',
    providerName: 'XL Axiata',
    networkType: 'FIBER_OPTIC',
    installationType: 'AERIAL',
    estimatedDistance: 53.5,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Simpang Kenanga II ke Lapangan Voli',
    createdAt: '2026-08-25T03:20:00.000Z',
    updatedAt: '2026-08-25T03:20:00.000Z',
  },
  {
    id: 'SEG-0006',
    segmentCode: 'FO-MJP-06',
    fromNodeId: 'LL-0006',
    toNodeId: 'LL-0007',
    providerId: 'PRV_IFORTE',
    providerName: 'iForte',
    networkType: 'FIBER_OPTIC',
    installationType: 'UNDERGROUND',
    estimatedDistance: 57.0,
    status: 'ACTIVE',
    description: 'Jalur kabel ducting bawah tanah Lapangan Voli ke Batas Taba Koring',
    createdAt: '2026-08-25T03:25:00.000Z',
    updatedAt: '2026-08-25T03:25:00.000Z',
  },
];

export class GoogleSheetsSegmentRepository implements ISegmentRepository {
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  async findAll(): Promise<NetworkSegment[]> {
    if (!isGoogleConfigured()) {
      return MOCK_SEGMENTS;
    }

    try {
      const sheets = getGoogleSheetsClient();
      if (!sheets) return MOCK_SEGMENTS;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SEGMENT_SHEET_NAME}!A2:M1000`,
      });

      const rows = response.data.values || [];
      const segments = rows
        .map(sheetRowToSegment)
        .filter((s): s is NetworkSegment => s !== null);

      return segments.length > 0 ? segments : MOCK_SEGMENTS;
    } catch (e) {
      console.warn('Fallback to mock segments note:', e);
      return MOCK_SEGMENTS;
    }
  }

  async findById(id: string): Promise<NetworkSegment | null> {
    const list = await this.findAll();
    return list.find((s) => s.id === id) || null;
  }

  async findByNodeId(nodeId: string): Promise<NetworkSegment[]> {
    const list = await this.findAll();
    return list.filter((s) => s.fromNodeId === nodeId || s.toNodeId === nodeId);
  }

  async create(input: CreateSegmentInput): Promise<NetworkSegment> {
    const now = new Date().toISOString();
    const newSegment: NetworkSegment = {
      id: generateSegmentId(),
      ...input,
      estimatedDistance: input.estimatedDistance ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    MOCK_SEGMENTS.unshift(newSegment);
    return newSegment;
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = MOCK_SEGMENTS.length;
    MOCK_SEGMENTS = MOCK_SEGMENTS.filter((s) => s.id !== id);
    return MOCK_SEGMENTS.length < initialLen;
  }
}

let segmentRepoInstance: ISegmentRepository | null = null;

export function getSegmentRepository(): ISegmentRepository {
  if (!segmentRepoInstance) {
    segmentRepoInstance = new GoogleSheetsSegmentRepository();
  }
  return segmentRepoInstance;
}
