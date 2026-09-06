import { IDistrictRepository } from './interfaces/IDistrictRepository';
import {
  Subdistrict,
  DistrictGroup,
  CreateSubdistrictInput,
  UpdateSubdistrictInput,
} from '@/types/district';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { supabase } from '@/lib/supabase';
import { buildInsertSql, buildUpdateSql, dbQuery, isPostgresConfigured } from '@/lib/postgres';

const ORDERED_KECAMATAN_NAMES = [
  'Lubuklinggau Timur I',
  'Lubuklinggau Timur II',
  'Lubuklinggau Barat I',
  'Lubuklinggau Barat II',
  'Lubuklinggau Selatan I',
  'Lubuklinggau Selatan II',
  'Lubuklinggau Utara I',
  'Lubuklinggau Utara II',
];

function generateDefaultSubdistricts(): Subdistrict[] {
  const result: Subdistrict[] = [];
  let index = 1;

  KECAMATAN_LUBUKLINGGAU.forEach((kec) => {
    kec.kelurahan.forEach((kel, kelIdx) => {
      const code = kel
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);

      result.push({
        id: `KEL-DEF-${String(index).padStart(3, '0')}`,
        name: kel,
        kecamatan: kec.name,
        code,
        orderIndex: kelIdx + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      index++;
    });
  });

  return result;
}

function mapDbToSubdistrict(row: any): Subdistrict {
  return {
    id: row.id,
    name: row.name,
    kecamatan: row.kecamatan,
    code: row.code || undefined,
    orderIndex: row.order_index !== undefined ? Number(row.order_index) : 0,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export class SupabaseDistrictRepository implements IDistrictRepository {
  async findAll(): Promise<Subdistrict[]> {
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery(
          'SELECT * FROM subdistricts ORDER BY kecamatan ASC, order_index ASC, name ASC'
        );

        if (!rows || rows.length === 0) {
          const defaults = generateDefaultSubdistricts();
          // Attempt lazy auto-seed
          try {
            for (const d of defaults) {
              const { text, values } = buildInsertSql('subdistricts', {
                id: d.id,
                name: d.name,
                kecamatan: d.kecamatan,
                code: d.code,
                order_index: d.orderIndex,
              });
              await dbQuery(`${text} ON CONFLICT (id) DO NOTHING`, values);
            }
          } catch (seedErr) {
            console.warn('Postgres subdistricts auto-seed notice:', seedErr);
          }
          return defaults;
        }

        return rows.map(mapDbToSubdistrict);
      } catch (err: any) {
        // If table does not exist yet, fallback to defaults
        console.warn('Postgres subdistricts read notice:', err?.message || err);
        return generateDefaultSubdistricts();
      }
    }

    try {
      const { data, error } = await supabase
        .from('subdistricts')
        .select('*')
        .order('kecamatan', { ascending: true })
        .order('order_index', { ascending: true })
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        const defaults = generateDefaultSubdistricts();
        // Attempt lazy auto-seed to Supabase
        try {
          const rowsToInsert = defaults.map((d) => ({
            id: d.id,
            name: d.name,
            kecamatan: d.kecamatan,
            code: d.code,
            order_index: d.orderIndex,
          }));
          await supabase.from('subdistricts').upsert(rowsToInsert, { onConflict: 'id' });
        } catch (seedErr) {
          console.warn('Supabase subdistricts auto-seed notice:', seedErr);
        }
        return defaults;
      }

      return data.map(mapDbToSubdistrict);
    } catch (err) {
      console.warn('Fallback to default subdistricts config:', err);
      return generateDefaultSubdistricts();
    }
  }

  async getGroupedDistricts(): Promise<DistrictGroup[]> {
    const all = await this.findAll();

    const groupsMap = new Map<string, Subdistrict[]>();

    // Pre-initialize in official standard order
    ORDERED_KECAMATAN_NAMES.forEach((name) => {
      groupsMap.set(name, []);
    });

    all.forEach((item) => {
      const list = groupsMap.get(item.kecamatan);
      if (list) {
        list.push(item);
      } else {
        groupsMap.set(item.kecamatan, [item]);
      }
    });

    const groups: DistrictGroup[] = [];
    groupsMap.forEach((kelurahan, name) => {
      // Sort kelurahan by orderIndex then name
      kelurahan.sort(
        (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0) || a.name.localeCompare(b.name)
      );
      groups.push({
        name,
        kelurahan,
      });
    });

    return groups;
  }

  async findById(id: string): Promise<Subdistrict | null> {
    if (isPostgresConfigured()) {
      try {
        const { rows } = await dbQuery('SELECT * FROM subdistricts WHERE id = $1 LIMIT 1', [id]);
        if (!rows[0]) return null;
        return mapDbToSubdistrict(rows[0]);
      } catch {
        return null;
      }
    }

    const { data, error } = await supabase.from('subdistricts').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapDbToSubdistrict(data);
  }

  async create(input: CreateSubdistrictInput): Promise<Subdistrict> {
    const id = `KEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    const newSub: Subdistrict = {
      id,
      name: input.name.trim(),
      kecamatan: input.kecamatan.trim(),
      code: input.code?.trim().toUpperCase() || undefined,
      orderIndex: 99,
      createdAt: now,
      updatedAt: now,
    };

    if (isPostgresConfigured()) {
      const row = {
        id: newSub.id,
        name: newSub.name,
        kecamatan: newSub.kecamatan,
        code: newSub.code || null,
        order_index: newSub.orderIndex,
        created_at: now,
        updated_at: now,
      };
      const { text, values } = buildInsertSql('subdistricts', row);
      const result = await dbQuery(`${text} RETURNING *`, values);
      if (!result.rows[0]) {
        throw new Error('Gagal menyimpan kelurahan ke database PostgreSQL');
      }
      return mapDbToSubdistrict(result.rows[0]);
    }

    const { data, error } = await supabase
      .from('subdistricts')
      .insert({
        id: newSub.id,
        name: newSub.name,
        kecamatan: newSub.kecamatan,
        code: newSub.code,
        order_index: newSub.orderIndex,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase create subdistrict error:', error);
      throw new Error(`Gagal menyimpan data kelurahan: ${error.message}`);
    }

    return mapDbToSubdistrict(data);
  }

  async update(input: UpdateSubdistrictInput): Promise<Subdistrict> {
    const now = new Date().toISOString();
    const updatedName = input.name.trim();
    const updatedKec = input.kecamatan.trim();

    const row: Record<string, any> = {
      name: updatedName,
      kecamatan: updatedKec,
      code: input.code?.trim().toUpperCase() || null,
      updated_at: now,
    };

    let updatedResult: Subdistrict;

    if (isPostgresConfigured()) {
      const { text, values } = buildUpdateSql('subdistricts', row, 'id = $1', [input.id]);
      const result = await dbQuery(`${text} RETURNING *`, values);
      if (!result.rows[0]) {
        throw new Error(`Kelurahan dengan ID ${input.id} tidak ditemukan`);
      }
      updatedResult = mapDbToSubdistrict(result.rows[0]);
    } else {
      const { data, error } = await supabase
        .from('subdistricts')
        .update(row)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update subdistrict error:', error);
        throw new Error(`Gagal mengupdate data kelurahan: ${error.message}`);
      }
      updatedResult = mapDbToSubdistrict(data);
    }

    // Cascade update to poles if oldName is provided and different
    if (
      input.cascadeUpdatePoles !== false &&
      input.oldName &&
      input.oldName.trim().toLowerCase() !== updatedName.toLowerCase()
    ) {
      try {
        const oldNameTrim = input.oldName.trim();
        if (isPostgresConfigured()) {
          await dbQuery(
            'UPDATE poles SET kelurahan = $1 WHERE kecamatan = $2 AND LOWER(kelurahan) = LOWER($3)',
            [updatedName, updatedKec, oldNameTrim]
          );
        } else {
          await supabase
            .from('poles')
            .update({ kelurahan: updatedName })
            .match({ kecamatan: updatedKec, kelurahan: oldNameTrim });
        }
      } catch (cascadeErr) {
        console.warn('Cascade update poles warning:', cascadeErr);
      }
    }

    return updatedResult;
  }

  async delete(id: string): Promise<boolean> {
    if (isPostgresConfigured()) {
      const { rowCount } = await dbQuery('DELETE FROM subdistricts WHERE id = $1', [id]);
      return rowCount > 0;
    }

    const { error } = await supabase.from('subdistricts').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete subdistrict error:', error);
      return false;
    }
    return true;
  }

  async resetToDefaults(): Promise<Subdistrict[]> {
    const defaults = generateDefaultSubdistricts();

    if (isPostgresConfigured()) {
      await dbQuery('DELETE FROM subdistricts');
      for (const d of defaults) {
        const { text, values } = buildInsertSql('subdistricts', {
          id: d.id,
          name: d.name,
          kecamatan: d.kecamatan,
          code: d.code,
          order_index: d.orderIndex,
        });
        await dbQuery(text, values);
      }
      return defaults;
    }

    await supabase.from('subdistricts').delete().neq('id', 'NONE');
    const rowsToInsert = defaults.map((d) => ({
      id: d.id,
      name: d.name,
      kecamatan: d.kecamatan,
      code: d.code,
      order_index: d.orderIndex,
    }));
    await supabase.from('subdistricts').insert(rowsToInsert);
    return defaults;
  }
}
