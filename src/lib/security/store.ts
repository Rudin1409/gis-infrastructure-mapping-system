import 'server-only';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';
import { digestToken } from './password';

export async function readUser(id: string): Promise<any | null> {
  if (isPostgresConfigured()) {
    return (await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])).rows[0] || null;
  }
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findLoginUser(identifier: string, aliasId?: string): Promise<any | null> {
  const phone = identifier.replace(/[^0-9]/g, '');
  let rows: any[];
  if (isPostgresConfigured()) {
    rows = (
      await dbQuery(
        `SELECT * FROM users WHERE id NOT LIKE '\\_%'
      AND (LOWER(email) = $1 OR id = $2 OR ($3 <> '' AND
        regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $3)) LIMIT 2`,
        [
          identifier,
          aliasId || '',
          phone.length >= 8 && /^[+\d\s()-]+$/.test(identifier) ? phone : '',
        ]
      )
    ).rows;
  } else {
    // No user input is interpolated into a PostgREST filter expression.
    const { data, error } = await supabase.from('users').select('*').limit(1000);
    if (error) throw error;
    rows = (data || []).filter(
      (row) =>
        !String(row.id).startsWith('_') &&
        (String(row.email).toLowerCase() === identifier ||
          row.id === aliasId ||
          (phone.length >= 8 &&
            /^[+\d\s()-]+$/.test(identifier) &&
            String(row.phone || '').replace(/[^0-9]/g, '') === phone))
    );
  }
  // Ambiguous identifiers must not pick the first matching account.
  return rows.length === 1 ? rows[0] : null;
}

export async function updateUser(id: string, changes: Record<string, string>): Promise<void> {
  const allowed = ['name', 'phone', 'avatar', 'role_label', 'password'];
  const entries = Object.entries(changes).filter(([key]) => allowed.includes(key));
  if (!entries.length) return;
  if (isPostgresConfigured()) {
    const assignments = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
    await dbQuery(`UPDATE users SET ${assignments} WHERE id = $${entries.length + 1}`, [
      ...entries.map(([, value]) => value),
      id,
    ]);
  } else {
    const { error } = await supabase.from('users').update(Object.fromEntries(entries)).eq('id', id);
    if (error) throw error;
  }
}

export async function writeSession(token: string, user: any, expiresAt: string): Promise<void> {
  const record = {
    token_hash: digestToken(token),
    user_id: user.id,
    credential_hash: digestToken(user.password),
    expires_at: expiresAt,
  };
  if (isPostgresConfigured()) {
    await dbQuery('DELETE FROM auth_sessions WHERE expires_at < NOW()');
    await dbQuery(
      'INSERT INTO auth_sessions (token_hash,user_id,credential_hash,expires_at) VALUES ($1,$2,$3,$4)',
      Object.values(record)
    );
  } else {
    const { error } = await supabase.from('auth_sessions').insert(record);
    if (error) throw error;
  }
}

export async function readSession(token: string): Promise<any | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  if (isPostgresConfigured()) {
    return (
      (
        await dbQuery('SELECT * FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()', [
          digestToken(token),
        ])
      ).rows[0] || null
    );
  }
  const { data, error } = await supabase
    .from('auth_sessions')
    .select('*')
    .eq('token_hash', digestToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteSession(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  if (isPostgresConfigured()) {
    await dbQuery('DELETE FROM auth_sessions WHERE token_hash = $1', [digestToken(token)]);
  } else {
    const { error } = await supabase
      .from('auth_sessions')
      .delete()
      .eq('token_hash', digestToken(token));
    if (error) throw error;
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
    await dbQuery('DELETE FROM auth_rate_limits WHERE expires_at < NOW()');
    const { rows } = await dbQuery(
      `INSERT INTO auth_rate_limits (key_hash, hits, expires_at)
      VALUES ($1,1,$2) ON CONFLICT (key_hash) DO UPDATE
      SET hits = LEAST(auth_rate_limits.hits + 1, $3 + 1) RETURNING hits`,
      [keyHash, expiresAt, limit]
    );
    return rows[0].hits <= limit;
  }
  const { data, error } = await supabase.rpc('consume_auth_limit', {
    p_key: keyHash,
    p_expires: expiresAt,
    p_limit: limit,
  });
  if (error) throw error;
  return data === true;
}
