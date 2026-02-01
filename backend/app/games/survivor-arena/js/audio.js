/**
 * Survivor Arena - Audio Manager
 * @fileoverview Handles all game audio with Web Audio API including background music
 */

'use strict';

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.sounds = new Map();
        this.initialized = false;
        
        // iOS detection
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // Background music
        this.bgMusicSource = null;
        this.bgMusicBuffer = null;
        this.musicPlaying = false;
        
        // Music tracks - will be set to actual files
        this.musicTracks = [
            { id: 1, name: 'Track 1', file: 'assets/ARENA1.mp3' },
            { id: 2, name: 'Track 2', file: 'assets/ARENA2.mp3' },
            { id: 3, name: 'Track 3', file: 'assets/ARENA3.mp3' }
        ];
        this.currentTrackIndex = 0;
        this.trackBuffers = {}; // Cache dei buffer audio
        
        // Volume levels (0-1)
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        
        // Mute states
        this.musicMuted = false;
        this.sfxMuted = false;
        
        // iOS unlock state
        this.unlocked = false;
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
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            // Music gain
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // Generate procedural sounds
            this.generateSounds();
            
            this.initialized = true;
            console.log('🔊 Audio initialized');
            
            // iOS: Sblocca audio immediatamente
            if (this.isIOS) {
                this.unlockIOSAudio();
            }
            
            // Carica la traccia salvata o quella predefinita
            const savedTrack = localStorage.getItem('survivorArena_musicTrack');
            if (savedTrack !== null) {
                this.currentTrackIndex = parseInt(savedTrack, 10);
            }
            
            // Carica la musica di background
            this.loadBackgroundMusic(this.musicTracks[this.currentTrackIndex].file);
            
        } catch (error) {
            console.warn('⚠️ Audio initialization failed:', error);
        }
    }

    /**
     * Sblocca l'audio su iOS
     */
    async unlockIOSAudio() {
        if (this.unlocked) return;
        
        try {
            if (this.context && this.context.state === 'suspended') {
                await this.context.resume();
            }
            
            // Crea e riproduce un buffer silenzioso
            const silentBuffer = this.context.createBuffer(1, 1, 22050);
            const source = this.context.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(this.context.destination);
            source.start(0);
            
            if (this.masterGain) {
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.context.currentTime);
            }
            
            this.unlocked = true;
            console.log('🔊 iOS audio unlocked');
        } catch (e) {
            console.warn('⚠️ iOS audio unlock failed:', e);
        }
    }

    /**
     * Generate procedural sounds
     */
    generateSounds() {
        this.sounds.set('explosion', this.createExplosionSound());
        this.sounds.set('levelUp', this.createLevelUpSound());
        this.sounds.set('death', this.createDeathSound());
    }

    // ==========================================
    // Background Music Methods
    // ==========================================

    /**
     * Carica la musica di background
     */
    async loadBackgroundMusic(url) {
        if (!this.initialized) return;
        
        try {
            // Usa cache se disponibile
            if (this.trackBuffers[url]) {
                this.bgMusicBuffer = this.trackBuffers[url];
                console.log('🎵 Music loaded from cache:', url);
                return;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            this.bgMusicBuffer = await this.decodeAudioDataSafe(arrayBuffer);
            
            if (this.bgMusicBuffer) {
                this.trackBuffers[url] = this.bgMusicBuffer;
                console.log('🎵 Music loaded:', url);
            }
        } catch (e) {
            console.warn('⚠️ Failed to load music:', url, e);
        }
    }

    /**
     * Decode audio data con fallback
     */
    decodeAudioDataSafe(arrayBuffer) {
        return new Promise((resolve, reject) => {
            try {
                this.context.decodeAudioData(arrayBuffer)
                    .then(resolve)
                    .catch(reject);
            } catch (e) {
                this.context.decodeAudioData(
                    arrayBuffer,
                    (buffer) => resolve(buffer),
                    (error) => reject(error)
                );
            }
        });
    }

    /**
     * Ottieni la lista delle tracce
     */
    getMusicTracks() {
        return this.musicTracks;
    }

    /**
     * Ottieni l'indice della traccia corrente
     */
    getCurrentTrackIndex() {
        return this.currentTrackIndex;
    }

    /**
     * Cambia la traccia musicale
     */
    async changeTrack(index) {
        if (index < 0 || index >= this.musicTracks.length) return;
        if (index === this.currentTrackIndex && this.bgMusicBuffer) return;
        
        const wasPlaying = this.musicPlaying;
        
        // Ferma la musica corrente
        this.stopBackgroundMusic();
        
        // Aggiorna l'indice e salva la preferenza
        this.currentTrackIndex = index;
        localStorage.setItem('survivorArena_musicTrack', index.toString());
        
        // Carica la nuova traccia
        await this.loadBackgroundMusic(this.musicTracks[index].file);
        
        // Riavvia se stava suonando
        if (wasPlaying) {
            await this.playBackgroundMusic();
        }
        
        console.log('🎵 Track changed to:', this.musicTracks[index].name);
    }

    /**
     * Avvia la musica di background (loop)
     */
    async playBackgroundMusic() {
        if (!this.initialized || this.musicPlaying) return;
        
        try {
            // iOS: Assicurati che l'audio sia sbloccato
            if (this.isIOS && !this.unlocked) {
                await this.unlockIOSAudio();
            }
            
            // Ensure AudioContext is active
            if (this.context && this.context.state === 'suspended') {
                await this.context.resume();
            }
            
            // Se il buffer non è caricato, prova a caricarlo
            if (!this.bgMusicBuffer) {
                await this.loadBackgroundMusic(this.musicTracks[this.currentTrackIndex].file);
                if (!this.bgMusicBuffer) {
                    console.warn('⚠️ No music buffer available');
                    return;
                }
            }
            
            // Crea nuova source
            this.bgMusicSource = this.context.createBufferSource();
            this.bgMusicSource.buffer = this.bgMusicBuffer;
            this.bgMusicSource.loop = true;
            this.bgMusicSource.connect(this.musicGain);
            
            // Rispetta lo stato mute
            const startVol = this.musicMuted ? 0 : this.musicVolume;
            if (this.musicGain) {
                this.musicGain.gain.setValueAtTime(startVol, this.context.currentTime);
            }
            
            this.bgMusicSource.start(0);
            this.musicPlaying = true;
            console.log('🎵 Music started');
            
        } catch (e) {
            console.warn('⚠️ Failed to play music:', e);
            if (this.isIOS && !this.unlocked) {
                this.unlocked = false;
                await this.unlockIOSAudio();
            }
        }
    }

    /**
     * Ferma la musica di background
     */
    stopBackgroundMusic() {
        if (this.bgMusicSource) {
            try {
                this.bgMusicSource.stop();
                this.bgMusicSource.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
            this.bgMusicSource = null;
        }
        this.musicPlaying = false;
    }

    /**
     * Pausa la musica (abbassa il volume)
     */
    pauseBackgroundMusic() {
        if (this.musicGain && this.context) {
            this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
        }
    }

    /**
     * Riprendi la musica
     */
    resumeBackgroundMusic() {
        if (this.musicGain && this.context) {
            const targetVolume = this.musicMuted ? 0 : this.musicVolume;
            this.musicGain.gain.setTargetAtTime(targetVolume, this.context.currentTime, 0.1);
        }
    }

    // ==========================================
    // Mute/Unmute Methods
    // ==========================================

    /**
     * Mute musica
     */
    muteMusic() {
        this.musicMuted = true;
        if (this.musicGain && this.context) {
            this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
        }
    }

    /**
     * Unmute musica
     */
    unmuteMusic() {
        this.musicMuted = false;
        if (this.musicGain && this.context) {
            this.musicGain.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.05);
        }
    }

    /**
     * Check if music is muted
     */
    isMusicMuted() {
        return this.musicMuted;
    }

    /**
     * Mute sound effects
     */
    muteSfx() {
        this.sfxMuted = true;
        if (this.sfxGain && this.context) {
            this.sfxGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
        }
    }

    /**
     * Unmute sound effects
     */
    unmuteSfx() {
        this.sfxMuted = false;
        if (this.sfxGain && this.context) {
            this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.05);
        }
    }

    /**
     * Check if SFX is muted
     */
    isSfxMuted() {
        return this.sfxMuted;
    }

    // ==========================================
    // Sound Effects
    // ==========================================

    /**
     * Play a sound effect
     */
    play(soundName, volume = 1, pitch = 1) {
        if (!this.initialized || this.sfxMuted) return;
        if (!this.sounds.has(soundName)) return;

        try {
            // Resume suspended context
            if (this.context && this.context.state === 'suspended') {
                this.context.resume();
            }
            
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
     * Resume audio context
     */
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    // ==========================================
    // Procedural Sound Generation
    // ==========================================

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

    createLevelUpSound() {
        const duration = 0.5;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.sin(Math.PI * t / duration);
            const note = Math.floor(t * 8) % 4;
            const frequencies = [523, 659, 784, 1047];
            const frequency = frequencies[note];
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        
        return buffer;
    }

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
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
