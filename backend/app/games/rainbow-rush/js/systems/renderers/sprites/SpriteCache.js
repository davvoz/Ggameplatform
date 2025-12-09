/**
 * SpriteCache - Sistema di caching intelligente per sprite nemici
 * Pre-carica sprite comuni e gestisce la memoria in modo efficiente
 */

export class SpriteCache {
    constructor(maxCacheSize = 50) {
        this.cache = new Map();
        this.maxCacheSize = maxCacheSize;
        this.accessCount = new Map();
        this.lastAccessTime = new Map();
    }

    /**
     * Get cache key for enemy configuration
     */
    getCacheKey(config) {
        return `${config.id}_${config.width}_${config.height}`;
    }

    /**
     * Get sprite from cache
     */
    get(config) {
        const key = this.getCacheKey(config);
        
        if (this.cache.has(key)) {
            // Update access tracking
            this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
            this.lastAccessTime.set(key, Date.now());
            
            return this.cache.get(key);
        }
        
        return null;
    }

    /**
     * Store sprite in cache
     */
    set(config, frames) {
        const key = this.getCacheKey(config);
        
        // Evict old entries if cache is full
        if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
            this.evictLeastUsed();
        }
        
        this.cache.set(key, frames);
        this.accessCount.set(key, 1);
        this.lastAccessTime.set(key, Date.now());
    }

    /**
     * Evict least recently used entry
     */
    evictLeastUsed() {
        let minScore = Infinity;
        let keyToRemove = null;
        
        const now = Date.now();
        
        for (const [key, frames] of this.cache.entries()) {
            const accessCount = this.accessCount.get(key) || 0;
            const lastAccess = this.lastAccessTime.get(key) || 0;
            const timeSinceAccess = now - lastAccess;
            
            // Score: lower is worse (less frequently used, accessed long ago)
            const score = accessCount / (1 + timeSinceAccess / 1000);
            
            if (score < minScore) {
                minScore = score;
                keyToRemove = key;
            }
        }
        
        if (keyToRemove) {
            this.cache.delete(keyToRemove);
            this.accessCount.delete(keyToRemove);
            this.lastAccessTime.delete(keyToRemove);
        }
    }

    /**
     * Pre-load common enemy sprites
     */
    preload(enemyConfigs) {
        enemyConfigs.forEach(config => {
            if (!this.cache.has(this.getCacheKey(config))) {
                // Mark as pre-loaded with high priority
                this.accessCount.set(this.getCacheKey(config), 10);
            }
        });
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.accessCount.clear();
        this.lastAccessTime.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            entries: Array.from(this.cache.keys()),
            mostAccessed: this.getMostAccessed(5)
        };
    }

    /**
     * Get most accessed sprites
     */
    getMostAccessed(limit = 5) {
        const entries = Array.from(this.accessCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return entries.map(([key, count]) => ({ key, count }));
    }
}
