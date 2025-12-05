import { IAudioSource } from "../core/IAudioSource.js";

/**
 * Tower Sound Generator - Distinct weapon sounds
 * Each tower type has unique audio signature
 * 
 * SOLID: Open/Closed - Easy to add new tower types
 */
export class TowerSoundGenerator extends IAudioSource {
  /**
   * Play tower sound
   * @param {AudioContext} audioContext
   * @param {AudioNode} destination
   * @param {Object} options
   * @param {string} options.type - 'laser', 'rail', 'pulse'
   * @param {number} options.volume - Volume multiplier
   * @param {number} options.pitch - Pitch variation (0.8-1.2)
   */
  play(audioContext, destination, options = {}) {
    const { type = 'laser', volume = 1.0, pitch = 1.0 } = options;
    const now = audioContext.currentTime;

    switch (type) {
      case 'laser':
        return this._createLaserSound(audioContext, destination, now, volume, pitch);
      case 'rail':
        return this._createRailSound(audioContext, destination, now, volume, pitch);
      case 'pulse':
        return this._createPulseSound(audioContext, destination, now, volume, pitch);
      default:
        return this._createLaserSound(audioContext, destination, now, volume, pitch);
    }
  }

  /**
   * Laser Tower - High-frequency beam sound
   * Distinctive: Classic "pew pew" laser with descending pitch
   */
  _createLaserSound(audioContext, destination, now, volume, pitch) {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Triangle wave for classic laser "pew" sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.08);

    // Low-pass filter with resonance for "zap" quality
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    filter.Q.setValueAtTime(3, now);

    // Classic laser envelope - instant attack, fast decay
    gain.gain.setValueAtTime(0.45 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.1);

    return {
      stop: () => {
        try {
          osc.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Rail Tower - Electromagnetic railgun sound
   * Distinctive: Deep charge-up with powerful release
   */
  _createRailSound(audioContext, destination, now, volume, pitch) {
    const chargeOsc = audioContext.createOscillator();
    const shotOsc = audioContext.createOscillator();
    const noiseBuffer = this._createNoiseBuffer(audioContext, 0.1);
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Charge-up sound
    chargeOsc.type = 'sawtooth';
    chargeOsc.frequency.setValueAtTime(100 * pitch, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.08);

    // Powerful shot
    shotOsc.type = 'square';
    shotOsc.frequency.setValueAtTime(150 * pitch, now + 0.08);
    shotOsc.frequency.exponentialRampToValueAtTime(80 * pitch, now + 0.25);

    // White noise for electromagnetic crackle
    noise.buffer = noiseBuffer;
    noise.loop = false;

    // Band-pass filter for metallic quality
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(3, now);

    // Envelope: charge up, then powerful blast
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2 * volume, now + 0.08);
    gain.gain.setValueAtTime(0.6 * volume, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    chargeOsc.connect(gain);
    shotOsc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    chargeOsc.start(now);
    chargeOsc.stop(now + 0.08);
    shotOsc.start(now + 0.08);
    shotOsc.stop(now + 0.3);
    noise.start(now + 0.08);

    return {
      stop: () => {
        try {
          chargeOsc.stop();
          shotOsc.stop();
          noise.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Pulse Tower - AOE energy wave sound
   * Distinctive: Expanding resonant wave with bass thump
   */
  _createPulseSound(audioContext, destination, now, volume, pitch) {
    const bassOsc = audioContext.createOscillator();
    const midOsc = audioContext.createOscillator();
    const highOsc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    // Deep bass for energy release
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(60 * pitch, now);
    bassOsc.frequency.exponentialRampToValueAtTime(30 * pitch, now + 0.4);

    // Mid-range pulse
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(200 * pitch, now);
    midOsc.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.35);

    // High frequency shimmer
    highOsc.type = 'sine';
    highOsc.frequency.setValueAtTime(1200 * pitch, now);
    highOsc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.3);

    // Low-pass filter for wave expansion feel
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    filter.Q.setValueAtTime(2, now);

    // Envelope: sharp attack, resonant decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7 * volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    bassOsc.connect(gain);
    midOsc.connect(filter);
    highOsc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    bassOsc.start(now);
    midOsc.start(now);
    highOsc.start(now);
    bassOsc.stop(now + 0.5);
    midOsc.stop(now + 0.5);
    highOsc.stop(now + 0.5);

    return {
      stop: () => {
        try {
          bassOsc.stop();
          midOsc.stop();
          highOsc.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Create noise buffer for effects
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
