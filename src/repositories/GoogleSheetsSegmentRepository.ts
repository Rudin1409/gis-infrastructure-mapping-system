import {
  getGoogleSheetsClient,
  isGoogleConfigured,
  SEGMENT_SHEET_NAME,
  SEGMENT_HEADERS,
  segmentToSheetRow,
  sheetRowToSegment,
} from '@/lib/google/sheets';
import { ISegmentRepository } from './interfaces/ISegmentRepository';
import { NetworkSegment, CreateSegmentInput } from '@/types/segment';
import { generateSegmentId } from '@/lib/utils/idGenerator';
import { supabase } from '@/lib/supabase';
import { buildInsertSql, dbQuery, isPostgresConfigured } from '@/lib/postgres';

let MOCK_SEGMENTS: NetworkSegment[] = [];

export class SupabaseSegmentRepository implements ISegmentRepository {
  async findAll(): Promise<NetworkSegment[]> {
    if (isPostgresConfigured()) {
      const { rows } = await dbQuery('SELECT * FROM segments ORDER BY created_at DESC');
      if (!rows || rows.length === 0) {
        return MOCK_SEGMENTS;
      }

      return rows.map((d: any) => ({
        id: d.id,
        segmentCode: d.segment_code,
        fromNodeId: d.from_node_id,
        toNodeId: d.to_node_id,
        providerId: d.provider_id,
        providerName: d.provider_name,
        networkType: d.network_type || 'FIBER_OPTIC',
        installationType: d.installation_type || 'AERIAL',
        estimatedDistance: parseFloat(d.estimated_distance || 0),
        status: d.status || 'ACTIVE',
        description: d.description,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    }

    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_SEGMENTS;
    }

    return data.map((d: any) => ({
      id: d.id,
      segmentCode: d.segment_code,
      fromNodeId: d.from_node_id,
      toNodeId: d.to_node_id,
      providerId: d.provider_id,
      providerName: d.provider_name,
      networkType: d.network_type || 'FIBER_OPTIC',
      installationType: d.installation_type || 'AERIAL',
      estimatedDistance: parseFloat(d.estimated_distance || 0),
      status: d.status || 'ACTIVE',
      description: d.description,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }

  async findById(id: string): Promise<NetworkSegment | null> {
    if (isPostgresConfigured()) {
      const { rows } = await dbQuery('SELECT * FROM segments WHERE id = $1 LIMIT 1', [id]);
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        segmentCode: rows[0].segment_code,
        fromNodeId: rows[0].from_node_id,
        toNodeId: rows[0].to_node_id,
        providerId: rows[0].provider_id,
        providerName: rows[0].provider_name,
        networkType: rows[0].network_type || 'FIBER_OPTIC',
        installationType: rows[0].installation_type || 'AERIAL',
        estimatedDistance: parseFloat(rows[0].estimated_distance || 0),
        status: rows[0].status || 'ACTIVE',
        description: rows[0].description,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].updated_at,
      };
    }

    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      segmentCode: data.segment_code,
      fromNodeId: data.from_node_id,
      toNodeId: data.to_node_id,
      providerId: data.provider_id,
      providerName: data.provider_name,
      networkType: data.network_type || 'FIBER_OPTIC',
      installationType: data.installation_type || 'AERIAL',
      estimatedDistance: parseFloat(data.estimated_distance || 0),
      status: data.status || 'ACTIVE',
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByNodeId(nodeId: string): Promise<NetworkSegment[]> {
    if (isPostgresConfigured()) {
      const { rows } = await dbQuery(
        'SELECT * FROM segments WHERE from_node_id = $1 OR to_node_id = $1 ORDER BY created_at DESC',
        [nodeId]
      );

      return rows.map((d: any) => ({
        id: d.id,
        segmentCode: d.segment_code,
        fromNodeId: d.from_node_id,
        toNodeId: d.to_node_id,
        providerId: d.provider_id,
        providerName: d.provider_name,
        networkType: d.network_type || 'FIBER_OPTIC',
        installationType: d.installation_type || 'AERIAL',
        estimatedDistance: parseFloat(d.estimated_distance || 0),
        status: d.status || 'ACTIVE',
        description: d.description,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    }

    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`);

    if (error || !data || data.length === 0) {
      return MOCK_SEGMENTS.filter((s) => s.fromNodeId === nodeId || s.toNodeId === nodeId);
    }

    return data.map((d: any) => ({
      id: d.id,
      segmentCode: d.segment_code,
      fromNodeId: d.from_node_id,
      toNodeId: d.to_node_id,
      providerId: d.provider_id,
      providerName: d.provider_name,
      networkType: d.network_type || 'FIBER_OPTIC',
      installationType: d.installation_type || 'AERIAL',
      estimatedDistance: parseFloat(d.estimated_distance || 0),
      status: d.status || 'ACTIVE',
      description: d.description,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }

  async create(input: CreateSegmentInput): Promise<NetworkSegment> {
    const now = new Date().toISOString();
    const id = generateSegmentId();

    const row = {
      id,
      segment_code: input.segmentCode || id,
      from_node_id: input.fromNodeId,
      to_node_id: input.toNodeId,
      provider_id: input.providerId,
      provider_name: input.providerName || undefined,
      network_type: input.networkType || 'FIBER_OPTIC',
      installation_type: input.installationType || 'AERIAL',
      estimated_distance: input.estimatedDistance || 0,
      status: input.status || 'ACTIVE',
      description: input.description,
      created_at: now,
      updated_at: now,
    };

    if (isPostgresConfigured()) {
      const { text, values } = buildInsertSql('segments', row);
      const { rows } = await dbQuery(`${text} RETURNING *`, values);
      const data = rows[0];
      if (!data) {
        return {
          id,
          ...input,
          estimatedDistance: input.estimatedDistance ?? 0,
          createdAt: now,
          updatedAt: now,
        };
      }

      return {
        id: data.id,
        segmentCode: data.segment_code,
        fromNodeId: data.from_node_id,
        toNodeId: data.to_node_id,
        providerId: data.provider_id,
        providerName: data.provider_name,
        networkType: data.network_type,
        installationType: data.installation_type,
        estimatedDistance: parseFloat(data.estimated_distance || 0),
        status: data.status,
        description: data.description,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const { data, error } = await supabase.from('segments').insert(row).select().single();
    if (error || !data) {
      return {
        id,
        ...input,
        estimatedDistance: input.estimatedDistance ?? 0,
        createdAt: now,
        updatedAt: now,
      };
    }

    return {
      id: data.id,
      segmentCode: data.segment_code,
      fromNodeId: data.from_node_id,
      toNodeId: data.to_node_id,
      providerId: data.provider_id,
      providerName: data.provider_name,
      networkType: data.network_type,
      installationType: data.installation_type,
      estimatedDistance: parseFloat(data.estimated_distance || 0),
      status: data.status,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string): Promise<boolean> {
    if (isPostgresConfigured()) {
      const { rowCount } = await dbQuery('DELETE FROM segments WHERE id = $1', [id]);
      return rowCount > 0;
    }

    const { error } = await supabase.from('segments').delete().eq('id', id);
    return !error;
  }
}

export class GoogleSheetsSegmentRepository implements ISegmentRepository {
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  async findAll(): Promise<NetworkSegment[]> {
    if (!isGoogleConfigured()) {
      return MOCK_SEGMENTS;
    }

    try {
      const sheets = getGoogleSheetsClient();
      if (!sheets) return MOCK_SEGMENTS;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SEGMENT_SHEET_NAME}!A2:L1000`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return MOCK_SEGMENTS;
      }

      const segments = rows
        .map(sheetRowToSegment)
        .filter((s): s is NetworkSegment => s !== null);

      return segments.length > 0 ? segments : MOCK_SEGMENTS;
    } catch (e) {
      console.warn('Fallback to MOCK_SEGMENTS due to sheet read notice:', e);
      return MOCK_SEGMENTS;
    }
  }

  async findById(id: string): Promise<NetworkSegment | null> {
    const list = await this.findAll();
    return list.find((s) => s.id === id) || null;
  }

  async findByNodeId(nodeId: string): Promise<NetworkSegment[]> {
    const list = await this.findAll();
    return list.filter((s) => s.fromNodeId === nodeId || s.toNodeId === nodeId);
  }

  async create(input: CreateSegmentInput): Promise<NetworkSegment> {
    const now = new Date().toISOString();
    const newSegment: NetworkSegment = {
      id: generateSegmentId(),
      ...input,
      estimatedDistance: input.estimatedDistance ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    if (!isGoogleConfigured()) {
      MOCK_SEGMENTS.unshift(newSegment);
      return newSegment;
    }

    try {
      const sheets = getGoogleSheetsClient();
      if (!sheets) {
        MOCK_SEGMENTS.unshift(newSegment);
        return newSegment;
      }

      const row = segmentToSheetRow(newSegment);
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SEGMENT_SHEET_NAME}!A:L`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      return newSegment;
    } catch (e) {
      console.warn('Fallback to local mock on sheet append notice:', e);
      MOCK_SEGMENTS.unshift(newSegment);
      return newSegment;
    }
  }

  async delete(id: string): Promise<boolean> {
    MOCK_SEGMENTS = MOCK_SEGMENTS.filter((s) => s.id !== id);
    return true;
  }
}

export function getSegmentRepository(): ISegmentRepository {
  return new SupabaseSegmentRepository();
}
