/**
 * Interface for audio sources
 * Defines the contract for all sound generators
 * 
 * SOLID: Interface Segregation Principle
 * Provides minimal interface for audio generation
 */
export class IAudioSource {
  /**
   * Create and play the sound
   * @param {AudioContext} audioContext - Web Audio API context
   * @param {AudioNode} destination - Where to route the audio
   * @param {Object} options - Sound-specific parameters
   * @returns {Object} - Audio nodes and controls
   */
  play(audioContext, destination, options = {}) {
    throw new Error("IAudioSource.play() must be implemented");
  }

  /**
   * Stop the sound immediately
   */
  stop() {
    throw new Error("IAudioSource.stop() must be implemented");
  }
}
