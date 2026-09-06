import 'server-only';
import { Pole, CreatePoleInput } from '@/types/pole';

export const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

export function isAppsScriptConfigured(): boolean {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      !!process.env.APPS_SCRIPT_SHARED_SECRET
    );
  } catch {
    return false;
  }
}

export async function appsScriptFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!isAppsScriptConfigured()) throw new Error('Integrasi Apps Script aman belum dikonfigurasi.');
  const parsed = new URL(url);
  if (parsed.origin !== 'https://script.google.com') throw new Error('Invalid Apps Script origin');
  const body =
    typeof init.body === 'string'
      ? JSON.parse(init.body)
      : { action: parsed.searchParams.get('action') || 'getPoles' };
  return globalThis.fetch(APPS_SCRIPT_URL, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, token: process.env.APPS_SCRIPT_SHARED_SECRET }),
    signal: init.signal || AbortSignal.timeout(15000),
  });
}

export async function uploadPhotoViaAppsScript(
  base64Data: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<{ fileId: string; photoUrl: string } | null> {
  if (!isAppsScriptConfigured()) return null;

  try {
    const res = await appsScriptFetch(APPS_SCRIPT_URL, {
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
    const res = await appsScriptFetch(APPS_SCRIPT_URL, {
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
