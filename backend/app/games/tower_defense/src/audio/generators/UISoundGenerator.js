import { IAudioSource } from "../core/IAudioSource.js";

/**
 * UI Sound Generator - Clean, responsive interface sounds
 * 
 * SOLID: Single Responsibility - UI feedback sounds only
 */
export class UISoundGenerator extends IAudioSource {
  /**
   * Play UI sound
   * @param {AudioContext} audioContext
   * @param {AudioNode} destination
   * @param {Object} options
   * @param {string} options.type - 'click', 'hover', 'error', 'success', 'select'
   * @param {number} options.volume - Volume multiplier (0-1)
   */
  play(audioContext, destination, options = {}) {
    const { type = 'click', volume = 1.0 } = options;
    const now = audioContext.currentTime;

    switch (type) {
      case 'click':
        return this._createClick(audioContext, destination, now, volume);
      case 'hover':
        return this._createHover(audioContext, destination, now, volume);
      case 'error':
        return this._createError(audioContext, destination, now, volume);
      case 'success':
        return this._createSuccess(audioContext, destination, now, volume);
      case 'select':
        return this._createSelect(audioContext, destination, now, volume);
      default:
        return this._createClick(audioContext, destination, now, volume);
    }
  }

  /**
   * Click sound - short, crisp
   */
  _createClick(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.05);

    return {
      stop: () => {
        try { osc.stop(); } catch (e) {}
      }
    };
  }

  /**
   * Hover sound - subtle, higher pitch
   */
  _createHover(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.15 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.03);

    return {
      stop: () => {
        try { osc.stop(); } catch (e) {}
      }
    };
  }

  /**
   * Error sound - lower, dissonant
   */
  _createError(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    gain.gain.setValueAtTime(0.25 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.15);

    return {
      stop: () => {
        try { osc.stop(); } catch (e) {}
      }
    };
  }

  /**
   * Success sound - ascending, bright
   */
  _createSuccess(audioContext, destination, now, volume) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(0.2 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);

    return {
      stop: () => {
        try { 
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      }
    };
  }

  /**
   * Select sound - resonant, mechanical
   */
  _createSelect(audioContext, destination, now, volume) {
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.25 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.08);

    return {
      stop: () => {
        try { osc.stop(); } catch (e) {}
      }
    };
  }

  stop() {
    // Individual sounds stop themselves
  }
}
