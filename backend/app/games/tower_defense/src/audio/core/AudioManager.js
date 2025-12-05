import { AudioChannel } from "./AudioChannel.js";

/**
 * Audio Manager - Central audio system controller
 * 
 * SOLID Principles:
 * - Single Responsibility: Manages audio context and channels
 * - Open/Closed: Easy to add new channels
 * - Dependency Inversion: Depends on abstractions (channels)
 */
export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.channels = new Map();
    this.activeSounds = new Set();
    this._initialized = false;
    this._masterVolume = 0.7;
    this._masterMuted = false;
    
    // Sound pooling and limits
    this.maxSoundsPerChannel = {
      ui: 3,
      towers: 8,
      enemies: 6,
      combat: 10,
      ambient: 2,
      music: 1
    };
    this.soundsByChannel = new Map();
  }

  /**
   * Initialize the audio system
   * Must be called from a user interaction (browser policy)
   */
  async initialize() {
    if (this._initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this._masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Create default channels
      this._createChannel("ui", 0.6);
      this._createChannel("towers", 0.8);
     // this._createChannel("enemies", 0.7);
      this._createChannel("combat", 0.75);
     // this._createChannel("ambient", 0.4);
     // this._createChannel("music", 0.5);
      
      // Initialize sound tracking per channel
      this.soundsByChannel.set("ui", []);
      this.soundsByChannel.set("towers", []);
      //this.soundsByChannel.set("enemies", []);
      this.soundsByChannel.set("combat", []);
      //this.soundsByChannel.set("ambient", []);
      //this.soundsByChannel.set("music", []);

      this._initialized = true;
      console.log("[AudioManager] Initialized successfully");
    } catch (error) {
      console.error("[AudioManager] Failed to initialize:", error);
    }
  }

  /**
   * Create a new audio channel
   * @private
   */
  _createChannel(name, defaultVolume) {
    const channel = new AudioChannel(this.audioContext, name, defaultVolume);
    channel.connect(this.masterGain);
    this.channels.set(name, channel);
  }

  /**
   * Get a specific channel
   * @param {string} channelName - Name of the channel
   * @returns {AudioChannel}
   */
  getChannel(channelName) {
    return this.channels.get(channelName);
  }

  /**
   * Play a sound on a specific channel
   * @param {string} channelName - Channel to play on
   * @param {IAudioSource} soundSource - Sound generator
   * @param {Object} options - Sound options
   * @returns {Object} - Sound control object
   */
  playSound(channelName, soundSource, options = {}) {
    if (!this._initialized) {
      console.warn("[AudioManager] Not initialized. Call initialize() first.");
      return null;
    }

    const channel = this.channels.get(channelName);
    if (!channel) {
      //console.warn(`[AudioManager] Channel "${channelName}" not found`);
      return null;
    }
    
    // Check channel sound limit
    const channelSounds = this.soundsByChannel.get(channelName) || [];
    const maxSounds = this.maxSoundsPerChannel[channelName] || 5;
    
    // Clean up finished sounds
    this._cleanupChannelSounds(channelName);
    
    // If at limit, remove oldest sound
    if (channelSounds.length >= maxSounds) {
      const oldestSound = channelSounds.shift();
      if (oldestSound && oldestSound.stop) {
        try {
          oldestSound.stop();
        } catch (e) {}
      }
      this.activeSounds.delete(oldestSound);
    }

    try {
      const sound = soundSource.play(
        this.audioContext,
        channel.getInput(),
        options
      );
      
      if (sound) {
        // Track sound
        sound._channelName = channelName;
        sound._startTime = this.audioContext.currentTime;
        this.activeSounds.add(sound);
        channelSounds.push(sound);
        
        // Auto-cleanup when sound ends
        const originalStop = sound.stop;
        sound.stop = () => {
          if (originalStop) originalStop();
          this._removeSound(sound);
        };
      }
      
      return sound;
    } catch (error) {
      console.error("[AudioManager] Error playing sound:", error);
      return null;
    }
  }
  
  /**
   * Remove a sound from tracking
   * @private
   */
  _removeSound(sound) {
    this.activeSounds.delete(sound);
    
    if (sound._channelName) {
      const channelSounds = this.soundsByChannel.get(sound._channelName);
      if (channelSounds) {
        const index = channelSounds.indexOf(sound);
        if (index > -1) {
          channelSounds.splice(index, 1);
        }
      }
    }
  }
  
  /**
   * Cleanup finished sounds from a channel
   * @private
   */
  _cleanupChannelSounds(channelName) {
    const channelSounds = this.soundsByChannel.get(channelName);
    if (!channelSounds) return;
    
    const now = this.audioContext.currentTime;
    const maxDuration = 2.0; // Maximum expected sound duration
    
    for (let i = channelSounds.length - 1; i >= 0; i--) {
      const sound = channelSounds[i];
      if (sound._startTime && (now - sound._startTime) > maxDuration) {
        channelSounds.splice(i, 1);
        this.activeSounds.delete(sound);
      }
    }
  }

  /**
   * Stop all active sounds
   */
  stopAll() {
    this.activeSounds.forEach(sound => {
      if (sound.stop) {
        try {
          sound.stop();
        } catch (e) {}
      }
    });
    this.activeSounds.clear();
    
    // Clear all channel tracking
    this.soundsByChannel.forEach(sounds => sounds.length = 0);
  }

  /**
   * Get master volume
   */
  get masterVolume() {
    return this._masterVolume;
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  set masterVolume(value) {
    this._masterVolume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this._masterMuted ? 0 : this._masterVolume,
        this.audioContext.currentTime,
        0.015
      );
    }
  }

  /**
   * Get master mute state
   */
  get masterMuted() {
    return this._masterMuted;
  }

  /**
   * Set master mute state
   */
  set masterMuted(value) {
    this._masterMuted = value;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this._masterMuted ? 0 : this._masterVolume,
        this.audioContext.currentTime,
        0.015
      );
    }
  }

  /**
   * Toggle master mute
   */
  toggleMasterMute() {
    this.masterMuted = !this.masterMuted;
  }

  /**
   * Resume audio context (needed after pause/tab switch)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Suspend audio context (for pausing)
   */
  suspend() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * Get current time from audio context
   */
  getCurrentTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  /**
   * Check if audio is initialized
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.channels.clear();
    this._initialized = false;
  }
}
