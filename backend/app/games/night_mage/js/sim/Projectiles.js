import { BOLT, WORLD } from '../config/Tuning.js';
import { SHOTS } from '../config/Enemies.js';

const OUT = 120;

function towards(fromX, fromY, toX, toY, speed) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy) || 1;
    return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

/** A monster's shot: an arrow or a fireball. Tap it to burn it, shield it to send it back. */
export class Shot {
    constructor({ id, kind, x, y, target, ownerId }) {
        const stats = SHOTS[kind];
        this.id = id;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.radius = stats.radius;
        this.damage = stats.damage;
        this.speed = stats.speed;
        this.ownerId = ownerId;
        this.reflected = false;
        this.alive = true;
        Object.assign(this, towards(x, y, target.x, target.y, this.speed));
    }

    /** Back where it came from, faster. */
    reflect(target) {
        this.reflected = true;
        Object.assign(this, towards(this.x, this.y, target.x, target.y, this.speed * 1.8));
    }

    update(dt, slow) {
        const factor = this.reflected ? 1 : slow;
        this.x += this.vx * dt * factor;
        this.y += this.vy * dt * factor;
        if (this.x < -OUT || this.x > WORLD.width + OUT || this.y < -OUT || this.y > WORLD.height + OUT) this.alive = false;
    }
}

/**
 * A bolt from the staff. It homes on its target, so a tap that hits a monster
 * always lands; a bolt without a target fizzles where the tap was.
 */
export class Bolt {
    constructor({ id, from, targetId = null, point, damage = BOLT.damage }) {
        this.id = id;
        this.x = from.x;
        this.y = from.y;
        this.targetId = targetId;
        this.tx = point.x;
        this.ty = point.y;
        this.damage = damage;
        this.alive = true;
    }

    /**
     * Flies one tick towards the target (or its last known place).
     * @returns {boolean} true when it arrives
     */
    update(dt, target) {
        if (target?.alive) ({ x: this.tx, y: this.ty } = target.center);
        const step = BOLT.speed * dt;
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= step) {
            this.x = this.tx;
            this.y = this.ty;
            this.alive = false;
            return true;
        }
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;
        return false;
    }
}
