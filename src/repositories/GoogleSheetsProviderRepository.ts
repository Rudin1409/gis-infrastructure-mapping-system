import {
  getGoogleSheetsClient,
  isGoogleConfigured,
  PROVIDER_SHEET_NAME,
  PROVIDER_HEADERS,
  providerToSheetRow,
  sheetRowToProvider,
} from '@/lib/google/sheets';
import { IProviderRepository } from './interfaces/IProviderRepository';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { supabase } from '@/lib/supabase';
import { buildInsertSql, dbQuery, isPostgresConfigured } from '@/lib/postgres';

export class SupabaseProviderRepository implements IProviderRepository {
  /**
   * 3-Tier Cascade Fallback Read for Providers:
   * Tier 1: PostgreSQL VPS Utama
   * Tier 2: Supabase
   * Tier 3: Google Sheets -> DEFAULT_PROVIDERS
   */
  async findAll(): Promise<Provider[]> {
    // --- TIER 1: PostgreSQL VPS Utama ---
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT * FROM providers ORDER BY name ASC');
        if (rows && rows.length > 0) {
          return rows.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            colorHex: d.color || d.colorHex || '#3b82f6',
            status: d.status,
          }));
        }
      } catch (pgError: any) {
        console.warn('[DB Cascade Fallback] VPS PostgreSQL providers notice:', pgError?.message || pgError);
      }
    }

    // --- TIER 2: Supabase Fallback ---
    try {
      const { data, error } = await supabase.from('providers').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          colorHex: d.color || d.colorHex || '#3b82f6',
          status: d.status,
        }));
      }
    } catch (sbError: any) {
      console.warn('[DB Cascade Fallback] Supabase providers notice:', sbError?.message || sbError);
    }

    // --- TIER 3: Google Sheets Fallback ---
    try {
      if (isGoogleConfigured()) {
        const gsheet = new GoogleSheetsProviderRepository();
        const providers = await gsheet.findAll();
        if (providers && providers.length > 0) {
          return providers;
        }
      }
    } catch (gsError: any) {
      console.warn('[DB Cascade Fallback] Google Sheets providers notice:', gsError?.message || gsError);
    }

    return DEFAULT_PROVIDERS;
  }

  async findById(id: string): Promise<Provider | null> {
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT * FROM providers WHERE id = $1 LIMIT 1', [id]);
        if (rows && rows[0]) {
          return {
            id: rows[0].id,
            name: rows[0].name,
            code: rows[0].code,
            colorHex: rows[0].color || rows[0].colorHex || '#3b82f6',
            status: rows[0].status,
          };
        }
      } catch (err: any) {
        console.warn('[DB Cascade Fallback] VPS findById provider notice:', err?.message || err);
      }
    }

    try {
      const { data, error } = await supabase.from('providers').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          code: data.code,
          colorHex: data.color || data.colorHex || '#3b82f6',
          status: data.status,
        };
      }
    } catch (err: any) {
      console.warn('[DB Cascade Fallback] Supabase findById provider notice:', err?.message || err);
    }

    const all = await this.findAll();
    return all.find((p) => p.id === id) || null;
  }

  async create(provider: Provider): Promise<Provider> {
    const row = {
      id: provider.id,
      name: provider.name,
      code: provider.code,
      color: provider.colorHex || '#3b82f6',
      status: provider.status,
    };

    // 1. PRIMARY TARGET: VPS PostgreSQL
    if (isPostgresConfigured()) {
      try {
        const { text, values } = buildInsertSql('providers', row);
        await dbQuery(
          `${text} ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, color = EXCLUDED.color, status = EXCLUDED.status`,
          values
        );
      } catch (pgErr: any) {
        console.error('[Create Provider VPS Postgres Error]:', pgErr);
      }
    }

    // 2. SECONDARY / BEST-EFFORT SYNC: Supabase
    try {
      await supabase.from('providers').upsert({
        id: provider.id,
        name: provider.name,
        code: provider.code,
        color: provider.colorHex || '#3b82f6',
        status: provider.status,
      });
    } catch (sbErr: any) {
      console.warn('[Supabase Sync Notice] Provider sync notice:', sbErr?.message || sbErr);
    }

    return provider;
  }
}

export class GoogleSheetsProviderRepository implements IProviderRepository {
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  async findAll(): Promise<Provider[]> {
    if (!isGoogleConfigured()) {
      return DEFAULT_PROVIDERS;
    }

    try {
      const sheets = getGoogleSheetsClient();
      if (!sheets) return DEFAULT_PROVIDERS;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${PROVIDER_SHEET_NAME}!A2:E100`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        await this.seedDefaults(sheets);
        return DEFAULT_PROVIDERS;
      }

      const providers = rows
        .map(sheetRowToProvider)
        .filter((p): p is Provider => p !== null);

      return providers.length > 0 ? providers : DEFAULT_PROVIDERS;
    } catch (e) {
      console.warn('Fallback to DEFAULT_PROVIDERS due to sheet read note:', e);
      return DEFAULT_PROVIDERS;
    }
  }

  private async seedDefaults(sheets: any) {
    try {
      const rows = DEFAULT_PROVIDERS.map(providerToSheetRow);
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${PROVIDER_SHEET_NAME}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [PROVIDER_HEADERS, ...rows],
        },
      });
    } catch (err) {
      console.warn('Seed providers error:', err);
    }
  }

  async findById(id: string): Promise<Provider | null> {
    const list = await this.findAll();
    return list.find((p) => p.id === id) || null;
  }

  async create(provider: Provider): Promise<Provider> {
    if (!isGoogleConfigured()) return provider;

    try {
      const sheets = getGoogleSheetsClient();
      if (!sheets) return provider;

      const row = providerToSheetRow(provider);
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${PROVIDER_SHEET_NAME}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });
    } catch (_) {}

    return provider;
  }
}

export function getProviderRepository(): IProviderRepository {
  return new SupabaseProviderRepository();
}
