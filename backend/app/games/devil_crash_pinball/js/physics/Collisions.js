import { TempVec } from './Vec2.js';

/**
 * Stateless collision helpers. All inputs are read-only; outputs are written
 * into supplied containers so we never allocate.
 *
 * Convention: every resolve returns true if a collision occurred AND the ball
 * was modified (position/velocity).
 */
export class Collisions {

    /**
     * Circle (ball) vs static circle (bumper). Reflects with given restitution.
     * @returns {boolean} hit
     */
    static circleVsCircle(ball, cx, cy, cr, restitution) {
        const dx = ball.pos.x - cx;
        const dy = ball.pos.y - cy;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius + cr;
        if (distSq >= r * r) return false;

        const dist = Math.sqrt(distSq) || 1e-6;
        const nx = dx / dist;
        const ny = dy / dist;
        // Push out
        const overlap = r - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;
        // Reflect velocity
        const vn = ball.vel.x * nx + ball.vel.y * ny;
        if (vn < 0) {
            ball.vel.x -= (1 + restitution) * vn * nx;
            ball.vel.y -= (1 + restitution) * vn * ny;
        }
        return true;
    }

    /**
     * Circle vs line segment (a -> b). Treats segment as zero-thickness wall.
     * Includes CCD fallback: if the ball tunnelled through the wall this substep
     * (sign-change in signed distance from prevPos to pos), the crossing is
     * detected and the ball is placed back on the originating side.
     * @returns {boolean} hit
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

        if (distSq < r * r) {
            // ── Narrow-phase resolution (standard) ──────────────────────────
            const dist = Math.sqrt(distSq) || 1e-6;
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = r - dist;
            ball.pos.x += nx * overlap;
            ball.pos.y += ny * overlap;
            const vn = ball.vel.x * nx + ball.vel.y * ny;
            if (vn < 0) {
                ball.vel.x -= (1 + restitution) * vn * nx;
                ball.vel.y -= (1 + restitution) * vn * ny;
            }
            return true;
        }

        // ── CCD fallback: detect wall crossing this substep ─────────────────
        // Uses ball.prevPos (set in PhysicsWorld before each integrate call).
        if (!ball.prevPos) return false;

        // Wall unit normal (perpendicular to segment, arbitrary orientation)
        const len = Math.sqrt(lenSq);
        const wnx = -ey / len;
        const wny =  ex / len;

        // Signed distances from the wall line at previous and current position
        const d0 = (ball.prevPos.x - ax) * wnx + (ball.prevPos.y - ay) * wny;
        const d1 = (ball.pos.x    - ax) * wnx + (ball.pos.y    - ay) * wny;

        // No sign change → ball stayed on the same side → no tunnelling
        if (d0 * d1 >= 0) return false;

        // Time-of-impact (linear interpolation fraction 0..1 in [prevPos, pos])
        const toi = d0 / (d0 - d1);

        // World position where the ball centre crossed the wall plane
        const crossX = ball.prevPos.x + (ball.pos.x - ball.prevPos.x) * toi;
        const crossY = ball.prevPos.y + (ball.pos.y - ball.prevPos.y) * toi;

        // Projection onto segment: must land within the segment bounds (small tolerance)
        const tSeg = ((crossX - ax) * ex + (crossY - ay) * ey) / lenSq;
        if (tSeg < -0.05 || tSeg > 1.05) return false;

        // Push ball back onto the originating side and reflect velocity
        const side = d0 >= 0 ? 1 : -1;
        ball.pos.x = crossX + wnx * side * (r + 0.5);
        ball.pos.y = crossY + wny * side * (r + 0.5);
        const vn = ball.vel.x * wnx + ball.vel.y * wny;
        if (vn * side < 0) {
            ball.vel.x -= (1 + restitution) * vn * wnx;
            ball.vel.y -= (1 + restitution) * vn * wny;
        }
        return true;
    }

    /**
     * Circle vs axis-aligned rectangle (drop targets).
     * @returns {boolean} hit
     */
    static circleVsRect(ball, x, y, w, h, restitution) {
        const cx = Math.max(x, Math.min(ball.pos.x, x + w));
        const cy = Math.max(y, Math.min(ball.pos.y, y + h));
        const dx = ball.pos.x - cx;
        const dy = ball.pos.y - cy;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius;
        if (distSq >= r * r) return false;

        let nx = dx;
        let ny = dy;
        const dist = Math.sqrt(distSq);
        if (dist < 1e-6) {
            // Center inside rect: push along smallest axis
            ny = -1; nx = 0;
        } else {
            nx /= dist;
            ny /= dist;
        }
        const overlap = r - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;
        const vn = ball.vel.x * nx + ball.vel.y * ny;
        if (vn < 0) {
            ball.vel.x -= (1 + restitution) * vn * nx;
            ball.vel.y -= (1 + restitution) * vn * ny;
        }
        return true;
    }

    /**
     * Circle vs rotating capsule (flipper). Adds tangential impulse from rotation.
     * Includes CCD fallback: detects perpendicular sign-change crossing so the ball
     * cannot tunnel through the flipper body at high speed.
     * @param {object} ball
     * @param {{ax:number, ay:number, bx:number, by:number, r:number, omega:number}} cap
     * @param {number} restitution
     * @returns {boolean} hit
     */
    static circleVsCapsule(ball, cap, restitution) {
        const { ax, ay, bx, by, r: capsuleR, omega = 0 } = cap;
        const ex = bx - ax;
        const ey = by - ay;
        const lenSq = ex * ex + ey * ey;
        if (lenSq < 1e-6) return false;

        const combined = ball.radius + capsuleR;

        const tRaw = ((ball.pos.x - ax) * ex + (ball.pos.y - ay) * ey) / lenSq;
        const t = Math.max(0, Math.min(1, tRaw));
        const px = ax + ex * t;
        const py = ay + ey * t;
        const dx = ball.pos.x - px;
        const dy = ball.pos.y - py;
        const distSq = dx * dx + dy * dy;

        if (distSq < combined * combined) {
            // ── Narrow-phase resolution ──────────────────────────────────────
            const dist = Math.sqrt(distSq) || 1e-6;
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = combined - dist;
            ball.pos.x += nx * overlap;
            ball.pos.y += ny * overlap;

            // Rotational velocity at contact point: v_rot = omega × r_vec (rotated 90°)
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
            TempVec.reset();
            return true;
        }

        // ── CCD fallback: detect ball tunnelling through capsule body ────────
        // Uses ball.prevPos (set by PhysicsWorld before each integrate() call).
        // Checks whether the signed perpendicular distance to the capsule axis
        // changed sign, meaning the ball crossed through the flat body.
        if (!ball.prevPos) return false;

        const len = Math.sqrt(lenSq);
        const wnx = -ey / len;  // unit normal perpendicular to capsule axis
        const wny =  ex / len;

        // Signed perpendicular distances to the capsule axis LINE
        const pd0 = (ball.prevPos.x - ax) * wnx + (ball.prevPos.y - ay) * wny;
        const pd1 = (ball.pos.x     - ax) * wnx + (ball.pos.y     - ay) * wny;

        // Same side → ball did not cross through the body
        if (pd0 * pd1 >= 0) return false;

        // TOI: when the ball surface first touched the capsule surface
        const side = pd0 >= 0 ? 1 : -1;
        const toi  = (pd0 - combined * side) / (pd0 - pd1);
        if (toi < 0 || toi > 1) return false;

        // World position of ball centre at impact
        const impactX = ball.prevPos.x + (ball.pos.x - ball.prevPos.x) * toi;
        const impactY = ball.prevPos.y + (ball.pos.y - ball.prevPos.y) * toi;

        // Impact must project onto the capsule segment (with hemispherical-cap tolerance)
        const tSeg   = ((impactX - ax) * ex + (impactY - ay) * ey) / lenSq;
        const capTol = capsuleR / len;
        if (tSeg < -capTol || tSeg > 1 + capTol) return false;

        // Closest point on capsule axis at impact
        const tClamp = Math.max(0, Math.min(1, tSeg));
        const pxC = ax + ex * tClamp;
        const pyC = ay + ey * tClamp;

        // Normal from axis toward ball, preserving the originating side
        const impDx   = impactX - pxC;
        const impDy   = impactY - pyC;
        const impDist = Math.hypot(impDx, impDy) || 1e-6;
        const nx = impDx / impDist;
        const ny = impDy / impDist;

        ball.pos.x = pxC + nx * combined;
        ball.pos.y = pyC + ny * combined;

        const rx = pxC - ax;
        const ry = pyC - ay;
        const vRotX = -omega * ry;
        const vRotY =  omega * rx;
        const relVx = ball.vel.x - vRotX;
        const relVy = ball.vel.y - vRotY;
        const vn = relVx * nx + relVy * ny;
        if (vn * side < 0) {
            const j = -(1 + restitution) * vn;
            ball.vel.x += j * nx;
            ball.vel.y += j * ny;
        }
        TempVec.reset();
        return true;
    }
}
