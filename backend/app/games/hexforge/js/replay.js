/**
 * Rebuilds what the battlefield looks like at any moment from the server's
 * battle log. Nothing is simulated here: hero positions are interpolated
 * from the recorded frames, hit points come from the events.
 */

/** How long each kind of event stays on screen, in ticks. */
export const EFFECT_TICKS = {
    strike: 3, nova: 7, shot: 3, bolt: 4, frost: 6, trap: 10, destroyed: 10, hero_down: 12,
};

const SLOW_TICKS = 20;
const UNCOUNTED = new Set(['wall', 'rune_trap']);

export function createReplay(battle) {
    const { frames, events, squad, city } = battle;
    const stride = battle.frame_stride;
    const ticks = battle.ticks;
    const tickRate = battle.tick_rate;
    const counted = city.buildings.filter((b) => !UNCOUNTED.has(b.type)).map((b) => b.id);
    const core = city.buildings.find((b) => b.type === 'core');

    function heroPositions(t) {
        const last = frames.length - 1;
        const i0 = Math.min(Math.floor(t / stride), last);
        const i1 = Math.min(i0 + 1, last);
        const t0 = i0 * stride;
        const t1 = Math.min(i1 * stride, ticks);
        const a = t1 > t0 ? Math.min(Math.max((t - t0) / (t1 - t0), 0), 1) : 0;
        return squad.map((hero, k) => {
            const [x0, y0] = frames[i0][k];
            const [x1, y1] = frames[i1][k];
            return {
                x: x0 + (x1 - x0) * a,
                y: y0 + (y1 - y0) * a,
                moving: Math.hypot(x1 - x0, y1 - y0) > 0.01,
                facing: Math.sign((x1 - y1) - (x0 - y0)),
            };
        });
    }

    function stateAt(tick) {
        const t = Math.min(Math.max(tick, 0), ticks);
        const buildingHp = new Map(city.buildings.map((b) => [b.id, b.hp]));
        const heroHp = squad.map((h) => h.hp);
        const slowUntil = squad.map(() => -1);
        const destroyed = new Set();
        const sprung = new Set();
        const down = new Set();
        const effects = [];

        for (const e of events) {
            if (e.t > t) break;
            applyEvent(e, { buildingHp, heroHp, slowUntil, destroyed, sprung, down });
            const life = EFFECT_TICKS[e.type];
            if (life && t - e.t <= life) effects.push({ event: e, age: (t - e.t) / life });
        }

        const positions = heroPositions(t);
        const heroes = squad.map((h, k) => ({
            id: h.id,
            cls: h.cls,
            maxHp: h.hp,
            hp: heroHp[k],
            alive: !down.has(h.id),
            slowed: t <= slowUntil[k],
            ...positions[k],
        }));
        const destroyedCounted = counted.filter((id) => destroyed.has(id)).length;
        return {
            tick: t,
            seconds: t / tickRate,
            heroes,
            buildingHp,
            destroyed,
            sprung,
            effects,
            destruction: counted.length ? Math.round((100 * destroyedCounted) / counted.length) : 0,
            coreDestroyed: core ? destroyed.has(core.id) : false,
        };
    }

    return { duration: ticks, tickRate, stateAt };
}

function applyEvent(e, s) {
    switch (e.type) {
        case 'strike':
            s.buildingHp.set(e.building, e.hp);
            break;
        case 'nova':
            for (const hit of e.hits) s.buildingHp.set(hit.building, hit.hp);
            break;
        case 'shot':
            s.heroHp[e.hero] = e.hp;
            break;
        case 'bolt':
        case 'trap':
            for (const hit of e.hits) s.heroHp[hit.hero] = hit.hp;
            if (e.type === 'trap') s.sprung.add(e.building);
            break;
        case 'frost':
            for (const hit of e.hits) {
                s.heroHp[hit.hero] = hit.hp;
                s.slowUntil[hit.hero] = e.t + SLOW_TICKS;
            }
            break;
        case 'destroyed':
            s.destroyed.add(e.building);
            break;
        case 'hero_down':
            s.down.add(e.hero);
            break;
        default:
            break;
    }
}
