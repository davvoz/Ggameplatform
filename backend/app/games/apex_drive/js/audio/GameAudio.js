import { INSTRUMENTS, MUSIC, SONGS } from '../config/Music.js';
import { ENGINE, LEVELS, SOUNDS } from '../config/Sounds.js';
import { engineState } from './engineState.js';
import { EngineSound } from './EngineSound.js';
import { gainOf, stepOf } from './levels.js';
import { MusicPlayer } from './MusicPlayer.js';
import { Synth } from './Synth.js';

/**
 * The game's sound, synthesised: what the screens and the race ask for.
 * - `play(name)`: a sound effect of config/Sounds.js;
 * - `raceEvents(events)`: the sounds of a race's events (each kind once a tick);
 * - `drive(race)`: the engine, tyres and wind of the race being driven,
 *   `quiet()` when no race is;
 * - `music(id)`: the background song (config/Music.js), `duckMusic` while
 *   paused; `update()` once a frame books its notes.
 * - `volumes` / `setVolumes`: the effects and music volumes, in steps of
 *   config/Sounds.js LEVELS.
 * Muted or not, and the volumes, are remembered by main.js (`settings`).
 */
export class GameAudio {
    #synth = new Synth();
    #engine = new EngineSound(this.#synth, ENGINE);
    #music = new MusicPlayer(this.#synth, { songs: SONGS, instruments: INSTRUMENTS, config: MUSIC });
    #volumes = { effects: LEVELS.effects, music: LEVELS.music };

    get muted() {
        return this.#synth.muted;
    }

    /** Called on every touch and key: the browser lets sound start only after one. */
    unlock() {
        this.#synth.unlock();
    }

    setMuted(muted) {
        this.#synth.setMuted(muted);
    }

    setSuspended(suspended) {
        this.#synth.setSuspended(suspended);
    }

    /** @returns {{effects: number, music: number}} steps */
    get volumes() {
        return { ...this.#volumes };
    }

    /** @param {{effects?: unknown, music?: unknown}} volumes steps; anything else keeps the current one */
    setVolumes({ effects, music }) {
        this.#volumes = {
            effects: stepOf(effects, this.#volumes.effects, LEVELS.steps),
            music: stepOf(music, this.#volumes.music, LEVELS.steps),
        };
        this.#synth.setEffectsLevel(gainOf(this.#volumes.effects, LEVELS.steps));
        this.#music.setLevel(gainOf(this.#volumes.music, LEVELS.steps));
    }

    play(name) {
        this.#synth.play(SOUNDS[name]);
    }

    /** @param {import('../sim/Race.js').RaceEvent[]} events */
    raceEvents(events) {
        const played = new Set();
        for (const event of events) {
            const name = soundOf(event);
            if (!name || played.has(name)) continue;
            played.add(name);
            this.play(name);
        }
    }

    /** @param {import('../sim/Race.js').Race} race */
    drive(race, clock) {
        this.#engine.update(engineState(race, ENGINE), clock);
    }

    quiet() {
        this.#engine.silence();
    }

    /** @param {string | null} id the song to play (the same one goes on), null for none */
    music(id) {
        this.#music.play(id);
    }

    duckMusic(on) {
        this.#music.duck(on);
    }

    /** Once a frame. */
    update() {
        this.#music.update();
    }
}

/** The sound of a race event, or null for a silent one. */
export function soundOf(event) {
    switch (event.type) {
        case 'pickup':
            return event.kind === 'nitro' && event.value === 0 ? 'pickup:full' : `pickup:${event.kind}`;
        case 'bump':
            return event.hurt ? 'bumpHurt' : 'bump';
        case 'position':
            return event.to < event.from ? 'positionUp' : 'positionDown';
        case 'current':
            return event.flow === 'against' ? 'undertow' : 'current';
        default:
            return event.type in SOUNDS ? event.type : null;
    }
}
