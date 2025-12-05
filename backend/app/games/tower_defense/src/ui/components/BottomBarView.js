export class BottomBarView {
  constructor(root, { towerTypes, onTowerSelected, onTowerDeselected, isAffordable, soundLibrary }) {
    this.root = root;
    this.towerTypes = towerTypes;
    this.onTowerSelected = onTowerSelected;
    this.onTowerDeselected = onTowerDeselected;
    this.isAffordable = isAffordable;
    this.selectedTowerId = null;
    this.soundLibrary = soundLibrary; // Audio system

    this.el = document.createElement("div");
    this.el.className = "bottom-bar";
    this.root.appendChild(this.el);

    this.buttons = new Map();
    this._build();
  }

  _build() {
    this.towerTypes.forEach((type) => {
      const btn = document.createElement("button");
      btn.className = "tower-button clickable";
      btn.type = "button";

      const icon = document.createElement("div");
      icon.className = "tower-button-icon";
      icon.textContent = type.icon;

      const label = document.createElement("div");
      label.textContent = type.label;

      const cost = document.createElement("div");
      cost.className = "tower-button-cost";
      cost.textContent = `${type.baseCost} Ξ`;

      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(cost);

      const handleTowerButtonClick = () => {
        if (!this.isAffordable(type.id)) {
          // Play error sound for insufficient funds
          if (this.soundLibrary) {
            this.soundLibrary.error();
          }
          return;
        }
        
        // Se è già selezionata, deseleziona
        if (this.selectedTowerId === type.id) {
          this.setSelectedTower(null);
          if (this.onTowerDeselected) {
            this.onTowerDeselected();
          }
          // Play deselect sound
          if (this.soundLibrary) {
            this.soundLibrary.click();
          }
        } else {
          // Seleziona nuova torre
          this.setSelectedTower(type.id);
          this.onTowerSelected(type.id);
          // Play select sound
          if (this.soundLibrary) {
            this.soundLibrary.select();
          }
        }
      };

      // Hover effect
      btn.addEventListener("mouseenter", () => {
        if (this.soundLibrary && this.isAffordable(type.id)) {
          this.soundLibrary.hover();
        }
      });

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTowerButtonClick();
      });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTowerButtonClick();
      });

      this.el.appendChild(btn);
      this.buttons.set(type.id, btn);
    });

    const actionBtn = document.createElement("button");
    actionBtn.className = "round-button clickable";
    actionBtn.type = "button";
    actionBtn.textContent = "▶";
    this.el.appendChild(actionBtn);
    this.actionBtn = actionBtn;

    // Camera controls
    this._buildCameraControls();
  }

  _buildCameraControls() {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "camera-controls";
    controlsContainer.style.cssText = `
      position: absolute;
      right: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      pointer-events: auto;
    `;

    const buttons = [
      { id: "zoom-in", label: "+", action: "zoomIn" },
      { id: "zoom-out", label: "−", action: "zoomOut" },
      { id: "rotate-left", label: "↺", action: "rotateLeft" },
      { id: "rotate-right", label: "↻", action: "rotateRight" }
    ];

    buttons.forEach(({ id, label, action }) => {
      const btn = document.createElement("button");
      btn.id = id;
      btn.className = "camera-btn";
      btn.textContent = label;
      btn.style.cssText = `
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.6rem;
        border: 1px solid rgba(108, 243, 197, 0.4);
        background: linear-gradient(135deg, rgba(7, 12, 18, 0.95), rgba(5, 8, 12, 0.98));
        color: #6cf3c5;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      `;
      btn.dataset.action = action;
      controlsContainer.appendChild(btn);
    });

    this.root.appendChild(controlsContainer);
    this.cameraControls = controlsContainer;
  }

  setSelectedTower(towerTypeId) {
    this.selectedTowerId = towerTypeId;
    
    // Aggiorna lo stato visivo di tutti i bottoni
    this.buttons.forEach((btn, id) => {
      btn.classList.toggle("selected", id === towerTypeId);
    });
  }

  update() {
    this.towerTypes.forEach((type) => {
      const btn = this.buttons.get(type.id);
      if (!btn) return;
      const affordable = this.isAffordable(type.id);
      btn.classList.toggle("disabled", !affordable);
    });
  }
}

