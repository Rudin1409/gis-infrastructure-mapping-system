import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { indexedDB } from 'fake-indexeddb';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
process.env.APP_ORIGIN = 'http://localhost:3105';
process.env.DATABASE_URL = 'postgresql://test-only';

// Execute real handlers against an isolated PostgreSQL engine. No production env
// file is read, and every external provider is replaced by a no-network adapter.
const database = new PGlite();
const modules = new Map();
const fakePool = {
  query: async (sql, values = []) => {
    const result = await database.query(sql, values);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  },
};
let fetchMock = async () => {
  throw new Error('External network prohibited in security tests');
};
const eventTarget = new EventTarget();
const windowMock = {
  location: { hostname: 'localhost' },
  dispatchEvent: (event) => eventTarget.dispatchEvent(event),
};
const overrides = {
  'server-only': {},
  pg: {
    Pool: function () {
      return fakePool;
    },
  },
  '@/lib/supabase': {
    supabase: new Proxy(
      {},
      {
        get() {
          throw new Error('External Supabase prohibited');
        },
      }
    ),
  },
  '@/lib/google/sheets': { isGoogleConfigured: () => false },
  '@/services/sheetsBackupService': {
    sheetsBackupService: new Proxy({}, { get: () => async () => true }),
  },
};
function load(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  modules.set(absolute, module);
  const localRequire = (id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const resolved = id.startsWith('@/')
        ? path.resolve('src', id.slice(2))
        : path.resolve(path.dirname(absolute), id);
      return load(fs.existsSync(resolved + '.ts') ? resolved + '.ts' : resolved);
    }
    return require(id);
  };
  vm.runInNewContext(
    compiled,
    {
      module,
      exports: module.exports,
      require: localRequire,
      process,
      console,
      Buffer,
      URL,
      Request,
      Response,
      Headers,
      AbortSignal,
      AbortController,
      setTimeout,
      clearTimeout,
      indexedDB,
      window: windowMock,
      navigator: { onLine: true },
      CustomEvent,
      Event,
      fetch: (...args) => fetchMock(...args),
      atob,
      File,
      FormData,
    },
    { filename: absolute }
  );
  return module.exports;
}
const request = (url, method = 'GET', body, token, origin = process.env.APP_ORIGIN) =>
  new NextRequest(process.env.APP_ORIGIN + url, {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      ...(token ? { cookie: `inframap_session=${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
let adminToken, surveyorToken, secondToken;
const password = 'test-only-long-passphrase-2026';
const login = () => load('src/app/api/auth/login/route.ts').POST;

test('security regression suite', async (t) => {
  await database.exec(fs.readFileSync('supabase/schema.sql', 'utf8'));
  await database.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await database.exec(fs.readFileSync('supabase/security_migration.sql', 'utf8'));
  // The security migration can safely run twice.
  await database.exec(fs.readFileSync('supabase/security_migration.sql', 'utf8'));
  const { hashPassword, verifyPassword } = load('src/lib/security/password.ts');
  const hash = await hashPassword(password);
  for (const [id, role, agency] of [
    ['admin', 'ADMIN_KOMINFO', 'KOMINFO'],
    ['one', 'SURVEYOR', 'KOMINFO'],
    ['two', 'SURVEYOR', 'BAPENDA'],
  ]) {
    await database.query(
      "INSERT INTO users(id,name,email,password,role,agency,status) VALUES($1,$1,$2,$3,$4,$5,'AKTIF')",
      [id, `${id}@example.test`, hash, role, agency]
    );
  }

  await t.test('password hashes verify; plaintext and invalid hashes are rejected', async () => {
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
    assert.equal(await verifyPassword(password, password), false);
    assert.equal(await verifyPassword(password, 'scrypt$bad'), false);
  });

  await t.test('login issues an opaque HttpOnly cookie and no password/token in JSON', async () => {
    for (const [id, save] of [
      ['admin', (value) => (adminToken = value)],
      ['one', (value) => (surveyorToken = value)],
      ['two', (value) => (secondToken = value)],
    ]) {
      const res = await login()(
        request('/api/auth/login', 'POST', { email: `${id}@example.test`, password })
      );
      assert.equal(res.status, 200, await res.clone().text());
      const cookie = res.headers.get('set-cookie');
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=lax/i);
      save(cookie.match(/inframap_session=([a-f0-9]{64})/)[1]);
      const body = await res.json();
      assert.equal(body.user.id, id);
      assert.equal(JSON.stringify(body).includes('scrypt$'), false);
      assert.equal(body.token, undefined);
    }
  });

  await t.test('all existing protected API methods reject requests without a session', async () => {
    function walk(dir) {
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
        );
    }
    for (const file of walk('src/app/api').filter(
      (f) => f.endsWith('route.ts') && !/auth[\\/](login|logout)/.test(f)
    )) {
      const route = load(file);
      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].filter(
        (verb) => route[verb]
      )) {
        const res = await route[method](
          request('/api/test', method, method === 'GET' ? undefined : {}),
          { params: Promise.resolve({ id: 'missing' }) }
        );
        assert.equal(res.status, 401, `${file} ${method}`);
      }
    }
  });

  await t.test('forged/expired cookies and disabled users are rejected', async () => {
    const me = load('src/app/api/auth/me/route.ts').GET;
    assert.equal((await me(request('/api/auth/me', 'GET', undefined, '0'.repeat(64)))).status, 401);
    await database.query("UPDATE users SET status='NONAKTIF' WHERE id='two'");
    assert.equal((await me(request('/api/auth/me', 'GET', undefined, secondToken))).status, 401);
    await database.query("UPDATE users SET status='AKTIF' WHERE id='two'");
    await database.query(
      "UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 hour' WHERE user_id='two'"
    );
    assert.equal((await me(request('/api/auth/me', 'GET', undefined, secondToken))).status, 401);
  });

  await t.test(
    'cross-origin mutations and non-admin administrative operations are denied',
    async () => {
      const batch = load('src/app/api/poles/batch-delete/route.ts').POST;
      assert.equal(
        (await batch(request('/api/poles/batch-delete', 'POST', { ids: ['x'] }, surveyorToken)))
          .status,
        403
      );
      assert.equal(
        (
          await batch(
            request(
              '/api/poles/batch-delete',
              'POST',
              { ids: ['x'] },
              adminToken,
              'https://attacker.example'
            )
          )
        ).status,
        403
      );
      assert.equal(
        (
          await login()(
            request(
              '/api/auth/login',
              'POST',
              { email: 'admin@example.test', password },
              undefined,
              null
            )
          )
        ).status,
        403
      );
    }
  );

  await t.test(
    'surveyor can create and edit shared inventory; client cannot forge authorship',
    async () => {
      const create = load('src/app/api/poles/route.ts').POST;
      const payload = {
        id: 'LLG-OFF-test',
        poleLatitude: -3.3,
        poleLongitude: 102.86,
        providerId: 'PRV001',
        kelurahan: 'Air Kuti',
        kecamatan: 'Lubuklinggau Timur I',
        surveyorId: 'admin',
      };
      const created = await create(request('/api/poles', 'POST', payload, surveyorToken));
      assert.equal(created.status, 201, await created.clone().text());
      assert.equal((await created.json()).data.surveyorId, 'one');
      const duplicate = await create(request('/api/poles', 'POST', payload, surveyorToken));
      assert.equal(duplicate.status, 201);
      assert.equal(
        (await database.query('SELECT count(*)::int AS count FROM poles')).rows[0].count,
        1
      );
      const edit = load('src/app/api/poles/[id]/route.ts').PUT;
      const res = await edit(
        request(
          '/api/poles/LLG-OFF-test',
          'PUT',
          { road: 'Jalan Aman', surveyorId: 'admin' },
          adminToken
        ),
        { params: Promise.resolve({ id: 'LLG-OFF-test' }) }
      );
      assert.equal(res.status, 200, await res.clone().text());
      const data = (await res.json()).data;
      assert.equal(data.road, 'Jalan Aman');
      assert.equal(data.surveyorId, 'one');
      // Reverse direction: a surveyor can edit a record attributed to another user.
      await database.query("UPDATE poles SET surveyor_id='admin' WHERE id='LLG-OFF-test'");
      const shared = await edit(
        request('/api/poles/LLG-OFF-test', 'PUT', { road: 'Jalan Bersama' }, surveyorToken),
        { params: Promise.resolve({ id: 'LLG-OFF-test' }) }
      );
      assert.equal(shared.status, 200);
      const conflict = await create(request('/api/poles', 'POST', payload, surveyorToken));
      assert.equal(conflict.status, 409);
    }
  );

  await t.test(
    'profile rejects role escalation and only updates the authenticated user',
    async () => {
      const profile = load('src/app/api/auth/profile/route.ts').PUT;
      const data = { name: 'Nama Baru', phone: '08123456789', roleLabel: 'Petugas', avatar: '👷' };
      assert.equal(
        (
          await profile(
            request('/api/auth/profile', 'PUT', { ...data, role: 'SUPER_ADMIN' }, surveyorToken)
          )
        ).status,
        400
      );
      assert.equal(
        (await profile(request('/api/auth/profile', 'PUT', data, surveyorToken))).status,
        200
      );
      const row = (await database.query("SELECT role,name FROM users WHERE id='one'")).rows[0];
      assert.equal(row.role, 'SURVEYOR');
      assert.equal(row.name, 'Nama Baru');
    }
  );

  await t.test('database blocks anonymous reads/writes including users and sessions', async () => {
    await database.exec('SET ROLE anon');
    await assert.rejects(database.query('SELECT * FROM users'), /permission denied/);
    await assert.rejects(database.query('DELETE FROM poles'), /permission denied/);
    await assert.rejects(database.query('SELECT * FROM auth_sessions'), /permission denied/);
    await database.exec('RESET ROLE');
  });

  await t.test('database rate limit is shared and enforced', async () => {
    const { consumeLimit } = load('src/lib/security/store.ts');
    assert.equal(await consumeLimit('test', 2, 60), true);
    assert.equal(await consumeLimit('test', 2, 60), true);
    assert.equal(await consumeLimit('test', 2, 60), false);
  });

  await t.test('logout revokes session; a password change invalidates other sessions', async () => {
    const logout = load('src/app/api/auth/logout/route.ts').POST;
    const me = load('src/app/api/auth/me/route.ts').GET;
    assert.equal(
      (await logout(request('/api/auth/logout', 'POST', undefined, surveyorToken))).status,
      200
    );
    assert.equal((await me(request('/api/auth/me', 'GET', undefined, surveyorToken))).status, 401);
    await database.query("UPDATE users SET password=$1 WHERE id='admin'", [
      await hashPassword('changed-passphrase-2026'),
    ]);
    assert.equal((await me(request('/api/auth/me', 'GET', undefined, adminToken))).status, 401);
  });

  await t.test('expired login does not delete or upload queued offline surveys', async () => {
    const queue = load('src/lib/offline/offlineQueue.ts');
    await queue.saveToOfflineQueue({
      id: 'offline-test',
      createdAt: new Date().toISOString(),
      road: 'Uji',
      kecamatan: 'Uji',
      kelurahan: 'Uji',
      payload: { surveyorId: 'one' },
    });
    const calls = [];
    fetchMock = async (url) => {
      calls.push(url);
      return Response.json({ success: false }, { status: 401 });
    };
    const res = await queue.syncOfflineQueue();
    assert.equal(res.success, false);
    assert.equal(await queue.getOfflineQueueCount(), 1);
    assert.deepEqual(calls, ['/api/auth/me']);
  });

  await t.test('image signatures and CSV formula escaping', () => {
    const { allowedImage } = load('src/lib/security/image.ts');
    assert.equal(allowedImage(Buffer.from('<svg onload=alert(1)>'), 'image/jpeg'), false);
    assert.equal(allowedImage(Uint8Array.from([255, 216, 255, 224]), 'image/jpeg'), true);
    const { generateCsv } = load('src/lib/gis/exportSpatialData.ts');
    const csv = generateCsv([
      {
        id: 'x',
        road: '=HYPERLINK("https://example.test")',
        poleLatitude: 0,
        poleLongitude: 0,
        providerId: 'x',
      },
    ]);
    assert.ok(csv.includes("'=HYPERLINK"));
  });
  await database.close();
});
