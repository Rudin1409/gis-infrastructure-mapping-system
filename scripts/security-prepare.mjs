import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';
import ts from 'typescript';

// Use Node --env-file=.env.local. Default is a read-only readiness report.
const apply = process.argv.includes('--apply');
const rotateAll = process.argv.includes('--rotate-passwords');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url)
  throw new Error(
    'DATABASE_URL dibutuhkan. Untuk Supabase gunakan koneksi PostgreSQL milik project tersebut.'
  );
const pool = new pg.Pool({
  connectionString: url,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA_CERT
            ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
            : {}),
        }
      : undefined,
});

const client = await pool.connect();
try {
  const { rows } = await client.query(
    "SELECT id, email, password FROM users WHERE id NOT LIKE '\\_%'"
  );
  console.log(
    JSON.stringify(
      {
        accounts: rows.length,
        legacyPasswords: rows.filter((row) => !String(row.password).startsWith('scrypt$')).length,
        apply,
        rotateAll,
      },
      null,
      2
    )
  );
  if (!apply) {
    console.log(
      'Readiness check saja. Setelah backup dan verifikasi target, gunakan --apply --rotate-passwords untuk aktivasi.'
    );
  } else {
    // Prepare credentials before changing the database, with exclusive file creation.
    // They are never printed to logs or committed to Git.
    const outputDir = path.resolve('.security-bootstrap');
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
    const outputPath = path.join(outputDir, `accounts-${Date.now()}.json`);
    const source = fs.readFileSync('src/lib/security/userDirectory.ts', 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const exported = {};
    vm.runInNewContext(compiled, { exports: exported, require: () => ({}) });
    const users = [...rows];
    const missing = (
      process.argv.includes('--seed-legacy-accounts') ? exported.DEFAULT_ACCOUNTS : []
    ).filter((user) => !rows.some((row) => row.id === user.id));
    users.push(...missing);
    const credentials = users
      .filter((user) => rotateAll || !String(user.password).startsWith('scrypt$'))
      .map((user) => ({
        id: user.id,
        email: user.email,
        password: randomBytes(18).toString('base64url'),
      }));
    fs.writeFileSync(outputPath, JSON.stringify({ status: 'PREPARED', credentials }, null, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    await client.query('BEGIN');
    try {
      // Strip the SQL's outer transaction because account rotation shares this one.
      const sql = fs
        .readFileSync('supabase/security_migration.sql', 'utf8')
        .replace(/^BEGIN;$/m, '')
        .replace(/^COMMIT;$/m, '');
      await client.query(sql);
      for (const user of missing) {
        await client.query(
          `INSERT INTO users (id,name,email,password,role,agency,phone,status)
          VALUES ($1,$2,$3,'DISABLED',$4,$5,$6,'AKTIF')`,
          [user.id, user.name, user.email, user.role, user.agency, user.phone || '']
        );
      }
      for (const account of credentials) {
        const salt = randomBytes(16).toString('hex');
        const hash = scryptSync(account.password, salt, 64, {
          N: 131072,
          r: 8,
          p: 1,
          maxmem: 256 * 1024 * 1024,
        }).toString('hex');
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [
          `scrypt$${salt}$${hash}`,
          account.id,
        ]);
      }
      await client.query('DELETE FROM auth_sessions');
      await client.query('COMMIT');
      fs.writeFileSync(outputPath, JSON.stringify({ status: 'APPLIED', credentials }, null, 2), {
        mode: 0o600,
      });
      console.log(
        `Migrasi berhasil. Kredensial baru hanya disimpan di ${outputPath}. Bagikan secara privat kepada pemilik akun.`
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
