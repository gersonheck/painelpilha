export type StorageWriteResult = 'durable' | 'session' | 'memory';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): StorageWriteResult;
  removeItem(key: string): void;
}

interface BrowserStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStore = new Map<string, string>();

function availableStores(): BrowserStorageAdapter[] {
  if (typeof window === 'undefined') return [];
  const stores: BrowserStorageAdapter[] = [];
  try {
    stores.push(window.localStorage);
  } catch {
    // Access to localStorage can fail before any adapter method is called.
  }
  try {
    stores.push(window.sessionStorage);
  } catch {
    // Access to sessionStorage can fail independently from localStorage.
  }
  return stores;
}

export const SafeStorage: StorageAdapter = {
  getItem(key) {
    for (const store of availableStores()) {
      try {
        const value = store.getItem(key);
        if (value !== null) return value;
      } catch {
        // Continue with the next adapter when browser storage is unavailable.
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key, value) {
    const stores = availableStores();
    for (let index = 0; index < stores.length; index += 1) {
      const store = stores[index];
      try {
        store.setItem(key, value);
        stores.forEach((otherStore, otherIndex) => {
          if (otherIndex === index) return;
          try { otherStore.removeItem(key); } catch { /* Best-effort stale copy cleanup. */ }
        });
        memoryStore.delete(key);
        return index === 0 ? 'durable' : 'session';
      } catch {
        try { store.removeItem(key); } catch { /* Best-effort stale primary cleanup. */ }
      }
    }
    memoryStore.set(key, value);
    return 'memory';
  },

  removeItem(key) {
    for (const store of availableStores()) {
      try {
        store.removeItem(key);
      } catch {
        // Removal remains best-effort across every adapter.
      }
    }
    memoryStore.delete(key);
  },
};
