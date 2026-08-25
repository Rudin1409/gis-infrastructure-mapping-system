import { Pole, CreatePoleInput } from '@/types/pole';

export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  process.env.APPS_SCRIPT_URL ||
  '';

export function isAppsScriptConfigured(): boolean {
  return !!APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('https://script.google.com');
}

export async function uploadPhotoViaAppsScript(
  base64Data: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<{ fileId: string; photoUrl: string } | null> {
  if (!isAppsScriptConfigured()) return null;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadPhoto',
        base64: base64Data,
        fileName,
        mimeType,
      }),
    });

    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (e) {
    console.error('Failed to upload photo via Apps Script:', e);
    return null;
  }
}

export async function savePoleViaAppsScript(pole: Pole): Promise<boolean> {
  if (!isAppsScriptConfigured()) return false;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'savePole',
        data: pole,
      }),
    });

    const json = await res.json();
    return !!json.success;
  } catch (e) {
    console.error('Failed to save pole via Apps Script:', e);
    return false;
  }
}
