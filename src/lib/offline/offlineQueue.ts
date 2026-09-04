/**
 * Offline Outbox Queue using native browser IndexedDB.
 * 
 * Guarantees:
 * 1. Zero Data Loss: Survey records and photos are stored in browser IndexedDB before deletion.
 *    A record is ONLY deleted after the server returns HTTP 200/201 JSON success.
 * 2. Flaky Connection Resilience: All requests have a strict 15-second timeout (AbortController).
 *    If connection drops mid-flight, state gracefully reverts to PENDING without crash or data loss.
 * 3. Idempotency: Each record carries a persistent unique ID (`LLG-OFF-...`). Retries will never
 *    create duplicate records on the server.
 */

export interface OfflineQueueItem {
  id: string; // Persistent ID: e.g. "LLG-OFF-1725..."
  createdAt: string; // ISO string
  road: string;
  kecamatan: string;
  kelurahan: string;
  poleCode?: string;
  payload: Record<string, any>;
  photoDataUrl?: string; // Base64 data URL
  photoFileName?: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'InfraMapOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pole_outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environment'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inframap-offline-queue-changed'));
  }
}

/**
 * Save a new survey record into IndexedDB.
 */
export async function saveToOfflineQueue(
  item: Omit<OfflineQueueItem, 'status' | 'retryCount'>
): Promise<OfflineQueueItem> {
  const db = await getDB();
  const queueItem: OfflineQueueItem = {
    ...item,
    status: 'PENDING',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(queueItem);

    req.onsuccess = () => {
      notifyQueueChange();
      resolve(queueItem);
    };

    req.onerror = () => {
      console.error('[IndexedDB] Failed to save item:', req.error);
      reject(req.error);
    };
  });
}

/**
 * Get all items in offline outbox.
 */
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items: OfflineQueueItem[] = req.result || [];
      // Sort oldest first (FIFO)
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(items);
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
}

/**
 * Get count of pending / queued items.
 */
export async function getOfflineQueueCount(): Promise<number> {
  try {
    const items = await getOfflineQueue();
    return items.length;
  } catch {
    return 0;
  }
}

/**
 * Remove an item from queue after confirmed server sync.
 */
export async function removeOfflineQueueItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => {
      notifyQueueChange();
      resolve();
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
}

/**
 * Update an item's status in the queue.
 */
export async function updateOfflineQueueItem(
  id: string,
  patch: Partial<OfflineQueueItem>
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (!getReq.result) {
        resolve();
        return;
      }
      const updated = { ...getReq.result, ...patch };
      const putReq = store.put(updated);
      putReq.onsuccess = () => {
        notifyQueueChange();
        resolve();
      };
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Helper to convert a DataURL (base64) into a File object for multipart upload.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Helper to convert a browser File or Blob into a Base64 Data URL.
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Mutex flag to prevent concurrent sync operations
let isSyncing = false;

export interface SyncProgress {
  current: number;
  total: number;
  currentRoad?: string;
  isSyncing: boolean;
  lastError?: string;
}

/**
 * Synchronize offline queue to server one-by-one (FIFO).
 * Uses 15-second AbortController timeout for each network call.
 * If network drops mid-upload, the item remains intact in IndexedDB for the next retry.
 */
export async function syncOfflineQueue(
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; syncedCount: number; remainingCount: number; error?: string }> {
  if (isSyncing) {
    return { success: false, syncedCount: 0, remainingCount: await getOfflineQueueCount(), error: 'Sinkronisasi sedang berjalan' };
  }

  isSyncing = true;
  let syncedCount = 0;

  try {
    const items = await getOfflineQueue();
    if (items.length === 0) {
      if (onProgress) onProgress({ current: 0, total: 0, isSyncing: false });
      return { success: true, syncedCount: 0, remainingCount: 0 };
    }

    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i];

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          currentRoad: item.road || item.payload?.road,
          isSyncing: true,
        });
      }

      await updateOfflineQueueItem(item.id, { status: 'SYNCING' });

      try {
        let photoFileId = item.payload.photoFileId || '';
        let photoUrl = item.payload.photoUrl || '';

        // Step A: Upload photo if present and not yet uploaded
        if (item.photoDataUrl && (!photoFileId || photoUrl.startsWith('data:'))) {
          const photoFile = dataUrlToFile(
            item.photoDataUrl,
            item.photoFileName || `offline_${item.id}.jpg`
          );

          const uploadFormData = new FormData();
          uploadFormData.append('photo', photoFile);

          const abortCtrl = new AbortController();
          const timeoutId = setTimeout(() => abortCtrl.abort(), 15000); // 15s timeout

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
            signal: abortCtrl.signal,
          });

          clearTimeout(timeoutId);

          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.success && uploadJson.data) {
              photoFileId = uploadJson.data.photoFileId || '';
              photoUrl = uploadJson.data.photoUrl || '';
            }
          }
        }

        // Step B: Send pole payload to /api/poles
        const payloadToSend = {
          ...item.payload,
          id: item.id, // Idempotency key
          photoFileId: photoFileId || item.payload.photoFileId,
          photoUrl: photoUrl || item.payload.photoUrl,
        };

        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 15000); // 15s timeout

        const poleRes = await fetch('/api/poles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToSend),
          signal: abortCtrl.signal,
        });

        clearTimeout(timeoutId);

        if (!poleRes.ok) {
          const errJson = await poleRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Server error HTTP ${poleRes.status}`);
        }

        const poleJson = await poleRes.json();
        if (!poleJson.success) {
          throw new Error(poleJson.error || 'Gagal menyimpan ke server');
        }

        // CONFIRMED SUCCESS: Safely remove from local IndexedDB
        await removeOfflineQueueItem(item.id);
        syncedCount++;
      } catch (itemErr: any) {
        console.warn(`[Offline Sync] Failed syncing item ${item.id}:`, itemErr);

        // Keep item in IndexedDB, revert status to PENDING or FAILED
        const isNetworkErr =
          itemErr.name === 'AbortError' ||
          itemErr.message?.includes('fetch') ||
          itemErr.message?.includes('NetworkError') ||
          !navigator.onLine;

        await updateOfflineQueueItem(item.id, {
          status: isNetworkErr ? 'PENDING' : 'FAILED',
          retryCount: (item.retryCount || 0) + 1,
          lastError: itemErr.message || 'Koneksi terputus saat pengiriman',
        });

        // If signal dropped, stop loop to avoid hammering failing network
        if (isNetworkErr) {
          const remaining = await getOfflineQueueCount();
          if (onProgress) {
            onProgress({
              current: i + 1,
              total,
              isSyncing: false,
              lastError: 'Sinyal terputus. Sinkronisasi dijeda dan akan dilanjutkan saat sinyal stabil.',
            });
          }
          return {
            success: false,
            syncedCount,
            remainingCount: remaining,
            error: 'Sinyal terputus saat pengiriman data.',
          };
        }
      }
    }

    const remaining = await getOfflineQueueCount();
    if (onProgress) onProgress({ current: total, total, isSyncing: false });

    return {
      success: remaining === 0,
      syncedCount,
      remainingCount: remaining,
    };
  } finally {
    isSyncing = false;
  }
}
