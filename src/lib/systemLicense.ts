import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

export interface SystemLicenseConfig {
  isLocked: boolean;
  reason: string;
  updatedAt: string;
}

const DEFAULT_CONFIG: SystemLicenseConfig = {
  isLocked: false,
  reason: 'Masa Uji Coba (Trial Period) Server GIS Telah Berakhir. Kapasitas kuota data infrastruktur telah melebihi batas paket dasar.',
  updatedAt: new Date().toISOString(),
};

const LOCAL_FALLBACK_FILE = path.join(process.cwd(), '.system_license_state.json');

export async function getSystemLicenseConfig(): Promise<SystemLicenseConfig> {
  try {
    // 1. Try querying Supabase system_settings table
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'map_license_lock')
      .single();

    if (!error && data && data.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        isLocked: !!parsed.isLocked,
        reason: parsed.reason || DEFAULT_CONFIG.reason,
        updatedAt: data.updated_at || new Date().toISOString(),
      };
    }
  } catch (_) {}

  // 2. Local file fallback for resiliency
  try {
    if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
      const content = fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        isLocked: !!parsed.isLocked,
        reason: parsed.reason || DEFAULT_CONFIG.reason,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (_) {}

  return DEFAULT_CONFIG;
}

export async function setSystemLicenseConfig(
  isLocked: boolean,
  reason?: string
): Promise<SystemLicenseConfig> {
  const newConfig: SystemLicenseConfig = {
    isLocked,
    reason: reason || DEFAULT_CONFIG.reason,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local fallback file immediately
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (_) {}

  // 2. Save to Supabase system_settings table
  try {
    await supabase.from('system_settings').upsert({
      key: 'map_license_lock',
      value: newConfig,
      updated_at: newConfig.updatedAt,
    });
  } catch (_) {}

  return newConfig;
}
