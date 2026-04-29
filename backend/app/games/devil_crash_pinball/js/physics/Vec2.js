/**
 * 2D vector with mutable in-place operations.
 *
 * Hot-loop policy: physics code must NOT call `new Vec2()` inside per-frame
 * paths. Allocate vectors once at construction, reuse via `set()` / `copy()`.
 */
export class Vec2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y)  { this.x = x; this.y = y; return this; }
    copy(v)    { this.x = v.x; this.y = v.y; return this; }
    add(v)     { this.x += v.x; this.y += v.y; return this; }
    sub(v)     { this.x -= v.x; this.y -= v.y; return this; }
    scale(s)   { this.x *= s; this.y *= s; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length()   { return Math.hypot(this.x, this.y); }
    normalize() {
        const l = this.length();
        if (l > 1e-6) { this.x /= l; this.y /= l; }
        return this;
    }
    dot(v) { return this.x * v.x + this.y * v.y; }
}
