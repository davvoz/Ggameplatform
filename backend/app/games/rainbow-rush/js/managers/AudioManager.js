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
        this.backgroundMusic = null;
        this.backgroundMusicGain = null;
        this.musicVolume = 0.3;
        this.musicPlaying = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSounds();
            await this.loadBackgroundMusic();
            this.initialized = true;
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }
    
    async loadBackgroundMusic() {
        try {
            const response = await fetch('./assets/background_music.mp3');
            const arrayBuffer = await response.arrayBuffer();
            this.backgroundMusic = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Background music loaded successfully');
        } catch (error) {
            console.warn('Failed to load background music:', error);
        }
    }
    
    playBackgroundMusic() {
        if (!this.enabled || !this.audioContext || !this.backgroundMusic || this.musicPlaying) return;
        
        try {
            // Create gain node for volume control
            this.backgroundMusicGain = this.audioContext.createGain();
            this.backgroundMusicGain.gain.value = this.musicVolume;
            this.backgroundMusicGain.connect(this.audioContext.destination);
            
            // Create and configure source
            const source = this.audioContext.createBufferSource();
            source.buffer = this.backgroundMusic;
            source.loop = true;
            source.connect(this.backgroundMusicGain);
            
            // Store reference for stopping
            this.musicSource = source;
            
            source.start(0);
            this.musicPlaying = true;
            console.log('Background music started');
        } catch (error) {
            console.warn('Failed to play background music:', error);
        }
    }
    
    stopBackgroundMusic() {
        if (this.musicSource && this.musicPlaying) {
            try {
                this.musicSource.stop();
                this.musicPlaying = false;
                console.log('Background music stopped');
            } catch (error) {
                console.warn('Failed to stop background music:', error);
            }
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusicGain) {
            this.backgroundMusicGain.gain.value = this.musicVolume;
        }
    }

    generateSounds() {
        // Generate procedural sound effects
        this.sounds.set('jump', this.createJumpSound.bind(this));
        this.sounds.set('land', this.createLandSound.bind(this));
        this.sounds.set('collect', this.createCollectSound.bind(this));
        this.sounds.set('hit', this.createHitSound.bind(this));
        this.sounds.set('score', this.createScoreSound.bind(this));
        this.sounds.set('powerup', this.createPowerupSound.bind(this));
        this.sounds.set('powerup_end', this.createPowerupEndSound.bind(this));
        this.sounds.set('powerup_ready', this.createPowerupReadySound.bind(this));
        this.sounds.set('death', this.createDeathSound.bind(this));
        
        // Gamification sounds
        this.sounds.set('perfect_land', this.createPerfectLandSound.bind(this));
        this.sounds.set('streak', this.createStreakSound.bind(this));
        this.sounds.set('achievement', this.createAchievementSound.bind(this));
        this.sounds.set('near_miss', this.createNearMissSound.bind(this));
        this.sounds.set('combo_break', this.createComboBreakSound.bind(this));
        this.sounds.set('boost', this.createBoostSound.bind(this));
        
        // Power-up specific sounds
        this.sounds.set('powerup_immortality', this.createImmortalitySound.bind(this));
        this.sounds.set('powerup_flight', this.createFlightSound.bind(this));
        this.sounds.set('powerup_superJump', this.createSuperJumpSound.bind(this));
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
    
    createLandSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Suono più grave e corto per l'atterraggio (thud)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
    }
    
    createBoostSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Suono di accelerazione "whoosh" con sweep di frequenza
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sawtooth';
        
        // Sweep di frequenza crescente per effetto accelerazione
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
        
        // Filtro passa-basso che si apre
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.2);
        filter.Q.value = 2;

        // Envelope volume: rapido attacco, sustain, decay
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(this.masterVolume * 0.5, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, ctx.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.35);
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

    createPowerupSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Magical ascending arpeggio
        const frequencies = [440, 554.37, 659.25, 880]; // A, C#, E, A
        
        frequencies.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.06);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.06);
            gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, ctx.currentTime + index * 0.06 + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.06 + 0.2);

            oscillator.start(ctx.currentTime + index * 0.06);
            oscillator.stop(ctx.currentTime + index * 0.06 + 0.2);
        });
    }

    createPowerupEndSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Descending sound
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    createPowerupReadySound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Short ding
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }

    createImmortalitySound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Epic shield activation - bright ascending power sound
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 - major chord
        
        frequencies.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.05);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.05);
            gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.25, ctx.currentTime + index * 0.05 + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.05 + 0.3);

            oscillator.start(ctx.currentTime + index * 0.05);
            oscillator.stop(ctx.currentTime + index * 0.05 + 0.3);
        });
        
        // Add a shimmering high note at the end
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(1568, ctx.currentTime + 0.2); // High G
        
        shimmerGain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
        shimmerGain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, ctx.currentTime + 0.21);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        shimmer.start(ctx.currentTime + 0.2);
        shimmer.stop(ctx.currentTime + 0.5);
    }

    createFlightSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Rising whoosh sound - frequency increases to simulate flight
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Whoosh effect
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
        
        // Low-pass filter for smoother sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.5);
        filter.Q.value = 1.5;
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.35, ctx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, ctx.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.6);
    }

    createSuperJumpSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        
        // Energetic charging sound with sparkle
        const charge = ctx.createOscillator();
        const sparkle = ctx.createOscillator();
        const chargeGain = ctx.createGain();
        const sparkleGain = ctx.createGain();

        charge.connect(chargeGain);
        sparkle.connect(sparkleGain);
        chargeGain.connect(ctx.destination);
        sparkleGain.connect(ctx.destination);

        // Main charging tone
        charge.type = 'square';
        charge.frequency.setValueAtTime(300, ctx.currentTime);
        charge.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        charge.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
        
        // High sparkle overlay
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(1200, ctx.currentTime);
        sparkle.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.2);
        sparkle.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.35);
        
        chargeGain.gain.setValueAtTime(this.masterVolume * 0.3, ctx.currentTime);
        chargeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        sparkleGain.gain.setValueAtTime(this.masterVolume * 0.15, ctx.currentTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        charge.start(ctx.currentTime);
        charge.stop(ctx.currentTime + 0.4);
        sparkle.start(ctx.currentTime);
        sparkle.stop(ctx.currentTime + 0.4);
    }
    
    createPerfectLandSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }
    
    createStreakSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523, this.audioContext.currentTime);
        osc2.frequency.setValueAtTime(659, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc1.start(this.audioContext.currentTime);
        osc2.start(this.audioContext.currentTime);
        osc1.stop(this.audioContext.currentTime + 0.2);
        osc2.stop(this.audioContext.currentTime + 0.2);
    }
    
    createAchievementSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const notes = [523, 659, 784, 1047];
        const duration = 0.15;
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = this.audioContext.currentTime + i * 0.08;
            gainNode.gain.setValueAtTime(this.masterVolume * 0.35, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }
    
    createNearMissSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }
    
    createComboBreakSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(this.masterVolume * 0.25, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.2);
    }
    
    createDeathSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const ctx = this.audioContext;
        
        // Suono triste e lungo - discesa drammatica con riverbero
        // Nota principale - discesa lenta e triste
        const mainOsc = ctx.createOscillator();
        const mainGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        mainOsc.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(ctx.destination);
        
        // Suono orchestrale triste (tipo violino triste)
        mainOsc.type = 'triangle';
        
        // Discesa drammatica da nota alta a bassa (2.5 secondi)
        mainOsc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        mainOsc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.0); // A3
        mainOsc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 2.5); // A2
        
        // Filtro passa-basso che si chiude per dare effetto "morte"
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 2.5);
        filter.Q.value = 1;
        
        // Volume che sale e scende dolcemente
        mainGain.gain.setValueAtTime(0.01, ctx.currentTime);
        mainGain.gain.exponentialRampToValueAtTime(this.masterVolume * 0.4, ctx.currentTime + 0.3);
        mainGain.gain.setValueAtTime(this.masterVolume * 0.4, ctx.currentTime + 1.8);
        mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
        
        mainOsc.start(ctx.currentTime);
        mainOsc.stop(ctx.currentTime + 2.5);
        
        // Accordo triste di accompagnamento (minore settima)
        const chord = [330, 392, 494]; // E4, G4, B4 (Em7 parziale)
        
        chord.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 2.5);
            
            const startDelay = index * 0.1;
            gain.gain.setValueAtTime(0.01, ctx.currentTime + startDelay);
            gain.gain.exponentialRampToValueAtTime(this.masterVolume * 0.15, ctx.currentTime + startDelay + 0.2);
            gain.gain.setValueAtTime(this.masterVolume * 0.15, ctx.currentTime + 1.8);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
            
            osc.start(ctx.currentTime + startDelay);
            osc.stop(ctx.currentTime + 2.5);
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
        
        // Start background music if not already playing
        if (!this.musicPlaying) {
            this.playBackgroundMusic();
        }
    }
}
