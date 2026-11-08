/**
 * Fixed-size object pool. Objects are created once and recycled, so busy
 * fights allocate nothing. Items are visited in index order, which keeps the
 * simulation deterministic.
 *
 * Pooled objects need an `active` boolean.
 *
 * @template {{active: boolean}} T
 */
export class Pool {
    /** @type {T[]} */
    items;
    #free = [];

    /**
     * @param {() => T} factory
     * @param {number} size
     */
    constructor(factory, size) {
        this.items = Array.from({ length: size }, factory);
        for (let i = size - 1; i >= 0; i--) this.#free.push(i);
    }

    /** @returns {T | null} an inactive item, now active; null when the pool is full */
    acquire() {
        while (this.#free.length > 0) {
            const item = this.items[this.#free.pop()];
            if (!item.active) {
                item.active = true;
                return item;
            }
        }
        this.#rebuildFree();
        if (this.#free.length === 0) return null;
        return this.acquire();
    }

    /** Return every item to the pool. */
    clear() {
        for (const item of this.items) item.active = false;
        this.#rebuildFree();
    }

    /** Deactivated items go back to the free list lazily, in a deterministic order. */
    #rebuildFree() {
        this.#free.length = 0;
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (!this.items[i].active) this.#free.push(i);
        }
    }

    get activeCount() {
        let n = 0;
        for (const item of this.items) if (item.active) n++;
        return n;
    }
}
