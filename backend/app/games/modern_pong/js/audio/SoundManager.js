/**
 * SoundManager — Procedural audio synthesis for Modern Pong.
 * All sounds are generated via Web Audio API oscillators + noise buffers.
 * Background music is a looping procedural synth track.
 */
export class SoundManager {
    #ctx = null;
    #musicEnabled = true;
    #sfxEnabled = true;
    #musicVolume = 0.18;
    #sfxVolume = 0.35;
    #initialized = false;
    #musicGain = null;
    #musicNodes = [];
    #musicTimer = null;
    #musicPlaying = false;

    async init() {
        try {
            this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.#musicGain = this.#ctx.createGain();
            this.#musicGain.gain.value = this.#musicVolume;
            this.#musicGain.connect(this.#ctx.destination);
            this.#initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    resume() {
        if (this.#ctx && this.#ctx.state === 'suspended') {
            this.#ctx.resume();
        }
    }

    get musicEnabled() { return this.#musicEnabled; }
    get sfxEnabled() { return this.#sfxEnabled; }

    /* ================================================================
     *  MUSIC — procedural looping synth
     * ================================================================ */

    playMenuMusic() {
        if (!this.#initialized || !this.#musicEnabled || this.#musicPlaying) return;
        this.#musicPlaying = true;
        this.#loopMenuMusic();
    }

    playGameMusic() {
        if (!this.#initialized || !this.#musicEnabled || this.#musicPlaying) return;
        this.#musicPlaying = true;
        this.#loopGameMusic();
    }

    stopMusic() {
        this.#musicPlaying = false;
        if (this.#musicTimer) {
            clearTimeout(this.#musicTimer);
            this.#musicTimer = null;
        }
        for (const n of this.#musicNodes) {
            try { n.stop(); } catch (_) {}
            try { n.disconnect(); } catch (_) {}
        }
        this.#musicNodes = [];
    }

    toggleMusic() {
        this.#musicEnabled = !this.#musicEnabled;
        if (!this.#musicEnabled) {
            this.stopMusic();
        }
        return this.#musicEnabled;
    }

    toggleSFX() {
        this.#sfxEnabled = !this.#sfxEnabled;
        return this.#sfxEnabled;
    }

    /* ---- menu music: chill ambient pad ---- */

    #loopMenuMusic() {
        if (!this.#musicPlaying) return;
        const t = this.#ctx.currentTime;
        const dur = 8; // seconds per loop

        // Warm pad chord: Am (A3, C4, E4)
        const notes = [220, 261.6, 329.6];
        for (const freq of notes) {
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            // Gentle vibrato
            osc.frequency.setValueAtTime(freq, t);
            const lfo = this.#ctx.createOscillator();
            const lfoG = this.#ctx.createGain();
            lfo.frequency.value = 3;
            lfoG.gain.value = 2;
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lfo.start(t);
            lfo.stop(t + dur);
            this.#musicNodes.push(lfo);

            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.06, t + 1.5);
            g.gain.setValueAtTime(0.06, t + dur - 2);
            g.gain.linearRampToValueAtTime(0.001, t + dur);
            osc.connect(g);
            g.connect(this.#musicGain);
            osc.start(t);
            osc.stop(t + dur + 0.1);
            this.#musicNodes.push(osc);
        }

        // Sub bass drone
        const sub = this.#ctx.createOscillator();
        const subG = this.#ctx.createGain();
        sub.type = 'sine';
        sub.frequency.value = 110;
        subG.gain.setValueAtTime(0.001, t);
        subG.gain.linearRampToValueAtTime(0.08, t + 2);
        subG.gain.setValueAtTime(0.08, t + dur - 2);
        subG.gain.linearRampToValueAtTime(0.001, t + dur);
        sub.connect(subG);
        subG.connect(this.#musicGain);
        sub.start(t);
        sub.stop(t + dur + 0.1);
        this.#musicNodes.push(sub);

        this.#musicTimer = setTimeout(() => {
            this.#musicNodes = [];
            this.#loopMenuMusic();
        }, dur * 1000 - 200);
    }

    /* ---- game music: driving synth pulse ---- */

    #loopGameMusic() {
        if (!this.#musicPlaying) return;
        const t = this.#ctx.currentTime;
        const bpm = 128;
        const beat = 60 / bpm;
        const barLen = beat * 4;
        const dur = barLen * 4; // 4 bars

        // Bass line pattern (Em pentatonic)
        const bassNotes = [82.4, 98, 110, 82.4, 98, 73.4, 82.4, 110,
                           82.4, 98, 110, 130.8, 110, 98, 82.4, 73.4];
        for (let i = 0; i < bassNotes.length; i++) {
            const note = bassNotes[i];
            const start = t + i * beat;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note, start);
            g.gain.setValueAtTime(0.001, start);
            g.gain.linearRampToValueAtTime(0.07, start + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, start + beat * 0.9);
            osc.connect(g);
            g.connect(this.#musicGain);
            osc.start(start);
            osc.stop(start + beat);
            this.#musicNodes.push(osc);
        }

        // Hi-hat 8th notes
        for (let i = 0; i < 32; i++) {
            const start = t + i * (beat / 2);
            const accent = (i % 4 === 0) ? 0.07 : 0.03;
            const bufSize = Math.floor(this.#ctx.sampleRate * 0.04);
            const buf = this.#ctx.createBuffer(1, bufSize, this.#ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < bufSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 4);
            }
            const src = this.#ctx.createBufferSource();
            src.buffer = buf;
            const hpf = this.#ctx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 8000;
            const g = this.#ctx.createGain();
            g.gain.setValueAtTime(accent, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
            src.connect(hpf);
            hpf.connect(g);
            g.connect(this.#musicGain);
            src.start(start);
            this.#musicNodes.push(src);
        }

        // Kick on beats
        for (let i = 0; i < 16; i++) {
            if (i % 2 !== 0 && i % 4 !== 3) continue; // kick pattern
            const start = t + i * beat;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, start);
            osc.frequency.exponentialRampToValueAtTime(40, start + 0.1);
            g.gain.setValueAtTime(0.12, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            osc.connect(g);
            g.connect(this.#musicGain);
            osc.start(start);
            osc.stop(start + 0.25);
            this.#musicNodes.push(osc);
        }

        // Arpeggio lead (Em: E4, G4, B4, E5)
        const arpNotes = [329.6, 392, 493.9, 659.3, 493.9, 392];
        for (let i = 0; i < arpNotes.length; i++) {
            const start = t + barLen * 2 + i * (beat / 2);
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(arpNotes[i], start);
            g.gain.setValueAtTime(0.001, start);
            g.gain.linearRampToValueAtTime(0.04, start + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, start + beat * 0.8);
            osc.connect(g);
            g.connect(this.#musicGain);
            osc.start(start);
            osc.stop(start + beat);
            this.#musicNodes.push(osc);
        }

        this.#musicTimer = setTimeout(() => {
            this.#musicNodes = [];
            this.#loopGameMusic();
        }, dur * 1000 - 100);
    }

    /* ================================================================
     *  SOUND EFFECTS
     * ================================================================ */

    #synth(freq, dur, type = 'sine', vol = 0.2, ramp = true) {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol * this.#sfxVolume, t);
            if (ramp) g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + dur);
        } catch (_) {}
    }

    #noise(dur, vol = 0.1) {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const bufSize = Math.floor(this.#ctx.sampleRate * dur);
            const buf = this.#ctx.createBuffer(1, bufSize, this.#ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
            }
            const src = this.#ctx.createBufferSource();
            src.buffer = buf;
            const g = this.#ctx.createGain();
            g.gain.setValueAtTime(vol * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            src.connect(g);
            g.connect(this.#ctx.destination);
            src.start(t);
        } catch (_) {}
    }

    /** Button / menu click */
    playClick() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
            g.gain.setValueAtTime(0.15 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (_) {}
    }

    /** Ball hits paddle / character */
    playPaddleHit() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
            g.gain.setValueAtTime(0.3 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
            // click layer
            const osc2 = this.#ctx.createOscillator();
            const g2 = this.#ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1400, t);
            g2.gain.setValueAtTime(0.1 * this.#sfxVolume, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            osc2.connect(g2);
            g2.connect(this.#ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.05);
        } catch (_) {}
    }

    /** Ball hits wall */
    playWallHit() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.06);
            g.gain.setValueAtTime(0.12 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (_) {}
    }

    /** Goal scored! */
    playGoal() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            // Impact thud
            this.#noise(0.25, 0.3);
            this.#synth(60, 0.4, 'sine', 0.3);
            // Rising celebration tone
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t + 0.1);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
            g.gain.setValueAtTime(0.001, t + 0.1);
            g.gain.linearRampToValueAtTime(0.15 * this.#sfxVolume, t + 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t + 0.1);
            osc.stop(t + 0.55);
        } catch (_) {}
    }

    /** Countdown tick (3, 2, 1) */
    playCountdownTick() {
        this.#synth(880, 0.15, 'sine', 0.2);
    }

    /** GO! */
    playCountdownGo() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const notes = [523, 659, 784]; // C5 E5 G5
            notes.forEach((freq, i) => {
                const osc = this.#ctx.createOscillator();
                const g = this.#ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t + i * 0.06);
                g.gain.setValueAtTime(0.001, t + i * 0.06);
                g.gain.linearRampToValueAtTime(0.2 * this.#sfxVolume, t + i * 0.06 + 0.03);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.connect(g);
                g.connect(this.#ctx.destination);
                osc.start(t + i * 0.06);
                osc.stop(t + 0.5);
            });
        } catch (_) {}
    }

    /** Power-up collected */
    playPowerUp() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
            osc.frequency.setValueAtTime(1200, t + 0.12);
            osc.frequency.exponentialRampToValueAtTime(1500, t + 0.2);
            g.gain.setValueAtTime(0.2 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        } catch (_) {}
    }

    /** Shield hit / field object destroyed */
    playShieldHit() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400, t);
            osc.frequency.exponentialRampToValueAtTime(700, t + 0.12);
            g.gain.setValueAtTime(0.18 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
            // shimmer
            const osc2 = this.#ctx.createOscillator();
            const g2 = this.#ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1800, t);
            osc2.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
            g2.gain.setValueAtTime(0.08 * this.#sfxVolume, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc2.connect(g2);
            g2.connect(this.#ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.12);
        } catch (_) {}
    }

    /** Match end — winner fanfare */
    playMatchWin() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
            notes.forEach((freq, i) => {
                const osc = this.#ctx.createOscillator();
                const g = this.#ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t + i * 0.15);
                g.gain.setValueAtTime(0.001, t + i * 0.15);
                g.gain.linearRampToValueAtTime(0.18 * this.#sfxVolume, t + i * 0.15 + 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
                osc.connect(g);
                g.connect(this.#ctx.destination);
                osc.start(t + i * 0.15);
                osc.stop(t + i * 0.15 + 0.55);
            });
        } catch (_) {}
    }

    /** Match end — loser sound */
    playMatchLose() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const notes = [440, 392, 349, 294]; // A4 G4 F4 D4 descending
            notes.forEach((freq, i) => {
                const osc = this.#ctx.createOscillator();
                const g = this.#ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const st = t + i * 0.2;
                g.gain.setValueAtTime(0.2 * this.#sfxVolume, st);
                g.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
                osc.connect(g);
                g.connect(this.#ctx.destination);
                osc.start(st);
                osc.stop(st + 0.35);
            });
        } catch (_) {}
    }

    /** Character selected in character select */
    playCharacterSelect() {
        this.#synth(700, 0.12, 'sine', 0.15);
        setTimeout(() => this.#synth(1100, 0.1, 'sine', 0.12), 60);
    }

    /** Character confirmed / locked in */
    playConfirm() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
            g.gain.setValueAtTime(0.2 * this.#sfxVolume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (_) {}
    }

    /** Super shot activation — dramatic rising sweep */
    playSuperShot() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const vol = this.#sfxVolume;
            // Rising sweep
            const osc1 = this.#ctx.createOscillator();
            const g1 = this.#ctx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(200, t);
            osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
            g1.gain.setValueAtTime(0.2 * vol, t);
            g1.gain.linearRampToValueAtTime(0.3 * vol, t + 0.1);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc1.connect(g1);
            g1.connect(this.#ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.55);
            // Impact burst
            const osc2 = this.#ctx.createOscillator();
            const g2 = this.#ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(150, t + 0.15);
            osc2.frequency.exponentialRampToValueAtTime(60, t + 0.45);
            g2.gain.setValueAtTime(0.001, t);
            g2.gain.linearRampToValueAtTime(0.25 * vol, t + 0.15);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc2.connect(g2);
            g2.connect(this.#ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.55);
        } catch (_) {}
    }

    /** Super bar fully charged — short chime */
    playSuperReady() {
        if (!this.#initialized || !this.#sfxEnabled) return;
        try {
            const t = this.#ctx.currentTime;
            const vol = this.#sfxVolume;
            const osc = this.#ctx.createOscillator();
            const g = this.#ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.setValueAtTime(1100, t + 0.08);
            osc.frequency.setValueAtTime(1320, t + 0.16);
            g.gain.setValueAtTime(0.18 * vol, t);
            g.gain.setValueAtTime(0.22 * vol, t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(g);
            g.connect(this.#ctx.destination);
            osc.start(t);
            osc.stop(t + 0.45);
        } catch (_) {}
    }
}
