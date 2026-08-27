import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured } from '@/lib/google/appsScriptClient';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { GoogleSheetsPoleRepository } from './GoogleSheetsPoleRepository';
import { AppsScriptPoleRepository } from './AppsScriptPoleRepository';
import { SupabasePoleRepository } from './SupabasePoleRepository';
import { MockLocalPoleRepository } from './MockLocalPoleRepository';

let repositoryInstance: IPoleRepository | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getPoleRepository(): IPoleRepository {
  if (!repositoryInstance) {
    if (isSupabaseConfigured()) {
      repositoryInstance = new SupabasePoleRepository();
    } else if (isAppsScriptConfigured()) {
      repositoryInstance = new AppsScriptPoleRepository();
    } else if (isGoogleConfigured()) {
      repositoryInstance = new GoogleSheetsPoleRepository();
    } else {
      repositoryInstance = new MockLocalPoleRepository();
    }
  }
  return repositoryInstance;
}
