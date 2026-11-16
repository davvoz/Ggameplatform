import { compileSong, nextStep } from './score.js';

/**
 * The background music: one song at a time, played by booking its notes a
 * little ahead of the audio clock (`update`, once a frame), so a slow frame
 * does not make it stumble. A new song fades in after the old one fades out;
 * pausing lowers it (`duck`); the player's volume scales it all (`setLevel`).
 *
 * The song asked for is remembered until sound is allowed: the first touch
 * starts it.
 */
export class MusicPlayer {
    #synth;
    #songs;
    #instruments;
    #config;
    #compiled = new Map();
    #wanted = null;
    /** @type {{song: import('./score.js').CompiledSong, bus: object, step: number, time: number} | null} */
    #playing = null;
    #out = null;
    #ducked = false;
    #level = 1;

    /**
     * @param {object} synth audio/Synth.js (or a stand-in with the same calls)
     * @param {{songs: object, instruments: object, config: object}} music config/Music.js
     */
    constructor(synth, { songs, instruments, config }) {
        this.#synth = synth;
        this.#songs = songs;
        this.#instruments = instruments;
        this.#config = config;
    }

    /** The song being played (or faded in), or null. */
    get current() {
        return this.#playing?.song.id ?? null;
    }

    /** @param {string | null} id a song of config/Music.js, null for silence */
    play(id) {
        if (id && !this.#songs[id]) throw new Error(`No song ${id}`);
        this.#wanted = id ?? null;
    }

    /** @param {number} level 0..1, the player's music volume */
    setLevel(level) {
        this.#level = level;
        this.#out?.fadeTo(this.#volume, 0.05);
    }

    duck(on) {
        if (on === this.#ducked) return;
        this.#ducked = on;
        this.#out?.fadeTo(this.#volume, this.#config.duckFade);
    }

    update() {
        if (!this.#synth.running) return;
        this.#out ??= this.#synth.createBus({ volume: this.#volume });
        if (this.#wanted !== this.current) this.#switch();
        if (this.#playing) this.#book(this.#playing, this.#synth.now);
    }

    get #volume() {
        return this.#config.volume * this.#level * (this.#ducked ? this.#config.duck : 1);
    }

    #switch() {
        const { fadeIn, fadeOut, gap } = this.#config;
        if (this.#playing) {
            this.#playing.bus.fadeTo(0, fadeOut);
            this.#playing.bus.close(fadeOut + 1);
        }
        this.#playing = null;
        if (!this.#wanted) return;
        const song = this.#song(this.#wanted);
        const echo = song.echo && { ...song.echo, time: song.echo.steps * song.stepSeconds };
        const bus = this.#synth.createBus({ volume: 0, into: this.#out, echo });
        bus.fadeTo(1, fadeIn);
        this.#playing = { song, bus, step: 0, time: this.#synth.now + gap };
    }

    #song(id) {
        if (!this.#compiled.has(id)) this.#compiled.set(id, compileSong(id, this.#songs[id], this.#instruments));
        return this.#compiled.get(id);
    }

    /** Books every step that starts before the lookahead runs out. */
    #book(playing, now) {
        const { song } = playing;
        if (playing.time < now) {
            // the clock ran on without us (a long stall): skip what is past
            const missed = Math.ceil((now - playing.time) / song.stepSeconds);
            playing.step = nextStep(song, playing.step, missed);
            playing.time += missed * song.stepSeconds;
        }
        while (playing.time < now + this.#config.lookahead) {
            for (const event of song.events[playing.step]) this.#sound(event, playing);
            playing.step = nextStep(song, playing.step);
            playing.time += song.stepSeconds;
        }
    }

    #sound(event, { song, bus, time }) {
        const instrument = this.#instruments[event.channel];
        if (event.hit) this.#synth.schedule(instrument.kit[event.hit], time, bus.input);
        else this.#synth.note(time, event.frequency, event.steps * song.stepSeconds, instrument, bus);
    }
}
