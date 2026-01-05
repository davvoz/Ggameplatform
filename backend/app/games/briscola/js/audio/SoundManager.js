/**
 * Sound Manager
 * 
 * Handles game audio with Web Audio API
 * Optimized for mobile with touch-to-unlock
 */

export class SoundManager {
    constructor() {
        this.context = null;
        this.isUnlocked = false;
        this.isMuted = false;
        this.volume = 0.5;
        
        this.sounds = {
            cardPlay: null,
            cardFlip: null,
            cardShuffle: null,
            pointsWin: null,
            roundWin: null,
            roundLose: null,
            gameWin: null,
            gameLose: null,
            buttonClick: null
        };
        
        // Unlock audio on first user interaction
        this.setupUnlock();
    }
    
    /**
     * Setup audio unlock on user interaction
     */
    setupUnlock() {
        const unlock = () => {
            if (this.isUnlocked) return;
            
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create and play a silent buffer to unlock
            const buffer = this.context.createBuffer(1, 1, 22050);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.start(0);
            
            this.isUnlocked = true;
            console.log('[SoundManager] Audio unlocked');
            
            // Generate sounds
            this.generateSounds();
            
            // Remove listeners
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
        
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
    }
    
    /**
     * Generate synthesized sounds
     */
    generateSounds() {
        if (!this.context) return;
        
        // Card play sound - short thump
        this.sounds.cardPlay = this.createSound([
            { type: 'noise', duration: 0.05, gain: 0.3 }
        ]);
        
        // Card flip sound
        this.sounds.cardFlip = this.createSound([
            { type: 'noise', duration: 0.08, gain: 0.2 }
        ]);
        
        // Points win - ascending notes
        this.sounds.pointsWin = this.createSound([
            { type: 'sine', frequency: 523, duration: 0.1, gain: 0.3 },
            { type: 'sine', frequency: 659, duration: 0.1, delay: 0.1, gain: 0.3 },
            { type: 'sine', frequency: 784, duration: 0.15, delay: 0.2, gain: 0.3 }
        ]);
        
        // Round win - cheerful
        this.sounds.roundWin = this.createSound([
            { type: 'sine', frequency: 523, duration: 0.15, gain: 0.4 },
            { type: 'sine', frequency: 659, duration: 0.15, delay: 0.15, gain: 0.4 },
            { type: 'sine', frequency: 784, duration: 0.2, delay: 0.3, gain: 0.4 }
        ]);
        
        // Round lose - descending
        this.sounds.roundLose = this.createSound([
            { type: 'sine', frequency: 392, duration: 0.2, gain: 0.3 },
            { type: 'sine', frequency: 330, duration: 0.3, delay: 0.2, gain: 0.3 }
        ]);
        
        // Game win - triumphant
        this.sounds.gameWin = this.createSound([
            { type: 'sine', frequency: 523, duration: 0.2, gain: 0.5 },
            { type: 'sine', frequency: 659, duration: 0.2, delay: 0.2, gain: 0.5 },
            { type: 'sine', frequency: 784, duration: 0.3, delay: 0.4, gain: 0.5 },
            { type: 'sine', frequency: 1047, duration: 0.5, delay: 0.7, gain: 0.5 }
        ]);
        
        // Game lose - sad
        this.sounds.gameLose = this.createSound([
            { type: 'sine', frequency: 392, duration: 0.3, gain: 0.4 },
            { type: 'sine', frequency: 349, duration: 0.3, delay: 0.3, gain: 0.4 },
            { type: 'sine', frequency: 294, duration: 0.5, delay: 0.6, gain: 0.4 }
        ]);
        
        // Button click
        this.sounds.buttonClick = this.createSound([
            { type: 'sine', frequency: 880, duration: 0.05, gain: 0.2 }
        ]);
    }
    
    /**
     * Create a sound from specifications
     */
    createSound(specs) {
        return () => {
            if (!this.context || this.isMuted) return;
            
            specs.forEach(spec => {
                const oscillator = spec.type === 'noise' 
                    ? this.createNoiseSource()
                    : this.context.createOscillator();
                
                const gainNode = this.context.createGain();
                
                if (spec.type !== 'noise') {
                    oscillator.type = spec.type;
                    oscillator.frequency.value = spec.frequency;
                }
                
                gainNode.gain.value = spec.gain * this.volume;
                
                oscillator.connect(gainNode);
                gainNode.connect(this.context.destination);
                
                const startTime = this.context.currentTime + (spec.delay || 0);
                const endTime = startTime + spec.duration;
                
                // Fade out
                gainNode.gain.setValueAtTime(spec.gain * this.volume, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        };
    }
    
    /**
     * Create noise source for card sounds
     */
    createNoiseSource() {
        const bufferSize = this.context.sampleRate * 0.1;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        return source;
    }
    
    /**
     * Play a sound
     */
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
    
    /**
     * Set volume (0-1)
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }
}
