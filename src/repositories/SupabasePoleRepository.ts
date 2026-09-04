import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { supabase } from '@/lib/supabase';
import { resolveProviderInfo } from '@/config/providers';
import { buildInsertSql, buildUpdateSql, dbQuery, isPostgresConfigured } from '@/lib/postgres';
import { isVercelEnvironment, VERCEL_DATA_LOCK_CUTOFF } from '@/lib/ai/aiConfig';
import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured } from '@/lib/google/appsScriptClient';
import { GoogleSheetsPoleRepository } from './GoogleSheetsPoleRepository';
import { AppsScriptPoleRepository } from './AppsScriptPoleRepository';

function mapDbToPole(row: any): Pole {
  const resolved = resolveProviderInfo({
    providerId: row.provider_id,
    providerName: row.provider_name,
    infrastructureCategory: row.infrastructure_category,
  });

  return {
    id: row.id,
    poleCode: row.pole_code || undefined,
    poleLatitude: parseFloat(row.pole_latitude),
    poleLongitude: parseFloat(row.pole_longitude),
    deviceLatitude: row.device_latitude ? parseFloat(row.device_latitude) : undefined,
    deviceLongitude: row.device_longitude ? parseFloat(row.device_longitude) : undefined,
    gpsAccuracy: row.gps_accuracy ? parseFloat(row.gps_accuracy) : undefined,
    distanceFromDevice: row.distance_from_device ? parseFloat(row.distance_from_device) : undefined,
    locationMethod: row.location_method || 'GPS_DEVICE',
    providerId: resolved.providerId,
    providerName: resolved.providerName,
    poleType: row.pole_type || 'BETON',
    condition: row.condition || 'GOOD',
    road: row.road || '',
    kelurahan: row.kelurahan || '',
    kecamatan: row.kecamatan || '',
    kota: row.kota || 'Kota Lubuklinggau',
    patokanLokasi: row.patokan_lokasi || undefined,
    sisiJalan: row.sisi_jalan || 'KIRI',
    height: row.height || '7m',
    ownershipStatus: row.ownership_status || 'SENDIRI',
    cableInstallationType: row.cable_installation_type || 'UDARA',
    infrastructureCategory: row.infrastructure_category || 'FO_WIFI',
    pjuLampType: row.pju_lamp_type || 'TIDAK_ADA',
    pjuLampPower: row.pju_lamp_power || undefined,
    pjuLampCondition: row.pju_lamp_condition || 'TIDAK_ADA',
    hasKwhMeter: Boolean(row.has_kwh_meter),
    hasNetworkCable: Boolean(row.has_network_cable),
    isTilted: Boolean(row.is_tilted),
    isMessyCable: Boolean(row.is_messy_cable),
    isLowCable: Boolean(row.is_low_cable),
    isHazardous: Boolean(row.is_hazardous),
    isCorroded: Boolean(row.is_corroded),
    isObstructing: Boolean(row.is_obstructing),
    description: row.description || undefined,
    photoFileId: row.photo_file_id || undefined,
    photoUrl: row.photo_url || undefined,
    additionalPhotoFileId: row.additional_photo_file_id || undefined,
    additionalPhotoUrl: row.additional_photo_url || undefined,
    surveyorId: row.surveyor_id || undefined,
    surveyorName: row.surveyor_name || undefined,
    surveyDate: row.survey_date || new Date().toISOString().split('T')[0],
    surveyTime: row.survey_time || undefined,
    validationStatus: row.validation_status || 'SUBMITTED',
    validationNote: row.validation_note || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapPoleToDb(pole: Partial<Pole>): Record<string, any> {
  const db: Record<string, any> = {};
  if (pole.id !== undefined) db.id = pole.id;
  if (pole.poleCode !== undefined) db.pole_code = pole.poleCode;
  if (pole.poleLatitude !== undefined) db.pole_latitude = pole.poleLatitude;
  if (pole.poleLongitude !== undefined) db.pole_longitude = pole.poleLongitude;
  if (pole.deviceLatitude !== undefined) db.device_latitude = pole.deviceLatitude;
  if (pole.deviceLongitude !== undefined) db.device_longitude = pole.deviceLongitude;
  if (pole.gpsAccuracy !== undefined) db.gps_accuracy = pole.gpsAccuracy;
  if (pole.distanceFromDevice !== undefined) db.distance_from_device = pole.distanceFromDevice;
  if (pole.locationMethod !== undefined) db.location_method = pole.locationMethod;
  if (pole.providerId !== undefined) db.provider_id = pole.providerId;
  if (pole.providerName !== undefined) db.provider_name = pole.providerName;
  if (pole.poleType !== undefined) db.pole_type = pole.poleType;
  if (pole.condition !== undefined) db.condition = pole.condition;
  if (pole.road !== undefined) db.road = pole.road;
  if (pole.kelurahan !== undefined) db.kelurahan = pole.kelurahan;
  if (pole.kecamatan !== undefined) db.kecamatan = pole.kecamatan;
  if (pole.kota !== undefined) db.kota = pole.kota;
  if (pole.patokanLokasi !== undefined) db.patokan_lokasi = pole.patokanLokasi;
  if (pole.sisiJalan !== undefined) db.sisi_jalan = pole.sisiJalan;
  if (pole.height !== undefined) db.height = pole.height;
  if (pole.ownershipStatus !== undefined) db.ownership_status = pole.ownershipStatus;
  if (pole.cableInstallationType !== undefined) db.cable_installation_type = pole.cableInstallationType;
  if (pole.infrastructureCategory !== undefined) db.infrastructure_category = pole.infrastructureCategory;
  if (pole.pjuLampType !== undefined) db.pju_lamp_type = pole.pjuLampType;
  if (pole.pjuLampPower !== undefined) db.pju_lamp_power = pole.pjuLampPower;
  if (pole.pjuLampCondition !== undefined) db.pju_lamp_condition = pole.pjuLampCondition;
  if (pole.hasKwhMeter !== undefined) db.has_kwh_meter = pole.hasKwhMeter;
  if (pole.hasNetworkCable !== undefined) db.has_network_cable = pole.hasNetworkCable;
  if (pole.isTilted !== undefined) db.is_tilted = pole.isTilted;
  if (pole.isMessyCable !== undefined) db.is_messy_cable = pole.isMessyCable;
  if (pole.isLowCable !== undefined) db.is_low_cable = pole.isLowCable;
  if (pole.isHazardous !== undefined) db.is_hazardous = pole.isHazardous;
  if (pole.isCorroded !== undefined) db.is_corroded = pole.isCorroded;
  if (pole.isObstructing !== undefined) db.is_obstructing = pole.isObstructing;
  if (pole.description !== undefined) db.description = pole.description;
  if (pole.photoFileId !== undefined) db.photo_file_id = pole.photoFileId;
  if (pole.photoUrl !== undefined) db.photo_url = pole.photoUrl;
  if (pole.additionalPhotoFileId !== undefined) db.additional_photo_file_id = pole.additionalPhotoFileId;
  if (pole.additionalPhotoUrl !== undefined) db.additional_photo_url = pole.additionalPhotoUrl;
  if (pole.surveyorId !== undefined) db.surveyor_id = pole.surveyorId;
  if (pole.surveyorName !== undefined) db.surveyor_name = pole.surveyorName;
  if (pole.surveyDate !== undefined) db.survey_date = pole.surveyDate;
  if (pole.surveyTime !== undefined) db.survey_time = pole.surveyTime;
  if (pole.validationStatus !== undefined) db.validation_status = pole.validationStatus;
  if (pole.validationNote !== undefined) db.validation_note = pole.validationNote;
  if (pole.updatedAt !== undefined) db.updated_at = pole.updatedAt;
  return db;
}

function applyPoleFilters(poles: Pole[], filters?: PoleFilterOptions): Pole[] {
  let result = poles;

  if (filters) {
    if (filters.providerId && filters.providerId !== 'ALL') {
      result = result.filter((p) => p.providerId === filters.providerId);
    }
    if (filters.condition && filters.condition !== 'ALL') {
      result = result.filter((p) => p.condition === filters.condition);
    }
    if (filters.kecamatan && filters.kecamatan !== 'ALL') {
      result = result.filter((p) => p.kecamatan === filters.kecamatan);
    }
    if (filters.kelurahan && filters.kelurahan !== 'ALL') {
      result = result.filter((p) => p.kelurahan === filters.kelurahan);
    }
    if (filters.poleType && filters.poleType !== 'ALL') {
      result = result.filter((p) => p.poleType === filters.poleType);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.poleCode && p.poleCode.toLowerCase().includes(q)) ||
          p.road.toLowerCase().includes(q) ||
          p.kecamatan.toLowerCase().includes(q) ||
          p.kelurahan.toLowerCase().includes(q) ||
          (p.providerName && p.providerName.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
  }

  if (isVercelEnvironment()) {
    result = result.filter((p) => !p.createdAt || p.createdAt <= VERCEL_DATA_LOCK_CUTOFF);
  }

  return result;
}

export class SupabasePoleRepository implements IPoleRepository {
  /**
   * 3-Tier Cascade Fallback Read:
   * Tier 1: PostgreSQL VPS Utama
   * Tier 2: Supabase (Cadangan jika VPS tidak dapat dijangkau)
   * Tier 3: Google Sheets via Service Account / Apps Script (Cadangan darurat)
   */
  async findAll(filters?: PoleFilterOptions): Promise<Pole[]> {
    // --- TIER 1: PostgreSQL VPS Utama ---
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT * FROM poles ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          return applyPoleFilters(rows.map(mapDbToPole), filters);
        }
      } catch (pgError: any) {
        console.warn('[DB Cascade Fallback] VPS PostgreSQL findAll notice:', pgError?.message || pgError);
      }
    }

    // --- TIER 2: Supabase Fallback ---
    try {
      let query = supabase.from('poles').select('*').order('created_at', { ascending: false });
      if (isVercelEnvironment()) {
        query = query.lte('created_at', VERCEL_DATA_LOCK_CUTOFF);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return applyPoleFilters(data.map(mapDbToPole), filters);
      }
      if (error) {
        console.warn('[DB Cascade Fallback] Supabase findAll notice:', error.message);
      }
    } catch (sbError: any) {
      console.warn('[DB Cascade Fallback] Supabase connection notice:', sbError?.message || sbError);
    }

    // --- TIER 3: Google Sheets Fallback ---
    try {
      if (isGoogleConfigured()) {
        const gsheetRepo = new GoogleSheetsPoleRepository();
        const sheetPoles = await gsheetRepo.findAll(filters);
        if (sheetPoles && sheetPoles.length > 0) {
          return sheetPoles;
        }
      }
      if (isAppsScriptConfigured()) {
        const appsScriptRepo = new AppsScriptPoleRepository();
        const asPoles = await appsScriptRepo.findAll(filters);
        if (asPoles && asPoles.length > 0) {
          return asPoles;
        }
      }
    } catch (gsError: any) {
      console.warn('[DB Cascade Fallback] Google Sheets fallback notice:', gsError?.message || gsError);
    }

    return [];
  }

  async findById(id: string): Promise<Pole | null> {
    // --- TIER 1: PostgreSQL VPS Utama ---
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT * FROM poles WHERE id = $1 LIMIT 1', [id]);
        if (rows && rows[0]) return mapDbToPole(rows[0]);
      } catch (pgError: any) {
        console.warn('[DB Cascade Fallback] VPS PostgreSQL findById notice:', pgError?.message || pgError);
      }
    }

    // --- TIER 2: Supabase Fallback ---
    try {
      const { data, error } = await supabase.from('poles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return mapDbToPole(data);
    } catch (sbError: any) {
      console.warn('[DB Cascade Fallback] Supabase findById notice:', sbError?.message || sbError);
    }

    // --- TIER 3: Google Sheets Fallback ---
    try {
      if (isGoogleConfigured()) {
        const gsheetRepo = new GoogleSheetsPoleRepository();
        const pole = await gsheetRepo.findById(id);
        if (pole) return pole;
      }
      if (isAppsScriptConfigured()) {
        const appsScriptRepo = new AppsScriptPoleRepository();
        const pole = await appsScriptRepo.findById(id);
        if (pole) return pole;
      }
    } catch (gsError: any) {
      console.warn('[DB Cascade Fallback] Google Sheets findById notice:', gsError?.message || gsError);
    }

    return null;
  }

  /**
   * Save directly to VPS PostgreSQL as primary database.
   * Mirror to Supabase with best-effort error swallowing (in case Supabase quota is reached).
   */
  async create(input: CreatePoleInput): Promise<Pole> {
    // Idempotency guard for retried offline / flaky network submissions
    if (input.id) {
      try {
        const existing = await this.findById(input.id);
        if (existing) {
          return existing;
        }
      } catch (checkErr) {
        console.warn('[Idempotency Check Notice]:', checkErr);
      }
    }

    const now = new Date().toISOString();
    const id = input.id || `LLG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const newPole: Pole = {
      ...input,
      id,
      surveyDate: input.surveyDate || new Date().toISOString().split('T')[0],
      locationMethod: input.locationMethod || 'GPS_DEVICE',
      validationStatus: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    const row = mapPoleToDb(newPole);
    let createdPole: Pole | null = null;

    // 1. PRIMARY TARGET: VPS PostgreSQL (Fast, reliable, no quota limit)
    if (isPostgresConfigured()) {
      try {
        const { text, values } = buildInsertSql('poles', row);
        const result = await dbQuery(`${text} RETURNING *`, values);
        if (result.rows[0]) {
          createdPole = mapDbToPole(result.rows[0]);
        }
      } catch (pgErr: any) {
        // If unique key violation on id, return the existing record
        if (pgErr?.code === '23505' && id) {
          const existing = await this.findById(id);
          if (existing) return existing;
        }
        console.error('[Create Pole VPS Postgres Error]:', pgErr);
        throw new Error(`Gagal menyimpan data ke database VPS: ${pgErr?.message || pgErr}`);
      }
    }

    // 2. SECONDARY / BEST-EFFORT SYNC: Supabase (Catch & ignore quota/rate limits)
    try {
      const { data, error } = await supabase.from('poles').insert(row).select().maybeSingle();
      if (error) {
        console.warn('[Supabase Sync Notice] Supabase insert notice (quota or restricted):', error.message);
      } else if (!createdPole && data) {
        createdPole = mapDbToPole(data);
      }
    } catch (sbErr: any) {
      console.warn('[Supabase Sync Notice] Failed syncing to Supabase:', sbErr?.message || sbErr);
    }

    // If VPS wasn't configured and Supabase failed, return newPole
    if (!createdPole) {
      createdPole = newPole;
    }

    return createdPole;
  }

  /**
   * Update directly in VPS PostgreSQL as primary database.
   * Mirror to Supabase with best-effort error handling.
   */
  async update(id: string, input: UpdatePoleInput): Promise<Pole> {
    const now = new Date().toISOString();
    const { id: _inputId, ...updateInput } = input;
    const row = mapPoleToDb({ ...updateInput, updatedAt: now });
    let updatedPole: Pole | null = null;

    // 1. PRIMARY TARGET: VPS PostgreSQL
    if (isPostgresConfigured()) {
      try {
        const { text, values } = buildUpdateSql('poles', row, 'id = $1', [id]);
        const result = await dbQuery(`${text} RETURNING *`, values);
        if (result.rows[0]) {
          updatedPole = mapDbToPole(result.rows[0]);
        }
      } catch (pgErr: any) {
        console.error(`[Update Pole VPS Postgres Error for ${id}]:`, pgErr);
        throw new Error(`Gagal mengupdate data VPS untuk pole ${id}: ${pgErr?.message || pgErr}`);
      }
    }

    // 2. SECONDARY / BEST-EFFORT SYNC: Supabase
    try {
      const { data, error } = await supabase.from('poles').update(row).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn(`[Supabase Sync Notice] Update pole ${id} notice:`, error.message);
      } else if (!updatedPole && data) {
        updatedPole = mapDbToPole(data);
      }
    } catch (sbErr: any) {
      console.warn(`[Supabase Sync Notice] Failed updating pole ${id} on Supabase:`, sbErr?.message || sbErr);
    }

    if (!updatedPole) {
      const existing = await this.findById(id);
      updatedPole = { ...(existing || ({} as Pole)), ...updateInput, id, updatedAt: now };
    }

    return updatedPole;
  }

  /**
   * Delete directly from VPS PostgreSQL as primary database.
   * Mirror to Supabase with best-effort error handling.
   */
  async delete(id: string): Promise<boolean> {
    let deletedFromPg = false;

    // 1. PRIMARY TARGET: VPS PostgreSQL
    if (isPostgresConfigured()) {
      try {
        const { rowCount } = await dbQuery('DELETE FROM poles WHERE id = $1', [id]);
        deletedFromPg = rowCount > 0;
      } catch (pgErr: any) {
        console.error(`[Delete Pole VPS Postgres Error for ${id}]:`, pgErr);
        throw new Error(`Gagal menghapus data dari VPS: ${pgErr?.message || pgErr}`);
      }
    }

    // 2. SECONDARY / BEST-EFFORT SYNC: Supabase
    try {
      const { error } = await supabase.from('poles').delete().eq('id', id);
      if (error) {
        console.warn(`[Supabase Sync Notice] Delete pole ${id} notice:`, error.message);
      }
    } catch (sbErr: any) {
      console.warn(`[Supabase Sync Notice] Failed deleting pole ${id} on Supabase:`, sbErr?.message || sbErr);
    }

    return deletedFromPg || true;
  }

  async getExistingIds(): Promise<string[]> {
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT id FROM poles ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          return rows.map((d: any) => d.id);
        }
      } catch (err: any) {
        console.warn('[DB Cascade Fallback] VPS getExistingIds notice:', err?.message || err);
      }
    }

    try {
      const { data, error } = await supabase.from('poles').select('id');
      if (!error && data && data.length > 0) {
        return data.map((d: any) => d.id);
      }
    } catch (err: any) {
      console.warn('[DB Cascade Fallback] Supabase getExistingIds notice:', err?.message || err);
    }

    return [];
  }
}
