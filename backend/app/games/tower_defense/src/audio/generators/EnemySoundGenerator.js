import { IAudioSource } from "../core/IAudioSource.js";

/**
 * Enemy Sound Generator - Distinctive enemy audio
 * Different sounds for each enemy type
 * 
 * SOLID: Open/Closed - Easy to add new enemy types
 */
export class EnemySoundGenerator extends IAudioSource {
  /**
   * Play enemy sound
   * @param {AudioContext} audioContext
   * @param {AudioNode} destination
   * @param {Object} options
   * @param {string} options.type - 'grunt', 'tank', 'swarm'
   * @param {string} options.event - 'spawn', 'damage', 'destroy'
   * @param {number} options.volume - Volume multiplier
   */
  play(audioContext, destination, options = {}) {
    const { type = 'grunt', event = 'spawn', volume = 1.0 } = options;
    const now = audioContext.currentTime;

    // Route to appropriate sound based on enemy type and event
    const key = `${type}_${event}`;
    
    switch (key) {
      // Grunt enemy sounds
      case 'grunt_spawn':
        return this._createGruntSpawn(audioContext, destination, now, volume);
      case 'grunt_damage':
        return this._createGruntDamage(audioContext, destination, now, volume);
      case 'grunt_destroy':
        return this._createGruntDestroy(audioContext, destination, now, volume);
      
      // Tank enemy sounds
      case 'tank_spawn':
        return this._createTankSpawn(audioContext, destination, now, volume);
      case 'tank_damage':
        return this._createTankDamage(audioContext, destination, now, volume);
      case 'tank_destroy':
        return this._createTankDestroy(audioContext, destination, now, volume);
      
      // Swarm enemy sounds
      case 'swarm_spawn':
        return this._createSwarmSpawn(audioContext, destination, now, volume);
      case 'swarm_damage':
        return this._createSwarmDamage(audioContext, destination, now, volume);
      case 'swarm_destroy':
        return this._createSwarmDestroy(audioContext, destination, now, volume);
      
      default:
        return this._createGruntSpawn(audioContext, destination, now, volume);
    }
  }

  /**
   * Grunt Spawn - Mechanical activation
   */
  _createGruntSpawn(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.15);

    return { stop: () => { try { osc.stop(); } catch (e) {} } };
  }

  _createGruntDamage(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.25 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.08);

    return { stop: () => { try { osc.stop(); } catch (e) {} } };
  }

  _createGruntDestroy(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

    gain.gain.setValueAtTime(0.4 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.25);

    return { stop: () => { try { osc.stop(); } catch (e) {} } };
  }

  /**
   * Tank Spawn - Heavy, armored activation
   */
  _createTankSpawn(audioContext, destination, now, volume) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.linearRampToValueAtTime(120, now + 0.2);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(160, now);
    osc2.frequency.linearRampToValueAtTime(240, now + 0.2);

    gain.gain.setValueAtTime(0.4 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      }
    };
  }

  _createTankDamage(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.1);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    noise.buffer = noiseBuffer;

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.Q.setValueAtTime(2, now);

    gain.gain.setValueAtTime(0.35 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.12);

    return {
      stop: () => {
        try {
          osc.stop();
          noise.stop();
        } catch (e) {}
      }
    };
  }

  _createTankDestroy(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.4);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    noise.buffer = noiseBuffer;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.35);

    gain.gain.setValueAtTime(0.6 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.4);

    return {
      stop: () => {
        try {
          osc.stop();
          noise.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Swarm Spawn - High-frequency insect-like buzz
   */
  _createSwarmSpawn(audioContext, destination, now, volume) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const gain = audioContext.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(600, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(900, now);

    // LFO for buzzing effect
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(15, now);
    lfoGain.gain.setValueAtTime(30, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);
    lfo.stop(now + 0.12);
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.12);

    return {
      stop: () => {
        try {
          lfo.stop();
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      }
    };
  }

  _createSwarmDamage(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain.gain.setValueAtTime(0.2 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.06);

    return { stop: () => { try { osc.stop(); } catch (e) {} } };
  }

  _createSwarmDestroy(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.15);

    return { stop: () => { try { osc.stop(); } catch (e) {} } };
  }

  /**
   * Create noise buffer
   * @private
   */
  _createNoiseBuffer(audioContext, duration) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
  }

  stop() {
    // Individual sounds stop themselves
  }
}
