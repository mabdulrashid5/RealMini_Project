import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'map_cache_';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_CACHE_SIZE = 50; // Maximum number of cached items

// Cache keys
const CACHE_KEYS = {
  ROUTES: 'routes',
  PLACES: 'places',
  GEOCODING: 'geocoding',
  TRAFFIC: 'traffic',
  NEARBY_PLACES: 'nearby_places'
};

class MapCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      stores: 0
    };
  }

  // Generate cache key
  generateKey(type, params) {
    const paramString = typeof params === 'object' 
      ? JSON.stringify(params) 
      : String(params);
    return `${CACHE_PREFIX}${type}_${this.hashCode(paramString)}`;
  }

  // Simple hash function
  hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Check if cache entry is valid
  isValidCacheEntry(entry) {
    if (!entry || !entry.timestamp) return false;
    const now = Date.now();
    return (now - entry.timestamp) < CACHE_EXPIRY_TIME;
  }

  // Get from memory cache first, then AsyncStorage
  async get(type, params) {
    const key = this.generateKey(type, params);
    
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (this.isValidCacheEntry(entry)) {
        this.cacheStats.hits++;
        return entry.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const entry = JSON.parse(cached);
        if (this.isValidCacheEntry(entry)) {
          // Store in memory cache for faster access
          this.memoryCache.set(key, entry);
          this.cacheStats.hits++;
          return entry.data;
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    this.cacheStats.misses++;
    return null;
  }

  // Store in both memory and AsyncStorage
  async set(type, params, data) {
    const key = this.generateKey(type, params);
    const entry = {
      data,
      timestamp: Date.now(),
      type,
      params
    };

    try {
      // Store in memory cache
      this.memoryCache.set(key, entry);
      
      // Limit memory cache size
      if (this.memoryCache.size > MAX_CACHE_SIZE) {
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }

      // Store in AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      this.cacheStats.stores++;
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Clear specific cache type
  async clear(type) {
    try {
      // Clear memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.type === type) {
          this.memoryCache.delete(key);
        }
      }

      // Clear AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const typeKeys = keys.filter(key => 
        key.startsWith(`${CACHE_PREFIX}${type}_`)
      );
      
      if (typeKeys.length > 0) {
        await AsyncStorage.multiRemove(typeKeys);
      }
      
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Clear all cache
  async clearAll() {
    try {
      this.memoryCache.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      this.cacheStats = { hits: 0, misses: 0, stores: 0 };
      return true;
    } catch (error) {
      console.error('Cache clearAll error:', error);
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(1)
      : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size
    };
  }

  // Cache-aware API wrapper for routes
  async getDirectionsWithCache(getDirections, origin, destination, apiKey, options = {}) {
    const cacheParams = { origin, destination, options };
    
    // Try cache first
    const cached = await this.get(CACHE_KEYS.ROUTES, cacheParams);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const result = await getDirections(origin, destination, apiKey, options);
    
    // Cache successful results
    if (result && result.routes && result.routes.length > 0) {
      await this.set(CACHE_KEYS.ROUTES, cacheParams, result);
    }
    
    return result;
  }

  // Cache-aware API wrapper for places
  async getNearbyPlacesWithCache(getNearbyPlaces, location, apiKey, options = {}) {
    const cacheParams = { location, options };
    
    // Try cache first
    const cached = await this.get(CACHE_KEYS.NEARBY_PLACES, cacheParams);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const result = await getNearbyPlaces(location, apiKey, options);
    
    // Cache successful results
    if (result && result.results && result.results.length > 0) {
      await this.set(CACHE_KEYS.NEARBY_PLACES, cacheParams, result);
    }
    
    return result;
  }

  // Cache-aware API wrapper for place autocomplete
  async getPlaceAutocompleteWithCache(getPlaceAutocomplete, input, apiKey, location = null, options = {}) {
    const cacheParams = { input, location, options };
    
    // Try cache first
    const cached = await this.get(CACHE_KEYS.PLACES, cacheParams);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const result = await getPlaceAutocomplete(input, apiKey, location, options);
    
    // Cache successful results
    if (result && result.predictions && result.predictions.length > 0) {
      await this.set(CACHE_KEYS.PLACES, cacheParams, result);
    }
    
    return result;
  }

  // Preload common routes/places for offline use
  async preloadCommonData(location, apiKey, commonDestinations = []) {
    const preloadPromises = [];

    // Preload nearby places for common categories
    const categories = ['gas_station', 'restaurant', 'hospital', 'shopping_mall'];
    categories.forEach(category => {
      preloadPromises.push(
        this.getNearbyPlacesWithCache(
          require('@/utils/googleMapsHelpers').getNearbyPlaces,
          location,
          apiKey,
          { type: category, radius: 5000 }
        )
      );
    });

    // Preload routes to common destinations
    commonDestinations.forEach(destination => {
      preloadPromises.push(
        this.getDirectionsWithCache(
          require('@/utils/googleMapsHelpers').getDirections,
          location,
          destination,
          apiKey,
          { alternatives: true }
        )
      );
    });

    try {
      await Promise.allSettled(preloadPromises);
      console.log('Map data preloaded successfully');
    } catch (error) {
      console.error('Error preloading map data:', error);
    }
  }
}

// Export singleton instance
export const mapCache = new MapCache();
export { CACHE_KEYS };
export default MapCache;
