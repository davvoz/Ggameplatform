/**
 * Audio Engine
 * Scalable audio system for music and sound effects
 */

import { AudioSynthesizer, SoundLibrary } from './synth.js';

export class AudioEngine {
    constructor() {
        this.backgroundMusic = null;
        this.volume = 0.3;
        this.enabled = true;
        this.isPlaying = false;
        
        this.soundEnabled = true;
        this.soundVolume = 0.5;
        
        // Initialize synth and sound library
        this.synth = new AudioSynthesizer();
        this.soundLib = new SoundLibrary(this.synth);
        
        this.loadMusic();
    }

    loadMusic() {
        this.backgroundMusic = new Audio('assets/sounds/backgrounds/background.wav');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.volume;
    }

    play() {
        if (!this.enabled || this.isPlaying) return;
        
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.play().catch(() => {});
        this.isPlaying = true;
    }

    stop() {
        if (!this.backgroundMusic.paused) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
        this.isPlaying = false;
    }

    pause() {
        if (!this.backgroundMusic.paused) {
            this.backgroundMusic.pause();
        }
    }

    resume() {
        if (!this.enabled || !this.isPlaying) return;
        
        if (this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(() => {});
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.backgroundMusic.volume = this.volume;
    }

    toggle() {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            this.stop();
        } else {
            this.play();
        }
        
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    // Sound effects management
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.synth.setMasterVolume(this.soundVolume);
    }

    toggleSounds() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    isSoundEnabled() {
        return this.soundEnabled;
    }

    // Helper methods per triggerare suoni comuni
    towerPlace() { 
        if (!this.soundEnabled) return;
        this.soundLib.towerPlace(); 
    }
    
    towerShoot(cannonType) { 
        if (!this.soundEnabled) return;
        
        switch(cannonType) {
            case 'BASIC':
                this.soundLib.towerShootBasic();
                break;
            case 'RAPID':
                this.soundLib.towerShootRapid();
                break;
            case 'SNIPER':
                this.soundLib.towerShootSniper();
                break;
            case 'SPLASH':
                this.soundLib.towerShootSplash();
                break;
            case 'FREEZE':
                this.soundLib.towerShootFreeze();
                break;
            case 'LASER':
                this.soundLib.towerShootLaser();
                break;
            case 'ELECTRIC':
                this.soundLib.towerShootElectric();
                break;
            default:
                this.soundLib.towerShootBasic();
        }
    }
    
    towerUpgrade() { 
        if (!this.soundEnabled) return;
        this.soundLib.towerUpgrade(); 
    }
    
    towerMerge() { 
        if (!this.soundEnabled) return;
        this.soundLib.towerMerge(); 
    }
    
    towerSell() { 
        if (!this.soundEnabled) return;
        this.soundLib.towerSell(); 
    }
    
    enemySpawn() { 
        if (!this.soundEnabled) return;
        this.soundLib.enemySpawn(); 
    }
    
    enemyHit(pitch = 1) { 
        if (!this.soundEnabled) return;
        this.soundLib.enemyHit(pitch); 
    }
    
    enemyDeath() { 
        if (!this.soundEnabled) return;
        this.soundLib.enemyDeath(); 
    }
    
    enemyDamageWall() { 
        if (!this.soundEnabled) return;
        this.soundLib.enemyDamageWall(); 
    }
    
    bossSpawn() { 
        if (!this.soundEnabled) return;
        this.soundLib.bossSpawn(); 
    }
    
    specialAbility() { 
        if (!this.soundEnabled) return;
        this.soundLib.specialAbility(); 
    }
    
    uiClick() { 
        if (!this.soundEnabled) return;
        this.soundLib.uiClick(); 
    }
    
    uiError() { 
        if (!this.soundEnabled) return;
        this.soundLib.uiError(); 
    }
    
    waveStart() { 
        if (!this.soundEnabled) return;
        this.soundLib.waveStart(); 
    }
    
    waveComplete() { 
        if (!this.soundEnabled) return;
        this.soundLib.waveComplete(); 
    }
    
    coinCollect() { 
        if (!this.soundEnabled) return;
        this.soundLib.coinCollect(); 
    }
    
    gameOverSound() { 
        if (!this.soundEnabled) return;
        this.soundLib.gameOver(); 
    }
    
    victory() { 
        if (!this.soundEnabled) return;
        this.soundLib.victory(); 
    }
    
    combo(level = 1) { 
        if (!this.soundEnabled) return;
        this.soundLib.combo(level); 
    }
    
    powerup() { 
        if (!this.soundEnabled) return;
        this.soundLib.powerup(); 
    }
}
