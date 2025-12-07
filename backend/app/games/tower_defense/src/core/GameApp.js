import * as THREE from "three";
import { SceneManager } from "./SceneManager.js";
import { UIManager } from "./UIManager.js";
import { InputManager } from "./InputManager.js";
import { NavigationRouter } from "./NavigationRouter.js";
import { LevelManager } from "../game/LevelManager.js";
import { World } from "../game/World.js";
import { AudioManager } from "../audio/core/AudioManager.js";
import { SoundLibrary } from "../audio/SoundLibrary.js";
import { GameOverScreen } from "../ui/screens/GameOverScreen.js";
import { PerformanceProfileFactory } from "./PerformanceProfile.js";
import { TargetingPolicyUI } from "../ui/TargetingPolicyUI.js";

export class GameApp {
  constructor({ rootElement, config }) {
    this.rootElement = rootElement;
    this.config = config;

    // Performance profile - auto-detect ottimale
    this.performanceProfile = PerformanceProfileFactory.createOptimal();
    console.log('[Performance] Profile:', this.performanceProfile);

    this.clock = new THREE.Clock();
    this.sceneManager = new SceneManager(config.rendering, this.performanceProfile);
    this.uiManager = new UIManager(rootElement, config);
    this.inputManager = new InputManager(this.sceneManager.camera, rootElement);
    this.levelManager = new LevelManager(config.levels, config.gameplay);
    this.world = new World(
      this.sceneManager.scene,
      config.world,
      this.levelManager
    );

    // Audio system
    this.audioManager = new AudioManager();
    this.soundLibrary = new SoundLibrary(this.audioManager);
    
    // Game Over screen
    this.gameOverScreen = new GameOverScreen(rootElement, {
      onRestart: () => this._restartGame(),
      onMenu: () => this.navigation.showMainMenu(),
      soundLibrary: this.soundLibrary
    });
    
    // Targeting Policy UI
    this.targetingPolicyUI = new TargetingPolicyUI(this);
    
    // Pass audio system to UI manager
    this.uiManager.setSoundLibrary(this.soundLibrary);
    this.uiManager.setAudioManager(this.audioManager);

    this.navigation = new NavigationRouter({
      uiManager: this.uiManager,
      startGame: () => this.startGame()
    });

    this.animationFrameId = null;
    this.lastTime = performance.now();
    this.lastFrameTime = 0;
    this.frameDelay = 1000 / this.performanceProfile.targetFPS;

    // placement + interaction state
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();

    this.ghostTower = null;
    this.selectedTower = null;

    // Tower action panel
    this._createTowerActionPanel();

    // Performance monitoring
    this.stats = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      updateTime: 0,
      renderTime: 0
    };
    this.statsElement = null;
   // this._createStatsDisplay();
    
    // Platform SDK integration
    this.platformSDK = window.PlatformSDK;
    this.isPaused = false;
    this.gameScore = 0;
    this._initializePlatformSDK();
  }

  _createStatsDisplay() {
    this.statsElement = document.createElement('div');
    this.statsElement.style.cssText = `
      position: fixed;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 8px;
      border-radius: 4px;
      z-index: 10000;
      min-width: 200px;
      line-height: 1.4;
      border: 1px solid #0f0;
      bottom: 100px;
    `;
    this.rootElement.appendChild(this.statsElement);
  }
  
  _initializePlatformSDK() {
    if (!this.platformSDK) {
      console.log('[Tower Defense] Platform SDK not available');
      return;
    }
    
    console.log('[Tower Defense] Initializing Platform SDK...');
    
    this.platformSDK.init().then(() => {
      console.log('[Tower Defense] Platform SDK initialized');
      
      // Listen for pause event from platform
      this.platformSDK.on('pause', () => {
        console.log('[Tower Defense] Pause event received from platform');
        this._pauseGame();
      });
      
      // Listen for resume event from platform
      this.platformSDK.on('resume', () => {
        console.log('[Tower Defense] Resume event received from platform');
        this._resumeGame();
      });
      
      // Listen for exit event from platform
      this.platformSDK.on('exit', () => {
        console.log('[Tower Defense] Exit event received from platform');
        this._exitGame();
      });
      
    }).catch(err => {
      console.error('[Tower Defense] Failed to initialize Platform SDK:', err);
    });
  }
  
  _pauseGame() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.clock.stop();
    if (this.audioManager) {
      this.audioManager.pause();
    }
  }
  
  _resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.clock.start();
    if (this.audioManager) {
      this.audioManager.resume();
    }
  }
  
  _exitGame() {
    this.dispose();
  }
  
  _updateScore(points) {
    this.gameScore += points;
    
    // Send score to platform
    if (this.platformSDK && this.platformSDK.isInitialized) {
      this.platformSDK.sendScore(this.gameScore, {
        wave: this.levelManager.currentWaveIndex + 1,
        credits: this.levelManager.credits,
        health: this.levelManager.health
      });
    }
  }

  _updateStatsDisplay() {
    if (!this.statsElement) return;
    
    const mem = performance.memory;
    const memUsed = (mem.usedJSHeapSize / 1048576).toFixed(1);
    const memLimit = (mem.totalJSHeapSize / 1048576).toFixed(1);
    
    const fpsColor = this.stats.fps >= 50 ? '#0f0' : this.stats.fps >= 30 ? '#ff0' : '#f00';
    
    this.statsElement.innerHTML = `
      <div style="color: ${fpsColor}; font-weight: bold;">FPS: ${this.stats.fps}</div>
      <div>Frame: ${this.stats.frameTime.toFixed(2)}ms</div>
      <div>Update: ${this.stats.updateTime.toFixed(2)}ms</div>
      <div>Render: ${this.stats.renderTime.toFixed(2)}ms</div>
      <div style="border-top: 1px solid #0f0; margin-top: 4px; padding-top: 4px;">
        Draw Calls: ${this.stats.drawCalls}
      </div>
      <div>Triangles: ${(this.stats.triangles / 1000).toFixed(1)}k</div>
      <div>Geometries: ${this.stats.geometries}</div>
      <div>Textures: ${this.stats.textures}</div>
      <div style="border-top: 1px solid #0f0; margin-top: 4px; padding-top: 4px;">
        Memory: ${memUsed}MB / ${memLimit}MB
      </div>
    `;
  }

  async start() {
    // Initialize audio on first user interaction
    await this.audioManager.initialize();
    
    this.sceneManager.attachTo(this.rootElement);
    this._setupPlacementInteraction();
    this._setupPlacementPreview();
    this._setupGameOverListener();
    this.navigation.showMainMenu();
    this.loop();
  }

  startGame() {
    this.levelManager.startLevel("level-1");
    this.uiManager.showGameHud(this.levelManager, this.config.gameplay, this);
    
    // Reset game over flag and level state
    this.world.gameOver = false;
    this.world.resetForLevel();
    
    // Reset score
    this.gameScore = 0;
    
    // Setup camera controls after UI is ready
    this._setupCameraControls();
    
    // Pass sound library to world for combat events
    this.world.setSoundLibrary(this.soundLibrary);
    
    // Pass score callback to level manager
    this.levelManager.setScoreCallback((points) => this._updateScore(points));
  }

  _setupPlacementInteraction() {
    const canvas = this.sceneManager.renderer.domElement;
    if (!canvas) return;

    const handleInteraction = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      this._ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this._ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._ndc, this.sceneManager.camera);

      const pendingTypeId = this.levelManager.pendingTowerType;
      console.log("[INTERACTION] pendingTowerType:", pendingTypeId);

      // If we are placing a tower, prefer placement interaction
      if (pendingTypeId) {
        console.log("[INTERACTION] Tentativo placement torre:", pendingTypeId);
        const towerConfig = this.config.gameplay.towerTypes.find(
          (t) => t.id === pendingTypeId
        );
        if (!towerConfig) {
          console.log("[INTERACTION] towerConfig NON TROVATO per:", pendingTypeId);
          return;
        }
        const affordable = this.levelManager.isTowerAffordable(pendingTypeId);
        console.log("[INTERACTION] isAffordable:", affordable, "credits:", this.levelManager.credits, "cost:", towerConfig.baseCost);
        if (!affordable) {
          console.log("[INTERACTION] NON affordable, ABORT");
          return;
        }

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        const hit = this._raycaster.ray.intersectPlane(plane, point);
        if (!hit) return;

        const { gridSize, tileSize } = this.config.world;
        const half = (gridSize - 1) / 2;

        const snappedX = Math.round(point.x / tileSize) * tileSize;
        const snappedZ = Math.round(point.z / tileSize) * tileSize;

        if (
          snappedX < -half * tileSize ||
          snappedX > half * tileSize ||
          snappedZ < -half * tileSize ||
          snappedZ > half * tileSize
        ) {
          return;
        }

        const position = new THREE.Vector3(snappedX, 0, snappedZ);
        console.log("[PLACEMENT] Piazzo torre a:", snappedX, snappedZ);
        
        const placed = this.world.placeTowerAt(position, towerConfig);
        if (placed !== false) {
          this.levelManager.spendCredits(towerConfig.baseCost);
          this.levelManager.clearTowerPlacementRequest();
          
          // Deseleziona il bottone della torre
          if (this.uiManager.bottomBarView) {
            this.uiManager.bottomBarView.setSelectedTower(null);
          }
          
          console.log("[PLACEMENT] Torre piazzata, pendingTowerType cleared");
        } else {
          console.log("[PLACEMENT] Piazzamento fallito - casella occupata");
        }
        return;
      }

      // No pending placement: select a tower based on grid position
      if (this.world.towers.length > 0) {
        // Use raycasting on ground plane to get grid position
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        const hit = this._raycaster.ray.intersectPlane(plane, point);
        
        if (hit) {
          const { gridSize, tileSize } = this.config.world;
          const half = (gridSize - 1) / 2;

          const snappedX = Math.round(point.x / tileSize) * tileSize;
          const snappedZ = Math.round(point.z / tileSize) * tileSize;

          // Check if click is within grid
          if (
            snappedX >= -half * tileSize &&
            snappedX <= half * tileSize &&
            snappedZ >= -half * tileSize &&
            snappedZ <= half * tileSize
          ) {
            // Find tower at this grid position
            const clickedTower = this.world.towers.find(tower => {
              const towerX = Math.round(tower.position.x / tileSize) * tileSize;
              const towerZ = Math.round(tower.position.z / tileSize) * tileSize;
              return towerX === snappedX && towerZ === snappedZ;
            });

            if (clickedTower) {
              this._selectTower(clickedTower);
            } else {
              this._deselectTower();
            }
          } else {
            this._deselectTower();
          }
        } else {
          this._deselectTower();
        }
      }
    };

    canvas.addEventListener("click", (event) => {
      handleInteraction(event.clientX, event.clientY);
    });

    canvas.addEventListener("touchend", (event) => {
      // Solo con 1 dito (non durante pinch zoom)
      if (event.changedTouches.length === 1 && event.touches.length === 0) {
        const touch = event.changedTouches[0];
        handleInteraction(touch.clientX, touch.clientY);
      }
    });
  }

  _setupPlacementPreview() {
    const canvas = this.sceneManager.renderer.domElement;
    if (!canvas) return;

    const updatePreview = (clientX, clientY) => {
      // Mostra preview solo se c'è una torre in attesa di posizionamento
      if (!this.levelManager.pendingTowerType) {
        if (this.ghostTower) {
          this.ghostTower.visible = false;
        }
        return;
      }
      const pendingTypeId = this.levelManager.pendingTowerType;
      
      // Rimuovi ghost se non c'è tower pending
      if (!pendingTypeId) {
        if (this.ghostTower) {
          this.sceneManager.scene.remove(this.ghostTower);
          this.ghostTower = null;
        }
        return;
      }

      const rect = canvas.getBoundingClientRect();
      this._ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this._ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._ndc, this.sceneManager.camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      const hit = this._raycaster.ray.intersectPlane(plane, point);
      
      if (!hit) return;

      const { gridSize, tileSize } = this.config.world;
      const half = (gridSize - 1) / 2;

      const snappedX = Math.round(point.x / tileSize) * tileSize;
      const snappedZ = Math.round(point.z / tileSize) * tileSize;

      if (
        snappedX < -half * tileSize ||
        snappedX > half * tileSize ||
        snappedZ < -half * tileSize ||
        snappedZ > half * tileSize
      ) {
        if (this.ghostTower) {
          this.ghostTower.visible = false;
        }
        return;
      }

      // Crea o aggiorna ghost tower
      if (!this.ghostTower) {
        const geo = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 20);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x6cf3c5,
          transparent: true,
          opacity: 0.4,
          wireframe: false
        });
        this.ghostTower = new THREE.Mesh(geo, mat);
        this.sceneManager.scene.add(this.ghostTower);
      }

      this.ghostTower.visible = true;
      this.ghostTower.position.set(snappedX, 0.4, snappedZ);
    };

    canvas.addEventListener("mousemove", (event) => {
      updatePreview(event.clientX, event.clientY);
    });

    canvas.addEventListener("touchmove", (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        updatePreview(touch.clientX, touch.clientY);
      }
    });
  }



  _setupCameraControls() {
    const cameraControls = this.rootElement.querySelector(".camera-controls");
    if (!cameraControls) return;

    cameraControls.addEventListener("click", (e) => {
      const btn = e.target.closest(".camera-btn");
      if (!btn) return;
      
      const action = btn.dataset.action;
      if (action && this.inputManager[action]) {
        this.inputManager[action]();
      }
    });

    cameraControls.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const btn = e.target.closest(".camera-btn");
      if (!btn) return;
      
      const action = btn.dataset.action;
      if (action && this.inputManager[action]) {
        this.inputManager[action]();
      }
    });
  }

  _createTowerActionPanel() {
    this.towerActionPanel = document.createElement('div');
    this.towerActionPanel.className = 'tower-action-panel';
    this.towerActionPanel.style.display = 'none';
    
    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'tower-action-btn';
    upgradeBtn.innerHTML = '<span>⬆</span> Upgrade';
    upgradeBtn.addEventListener('click', () => {
      if (this.selectedTower) {
        this.world.tryUpgradeTower(this.selectedTower, this.levelManager);
        this._updateTowerActionPanel(); // Update instead of close
      }
    });
    
    const skillsBtn = document.createElement('button');
    skillsBtn.className = 'tower-action-btn';
    skillsBtn.innerHTML = '<span>🌳</span> Skills';
    skillsBtn.addEventListener('click', () => {
      if (this.selectedTower) {
        this.selectedTower.showSkillTreePopup();
      }
    });
    
    const targetingBtn = document.createElement('button');
    targetingBtn.className = 'tower-action-btn';
    targetingBtn.innerHTML = '<span>🎯</span> Target';
    targetingBtn.addEventListener('click', () => {
      if (this.selectedTower) {
        this.targetingPolicyUI.show(this.selectedTower);
      }
    });
    
    const sellBtn = document.createElement('button');
    sellBtn.className = 'tower-action-btn tower-sell-btn';
    sellBtn.innerHTML = '<span>💰</span> Vendi';
    sellBtn.addEventListener('click', () => {
      if (this.selectedTower) {
        this._sellTower(this.selectedTower);
      }
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tower-action-btn tower-close-btn';
    closeBtn.innerHTML = '<span>✕</span>';
    closeBtn.addEventListener('click', () => {
      this._deselectTower();
    });
    
    this.towerActionPanel.appendChild(upgradeBtn);
    this.towerActionPanel.appendChild(skillsBtn);
    this.towerActionPanel.appendChild(targetingBtn);
    this.towerActionPanel.appendChild(sellBtn);
    this.towerActionPanel.appendChild(closeBtn);
    this.rootElement.appendChild(this.towerActionPanel);
    
    this.upgradeBtn = upgradeBtn;
    this.sellBtn = sellBtn;
  }

  _selectTower(tower) {
    this.selectedTower = tower;
    this.towerActionPanel.style.display = 'flex';
    this._updateTowerActionPanel();
  }

  _updateTowerActionPanel() {
    if (!this.selectedTower) return;
    
    const tower = this.selectedTower;
    const cost = tower.getUpgradeCost();
    const canAfford = this.levelManager.canAfford(cost);
    const isMaxLevel = !Number.isFinite(cost);
    
    if (isMaxLevel) {
      this.upgradeBtn.disabled = true;
      this.upgradeBtn.innerHTML = '<span>✓</span> Max';
    } else {
      this.upgradeBtn.disabled = !canAfford;
      this.upgradeBtn.innerHTML = `<span>⬆</span> ${cost} Ξ`;
    }
    
    const sellValue = this._getTowerSellValue(tower);
    this.sellBtn.innerHTML = `<span>💰</span> ${sellValue} Ξ`;
  }

  _deselectTower() {
    this.selectedTower = null;
    this.towerActionPanel.style.display = 'none';
    this.targetingPolicyUI.hide();
  }

  _getTowerSellValue(tower) {
    // Refund 70% of total invested
    const baseCost = tower.config.baseCost;
    let totalInvested = baseCost;
    for (let i = 1; i < tower.level; i++) {
      const factor = 1 + i * 0.6;
      totalInvested += Math.round(baseCost * factor);
    }
    return Math.round(totalInvested * 0.7);
  }

  _sellTower(tower) {
    const sellValue = this._getTowerSellValue(tower);
    
    // Remove tower from world
    const index = this.world.towers.indexOf(tower);
    if (index !== -1) {
      this.world.towers.splice(index, 1);
      tower.dispose(this.sceneManager.scene);
      this.levelManager.gainCredits(sellValue);
    }
    
    this._deselectTower();
  }

  _setupGameOverListener() {
    window.addEventListener('gameOver', (event) => {
      console.log('[GAME APP] Game Over event received');
      
      // Send final score to platform
      if (this.platformSDK && this.platformSDK.isInitialized) {
        this.platformSDK.gameOver(this.gameScore, {
          wave: this.levelManager.currentWaveIndex + 1,
          credits: this.levelManager.credits,
          finalWave: this.levelManager.currentWaveIndex + 1
        });
      }
      
      // Play game over sound
      if (this.soundLibrary) {
        this.soundLibrary.gameOver();
      }
      
      // Show game over screen after a short delay
      setTimeout(() => {
        this.gameOverScreen.show();
      }, 500);
    });
  }

  _restartGame() {
    this.world.resetGame();
    this.levelManager.startLevel("level-1");
    this.uiManager.showGameHud(this.levelManager, this.config.gameplay);
  }

  loop() {
    this.animationFrameId = requestAnimationFrame(() => this.loop());
    
    // Frame rate limiting per mobile (30 FPS target)
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastFrameTime;
    
    if (elapsed < this.frameDelay) {
      return; // Skip frame per mantenere target FPS
    }
    
    this.lastFrameTime = currentTime - (elapsed % this.frameDelay);
    
    // Skip update if paused
    if (this.isPaused) {
      return;
    }
    
    // Performance monitoring
    const frameStart = performance.now();
    
    const dt = this.clock.getDelta();

    // Measure update time
    const updateStart = performance.now();
    this.inputManager.update(dt);
    this.world.update(dt, this.levelManager);
    this.uiManager.update(dt);
    
    // Update tower action panel if a tower is selected
    if (this.selectedTower) {
      this._updateTowerActionPanel();
    }
    
    const updateEnd = performance.now();
    this.stats.updateTime = updateEnd - updateStart;

    // Measure render time
    const renderStart = performance.now();
    this.sceneManager.render();
    const renderEnd = performance.now();
    this.stats.renderTime = renderEnd - renderStart;

    // Calculate frame stats
    const frameEnd = performance.now();
    this.stats.frameTime = frameEnd - frameStart;
    this.stats.fps = Math.round(1000 / (frameStart - (this._lastFrameTime || frameStart)));
    this._lastFrameTime = frameStart;

    // Get renderer info
    const info = this.sceneManager.renderer.info;
    this.stats.drawCalls = info.render.calls;
    this.stats.triangles = info.render.triangles;
    this.stats.geometries = info.memory.geometries;
    this.stats.textures = info.memory.textures;

    // Update stats display every 10 frames
    if (!this._frameCounter) this._frameCounter = 0;
    this._frameCounter++;
    if (this._frameCounter % 10 === 0) {
      this._updateStatsDisplay();
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    this.inputManager.dispose();
    this.sceneManager.dispose();
    this.uiManager.dispose();
  }
}

