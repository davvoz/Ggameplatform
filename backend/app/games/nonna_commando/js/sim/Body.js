import { Physics } from '../config/Tuning.js';

/**
 * Anything that stands, walks and falls: x is the centre, y the feet.
 * Movement is plain integration in fixed ticks, so it is the same on every
 * device.
 */
export class Body {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    w = 10;
    h = 10;
    onGround = false;
    /** @type {import('./Terrain.js').Platform | null} */
    platform = null;
    /** ticks during which platforms are ignored (dropping through) */
    dropTicks = 0;
    /** true when a blocker stopped the horizontal move this tick */
    blocked = false;

    get left() { return this.x - this.w / 2; }
    get top() { return this.y - this.h; }
    get cy() { return this.y - this.h / 2; }
}

/**
 * Move a body for one tick against terrain and blockers.
 *
 * @param {Body} body
 * @param {import('./Terrain.js').Terrain} terrain
 * @param {{x: number, y: number, w: number, h: number, active: boolean}[]} blockers solid boxes
 * @param {number} [gravity]
 * @param {number} [maxFall]
 * @returns {boolean} true if it landed this tick
 */
export function moveBody(body, terrain, blockers, gravity = Physics.gravity, maxFall = Physics.maxFall) {
    const halfW = body.w / 2;
    body.blocked = false;

    // horizontal
    if (body.vx !== 0) {
        body.x += body.vx;
        for (const b of blockers) {
            if (!b.active) continue;
            if (body.y <= b.y || body.y - body.h >= b.y + b.h) continue;
            if (body.x + halfW <= b.x || body.x - halfW >= b.x + b.w) continue;
            body.x = body.vx > 0 ? b.x - halfW : b.x + b.w + halfW;
            body.blocked = true;
            body.vx = 0;
        }
    }
    if (body.dropTicks > 0) body.dropTicks--;

    // walking: follow the surface
    if (body.onGround) {
        if (body.platform) {
            if (!terrain.stillOn(body.platform, body.x, halfW)) {
                body.platform = null;
                body.onGround = false;
            } else {
                body.y = body.platform.y;
                return false;
            }
        } else {
            const gy = terrain.groundY(body.x);
            if (gy - body.y <= 6) {
                body.y = gy;
                return false;
            }
            body.onGround = false;
        }
    }

    // airborne
    const prevY = body.y;
    body.vy = Math.min(body.vy + gravity, maxFall);
    body.y += body.vy;
    if (body.vy < 0) return false;

    if (body.dropTicks === 0) {
        const p = terrain.platformCrossed(body.x, halfW, prevY, body.y);
        if (p) {
            body.y = p.y;
            body.vy = 0;
            body.onGround = true;
            body.platform = p;
            return true;
        }
    }
    const gy = terrain.groundY(body.x);
    if (body.y >= gy) {
        body.y = gy;
        body.vy = 0;
        body.onGround = true;
        body.platform = null;
        return true;
    }
    return false;
}
