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
import { isSupabaseConfigured } from './PoleRepositoryFactory';
import { supabase } from '@/lib/supabase';

export class SupabaseProviderRepository implements IProviderRepository {
  async findAll(): Promise<Provider[]> {
    const { data, error } = await supabase.from('providers').select('*').order('name', { ascending: true });
    if (error || !data || data.length === 0) {
      return DEFAULT_PROVIDERS;
    }
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      colorHex: d.color || d.colorHex || '#3b82f6',
      status: d.status,
    }));
  }

  async findById(id: string): Promise<Provider | null> {
    const { data, error } = await supabase.from('providers').select('*').eq('id', id).single();
    if (error || !data) {
      return DEFAULT_PROVIDERS.find((p) => p.id === id) || null;
    }
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      colorHex: data.color || data.colorHex || '#3b82f6',
      status: data.status,
    };
  }

  async create(provider: Provider): Promise<Provider> {
    await supabase.from('providers').upsert({
      id: provider.id,
      name: provider.name,
      code: provider.code,
      color: provider.colorHex || '#3b82f6',
      status: provider.status,
    });
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

    return provider;
  }
}

export function getProviderRepository(): IProviderRepository {
  if (isSupabaseConfigured()) {
    return new SupabaseProviderRepository();
  }
  return new GoogleSheetsProviderRepository();
}
