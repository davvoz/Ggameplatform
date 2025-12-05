export class HUDView {
  constructor(root, levelManager) {
    this.root = root;
    this.levelManager = levelManager;

    this.el = document.createElement("div");
    this.el.className = "hud-top";
    this.root.appendChild(this.el);

    this._build();
  }

  _build() {
    this.leftBox = document.createElement("div");
    this.leftBox.className = "hud-box";

    const creditsIcon = document.createElement("div");
    creditsIcon.className = "hud-pill";
    creditsIcon.textContent = "Ξ";

    const creditsLabel = document.createElement("div");
    creditsLabel.className = "hud-label";
    creditsLabel.textContent = "Credits";

    this.creditsValue = document.createElement("div");
    this.creditsValue.className = "hud-value";

    this.leftBox.appendChild(creditsIcon);
    this.leftBox.appendChild(creditsLabel);
    this.leftBox.appendChild(this.creditsValue);

    this.rightBox = document.createElement("div");
    this.rightBox.className = "hud-box";

    const waveIcon = document.createElement("div");
    waveIcon.className = "hud-pill";
    waveIcon.textContent = "✦";

    this.waveValue = document.createElement("div");
    this.waveValue.className = "hud-value";

    const healthLabel = document.createElement("div");
    healthLabel.className = "hud-label";
    healthLabel.textContent = "Base";

    this.healthValue = document.createElement("div");
    this.healthValue.className = "hud-value";

    this.rightBox.appendChild(waveIcon);
    this.rightBox.appendChild(this.waveValue);
    this.rightBox.appendChild(healthLabel);
    this.rightBox.appendChild(this.healthValue);

    this.el.appendChild(this.leftBox);
    this.el.appendChild(this.rightBox);

    this.update();
  }

  update() {
    this.creditsValue.textContent = this.levelManager.credits.toString();
    const wave = this.levelManager.getCurrentWave();
    const waveIndex = this.levelManager.currentWaveIndex + 1;
    const totalWaves = this.levelManager.currentLevel?.waves.length || 0;
    
    // Mostra wave corrente - dopo le wave definite mostra "∞" per infinite
    if (waveIndex > totalWaves) {
      this.waveValue.textContent = `${waveIndex} ∞`;
    } else {
      this.waveValue.textContent = `${waveIndex}/${totalWaves}`;
    }
    
    this.healthValue.textContent = this.levelManager.health.toString();
  }
}

