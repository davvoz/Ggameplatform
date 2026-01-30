/**
 * Survivor Arena - Audio Manager
 * @fileoverview Handles all game audio with Web Audio API
 */

'use strict';

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.sounds = new Map();
        this.currentMusic = null;
        this.initialized = false;
        this.muted = false;
    }

    /**
     * Initialize audio context (requires user interaction)
     */
    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Master gain
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
            this.masterGain.connect(this.context.destination);
            
            // SFX gain
            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = CONFIG.AUDIO.SFX_VOLUME;
            this.sfxGain.connect(this.masterGain);
            
            // Music gain
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = CONFIG.AUDIO.MUSIC_VOLUME;
            this.musicGain.connect(this.masterGain);
            
            // Generate procedural sounds
            this.generateSounds();
            
            this.initialized = true;
            console.log('🔊 Audio initialized');
        } catch (error) {
            console.warn('⚠️ Audio initialization failed:', error);
        }
    }

    /**
     * Generate procedural sounds
     */
    generateSounds() {
        // Shoot sound
        this.sounds.set('shoot', this.createShootSound());
        
        // Hit sound
        this.sounds.set('hit', this.createHitSound());
        
        // Explosion sound
        this.sounds.set('explosion', this.createExplosionSound());
        
        // Pickup sound
        this.sounds.set('pickup', this.createPickupSound());
        
        // Level up sound
        this.sounds.set('levelUp', this.createLevelUpSound());
        
        // Player hurt sound
        this.sounds.set('hurt', this.createHurtSound());
        
        // Death sound
        this.sounds.set('death', this.createDeathSound());
    }

    /**
     * Create shoot sound buffer
     * @returns {AudioBuffer}
     */
    createShootSound() {
        const duration = 0.1;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.exp(-t * 30);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Create hit sound buffer
     * @returns {AudioBuffer}
     */
    createHitSound() {
        const duration = 0.15;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.exp(-t * 20);
            const frequency = 200 - t * 100;
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
        }
        
        return buffer;
    }

    /**
     * Create explosion sound buffer
     * @returns {AudioBuffer}
     */
    createExplosionSound() {
        const duration = 0.5;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.exp(-t * 5);
            const noise = Math.random() * 2 - 1;
            const lowFreq = Math.sin(2 * Math.PI * 50 * t);
            data[i] = (noise * 0.7 + lowFreq * 0.3) * envelope * 0.5;
        }
        
        return buffer;
    }

    /**
     * Create pickup sound buffer
     * @returns {AudioBuffer}
     */
    createPickupSound() {
        const duration = 0.2;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.sin(Math.PI * t / duration);
            const frequency = 800 + t * 400;
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Create level up sound buffer
     * @returns {AudioBuffer}
     */
    createLevelUpSound() {
        const duration = 0.5;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.sin(Math.PI * t / duration);
            // Arpeggio effect
            const note = Math.floor(t * 8) % 4;
            const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
            const frequency = frequencies[note];
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Create hurt sound buffer
     * @returns {AudioBuffer}
     */
    createHurtSound() {
        const duration = 0.2;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.exp(-t * 15);
            const frequency = 150 - t * 50;
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
        }
        
        return buffer;
    }

    /**
     * Create death sound buffer
     * @returns {AudioBuffer}
     */
    createDeathSound() {
        const duration = 0.8;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.exp(-t * 3);
            const frequency = 200 - t * 150;
            const noise = (Math.random() * 2 - 1) * 0.3;
            data[i] = (Math.sin(2 * Math.PI * frequency * t) + noise) * envelope * 0.5;
        }
        
        return buffer;
    }

    /**
     * Play a sound effect
     * @param {string} soundName 
     * @param {number} volume - Volume multiplier (0-1)
     * @param {number} pitch - Pitch multiplier
     */
    play(soundName, volume = 1, pitch = 1) {
        if (!this.initialized || this.muted) return;
        if (!this.sounds.has(soundName)) return;

        try {
            const source = this.context.createBufferSource();
            source.buffer = this.sounds.get(soundName);
            source.playbackRate.value = pitch;
            
            const gainNode = this.context.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            source.start();
        } catch (error) {
            console.warn('⚠️ Error playing sound:', error);
        }
    }

    /**
     * Toggle mute
     * @returns {boolean} New muted state
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : CONFIG.AUDIO.MASTER_VOLUME;
        }
        return this.muted;
    }

    /**
     * Set master volume
     * @param {number} volume 
     */
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = MathUtils.clamp(volume, 0, 1);
        }
    }

    /**
     * Resume audio context (for autoplay policy)
     */
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
