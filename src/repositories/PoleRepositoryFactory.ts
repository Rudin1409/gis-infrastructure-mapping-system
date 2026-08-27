import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured } from '@/lib/google/appsScriptClient';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { GoogleSheetsPoleRepository } from './GoogleSheetsPoleRepository';
import { AppsScriptPoleRepository } from './AppsScriptPoleRepository';
import { SupabasePoleRepository } from './SupabasePoleRepository';
import { MockLocalPoleRepository } from './MockLocalPoleRepository';

let repositoryInstance: IPoleRepository | null = null;

export function isSupabaseConfigured(): boolean {
  return true;
}

export function getPoleRepository(): IPoleRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SupabasePoleRepository();
  }
  return repositoryInstance;
}
