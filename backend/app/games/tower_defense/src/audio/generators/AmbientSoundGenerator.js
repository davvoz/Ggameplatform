import { IAudioSource } from "../core/IAudioSource.js";

/**
 * Ambient Sound Generator - Atmosphere and environment
 * 
 * SOLID: Single Responsibility - Ambient soundscapes
 */
export class AmbientSoundGenerator extends IAudioSource {
  /**
   * Play ambient sound
   * @param {AudioContext} audioContext
   * @param {AudioNode} destination
   * @param {Object} options
   * @param {string} options.type - 'space', 'tension', 'victory', 'defeat'
   * @param {number} options.volume - Volume multiplier
   * @param {boolean} options.loop - Whether to loop the sound
   */
  play(audioContext, destination, options = {}) {
    const { type = 'space', volume = 1.0, loop = false } = options;
    const now = audioContext.currentTime;

    switch (type) {
      case 'space':
        return this._createSpaceAmbience(audioContext, destination, now, volume, loop);
      case 'tension':
        return this._createTension(audioContext, destination, now, volume, loop);
      case 'victory':
        return this._createVictory(audioContext, destination, now, volume);
      case 'defeat':
        return this._createDefeat(audioContext, destination, now, volume);
      default:
        return this._createSpaceAmbience(audioContext, destination, now, volume, loop);
    }
  }

  /**
   * Space ambience - Subtle cosmic atmosphere
   */
  _createSpaceAmbience(audioContext, destination, now, volume, loop) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Low frequency drone
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now); // A1

    // Higher harmonic
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, now); // A2

    // LFO for subtle modulation
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.3, now);
    lfoGain.gain.setValueAtTime(5, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(1, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15 * volume, now + 2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    if (!loop) {
      const stopTime = now + 8;
      gain.gain.setValueAtTime(0.15 * volume, stopTime - 2);
      gain.gain.linearRampToValueAtTime(0.01, stopTime);
      lfo.stop(stopTime);
      osc1.stop(stopTime);
      osc2.stop(stopTime);
    }

    return {
      stop: () => {
        const currentTime = audioContext.currentTime;
        gain.gain.cancelScheduledValues(currentTime);
        gain.gain.setValueAtTime(gain.gain.value, currentTime);
        gain.gain.linearRampToValueAtTime(0.01, currentTime + 1);
        
        try {
          lfo.stop(currentTime + 1);
          osc1.stop(currentTime + 1);
          osc2.stop(currentTime + 1);
        } catch (e) {}
      }
    };
  }

  /**
   * Tension - Rising suspense for incoming waves
   */
  _createTension(audioContext, destination, now, volume, loop) {
    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);

    // Slow pulsing LFO
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(2, now);
    lfoGain.gain.setValueAtTime(20, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(800, now + 4);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2 * volume, now + 1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    lfo.start(now);
    osc.start(now);

    if (!loop) {
      const stopTime = now + 6;
      gain.gain.linearRampToValueAtTime(0.01, stopTime);
      lfo.stop(stopTime);
      osc.stop(stopTime);
    }

    return {
      stop: () => {
        const currentTime = audioContext.currentTime;
        gain.gain.cancelScheduledValues(currentTime);
        gain.gain.setValueAtTime(gain.gain.value, currentTime);
        gain.gain.linearRampToValueAtTime(0.01, currentTime + 0.5);
        
        try {
          lfo.stop(currentTime + 0.5);
          osc.stop(currentTime + 0.5);
        } catch (e) {}
      }
    };
  }

  /**
   * Victory - Triumphant ascending tones
   */
  _createVictory(audioContext, destination, now, volume) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const osc3 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Major chord: C-E-G
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now); // G5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4 * volume, now + 0.1);
    gain.gain.setValueAtTime(0.4 * volume, now + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc3.start(now + 0.1);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
    osc3.stop(now + 2.5);

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
   * Defeat - Descending, somber tones
   */
  _createDefeat(audioContext, destination, now, volume) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Minor interval
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now); // A4
    osc1.frequency.exponentialRampToValueAtTime(220, now + 2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.exponentialRampToValueAtTime(261.63, now + 2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35 * volume, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      }
    };
  }

  stop() {
    // Handled by individual sound methods
  }
}
