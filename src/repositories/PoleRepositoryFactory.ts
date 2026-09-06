import { isPostgresConfigured } from '@/lib/postgres';
import { IPoleRepository } from './interfaces/IPoleRepository';
import { SupabasePoleRepository } from './SupabasePoleRepository';

let repositoryInstance: IPoleRepository | null = null;

// Nama dipertahankan untuk kompatibilitas: fungsi ini mendeteksi mode fallback,
// bukan memvalidasi kredensial atau koneksi Supabase.
export function isSupabaseConfigured(): boolean {
  return !isPostgresConfigured();
}

export function getPoleRepository(): IPoleRepository {
  // Repository ini menangani PostgreSQL maupun Supabase; pemilihan backend
  // dilakukan di dalam repository berdasarkan konfigurasi koneksi PostgreSQL.
  if (!repositoryInstance) {
    repositoryInstance = new SupabasePoleRepository();
  }
  return repositoryInstance;
}
