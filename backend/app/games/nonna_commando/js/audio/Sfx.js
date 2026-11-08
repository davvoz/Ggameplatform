/**
 * Sound effects, synthesised: square and triangle oscillators with pitch
 * sweeps, filtered noise for shots and blasts. Each sound has a minimum gap so
 * a machinegun never stacks fifty copies of itself.
 */

const GAP = {
    pistol: 0.04, heavy: 0.035, flame: 0.07, enemyShot: 0.05, hit: 0.03, clang: 0.05, kill: 0.04,
    explosion: 0.06, pop: 0.04, casing: 0.05, chain: 0.05, step: 0.1,
};

export class Sfx {
    #a;
    #last = new Map();

    /** @param {import('./AudioEngine.js').AudioEngine} engine */
    constructor(engine) {
        this.#a = engine;
    }

    play(name, arg = 0) {
        const a = this.#a;
        if (!a.ready) return;
        const now = a.now;
        const gap = GAP[name] ?? 0.02;
        if (now - (this.#last.get(name) ?? -1) < gap) return;
        this.#last.set(name, now);
        const fn = this[`_${name}`];
        if (fn) fn.call(this, now, arg);
    }

    // ---- primitives

    #tone(type, f0, f1, t, dur, vol, out = this.#a.sfx) {
        const ctx = this.#a.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    #noise(t, dur, vol, filter = 'lowpass', f0 = 2000, f1 = f0, q = 0.8) {
        const ctx = this.#a.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.#a.noise;
        src.playbackRate.value = 0.8 + Math.random() * 0.4;
        const bq = ctx.createBiquadFilter();
        bq.type = filter;
        bq.Q.value = q;
        bq.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        src.connect(bq).connect(g).connect(this.#a.sfx);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.02);
    }

    #arp(notes, t, step, type = 'square', vol = 0.12, len = step * 1.6) {
        notes.forEach((n, i) => {
            const f = 440 * 2 ** ((n - 69) / 12);
            this.#tone(type, f, f, t + i * step, len, vol);
        });
    }

    // ---- the sounds

    _pistol(t) {
        this.#noise(t, 0.08, 0.35, 'bandpass', 2400, 900, 1.2);
        this.#tone('square', 520, 140, t, 0.06, 0.12);
    }

    _heavy(t) {
        this.#noise(t, 0.07, 0.32, 'bandpass', 1600, 500, 1);
        this.#tone('square', 260, 90, t, 0.05, 0.12);
    }

    _shotgun(t) {
        this.#noise(t, 0.35, 0.6, 'lowpass', 3000, 200);
        this.#tone('triangle', 140, 40, t, 0.25, 0.4);
    }

    _rocket(t) {
        this.#noise(t, 0.4, 0.25, 'bandpass', 600, 3000, 2);
        this.#tone('square', 880, 1760, t, 0.15, 0.05);
    }

    _flame(t) {
        this.#noise(t, 0.14, 0.18, 'lowpass', 900, 400);
    }

    _bombThrow(t) {
        this.#tone('triangle', 300, 600, t, 0.12, 0.2);
    }

    _explosion(t, big) {
        this.#noise(t, big ? 1.1 : 0.6, big ? 0.9 : 0.6, 'lowpass', big ? 1800 : 2400, 60);
        this.#tone('sine', big ? 90 : 120, 30, t, big ? 0.8 : 0.4, big ? 0.7 : 0.5);
    }

    _pop(t) {
        this.#noise(t, 0.06, 0.4, 'highpass', 3000);
        this.#tone('square', 900, 300, t, 0.05, 0.1);
    }

    _enemyShot(t) {
        this.#tone('square', 1300, 500, t, 0.09, 0.07);
    }

    _hit(t) {
        this.#noise(t, 0.04, 0.2, 'highpass', 2500);
    }

    _clang(t) {
        this.#tone('square', 1900, 1850, t, 0.18, 0.06);
        this.#tone('square', 2550, 2500, t, 0.15, 0.05);
    }

    _kill(t, mult) {
        this.#tone('square', 330 + mult * 40, 660 + mult * 80, t, 0.08, 0.1);
        this.#noise(t, 0.08, 0.18, 'bandpass', 4000, 2000, 2);
    }

    _swat(t) {
        this.#arp([88, 95], t, 0.05, 'square', 0.1);
    }

    _melee(t) {
        this.#noise(t, 0.12, 0.5, 'lowpass', 1200, 300);
        this.#tone('triangle', 200, 80, t, 0.1, 0.4);
    }

    _jump(t) {
        this.#tone('square', 280, 520, t, 0.08, 0.06);
    }

    _land(t) {
        this.#noise(t, 0.06, 0.15, 'lowpass', 500);
    }

    _pickup(t) {
        this.#arp([76, 81, 88], t, 0.05, 'square', 0.1);
    }

    _tooth(t) {
        this.#arp([84, 88, 91, 96, 100], t, 0.05, 'square', 0.1);
    }

    _weapon(t) {
        this.#arp([67, 71, 74, 79, 83], t, 0.06, 'square', 0.12);
    }

    _rescue(t) {
        this.#arp([72, 76, 79, 84, 79, 84], t, 0.08, 'triangle', 0.25);
    }

    _chainUp(t, m) {
        this.#tone('square', 400 + m * 90, 800 + m * 180, t, 0.1, 0.07);
    }

    _chainLost(t) {
        this.#tone('square', 500, 120, t, 0.3, 0.08);
    }

    _hurt(t) {
        this.#tone('sawtooth', 300, 80, t, 0.3, 0.15);
        this.#noise(t, 0.2, 0.3, 'lowpass', 800);
    }

    _die(t) {
        this.#arp([67, 63, 60, 55, 48], t, 0.12, 'square', 0.14, 0.2);
    }

    _honk(t) {
        this.#tone('square', 370, 360, t, 0.18, 0.08);
        this.#tone('square', 392, 380, t, 0.18, 0.08);
    }

    _shockwave(t) {
        this.#noise(t, 0.5, 0.6, 'lowpass', 300, 60);
        this.#tone('sine', 60, 30, t, 0.5, 0.6);
    }

    _warning(t) {
        for (let i = 0; i < 3; i++) {
            this.#tone('square', 880, 440, t + i * 0.42, 0.36, 0.1);
        }
    }

    _laser(t) {
        this.#tone('sawtooth', 200, 1600, t, 0.9, 0.08);
    }

    _extraLife(t) {
        this.#arp([72, 76, 79, 84, 88, 91, 96], t, 0.05, 'square', 0.12);
    }

    _clear(t) {
        this.#arp([67, 72, 76, 79, 76, 79, 84], t, 0.11, 'square', 0.14, 0.2);
    }

    _gameOver(t) {
        this.#arp([64, 62, 60, 59, 57, 55, 52], t, 0.18, 'triangle', 0.3, 0.3);
    }

    _victory(t) {
        this.#arp([72, 72, 72, 76, 79, 76, 79, 84, 84, 84], t, 0.1, 'square', 0.14, 0.18);
    }

    _speech(t) {
        this.#tone('square', 600 + Math.random() * 300, 500, t, 0.05, 0.04);
    }
}
