/**
 * Utility to convert Google Drive share/view URLs into reliable direct image embed URLs
 * using Google's high-performance image CDN (lh3.googleusercontent.com & drive.google.com/thumbnail)
 */

export function extractGoogleDriveFileId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();

  // If already a local VPS / offline base64 / relative URL, it is NOT a Google Drive file
  if (
    str.startsWith('vps_') ||
    str.startsWith('local_') ||
    str.startsWith('/') ||
    str.startsWith('data:') ||
    str.includes('/uploads/')
  ) {
    return null;
  }

  // If already a raw Google Drive fileId (alphanumeric string around 25-50 chars without slashes)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(str)) {
    return str;
  }

  // Pattern: id=FILE_ID
  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Pattern: /d/FILE_ID/
  const dPathMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dPathMatch && dPathMatch[1]) {
    return dPathMatch[1];
  }

  // Pattern: /file/d/FILE_ID
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  return null;
}

export function formatGoogleDriveImageUrl(
  urlOrFileId?: string,
  fileId?: string,
  width = 1000
): string | undefined {
  if (!urlOrFileId && !fileId) return undefined;

  // 1. Direct pass-through for local VPS uploads, offline data URLs, or relative assets
  if (
    urlOrFileId &&
    (urlOrFileId.startsWith('/') ||
      urlOrFileId.startsWith('data:') ||
      urlOrFileId.includes('/uploads/'))
  ) {
    return urlOrFileId;
  }

  // 2. Resolve Google Drive ID (ignore non-drive local/vps IDs)
  const validFileId =
    fileId && !fileId.startsWith('vps_') && !fileId.startsWith('local_')
      ? extractGoogleDriveFileId(fileId)
      : null;

  const targetId = validFileId || extractGoogleDriveFileId(urlOrFileId);

  if (targetId) {
    // lh3.googleusercontent.com is Google's official public image CDN for Drive files
    return `https://lh3.googleusercontent.com/d/${targetId}=w${width}`;
  }

  return urlOrFileId;
}

export function getGoogleDriveThumbnailUrl(
  urlOrFileId?: string,
  fileId?: string,
  width = 800
): string | undefined {
  if (
    urlOrFileId &&
    (urlOrFileId.startsWith('/') ||
      urlOrFileId.startsWith('data:') ||
      urlOrFileId.includes('/uploads/'))
  ) {
    return urlOrFileId;
  }

  const validFileId =
    fileId && !fileId.startsWith('vps_') && !fileId.startsWith('local_')
      ? extractGoogleDriveFileId(fileId)
      : null;

  const targetId = validFileId || extractGoogleDriveFileId(urlOrFileId);

  if (targetId) {
    return `https://drive.google.com/thumbnail?id=${targetId}&sz=w${width}`;
  }
  return urlOrFileId;
}
