import 'server-only';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { digestToken } from './password';

const memoryRateLimits = new Map<string, { hits: number; expiresAt: number }>();
const memorySessions = new Map<
  string,
  { user_id: string; credential_hash: string; expires_at: string }
>();

export async function readUser(id: string): Promise<any | null> {
  if (isPostgresConfigured()) {
    try {
      return (await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])).rows[0] || null;
    } catch (err) {
      console.error('[readUser] Postgres notice:', err);
    }
  }
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (!error) return data || null;
    } catch (err) {
      console.error('[readUser] Supabase notice:', err);
    }
  }
  return null;
}

export async function findLoginUser(identifier: string, aliasId?: string): Promise<any | null> {
  const phone = identifier.replace(/[^0-9]/g, '');
  const cleanId = identifier.trim().toLowerCase();
  if (isPostgresConfigured()) {
    try {
      const rows = (
        await dbQuery(
          `SELECT * FROM users WHERE id NOT LIKE '\\_%'
        AND (
          LOWER(email) = $1
          OR id = $2
          OR LOWER(email) = $1 || '@lubuklinggaukota.go.id'
          OR LOWER(SPLIT_PART(email, '@', 1)) = $1
          OR ($3 <> '' AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $3)
        ) LIMIT 2`,
          [cleanId, aliasId || '', phone.length >= 8 && /^[+\d\s()-]+$/.test(cleanId) ? phone : '']
        )
      ).rows;
      return rows.length >= 1 ? rows[0] : null;
    } catch (pgErr) {
      console.error('[findLoginUser] Postgres notice:', pgErr);
    }
  }
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*').limit(1000);
      if (!error && data) {
        const rows = data.filter(
          (row) =>
            !String(row.id).startsWith('_') &&
            (String(row.email).toLowerCase() === cleanId ||
              row.id === aliasId ||
              String(row.email).toLowerCase() === cleanId + '@lubuklinggaukota.go.id' ||
              String(row.email).split('@')[0].toLowerCase() === cleanId ||
              (phone.length >= 8 &&
                /^[+\d\s()-]+$/.test(cleanId) &&
                String(row.phone || '').replace(/[^0-9]/g, '') === phone))
        );
        return rows.length >= 1 ? rows[0] : null;
      }
    } catch (sbErr) {
      console.error('[findLoginUser] Supabase notice:', sbErr);
    }
  }
  return null;
}

export async function updateUser(id: string, changes: Record<string, string>): Promise<void> {
  const allowed = ['name', 'phone', 'avatar', 'role_label', 'password'];
  const entries = Object.entries(changes).filter(([key]) => allowed.includes(key));
  if (!entries.length) return;
  if (isPostgresConfigured()) {
    try {
      const assignments = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
      await dbQuery(`UPDATE users SET ${assignments} WHERE id = $${entries.length + 1}`, [
        ...entries.map(([, value]) => value),
        id,
      ]);
      return;
    } catch (err) {
      console.error('[updateUser] Postgres notice:', err);
    }
  }
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('users').update(Object.fromEntries(entries)).eq('id', id);
    } catch (err) {
      console.error('[updateUser] Supabase notice:', err);
    }
  }
}

export async function writeSession(token: string, user: any, expiresAt: string): Promise<void> {
  const tokenHash = digestToken(token);
  const credHash = digestToken(user.password || '');
  const record = {
    token_hash: tokenHash,
    user_id: user.id,
    credential_hash: credHash,
    expires_at: expiresAt,
  };
  if (isPostgresConfigured()) {
    try {
      await dbQuery('DELETE FROM auth_sessions WHERE expires_at < NOW()');
      await dbQuery(
        'INSERT INTO auth_sessions (token_hash,user_id,credential_hash,expires_at) VALUES ($1,$2,$3,$4)',
        Object.values(record)
      );
      return;
    } catch (pgErr) {
      console.error('[writeSession] Postgres notice:', pgErr);
    }
  }
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('auth_sessions').insert(record);
      if (!error) return;
    } catch (sbErr) {
      console.error('[writeSession] Supabase notice:', sbErr);
    }
  }
  memorySessions.set(tokenHash, {
    user_id: user.id,
    credential_hash: credHash,
    expires_at: expiresAt,
  });
}

export async function readSession(token: string): Promise<any | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = digestToken(token);
  if (isPostgresConfigured()) {
    try {
      return (
        (
          await dbQuery(
            'SELECT * FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()',
            [tokenHash]
          )
        ).rows[0] || null
      );
    } catch (pgErr) {
      console.error('[readSession] Postgres notice:', pgErr);
    }
  }
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!error) return data || null;
    } catch (sbErr) {
      console.error('[readSession] Supabase notice:', sbErr);
    }
  }
  const mem = memorySessions.get(tokenHash);
  if (mem && new Date(mem.expires_at).getTime() > Date.now()) {
    return mem;
  }
  return null;
}

export async function deleteSession(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  const tokenHash = digestToken(token);
  memorySessions.delete(tokenHash);
  if (isPostgresConfigured()) {
    try {
      await dbQuery('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
    } catch {}
  } else if (isSupabaseConfigured()) {
    try {
      await supabase.from('auth_sessions').delete().eq('token_hash', tokenHash);
    } catch {}
  }
}

// Database counters are shared across workers. A restart cannot reset login limits.
export async function consumeLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const keyHash = digestToken(`${key}:${bucket}`);
  const expiresAt = new Date((bucket + 2) * windowSeconds * 1000).toISOString();

  if (isPostgresConfigured()) {
    try {
      await dbQuery('DELETE FROM auth_rate_limits WHERE expires_at < NOW()');
      const { rows } = await dbQuery(
        `INSERT INTO auth_rate_limits (key_hash, hits, expires_at)
        VALUES ($1,1,$2) ON CONFLICT (key_hash) DO UPDATE
        SET hits = LEAST(auth_rate_limits.hits + 1, $3 + 1) RETURNING hits`,
        [keyHash, expiresAt, limit]
      );
      if (rows && rows[0]) {
        return rows[0].hits <= limit;
      }
    } catch (pgErr) {
      console.error('[consumeLimit] Postgres notice:', pgErr);
    }
  } else if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('consume_auth_limit', {
        p_key: keyHash,
        p_expires: expiresAt,
        p_limit: limit,
      });
      if (!error && data !== null) {
        return data === true;
      }
    } catch (sbErr) {
      console.error('[consumeLimit] Supabase notice:', sbErr);
    }
  }

  // Resilient memory fallback only when DB is unavailable
  const memKey = `${key}:${bucket}`;
  const now = Date.now();
  const entry = memoryRateLimits.get(memKey);
  if (!entry || entry.expiresAt < now) {
    memoryRateLimits.set(memKey, {
      hits: 1,
      expiresAt: (bucket + 2) * windowSeconds * 1000,
    });
    return true;
  }
  entry.hits += 1;
  return entry.hits <= limit;
}
