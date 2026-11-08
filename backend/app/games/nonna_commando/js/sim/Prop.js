import { Ev } from './Events.js';

/**
 * Breakable things on the street. Barrels go off and take enemies with them
 * (CHAIN), crates hold supplies, the Supremo's cardboard cut-outs are
 * vandalism bonuses, barricades block the road until destroyed.
 */
export const PropTypes = Object.freeze({
    barrel: { hp: 3, w: 14, h: 18, points: 100, explode: 36, material: 'metal' },
    crate: { hp: 4, w: 18, h: 16, points: 50, material: 'wood' },
    cutout: { hp: 2, w: 16, h: 34, points: 500, label: 'VANDAL!', material: 'wood' },
    cake: { hp: 3, w: 18, h: 18, points: 200, material: 'wood' },
    speaker: { hp: 6, w: 18, h: 26, points: 300, material: 'metal' },
    barricade: { hp: 30, w: 20, h: 40, points: 500, blocks: true, material: 'wood' },
    gate: { hp: 45, w: 22, h: 54, points: 1000, blocks: true, material: 'metal' },
});

export class Prop {
    active = true;
    type;
    def;
    x;
    y;
    w;
    h;
    hp;
    flash = 0;
    drop;
    /** blocker box for bodies, when the prop is solid */
    blocker = null;

    constructor(type, x, y, drop = '') {
        this.type = type;
        this.def = PropTypes[type];
        this.x = x;
        this.y = y;
        this.w = this.def.w;
        this.h = this.def.h;
        this.hp = this.def.hp;
        this.drop = drop;
        if (this.def.blocks) {
            this.blocker = { active: true, x: x - this.w / 2, y: y - 400, w: this.w, h: 400 };
        }
    }

    get left() { return this.x - this.w / 2; }
    get top() { return this.y - this.h; }

    /** @param {import('./World.js').World} world */
    damage(world, amount, kind) {
        if (!this.active) return;
        if (kind === 'flame' && this.def.material === 'metal') amount *= 0.5;
        this.hp -= amount;
        this.flash = 3;
        world.events.emit(Ev.HIT, this.x, this.y - this.h / 2, 0, 0, this.def.material);
        if (this.hp <= 0) this.#break(world);
    }

    update() {
        if (this.flash > 0) this.flash--;
    }

    #break(world) {
        this.active = false;
        if (this.blocker) this.blocker.active = false;
        world.events.emit(Ev.PROP_BREAK, this.x, this.y - this.h / 2, 0, 0, this.type);
        world.score.award(this.def.points, this.x, this.y - this.h - 4, this.def.label ?? '');
        if (this.drop) world.dropPickup(this.drop, this.x, this.y - this.h / 2);
        if (this.def.explode) world.explode(this.x, this.y - 8, this.def.explode, 6, 'neutral', 'fire');
        if (this.def.blocks) world.events.emit(Ev.GO);
    }
}
