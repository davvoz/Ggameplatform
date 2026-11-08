import { Weapons } from '../config/Weapons.js';
import { Ev } from './Events.js';

/**
 * The gun in Nonna's hands: which weapon, how much ammo, when it can fire next,
 * and where the heavy machinegun is pointing in its sweep.
 *
 * Aim steps go from -4 (straight up) through 0 (forward) to +4 (straight
 * down), 22.5 degrees each. The table is literal numbers, not trigonometry, so
 * it is identical on every engine.
 */
const AIM_TABLE = [
    [1, 0],
    [0.9238795, 0.3826834],
    [0.7071068, 0.7071068],
    [0.3826834, 0.9238795],
    [0, 1],
];

/** @returns {[number, number]} unit vector of an aim step for a facing */
export function aimVector(step, facing) {
    const [c, s] = AIM_TABLE[Math.abs(step)];
    return [c * facing, step < 0 ? -s : s];
}

export class Arsenal {
    weapon = Weapons.pistol;
    ammo = 0;
    cooldown = 0;
    /** current aim step, swept towards the target step by sweeping weapons */
    step = 0;
    #rng;

    /** @param {import('../core/Rng.js').Rng} rng */
    constructor(rng) {
        this.#rng = rng;
    }

    reset() {
        this.weapon = Weapons.pistol;
        this.ammo = 0;
        this.cooldown = 0;
        this.step = 0;
    }

    /** @param {string} id */
    equip(id) {
        const def = Weapons[id];
        if (!def) return;
        if (this.weapon.id === id) this.ammo += def.ammo;
        else {
            this.weapon = def;
            this.ammo = def.ammo;
        }
        this.cooldown = 0;
    }

    tick() {
        if (this.cooldown > 0) this.cooldown--;
    }

    get ready() {
        return this.cooldown === 0;
    }

    /**
     * Fire once if ready.
     * @param {import('./World.js').World} world
     * @param {number} mx muzzle x
     * @param {number} my muzzle y
     * @param {number} facing
     * @param {number} targetStep the aim the player asks for
     * @param {number} carryVx the player's speed, inherited by flames
     * @returns {boolean} fired
     */
    fire(world, mx, my, facing, targetStep, carryVx) {
        if (!this.ready) return false;
        const w = this.weapon;
        if (w.sweeps) this.step += Math.sign(targetStep - this.step);
        else this.step = targetStep;
        const [dx, dy] = aimVector(this.step, facing);

        switch (w.shot) {
            case 'blast': this.#blast(world, mx, my, dx, dy, w); break;
            case 'flame': this.#flame(world, mx, my, dx, dy, w, carryVx); break;
            default: this.#bullet(world, mx, my, dx, dy, w);
        }

        this.cooldown = w.cooldown;
        world.events.emit(Ev.SHOT, mx, my, dx, dy, w.id);
        if (w.ammo > 0) {
            this.ammo--;
            if (this.ammo <= 0) {
                this.reset();
                world.events.emit(Ev.WEAPON, mx, my, 0, 0, 'pistol');
            }
        }
        return true;
    }

    #bullet(world, mx, my, dx, dy, w) {
        const jitter = w.spread ? (this.#rng.next() - 0.5) * 2 * w.spread : 0;
        // spread moves the bullet sideways to its direction, the direction stays exact
        const p = world.playerShots.spawn(w.shot, 'player', mx - dy * jitter * 3, my + dx * jitter * 3, dx * w.speed, dy * w.speed, w.damage);
        if (!p) return;
        p.countsAccuracy = true;
        world.score.shotFired();
    }

    #blast(world, mx, my, dx, dy, w) {
        const reach = 36;
        const p = world.playerShots.spawn('blast', 'player', mx + dx * reach, my + dy * reach, 0, 0, w.damage);
        if (!p) return;
        if (dx === 0) {
            p.w = 38;
            p.h = 74;
        } else if (dy !== 0) {
            p.w = 56;
            p.h = 56;
        }
        p.tag = dx < 0 ? -1 : 1;
        p.countsAccuracy = true;
        world.score.shotFired();
    }

    #flame(world, mx, my, dx, dy, w, carryVx) {
        const jitter = (this.#rng.next() - 0.5) * 2 * w.spread;
        world.playerShots.spawn('flame', 'player', mx, my, dx * w.speed - dy * jitter + carryVx * 0.5, dy * w.speed + dx * jitter, w.damage);
    }
}
