/**
 * On-device storage. Text goes in localStorage (small, synchronous);
 * photos go in IndexedDB (much larger quota, stores Blobs natively).
 * Every call fails soft: private windows and full disks must never break the app.
 */

const PREFIX = 'scrawl:'

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Returns false when the write didn't stick (quota, private mode). */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function clearLocal() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  } catch {
    // nothing to clear
  }
}

// ---------- Photos (IndexedDB) ----------

const DB = 'scrawl'
const STORE = 'photos'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putPhoto = (ref: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, ref)).then(() => true, () => false)
export const getPhoto = (ref: string) => tx<Blob | undefined>('readonly', (s) => s.get(ref)).catch(() => undefined)
const photoKeys = () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).catch(() => [] as IDBValidKey[])
const deletePhoto = (ref: string) => tx('readwrite', (s) => s.delete(ref)).catch(() => undefined)

/** Drops photos nothing points at any more (deleted posts, abandoned drafts). */
export async function prunePhotos(keep: Set<string>) {
  for (const key of await photoKeys()) if (!keep.has(String(key))) await deletePhoto(String(key))
}

/** Wipes everything Scrawl stored on this device. */
export async function clearAll() {
  clearLocal()
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}
