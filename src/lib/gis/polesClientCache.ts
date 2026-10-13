import { Pole } from '@/types/pole';

export interface CachedPolesPayload {
  poles: Pole[];
  count: number;
  latest: string;
  cachedAt: number;
}

const DB_NAME = 'InfraMapCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'poles_cache';
const CACHE_KEY = 'global_poles';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('[PolesCache] Failed to open IndexedDB:', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[PolesCache] IndexedDB error:', err);
      resolve(null);
    }
  });
}

/**
 * Reads cached poles from browser IndexedDB storage (instant ~15ms).
 */
export async function getCachedPoles(): Promise<CachedPolesPayload | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        const result = request.result as CachedPolesPayload | undefined;
        if (result && Array.isArray(result.poles) && result.poles.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Saves poles to browser IndexedDB storage asynchronously.
 */
export async function saveCachedPoles(poles: Pole[], count: number, latest: string): Promise<void> {
  if (!poles || poles.length === 0) return;
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const payload: CachedPolesPayload = {
        poles,
        count: count || poles.length,
        latest: latest || '',
        cachedAt: Date.now(),
      };
      store.put(payload, CACHE_KEY);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });
}
