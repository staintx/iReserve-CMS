import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@ireserve_cache_";

export const CACHE_KEYS = {
  PACKAGES: "packages",
  BOOKINGS: "customer_bookings",
  INQUIRIES: "customer_inquiries",
  STAFF_SHIFTS: "staff_shifts_active",
  NOTIFICATIONS: "notifications_feed",
};

/**
 * Cache data persistently to local device storage.
 * @param {string} key
 * @param {*} data
 */
export const cacheData = async (key, data) => {
  try {
    const payload = JSON.stringify({
      timestamp: Date.now(),
      data,
    });
    await AsyncStorage.setItem(`${PREFIX}${key}`, payload);
  } catch (error) {
    console.warn(`Failed to cache data for key: ${key}`, error);
  }
};

/**
 * Retrieve cached data from local device storage.
 * @param {string} key
 * @param {number} [maxAgeMs] Optional cache expiry in milliseconds
 * @returns {Promise<*|null>}
 */
export const getCachedData = async (key, maxAgeMs = null) => {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp) return parsed;

    if (maxAgeMs && Date.now() - parsed.timestamp > maxAgeMs) {
      // Stale data expired
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`Failed to read cached data for key: ${key}`, error);
    return null;
  }
};

/**
 * Remove specific cached entry.
 * @param {string} key
 */
export const removeCachedData = async (key) => {
  try {
    await AsyncStorage.removeItem(`${PREFIX}${key}`);
  } catch (error) {
    console.warn(`Failed to remove cached key: ${key}`, error);
  }
};

/**
 * Clear all iReserve offline cached entries.
 */
export const clearAllOfflineCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
  } catch (error) {
    console.warn("Failed to clear offline cache", error);
  }
};

export default {
  CACHE_KEYS,
  cacheData,
  getCachedData,
  removeCachedData,
  clearAllOfflineCache,
};
