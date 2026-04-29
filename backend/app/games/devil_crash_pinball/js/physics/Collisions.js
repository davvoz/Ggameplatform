import { TempVec } from './Vec2.js';
import { GameConfig as C } from '../config/GameConfig.js';

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
        if (distSq < r * r) {
            // ── Narrow-phase ────────────────────────────────────────────────
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

        // ── CCD fallback: swept-sphere test ──────────────────────────────
        // Catches full pass-through when prevPos and pos are both outside
        // but the path crossed inside the combined circle.
        if (!ball.prevPos) return false;
        const mvx = ball.pos.x - ball.prevPos.x;
        const mvy = ball.pos.y - ball.prevPos.y;
        const a = mvx * mvx + mvy * mvy;
        if (a < 1e-10) return false;
        const pdx = ball.prevPos.x - cx;
        const pdy = ball.prevPos.y - cy;
        const b  = 2 * (pdx * mvx + pdy * mvy);
        const cc = pdx * pdx + pdy * pdy - r * r;
        const disc = b * b - 4 * a * cc;
        if (disc < 0) return false;
        const toi = (-b - Math.sqrt(disc)) / (2 * a);
        if (toi < 0 || toi > 1) return false;
        const impX   = ball.prevPos.x + mvx * toi;
        const impY   = ball.prevPos.y + mvy * toi;
        const impDx  = impX - cx;
        const impDy  = impY - cy;
        const impLen = Math.hypot(impDx, impDy) || 1e-6;
        const nx = impDx / impLen;
        const ny = impDy / impLen;
        ball.pos.x = cx + nx * r;
        ball.pos.y = cy + ny * r;
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
        // WALL_SKIN: detect collision slightly before visual surface so the ball
        // can never clip through at high speed. Pushout still uses bare radius.
        const detR = r + C.WALL_SKIN;

        if (distSq < detR * detR) {
            // ── Narrow-phase resolution ──────────────────────────────────────
            const dist = Math.sqrt(distSq) || 1e-6;
            const nx = dx / dist;
            const ny = dy / dist;
            // Push out only when truly penetrating; in the skin zone just reflect.
            const overlap = r - dist;
            if (overlap > 0) {
                ball.pos.x += nx * overlap;
                ball.pos.y += ny * overlap;
            }
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
        const closestX = Math.max(x, Math.min(ball.pos.x, x + w));
        const closestY = Math.max(y, Math.min(ball.pos.y, y + h));
        const dx = ball.pos.x - closestX;
        const dy = ball.pos.y - closestY;
        const distSq = dx * dx + dy * dy;
        const r = ball.radius;
        if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            const [nx, ny] = dist < 1e-6
                ? Collisions._rectInsideNormal(ball, x, y, w, h)
                : [dx / dist, dy / dist];
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
        return Collisions._circleVsRectCcd(ball, x, y, w, h, r, restitution);
    }

    /** Return the outward normal for a ball whose centre is inside the rect. @private */
    static _rectInsideNormal(ball, x, y, w, h) {
        if (!ball.prevPos) return [0, -1];
        const offL = x         - ball.prevPos.x; // > 0 → prev was left of rect
        const offR = ball.prevPos.x - (x + w);   // > 0 → prev was right of rect
        const offT = y         - ball.prevPos.y;  // > 0 → prev was above rect
        const offB = ball.prevPos.y - (y + h);    // > 0 → prev was below rect
        const max  = Math.max(offL, offR, offT, offB);
        if (max === offT) return [ 0, -1];
        if (max === offB) return [ 0,  1];
        if (max === offL) return [-1,  0];
        return [1, 0];
    }

    /**
     * CCD fallback for circleVsRect: swept-rect test.
     * Catches complete pass-through when the ball skipped over the rect. @private
     */
    static _circleVsRectCcd(ball, x, y, w, h, r, restitution) {
        if (!ball.prevPos) return false;
        const er = r;
        const pMinX = Math.min(ball.prevPos.x, ball.pos.x);
        const pMaxX = Math.max(ball.prevPos.x, ball.pos.x);
        const pMinY = Math.min(ball.prevPos.y, ball.pos.y);
        const pMaxY = Math.max(ball.prevPos.y, ball.pos.y);
        // Fast AABB reject
        if (pMaxX < x - er || pMinX > x + w + er ||
            pMaxY < y - er || pMinY > y + h + er) return false;
        const face = Collisions._firstRectFaceCrossing(ball, x, y, w, h, er);
        if (!face) return false;
        const crossX = ball.prevPos.x + (ball.pos.x - ball.prevPos.x) * face.toi;
        const crossY = ball.prevPos.y + (ball.pos.y - ball.prevPos.y) * face.toi;
        ball.pos.x = crossX + face.nx * (r + 0.5);
        ball.pos.y = crossY + face.ny * (r + 0.5);
        const vn = ball.vel.x * face.nx + ball.vel.y * face.ny;
        if (vn < 0) {
            ball.vel.x -= (1 + restitution) * vn * face.nx;
            ball.vel.y -= (1 + restitution) * vn * face.ny;
        }
        return true;
    }

    /** Find the earliest rect face the ball crosses. Returns {toi,nx,ny} or null. @private */
    static _firstRectFaceCrossing(ball, x, y, w, h, er) {
        const px = ball.prevPos.x, py = ball.prevPos.y;
        const qx = ball.pos.x,    qy = ball.pos.y;
        // [d0, d1, nx, ny, faceL, faceR, isHoriz]
        const faces = [
            [y      - py, y      - qy,  0, -1, x,   x+w, true ],
            [py - (y+h),  qy - (y+h),   0,  1, x,   x+w, true ],
            [x      - px, x      - qx, -1,  0, y,   y+h, false],
            [px - (x+w),  qx - (x+w),   1,  0, y,   y+h, false],
        ];
        let bestToi = 2, bestFace = null;
        for (const [d0, d1, nx, ny, fL, fR, horiz] of faces) {
            if (d0 * d1 >= 0 || d0 < 0) continue;
            const toi = d0 / (d0 - d1);
            if (toi >= bestToi) continue;
            const coord = horiz ? px + (qx - px) * toi : py + (qy - py) * toi;
            if (coord < fL - er || coord > fR + er) continue;
            bestToi = toi;
            bestFace = { toi, nx, ny };
        }
        return bestFace;
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
