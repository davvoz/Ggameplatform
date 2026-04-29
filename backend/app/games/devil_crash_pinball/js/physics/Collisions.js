import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Stateless ball-vs-shape collision helpers.
 *
 * Design contract:
 *   - Substep size in {@link PhysicsWorld} is bounded so that
 *       (BALL_MAX_SPEED * dt / SUBSTEPS) < BALL_RADIUS
 *     This guarantees the ball cannot tunnel past any collider whose
 *     thickness ≥ ball diameter. CCD is therefore intentionally absent;
 *     {@link PhysicsWorld} asserts the invariant at construction time.
 *
 *   - All inputs are read-only; collision data is written directly into
 *     `ball.pos` / `ball.vel`. No allocations in hot paths.
 *
 *   - Every method returns `true` only when a collision was resolved.
 */
export class Collisions {

    /** Circle (ball) vs static circle. Reflects with given restitution. */
    static circleVsCircle(ball, cx, cy, cr, restitution) {
        const dx = ball.pos.x - cx;
        const dy = ball.pos.y - cy;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius + cr;
        if (distSq >= r * r) return false;

        const dist = Math.sqrt(distSq) || 1e-6;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = r - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;
        Collisions._reflect(ball, nx, ny, restitution);
        return true;
    }

    /**
     * Circle vs line segment (a → b). Treats the segment as a zero-thickness wall.
     * `WALL_SKIN` widens the detection band so the ball reflects slightly before
     * the visible surface; pushout still uses the bare radius.
     */
    static circleVsSegment(ball, ax, ay, bx, by, restitution) {
        const ex = bx - ax;
        const ey = by - ay;
        const lenSq = ex * ex + ey * ey;
        if (lenSq < 1e-6) return false;

        const tRaw = ((ball.pos.x - ax) * ex + (ball.pos.y - ay) * ey) / lenSq;
        const t = Math.max(0, Math.min(1, tRaw));
        const px = ax + ex * t;
        const py = ay + ey * t;
        const dx = ball.pos.x - px;
        const dy = ball.pos.y - py;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius;
        const detR = r + C.WALL_SKIN;
        if (distSq >= detR * detR) return false;

        const dist = Math.sqrt(distSq) || 1e-6;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = r - dist;
        if (overlap > 0) {
            ball.pos.x += nx * overlap;
            ball.pos.y += ny * overlap;
        }
        Collisions._reflect(ball, nx, ny, restitution);
        return true;
    }

    /** Circle vs axis-aligned rectangle (drop targets). */
    static circleVsRect(ball, x, y, w, h, restitution) {
        const closestX = Math.max(x, Math.min(ball.pos.x, x + w));
        const closestY = Math.max(y, Math.min(ball.pos.y, y + h));
        const dx = ball.pos.x - closestX;
        const dy = ball.pos.y - closestY;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius;
        if (distSq >= r * r) return false;

        const dist = Math.sqrt(distSq);
        const [nx, ny] = dist < 1e-6
            ? Collisions._rectInsideNormal(ball, x, y, w, h)
            : [dx / dist, dy / dist];
        const overlap = r - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;
        Collisions._reflect(ball, nx, ny, restitution);
        return true;
    }

    /**
     * Circle vs rotating capsule (flipper). Adds tangential impulse from
     * the capsule's angular velocity at the contact point.
     * @param {object} ball
     * @param {{ax:number, ay:number, bx:number, by:number, r:number, omega?:number}} cap
     * @param {number} restitution
     */
    static circleVsCapsule(ball, cap, restitution) {
        const { ax, ay, bx, by, r: capsuleR, omega = 0 } = cap;
        const ex = bx - ax;
        const ey = by - ay;
        const lenSq = ex * ex + ey * ey;
        if (lenSq < 1e-6) return false;

        const tRaw = ((ball.pos.x - ax) * ex + (ball.pos.y - ay) * ey) / lenSq;
        const t = Math.max(0, Math.min(1, tRaw));
        const px = ax + ex * t;
        const py = ay + ey * t;
        const dx = ball.pos.x - px;
        const dy = ball.pos.y - py;
        const distSq = dx * dx + dy * dy;
        const combined = ball.radius + capsuleR;
        if (distSq >= combined * combined) return false;

        const dist = Math.sqrt(distSq) || 1e-6;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.pos.x += nx * (combined - dist);
        ball.pos.y += ny * (combined - dist);

        // Rotational velocity at the contact point: v_rot = ω × r (2D)
        const rx = px - ax;
        const ry = py - ay;
        const vRotX = -omega * ry;
        const vRotY =  omega * rx;
        const relVx = ball.vel.x - vRotX;
        const relVy = ball.vel.y - vRotY;
        const vn = relVx * nx + relVy * ny;
        if (vn < 0) {
            const j = -(1 + restitution) * vn;
            ball.vel.x += j * nx;
            ball.vel.y += j * ny;
        }
        return true;
    }

    /**
     * Specular reflection of `ball.vel` along normal (nx, ny) with restitution.
     * No-op when the ball is moving away from the surface (vn ≥ 0).
     * @private
     */
    static _reflect(ball, nx, ny, restitution) {
        const vn = ball.vel.x * nx + ball.vel.y * ny;
        if (vn >= 0) return;
        ball.vel.x -= (1 + restitution) * vn * nx;
        ball.vel.y -= (1 + restitution) * vn * ny;
    }

    /**
     * Outward normal for a ball whose centre is fully inside an AABB.
     * Uses the previous frame position to pick the originating side.
     * @private
     */
    static _rectInsideNormal(ball, x, y, w, h) {
        const offL = x - ball.pos.x;
        const offR = ball.pos.x - (x + w);
        const offT = y - ball.pos.y;
        const offB = ball.pos.y - (y + h);
        const max  = Math.max(offL, offR, offT, offB);
        if (max === offT) return [ 0, -1];
        if (max === offB) return [ 0,  1];
        if (max === offL) return [-1,  0];
        return [1, 0];
    }
}
