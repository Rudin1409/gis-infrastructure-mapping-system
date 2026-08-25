import {
  getGoogleSheetsClient,
  isGoogleConfigured,
  POLE_SHEET_NAME,
  POLE_HEADERS,
  poleToSheetRow,
  sheetRowToPole,
} from '@/lib/google/sheets';
import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { generatePoleId } from '@/lib/utils/idGenerator';

export class GoogleSheetsPoleRepository implements IPoleRepository {
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  private async ensureHeaders(sheets: any) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${POLE_SHEET_NAME}!A1:Z1`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${POLE_SHEET_NAME}!A1:Z1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [POLE_HEADERS],
          },
        });
      }
    } catch (e) {
      console.warn('Auto header init note:', e);
    }
  }

  async findAll(filters?: PoleFilterOptions): Promise<Pole[]> {
    const sheets = getGoogleSheetsClient();
    if (!sheets) throw new Error('Google Sheets client is not configured');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A2:Z1000`,
    });

    const rows = response.data.values || [];
    let poles: Pole[] = rows
      .map(sheetRowToPole)
      .filter((p): p is Pole => p !== null);

    if (filters) {
      if (filters.providerId && filters.providerId !== 'ALL') {
        poles = poles.filter((p) => p.providerId === filters.providerId);
      }
      if (filters.condition && filters.condition !== 'ALL') {
        poles = poles.filter((p) => p.condition === filters.condition);
      }
      if (filters.kecamatan && filters.kecamatan !== 'ALL') {
        poles = poles.filter((p) => p.kecamatan === filters.kecamatan);
      }
      if (filters.kelurahan && filters.kelurahan !== 'ALL') {
        poles = poles.filter((p) => p.kelurahan === filters.kelurahan);
      }
      if (filters.poleType && filters.poleType !== 'ALL') {
        poles = poles.filter((p) => p.poleType === filters.poleType);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        poles = poles.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.road.toLowerCase().includes(q) ||
            p.kecamatan.toLowerCase().includes(q) ||
            p.kelurahan.toLowerCase().includes(q) ||
            (p.providerName && p.providerName.toLowerCase().includes(q))
        );
      }
    }

    return poles;
  }

  async findById(id: string): Promise<Pole | null> {
    const all = await this.findAll();
    return all.find((p) => p.id === id) || null;
  }

  async getExistingIds(): Promise<string[]> {
    const all = await this.findAll();
    return all.map((p) => p.id);
  }

  async create(data: CreatePoleInput): Promise<Pole> {
    const sheets = getGoogleSheetsClient();
    if (!sheets) throw new Error('Google Sheets client is not configured');

    await this.ensureHeaders(sheets);

    const existingIds = await this.getExistingIds();
    const newId = generatePoleId(existingIds);
    const now = new Date().toISOString();

    const newPole: Pole = {
      ...data,
      id: newId,
      locationMethod: data.locationMethod || 'MANUAL_MAP_PIN',
      surveyDate: data.surveyDate || now.split('T')[0],
      validationStatus: data.validationStatus || 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    const row = poleToSheetRow(newPole);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    return newPole;
  }

  async update(id: string, data: UpdatePoleInput): Promise<Pole> {
    const sheets = getGoogleSheetsClient();
    if (!sheets) throw new Error('Google Sheets client is not configured');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A2:Z1000`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      throw new Error(`Pole with ID ${id} not found`);
    }

    const currentPole = sheetRowToPole(rows[rowIndex]);
    if (!currentPole) throw new Error('Failed to parse existing pole');

    const updatedPole: Pole = {
      ...currentPole,
      ...data,
      id: currentPole.id,
      updatedAt: new Date().toISOString(),
    };

    const updatedRow = poleToSheetRow(updatedPole);
    const sheetRowNumber = rowIndex + 2; // +2 for 1-based index and header row

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A${sheetRowNumber}:Z${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });

    return updatedPole;
  }

  async delete(id: string): Promise<boolean> {
    const sheets = getGoogleSheetsClient();
    if (!sheets) throw new Error('Google Sheets client is not configured');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A2:Z1000`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) return false;

    const sheetRowNumber = rowIndex + 2;
    // Clear the row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${POLE_SHEET_NAME}!A${sheetRowNumber}:Z${sheetRowNumber}`,
    });

    return true;
  }
}
