// Simple in-memory LRU-style cache to reduce DB load
class Cache {
  constructor() {
    this.store = new Map();
  }

  // ttlMs defaults to 5 minutes
  set(key, value, ttlMs = 300000) {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new Cache();
