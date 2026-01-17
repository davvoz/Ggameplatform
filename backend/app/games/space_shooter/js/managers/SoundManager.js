/**
 * SoundManager - Gestisce effetti sonori e musica con Web Audio API
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.enabled = true;
        this.initialized = false;
        
        // Background music
        this.bgMusic = null;
        this.bgMusicSource = null;
        this.bgMusicBuffer = null;
        this.musicPlaying = false;
        
        // Volume levels (0-1)
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        
        // Mute states
        this.musicMuted = false;
        this.sfxMuted = false;
    }

    /**
     * Inizializza l'audio context (deve essere chiamato dopo un'interazione utente)
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.5;
            
            // SFX gain
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            // Music gain
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;
            
            this.initialized = true;
            
            // Carica la musica di background
            this.loadBackgroundMusic('assets/background.wav');
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    /**
     * Carica la musica di background
     */
    async loadBackgroundMusic(url) {
        if (!this.initialized) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.bgMusicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Background music loaded');
        } catch (e) {
            console.warn('Failed to load background music:', e);
        }
    }
    
    /**
     * Avvia la musica di background (loop)
     */
    async playBackgroundMusic() {
        if (!this.initialized || this.musicPlaying) return;
        
        try {
            // Ensure AudioContext is active (browsers may suspend it)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // If buffer is not loaded yet, try to (re)load and bail out
            if (!this.bgMusicBuffer) {
                await this.loadBackgroundMusic('assets/background.wav');
                if (!this.bgMusicBuffer) return;
            }
            
            this.bgMusicSource = this.audioContext.createBufferSource();
            this.bgMusicSource.buffer = this.bgMusicBuffer;
            this.bgMusicSource.loop = true;
            this.bgMusicSource.connect(this.musicGain);
            
            // Respect mute state at start
            const startVol = this.musicMuted ? 0 : this.musicVolume;
            if (this.musicGain) {
                this.musicGain.gain.setValueAtTime(startVol, this.audioContext.currentTime);
            }
            
            this.bgMusicSource.start(0);
            this.musicPlaying = true;
        } catch (e) {
            console.warn('Failed to play background music:', e);
        }
    }
    
    /**
     * Ferma la musica di background
     */
    stopBackgroundMusic() {
        if (this.bgMusicSource && this.musicPlaying) {
            try {
                this.bgMusicSource.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            this.bgMusicSource = null;
            this.musicPlaying = false;
        }
    }
    
    /**
     * Pausa/riprendi la musica (abbassa il volume invece di stoppare)
     */
    pauseBackgroundMusic() {
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        }
    }
    
    resumeBackgroundMusic() {
        if (this.musicGain) {
            const targetVolume = this.musicMuted ? 0 : this.musicVolume;
            this.musicGain.gain.setTargetAtTime(targetVolume, this.audioContext.currentTime, 0.1);
        }
    }
    
    /**
     * Imposta il volume della musica (0-100)
     */
    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(1, value / 100));
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(this.musicVolume, this.audioContext.currentTime, 0.05);
        }
    }
    
    /**
     * Imposta il volume degli effetti sonori (0-100)
     */
    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value / 100));
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.audioContext.currentTime, 0.05);
        }
    }
    
    /**
     * Ottieni i volumi attuali
     */
    getMusicVolume() {
        return Math.round(this.musicVolume * 100);
    }
    
    getSfxVolume() {
        return Math.round(this.sfxVolume * 100);
    }
    
    /**
     * Mute/Unmute musica
     */
    muteMusic() {
        this.musicMuted = true;
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
        }
    }
    
    unmuteMusic() {
        this.musicMuted = false;
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(this.musicVolume, this.audioContext.currentTime, 0.05);
        }
    }
    
    /**
     * Mute/Unmute effetti sonori
     */
    muteSfx() {
        this.sfxMuted = true;
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
        }
    }
    
    unmuteSfx() {
        this.sfxMuted = false;
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.audioContext.currentTime, 0.05);
        }
    }

    /**
     * Genera un suono di sparo
     */
    playShoot() {
        if (!this.enabled || !this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    /**
     * Genera un suono di esplosione
     */
    playExplosion() {
        if (!this.enabled || !this.initialized) return;
        
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        noise.start();
    }

    /**
     * Genera un suono di power-up raccolto
     */
    playPowerUp() {
        if (!this.enabled || !this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, this.audioContext.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    /**
     * Genera un suono di danno subito
     */
    playHit() {
        if (!this.enabled || !this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    /**
     * Genera un suono di game over
     */
    playGameOver() {
        if (!this.enabled || !this.initialized) return;
        
        const notes = [440, 392, 349, 294];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const startTime = this.audioContext.currentTime + i * 0.2;
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    /**
     * Toggle audio
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.3 : 0;
        }
        return this.enabled;
    }

    /**
     * Set master volume
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}
