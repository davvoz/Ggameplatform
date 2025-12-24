/**
 * Synth Engine
 * Procedural sound synthesis with Web Audio API
 */

export class AudioSynthesizer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.3;
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    createEnvelope(param, attack, decay, sustain, release, peakValue = 1, startTime = 0) {
        const now = this.ctx.currentTime + startTime;
        param.setValueAtTime(0, now);
        param.linearRampToValueAtTime(peakValue, now + attack);
        param.linearRampToValueAtTime(sustain * peakValue, now + attack + decay);
        param.setValueAtTime(sustain * peakValue, now + attack + decay);
        param.linearRampToValueAtTime(0, now + attack + decay + release);
    }

    playNote(frequency, type, duration, envelope, options = {}) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        if (options.detune) {
            osc.detune.value = options.detune;
        }
        
        osc.connect(gainNode);
        
        if (options.filter) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = options.filter.type || 'lowpass';
            filter.frequency.value = options.filter.freq || 2000;
            filter.Q.value = options.filter.q || 1;
            gainNode.connect(filter);
            filter.connect(this.masterGain);
        } else {
            gainNode.connect(this.masterGain);
        }
        
        const volume = (options.volume || 1) * 0.3;
        this.createEnvelope(
            gainNode.gain,
            envelope.attack,
            envelope.decay,
            envelope.sustain,
            envelope.release,
            volume
        );
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + envelope.attack + envelope.decay + envelope.release);
    }

    playChord(frequencies, type, duration, envelope, options = {}) {
        frequencies.forEach(freq => {
            this.playNote(freq, type, duration, envelope, options);
        });
    }

    createNoise(duration, envelope, options = {}) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        filter.type = options.filterType || 'highpass';
        filter.frequency.value = options.filterFreq || 1000;
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const volume = (options.volume || 1) * 0.3;
        this.createEnvelope(
            gainNode.gain,
            envelope.attack,
            envelope.decay,
            envelope.sustain,
            envelope.release,
            volume
        );
        
        noise.start(this.ctx.currentTime);
        noise.stop(this.ctx.currentTime + duration);
    }

    createFMSynth(carrierFreq, modFreq, modDepth, duration, envelope, options = {}) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const gainNode = this.ctx.createGain();
        
        carrier.frequency.value = carrierFreq;
        modulator.frequency.value = modFreq;
        modGain.gain.value = modDepth;
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const volume = (options.volume || 1) * 0.2;
        this.createEnvelope(
            gainNode.gain,
            envelope.attack,
            envelope.decay,
            envelope.sustain,
            envelope.release,
            volume
        );
        
        carrier.start(this.ctx.currentTime);
        modulator.start(this.ctx.currentTime);
        carrier.stop(this.ctx.currentTime + duration);
        modulator.stop(this.ctx.currentTime + duration);
    }

    createPitchSweep(startFreq, endFreq, duration, envelope, options = {}) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = options.type || 'sine';
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        
        osc.connect(gainNode);
        
        if (options.filter) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = options.filter.type || 'lowpass';
            filter.frequency.value = options.filter.freq || 2000;
            filter.Q.value = options.filter.q || 1;
            gainNode.connect(filter);
            filter.connect(this.masterGain);
        } else {
            gainNode.connect(this.masterGain);
        }
        
        const volume = (options.volume || 1) * 0.3;
        this.createEnvelope(
            gainNode.gain,
            envelope.attack,
            envelope.decay,
            envelope.sustain,
            envelope.release,
            volume
        );
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.3;
        }
    }
}

export class SoundLibrary {
    constructor(synth) {
        this.synth = synth;
        this.audioCache = {};
        this.loadAudioFiles();
    }

    loadAudioFiles() {
        // Tower shoot sounds paths
        const soundPaths = {
            towerShootBasic: 'assets/sounds/sfx/shoot_basic.wav',
            towerShootRapid: 'assets/sounds/sfx/shoot_rapid.wav',
            towerShootSniper: 'assets/sounds/sfx/shoot_sniper.wav',
            towerShootSplash: 'assets/sounds/sfx/shoot_splash.wav',
            towerShootFreeze: 'assets/sounds/sfx/shoot_freeze.wav',
            towerShootLaser: 'assets/sounds/sfx/shoot_laser.wav',
            towerShootElectric: 'assets/sounds/sfx/shoot_electric.wav'
        };

        // Preload audio files
        for (const [key, path] of Object.entries(soundPaths)) {
            this.audioCache[key] = new Audio(path);
            this.audioCache[key].preload = 'auto';
            // Handle load errors gracefully
            this.audioCache[key].addEventListener('error', () => {
                console.warn(`[AUDIO] Failed to load ${path}, using synth fallback`);
                this.audioCache[key] = null;
            });
        }
    }

    playAudioFile(key, volume = 0.3, playbackRate = 1.0) {
        const audio = this.audioCache[key];
        if (!audio) return false;

        try {
            // Clone audio to allow overlapping plays
            const sound = audio.cloneNode();
            sound.volume = volume;
            sound.playbackRate = playbackRate;
            sound.play().catch(() => {});
            return true;
        } catch (e) {
            return false;
        }
    }

    // Tower sounds
    towerPlace() {
        this.synth.playChord(
            [330, 415, 523],
            'sine',
            0.3,
            { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
            { volume: 0.4 }
        );
    }

    // Tower shoot sounds - specific per type
    towerShootBasic() {
        if (this.playAudioFile('towerShootBasic', 0.35)) return;
        
        // Classic "pew" - quick burst
        this.synth.playNote(
            800,
            'sine',
            0.08,
            { attack: 0.001, decay: 0.03, sustain: 0, release: 0.05 },
            { volume: 0.35, filter: { type: 'lowpass', freq: 2500, q: 3 } }
        );
        setTimeout(() => {
            this.synth.playNote(
                400,
                'sine',
                0.05,
                { attack: 0.001, decay: 0.02, sustain: 0, release: 0.03 },
                { volume: 0.2 }
            );
        }, 20);
    }

    towerShootRapid() {
        if (this.playAudioFile('towerShootRapid', 0.28, 1.1)) return;
        
        // Sharp "bang bang" - percussive hit
        this.synth.createNoise(
            0.04,
            { attack: 0.001, decay: 0.015, sustain: 0, release: 0.025 },
            { volume: 0.25, filterType: 'highpass', filterFreq: 1500 }
        );
        this.synth.playNote(
            1200,
            'square',
            0.04,
            { attack: 0.001, decay: 0.015, sustain: 0, release: 0.025 },
            { volume: 0.3, filter: { type: 'bandpass', freq: 2000, q: 8 } }
        );
    }

    towerShootSniper() {
        if (this.playAudioFile('towerShootSniper', 0.5)) return;
        
        // Deep "BOOM" - explosive cannon
        // Low frequency punch
        this.synth.playNote(
            80,
            'sine',
            0.5,
            { attack: 0.002, decay: 0.2, sustain: 0.1, release: 0.3 },
            { volume: 0.6, filter: { type: 'lowpass', freq: 400, q: 2 } }
        );
        // Mid thump
        setTimeout(() => {
            this.synth.playNote(
                150,
                'triangle',
                0.3,
                { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 },
                { volume: 0.4 }
            );
        }, 10);
        // Explosion noise
        setTimeout(() => {
            this.synth.createNoise(
                0.15,
                { attack: 0.001, decay: 0.08, sustain: 0, release: 0.07 },
                { volume: 0.25, filterType: 'lowpass', filterFreq: 1200 }
            );
        }, 15);
    }

    towerShootSplash() {
        if (this.playAudioFile('towerShootSplash', 0.38)) return;
        
        // "Whoomp" - heavy projectile launch
        this.synth.playNote(
            120,
            'sine',
            0.25,
            { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.13 },
            { volume: 0.45, filter: { type: 'lowpass', freq: 800, q: 4 } }
        );
        // Whoosh
        setTimeout(() => {
            this.synth.createNoise(
                0.2,
                { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.08 },
                { volume: 0.2, filterType: 'bandpass', filterFreq: 1500 }
            );
        }, 30);
    }

    towerShootFreeze() {
        if (this.playAudioFile('towerShootFreeze', 0.32)) return;
        
        // "Schrreeech" - icy crystalline screech
        // High pitch sweep down with shimmer
        this.synth.createPitchSweep(
            3500,
            1800,
            0.22,
            { attack: 0.001, decay: 0.08, sustain: 0.15, release: 0.15 },
            { type: 'square', volume: 0.35, filter: { type: 'highpass', freq: 1500, q: 6 } }
        );
        // Crystalline shimmer
        setTimeout(() => {
            this.synth.playChord(
                [2637, 3136, 3951],
                'sine',
                0.15,
                { attack: 0.001, decay: 0.06, sustain: 0.1, release: 0.09 },
                { volume: 0.25, filter: { type: 'highpass', freq: 2500, q: 4 } }
            );
        }, 30);
        // Ice crackle
        setTimeout(() => {
            this.synth.createNoise(
                0.12,
                { attack: 0.001, decay: 0.05, sustain: 0, release: 0.07 },
                { volume: 0.15, filterType: 'highpass', filterFreq: 4000 }
            );
        }, 50);
    }

    towerShootLaser() {
        if (this.playAudioFile('towerShootLaser', 0.38)) return;
        
        // "Peewoo" - sci-fi laser with pitch rise
        // Rising pitch sweep
        this.synth.createPitchSweep(
            400,
            1200,
            0.15,
            { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
            { type: 'sine', volume: 0.4, filter: { type: 'bandpass', freq: 1500, q: 5 } }
        );
        // High harmonics
        setTimeout(() => {
            this.synth.createPitchSweep(
                800,
                2400,
                0.12,
                { attack: 0.001, decay: 0.04, sustain: 0, release: 0.08 },
                { type: 'sine', volume: 0.25 }
            );
        }, 10);
    }

    towerShootElectric() {
        if (this.playAudioFile('towerShootElectric', 0.32)) return;
        
        // "Bzzzzt" - electric zap with crackle
        // Random frequency modulation for chaotic zap
        const freqs = [800, 1200, 900, 1500, 700];
        freqs.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'square',
                    0.015,
                    { attack: 0.001, decay: 0.005, sustain: 0, release: 0.01 },
                    { volume: 0.3, filter: { type: 'bandpass', freq: 2000, q: 8 } }
                );
            }, i * 8);
        });
        // Static burst
        this.synth.createNoise(
            0.08,
            { attack: 0.001, decay: 0.03, sustain: 0, release: 0.05 },
            { volume: 0.28, filterType: 'bandpass', filterFreq: 3000 }
        );
    }

    towerUpgrade() {
        const notes = [330, 415, 523, 659, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'triangle',
                    0.2,
                    { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.15 },
                    { volume: 0.4 }
                );
            }, i * 40);
        });
    }

    towerMerge() {
        this.synth.createFMSynth(
            440,
            880,
            300,
            0.5,
            { attack: 0.02, decay: 0.15, sustain: 0.3, release: 0.3 },
            { volume: 0.5 }
        );
        
        setTimeout(() => {
            this.synth.playChord(
                [523, 659, 784],
                'sine',
                0.4,
                { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 },
                { volume: 0.4 }
            );
        }, 100);
    }

    towerSell() {
        this.synth.playNote(
            330,
            'sine',
            0.4,
            { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 },
            { volume: 0.3, filter: { type: 'lowpass', freq: 1000 } }
        );
    }

    // Enemy sounds
    enemySpawn() {
        this.synth.createNoise(
            0.3,
            { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.15 },
            { volume: 0.2, filterType: 'bandpass', filterFreq: 500 }
        );
    }

    enemyHit(pitch = 1) {
        this.synth.playNote(
            200 * pitch,
            'sawtooth',
            0.1,
            { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            { volume: 0.25, filter: { type: 'lowpass', freq: 1500 } }
        );
    }

    enemyDeath() {
        this.synth.playNote(
            150,
            'sawtooth',
            0.4,
            { attack: 0.001, decay: 0.15, sustain: 0, release: 0.25 },
            { volume: 0.3, filter: { type: 'lowpass', freq: 800 } }
        );
        
        setTimeout(() => {
            this.synth.createNoise(
                0.2,
                { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
                { volume: 0.15, filterType: 'highpass', filterFreq: 2000 }
            );
        }, 50);
    }

    bossSpawn() {
        this.synth.createFMSynth(
            80,
            40,
            500,
            1.0,
            { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.5 },
            { volume: 0.6 }
        );
        
        setTimeout(() => {
            this.synth.createNoise(
                0.5,
                { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.2 },
                { volume: 0.3, filterType: 'lowpass', filterFreq: 300 }
            );
        }, 200);
    }

    specialAbility() {
        this.synth.createFMSynth(
            660,
            1320,
            800,
            0.4,
            { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 },
            { volume: 0.4 }
        );
    }

    // UI sounds
    uiClick() {
        this.synth.playNote(
            880,
            'sine',
            0.08,
            { attack: 0.001, decay: 0.03, sustain: 0, release: 0.05 },
            { volume: 0.3 }
        );
    }

    uiError() {
        this.synth.playNote(
            200,
            'square',
            0.2,
            { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
            { volume: 0.35, filter: { type: 'lowpass', freq: 800 } }
        );
    }

    waveStart() {
        const arpeggio = [440, 554, 659, 880];
        arpeggio.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'triangle',
                    0.3,
                    { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 },
                    { volume: 0.5 }
                );
            }, i * 80);
        });
    }

    waveComplete() {
        const melody = [659, 784, 880, 1047];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'sine',
                    0.4,
                    { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 },
                    { volume: 0.4 }
                );
            }, i * 100);
        });
        
        setTimeout(() => {
            this.synth.playChord(
                [523, 659, 784, 1047],
                'sine',
                0.6,
                { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.4 },
                { volume: 0.5 }
            );
        }, 400);
    }

    coinCollect() {
        this.synth.playNote(
            1047,
            'triangle',
            0.15,
            { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
            { volume: 0.35 }
        );
        
        setTimeout(() => {
            this.synth.playNote(
                1318,
                'triangle',
                0.15,
                { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
                { volume: 0.35 }
            );
        }, 50);
    }

    // Game sounds
    gameOver() {
        const notes = [523, 494, 440, 392, 349];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'sine',
                    0.5,
                    { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.3 },
                    { volume: 0.5 }
                );
            }, i * 150);
        });
    }

    victory() {
        const triumphant = [523, 659, 784, 1047, 1319];
        triumphant.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playChord(
                    [freq, freq * 1.25],
                    'triangle',
                    0.5,
                    { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.4 },
                    { volume: 0.5 }
                );
            }, i * 120);
        });
    }

    combo(level = 1) {
        const baseFreq = 880 + (level * 100);
        this.synth.playNote(
            baseFreq,
            'sine',
            0.2,
            { attack: 0.001, decay: 0.05, sustain: 0.5, release: 0.15 },
            { volume: 0.4 + (level * 0.05) }
        );
        
        setTimeout(() => {
            this.synth.playNote(
                baseFreq * 1.5,
                'sine',
                0.2,
                { attack: 0.001, decay: 0.05, sustain: 0.5, release: 0.15 },
                { volume: 0.4 + (level * 0.05) }
            );
        }, 60);
    }

    powerup() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.synth.playNote(
                    freq,
                    'triangle',
                    0.15,
                    { attack: 0.001, decay: 0.05, sustain: 0.4, release: 0.1 },
                    { volume: 0.45 }
                );
            }, i * 40);
        });
    }
}
