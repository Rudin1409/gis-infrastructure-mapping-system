import 'server-only';
import * as pg from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL ||
  process.env.PG_CONNECTION_STRING ||
  '';

const { Pool } = pg as any;

let pool: any = null;

function shouldUseSsl(url: string): boolean {
  if (process.env.DATABASE_SSL === 'true') return true;
  if (process.env.DATABASE_SSL === 'false') return false;

  return /supabase\.co|pooler\.supabase\.com|neon\.tech|render\.com|railway\.app/i.test(url);
}

export function isPostgresConfigured(): boolean {
  return Boolean(databaseUrl);
}

export function getDatabaseUrl(): string {
  return databaseUrl;
}

export function getPostgresPool(): any {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum dikonfigurasi');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl)
        ? {
            rejectUnauthorized: true,
            ...(process.env.DATABASE_CA_CERT
              ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
              : {}),
          }
        : undefined,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS || 10000),
    });
  }

  return pool;
}

export async function dbQuery(
  text: string,
  values: any[] = []
): Promise<{ rows: any[]; rowCount: number }> {
  const result = await getPostgresPool().query(text, values);
  return {
    rows: result.rows,
    rowCount: result.rowCount,
  };
}

export function buildInsertSql(
  table: string,
  record: Record<string, any>
): { text: string; values: any[] } {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error(`Tidak ada data untuk di-insert ke ${table}`);
  }

  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values,
  };
}

export function buildUpdateSql(
  table: string,
  record: Record<string, any>,
  whereClause: string,
  whereValues: any[]
): { text: string; values: any[] } {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error(`Tidak ada data untuk di-update pada ${table}`);
  }

  const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const values = [...entries.map(([, value]) => value), ...whereValues];
  const shiftedWhereClause = whereClause.replace(/\$(\d+)/g, (_match, index) => {
    return `$${Number(index) + entries.length}`;
  });

  return {
    text: `UPDATE ${table} SET ${setClause} WHERE ${shiftedWhereClause}`,
    values,
  };
}
