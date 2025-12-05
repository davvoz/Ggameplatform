import { HUDView } from "../ui/components/HUDView.js";
import { BottomBarView } from "../ui/components/BottomBarView.js";
import { AudioControlsView } from "../ui/components/AudioControlsView.js";
import { MainMenuScreen } from "../ui/screens/MainMenuScreen.js";
import { GameScreen } from "../ui/screens/GameScreen.js";

export class UIManager {
  constructor(rootElement, config) {
    this.rootElement = rootElement;
    this.config = config;
    this.activeScreen = null;
    this.soundLibrary = null; // Will be set from GameApp
    this.audioManager = null; // Will be set from GameApp

    this.uiRoot = document.createElement("div");
    this.uiRoot.className = "ui-root";

    this.screenLayer = document.createElement("div");
    this.screenLayer.className = "ui-layer";
    this.hudLayer = document.createElement("div");
    this.hudLayer.className = "ui-layer";

    this.uiRoot.appendChild(this.screenLayer);
    this.uiRoot.appendChild(this.hudLayer);
    this.rootElement.appendChild(this.uiRoot);

    this.hudView = null;
    this.bottomBarView = null;
    this.audioControlsView = null;
  }

  /**
   * Set the sound library for UI sounds
   */
  setSoundLibrary(soundLibrary) {
    this.soundLibrary = soundLibrary;
  }

  /**
   * Set the audio manager for controls
   */
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  showMainMenu(onPlayCallback) {
    this.clearScreens();
    this.activeScreen = new MainMenuScreen(this.screenLayer, {
      onPlay: onPlayCallback,
      soundLibrary: this.soundLibrary
    });
  }

  showGameHud(levelManager, gameplayConfig) {
    this.clearScreens();
    this.hudLayer.innerHTML = "";

    this.hudView = new HUDView(this.hudLayer, levelManager);
    this.bottomBarView = new BottomBarView(this.hudLayer, {
      towerTypes: gameplayConfig.towerTypes,
      onTowerSelected: (towerTypeId) => {
        levelManager.requestTowerPlacement(towerTypeId);
      },
      onTowerDeselected: () => {
        levelManager.clearTowerPlacementRequest();
      },
      isAffordable: (towerTypeId) =>
        levelManager.isTowerAffordable(towerTypeId),
      soundLibrary: this.soundLibrary
    });

    // Add audio controls
    if (this.audioManager) {
      this.audioControlsView = new AudioControlsView(this.hudLayer, this.audioManager);
    }

    this.activeScreen = new GameScreen(this.screenLayer);
  }

  clearScreens() {
    this.screenLayer.innerHTML = "";
    this.activeScreen = null;
    
    // Cleanup audio controls
    if (this.audioControlsView) {
      this.audioControlsView.dispose();
      this.audioControlsView = null;
    }
  }

  update() {
    if (this.hudView) {
      this.hudView.update();
    }
    if (this.bottomBarView) {
      this.bottomBarView.update();
    }
    if (this.audioControlsView) {
      this.audioControlsView.update();
    }
  }

  dispose() {
    this.rootElement.removeChild(this.uiRoot);
  }
}

