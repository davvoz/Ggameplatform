import { WAVE_MIX } from '../config/Enemies.js';
import { INVADER, WAVES } from '../config/Tuning.js';
import { Rng } from '../core/Rng.js';

/** How a wave grows with its number: more monsters, sooner, tougher. */
export function waveShape(wave) {
    const { count, gap, alive, toughness } = WAVES;
    return {
        count: Math.round(count.base + wave * count.perWave),
        gap: Math.max(gap.min, gap.start - wave * gap.perWave),
        maxAlive: Math.min(alive.base + wave, alive.max),
        power: {
            hp: 1 + Math.floor((wave - 1) / toughness.every) * toughness.step,
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
 * The waves of the night. Each wave draws its monsters from its own random
 * stream, so the night is the same for everybody with the same seed, with or
 * without invaders. Every few waves an invader sent by another player closes
 * the wave as its boss: once the field is clear, a warning ('herald'), then it
 * steps in alone.
 */
export class Director {
    #seed;
    #invaders;
    #queue = [];
    /** The invader waiting for the end of this wave, if any. */
    #boss = null;
    #spawnTimer = 0;
    #shape = null;

    wave = 0;
    /** 'fight' while monsters come, 'herald' while the invader is announced, 'break' between waves. */
    phase = 'break';
    timer = WAVES.firstSpawnDelay;
    flawless = true;

    /** @param {number} seed @param {object[]} invaders other players' monsters, in order */
    constructor(seed, invaders = []) {
        this.#seed = seed;
        this.#invaders = [...invaders];
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
        const bossWave = this.wave % WAVES.invaderEvery === 0;
        this.#boss = bossWave ? (this.#invaders.shift() ?? null) : null;
        this.#spawnTimer = 0;
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
        const fieldClear = this.#queue.length === 0 && alive === 0 && spawns.length === 0;
        if (fieldClear && this.#boss) return this.#herald();
        if (fieldClear) {
            this.phase = 'break';
            this.timer = WAVES.breakTime;
        }
        return { spawns, started: false, cleared: fieldClear, herald: null };
    }

    /** The wave's monsters are down: the invader is announced. */
    #herald() {
        this.phase = 'herald';
        this.timer = INVADER.heraldTime;
        return { spawns: [], started: false, cleared: false, herald: this.#boss };
    }

    /** The warning runs out and the invader steps in. */
    #announce(dt) {
        this.timer -= dt;
        if (this.timer > 0) return { spawns: [], started: false, cleared: false, herald: null };
        const invader = this.#boss;
        this.#boss = null;
        this.phase = 'fight';
        return { spawns: [{ kind: invader.kind, invader }], started: false, cleared: false, herald: null };
    }

    #rest(dt) {
        this.timer -= dt;
        const started = this.timer <= 0;
        if (started) this.#startWave();
        return { spawns: [], started, cleared: false, herald: null };
    }
}
