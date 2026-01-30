// IndexedDB wrapper for CIM Training App
// Provides async persistence layer; localStorage remains as sync fallback.

const IDBStorage = {
  DB_NAME: 'cim-training-db',
  DB_VERSION: 1,
  STORE_NAME: 'appData',
  DATA_KEY: 'userData',

  _db: null,
  _supported: false,

  // Check if IndexedDB is available (fails in Safari private browsing)
  isSupported() {
    return this._supported;
  },

  // Open (or create) the database. Returns true if successful.
  async init() {
    if (!window.indexedDB) {
      console.log('[IDB] IndexedDB not available');
      this._supported = false;
      return false;
    }

    try {
      this._db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onerror = () => {
          console.warn('[IDB] Failed to open database:', request.error);
          reject(request.error);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME);
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };
      });

      this._supported = true;
      console.log('[IDB] Database opened successfully');
      return true;
    } catch (e) {
      console.warn('[IDB] Init failed (private browsing?):', e);
      this._supported = false;
      return false;
    }
  },

  // Read data for a given key. Returns parsed object or null.
  async getData(key) {
    if (!this._db) return null;

    try {
      return await new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get(key || this.DATA_KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.warn('[IDB] Read error:', request.error);
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn('[IDB] getData failed:', e);
      return null;
    }
  },

  // Write data for a given key.
  async saveData(data, key) {
    if (!this._db) return false;

    try {
      await new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.put(data, key || this.DATA_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('[IDB] Write error:', request.error);
          reject(request.error);
        };
      });
      return true;
    } catch (e) {
      console.warn('[IDB] saveData failed:', e);
      return false;
    }
  },

  // Delete data for a given key.
  async deleteData(key) {
    if (!this._db) return false;

    try {
      await new Promise((resolve, reject) => {
        const tx = this._db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.delete(key || this.DATA_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (e) {
      console.warn('[IDB] deleteData failed:', e);
      return false;
    }
  }
};
