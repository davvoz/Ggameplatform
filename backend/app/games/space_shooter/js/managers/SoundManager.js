/**
 * SoundManager - Gestisce effetti sonori e musica con Web Audio API
 * Con fix specifici per iOS Safari
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.enabled = true;
        this.initialized = false;
        
        // iOS detection
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        // Background music
        this.bgMusic = null;
        this.bgMusicSource = null;
        this.bgMusicBuffer = null;
        this.musicPlaying = false;
        
        // Music tracks
        this.musicTracks = [
            { id: 1, name: 'Cosmic Journey', file: 'assets/background.wav' },
            { id: 2, name: 'Stellar Storm', file: 'assets/background2.wav' },
            { id: 3, name: 'Nebula Dreams', file: 'assets/background3.wav' }
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
     * Inizializza l'audio context (deve essere chiamato dopo un'interazione utente)
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Crea AudioContext
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
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
            
            // iOS: Sblocca audio immediatamente
            if (this.isIOS) {
                this.unlockIOSAudio();
            }
            
            // Carica la traccia salvata o quella predefinita
            const savedTrack = localStorage.getItem('spaceShooter_musicTrack');
            if (savedTrack !== null) {
                this.currentTrackIndex = parseInt(savedTrack, 10);
            }
            this.loadBackgroundMusic(this.musicTracks[this.currentTrackIndex].file);
            

        } catch (e) {

            this.enabled = false;
        }
    }
    
    /**
     * Sblocca l'audio su iOS (deve essere chiamato durante un'interazione utente)
     */
    async unlockIOSAudio() {
        if (this.unlocked) return;
        
        try {
            // Resume AudioContext (necessario su iOS)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Crea e riproduce un buffer silenzioso per sbloccare l'audio
            const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            
            // Alcuni browser richiedono anche di "toccare" il GainNode
            if (this.masterGain) {
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
            }
            
            this.unlocked = true;

        } catch (e) {

        }
    }
    
    /**
     * Carica la musica di background
     */
    async loadBackgroundMusic(url) {
        if (!this.initialized) return;
        
        try {
            // Usa cache se disponibile
            if (this.trackBuffers[url]) {
                this.bgMusicBuffer = this.trackBuffers[url];

                return;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // iOS fix: usa promise-based decodeAudioData
            this.bgMusicBuffer = await this.decodeAudioDataSafe(arrayBuffer);
            
            if (this.bgMusicBuffer) {
                this.trackBuffers[url] = this.bgMusicBuffer;

            }
        } catch (e) {

        }
    }
    
    /**
     * Decode audio data con fallback per browser più vecchi
     */
    decodeAudioDataSafe(arrayBuffer) {
        return new Promise((resolve, reject) => {
            // Prima prova il metodo promise-based (moderno)
            try {
                this.audioContext.decodeAudioData(arrayBuffer)
                    .then(resolve)
                    .catch(reject);
            } catch (e) {
                // Fallback per browser più vecchi (callback-based)
                this.audioContext.decodeAudioData(
                    arrayBuffer,
                    (buffer) => resolve(buffer),
                    (error) => reject(error)
                );
            }
        });
    }
    
    /**
     * Ottieni la lista delle tracce disponibili
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
        localStorage.setItem('spaceShooter_musicTrack', index.toString());
        
        // Carica la nuova traccia
        await this.loadBackgroundMusic(this.musicTracks[index].file);
        
        // Riavvia se stava suonando
        if (wasPlaying) {
            await this.playBackgroundMusic();
        }
        

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
            
            // Ensure AudioContext is active (browsers may suspend it)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();

            }
            
            // If buffer is not loaded yet, try to (re)load and bail out
            if (!this.bgMusicBuffer) {
                await this.loadBackgroundMusic(this.musicTracks[this.currentTrackIndex].file);
                if (!this.bgMusicBuffer) {

                    return;
                }
            }
            
            // Crea nuova source
            this.bgMusicSource = this.audioContext.createBufferSource();
            this.bgMusicSource.buffer = this.bgMusicBuffer;
            this.bgMusicSource.loop = true;
            this.bgMusicSource.connect(this.musicGain);
            
            // Respect mute state at start
            const startVol = this.musicMuted ? 0 : this.musicVolume;
            if (this.musicGain) {
                this.musicGain.gain.setValueAtTime(startVol, this.audioContext.currentTime);
            }
            
            // iOS fix: usa start(0) con timing esplicito
            this.bgMusicSource.start(0);
            this.musicPlaying = true;
            

        } catch (e) {

            // Retry una volta su iOS
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
     * Assicura che l'AudioContext sia attivo prima di riprodurre un suono
     */
    ensureAudioReady() {
        if (!this.enabled || !this.initialized) return false;
        if (this.sfxMuted) return false;
        
        // Resume suspended context
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return true;
    }

    /**
     * Genera un suono di sparo
     */
    playShoot() {
        if (!this.ensureAudioReady()) return;
        
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
        if (!this.ensureAudioReady()) return;
        
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
        if (!this.ensureAudioReady()) return;
        
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
        if (!this.ensureAudioReady()) return;
        
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
        if (!this.ensureAudioReady()) return;
        
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

export default SoundManager;