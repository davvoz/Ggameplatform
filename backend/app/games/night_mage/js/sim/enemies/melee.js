/**
 * The telegraphed swing shared by every melee monster: wind up (the player
 * sees it coming), strike if the mage is still in reach, rest.
 */
const REACH_SLACK = 24;

/** Starts a swing when the mage is close and on the same level. @returns {boolean} */
export function trySwing(enemy, mage) {
    if (!enemy.levelWithMage(mage) || Math.abs(enemy.x - mage.x) > enemy.stats.reach) return false;
    enemy.faceMage(mage);
    enemy.setState('windup');
    return true;
}

/** Advances a swing in progress. @returns {boolean} true while the swing is busy */
export function swingTick(enemy, world) {
    const { stats } = enemy;
    if (enemy.state === 'windup') {
        if (enemy.stateTime * world.slow >= enemy.timing.windup) {
            const inReach = enemy.levelWithMage(world.mage) && Math.abs(enemy.x - world.mage.x) <= stats.reach + REACH_SLACK;
            if (inReach) world.strike(enemy, enemy.damage);
            enemy.setState('recover');
        }
        return true;
    }
    if (enemy.state === 'recover') {
        if (enemy.stateTime * world.slow >= stats.recover) enemy.setState('walk');
        return true;
    }
    return false;
}
