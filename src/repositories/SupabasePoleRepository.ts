import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { supabase } from '@/lib/supabase';
import { resolveProviderInfo } from '@/config/providers';

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

export class SupabasePoleRepository implements IPoleRepository {
  async findAll(filters?: PoleFilterOptions): Promise<Pole[]> {
    let query = supabase.from('poles').select('*').order('created_at', { ascending: false });

    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters?.kecamatan) {
      query = query.eq('kecamatan', filters.kecamatan);
    }
    if (filters?.kelurahan) {
      query = query.eq('kelurahan', filters.kelurahan);
    }
    if (filters?.poleType) {
      query = query.eq('pole_type', filters.poleType);
    }
    if (filters?.search) {
      const s = `%${filters.search}%`;
      query = query.or(`road.ilike.${s},kelurahan.ilike.${s},pole_code.ilike.${s},description.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Server DB findAll error:', error);
      return [];
    }
    return (data || []).map(mapDbToPole);
  }

  async findById(id: string): Promise<Pole | null> {
    const { data, error } = await supabase.from('poles').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapDbToPole(data);
  }

  async create(input: CreatePoleInput): Promise<Pole> {
    const now = new Date().toISOString();
    const id = `LLG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

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
    const { data, error } = await supabase.from('poles').insert(row).select().single();
    if (error) {
      console.error('Server DB create error:', error);
      throw new Error(`Gagal menyimpan data ke server: ${error.message}`);
    }
    return mapDbToPole(data);
  }

  async update(id: string, input: UpdatePoleInput): Promise<Pole> {
    const now = new Date().toISOString();
    const row = mapPoleToDb({ ...input, updatedAt: now });

    const { data, error } = await supabase.from('poles').update(row).eq('id', id).select().single();
    if (error) {
      console.error('Server DB update error:', error);
      throw new Error(`Gagal mengupdate data ke server: ${error.message}`);
    }
    return mapDbToPole(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('poles').delete().eq('id', id);
    if (error) {
      console.error('Server DB delete error:', error);
      return false;
    }
    return true;
  }

  async getExistingIds(): Promise<string[]> {
    const { data, error } = await supabase.from('poles').select('id');
    if (error || !data) return [];
    return data.map((d: any) => d.id);
  }
}
