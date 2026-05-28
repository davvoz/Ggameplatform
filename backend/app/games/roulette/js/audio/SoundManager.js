/**
 * Web Audio API sound manager with procedural synthesis.
 * AudioContext is lazily created on first play to comply with browser
 * user-gesture requirements. Per-key throttle prevents audio spam.
 */
export class SoundManager {
    _ctx = null;
    _masterGain = null;
    _buffers = new Map();
    _defs = new Map();
    _lastPlay = new Map();
    _masterVolume = 0.35;

    async load(manifestPath) {
        let manifest;
        try {
            const res = await fetch(manifestPath);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            manifest = await res.json();
        } catch (err) {
            console.warn('[SoundManager] manifest load failed', err.message);
            manifest = { master: this._masterVolume, sounds: {} };
        }
        if (typeof manifest.master === 'number') this._masterVolume = manifest.master;
        for (const [key, def] of Object.entries(manifest.sounds ?? {})) {
            this._defs.set(key, {
                volume:     def.volume     ?? 1,
                throttle:   def.throttle   ?? 0,
                procedural: def.procedural ?? null,
            });
        }
    }

    play(key, opts = {}) {
        this._ensureContext();
        if (!this._ctx) return;
        const def = this._defs.get(key);
        if (!def) return;
        if (def.throttle > 0) {
            const now = performance.now();
            const last = this._lastPlay.get(key) ?? -Infinity;
            if (now - last < def.throttle) return;
            this._lastPlay.set(key, now);
        }
        const vol = def.volume * (opts.volume ?? 1);
        let buf = this._buffers.get(key);
        if (!buf && def.procedural) {
            buf = this._generate(def.procedural);
            if (buf) this._buffers.set(key, buf);
        }
        if (buf) this._playBuffer(buf, vol);
    }

    async suspend() {
        if (this._ctx?.state === 'running') await this._ctx.suspend().catch(() => { /* ignore AudioContext suspend error */ });
    }
    async resume() {
        if (this._ctx?.state === 'suspended') await this._ctx.resume().catch(() => { /* ignore AudioContext resume error */ });
    }

    _ensureContext() {
        if (this._ctx) return;
        try {
            const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
            if (!Ctor) return;
            this._ctx = new Ctor();
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.value = this._masterVolume;
            this._masterGain.connect(this._ctx.destination);
        } catch (err) {
            console.warn('[SoundManager] AudioContext unavailable', err.message);
        }
    }

    _playBuffer(buffer, volume) {
        if (!this._ctx || !this._masterGain) return;
        if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => { /* ignore AudioContext resume error */ });
        try {
            const src  = this._ctx.createBufferSource();
            src.buffer = buffer;
            const gain = this._ctx.createGain();
            gain.gain.value = Math.max(0, Math.min(2, volume));
            src.connect(gain);
            gain.connect(this._masterGain);
            src.start();
        } catch (_err) { /* context may be suspended */ 
            console.error('[SoundManager] playBuffer failed', _err.message);
        }
    }

    _generate(type) {
        const generators = {
            click:       () => this._tone(0.04, 1400, 'square',   0.35),
            chip:        () => this._tone(0.08, 320,  'sine',     0.55, 0.06, 180),
            clear:       () => this._noise(0.12, 0.3, 'bandpass', 800),
            spin_start:  () => this._sweep(0.5, 200, 700, 'sawtooth', 0.4),
            spin_loop:   () => this._noise(0.3, 0.1, 'highpass', 1200),
            bounce:      () => this._tone(0.05, 900, 'triangle', 0.35),
            settle:      () => this._tone(0.2, 220, 'sine',     0.45, 0.18, 110),
            win_small:   () => this._chord(0.45, [523, 659, 784], 0.55),
            win_big:     () => this._chord(0.9, [523, 659, 784, 1046], 0.75),
            lose:        () => this._tone(0.3, 180, 'sawtooth', 0.4, 0.25, 90),
        };
        const fn = generators[type];
        return fn ? fn() : null;
    }

    _newBuffer(durationSec) {
        const sr = this._ctx.sampleRate;
        return this._ctx.createBuffer(1, Math.ceil(durationSec * sr), sr);
    }

    _envelope(i, length, attack, release) {
        const a = Math.max(1, Math.floor(attack * length));
        const r = Math.max(1, Math.floor(release * length));
        if (i < a) return i / a;
        if (i > length - r) return (length - i) / r;
        return 1;
    }

    _tone(durationSec, freq, type, vol, decay = 0, freqEnd = null) {
        const buf = this._newBuffer(durationSec);
        const data = buf.getChannelData(0);
        const sr = this._ctx.sampleRate;
        const n = data.length;
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            const f = freqEnd === null ? freq : freq + (freqEnd - freq) * (i / n);
            const phase = 2 * Math.PI * f * t;
            const wave = this._wave(type, phase);
            const env = this._envelope(i, n, 0.05, 0.3);
            const decayMul = decay > 0 ? Math.exp(-i / (sr * decay)) : 1;
            data[i] = wave * vol * env * decayMul;
        }
        return buf;
    }

    _wave(type, phase) {
        switch (type) {
            case 'sine':     return Math.sin(phase);
            case 'square':   return Math.sin(phase) >= 0 ? 1 : -1;
            case 'triangle': return 2 / Math.PI * Math.asin(Math.sin(phase));
            case 'sawtooth': return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
            default:         return Math.sin(phase);
        }
    }

    _sweep(durationSec, freqStart, freqEnd, type, vol) {
        return this._tone(durationSec, freqStart, type, vol, 0, freqEnd);
    }

    _noise(durationSec, vol, _filterType, _filterFreq) {
        const buf = this._newBuffer(durationSec);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const env = this._envelope(i, data.length, 0.05, 0.5);
            data[i] = (Math.random() * 2 - 1) * vol * env;
        }
        return buf;
    }

    _chord(durationSec, freqs, vol) {
        const buf = this._newBuffer(durationSec);
        const data = buf.getChannelData(0);
        const sr = this._ctx.sampleRate;
        const n = data.length;
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            let s = 0;
            for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
            s /= freqs.length;
            const env = this._envelope(i, n, 0.03, 0.6);
            data[i] = s * vol * env;
        }
        return buf;
    }
}
