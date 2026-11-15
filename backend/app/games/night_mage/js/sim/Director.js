import { WAVE_MIX } from '../config/Enemies.js';
import { WAVES } from '../config/Tuning.js';
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
 * without invaders. Every few waves an invader sent by another player joins.
 */
export class Director {
    #seed;
    #invaders;
    #queue = [];
    #spawnTimer = 0;
    #shape = null;

    wave = 0;
    /** 'fight' while monsters come, 'break' between waves. */
    phase = 'break';
    timer = WAVES.firstSpawnDelay;
    flawless = true;

    /** @param {number} seed @param {object[]} invaders other players' monsters, in order */
    constructor(seed, invaders = []) {
        this.#seed = seed;
        this.#invaders = [...invaders];
    }

    get remaining() {
        return this.#queue.length;
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
        if (this.wave % WAVES.invaderEvery === 0 && this.#invaders.length > 0) {
            const at = rng.int(1, this.#queue.length - 1);
            const invader = this.#invaders.shift();
            this.#queue.splice(at, 0, { kind: invader.kind, invader });
        }
        this.#spawnTimer = 0;
    }

    /**
     * One tick of the night.
     * @returns {{spawns: object[], started: boolean, cleared: boolean}}
     */
    update(dt, alive) {
        if (this.phase === 'break') return this.#rest(dt);
        const spawns = [];
        this.#spawnTimer -= dt;
        if (this.#queue.length > 0 && this.#spawnTimer <= 0 && alive < this.#shape.maxAlive) {
            spawns.push(this.#queue.shift());
            this.#spawnTimer = this.#shape.gap;
        }
        const cleared = this.#queue.length === 0 && alive === 0 && spawns.length === 0;
        if (cleared) {
            this.phase = 'break';
            this.timer = WAVES.breakTime;
        }
        return { spawns, started: false, cleared };
    }

    #rest(dt) {
        this.timer -= dt;
        const started = this.timer <= 0;
        if (started) this.#startWave();
        return { spawns: [], started, cleared: false };
    }
}
