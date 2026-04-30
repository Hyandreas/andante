// Tiny IndexedDB queue for sessions ended while offline. On next app load,
// the AppShell flushes this to Supabase. Keep the surface area small —
// this is just a write-ahead log, not a sync engine.

const DB = "andante-offline";
const STORE = "pending-sessions";

export interface PendingSession {
  id: string; // local uuid
  startedAt: number;
  endedAt: number;
  durationSec: number;
  pieceId: string | null;
  focusType: string;
  notes: string;
}

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const enqueue = async (s: PendingSession) => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(s);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const drain = async (): Promise<PendingSession[]> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      store.clear();
      resolve(req.result as PendingSession[]);
    };
    req.onerror = () => reject(req.error);
  });
};
