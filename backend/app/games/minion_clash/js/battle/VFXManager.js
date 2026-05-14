/**
 * Lightweight VFX sink. Stores transient visual effects (spell circles,
 * impact flashes). Renderer reads & renders; entries fade out and self-purge.
 */
export class VFXManager {
    constructor() { this._items = []; }

    add(item) {
        this._items.push({ life: 0, maxLife: 0.6, ...item });
    }

    update(dt) {
        for (let i = this._items.length - 1; i >= 0; i--) {
            const it = this._items[i];
            it.life += dt;
            if (it.life >= it.maxLife) this._items.splice(i, 1);
        }
    }

    list() { return this._items; }
}
