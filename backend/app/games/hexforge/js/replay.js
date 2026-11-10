/**
 * Rebuilds what the battlefield looks like at any moment from the server's
 * battle log. Nothing is simulated here: hero positions are interpolated
 * from the recorded frames, hit points come from the events. On top of that
 * it works out how each hero should be posed: winding up or following
 * through a blow, in the air over a wall, just hit, which way it faces, and
 * nudged apart from the others so heroes never stand inside each other.
 */

/** How long each kind of event stays on screen, in ticks. */
export const EFFECT_TICKS = {
    strike: 3, nova: 7, shot: 3, bolt: 4, frost: 6, trap: 10, destroyed: 10, hero_down: 12,
};

/** A blow is wound up over WINDUP ticks before it lands and followed through over FOLLOW ticks. */
export const WINDUP = 4;
export const FOLLOW = 3;
const HURT_TICKS = 3;
const SLOW_TICKS = 20;
const PERSONAL_SPACE = 0.5;   // cells between two heroes' feet, at least
const UNCOUNTED = new Set(['wall', 'rune_trap']);

export function createReplay(battle) {
    const { frames, events, squad, city } = battle;
    const stride = battle.frame_stride;
    const ticks = battle.ticks;
    const tickRate = battle.tick_rate;
    const counted = city.buildings.filter((b) => !UNCOUNTED.has(b.type)).map((b) => b.id);
    const core = city.buildings.find((b) => b.type === 'core');
    const centres = new Map(city.buildings.map((b) => [b.id, { x: b.x + b.size / 2, y: b.y + b.size / 2 }]));

    function frameAt(i, k) {
        const [x, y] = frames[Math.max(0, Math.min(i, frames.length - 1))][k];
        return { x, y };
    }

    /** The last direction hero `k` walked in, looking back a few frames from frame `i`. */
    function lastHeading(i, k) {
        for (let j = i; j > Math.max(0, i - 8); j--) {
            const a = frameAt(j - 1, k);
            const b = frameAt(j, k);
            if (Math.hypot(b.x - a.x, b.y - a.y) > 0.01) return { dx: b.x - a.x, dy: b.y - a.y };
        }
        return { dx: 0, dy: 0 };
    }

    function heroPositions(t) {
        const last = frames.length - 1;
        const i0 = Math.min(Math.floor(t / stride), last);
        const i1 = Math.min(i0 + 1, last);
        const t0 = i0 * stride;
        const t1 = Math.min(i1 * stride, ticks);
        const a = t1 > t0 ? Math.min(Math.max((t - t0) / (t1 - t0), 0), 1) : 0;
        return squad.map((hero, k) => {
            const p0 = frameAt(i0, k);
            const p1 = frameAt(i1, k);
            const moving = Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.01;
            const heading = moving ? { dx: p1.x - p0.x, dy: p1.y - p0.y } : lastHeading(i0, k);
            return {
                x: p0.x + (p1.x - p0.x) * a,
                y: p0.y + (p1.y - p0.y) * a,
                moving,
                heading,
            };
        });
    }

    function stateAt(tick) {
        const t = Math.min(Math.max(tick, 0), ticks);
        const buildingHp = new Map(city.buildings.map((b) => [b.id, b.hp]));
        const heroHp = squad.map((h) => h.hp);
        const slowUntil = squad.map(() => -1);
        const lastHit = squad.map(() => -Infinity);
        const lastBlow = squad.map(() => null);
        const nextBlow = squad.map(() => null);
        const leaps = squad.map(() => null);
        const destroyed = new Set();
        const sprung = new Set();
        const down = new Set();
        const effects = [];

        for (const e of events) {
            if (e.t > t + WINDUP) break;
            if (e.t > t) {
                if (isBlow(e) && nextBlow[e.hero] === null) nextBlow[e.hero] = e;
                continue;
            }
            applyEvent(e, { buildingHp, heroHp, slowUntil, destroyed, sprung, down, lastHit });
            if (isBlow(e)) lastBlow[e.hero] = e;
            if (e.type === 'leap' && t <= e.until) leaps[e.hero] = e;
            const life = EFFECT_TICKS[e.type];
            if (life && t - e.t <= life) effects.push({ event: e, age: (t - e.t) / life });
        }

        const positions = heroPositions(t);
        const heroes = squad.map((h, k) => {
            const blow = poseOfBlow(lastBlow[k], nextBlow[k], t);
            const leap = leaps[k];
            return {
                id: h.id,
                cls: h.cls,
                maxHp: h.hp,
                hp: heroHp[k],
                alive: !down.has(h.id),
                slowed: t <= slowUntil[k],
                hurt: Math.max(0, 1 - (t - lastHit[k]) / HURT_TICKS),
                ...positions[k],
                leap: leap ? Math.min(1, (t - leap.t) / Math.max(1, leap.until - leap.t)) : null,
                attack: blow && {
                    phase: blow.phase,
                    nova: blow.event.type === 'nova',
                    target: blow.event.type === 'nova' ? { x: blow.event.x, y: blow.event.y } : centres.get(blow.event.building),
                    building: blow.event.building ?? null,
                },
            };
        });
        separate(heroes);
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

function isBlow(e) {
    return e.type === 'strike' || e.type === 'nova';
}

/**
 * Where a hero is in its attack: -1..0 winding up to the next blow, 0..1
 * following through the last one, or null when it is not fighting.
 */
export function poseOfBlow(last, next, t) {
    if (next && next.t - t <= WINDUP) return { event: next, phase: -(next.t - t) / WINDUP };
    if (last && t - last.t <= FOLLOW) return { event: last, phase: (t - last.t) / FOLLOW };
    return null;
}

/** Push heroes standing too close apart (drawing only; the battle itself is decided on the server). */
export function separate(heroes) {
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < heroes.length; i++) {
            for (let j = i + 1; j < heroes.length; j++) {
                const a = heroes[i];
                const b = heroes[j];
                if (!a.alive || !b.alive || a.leap !== null || b.leap !== null) continue;
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                const d = Math.hypot(dx, dy);
                if (d >= PERSONAL_SPACE) continue;
                if (d < 1e-6) {
                    const angle = 2.4 * (i + 1) + j;     // a fixed direction, so it never flickers
                    dx = Math.cos(angle);
                    dy = Math.sin(angle);
                } else {
                    dx /= d;
                    dy /= d;
                }
                const push = (PERSONAL_SPACE - d) / 2;
                a.x -= dx * push;
                a.y -= dy * push;
                b.x += dx * push;
                b.y += dy * push;
            }
        }
    }
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
            s.lastHit[e.hero] = e.t;
            break;
        case 'bolt':
        case 'trap':
            for (const hit of e.hits) {
                s.heroHp[hit.hero] = hit.hp;
                s.lastHit[hit.hero] = e.t;
            }
            if (e.type === 'trap') s.sprung.add(e.building);
            break;
        case 'frost':
            for (const hit of e.hits) {
                s.heroHp[hit.hero] = hit.hp;
                s.slowUntil[hit.hero] = e.t + SLOW_TICKS;
                s.lastHit[hit.hero] = e.t;
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
