import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured } from '@/lib/google/appsScriptClient';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { GoogleSheetsPoleRepository } from './GoogleSheetsPoleRepository';
import { AppsScriptPoleRepository } from './AppsScriptPoleRepository';
import { MockLocalPoleRepository } from './MockLocalPoleRepository';

let repositoryInstance: IPoleRepository | null = null;

export function getPoleRepository(): IPoleRepository {
  if (!repositoryInstance) {
    if (isAppsScriptConfigured()) {
      repositoryInstance = new AppsScriptPoleRepository();
    } else if (isGoogleConfigured()) {
      repositoryInstance = new GoogleSheetsPoleRepository();
    } else {
      repositoryInstance = new MockLocalPoleRepository();
    }
  }
  return repositoryInstance;
}
