import { IAudioSource } from "../core/IAudioSource.js";

/**
 * Combat Sound Generator - Impacts, explosions, damage
 * 
 * SOLID: Single Responsibility - Combat audio effects
 */
export class CombatSoundGenerator extends IAudioSource {
  /**
   * Play combat sound
   * @param {AudioContext} audioContext
   * @param {AudioNode} destination
   * @param {Object} options
   * @param {string} options.type - 'hit', 'explosion', 'destroy', 'critical'
   * @param {number} options.volume - Volume multiplier
   * @param {number} options.intensity - Intensity (0.5-2.0)
   */
  play(audioContext, destination, options = {}) {
    const { type = 'hit', volume = 1.0, intensity = 1.0 } = options;
    const now = audioContext.currentTime;

    switch (type) {
      case 'hit':
        return this._createHit(audioContext, destination, now, volume, intensity);
      case 'explosion':
        return this._createExplosion(audioContext, destination, now, volume, intensity);
      case 'destroy':
        return this._createDestroy(audioContext, destination, now, volume, intensity);
      case 'critical':
        return this._createCritical(audioContext, destination, now, volume, intensity);
      default:
        return this._createHit(audioContext, destination, now, volume, intensity);
    }
  }

  /**
   * Hit sound - Sharp impact
   */
  _createHit(audioContext, destination, now, volume, intensity) {
    const osc = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.05);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);

    noise.buffer = noiseBuffer;
    noise.playbackRate.value = intensity;

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, now);

    gain.gain.setValueAtTime(0.5 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.08);

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
   * Explosion sound - Powerful blast with rumble
   */
  _createExplosion(audioContext, destination, now, volume, intensity) {
    const bassOsc = audioContext.createOscillator();
    const midOsc = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.5);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Deep rumble
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(80 * intensity, now);
    bassOsc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

    // Mid-range crack
    midOsc.type = 'sawtooth';
    midOsc.frequency.setValueAtTime(200 * intensity, now);
    midOsc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    // Explosion noise
    noise.buffer = noiseBuffer;
    noise.playbackRate.value = 0.8 * intensity;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    filter.Q.setValueAtTime(1, now);

    // Massive initial impact, long decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8 * volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    bassOsc.connect(gain);
    midOsc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    bassOsc.start(now);
    midOsc.start(now);
    noise.start(now);
    bassOsc.stop(now + 0.6);
    midOsc.stop(now + 0.6);

    return {
      stop: () => {
        try {
          bassOsc.stop();
          midOsc.stop();
          noise.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Destroy sound - Enemy destruction with metallic debris
   */
  _createDestroy(audioContext, destination, now, volume, intensity) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.3);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Metallic crash
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(400 * intensity, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(800 * intensity, now);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    noise.buffer = noiseBuffer;
    noise.playbackRate.value = 1.2 * intensity;

    // Band-pass for metallic quality
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.6 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain);
    osc2.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    noise.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          noise.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Critical hit sound - Distinctive high-damage indicator
   */
  _createCritical(audioContext, destination, now, volume, intensity) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const osc3 = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Triple-layered impact
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200 * intensity, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(400 * intensity, now);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.12);

    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(100 * intensity, now);
    osc3.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    filter.type = 'peaking';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(5, now);
    filter.gain.setValueAtTime(10, now);

    // Sharp, powerful envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7 * volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(gain);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
    osc3.stop(now + 0.2);

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          osc3.stop();
        } catch (e) {}
      }
    };
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
