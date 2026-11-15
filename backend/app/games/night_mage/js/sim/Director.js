import { ENEMIES, WAVE_MIX } from '../config/Enemies.js';
import { INVADER, WAVES } from '../config/Tuning.js';
import { Rng } from '../core/Rng.js';

/** The steps of toughness a wave has climbed: none until `toughness.from`, then one every few waves. */
function toughnessSteps(wave) {
    const { from, every } = WAVES.toughness;
    return wave < from ? 0 : Math.floor((wave - from) / every) + 1;
}

/** The wave's power for one kind: bats (`grit` 0.5) take only part of the toughness. */
export function powerFor(kind, power) {
    const grit = ENEMIES[kind]?.grit ?? 1;
    return { ...power, hp: 1 + (power.hp - 1) * grit };
}

/**
 * The lowest level of a wave's boss, one more at each step of toughness
 * (2 from wave 6, 3 from 10, 4 from 14, 5 from 18): the night makes it at
 * least as strong as the wave it closes.
 */
export function nightLevel(wave) {
    return Math.min(INVADER.maxLevel, 1 + toughnessSteps(wave));
}

/** How a wave grows with its number: more monsters, sooner, tougher. */
export function waveShape(wave) {
    const { count, gap, alive } = WAVES;
    return {
        count: Math.round(count.base + wave * count.perWave),
        gap: Math.max(gap.min, gap.start - wave * gap.perWave),
        maxAlive: Math.min(alive.base + wave, alive.max),
        power: {
            hp: 1 + toughnessSteps(wave) * WAVES.toughness.step,
            speed: 1 + Math.min(0.8, (wave - 1) * 0.04),
        },
    };
}

export function mixFor(wave) {
    let weights = WAVE_MIX[0].weights;
    for (const step of WAVE_MIX) if (wave >= step.from) weights = step.weights;
    return weights;
}

/**
 * The boss of the `index`-th boss wave (0 for the first). The invaders take
 * turns and start again from the first when the roster runs out, one lap
 * stronger each time, and never below the wave's own level (`nightLevel`);
 * with none, the forest sends its own (no id, no name), drawn from the
 * wave's monsters and as strong as the wave.
 * @returns {{kind: string, invader: {id: string|null, kind: string, level: number, name: string|null, lap: number}}}
 */
export function bossFor(index, roster, { seed, wave }) {
    if (roster.length > 0) {
        const entry = roster[index % roster.length];
        const level = Math.max(entry.level ?? 1, nightLevel(wave));
        return { kind: entry.kind, invader: { ...entry, level, lap: Math.floor(index / roster.length) } };
    }
    const kind = Rng.fork(seed, `boss:${wave}`).weighted(mixFor(wave));
    return { kind, invader: { id: null, kind, level: nightLevel(wave), name: null, lap: 0 } };
}

/**
 * The waves of the night. Each wave draws its monsters from its own random
 * stream, so the night is the same for everybody with the same seed, with or
 * without invaders. Every few waves a boss closes the wave (`bossFor`): once
 * the field is clear, a warning ('herald'), then it steps in alone.
 */
export class Director {
    #seed;
    #roster;
    #bossesSent = 0;
    #queue = [];
    /** The boss waiting for the end of this wave, if any: `{kind, invader}`. */
    #boss = null;
    #spawnTimer = 0;
    #shape = null;
    /** Seconds the wave still waits after its boss fell. */
    #farewell = 0;

    wave = 0;
    /** 'fight' while monsters come, 'herald' while the invader is announced, 'break' between waves. */
    phase = 'break';
    timer = WAVES.firstSpawnDelay;
    flawless = true;

    /** @param {number} seed @param {object[]} invaders other players' monsters, the bosses' roster in order */
    constructor(seed, invaders = []) {
        this.#seed = seed;
        this.#roster = [...invaders];
    }

    get remaining() {
        return this.#queue.length + (this.#boss ? 1 : 0);
    }

    get shape() {
        return this.#shape;
    }

    /** True when the wave just cleared moves the night to a new scene. */
    get sceneChangeDue() {
        return this.wave > 0 && this.wave % WAVES.wavesPerMap === 0;
    }

    #startWave() {
        this.wave += 1;
        this.phase = 'fight';
        this.flawless = true;
        this.#shape = waveShape(this.wave);
        const rng = Rng.fork(this.#seed, `wave:${this.wave}`);
        const mix = mixFor(this.wave);
        this.#queue = Array.from({ length: this.#shape.count }, () => ({ kind: rng.weighted(mix) }));
        this.#queue[0] = { kind: 'bat' };
        this.#boss = this.wave % WAVES.invaderEvery === 0 ? this.#nextBoss() : null;
        this.#spawnTimer = 0;
    }

    /** The boss fell: the wave ends only once its fall has played (`INVADER.farewell`). */
    bossFallen() {
        this.#farewell = INVADER.farewell;
    }

    #nextBoss() {
        const boss = bossFor(this.#bossesSent, this.#roster, { seed: this.#seed, wave: this.wave });
        this.#bossesSent += 1;
        return boss;
    }

    /**
     * One tick of the night. `herald` is the invader announced this tick.
     * @returns {{spawns: object[], started: boolean, cleared: boolean, herald: object|null}}
     */
    update(dt, alive) {
        if (this.phase === 'break') return this.#rest(dt);
        if (this.phase === 'herald') return this.#announce(dt);
        const spawns = [];
        this.#spawnTimer -= dt;
        if (this.#queue.length > 0 && this.#spawnTimer <= 0 && alive < this.#shape.maxAlive) {
            spawns.push(this.#queue.shift());
            this.#spawnTimer = this.#shape.gap;
        }
        this.#farewell = Math.max(0, this.#farewell - dt);
        const fieldClear = this.#queue.length === 0 && alive === 0 && spawns.length === 0;
        if (fieldClear && this.#boss) return this.#herald();
        if (fieldClear && this.#farewell > 0) return { spawns, started: false, cleared: false, herald: null };
        if (fieldClear) {
            this.phase = 'break';
            this.timer = WAVES.breakTime;
        }
        return { spawns, started: false, cleared: fieldClear, herald: null };
    }

    /** The wave's monsters are down: the boss is announced. */
    #herald() {
        this.phase = 'herald';
        this.timer = INVADER.heraldTime;
        return { spawns: [], started: false, cleared: false, herald: this.#boss.invader };
    }

    /** The warning runs out and the boss steps in. */
    #announce(dt) {
        this.timer -= dt;
        if (this.timer > 0) return { spawns: [], started: false, cleared: false, herald: null };
        const boss = this.#boss;
        this.#boss = null;
        this.phase = 'fight';
        return { spawns: [boss], started: false, cleared: false, herald: null };
    }

    #rest(dt) {
        this.timer -= dt;
        const started = this.timer <= 0;
        if (started) this.#startWave();
        return { spawns: [], started, cleared: false, herald: null };
    }
}
