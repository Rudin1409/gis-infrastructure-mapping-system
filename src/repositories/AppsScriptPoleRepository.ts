import { appsScriptFetch as fetch } from '@/lib/google/appsScriptClient';
import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import {
  Pole,
  CreatePoleInput,
  UpdatePoleInput,
  PoleCondition,
  PoleType,
  SisiJalan,
  OwnershipStatus,
} from '@/types/pole';
import { generatePoleId } from '@/lib/utils/idGenerator';
import { APPS_SCRIPT_URL } from '@/lib/google/appsScriptClient';

function parseNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

function parseOptionalNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const str = String(val).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function parseBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toUpperCase();
  return str === 'YA' || str === 'TRUE' || str === '1' || str === 'YES';
}

function parseCondition(val: any): PoleCondition {
  const str = String(val || '').toUpperCase();
  if (str.includes('RUSAK') || str.includes('DAMAGED')) return 'DAMAGED';
  if (
    str.includes('SERVIS') ||
    str.includes('MIRING') ||
    str.includes('NEEDS_REPAIR') ||
    str.includes('CEK')
  )
    return 'NEEDS_REPAIR';
  return 'GOOD';
}

function parsePoleType(val: any): PoleType {
  const str = String(val || '').toUpperCase();
  if (str.includes('BESI') || str.includes('STEEL')) return 'BESI';
  if (str.includes('KAYU') || str.includes('WOOD')) return 'KAYU';
  if (str.includes('LAIN')) return 'LAINNYA';
  return 'BETON';
}

export class AppsScriptPoleRepository implements IPoleRepository {
  private url: string;

  constructor() {
    this.url = APPS_SCRIPT_URL;
  }

  async findAll(filters?: PoleFilterOptions): Promise<Pole[]> {
    try {
      const res = await fetch(`${this.url}?action=getPoles`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch from Apps Script: ${res.statusText}`);
      }

      const json = await res.json();
      let poles: Pole[] = (json.data || []).map((row: any) => ({
        id: String(row.id || row.ID_Tiang || ''),
        poleCode:
          row.poleCode || row.Kode_Fisik_Tiang
            ? String(row.poleCode || row.Kode_Fisik_Tiang)
            : undefined,
        poleLatitude: parseNumber(row.poleLatitude ?? row.Latitude_GIS),
        poleLongitude: parseNumber(row.poleLongitude ?? row.Longitude_GIS),
        deviceLatitude: parseOptionalNumber(row.deviceLatitude ?? row.Latitude_GPS_Device),
        deviceLongitude: parseOptionalNumber(row.deviceLongitude ?? row.Longitude_GPS_Device),
        gpsAccuracy: parseOptionalNumber(row.gpsAccuracy ?? row.Akurasi_GPS_Meter),
        distanceFromDevice: parseOptionalNumber(row.distanceFromDevice ?? row.Jarak_Deviasi_Meter),
        locationMethod: row.locationMethod || row.Metode_Penentuan_Lokasi || 'MANUAL_MAP_PIN',
        providerId: String(row.providerId || row.ID_Provider || 'UNKNOWN'),
        providerName:
          row.providerName || row.Nama_Provider_Operator
            ? String(row.providerName || row.Nama_Provider_Operator)
            : undefined,
        poleType: parsePoleType(row.poleType || row.Jenis_Tiang),
        condition: parseCondition(row.condition || row.Kondisi_Tiang),
        road: String(row.road || row.Nama_Jalan_Lokasi || ''),
        kelurahan: String(row.kelurahan || row.Kelurahan || ''),
        kecamatan: String(row.kecamatan || row.Kecamatan || ''),
        kota: String(row.kota || row.Kota_Kabupaten || 'Kota Lubuklinggau'),
        patokanLokasi:
          row.patokanLokasi || row.Patokan_Lokasi
            ? String(row.patokanLokasi || row.Patokan_Lokasi)
            : undefined,
        sisiJalan: (row.sisiJalan || row.Sisi_Jalan || 'KIRI') as SisiJalan,
        height: row.height || row.Tinggi_Tiang ? String(row.height || row.Tinggi_Tiang) : '7m',
        ownershipStatus: (row.ownershipStatus ||
          row.Status_Kepemilikan ||
          'SENDIRI') as OwnershipStatus,
        isTilted: parseBoolean(row.isTilted ?? row.Bahaya_Tiang_Miring),
        isMessyCable: parseBoolean(row.isMessyCable ?? row.Bahaya_Kabel_Semrawut),
        isLowCable: parseBoolean(row.isLowCable ?? row.Bahaya_Kabel_Rendah),
        isCorroded: parseBoolean(row.isCorroded ?? row.Bahaya_Karat_Retak),
        isObstructing: parseBoolean(row.isObstructing ?? row.Mengganggu_Jalan_Trotoar),
        isHazardous: parseBoolean(row.isHazardous ?? row.Potensi_Bahaya_Lain),
        description:
          row.description || row.Catatan_Keterangan_Lapangan
            ? String(row.description || row.Catatan_Keterangan_Lapangan)
            : undefined,
        photoFileId:
          row.photoFileId || row.ID_File_Google_Drive
            ? String(row.photoFileId || row.ID_File_Google_Drive)
            : undefined,
        photoUrl:
          row.photoUrl || row.Link_Foto_Google_Drive
            ? String(row.photoUrl || row.Link_Foto_Google_Drive)
            : undefined,
        surveyorId:
          row.surveyorId || row.ID_Surveyor
            ? String(row.surveyorId || row.ID_Surveyor)
            : 'USR-KOMINFO-ADMIN',
        surveyorName:
          row.surveyorName && !String(row.surveyorName).includes('Surveyor 1')
            ? String(row.surveyorName)
            : 'Admin DISKOMINFO (Admin Teknis & Jaringan)',
        surveyDate: String(
          row.surveyDate || row.Tanggal_Survey || new Date().toISOString().split('T')[0]
        ),
        surveyTime:
          row.surveyTime || row.Waktu_Survey
            ? String(row.surveyTime || row.Waktu_Survey)
            : undefined,
        validationStatus: row.validationStatus || row.Status_Validasi || 'SUBMITTED',
        validationNote:
          row.validationNote || row.Catatan_Validasi
            ? String(row.validationNote || row.Catatan_Validasi)
            : undefined,
        createdAt: String(row.createdAt || row.Waktu_Dibuat || new Date().toISOString()),
        updatedAt: String(row.updatedAt || row.Waktu_Diperbarui || new Date().toISOString()),
        infrastructureCategory:
          row.infrastructureCategory || row.Kategori_Infrastruktur || 'FO_WIFI',
        pjuLampType: row.pjuLampType || row.Tipe_Lampu_PJU || undefined,
        pjuLampPower: row.pjuLampPower || row.Daya_Lampu_Watt || undefined,
        pjuLampCondition: row.pjuLampCondition || row.Kondisi_Lampu_PJU || undefined,
        hasKwhMeter: parseBoolean(row.hasKwhMeter ?? row.Ada_Kwh_Meter),
        cableInstallationType: row.cableInstallationType || row.Tipe_Pemasangan_Kabel || undefined,
      }));

      // Filter based on options
      if (filters) {
        if (filters.providerId && filters.providerId !== 'ALL') {
          poles = poles.filter((p) => p.providerId === filters.providerId);
        }
        if (filters.condition && filters.condition !== 'ALL') {
          poles = poles.filter((p) => p.condition === filters.condition);
        }
        if (filters.kecamatan && filters.kecamatan !== 'ALL') {
          poles = poles.filter((p) => p.kecamatan === filters.kecamatan);
        }
        if (filters.kelurahan && filters.kelurahan !== 'ALL') {
          poles = poles.filter((p) => p.kelurahan === filters.kelurahan);
        }
        if (filters.poleType && filters.poleType !== 'ALL') {
          poles = poles.filter((p) => p.poleType === filters.poleType);
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          poles = poles.filter(
            (p) =>
              p.id.toLowerCase().includes(q) ||
              p.road.toLowerCase().includes(q) ||
              (p.description && p.description.toLowerCase().includes(q)) ||
              p.kelurahan.toLowerCase().includes(q) ||
              (p.providerName && p.providerName.toLowerCase().includes(q))
          );
        }
      }

      return poles;
    } catch (e) {
      console.error('Error in AppsScriptPoleRepository.findAll:', e);
      return [];
    }
  }

  async findById(id: string): Promise<Pole | null> {
    const list = await this.findAll();
    return list.find((p) => p.id === id) || null;
  }

  async getExistingIds(): Promise<string[]> {
    const list = await this.findAll();
    return list.map((p) => p.id);
  }

  async create(input: CreatePoleInput): Promise<Pole> {
    const existingIds = await this.getExistingIds();
    const newId = generatePoleId(existingIds);
    const now = new Date().toISOString();
    const newPole: Pole = {
      ...input,
      id: newId,
      surveyDate: input.surveyDate || now.split('T')[0],
      locationMethod: input.locationMethod || 'MANUAL_MAP_PIN',
      validationStatus: input.validationStatus || 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'savePole',
        data: newPole,
      }),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(`Failed to save pole to Google Sheet: ${json.error || 'Unknown error'}`);
    }

    return newPole;
  }

  async update(id: string, input: UpdatePoleInput): Promise<Pole> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Pole with ID ${id} not found`);
    }

    const updated: Pole = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePole',
          data: updated,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.warn('Update pole Google Sheet warning:', json.error);
      }
    } catch (e) {
      console.error('Error syncing updatePole to Google Apps Script:', e);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deletePole',
          id: id,
        }),
      });

      const json = await res.json();
      return !!json.success;
    } catch (e) {
      console.error('Error syncing deletePole to Google Apps Script:', e);
      return true;
    }
  }
}
