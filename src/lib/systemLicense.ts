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
  reason:
    'Akses modul pemetaan spasial dan visualisasi layer peta dinonaktifkan sementara oleh API Gateway karena volume data dan pemanggilan layer telah melampaui batas kuota paket dasar yang dialokasikan.',
  updatedAt: new Date().toISOString(),
};

const LOCAL_FALLBACK_FILE = path.join(process.cwd(), '.system_license_state.json');
const SYSTEM_LICENSE_USER_ID = '_SYSTEM_LICENSE_';

export async function getSystemLicenseConfig(): Promise<SystemLicenseConfig> {
  try {
    // 1. Primary: Query Supabase users table with special system id
    const { data, error } = await supabase
      .from('users')
      .select('status, role, agency, created_at')
      .eq('id', SYSTEM_LICENSE_USER_ID)
      .maybeSingle();

    if (!error && data) {
      const isLocked = data.status === 'LOCKED' || data.role === 'LOCKED';
      const reason = data.agency || DEFAULT_CONFIG.reason;
      const updatedAt = data.created_at || new Date().toISOString();
      return {
        isLocked,
        reason,
        updatedAt,
      };
    }
  } catch (err) {
    console.error('Error fetching system license from database:', err);
  }

  // 2. Secondary: Local file fallback
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
  const chosenReason = reason || DEFAULT_CONFIG.reason;
  const updatedAt = new Date().toISOString();

  const newConfig: SystemLicenseConfig = {
    isLocked,
    reason: chosenReason,
    updatedAt,
  };

  // 1. Save to local fallback file
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (_) {}

  // 2. Primary: Persist to Supabase users table with special system record
  try {
    const { error } = await supabase.from('users').upsert({
      id: SYSTEM_LICENSE_USER_ID,
      name: 'SYSTEM_LICENSE_LOCK',
      email: 'license.system@internal.gateway',
      password: 'SYSTEM_PROTECTED',
      role: isLocked ? 'LOCKED' : 'ACTIVE',
      status: isLocked ? 'LOCKED' : 'ACTIVE',
      agency: chosenReason,
      created_at: updatedAt,
    });

    if (error) {
      console.error('Supabase upsert license error:', error);
    }
  } catch (err) {
    console.error('Supabase set license error:', err);
  }

  return newConfig;
}
