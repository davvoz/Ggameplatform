import * as THREE from "three";
import { BaseEntity } from "../BaseEntity.js";
import { LaneSwitchingStrategy } from "../../ai/LaneSwitchingStrategy.js";

/**
 * Abstract base class for all enemy types
 * Follows Single Responsibility Principle - handles common enemy behavior
 */
export class BaseEnemy extends BaseEntity {
  constructor(pathPoints, waveConfig) {
    super();
    this.pathPoints = pathPoints;
    this.waveConfig = waveConfig;

    // Base stats (to be modified by subclasses)
    this.speed = waveConfig.speed || 1;
    this.maxHp = waveConfig.baseHp || 10;
    this.hp = this.maxHp;
    this.reward = waveConfig.reward || 5;
    this.progress = 0;
    this.hasReachedBase = false;
    
    // Targeting policy support
    this.pathIndex = 0; // Current waypoint index
    this.pathProgress = 0; // Progress within current segment (0-1)
    this.spawnTime = performance.now(); // When this enemy was spawned

    // Lane management - now using Strategy Pattern
    this.currentLane = waveConfig.lane || 0;
    this.laneChangeTimer = 0;
    this.pathLanes = null; // Will be set by World
    this.laneTransition = null; // Active transition state
    
    // AI Strategy for lane switching
    this.laneSwitchingAI = new LaneSwitchingStrategy({
      lookAheadDistance: 1.5,
      blockDetectionRange: 0.15,
      speedThreshold: 1.15,
      minLaneClearance: 0.2,
      transitionSpeed: 0.08,
      switchCooldown: 1.0
    });

    // Damage resistances/weaknesses (1.0 = normal, >1.0 = resistant, <1.0 = weak)
    this.resistances = {
      laser: 1.0,
      plasma: 1.0,
      magic: 1.0
    };

    // Visual feedback
    this.hitTimer = 0;

    // Slow/freeze effects
    this.slowEffect = 0;
    this.slowTimer = 0;
    this.freezeAura = null;

    // Animation properties
    this.hoverBase = 0.16;
    this.hoverAmplitude = 0.04;
    this.hoverFrequency = 3;

    // Build the mesh (Template Method Pattern)
    this.mesh = this._createMeshGroup();
    this._createHealthBar();
    this._syncPosition();
  }

  /**
   * Template method for creating the enemy mesh
   * Subclasses must implement _buildGeometry()
   */
  _createMeshGroup() {
    const group = new THREE.Group();
    this._buildGeometry(group);
    this._cacheEmissiveIntensities(group);
    group.userData.enemy = this;
    return group;
  }

  /**
   * Abstract method - must be implemented by subclasses
   * @param {THREE.Group} group - The group to add geometry to
   */
  _buildGeometry(group) {
    throw new Error("_buildGeometry() must be implemented by subclass");
  }

  /**
   * Cache base emissive intensities for animations
   */
  _cacheEmissiveIntensities(group) {
    group.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.emissive !== undefined) {
        if (!obj.material.userData) obj.material.userData = {};
        obj.material.userData.baseEmissiveIntensity =
          obj.material.emissiveIntensity ?? 0;
      }
    });
  }

  /**
   * Create health bar UI
   */
  _createHealthBar() {
    const barContainer = new THREE.Group();
    barContainer.position.y = this._getHealthBarHeight();

    const bgGeo = new THREE.PlaneGeometry(0.5, 0.08);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const bgBar = new THREE.Mesh(bgGeo, bgMat);
    barContainer.add(bgBar);

    const fgGeo = new THREE.PlaneGeometry(0.5, 0.08);
    const fgMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const fgBar = new THREE.Mesh(fgGeo, fgMat);
    fgBar.position.z = 0.001;
    barContainer.add(fgBar);

    // Removed EdgeGeometry border - was causing massive draw calls!

    this.healthBar = {
      container: barContainer,
      foreground: fgBar,
      maxWidth: 0.5
    };

    this.mesh.add(barContainer);
  }

  /**
   * Get health bar height - can be overridden by subclasses
   */
  _getHealthBarHeight() {
    return 0.6;
  }

  /**
   * Update health bar visual state
   */
  _updateHealthBar() {
    if (!this.healthBar) return;

    const healthPercent = Math.max(0, this.hp / this.maxHp);
    const newWidth = this.healthBar.maxWidth * healthPercent;

    this.healthBar.foreground.scale.x = healthPercent;
    this.healthBar.foreground.position.x = -(this.healthBar.maxWidth - newWidth) / 2;

    // Color gradient: green -> yellow -> red
    if (healthPercent > 0.5) {
      const t = (healthPercent - 0.5) * 2;
      this.healthBar.foreground.material.color.setRGB(1 - t, 1, 0);
    } else {
      const t = healthPercent * 2;
      this.healthBar.foreground.material.color.setRGB(1, t, 0);
    }
  }

  /**
   * Synchronize mesh position with path progress
   */
  _syncPosition() {
    if (!this.pathPoints.length) return;

    const totalSegments = this.pathPoints.length - 1;
    const clampedProg = Math.max(0, Math.min(1, this.progress));
    const fIndex = clampedProg * totalSegments;
    const index = Math.floor(fIndex);
    const localT = fIndex - index;
    
    // Update targeting policy fields
    this.pathIndex = index;
    this.pathProgress = localT;

    const p0 = this.pathPoints[index];
    const p1 = this.pathPoints[Math.min(index + 1, this.pathPoints.length - 1)];

    const pos = new THREE.Vector3().lerpVectors(p0, p1, localT);
    const t = performance.now() * 0.001;

    // Hovering animation
    pos.y = this.hoverBase + Math.sin(t * this.hoverFrequency + index) * this.hoverAmplitude;

    if (this.mesh) {
      this.mesh.position.copy(pos);
      this._updateAnimation(t, index);
    }
  }

  /**
   * Easing function for smooth lane transitions
   */
  _easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Update animation - can be overridden by subclasses
   */
  _updateAnimation(time, pathIndex) {
    const sway = Math.sin(time * 2 + pathIndex) * 0.2;
    this.mesh.rotation.z = sway * 0.2;
    this.mesh.rotation.y = Math.sin(time * 1.5 + pathIndex) * 0.3;
  }

  /**
   * Take damage from towers
   */
  takeDamage(amount, levelManager, soundLibrary = null, damageType = "laser") {
    // Apply resistance modifier
    const resistance = this.resistances[damageType] || 1.0;
    const finalDamage = amount / resistance;

    this.hp -= finalDamage;
    this._updateHealthBar();
    this.hitTimer = 0.25;

    // Play damage sound
    if (soundLibrary) {
      soundLibrary.enemyDamage(this.type);
    }

    if (this.hp <= 0 && !this.isDisposed) {
      // Play destroy sound
      if (soundLibrary) {
        soundLibrary.enemyDestroy(this.type);
      }

      this.dispose(this.mesh?.parent || null);
      levelManager.registerEnemyDefeat(this.reward);
    }
  }

  /**
   * Apply slow effect
   */
  applySlow(slowAmount, duration = 2) {
    this.slowEffect = Math.max(this.slowEffect, slowAmount);
    this.slowTimer = Math.max(this.slowTimer, duration);

    console.log(`[SLOW] Enemy slowed by ${(slowAmount * 100).toFixed(0)}% for ${duration}s (current: ${(this.slowEffect * 100).toFixed(0)}%)`);

    if (!this.freezeAura && this.slowEffect > 0) {
      this._createFreezeAura();
    }
  }

  /**
   * Create visual freeze aura effect
   */
  _createFreezeAura() {
    if (this.freezeAura) return;

    const particleCount = 16;
    const auraGroup = new THREE.Group();

    // Main ice ring - più grande e più alta
    const ringGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x4dd0e1,
      emissive: 0x4dd0e1,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.8,
      metalness: 0.3,
      roughness: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    auraGroup.add(ring);

    // Secondary ring for better visibility
    const ring2Geo = new THREE.TorusGeometry(0.45, 0.04, 6, 16);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      emissive: 0x80deea,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.6,
      metalness: 0.5,
      roughness: 0.5
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.25;
    ring2.userData.secondaryRing = true;
    auraGroup.add(ring2);

    // Ice particles orbiting around
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.5;

      const particleGeo = new THREE.OctahedronGeometry(0.08, 0);
      const particleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x4dd0e1,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.9
      });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      particle.position.set(
        Math.cos(angle) * radius,
        0.3 + Math.random() * 0.3,
        Math.sin(angle) * radius
      );
      particle.userData.angle = angle;
      particle.userData.radius = radius;
      particle.userData.speed = 0.8 + Math.random() * 0.6;
      particle.userData.verticalOffset = Math.random() * Math.PI * 2;
      auraGroup.add(particle);
    }

    // Vertical ice columns for extra visibility
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const columnGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
      const columnMat = new THREE.MeshStandardMaterial({
        color: 0xb3e5fc,
        emissive: 0x4dd0e1,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.5
      });
      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.set(
        Math.cos(angle) * 0.6,
        0.4,
        Math.sin(angle) * 0.6
      );
      column.userData.iceColumn = true;
      column.userData.angle = angle;
      auraGroup.add(column);
    }

    this.freezeAura = auraGroup;
    this.mesh.add(auraGroup);
  }

  /**
   * Add edge lines for better visual definition
   */
  _addEdgeLines(geometry, position, parent, rotation = null) {
    const edges = new THREE.EdgesGeometry(geometry);
    const lines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.7, transparent: true })
    );
    lines.position.copy(position);
    if (rotation) {
      lines.rotation.copy(rotation);
    }
    parent.add(lines);
    return lines;
  }

  /**
   * Update freeze aura animation
   */
  _updateFreezeAura(deltaTime) {
    if (!this.freezeAura) return;

    const time = performance.now() * 0.001;

    // Rotate main ring
    const ring = this.freezeAura.children[0];
    if (ring) {
      ring.rotation.z = time * 1.2;
    }

    // Rotate secondary ring in opposite direction
    this.freezeAura.children.forEach(child => {
      if (child.userData.secondaryRing) {
        child.rotation.z = -time * 0.8;
      }
    });

    // Animate ice particles with vertical bobbing
    this.freezeAura.children.forEach(child => {
      if (child.userData.angle !== undefined && !child.userData.iceColumn) {
        const angle = child.userData.angle + time * child.userData.speed;
        child.position.x = Math.cos(angle) * child.userData.radius;
        child.position.z = Math.sin(angle) * child.userData.radius;

        // Vertical bobbing
        if (child.userData.verticalOffset !== undefined) {
          const verticalBob = Math.sin(time * 2 + child.userData.verticalOffset) * 0.15;
          child.position.y = 0.3 + verticalBob;
        }

        child.rotation.y = time * 2;
        child.rotation.x = time * 1.5;
      }

      // Pulse ice columns
      if (child.userData.iceColumn) {
        const pulse = Math.sin(time * 3 + child.userData.angle) * 0.5 + 1;
        child.material.emissiveIntensity = 2.0 * pulse;
      }
    });

    // Fade out as slow effect wears off
    const fadeRatio = Math.min(1, this.slowTimer / 0.5);
    this.freezeAura.traverse(obj => {
      if (obj.material) {
        obj.material.opacity = fadeRatio * (obj.material.userData?.baseOpacity || 0.6);
      }
    });

    // Store base opacity on first update
    if (!this.freezeAura.userData.initialized) {
      this.freezeAura.traverse(obj => {
        if (obj.material) {
          obj.material.userData.baseOpacity = obj.material.opacity;
        }
      });
      this.freezeAura.userData.initialized = true;
    }
  }

  /**
   * Remove freeze aura effect
   */
  _removeFreezeAura() {
    if (this.freezeAura) {
      this.mesh.remove(this.freezeAura);
      this.freezeAura.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.freezeAura = null;
    }
  }

  /**
   * Handle intelligent lane switching to avoid slower enemies
   * SMART VERSION: Multiple fallback strategies if blocked
   */
  _handleLaneSwitching(allEnemies, deltaTime) {
    // Can't switch lanes if on cooldown or no other enemies
    if (this.laneChangeTimer > 0 || allEnemies.length <= 1) return;
    if (!this.pathLanes || this.pathLanes.length < 2) return;

    const myPosition = this.mesh.position;
    const lookAheadDistance = 1.2; // Reduced for more responsive switching
    const progressThreshold = 0.12; // Wider tolerance

    // Check if there's a slower enemy blocking this lane ahead
    let isBlocked = false;
    let blockingEnemy = null;

    for (const other of allEnemies) {
      if (other === this || other.isDisposed) continue;
      if (other.currentLane !== this.currentLane) continue;

      // Check if enemy is ahead on the same path
      const progressDiff = other.progress - this.progress;
      if (progressDiff > 0 && progressDiff < progressThreshold) {
        const distance = myPosition.distanceTo(other.mesh.position);
        if (distance < lookAheadDistance) {
          // Enemy ahead is blocking (slower or similar speed)
          if (other.speed <= this.speed * 1.2) {
            isBlocked = true;
            blockingEnemy = other;
            break;
          }
        }
      }
    }

    // If blocked, intelligently find alternative route
    if (isBlocked) {
      const availableLanes = this._getAvailableLanes();
      
      // Strategy 1: Try safest lane first (least traffic)
      const safestLane = this._findSafestLane(allEnemies, availableLanes);
      if (safestLane !== null && safestLane !== this.currentLane) {
        if (this._canSafelySwitchToLane(safestLane, allEnemies)) {
          this._switchToLane(safestLane);
          this.laneChangeTimer = this.laneChangeDelay;
          return;
        }
      }
      
      // Strategy 2: If safest lane blocked, try ANY other lane
      for (const lane of availableLanes) {
        if (lane === this.currentLane) continue;
        if (this._canSafelySwitchToLane(lane, allEnemies)) {
          this._switchToLane(lane);
          this.laneChangeTimer = this.laneChangeDelay * 1.5; // Longer cooldown for backup
          return;
        }
      }
      
      // Strategy 3: All lanes blocked - slow down and wait (physics handles this)
    }
  }

  /**
   * Calculate physics-based slowdown to prevent enemy overlap
   * Implements physical collision prevention via distance-based deceleration
   * @param {Array} allEnemies - All enemies in the world
   * @returns {number} Slowdown multiplier (0.0 to 1.0)
   */
  _calculatePhysicsSlowdown(allEnemies) {
    if (!this.mesh || allEnemies.length <= 1) return 1.0;

    const myPosition = this.mesh.position;
    const minSafeDistance = 0.4; // Minimum safe distance between enemies
    const slowdownDistance = 0.8; // Distance at which slowdown begins

    let maxSlowdown = 1.0; // No slowdown by default

    for (const other of allEnemies) {
      if (other === this || other.isDisposed || !other.mesh) continue;

      // Only check enemies in the same lane
      if (other.currentLane !== this.currentLane) continue;

      // Only care about enemies ahead of us
      const progressDiff = other.progress - this.progress;
      if (progressDiff <= 0) continue;

      const distance = myPosition.distanceTo(other.mesh.position);

      // Physics-based slowdown curve
      if (distance < slowdownDistance) {
        if (distance < minSafeDistance) {
          // Critical zone - almost stopped
          maxSlowdown = Math.min(maxSlowdown, 0.1);
        } else {
          // Gradual slowdown based on distance
          const slowdownFactor = (distance - minSafeDistance) / (slowdownDistance - minSafeDistance);
          maxSlowdown = Math.min(maxSlowdown, slowdownFactor);
        }
      }
    }

    return maxSlowdown;
  }

  /**
   * Handle intelligent lane switching to avoid slower enemies
   */
  _handleLaneSwitching_OLD(allEnemies, deltaTime) {
    // Can't switch lanes if on cooldown or no other enemies
    if (this.laneChangeTimer > 0 || allEnemies.length <= 1) return;

    const myPosition = this.mesh.position;
    const lookAheadDistance = 2.0; // How far to look for blocking enemies
    const progressThreshold = 0.05; // How much progress difference to check

    // Check if there's a slower enemy blocking this lane ahead
    let isBlocked = false;
    for (const other of allEnemies) {
      if (other === this || other.isDisposed) continue;
      if (other.currentLane !== this.currentLane) continue;

      // Check if enemy is ahead on the same path
      const progressDiff = other.progress - this.progress;
      if (progressDiff > 0 && progressDiff < progressThreshold) {
        const distance = myPosition.distanceTo(other.mesh.position);
        if (distance < lookAheadDistance) {
          // Enemy ahead is slower, we're blocked
          if (other.speed < this.speed) {
            isBlocked = true;
            break;
          }
        }
      }
    }

    // If blocked, try to switch to a better lane
    if (isBlocked) {
      const availableLanes = this._getAvailableLanes();
      if (availableLanes.length > 1) {
        const bestLane = this._findBestLane(allEnemies, availableLanes);
        if (bestLane !== this.currentLane) {
          this._switchToLane(bestLane);
          this.laneChangeTimer = this.laneChangeDelay;
        }
      }
    }
  }

  /**
   * Check if it's safe to switch to a new lane (no nearby enemies)
   */
  _canSafelySwitchToLane(newLaneIndex, allEnemies) {
    if (!this.pathLanes || !this.pathLanes[newLaneIndex]) return false;

    const safeDistance = 1.2; // Minimum distance from enemies in new lane
    const progressTolerance = 0.15; // Check enemies within this progress range

    for (const other of allEnemies) {
      if (other === this || other.isDisposed) continue;
      if (other.currentLane !== newLaneIndex) continue;

      // Check if enemy is close in progress
      const progressDiff = Math.abs(other.progress - this.progress);
      if (progressDiff < progressTolerance) {
        // Would be too close after switch
        return false;
      }
    }

    return true;
  }

  /**
   * Get all available lane indices from world
   */
  _getAvailableLanes() {
    // World has 3 lanes (0, 1, and 2)
    return [0, 1, 2];
  }

  /**
   * Find the safest lane with least traffic ahead
   */
  _findSafestLane(allEnemies, availableLanes) {
    const laneScores = {};
    const lookAheadProgress = 0.1; // Check enemies within this progress range

    // Initialize scores
    availableLanes.forEach(lane => {
      laneScores[lane] = 0;
    });

    // Count enemies in each lane that are ahead
    for (const other of allEnemies) {
      if (other === this || other.isDisposed) continue;

      const progressDiff = other.progress - this.progress;
      if (progressDiff > 0 && progressDiff < lookAheadProgress) {
        if (availableLanes.includes(other.currentLane)) {
          laneScores[other.currentLane] += 1;
        }
      }
    }

    // Find lane with lowest score (least traffic)
    let safestLane = null;
    let lowestScore = Infinity;
    for (const lane of availableLanes) {
      if (lane === this.currentLane) continue; // Don't count current lane
      if (laneScores[lane] < lowestScore) {
        lowestScore = laneScores[lane];
        safestLane = lane;
      }
    }

    return safestLane;
  }

  /**
   * Switch enemy to a different lane
   * SIMPLE: Just change the lane, enemy will naturally move there
   */
  _switchToLane(newLaneIndex) {
    if (this.pathLanes && this.pathLanes[newLaneIndex]) {
      // Simply switch to new lane path - keep current progress
      this.pathPoints = this.pathLanes[newLaneIndex];
      this.currentLane = newLaneIndex;
      
      // Enemy will naturally move to the new lane position at next update
      // No complex progress calculation needed!
    }
  }

  /**
   * Animate smooth transition between lanes
   */
  _animateLaneTransition(targetLane) {
    // Store target for smooth interpolation in _syncPosition
    this.targetLaneOffset = targetLane;
    this.isChangingLane = true;
    this.laneTransitionProgress = 0;
  }

  /**
   * Main update loop
   */
  update(deltaTime, levelManager, soundLibrary = null, allEnemies = []) {
    if (this.isDisposed) return;

    const pathLength = this.pathPoints.length;
    if (pathLength < 2) return;

    // Update slow effect timer
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaTime;
      if (this.slowTimer <= 0) {
        this.slowEffect = 0;
        this._removeFreezeAura();
      } else {
        this._updateFreezeAura(deltaTime);
      }
    }

    // Update lane change cooldown
    if (this.laneChangeTimer > 0) {
      this.laneChangeTimer -= deltaTime;
    }

    // INTELLIGENT LANE SWITCHING using Strategy Pattern
    if (this.laneTransition) {
      // Currently transitioning between lanes
      const transitionComplete = this.laneSwitchingAI.executeLaneSwitch(this, this.laneTransition.toLane, deltaTime);
      if (!transitionComplete) {
        // Still transitioning, skip normal position update
        this._updateAnimation(performance.now() * 0.001, 0);
        return;
      }
    } else {
      // Not transitioning, evaluate if should switch
      const targetLane = this.laneSwitchingAI.evaluateLaneSwitch(this, allEnemies);
      if (targetLane !== null) {
        // Initiate lane switch
        this.laneTransition = {
          fromLane: this.currentLane,
          toLane: targetLane,
          progress: 0,
          startPosition: this.mesh.position.clone()
        };
        return; // Start transition next frame
      }
    }

    // PHYSICS-BASED COLLISION PREVENTION: Slow down if too close to enemy ahead
    const physicsSlowdown = this._calculatePhysicsSlowdown(allEnemies);

    // Apply slow to movement speed (includes physics slowdown)
    const effectiveSpeed = this.speed * (1 - this.slowEffect) * physicsSlowdown;
    const distancePerSecond = effectiveSpeed * 0.35;

    // Debug slow effect
    if (this.slowEffect > 0 && Math.random() < 0.01) {
      console.log(`[MOVEMENT] Speed: ${this.speed.toFixed(2)} | SlowEffect: ${(this.slowEffect * 100).toFixed(0)}% | PhysicsSlowdown: ${physicsSlowdown.toFixed(2)} | Effective: ${effectiveSpeed.toFixed(2)}`);
    }

    const pathWorldLength = (pathLength - 1) * 1;
    this.progress += (distancePerSecond * deltaTime) / pathWorldLength;

    if (this.progress >= 1) {
      // Nemico raggiunge la base - infligge danno e viene rimosso
      if (!this.hasReachedBase) {
        this.hasReachedBase = true;
        levelManager.damagePlayer(1);

        // Registra come defeated per far avanzare la wave
        levelManager.registerEnemyDefeat(0); // 0 reward perché non è stato distrutto

        // Play sound when enemy reaches base
        if (soundLibrary) {
          soundLibrary.enemyReachBase();
        }
      }
      this.dispose(this.mesh?.parent || null);
      return;
    }

    // Make health bar face camera
    if (this.healthBar && this.healthBar.container) {
      const scene = this.mesh.parent;
      if (scene && scene.userData && scene.userData.camera) {
        this.healthBar.container.lookAt(scene.userData.camera.position);
      }
    }

    // Update hit feedback / idle glow
    if (this.hitTimer > 0) {
      this.hitTimer = Math.max(0, this.hitTimer - deltaTime);
    }

    if (this.mesh) {
      this.mesh.traverse((obj) => {
        if (
          obj.isMesh &&
          obj.material &&
          obj.material.emissive !== undefined &&
          obj.material.userData &&
          obj.material.userData.baseEmissiveIntensity !== undefined
        ) {
          const base = obj.material.userData.baseEmissiveIntensity;
          const hitBoost = this.hitTimer > 0
            ? Math.pow(this.hitTimer / 0.25, 0.5) * 1.5
            : 0;

          const t = performance.now() * 0.001;
          const idlePulse = 0.25 + 0.15 * Math.sin(t * 3);

          obj.material.emissiveIntensity = base * (1 + idlePulse + hitBoost);
        }
      });
    }

    this._syncPosition();
  }

  /**
   * Clean up resources
   */
  dispose(scene) {
    this._removeFreezeAura();
    super.dispose(scene);
  }
}
