import * as THREE from "three";
import { BaseEntity } from "../BaseEntity.js";

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
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
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

    const borderGeo = new THREE.EdgesGeometry(bgGeo);
    const borderMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      opacity: 0.8, 
      transparent: true 
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.z = 0.002;
    barContainer.add(border);

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
   * Main update loop
   */
  update(deltaTime, levelManager, soundLibrary = null) {
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

    // Apply slow to movement speed
    const effectiveSpeed = this.speed * (1 - this.slowEffect);
    const distancePerSecond = effectiveSpeed * 0.35;
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
