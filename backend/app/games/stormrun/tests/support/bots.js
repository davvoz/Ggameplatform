/**
 * Scripted players. They stand in for real people in the balance tests and in
 * the visual harness: each one decides the button from what it can see.
 */

const REACTION_SECONDS = 0.3;
const TAP_TICKS = 3;
const LONG_PRESS_TICKS = 14;

/** Never touches the screen. */
export const idleBot = () => () => false;

function nextDanger(sim, seen) {
    const { runner, course } = sim;
    const reach = runner.vx * REACTION_SECONDS + 3;
    return course.obstacles.find(
        (o) => !o.hit && !seen.has(o) && o.type.id !== 'cloud' && o.x > runner.x && o.x - runner.x < reach
    );
}

function cloudAhead(sim) {
    const { runner, course } = sim;
    return course.obstacles.some(
        (o) => o.type.id === 'cloud' && !o.hit && o.x > runner.x && o.x - runner.x < 26
    );
}

/** Sees obstacles in time, but `missChance` of the times it fails to react. */
function jumperBot(rng, missChance) {
    const seen = new Set();
    let pressLeft = 0;

    return (sim) => {
        const danger = sim.runner.grounded ? nextDanger(sim, seen) : null;
        if (danger) {
            seen.add(danger);
            if (!rng.chance(missChance)) pressLeft = cloudAhead(sim) ? TAP_TICKS : LONG_PRESS_TICKS;
        }
        if (pressLeft === 0) return false;
        pressLeft--;
        return true;
    };
}

/** A first-time player: misses one obstacle in three. */
export const casualBot = (rng) => jumperBot(rng, 0.33);

/** Knows the game: misses rarely. */
export const goodBot = (rng) => jumperBot(rng, 0.05);

/** Run a bot to the end, or to a tick limit. */
export function play(sim, bot, maxTicks = 60 * 900) {
    while (!sim.finished && sim.tick < maxTicks) sim.step(bot(sim));
    return sim;
}
