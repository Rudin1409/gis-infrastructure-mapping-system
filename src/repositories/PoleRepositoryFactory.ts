import { isPostgresConfigured } from '@/lib/postgres';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { SupabasePoleRepository } from './SupabasePoleRepository';

let repositoryInstance: IPoleRepository | null = null;

export function isSupabaseConfigured(): boolean {
  return !isPostgresConfigured();
}

export function getPoleRepository(): IPoleRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SupabasePoleRepository();
  }
  return repositoryInstance;
}
