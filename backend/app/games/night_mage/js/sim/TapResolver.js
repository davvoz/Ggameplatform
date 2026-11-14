import { TAP } from '../config/Tuning.js';

const PICKUP_LIFT = 22;

function nearest(items, x, y, centerOf) {
    let best = null;
    let bestDistance = Infinity;
    for (const item of items) {
        const c = centerOf(item);
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestDistance) {
            best = item;
            bestDistance = d;
        }
    }
    return best;
}

/**
 * What a tap means, in order of priority: take a gift, burn a shot, blast a
 * monster, raise the shield (a tap on the mage), or nothing (a miss).
 * A tap right on the mage's body is always the shield, even with a monster
 * standing close.
 *
 * @returns {{type: 'pickup'|'shot'|'enemy'|'shield'|'miss', target?: object}}
 */
export function resolveTap(x, y, { mage, enemies, shots, pickups }) {
    const pickup = nearest(pickups.filter((p) => Math.hypot(p.x - x, p.y - PICKUP_LIFT - y) <= TAP.pickupRadius),
        x, y, (p) => ({ x: p.x, y: p.y - PICKUP_LIFT }));
    if (pickup) return { type: 'pickup', target: pickup };

    const shot = nearest(shots.filter((s) => !s.reflected && Math.hypot(s.x - x, s.y - y) <= TAP.shotRadius), x, y, (s) => s);
    if (shot) return { type: 'shot', target: shot };

    if (mage.covers(x, y)) return { type: 'shield' };

    const enemy = nearest(enemies.filter((e) => e.alive && e.touches(x, y, TAP.enemyPad)), x, y, (e) => e.center);
    if (enemy) return { type: 'enemy', target: enemy };

    if (mage.tapped(x, y)) return { type: 'shield' };
    return { type: 'miss' };
}
