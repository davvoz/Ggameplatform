/**
 * Audio Channel - manages a specific audio category
 * 
 * SOLID: Single Responsibility Principle
 * Handles volume, muting, and routing for one category
 */
export class AudioChannel {
  constructor(audioContext, name, defaultVolume = 1.0) {
    this.audioContext = audioContext;
    this.name = name;
    this._volume = defaultVolume;
    this._muted = false;

    // Create gain node for this channel
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = defaultVolume;
  }

  /**
   * Connect this channel to a destination
   * @param {AudioNode} destination - Typically the master output
   */
  connect(destination) {
    this.gainNode.connect(destination);
  }

  /**
   * Get the volume (0.0 to 1.0)
   */
  get volume() {
    return this._volume;
  }

  /**
   * Set the volume (0.0 to 1.0)
   */
  set volume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    this._updateGain();
  }

  /**
   * Get mute state
   */
  get muted() {
    return this._muted;
  }

  /**
   * Set mute state
   */
  set muted(value) {
    this._muted = value;
    this._updateGain();
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.muted = !this.muted;
  }

  /**
   * Update the gain node based on volume and mute
   */
  _updateGain() {
    const targetGain = this._muted ? 0 : this._volume;
    this.gainNode.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.015
    );
  }

  /**
   * Get the input node for this channel
   */
  getInput() {
    return this.gainNode;
  }
}
