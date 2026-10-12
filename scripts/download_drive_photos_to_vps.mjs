import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL belum diisi.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Resolve upload target directory
function getTargetDir() {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR, 'poles');
  }
  const vpsShared = '/home/admin/gis-deploy/shared/uploads/poles';
  try {
    if (fs.existsSync(path.dirname(vpsShared))) {
      return vpsShared;
    }
  } catch {}
  return path.resolve(process.cwd(), 'public', 'uploads', 'poles');
}

const targetDir = getTargetDir();
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function extractDriveId(urlOrId) {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  if (
    str.startsWith('vps_') ||
    str.startsWith('local_') ||
    str.startsWith('/') ||
    str.startsWith('data:')
  ) {
    return null;
  }
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(str)) {
    return str;
  }
  const idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/) || str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

async function downloadPhoto(driveId, destPath) {
  const urls = [
    `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
    `https://drive.google.com/uc?id=${driveId}&export=view`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.startsWith('image/')) {
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > 500) {
            await fs.promises.writeFile(destPath, buffer);
            return true;
          }
        }
      }
    } catch {
      // Try next url
    }
  }
  return false;
}

async function main() {
  console.log('🚀 Memulai sinkronisasi foto dari Google Drive ke disk lokal VPS...');
  console.log(`📁 Target folder: ${targetDir}`);

  const { rows } = await pool.query(`
    SELECT id, pole_code, photo_file_id, photo_url
    FROM poles
    WHERE (photo_url LIKE '%drive.google.com%' OR photo_url LIKE '%googleusercontent%' OR (photo_file_id IS NOT NULL AND photo_file_id NOT LIKE 'vps_%' AND photo_file_id NOT LIKE 'local_%'))
      AND (photo_url NOT LIKE '/uploads/%')
    ORDER BY created_at DESC
  `);

  console.log(`📊 Ditemukan ${rows.length} tiang yang fotonya masih tersimpan di Google Drive.`);

  if (rows.length === 0) {
    console.log('✅ Seluruh foto sudah tersimpan lokal di VPS!');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  // Process in concurrent batches of 5 to respect Google CDN rate limits
  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (row) => {
        const driveId = extractDriveId(row.photo_file_id) || extractDriveId(row.photo_url);
        if (!driveId) {
          skipCount++;
          return;
        }

        const safeCode = (row.pole_code || row.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `pole_${safeCode}_${driveId.substring(0, 8)}.jpg`;
        const destPath = path.join(targetDir, fileName);

        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
          // Already downloaded, just update DB
          await pool.query('UPDATE poles SET photo_url = $1 WHERE id = $2', [
            `/uploads/poles/${fileName}`,
            row.id,
          ]);
          skipCount++;
          return;
        }

        const ok = await downloadPhoto(driveId, destPath);
        if (ok) {
          await pool.query('UPDATE poles SET photo_url = $1 WHERE id = $2', [
            `/uploads/poles/${fileName}`,
            row.id,
          ]);
          successCount++;
        } else {
          failCount++;
        }
      })
    );

    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= rows.length) {
      console.log(
        `⏳ Progress: ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length} (Berhasil: ${successCount}, Sudah ada: ${skipCount}, Gagal: ${failCount})`
      );
    }
  }

  console.log('\n===========================================================');
  console.log(
    `🎉 SELESAI! Berhasil: ${successCount}, Lewati (Sudah Ada): ${skipCount}, Gagal: ${failCount}`
  );
  console.log('===========================================================');
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
