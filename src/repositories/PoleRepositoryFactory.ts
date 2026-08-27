import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured } from '@/lib/google/appsScriptClient';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { GoogleSheetsPoleRepository } from './GoogleSheetsPoleRepository';
import { AppsScriptPoleRepository } from './AppsScriptPoleRepository';
import { SupabasePoleRepository } from './SupabasePoleRepository';
import { MockLocalPoleRepository } from './MockLocalPoleRepository';

let repositoryInstance: IPoleRepository | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdiswcejzxwrrbirzstv.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';
  return Boolean(url && key);
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
