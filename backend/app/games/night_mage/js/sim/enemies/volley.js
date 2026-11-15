/**
 * Shots in a row, shared by the monsters that shoot: a boss looses a volley
 * (`BossKit.volley`), the others a single shot. The first leaves at the end
 * of the wind-up, the rest one every `volleyGap`, each aimed anew.
 */

/** The wind-up is over: the first shot, and the rest of the volley to come. */
export function loose(enemy, world) {
    world.fire(enemy, enemy.stats.shot);
    enemy.shotsLeft = (enemy.bossKit?.volley ?? 1) - 1;
    enemy.reload = enemy.timing.reload;
    enemy.setState(enemy.shotsLeft > 0 ? 'volley' : 'recover');
}

/** Advances a volley in progress. @returns {boolean} true while it is busy */
export function volleyTick(enemy, world) {
    if (enemy.state !== 'volley') return false;
    if (enemy.stateTime * world.slow < enemy.timing.volleyGap) return true;
    enemy.faceMage(world.mage);
    world.fire(enemy, enemy.stats.shot);
    enemy.shotsLeft -= 1;
    enemy.setState(enemy.shotsLeft > 0 ? 'volley' : 'recover');
    return true;
}
