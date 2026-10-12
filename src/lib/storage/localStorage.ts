import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

// Primary upload directory candidates:
// 1. Explicit environment variable UPLOAD_DIR (e.g. /home/admin/gis-deploy/shared/uploads)
// 2. Standard shared directory on VPS if deployed under /home/admin/gis-deploy/shared
// 3. Fallback to local public/uploads directory within the project
function getTargetUploadDirs(): { persistentDir: string; publicDir: string } {
  const publicDir = path.resolve(process.cwd(), 'public', 'uploads', 'poles');

  let persistentDir = publicDir;

  if (process.env.UPLOAD_DIR) {
    persistentDir = path.resolve(process.env.UPLOAD_DIR, 'poles');
  } else {
    // Check if running on VPS deployment structure
    const vpsShared = '/home/admin/gis-deploy/shared/uploads/poles';
    try {
      const parentDir = path.dirname(vpsShared);
      if (fs.existsSync(parentDir)) {
        persistentDir = vpsShared;
      }
    } catch {
      // Fallback remains publicDir
    }
  }

  return { persistentDir, publicDir };
}

/**
 * Saves photo buffer directly to the VPS local disk.
 * Writes to both persistent shared storage and local public directory for zero-downtime serving.
 */
export async function savePhotoToVPS(
  buffer: Buffer,
  fileName: string
): Promise<{ fileId: string; photoUrl: string; fileName: string }> {
  const { persistentDir, publicDir } = getTargetUploadDirs();

  // Ensure persistent directory exists
  if (!fs.existsSync(persistentDir)) {
    fs.mkdirSync(persistentDir, { recursive: true });
  }

  const persistentFilePath = path.join(persistentDir, fileName);
  await fs.promises.writeFile(persistentFilePath, buffer);

  // If publicDir is different from persistentDir, also save/link to publicDir
  if (path.resolve(publicDir) !== path.resolve(persistentDir)) {
    try {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const publicFilePath = path.join(publicDir, fileName);
      await fs.promises.writeFile(publicFilePath, buffer);
    } catch (copyErr) {
      console.warn('[LocalStorage] Warning copying to publicDir:', copyErr);
    }
  }

  const fileId = `vps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const photoUrl = `/uploads/poles/${fileName}`;

  return {
    fileId,
    photoUrl,
    fileName,
  };
}

/**
 * Resolves the physical path of a requested upload file across persistent and public directories.
 */
export function resolveLocalPhotoPath(
  subPath: string
): { filePath: string; mimeType: string } | null {
  // Prevent directory traversal
  const safeSubPath = subPath.replace(/^(\.\.(\/|\\|$))+/, '').replace(/[/\\]+/g, path.sep);
  const cleanName = path.basename(safeSubPath);
  if (!cleanName || cleanName.startsWith('.')) return null;

  const { persistentDir, publicDir } = getTargetUploadDirs();
  const candidates = [
    path.join(persistentDir, cleanName),
    path.join(publicDir, cleanName),
    path.resolve(process.cwd(), 'public', 'uploads', 'poles', cleanName),
    path.resolve('/home/admin/gis-deploy/shared/uploads/poles', cleanName),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(cleanName).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';

        return { filePath: candidate, mimeType };
      }
    } catch {
      // Ignore candidate check error
    }
  }

  return null;
}
