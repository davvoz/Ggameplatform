// audio.js - Sound effects and music management

class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;
        
        // Initialize Web Audio API
        this.audioContext = null;
        
        // Check for saved preferences
        const savedMuted = localStorage.getItem('blockyRoadMuted');
        if (savedMuted !== null) {
            this.isMuted = savedMuted === 'true';
        }
        

    }
    
    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            this.generateAllSounds();
        } catch (e) {

        }
    }
    
    // Generate essential game sound effects using Web Audio API
    generateAllSounds() {
        if (!this.audioContext) return;
        
        // Jump sound - footstep
        this.sounds.jump = this.createJumpSound();
        
        // Coin collect - metallic clink
        this.sounds.coin = this.createCoinSound();
        
        // Death/crash - impact
        this.sounds.death = this.createDeathSound();
        

    }
    
    // Create jump sound - realistic thud/footstep
    createJumpSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            // Create short noise burst for realistic footstep
            const bufferSize = this.audioContext.sampleRate * 0.08;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate noise with quick decay
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            source.buffer = buffer;
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
            filter.Q.setValueAtTime(1, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
            
            source.start(this.audioContext.currentTime);
        };
    }
    
    // Create coin collect sound - metallic clink
    createCoinSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            // Create metallic ringing sound
            const bufferSize = this.audioContext.sampleRate * 0.25;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate metallic harmonics
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                const env = Math.exp(-t * 12); // Fast decay
                // Multiple sine waves for metallic quality
                data[i] = env * (
                    Math.sin(2 * Math.PI * 1200 * t) * 0.5 +
                    Math.sin(2 * Math.PI * 1800 * t) * 0.3 +
                    Math.sin(2 * Math.PI * 2400 * t) * 0.2
                );
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
            
            source.start(this.audioContext.currentTime);
        };
    }
    
    // Create death/crash sound - realistic impact
    createDeathSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            // Create harsh impact noise
            const bufferSize = this.audioContext.sampleRate * 0.4;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate impact noise with decay
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                const env = Math.exp(-t * 5);
                // Mix of noise and low rumble
                data[i] = env * (
                    (Math.random() * 2 - 1) * 0.7 +
                    Math.sin(2 * Math.PI * 80 * t) * 0.3
                );
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            source.buffer = buffer;
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime);
            
            source.start(this.audioContext.currentTime);
        };
    }
    
    // Play specific sound effect
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        } else {

        }
    }
    
    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('blockyRoadMuted', this.isMuted.toString());
        

        return this.isMuted;
    }
    
    // Set volumes
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}
