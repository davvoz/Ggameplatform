/**
 * Owns all live entities. Provides add/remove/iterate + cull-dead.
 * Entities are referenced by id elsewhere (e.g. projectiles target entities).
 */
export class EntityManager {
    constructor() {
        this._entities = [];
        this._byId = new Map();
        this._toAdd = [];
    }

    add(entity) {
        this._toAdd.push(entity);
    }

    flushAdditions() {
        if (this._toAdd.length === 0) return;
        for (const e of this._toAdd) {
            this._entities.push(e);
            this._byId.set(e.id, e);
        }
        this._toAdd.length = 0;
    }

    getById(id) { return this._byId.get(id); }

    forEach(cb) {
        for (const e of this._entities) cb(e);
    }

    list() { return this._entities; }

    cullDead() {
        let removed = 0;
        for (let i = this._entities.length - 1; i >= 0; i--) {
            const e = this._entities[i];
            if (e.isDead()) {
                this._entities.splice(i, 1);
                this._byId.delete(e.id);
                removed++;
            }
        }
        return removed;
    }
}
