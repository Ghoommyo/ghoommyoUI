// localStorage can be missing (static rendering) or throw (private mode), so every call is guarded.
export const storage = {
  async get(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {}
  },
  async remove(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {}
  },
};
