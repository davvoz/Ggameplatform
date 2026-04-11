/**
 * SoundManager - Web Audio API sound synthesis
 * Single Responsibility: Generate and play all game sounds programmatically.
 */

export class SoundManager {
    #ctx = null;
    #masterGain = null;
    #sfxGain = null;
    #musicGain = null;
    #initialized = false;
    #muted = false;

    async init() {
        if (this.#initialized) return;

        try {
            this.#ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
            this.#masterGain = this.#ctx.createGain();
            this.#sfxGain = this.#ctx.createGain();
            this.#musicGain = this.#ctx.createGain();

            this.#sfxGain.connect(this.#masterGain);
            this.#musicGain.connect(this.#masterGain);
            this.#masterGain.connect(this.#ctx.destination);

            this.#masterGain.gain.value = 0.5;
            this.#sfxGain.gain.value = 0.7;
            this.#musicGain.gain.value = 0.3;

            this.#initialized = true;
        } catch (e) {
            console.warn('[SoundManager] Failed to initialize:', e);
        }
    }

    resume() {
        if (this.#ctx && this.#ctx.state === 'suspended') {
            this.#ctx.resume();
        }
    }

    get isMuted() { return this.#muted; }

    toggleMute() {
        this.#muted = !this.#muted;
        if (this.#masterGain) {
            this.#masterGain.gain.value = this.#muted ? 0 : 0.5;
        }
        return this.#muted;
    }

    // ═══════════════════════════════════════════════════════════════
    // SOUND EFFECTS
    // ═══════════════════════════════════════════════════════════════

    playJump() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(440, 0.1, 'square', 0.3, 880);
    }

    playDoubleJump() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(550, 0.08, 'square', 0.25, 1100);
        setTimeout(() => this.#playTone(660, 0.08, 'square', 0.25, 1320), 50);
    }

    playLand() {
        if (!this.#ctx || this.#muted) return;
        this.#playNoise(0.05, 0.15);
    }

    playCoin() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(880, 0.1, 'sine', 0.2);
        setTimeout(() => this.#playTone(1320, 0.1, 'sine', 0.15), 50);
    }

    playGem() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(1047, 0.15, 'sine', 0.25);
        setTimeout(() => this.#playTone(1319, 0.15, 'sine', 0.2), 80);
        setTimeout(() => this.#playTone(1568, 0.15, 'sine', 0.15), 160);
    }

    playPowerUp() {
        if (!this.#ctx || this.#muted) return;
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((f, i) => {
            setTimeout(() => this.#playTone(f, 0.15, 'sine', 0.2 - i * 0.03), i * 60);
        });
    }

    playHurt() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(200, 0.2, 'sawtooth', 0.4, 100);
        this.#playNoise(0.1, 0.3);
    }

    playDeath() {
        if (!this.#ctx || this.#muted) return;
        const freqs = [400, 350, 300, 250, 200];
        freqs.forEach((f, i) => {
            setTimeout(() => this.#playTone(f, 0.2, 'sawtooth', 0.3 - i * 0.05), i * 100);
        });
    }

    playEnemyHit() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(150, 0.1, 'square', 0.3);
        this.#playNoise(0.05, 0.2);
    }

    playStomp() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(300, 0.1, 'square', 0.4, 600);
    }

    playPlatformBreak() {
        if (!this.#ctx || this.#muted) return;
        this.#playNoise(0.15, 0.4);
        this.#playTone(150, 0.1, 'square', 0.2, 50);
    }

    playBounce() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(330, 0.08, 'sine', 0.3, 660);
    }

    playJetpack() {
        if (!this.#ctx || this.#muted) return;
        this.#playNoise(0.1, 0.15);
        this.#playTone(100, 0.1, 'sawtooth', 0.1);
    }

    playUpgrade() {
        if (!this.#ctx || this.#muted) return;
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((f, i) => {
            setTimeout(() => this.#playTone(f, 0.12, 'sine', 0.2), i * 80);
        });
    }

    playMenuSelect() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(660, 0.08, 'square', 0.15);
    }

    playMenuBack() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(440, 0.08, 'square', 0.15);
    }

    playCombo() {
        if (!this.#ctx || this.#muted) return;
        this.#playTone(880, 0.05, 'sine', 0.2);
        setTimeout(() => this.#playTone(1100, 0.05, 'sine', 0.15), 30);
    }

    // Aliases used by state classes
    playSelect() { this.playMenuSelect(); }
    playConfirm() { this.playUpgrade(); }
    playError() { this.playHurt(); }
    playPurchase() { this.playUpgrade(); }

    // ═══════════════════════════════════════════════════════════════
    // AUDIO GENERATION
    // ═══════════════════════════════════════════════════════════════

    #playTone(freq, duration, type = 'sine', volume = 0.3, freqEnd = null) {
        if (!this.#ctx) return;

        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.#ctx.currentTime);
        
        if (freqEnd !== null) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.#ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.#ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.#sfxGain);

        osc.start(this.#ctx.currentTime);
        osc.stop(this.#ctx.currentTime + duration);
    }

    #playNoise(duration, volume = 0.2) {
        if (!this.#ctx) return;

        const bufferSize = this.#ctx.sampleRate * duration;
        const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.#ctx.createBufferSource();
        const gain = this.#ctx.createGain();

        noise.buffer = buffer;
        gain.gain.setValueAtTime(volume, this.#ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.#sfxGain);

        noise.start(this.#ctx.currentTime);
    }
}
