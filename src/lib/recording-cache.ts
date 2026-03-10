/**
 * IndexedDB cache for pending audio recordings.
 * Persists recordings across tab crashes so they can be recovered.
 */

const DB_NAME = "speak-bright-recordings";
const STORE_NAME = "pending";
const DB_VERSION = 1;

interface CachedRecording {
  id: string;
  blob: Blob;
  timestamp: number;
  activityType: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheRecording(blob: Blob, activityType: string): Promise<string> {
  const db = await openDB();
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: CachedRecording = { id, blob, timestamp: Date.now(), activityType };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedRecordings(): Promise<CachedRecording[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeCachedRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOldRecordings(maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const recordings = await getCachedRecordings();
  const cutoff = Date.now() - maxAgeMs;
  for (const rec of recordings) {
    if (rec.timestamp < cutoff) {
      await removeCachedRecording(rec.id);
    }
  }
}
