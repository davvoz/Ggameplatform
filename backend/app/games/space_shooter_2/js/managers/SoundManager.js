/**
 * SoundManager - Procedural audio synthesis + WAV music
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.4;
        this.currentTrack = 0;
        this.musicSource = null;
        this.musicGain = null;
        this.musicBuffers = [];
        this.initialized = false;
        this.analyser = null;
        this.analyserData = null;
    }

    async init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;

            // Create AnalyserNode for audio-reactive visuals
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

            // Chain: musicGain → analyser → destination
            this.musicGain.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);

            this.initialized = true;

            // Load music tracks (0=game, 1=intro)
            const tracks = ['assets/background.mp3', 'assets/intro.mp3'];
            for (const track of tracks) {
                try {
                    const response = await fetch(track);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const audioBuffer = await this.ctx.decodeAudioData(buffer);
                        this.musicBuffers.push(audioBuffer);
                    }
                } catch (e) {
                    // Track not available
                }
            }
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playMusic(trackIndex = 0) {
        if (!this.initialized || !this.musicEnabled) return;
        if (trackIndex >= this.musicBuffers.length) return;

        // If same track is already playing, do nothing
        if (this.musicSource && this.currentTrack === trackIndex) return;

        this.currentTrack = trackIndex;

        // If music is currently playing, fade out first then start new track
        if (this.musicSource) {
            this._fadeOutAndSwitch(trackIndex);
        } else {
            this._startTrack(trackIndex);
        }
    }

    _fadeOutAndSwitch(trackIndex) {
        const fadeDuration = 1.0; // seconds
        const now = this.ctx.currentTime;
        const oldSource = this.musicSource;
        const oldGain = this.musicGain;

        // Create a dedicated gain node for the old track to fade it out independently
        const fadeGain = this.ctx.createGain();
        fadeGain.gain.setValueAtTime(this.musicVolume, now);
        fadeGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
        fadeGain.connect(this.ctx.destination);

        // Disconnect old source from main gain node and connect to fade gain
        try { oldSource.disconnect(); } catch (e) {}
        oldSource.connect(fadeGain);

        // Stop old source after fade completes
        setTimeout(() => {
            try { oldSource.stop(); } catch (e) {}
            try { fadeGain.disconnect(); } catch (e) {}
        }, fadeDuration * 1000 + 50);

        // Clear reference and start new track immediately (fades cross naturally)
        this.musicSource = null;
        this._startTrack(trackIndex);
    }

    _startTrack(trackIndex) {
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.musicBuffers[trackIndex];
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start(0);
    }

    stopMusic() {
        if (this.musicSource) {
            // Fade out before stopping
            if (this.musicGain && this.ctx) {
                const fadeDuration = 0.5;
                const now = this.ctx.currentTime;
                this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
                this.musicGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
                const src = this.musicSource;
                this.musicSource = null;
                setTimeout(() => {
                    try { src.stop(); } catch (e) {}
                    // Restore gain for next playback
                    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
                }, fadeDuration * 1000 + 50);
            } else {
                try { this.musicSource.stop(); } catch (e) {}
                this.musicSource = null;
            }
        }
    }

    pauseMusic() {
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
    }

    resumeMusic() {
        if (this.musicGain && this.musicEnabled) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
    }

    /** Play the intro/menu music (track 1) */
    playIntroMusic() {
        this.playMusic(1);
    }

    /** Play the gameplay music (track 0) */
    playGameMusic() {
        this.playMusic(0);
    }

    /**
     * Get frequency data from the analyser (0-255 per bin).
     * Returns the raw Uint8Array (128 bins by default).
     */
    getFrequencyData() {
        if (!this.analyser || !this.analyserData) return null;
        this.analyser.getByteFrequencyData(this.analyserData);
        return this.analyserData;
    }

    /**
     * Get simplified audio levels for reactive visuals.
     * Returns { bass, mid, treble, overall } each 0.0-1.0.
     */
    getAudioLevels() {
        const data = this.getFrequencyData();
        if (!data) return { bass: 0, mid: 0, treble: 0, overall: 0 };

        const bins = data.length; // 128
        let bass = 0, mid = 0, treble = 0;
        const bassEnd = Math.floor(bins * 0.15);   // ~0-300Hz
        const midEnd = Math.floor(bins * 0.5);     // ~300-2kHz
        // treble: rest

        for (let i = 0; i < bins; i++) {
            const v = data[i] / 255;
            if (i < bassEnd) bass += v;
            else if (i < midEnd) mid += v;
            else treble += v;
        }

        bass /= bassEnd || 1;
        mid /= (midEnd - bassEnd) || 1;
        treble /= (bins - midEnd) || 1;
        const overall = (bass * 0.5 + mid * 0.3 + treble * 0.2);

        return { bass, mid, treble, overall };
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else {
            this.playMusic(this.currentTrack);
        }
        return this.musicEnabled;
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    // Procedural sound effects
    _playSynth(frequency, duration, type = 'sine', volume = 0.2, ramp = true) {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume * this.sfxVolume, this.ctx.currentTime);
            if (ramp) {
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            }
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    _playNoise(duration, volume = 0.1) {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * volume * this.sfxVolume;
            }
            const source = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            source.buffer = buffer;
            gain.gain.setValueAtTime(volume * this.sfxVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            source.connect(gain);
            gain.connect(this.ctx.destination);
            source.start(this.ctx.currentTime);
        } catch (e) {}
    }

    playShoot() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
            gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {}
    }

    playEnemyShoot() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
            gain.gain.setValueAtTime(0.18 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
    }

    playExplosion() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            // Shaped noise through lowpass filter
            const bufferSize = this.ctx.sampleRate * 0.3;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    playExplosionBig() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            // Heavy shaped noise through lowpass filter
            const bufferSize = this.ctx.sampleRate * 0.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, t);
            filter.frequency.exponentialRampToValueAtTime(60, t + 0.5);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.6 * this.sfxVolume, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);
            // Deep sub-bass thud
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(60, t);
            sub.frequency.exponentialRampToValueAtTime(25, t + 0.4);
            subGain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
            subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            sub.connect(subGain);
            subGain.connect(this.ctx.destination);
            sub.start(t);
            sub.stop(t + 0.5);
        } catch (e) {}
    }

    playHit() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
            gain.gain.setValueAtTime(0.4 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (e) {}
    }

    playPowerUp() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
            osc.frequency.exponentialRampToValueAtTime(1320, t + 0.2);
            gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        } catch (e) {}
    }

    playDamage() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            // Sawtooth sweep down (like original hit but more aggressive)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
            gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
            // Noise crunch layer
            const bufLen = this.ctx.sampleRate * 0.12;
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
            const nSrc = this.ctx.createBufferSource();
            nSrc.buffer = buf;
            const nFilter = this.ctx.createBiquadFilter();
            nFilter.type = 'lowpass';
            nFilter.frequency.setValueAtTime(800, t);
            nFilter.frequency.exponentialRampToValueAtTime(200, t + 0.12);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            nSrc.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(this.ctx.destination);
            nSrc.start(t);
        } catch (e) {}
    }

    playShieldHit() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            // Bright metallic ping with sweep
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1400, t);
            osc1.frequency.exponentialRampToValueAtTime(800, t + 0.15);
            gain1.gain.setValueAtTime(0.2 * this.sfxVolume, t);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.15);
            // Harmonic shimmer
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1800, t);
            osc2.frequency.exponentialRampToValueAtTime(1000, t + 0.12);
            gain2.gain.setValueAtTime(0.12 * this.sfxVolume, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.12);
        } catch (e) {}
    }

    playUltimate() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            // Rising power chord
            const freqs = [200, 400, 600, 800];
            freqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = i < 2 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq * 0.5, t + i * 0.04);
                osc.frequency.exponentialRampToValueAtTime(freq, t + i * 0.04 + 0.15);
                gain.gain.setValueAtTime(0.001, t + i * 0.04);
                gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, t + i * 0.04 + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + i * 0.04);
                osc.stop(t + 0.55);
            });
            // Impact burst
            setTimeout(() => {
                this.playExplosionBig();
            }, 200);
        } catch (e) {}
    }

    playLevelComplete() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t + i * 0.12);
                gain.gain.setValueAtTime(0.001, t + i * 0.12);
                gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, t + i * 0.12 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + i * 0.12);
                osc.stop(t + i * 0.12 + 0.4);
            });
        } catch (e) {}
    }

    playShopBuy() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, t);
            osc.frequency.exponentialRampToValueAtTime(1100, t + 0.15);
            gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {}
    }

    playShopError() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const notes = [200, 150];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                const st = t + i * 0.1;
                gain.gain.setValueAtTime(0.15 * this.sfxVolume, st);
                gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(st);
                osc.stop(st + 0.15);
            });
        } catch (e) {}
    }

    playGameOver() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const notes = [440, 392, 349, 294];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const startTime = t + i * 0.2;
                gain.gain.setValueAtTime(0.3 * this.sfxVolume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.3);
            });
        } catch (e) {}
    }

    playMenuClick() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
            gain.gain.setValueAtTime(0.15 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
    }

    /** Pre-game cinematic sound — epic intro for showcasing ships/bosses */
    playCinematicIntro() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;

            // Deep sub-bass chord — ominous start
            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(35, t);
            sub.frequency.linearRampToValueAtTime(55, t + 2);
            subG.gain.setValueAtTime(0.001, t);
            subG.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, t + 0.8);
            subG.gain.linearRampToValueAtTime(0.12 * this.sfxVolume, t + 2);
            subG.gain.exponentialRampToValueAtTime(0.001, t + 3);
            sub.connect(subG); subG.connect(this.ctx.destination);
            sub.start(t); sub.stop(t + 3.2);

            // Rising cinematic drone
            const drone = this.ctx.createOscillator();
            const droneG = this.ctx.createGain();
            drone.type = 'sawtooth';
            drone.frequency.setValueAtTime(80, t);
            drone.frequency.linearRampToValueAtTime(200, t + 2);
            droneG.gain.setValueAtTime(0.001, t);
            droneG.gain.linearRampToValueAtTime(0.08 * this.sfxVolume, t + 1);
            droneG.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
            drone.connect(droneG); droneG.connect(this.ctx.destination);
            drone.start(t); drone.stop(t + 2.6);

            // Impact hit at title reveal (1.5s)
            setTimeout(() => {
                this._playNoise(0.3, 0.3);
                this._playSynth(50, 0.4, 'sine', 0.25);
            }, 1500);
        } catch(e) {}
    }

    /** Cinematic ship whoosh — quick flyby sound */
    playCinematicWhoosh() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.1 * this.sfxVolume, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(g); g.connect(this.ctx.destination);
            osc.start(t); osc.stop(t + 0.35);
        } catch(e) {}
    }

    /** Cinematic boss reveal — heavy thud + alarm tone */
    playCinematicBossReveal() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            this._playNoise(0.25, 0.25);
            this._playSynth(45, 0.5, 'sine', 0.25);
            this._playSynth(90, 0.3, 'triangle', 0.12);
            // Alarm ping
            setTimeout(() => {
                this._playSynth(600, 0.12, 'square', 0.1);
                setTimeout(() => this._playSynth(400, 0.12, 'square', 0.1), 100);
            }, 200);
        } catch(e) {}
    }

    /** Epic boss warning alarm — deep rising drone + staccato alarm pings */
    playBossWarning() {
        // Deep ominous rising drone
        if (this.initialized && this.sfxEnabled) {
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, t);
                osc.frequency.linearRampToValueAtTime(180, t + 2.0);
                gain.gain.setValueAtTime(0.15 * this.sfxVolume, t);
                gain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, t + 1.5);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 2.5);
            } catch (e) {}
        }
        // Alarm pings — 4 pairs of descending tones
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this._playSynth(600, 0.12, 'square', 0.12);
                setTimeout(() => this._playSynth(400, 0.12, 'square', 0.12), 100);
            }, i * 400);
        }
        // Final massive sub-bass thud when boss appears
        setTimeout(() => {
            this._playNoise(0.4, 0.35);
            this._playSynth(40, 0.5, 'sine', 0.3);
            this._playSynth(80, 0.4, 'triangle', 0.2);
        }, 2000);
    }

    /** Level intro cinematic — warp-in whoosh, scanner beeps, title reveal */
    playLevelIntro() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;

            // ── 1. Warp-in engine whoosh (0.0 – 0.8s) ──
            // Low-frequency sweep rising quickly = hyperspace arrival
            const warpOsc = this.ctx.createOscillator();
            const warpGain = this.ctx.createGain();
            warpOsc.type = 'sawtooth';
            warpOsc.frequency.setValueAtTime(30, t);
            warpOsc.frequency.exponentialRampToValueAtTime(250, t + 0.6);
            warpOsc.frequency.exponentialRampToValueAtTime(60, t + 1.0);
            warpGain.gain.setValueAtTime(0.001, t);
            warpGain.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, t + 0.15);
            warpGain.gain.linearRampToValueAtTime(0.22 * this.sfxVolume, t + 0.5);
            warpGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
            warpOsc.connect(warpGain);
            warpGain.connect(this.ctx.destination);
            warpOsc.start(t);
            warpOsc.stop(t + 1.3);

            // Whoosh noise layer — filtered white noise for texture
            const noiseLen = 0.9;
            const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLen, this.ctx.sampleRate);
            const noiseData = noiseBuf.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1);
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuf;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(200, t);
            noiseFilter.frequency.exponentialRampToValueAtTime(2000, t + 0.5);
            noiseFilter.frequency.exponentialRampToValueAtTime(400, t + 0.9);
            noiseFilter.Q.value = 1.5;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.001, t);
            noiseGain.gain.linearRampToValueAtTime(0.12 * this.sfxVolume, t + 0.2);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
            noiseSrc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseSrc.start(t);

            // ── 2. Scanner/HUD beeps at title appear (0.6 – 1.2s) ──
            const beepNotes = [1200, 1500, 1800, 2000];
            beepNotes.forEach((freq, i) => {
                const bt = t + 0.6 + i * 0.12;
                const beepOsc = this.ctx.createOscillator();
                const beepGain = this.ctx.createGain();
                beepOsc.type = 'sine';
                beepOsc.frequency.setValueAtTime(freq, bt);
                beepGain.gain.setValueAtTime(0.09 * this.sfxVolume, bt);
                beepGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.08);
                beepOsc.connect(beepGain);
                beepGain.connect(this.ctx.destination);
                beepOsc.start(bt);
                beepOsc.stop(bt + 0.1);
            });

            // ── 3. Title reveal chord (0.9s) — rich major chord ──
            const chordNotes = [261.6, 329.6, 392.0, 523.3]; // C4, E4, G4, C5
            chordNotes.forEach((freq) => {
                const cOsc = this.ctx.createOscillator();
                const cGain = this.ctx.createGain();
                cOsc.type = 'triangle';
                cOsc.frequency.setValueAtTime(freq, t + 0.9);
                cGain.gain.setValueAtTime(0.001, t + 0.85);
                cGain.gain.linearRampToValueAtTime(0.08 * this.sfxVolume, t + 1.0);
                cGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
                cOsc.connect(cGain);
                cGain.connect(this.ctx.destination);
                cOsc.start(t + 0.85);
                cOsc.stop(t + 2.6);
            });

            // ── 4. Sub-bass arrival thud at text lock-in (1.1s) ──
            const thudOsc = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thudOsc.type = 'sine';
            thudOsc.frequency.setValueAtTime(50, t + 1.05);
            thudOsc.frequency.exponentialRampToValueAtTime(25, t + 1.5);
            thudGain.gain.setValueAtTime(0.001, t + 1.0);
            thudGain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, t + 1.1);
            thudGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
            thudOsc.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thudOsc.start(t + 1.0);
            thudOsc.stop(t + 1.7);
        } catch (e) {}
    }

    /** Level outro — victory whoosh, score tally ping, transition sweep */
    playLevelOutro() {
        if (!this.initialized || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;

            // ── 1. Victory chord sweep (0.0s) — ascending power chord ──
            const sweepNotes = [196, 261.6, 329.6, 392]; // G3, C4, E4, G4
            sweepNotes.forEach((freq, i) => {
                const sOsc = this.ctx.createOscillator();
                const sGain = this.ctx.createGain();
                sOsc.type = 'triangle';
                sOsc.frequency.setValueAtTime(freq, t + i * 0.06);
                sGain.gain.setValueAtTime(0.001, t + i * 0.06);
                sGain.gain.linearRampToValueAtTime(0.1 * this.sfxVolume, t + i * 0.06 + 0.05);
                sGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
                sOsc.connect(sGain);
                sGain.connect(this.ctx.destination);
                sOsc.start(t + i * 0.06);
                sOsc.stop(t + 2.0);
            });

            // ── 2. Shimmer/sparkle noise (0.1s) — filtered noise burst ──
            const shimLen = 0.6;
            const shimBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * shimLen, this.ctx.sampleRate);
            const shimData = shimBuf.getChannelData(0);
            for (let i = 0; i < shimData.length; i++) shimData[i] = (Math.random() * 2 - 1);
            const shimSrc = this.ctx.createBufferSource();
            shimSrc.buffer = shimBuf;
            const shimFilter = this.ctx.createBiquadFilter();
            shimFilter.type = 'highpass';
            shimFilter.frequency.setValueAtTime(4000, t + 0.1);
            shimFilter.Q.value = 2;
            const shimGain = this.ctx.createGain();
            shimGain.gain.setValueAtTime(0.001, t + 0.1);
            shimGain.gain.linearRampToValueAtTime(0.07 * this.sfxVolume, t + 0.2);
            shimGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
            shimSrc.connect(shimFilter);
            shimFilter.connect(shimGain);
            shimGain.connect(this.ctx.destination);
            shimSrc.start(t + 0.1);

            // ── 3. Score count pips (0.3 – 1.2s) — fast ascending blips ──
            const pipCount = 6;
            for (let i = 0; i < pipCount; i++) {
                const pipT = t + 0.3 + i * 0.13;
                const pipFreq = 800 + i * 150;
                const pipOsc = this.ctx.createOscillator();
                const pipGain = this.ctx.createGain();
                pipOsc.type = 'sine';
                pipOsc.frequency.setValueAtTime(pipFreq, pipT);
                pipGain.gain.setValueAtTime(0.07 * this.sfxVolume, pipT);
                pipGain.gain.exponentialRampToValueAtTime(0.001, pipT + 0.06);
                pipOsc.connect(pipGain);
                pipGain.connect(this.ctx.destination);
                pipOsc.start(pipT);
                pipOsc.stop(pipT + 0.08);
            }

            // ── 4. Final resolution tone (1.4s) — satisfying major resolve ──
            const resNotes = [523.3, 659.3, 784]; // C5, E5, G5
            resNotes.forEach((freq) => {
                const rOsc = this.ctx.createOscillator();
                const rGain = this.ctx.createGain();
                rOsc.type = 'sine';
                rOsc.frequency.setValueAtTime(freq, t + 1.4);
                rGain.gain.setValueAtTime(0.001, t + 1.35);
                rGain.gain.linearRampToValueAtTime(0.09 * this.sfxVolume, t + 1.5);
                rGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
                rOsc.connect(rGain);
                rGain.connect(this.ctx.destination);
                rOsc.start(t + 1.35);
                rOsc.stop(t + 2.6);
            });
        } catch (e) {}
    }
}

export default SoundManager;
