import { View } from '../config/Tuning.js';
import { Ev } from './Events.js';

/**
 * Runs the script of a mission. Each cue fires once, when the camera reaches
 * its `at`:
 *
 *  { at, spawn: [spec...] }              enemies now
 *  { at, arena: { waves: [[spec...]...], lock } }
 *                                        the camera stops; waves come one after
 *                                        another; when the last falls, GO
 *  { at, boss: spec, final }             the camera stops for a boss; `final`
 *                                        ends the mission when it falls
 *  { at, banner: 'TEXT' }                a message across the screen
 *  { at, music: 'track' }
 *
 * A spec is { type, x, y?, opts? }; x is absolute in the world.
 */
const WAVE_GAP = 40;
const ARENA_TIMEOUT = 60 * 50;

export class Director {
    #cues;
    #next = 0;
    #world;
    /** @type {{waves: any[][], index: number, tag: string, gap: number, ticks: number} | null} */
    arena = null;
    bossActive = false;
    #finalBoss = false;
    #arenaCount = 0;

    /**
     * @param {any[]} cues sorted by `at`
     * @param {import('./World.js').World} world
     */
    constructor(cues, world) {
        this.#cues = [...cues].sort((a, b) => a.at - b.at);
        this.#world = world;
    }

    get locked() {
        return this.arena !== null || this.bossActive;
    }

    update() {
        const cam = this.#world.camera;
        while (this.#next < this.#cues.length && cam.x >= this.#cues[this.#next].at && !this.locked) {
            this.#fire(this.#cues[this.#next++]);
        }
        if (this.arena) this.#runArena();
    }

    #fire(cue) {
        const world = this.#world;
        if (cue.banner) world.events.emit(Ev.BANNER, 0, 0, 0, 0, cue.banner);
        if (cue.music) world.events.emit(Ev.MUSIC, 0, 0, 0, 0, cue.music);
        if (cue.spawn) for (const spec of cue.spawn) this.#spawn(spec, '');
        if (cue.arena) {
            const tag = `arena${this.#arenaCount++}`;
            world.camera.lockAt(cue.arena.lock ?? cue.at);
            this.arena = { waves: cue.arena.waves, index: 0, tag, gap: 0, ticks: 0 };
            this.#spawnWave();
        }
        if (cue.boss) {
            world.camera.lockAt(cue.boss.lock ?? cue.at);
            this.bossActive = true;
            this.#finalBoss = !!cue.final;
            this.#spawn(cue.boss, 'boss');
            if (cue.bossMusic) world.events.emit(Ev.MUSIC, 0, 0, 0, 0, cue.bossMusic);
        }
    }

    #spawn(spec, tag) {
        // scripted enemies arrive already alert, unlike the ones placed in the level
        const opts = { awake: true, ...(spec.opts ?? {}), tag };
        return this.#world.spawnEnemy(spec.type, spec.x, spec.y, opts);
    }

    #spawnWave() {
        const a = this.arena;
        for (const spec of a.waves[a.index]) this.#spawn(spec, a.tag);
        a.gap = 0;
    }

    #runArena() {
        const world = this.#world;
        const a = this.arena;
        a.ticks++;
        // wait for the camera to settle before counting
        if (world.camera.settling) return;
        if (world.countTagged(a.tag) > 0 && a.ticks < ARENA_TIMEOUT) return;
        a.gap++;
        if (a.gap < WAVE_GAP) return;
        a.index++;
        if (a.index < a.waves.length) {
            this.#spawnWave();
            return;
        }
        this.arena = null;
        world.camera.unlock();
        world.events.emit(Ev.GO, world.camera.x + View.width - 30, 60);
    }

    bossDefeated() {
        const world = this.#world;
        this.bossActive = false;
        if (this.#finalBoss) {
            world.cleared = true;
            world.events.emit(Ev.BOSS_DEAD, 0, 0, 0, 0, 'final');
            return;
        }
        world.camera.unlock();
        world.events.emit(Ev.BOSS_DEAD);
        world.events.emit(Ev.GO, world.camera.x + View.width - 30, 60);
    }
}
