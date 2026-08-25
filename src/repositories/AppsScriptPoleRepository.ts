import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { generatePoleId } from '@/lib/utils/idGenerator';
import { APPS_SCRIPT_URL } from '@/lib/google/appsScriptClient';

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
        id: String(row.id || ''),
        poleCode: row.poleCode ? String(row.poleCode) : undefined,
        poleLatitude: Number(row.poleLatitude) || 0,
        poleLongitude: Number(row.poleLongitude) || 0,
        deviceLatitude: row.deviceLatitude ? Number(row.deviceLatitude) : undefined,
        deviceLongitude: row.deviceLongitude ? Number(row.deviceLongitude) : undefined,
        gpsAccuracy: row.gpsAccuracy ? Number(row.gpsAccuracy) : undefined,
        distanceFromDevice: row.distanceFromDevice ? Number(row.distanceFromDevice) : undefined,
        locationMethod: row.locationMethod || 'MANUAL_MAP_PIN',
        providerId: String(row.providerId || 'UNKNOWN'),
        providerName: row.providerName ? String(row.providerName) : undefined,
        poleType: row.poleType || 'BESI',
        condition: row.condition || 'GOOD',
        road: String(row.road || ''),
        kelurahan: String(row.kelurahan || ''),
        kecamatan: String(row.kecamatan || ''),
        kota: row.kota ? String(row.kota) : 'Kota Lubuklinggau',
        patokanLokasi: row.patokanLokasi ? String(row.patokanLokasi) : undefined,
        sisiJalan: row.sisiJalan || 'KIRI',
        height: row.height ? String(row.height) : undefined,
        ownershipStatus: row.ownershipStatus || 'SENDIRI',
        isTilted: row.isTilted === 'TRUE' || row.isTilted === true,
        isMessyCable: row.isMessyCable === 'TRUE' || row.isMessyCable === true,
        isLowCable: row.isLowCable === 'TRUE' || row.isLowCable === true,
        isHazardous: row.isHazardous === 'TRUE' || row.isHazardous === true,
        isCorroded: row.isCorroded === 'TRUE' || row.isCorroded === true,
        isObstructing: row.isObstructing === 'TRUE' || row.isObstructing === true,
        description: row.description ? String(row.description) : undefined,
        photoFileId: row.photoFileId ? String(row.photoFileId) : undefined,
        photoUrl: row.photoUrl ? String(row.photoUrl) : undefined,
        surveyorId: row.surveyorId ? String(row.surveyorId) : undefined,
        surveyorName: row.surveyorName ? String(row.surveyorName) : undefined,
        surveyDate: String(row.surveyDate || new Date().toISOString().split('T')[0]),
        surveyTime: row.surveyTime ? String(row.surveyTime) : undefined,
        validationStatus: row.validationStatus || 'SUBMITTED',
        validationNote: row.validationNote ? String(row.validationNote) : undefined,
        createdAt: String(row.createdAt || new Date().toISOString()),
        updatedAt: String(row.updatedAt || new Date().toISOString()),
      }));

      // If sheet is fresh/empty, return empty list or fallback
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
    const now = new Date().toISOString();
    const newPole: Pole = {
      id: generatePoleId(),
      ...input,
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

