/**
 * Audio Controls UI Component
 * Provides volume and mute controls
 * 
 * SOLID: Single Responsibility - Audio UI controls only
 */
export class AudioControlsView {
  constructor(root, audioManager) {
    this.root = root;
    this.audioManager = audioManager;
    
    this.el = document.createElement("div");
    this.el.className = "audio-controls";
    this.el.style.cssText = `
      position: absolute;
      bottom: 4.5rem;
      left: 0.6rem;
      display: flex;
      gap: 0.4rem;
      align-items: center;
      pointer-events: auto;
      z-index: 200;
    `;
    
    this.root.appendChild(this.el);
    this._build();
  }

  _build() {
    // Volume slider
    const volumeContainer = document.createElement("div");
    volumeContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.3rem 0.6rem;
      background: rgba(7, 10, 14, 0.92);
      border: 1px solid rgba(108, 243, 197, 0.38);
      border-radius: 999px;
    `;

    const volumeIcon = document.createElement("span");
    volumeIcon.textContent = "🔊";
    volumeIcon.style.cssText = `
      font-size: 1rem;
      opacity: 0.8;
    `;

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "100";
    volumeSlider.value = String(this.audioManager.masterVolume * 100);
    volumeSlider.style.cssText = `
      width: 80px;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(108, 243, 197, 0.3);
      border-radius: 2px;
      outline: none;
    `;

    // Style the slider thumb (add only if not already present)
    if (!document.getElementById("audio-controls-slider-style")) {
      const style = document.createElement("style");
      style.id = "audio-controls-slider-style";
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #6cf3c5;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #6cf3c5;
          cursor: pointer;
          border: none;
        }
      `;
      document.head.appendChild(style);
    }

    volumeSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value) / 100;
      this.audioManager.masterVolume = value;
    });

    volumeContainer.appendChild(volumeIcon);
    volumeContainer.appendChild(volumeSlider);

    // Mute button
    const muteButton = document.createElement("button");
    muteButton.type = "button";
    muteButton.className = "clickable";
    muteButton.style.cssText = `
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 50%;
      background: rgba(7, 10, 14, 0.92);
      border: 1px solid rgba(108, 243, 197, 0.38);
      color: #6cf3c5;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    muteButton.textContent = this.audioManager.masterMuted ? "🔇" : "🔊";

    muteButton.addEventListener("click", () => {
      this.audioManager.toggleMasterMute();
      muteButton.textContent = this.audioManager.masterMuted ? "🔇" : "🔊";
    });

    this.el.appendChild(volumeContainer);
    this.el.appendChild(muteButton);
    
    this.muteButton = muteButton;
  }

  update() {
    // Update mute button if needed
    if (this.muteButton) {
      this.muteButton.textContent = this.audioManager.masterMuted ? "🔇" : "🔊";
    }
  }

  dispose() {
    if (this.el && this.el.parentElement) {
      this.el.parentElement.removeChild(this.el);
    }
  }
}
