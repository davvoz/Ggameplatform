export class MainMenuScreen {
  constructor(root, { onPlay, soundLibrary }) {
    this.root = root;
    this.onPlay = onPlay;
    this.soundLibrary = soundLibrary;

    this.el = document.createElement("div");
    this.el.className = "screen-root";
    this.root.appendChild(this.el);

    this._build();
  }

  _build() {
    const panel = document.createElement("div");
    panel.className = "screen-panel";
    this.el.appendChild(panel);

    const titleRow = document.createElement("div");
    titleRow.className = "screen-title-row";

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent = "Orbital Defense Grid";

    const chip = document.createElement("div");
    chip.className = "screen-chip";
    chip.textContent = "L1 – ALPHA";

    titleRow.appendChild(title);
    titleRow.appendChild(chip);

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "screen-main-button clickable";
    mainButton.textContent = "Deploy Towers";
    
    const handlePlay = () => {
      if (this.soundLibrary) {
        this.soundLibrary.success();
      }
      
      // Request fullscreen via Platform SDK
      if (window.PlatformSDK) {
        window.PlatformSDK.requestFullScreen();
      }
      
      this.onPlay();
    };
    
    // Hover effect
    mainButton.addEventListener("mouseenter", () => {
      if (this.soundLibrary) {
        this.soundLibrary.hover();
      }
    });
    
    mainButton.addEventListener("click", handlePlay);
    mainButton.addEventListener("touchend", (e) => {
      e.preventDefault();
      handlePlay();
    });

    const secondaryButton = document.createElement("button");
    secondaryButton.type = "button";
    secondaryButton.className = "screen-secondary-button clickable";
    secondaryButton.textContent = "Loadout";
    // reserved for future
    
    // Hover effect for secondary button
    secondaryButton.addEventListener("mouseenter", () => {
      if (this.soundLibrary) {
        this.soundLibrary.hover();
      }
    });

    const footer = document.createElement("div");
    footer.className = "screen-footer";
    footer.innerHTML =
      "<span>Genesis Season</span><span>Chain-agnostic • Tactics first</span>";

    panel.appendChild(titleRow);
    panel.appendChild(mainButton);
    panel.appendChild(secondaryButton);
    panel.appendChild(footer);
  }
}

