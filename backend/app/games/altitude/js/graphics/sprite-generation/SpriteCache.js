/**
 * SpriteCache - Centralized sprite sheet cache.
 * Single Responsibility: store and retrieve generated sprite data by key.
 */
export class SpriteCache {
    #store = new Map();

    get(key) {
        return this.#store.get(key);
    }

    set(key, value) {
        this.#store.set(key, value);
    }

    has(key) {
        return this.#store.has(key);
    }

    clear() {
        this.#store.clear();
    }
}
