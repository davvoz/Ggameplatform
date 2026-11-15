import { BOSS, WORLD } from '../../config/Tuning.js';

/** It charges only from inside the screen, where the player sees the rally. */
const MARGIN = 60;
/** Where the run stops, as a share of its reach from the mage. */
const STOP = 0.75;

/**
 * A warrior boss far from the mage on its level rallies (the red "!": a
 * critical hit stops it), then charges and hits for more than a swing.
 * @returns {boolean} true when it starts the rally
 */
export function tryCharge(enemy, mage) {
    const onScreen = enemy.x > MARGIN && enemy.x < WORLD.width - MARGIN;
    if (enemy.reload > 0 || !onScreen || !enemy.levelWithMage(mage)) return false;
    if (Math.abs(enemy.x - mage.x) < BOSS.charge.from) return false;
    enemy.faceMage(mage);
    enemy.setState('rally');
    return true;
}

/** Advances the rally and the run. @returns {boolean} true while it is busy */
export function chargeTick(enemy, world, dt) {
    if (enemy.state === 'rally') {
        if (enemy.stateTime * world.slow >= enemy.timing.rally) enemy.setState('charge');
        return true;
    }
    if (enemy.state !== 'charge') return false;
    const { mage } = world;
    const stop = mage.x + (enemy.x < mage.x ? -1 : 1) * enemy.stats.reach * STOP;
    if (!enemy.walkTo(stop, world, dt, BOSS.charge.pace)) return true;
    if (enemy.levelWithMage(mage)) world.strike(enemy, BOSS.charge.damage);
    enemy.reload = BOSS.charge.cooldown;
    enemy.setState('recover');
    return true;
}
