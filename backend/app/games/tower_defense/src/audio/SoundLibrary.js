import { AudioManager } from "./core/AudioManager.js";
import { UISoundGenerator } from "./generators/UISoundGenerator.js";
import { TowerSoundGenerator } from "./generators/TowerSoundGenerator.js";
import { EnemySoundGenerator } from "./generators/EnemySoundGenerator.js";
import { CombatSoundGenerator } from "./generators/CombatSoundGenerator.js";
import { AmbientSoundGenerator } from "./generators/AmbientSoundGenerator.js";

/**
 * Sound Library - Central registry of all sound generators
 * 
 * SOLID Principles:
 * - Single Responsibility: Registry and factory for sound generators
 * - Open/Closed: Easy to add new sound types
 * - Liskov Substitution: All generators implement IAudioSource
 */
export class SoundLibrary {
  constructor(audioManager) {
    this.audioManager = audioManager;
    
    // Singleton instances of generators
    this.generators = {
      ui: new UISoundGenerator(),
      tower: new TowerSoundGenerator(),
      enemy: new EnemySoundGenerator(),
      combat: new CombatSoundGenerator(),
      ambient: new AmbientSoundGenerator()
    };
  }

  /**
   * Play UI sound
   */
  playUI(type, volume = 1.0) {
    return this.audioManager.playSound(
      'ui',
      this.generators.ui,
      { type, volume }
    );
  }

  /**
   * Play tower sound
   */
  playTower(type, pitch = 1.0, volume = 1.0) {
    return this.audioManager.playSound(
      'towers',
      this.generators.tower,
      { type, pitch, volume }
    );
  }

  /**
   * Play enemy sound
   */
  playEnemy(type, event, volume = 1.0) {
    return this.audioManager.playSound(
      'enemies',
      this.generators.enemy,
      { type, event, volume }
    );
  }

  /**
   * Play combat sound
   */
  playCombat(type, intensity = 1.0, volume = 1.0) {
    return this.audioManager.playSound(
      'combat',
      this.generators.combat,
      { type, intensity, volume }
    );
  }

  /**
   * Play ambient sound
   */
  playAmbient(type, loop = false, volume = 1.0) {
    return this.audioManager.playSound(
      'ambient',
      this.generators.ambient,
      { type, loop, volume }
    );
  }

  /**
   * Convenience methods for common sounds
   */
  
  // UI
  click() { return this.playUI('click'); }
  hover() { return this.playUI('hover'); }
  error() { return this.playUI('error'); }
  success() { return this.playUI('success'); }
  select() { return this.playUI('select'); }

  // Towers
  laserFire(pitch = 1.0) { return this.playTower('laser', pitch); }
  railFire(pitch = 1.0) { return this.playTower('rail', pitch); }
  pulseFire(pitch = 1.0) { return this.playTower('pulse', pitch); }

  // Combat
  hit(intensity = 1.0) { return this.playCombat('hit', intensity); }
  explosion(intensity = 1.0) { return this.playCombat('explosion', intensity); }
  destroy(intensity = 1.0) { return this.playCombat('destroy', intensity); }
  critical(intensity = 1.0) { return this.playCombat('critical', intensity); }

  // Enemies
  enemySpawn(type = 'grunt') { return this.playEnemy(type, 'spawn'); }
  enemyDamage(type = 'grunt') { return this.playEnemy(type, 'damage'); }
  enemyDestroy(type = 'grunt') { return this.playEnemy(type, 'destroy'); }
  enemyReachBase() { return this.playUI('error'); } // Sound when enemy reaches base

  // Ambient
  spaceAmbience(loop = true) { return this.playAmbient('space', loop); }
  tension(loop = false) { return this.playAmbient('tension', loop); }
  victory() { return this.playAmbient('victory', false); }
  defeat() { return this.playAmbient('defeat', false); }
  gameOver() { return this.defeat(); } // Alias for game over
}
