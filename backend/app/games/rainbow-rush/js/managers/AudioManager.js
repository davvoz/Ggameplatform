/**
 * AudioManager - Manages game sounds using Web Audio API
 * Follows Single Responsibility and Interface Segregation
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.masterVolume = 0.5;
        this.initialized = false;
        this.enabled = true;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSounds();
            this.initialized = true;
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    generateSounds() {
        // Generate procedural sound effects
        this.sounds.set('jump', this.createJumpSound.bind(this));
        this.sounds.set('collect', this.createCollectSound.bind(this));
        this.sounds.set('hit', this.createHitSound.bind(this));
        this.sounds.set('score', this.createScoreSound.bind(this));
    }

    createJumpSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    createCollectSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }

    createHitSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    createScoreSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Create a nice arpeggio
        const frequencies = [523.25, 659.25, 783.99]; // C, E, G
        
        frequencies.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
            gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, ctx.currentTime + index * 0.08 + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.08 + 0.15);

            oscillator.start(ctx.currentTime + index * 0.08);
            oscillator.stop(ctx.currentTime + index * 0.08 + 0.15);
        });
    }

    playSound(soundName) {
        if (!this.enabled || !this.initialized) return;

        const soundGenerator = this.sounds.get(soundName);
        if (soundGenerator) {
            soundGenerator();
        }
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    toggleMute() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
