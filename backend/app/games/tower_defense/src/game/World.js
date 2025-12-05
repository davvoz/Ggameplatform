import * as THREE from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EnemySpawner } from "./systems/EnemySpawner.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { LaserTower } from "./entities/towers/LaserTower.js";
import { RailTower } from "./entities/towers/RailTower.js";
import { PulseTower } from "./entities/towers/PulseTower.js";
import { Enemy } from "./entities/Enemy.js";
import { FloatingText } from "./entities/FloatingText.js";

export class World {
  constructor(scene, worldConfig, levelManager) {
    this.scene = scene;
    this.worldConfig = worldConfig;
    this.levelManager = levelManager;

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.floatingTexts = [];

    this.enemySpawner = new EnemySpawner(this.enemies, levelManager);
    this.combatSystem = new CombatSystem(
      this.towers,
      this.enemies,
      this.projectiles,
      this.floatingTexts,
      levelManager
    );

    this.pathPoints = [];
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    // Game state
    this.gameOver = false;

    // Audio system (will be set from GameApp)
    this.soundLibrary = null;
    
    // Score callback (will be set from GameApp)
    this.scoreCallback = null;

    this._buildStaticWorld();
    this._bindInteractions();
  }

  /**
   * Set the sound library for audio playback
   */
  setSoundLibrary(soundLibrary) {
    this.soundLibrary = soundLibrary;
    this.combatSystem.setSoundLibrary(soundLibrary);
  }
  
  /**
   * Set the score callback for score updates
   */
  setScoreCallback(callback) {
    this.scoreCallback = callback;
  }

  _buildStaticWorld() {
    this.groundGroup.clear();
    const gridSize = this.worldConfig.gridSize;
    const tileSize = this.worldConfig.tileSize;

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x04080b,
      roughness: 0.6,
      metalness: 0.2
    });

    const neonEdgeMat = new THREE.MeshBasicMaterial({
      color: 0x6cf3c5
    });

    // OPTIMIZED: Merge all tiles into single geometry
    const tileGeometries = [];
    const edgeGeometries = [];
    const tileGeo = new THREE.BoxGeometry(tileSize * 0.98, 0.08, tileSize * 0.98);
    const edgeGeo = new THREE.PlaneGeometry(tileSize, tileSize);

    const half = (gridSize - 1) / 2;
    for (let x = 0; x < gridSize; x += 1) {
      for (let z = 0; z < gridSize; z += 1) {
        // Clone and position tile geometry
        const tileClone = tileGeo.clone();
        tileClone.translate(
          (x - half) * tileSize,
          -0.08,
          (z - half) * tileSize
        );
        tileGeometries.push(tileClone);

        // Clone and position edge geometry
        const edgeClone = edgeGeo.clone();
        edgeClone.rotateX(-Math.PI / 2);
        edgeClone.translate(
          (x - half) * tileSize,
          0.001,
          (z - half) * tileSize
        );
        edgeGeometries.push(edgeClone);
      }
    }

    // Merge all tiles into ONE mesh
    const mergedTileGeo = BufferGeometryUtils.mergeGeometries(tileGeometries);
    const groundMesh = new THREE.Mesh(mergedTileGeo, groundMat);
    // groundMesh.receiveShadow = true; // DISABLED for performance
    this.groundGroup.add(groundMesh);

    // Merge all edges into ONE mesh
    const mergedEdgeGeo = BufferGeometryUtils.mergeGeometries(edgeGeometries);
    const edgeMesh = new THREE.Mesh(mergedEdgeGeo, neonEdgeMat);
    edgeMesh.material.transparent = true;
    edgeMesh.material.opacity = 0.08;
    this.groundGroup.add(edgeMesh);

    // Dispose temporary geometries
    tileGeo.dispose();
    edgeGeo.dispose();
    tileGeometries.forEach(g => g.dispose());
    edgeGeometries.forEach(g => g.dispose());

    this.pathPoints = [];
    const mid = 0;
    for (let i = -half; i <= half; i += 1) {
      this.pathPoints.push(new THREE.Vector3(i * tileSize, 0, -half * tileSize));
    }
    for (let j = -half + 1; j <= half; j += 1) {
      this.pathPoints.push(new THREE.Vector3(half * tileSize, 0, j * tileSize));
    }

    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x0f202b,
      emissive: 0x6cf3c5,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.3
    });

    // OPTIMIZED: Merge all path tiles into single mesh
    const pathGeometries = [];
    const pathGeo = new THREE.BoxGeometry(
      tileSize * 0.9,
      this.worldConfig.pathHeight,
      tileSize * 0.9
    );

    this.pathPoints.forEach((p) => {
      const pathClone = pathGeo.clone();
      pathClone.translate(p.x, -0.02, p.z);
      pathGeometries.push(pathClone);
    });

    // Merge all path tiles into ONE mesh
    const mergedPathGeo = BufferGeometryUtils.mergeGeometries(pathGeometries);
    const pathMesh = new THREE.Mesh(mergedPathGeo, pathMat);
    // pathMesh.receiveShadow = true; // DISABLED for performance
    // pathMesh.castShadow = false;
    this.groundGroup.add(pathMesh);

    // Dispose temporary geometries
    pathGeo.dispose();
    pathGeometries.forEach(g => g.dispose());

    // Removed center accent so no default tower-like object appears in the middle
    // this._spawnCenterAccent();
  }

  _spawnCenterAccent() {
    const group = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.6, 0.9, 0.1, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x05090f,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x1b3e52,
      emissiveIntensity: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.receiveShadow = true;
    base.castShadow = true;
    group.add(base);

    const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6cf3c5,
      emissive: 0x6cf3c5,
      emissiveIntensity: 1.2,
      metalness: 1.0,
      roughness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    ring.castShadow = true;
    group.add(ring);

    const crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x29a3ff,
      emissive: 0x29a3ff,
      emissiveIntensity: 0.7,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 0.5;
    crystal.castShadow = true;
    group.add(crystal);

    group.position.set(0, 0, 0);
    this.scene.add(group);
    this.centerAccent = group;
  }

  _bindInteractions() {
    this.scene.userData.world = this;
  }

  resetForLevel() {
    this.towers.forEach((t) => t.dispose(this.scene));
    this.enemies.forEach((e) => e.dispose(this.scene));
    this.projectiles.forEach((p) => p.dispose(this.scene));
    this.floatingTexts.forEach((f) => f.dispose(this.scene));

    // Clear arrays in-place so systems that hold references keep seeing updates
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.floatingTexts.length = 0;

    this.enemySpawner.reset(this.pathPoints);
    this.combatSystem.reset();
  }

  resetGame() {
    // Reset game over flag first
    this.gameOver = false;
    
    // Use resetForLevel to properly reset everything
    this.resetForLevel();
  }

  isTileOccupied(position) {
    // Check if there's already a tower at this position (with small tolerance)
    const tolerance = 0.1;
    const hasTower = this.towers.some(tower => {
      const dx = Math.abs(tower.mesh.position.x - position.x);
      const dz = Math.abs(tower.mesh.position.z - position.z);
      return dx < tolerance && dz < tolerance;
    });
    
    if (hasTower) return true;
    
    // Check if position is on the enemy path
    const pathTolerance = 0.5; // Half tile size
    const isOnPath = this.pathPoints.some(pathPoint => {
      const dx = Math.abs(pathPoint.x - position.x);
      const dz = Math.abs(pathPoint.z - position.z);
      return dx < pathTolerance && dz < pathTolerance;
    });
    
    return isOnPath;
  }

  placeTowerAt(position, towerConfig) {
    // Check if tile is already occupied
    if (this.isTileOccupied(position)) {
      console.warn("Cannot place tower: tile already occupied at", position);
      return false;
    }
    
    // Select appropriate tower class based on tower type
    let tower;
    switch (towerConfig.id) {
      case "laser":
        tower = new LaserTower(position, towerConfig);
        break;
      case "rail":
        tower = new RailTower(position, towerConfig);
        break;
      case "aoe":
        tower = new PulseTower(position, towerConfig);
        break;
      default:
        console.warn(`Unknown tower type: ${towerConfig.id}, defaulting to LaserTower`);
        tower = new LaserTower(position, towerConfig);
    }
    
    // Pass floatingTexts array to tower (needed for LaserTower damage display)
    tower.floatingTexts = this.floatingTexts;
    
    // Pass sound library to tower
    if (this.soundLibrary) {
      tower.setSoundLibrary(this.soundLibrary);
    }
    
    tower.addToScene(this.scene);
    this.towers.push(tower);
    
    // Play tower placement sound
    if (this.soundLibrary) {
      this.soundLibrary.success();
    }
    
    return true; // Tower placed successfully
  }

  tryUpgradeTower(tower, levelManager) {
    if (!tower || tower.level >= tower.maxLevel) return;

    const cost = tower.getUpgradeCost();
    if (!Number.isFinite(cost)) return;
    if (!levelManager.canAfford(cost)) return;

    levelManager.spendCredits(cost);
    tower.upgrade();
    
    // Mostra floating text per upgrade
    const upgradePos = tower.mesh.position.clone();
    upgradePos.y += 1.5; // Increased from 1.2 to be more visible
    const floatingText = FloatingText.createUpgrade(upgradePos, tower.level);
    floatingText.addToScene(this.scene);
    this.floatingTexts.push(floatingText);
    
    console.log(`Tower upgraded to level ${tower.level} - particles: ${tower.upgradeParticles?.length || 0}`);
  }

  spawnEnemyFromWave(waveConfig) {
    const enemy = new Enemy(this.pathPoints, waveConfig);
    enemy.levelManager = this.levelManager;
    enemy.addToScene(this.scene);
    this.enemies.push(enemy);
    this.levelManager.registerEnemySpawn();
  }

  update(deltaTime, levelManager) {
    // Check for game over
    if (levelManager.health <= 0 && !this.gameOver) {
      this.gameOver = true;
      this._triggerGameOver();
      
      // Remove all enemies when game over
      this.enemies.forEach((enemy) => enemy.dispose(this.scene));
      this.enemies.length = 0;
      
      return; // Stop updating game
    }
    
    const time = performance.now() * 0.001;
    if (this.centerAccent) {
      this.centerAccent.rotation.y = time * 0.2;
      this.centerAccent.position.y = Math.sin(time * 1.4) * 0.08;
    }

    this.enemySpawner.update(deltaTime, this);

    this.enemies.forEach((enemy) => enemy.update(deltaTime, levelManager, this.soundLibrary));
    // Remove disposed enemies in-place so shared references stay valid
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (this.enemies[i].isDisposed) {
        this.enemies.splice(i, 1);
      }
    }

    // Advance to the next wave (and beyond) once the current wave is fully defeated
    levelManager.advanceWaveIfNeeded();

    this.combatSystem.update(deltaTime);

    this.projectiles.forEach((p) => p.update(deltaTime));
    // Remove disposed projectiles in-place so CombatSystem keeps the same array
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (this.projectiles[i].isDisposed) {
        this.projectiles.splice(i, 1);
      }
    }
    
    // Update and cleanup floating texts
    this.floatingTexts.forEach((f) => f.update(deltaTime));
    for (let i = this.floatingTexts.length - 1; i >= 0; i -= 1) {
      if (this.floatingTexts[i].isDisposed) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  _triggerGameOver() {
    console.log("[GAME] GAME OVER - Health depleted!");
    
    // Play game over sound
    if (this.soundLibrary) {
      this.soundLibrary.gameOver();
    }
    
    // Show game over UI (will be handled by GameApp)
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('gameOver', { detail: { victory: false } }));
    }
  }
}