/**
 * The audio graph: one context, a master gain with separate music and effects
 * buses, and a white noise buffer shared by every drum and explosion. The
 * context only starts after a user gesture, as browsers require.
 */
const MASTER = 0.55;

export class AudioEngine {
    /** @type {AudioContext | null} */
    ctx = null;
    master = null;
    sfx = null;
    music = null;
    noise = null;
    #muted = false;
    #suspended = false;

    get ready() {
        return this.ctx !== null && this.ctx.state === 'running';
    }

    get muted() {
        return this.#muted;
    }

    unlock() {
        if (!this.ctx) {
            const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
            if (!Ctx) return;
            this.ctx = new Ctx();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.#muted ? 0 : MASTER;
            // a gentle limiter so explosions never clip
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -10;
            comp.ratio.value = 6;
            this.master.connect(comp).connect(this.ctx.destination);
            this.sfx = this.ctx.createGain();
            this.sfx.gain.value = 0.8;
            this.sfx.connect(this.master);
            this.music = this.ctx.createGain();
            this.music.gain.value = 0.38;
            this.music.connect(this.master);
            const len = this.ctx.sampleRate;
            this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === 'suspended' && !this.#suspended) this.ctx.resume().catch(() => {});
    }

    setMuted(muted) {
        this.#muted = muted;
        if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : MASTER, this.ctx.currentTime, 0.02);
    }

    /** Pause everything while the game is hidden or paused by the platform. */
    setSuspended(suspended) {
        this.#suspended = suspended;
        if (!this.ctx) return;
        if (suspended) this.ctx.suspend().catch(() => {});
        else this.ctx.resume().catch(() => {});
    }

    get now() {
        return this.ctx?.currentTime ?? 0;
    }
}
