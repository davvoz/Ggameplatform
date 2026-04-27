/**
 * Pooled 2D vector. Avoid `new Vec2()` in hot loops; use a TempVec pool.
 */
export class Vec2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy(v) { this.x = v.x; this.y = v.y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    scale(s) { this.x *= s; this.y *= s; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length() { return Math.hypot(this.x, this.y); }
    normalize() {
        const l = this.length();
        if (l > 1e-6) { this.x /= l; this.y /= l; }
        return this;
    }
    dot(v) { return this.x * v.x + this.y * v.y; }
}

/**
 * Static pool of reusable vectors. Acquire/release scope-tight.
 * Used by physics functions to avoid GC pressure.
 */
class VecPool {
    constructor(size = 32) {
        this._items = new Array(size);
        for (let i = 0; i < size; i++) this._items[i] = new Vec2();
        this._idx = 0;
    }
    acquire(x = 0, y = 0) {
        const v = this._items[this._idx++ % this._items.length];
        v.x = x; v.y = y;
        return v;
    }
    reset() { this._idx = 0; }
}

export const TempVec = new VecPool(64);
