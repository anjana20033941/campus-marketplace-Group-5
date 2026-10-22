import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory fallback map ensures authentication sessions and keys
// are never blocked even if the native storage module is null or unlinked in Expo Go.
const memoryStore = new Map<string, string>();

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof AsyncStorage !== "undefined" && AsyncStorage?.getItem) {
        const val = await AsyncStorage.getItem(key);
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      }
      return memoryStore.get(key) ?? null;
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.getItem failed for "${key}", using memory store:`, err);
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    try {
      if (typeof AsyncStorage !== "undefined" && AsyncStorage?.setItem) {
        await AsyncStorage.setItem(key, value);
      }
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.setItem failed for "${key}", retained in memory:`, err);
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      if (typeof AsyncStorage !== "undefined" && AsyncStorage?.removeItem) {
        await AsyncStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.removeItem failed for "${key}":`, err);
    }
  },

  async clear(): Promise<void> {
    memoryStore.clear();
    try {
      if (typeof AsyncStorage !== "undefined" && AsyncStorage?.clear) {
        await AsyncStorage.clear();
      }
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.clear failed:`, err);
    }
  },
};

export default safeStorage;
