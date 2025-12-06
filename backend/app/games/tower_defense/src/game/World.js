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

  /**
   * Generate multi-lane path system
   * Creates 2 parallel lanes for enemies to avoid crowding
   * Follows Single Responsibility Principle
   */
  _generateMultiLanePath(half, tileSize) {
    const laneCount = 3;
    const laneOffsets = [-1, 0, 1]; // Three lanes at positions -1, 0, +1
    
    // Generate lanes
    for (let lane = 0; lane < laneCount; lane++) {
      const offset = laneOffsets[lane];
      const lanePoints = [];
      
      // HORIZONTAL RECTANGLE: 3 rows x all columns (left to right)
      // Parte da sinistra, va verso destra
      for (let i = -half; i <= half - 3; i += 1) {
        lanePoints.push(new THREE.Vector3(
          i * tileSize,
          0,
          (-half + 1 + offset) * tileSize
        ));
      }
      
      // VERTICAL RECTANGLE: all rows x 3 columns (bottom to top)
      // Parte dal basso, va verso l'alto
      for (let j = -half; j <= half; j += 1) {
        lanePoints.push(new THREE.Vector3(
          (half - 1 + offset) * tileSize,
          0,
          j * tileSize
        ));
      }
      
      this.pathLanes.push(lanePoints);
    }
    
    // Set default path to middle lane for backward compatibility
    this.pathPoints = this.pathLanes[0];
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
    groundMesh.receiveShadow = false; // Disabled for performance
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
    this.pathLanes = []; // Array of lane paths for multi-lane system
    this._generateMultiLanePath(half, tileSize);

    // Create path positions set for quick lookup
    const pathPositions = new Set();
    this.pathLanes.forEach((lanePoints) => {
      lanePoints.forEach((p) => {
        const key = `${Math.round(p.x * 100)},${Math.round(p.z * 100)}`;
        pathPositions.add(key);
      });
    });

    // Material for enemy lane tiles (rusty worn effect, delicate)
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a3a,
      emissive: 0x1a2828,
      emissiveIntensity: 0.3,
      roughness: 0.85,
      metalness: 0.15
    });

    // Single merged geometry for all path tiles
    const pathTileGeometries = [];
    const pathEdgeGeometries = [];

    // Create simple rusty path tiles
    this.pathLanes.forEach((lanePoints) => {
      lanePoints.forEach((p) => {
        // Base tile with rusty look
        const pathTileClone = new THREE.BoxGeometry(tileSize * 0.98, 0.08, tileSize * 0.98);
        pathTileClone.translate(p.x, -0.07, p.z);
        pathTileGeometries.push(pathTileClone);

        // Subtle edge for definition
        const edgeClone = new THREE.PlaneGeometry(tileSize, tileSize);
        edgeClone.rotateX(-Math.PI / 2);
        edgeClone.translate(p.x, 0.002, p.z);
        pathEdgeGeometries.push(edgeClone);
      });
    });

    // Merge path tiles
    const mergedPathGeo = BufferGeometryUtils.mergeGeometries(pathTileGeometries);
    const pathMesh = new THREE.Mesh(mergedPathGeo, pathMat);
    pathMesh.receiveShadow = false;
    pathMesh.castShadow = false;
    this.groundGroup.add(pathMesh);

    // Subtle rusty edge lines
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x5a4a3a,
      transparent: true,
      opacity: 0.2
    });
    const mergedPathEdgeGeo = BufferGeometryUtils.mergeGeometries(pathEdgeGeometries);
    const pathEdgeMesh = new THREE.Mesh(mergedPathEdgeGeo, edgeMat);
    this.groundGroup.add(pathEdgeMesh);

    // Dispose temporary geometries
    pathTileGeometries.forEach(g => g.dispose());
    pathEdgeGeometries.forEach(g => g.dispose());

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
    ring.position.y = 0.15;
    ring.castShadow = false; // Disabled - decorative only
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
    crystal.castShadow = false; // Disabled - decorative only
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

    // Reset spawner with first lane (backward compatibility)
    this.enemySpawner.reset(this.pathLanes.length > 0 ? this.pathLanes[0] : this.pathPoints);
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
    
    // Check if position is on any enemy lane
    return this._isPositionOnLanes(position);
  }

  /**
   * Check if a position is on any enemy lane
   * Follows Single Responsibility Principle - dedicated lane validation
   * @param {THREE.Vector3} position - Position to check
   * @returns {boolean} True if position is on any lane
   */
  _isPositionOnLanes(position) {
    const pathTolerance = 0.5; // Half tile size
    
    // Check all lanes for overlap
    for (const lanePoints of this.pathLanes) {
      const isOnThisLane = lanePoints.some(pathPoint => {
        const dx = Math.abs(pathPoint.x - position.x);
        const dz = Math.abs(pathPoint.z - position.z);
        return dx < pathTolerance && dz < pathTolerance;
      });
      
      if (isOnThisLane) return true;
    }
    
    return false;
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
    // Select random lane for this enemy
    const laneIndex = Math.floor(Math.random() * this.pathLanes.length);
    const lanePoints = this.pathLanes[laneIndex];
    
    // Apply progressive difficulty scaling based on current wave
    const waveScaling = this._calculateWaveScaling();
    const currentWaveNumber = (this.levelManager.currentWaveIndex || 0) + 1;
    
    console.log(`[SPAWN] Wave ${currentWaveNumber}: HP x${waveScaling.hpMultiplier.toFixed(2)}, Speed x${waveScaling.speedMultiplier.toFixed(2)}, Reward x${waveScaling.rewardMultiplier.toFixed(2)}`);
    
    const scaledConfig = {
      ...waveConfig,
      lane: laneIndex,
      baseHp: Math.round(waveConfig.baseHp * waveScaling.hpMultiplier),
      speed: waveConfig.speed * waveScaling.speedMultiplier,
      reward: Math.round(waveConfig.reward * waveScaling.rewardMultiplier)
    };
    
    console.log(`[SPAWN] ${waveConfig.type}: Base HP ${waveConfig.baseHp} -> Scaled HP ${scaledConfig.baseHp}, Base Speed ${waveConfig.speed.toFixed(2)} -> Scaled Speed ${scaledConfig.speed.toFixed(2)}`);
    
    const enemy = new Enemy(lanePoints, scaledConfig);
    enemy.levelManager = this.levelManager;
    enemy.pathLanes = this.pathLanes; // Give enemy access to all lanes for switching
    enemy.addToScene(this.scene);
    this.enemies.push(enemy);
    this.levelManager.registerEnemySpawn();
  }

  /**
   * Calculate progressive difficulty scaling based on current wave
   * Follows Open/Closed Principle - can extend scaling without modifying
   * @returns {Object} Multipliers for enemy stats
   */
  _calculateWaveScaling() {
    // currentWaveIndex is 0-based, so add 1 for actual wave number
    const currentWave = (this.levelManager.currentWaveIndex || 0) + 1;
    
    // Aggressive progressive scaling: much harder each wave
    const hpMultiplier = 1 + (currentWave - 1) * 0.35; // +35% HP per wave (was 15%)
    const speedMultiplier = Math.min(1 + (currentWave - 1) * 0.12, 2.0); // +12% speed, max 200% (was 5%, max 150%)
    const rewardMultiplier = 1 + (currentWave - 1) * 0.20; // +20% reward per wave (was 10%)
    
    return {
      hpMultiplier,
      speedMultiplier,
      rewardMultiplier
    };
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

    // Update enemies with collision avoidance
    this.enemies.forEach((enemy) => enemy.update(deltaTime, levelManager, this.soundLibrary, this.enemies));
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