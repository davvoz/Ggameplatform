import * as THREE from "three";
import { BaseEntity } from "./BaseEntity.js";
import { GeometryCache } from "./GeometryCache.js";

/**
 * Base abstract Tower class
 * Extended by specific tower types (Laser, Rail, Pulse)
 */
export class Tower extends BaseEntity {
  constructor(position, towerConfig) {
    super();
    this.config = towerConfig;
    this.position = position.clone();
    this.cooldown = 0;

    // Upgrade state
    this.level = 1;
    this.maxLevel = 7;
    this.levelUpTimer = 0;
    
    // Skill tree - player chooses at level 6
    this.skillBranch = null; // 'offense', 'control', 'utility'
    this.waitingForSkillChoice = false;
    this.skillPoints = 0;
    this.unlockedSkills = new Set(); // Track unlocked skill IDs
    
    // Skill effects
    this.slowEffect = 0; // Slow effect amount (0-1)
    this.critChance = 0; // Critical hit chance (0-1)
    this.multiTargetCount = 1; // Number of targets to hit
    
    // Skill tree definition (3 tiers per branch)
    this.skillTree = {
      offense: [
        { id: 'off_damage1', name: 'Power Shot', desc: '+15% Damage', cost: 1, icon: '⚔️', requires: null },
        { id: 'off_damage2', name: 'Heavy Strike', desc: '+25% Damage', cost: 1, icon: '💥', requires: 'off_damage1' },
        { id: 'off_crit', name: 'Critical Hit', desc: '15% chance 2× damage', cost: 2, icon: '✨', requires: 'off_damage2' },
      ],
      control: [
        { id: 'ctrl_slow1', name: 'Frost Touch', desc: 'Slow enemies 20%', cost: 1, icon: '❄️', requires: null },
        { id: 'ctrl_slow2', name: 'Deep Freeze', desc: 'Slow enemies 35%', cost: 1, icon: '🧊', requires: 'ctrl_slow1' },
        { id: 'ctrl_aoe', name: 'Chain Effect', desc: '+30% AOE range', cost: 2, icon: '🌀', requires: 'ctrl_slow2' },
      ],
      utility: [
        { id: 'util_speed1', name: 'Quick Fire', desc: '+20% Fire rate', cost: 1, icon: '⚡', requires: null },
        { id: 'util_speed2', name: 'Rapid Fire', desc: '+35% Fire rate', cost: 1, icon: '⚡⚡', requires: 'util_speed1' },
        { id: 'util_multi', name: 'Multi-Target', desc: 'Hit 2 enemies', cost: 2, icon: '🎯', requires: 'util_speed2' },
      ]
    };

    // Firing feedback
    this.firePulseTimer = 0;

    // Targeting system
    this.currentTarget = null;
    this.turretRotation = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 4.0;

    // Live stats (can be upgraded)
    this.damage = towerConfig.damage;
    this.fireRate = towerConfig.fireRate;
    this.range = towerConfig.range;
    this.projectileColor = towerConfig.projectileColor;

    // Projectile type
    this.projectileType = this._getProjectileType(towerConfig.id);

    // Visual elements
    this.pointLight = null;
    this.upgradeParticles = [];
    this.rangeIndicator = null;
    this.costLabel = null;
    this.skillChoicePanel = null;

    // Skill tree - player chooses at level 6
    this.skillBranch = null; // 'offense', 'control', 'utility'
    this.waitingForSkillChoice = false;

    // Animation offsets for variety
    this.animationOffset = Math.random() * Math.PI * 2;
    this.rotationSpeedVariation = 0.8 + Math.random() * 0.4;
    this.bobSpeedVariation = 1.5 + Math.random() * 1.0;
    this.ringRotationSpeed = 1.0 + Math.random() * 1.0;

    // Performance optimization: throttle updates
    this.updateCounter = 0;
    this.updateInterval = 5; // Update every 5 frames instead of every frame
    this.isIdle = true; // Track if tower is actively doing something

    // Build the mesh
    this.mesh = this._createMesh();
    this.mesh.position.copy(this.position);
    this._addLighting();
    
    // Sound library (will be set from World)
    this.soundLibrary = null;
  }

  /**
   * Set the sound library for audio playback
   */
  setSoundLibrary(soundLibrary) {
    this.soundLibrary = soundLibrary;
  }

  /**
   * Creates the 3D mesh for this tower
   * Should be overridden by subclasses
   */
  _createMesh() {
    const group = new THREE.Group();

    // Shared base platform
    this._createBasePlatform(group);

    // Turret group (rotates to track enemies)
    const turretGroup = new THREE.Group();
    turretGroup.userData.isTurret = true;
    group.add(turretGroup);

    // Add level indicators
    this._addLevelIndicators(group);

    // Build tower-specific geometry (override in subclasses)
    this._buildTowerGeometry(turretGroup);

    // Cache emissive intensities for animations
    this._cacheEmissiveIntensities(group);

    group.userData.tower = this;
    return group;
  }

  /**
   * Creates the shared base platform
   */
  _createBasePlatform(group) {
    const platformGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.12, 20);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x050a0f,
      metalness: 0.7,
      roughness: 0.35
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
  }

  /**
   * Build tower-specific geometry
   * Must be overridden by subclasses
   */
  _buildTowerGeometry(turretGroup) {
    // Override in subclasses
    console.warn("_buildTowerGeometry should be overridden");
  }

  /**
   * Cache base emissive intensities for animations
   */
  _cacheEmissiveIntensities(group) {
    group.traverse((obj) => {
      if (
        obj.isMesh &&
        obj.material &&
        obj.material.emissive !== undefined
      ) {
        if (!obj.material.userData) obj.material.userData = {};
        obj.material.userData.baseEmissiveIntensity =
          obj.material.emissiveIntensity ?? 0;
      }
    });
  }

  /**
   * Get projectile type for this tower
   */
  _getProjectileType(towerId) {
    const typeMap = {
      laser: "energy",
      rail: "plasma",
      aoe: "magic",
      sniper: "laser",
      rapid: "missile",
    };
    return typeMap[towerId] || "energy";
  }

  /**
   * Add lighting to the tower
   */
  _addLighting() {
    const lightColor = new THREE.Color(this.projectileColor);
    this.pointLight = new THREE.PointLight(lightColor, 0, 4);
    this.pointLight.position.set(0, 0.8, 0);
    this.pointLight.castShadow = false;
    this.mesh.add(this.pointLight);
  }

  /**
   * Add level indicators to the base
   */
  _addLevelIndicators(group) {
    const indicatorGroup = new THREE.Group();
    indicatorGroup.userData.isLevelIndicators = true;

    for (let i = 0; i < this.maxLevel; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.03, 0.08);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        emissive: this.projectileColor,
        emissiveIntensity: 0,
        metalness: 0.8,
        roughness: 0.3,
      });

      const indicator = new THREE.Mesh(geo, mat);
      const angle = (i / this.maxLevel) * Math.PI * 2;
      const radius = 0.48;
      indicator.position.set(
        Math.cos(angle) * radius,
        0.08,
        Math.sin(angle) * radius
      );
      indicator.userData.indicatorIndex = i;
      indicator.userData.baseEmissiveIntensity = 0;
      indicator.userData.activeEmissiveIntensity = 1.2;

      indicatorGroup.add(indicator);
    }

    group.add(indicatorGroup);
  }

  /**
   * Update level indicators
   */
  _updateLevelIndicators() {
    const indicatorGroup = this.mesh.children.find(
      (child) => child.userData.isLevelIndicators
    );

    if (!indicatorGroup) return;

    // Hide indicators when tower is at max level
    if (this.level >= this.maxLevel) {
      indicatorGroup.visible = false;
      return;
    } else {
      indicatorGroup.visible = true;
    }

    indicatorGroup.children.forEach((indicator) => {
      const index = indicator.userData.indicatorIndex;
      const isActive = index < this.level;

      const targetIntensity = isActive
        ? indicator.userData.activeEmissiveIntensity
        : indicator.userData.baseEmissiveIntensity;

      if (indicator.material && indicator.material.emissive) {
        indicator.material.emissiveIntensity = THREE.MathUtils.lerp(
          indicator.material.emissiveIntensity,
          targetIntensity,
          0.1
        );
      }
    });
  }

  /**
   * Update upgrade particles
   */
  _updateUpgradeParticles(deltaTime) {
    if (this.upgradeParticles.length === 0) return;

    for (let i = this.upgradeParticles.length - 1; i >= 0; i--) {
      const particle = this.upgradeParticles[i];
      particle.userData.life += deltaTime;

      if (particle.userData.life >= particle.userData.maxLife) {
        this.mesh.remove(particle);
        // Dispose only material, NOT geometry (cached!)
        if (particle.material) particle.material.dispose();
        this.upgradeParticles.splice(i, 1);
        continue;
      }

      const lifeRatio = particle.userData.life / particle.userData.maxLife;
      
      // Upgrade ring effect
      if (particle.userData.isUpgradeRing) {
        // Expand and fade
        const scale = 1 + lifeRatio * 2;
        particle.scale.set(scale, scale, scale);
        particle.material.opacity = 0.8 * (1 - lifeRatio);
        particle.rotation.z += deltaTime * 3;
      } else {
        // Particle effects
        const vel = particle.userData.velocity;
        vel.y -= 4 * deltaTime; // Gravity
        particle.position.addScaledVector(vel, deltaTime);
        
        // Spiral rotation
        if (particle.userData.angularVelocity) {
          particle.rotation.y += particle.userData.angularVelocity * deltaTime;
        }

        // Fade and shrink
        particle.material.opacity = 1.0 * (1 - lifeRatio);
        const scale = 1 - lifeRatio * 0.7;
        particle.scale.setScalar(scale);
      }
    }
  }

  /**
   * Show/hide range indicator
   */
  showRangeIndicator(show = true) {
    if (show && !this.rangeIndicator) {
      const geometry = new THREE.RingGeometry(
        this.range - 0.05,
        this.range + 0.05,
        64
      );
      const material = new THREE.MeshBasicMaterial({
        color: this.projectileColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      this.rangeIndicator = new THREE.Mesh(geometry, material);
      this.rangeIndicator.rotation.x = -Math.PI / 2;
      this.rangeIndicator.position.y = 0.02;
      this.mesh.add(this.rangeIndicator);
    } else if (!show && this.rangeIndicator) {
      this.mesh.remove(this.rangeIndicator);
      this.rangeIndicator = null;
    }
  }

  /**
   * Get muzzle offset (where projectiles spawn)
   * Can be overridden by subclasses
   */
  getMuzzleOffset() {
    return new THREE.Vector3(0, 0.5, 0);
  }

  /**
   * Check if tower can fire
   */
  canFire() {
    return this.cooldown <= 0;
  }

  /**
   * Reset cooldown after firing
   */
  resetCooldown() {
    this.cooldown = 1.0 / this.fireRate;
    this.firePulseTimer = 0.18;

    if (this.pointLight) {
      this.pointLight.intensity = 1.5 + this.level * 0.3;
    }

    // Play tower firing sound
    this._playFireSound();

    // Hook for subclass-specific fire effects
    this._onFire();
  }

  /**
   * Play firing sound based on tower type
   * @private
   */
  _playFireSound() {
    if (!this.soundLibrary) return;
    
    // Slight pitch variation for variety
    const pitch = 0.95 + Math.random() * 0.1;
    
    switch (this.config.id) {
      case 'laser':
        this.soundLibrary.laserFire(pitch);
        break;
      case 'rail':
        this.soundLibrary.railFire(pitch);
        break;
      case 'aoe':
        this.soundLibrary.pulseFire(pitch);
        break;
      default:
        this.soundLibrary.laserFire(pitch);
    }
  }

  /**
   * Hook called when tower fires
   * Override in subclasses for special effects
   */
  _onFire() {
    // Override in subclasses
  }

  /**
   * Set current target
   */
  setTarget(target) {
    this.currentTarget = target;

    if (target && target.mesh) {
      const targetPos = target.mesh.position.clone();
      const towerPos = this.mesh.position.clone();
      const direction = new THREE.Vector2(
        targetPos.x - towerPos.x,
        targetPos.z - towerPos.z
      );
      this.targetRotation = Math.atan2(direction.x, direction.y);
    }
  }

  /**
   * Update tower state
   */
  update(deltaTime) {
    // Performance: throttle non-critical updates
    this.updateCounter++;
    const shouldFullUpdate = this.updateCounter >= this.updateInterval;
    if (shouldFullUpdate) {
      this.updateCounter = 0;
    }

    // Always update critical timers
    this.cooldown = Math.max(0, this.cooldown - deltaTime);

    if (this.levelUpTimer > 0) {
      this.levelUpTimer = Math.max(0, this.levelUpTimer - deltaTime);
    }

    if (this.firePulseTimer > 0) {
      this.firePulseTimer = Math.max(0, this.firePulseTimer - deltaTime);
      this.isIdle = false;
    } else if (this.currentTarget) {
      this.isIdle = false;
    } else {
      this.isIdle = true;
    }

    this._updateUpgradeParticles(deltaTime);
    
    // Only update visuals when needed
    if (shouldFullUpdate || !this.isIdle) {
      this._updateLevelIndicators();
      this._updateSpecialEffects(deltaTime);
      this._updateMeshAnimations(deltaTime);
    }
    
    // Update point light
    if (this.pointLight) {
      const targetIntensity =
        this.firePulseTimer > 0 ? 1.5 + this.level * 0.3 : 0;
      this.pointLight.intensity = THREE.MathUtils.lerp(
        this.pointLight.intensity,
        targetIntensity,
        deltaTime * 8
      );
    }
  }

  /**
   * Update special effects (laser beam, pulse wave, etc.)
   * Override in subclasses
   */
  _updateSpecialEffects(deltaTime) {
    // Override in subclasses
  }

  /**
   * Update mesh animations
   */
  _updateMeshAnimations(deltaTime) {
    if (!this.mesh) return;
    
    // Skip animations completely when idle to save performance
    if (this.isIdle && this.firePulseTimer <= 0) return;

    const t = performance.now() * 0.001 + this.animationOffset;

    // Disabled for performance: base rotation and idle bob
    // if (this.config.id !== "rail") {
    //   this.mesh.rotation.y = t * 0.6 * this.rotationSpeedVariation;
    // }
    // const idleBob = Math.sin(t * this.bobSpeedVariation) * 0.03;
    // this.mesh.position.y = this.position.y + idleBob;

    // Rotate turret to track target
    const turretGroup = this.mesh.children.find(
      (child) => child.userData.isTurret
    );
    if (turretGroup) {
      let rotDiff = this.targetRotation - this.turretRotation;

      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

      this.turretRotation += rotDiff * Math.min(1, this.rotationSpeed * deltaTime);
      turretGroup.rotation.y = this.turretRotation;

      // Update tower-specific animations
      this._updateTurretAnimations(turretGroup, t, deltaTime);
      
      // Scale effects for upgrade and fire
      this._updateScaleEffects(turretGroup, deltaTime);
    }

    // Update range indicator
    this._updateRangeIndicator(t);
  }

  /**
   * Update turret-specific animations
   * Override in subclasses
   */
  _updateTurretAnimations(turretGroup, time, deltaTime) {
    // Override in subclasses
  }

  /**
   * Update scale effects (upgrade, fire recoil)
   */
  _updateScaleEffects(turretGroup, deltaTime) {
    if (!turretGroup) return;
    
    const baseScale = 1 + (this.level - 1) * 0.05;
    let visualScale = baseScale;
    let emissiveBoost = 0;

    // Upgrade pulse - more dramatic
    if (this.levelUpTimer > 0) {
      const progress = 1 - this.levelUpTimer / 0.4;
      const pulse = Math.sin(progress * Math.PI);
      visualScale = baseScale * (1 + 0.3 * pulse); // Increased from 0.2 to 0.3
      emissiveBoost = 1.2 * pulse; // Increased from 0.8 to 1.2
    }

    // Fire recoil
    if (this.firePulseTimer > 0) {
      const f = this.firePulseTimer / 0.18;
      const recoil = f * 0.15;
      visualScale *= 1 + recoil;
      emissiveBoost += 0.6 * f;
    }

    turretGroup.scale.setScalar(visualScale);

    // Apply emissive boost to materials
    if (emissiveBoost > 0) {
      turretGroup.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.emissive) {
          const baseIntensity = obj.material.userData?.baseEmissiveIntensity || 1;
          obj.material.emissiveIntensity = baseIntensity * (1 + emissiveBoost);
        }
      });
    }

    this.mesh.scale.set(visualScale, visualScale, visualScale);

    // Apply emissive boost
    this.mesh.traverse((obj) => {
      if (
        obj.isMesh &&
        obj.material &&
        obj.material.emissive !== undefined &&
        obj.material.userData &&
        obj.material.userData.baseEmissiveIntensity !== undefined
      ) {
        const base = obj.material.userData.baseEmissiveIntensity;
        obj.material.emissiveIntensity = base * (1 + emissiveBoost);
      }
    });
  }

  /**
   * Update range indicator
   */
  _updateRangeIndicator(time) {
    if (!this.rangeIndicator) return;

    // Disabled geometry rebuild for performance
    // const ringGeometry = this.rangeIndicator.geometry;
    // ringGeometry.dispose();
    // const newGeometry = new THREE.RingGeometry(
    //   this.range - 0.05,
    //   this.range + 0.05,
    //   64
    // );
    // this.rangeIndicator.geometry = newGeometry;

    const pulse = Math.sin(time * 2 + this.animationOffset * 0.5) * 0.1 + 0.3;
    this.rangeIndicator.material.opacity = pulse;
  }

  /**
   * Get upgrade cost
   */
  getUpgradeCost() {
    if (this.level >= this.maxLevel) return Infinity;
    
    const baseCost = this.config.baseCost;
    
    // Major upgrades (6 e 7) sono molto più costosi
    if (this.level === 5) {
      // Upgrade to level 6 - 5x base cost
      return Math.round(baseCost * 5);
    } else if (this.level === 6) {
      // Upgrade to level 7 - 8x base cost
      return Math.round(baseCost * 8);
    }
    
    // Normal upgrades (1-5)
    const factor = 1 + this.level * 0.6;
    return Math.round(baseCost * factor);
  }

  /**
   * Upgrade tower
   */
  upgrade() {
    if (this.level >= this.maxLevel) return;

    this.level += 1;

    const damageGrowth = 0.3;
    const rangeGrowth = 0.12;
    const fireRateGrowth = 0.18;

    this.damage = this.config.damage * (1 + damageGrowth * (this.level - 1));
    this.range = this.config.range * (1 + rangeGrowth * (this.level - 1));
    this.fireRate =
      this.config.fireRate * (1 + fireRateGrowth * (this.level - 1));

    this.levelUpTimer = 0.4;

    if (this.pointLight) {
      this.pointLight.intensity = 3 + this.level * 0.5;
    }

    // Gain skill points on upgrade
    if (this.level >= 2) {
      this.skillPoints += 1;
      console.log(`[TOWER] Gained 1 skill point! Total: ${this.skillPoints}`);
    }

    // Apply major upgrade special effects and abilities
    if (this.level === 6 || this.level === 7) {
      this._applyMajorUpgrade();
    }

    this.levelUpTimer = 0.4;

    if (this.pointLight) {
      this.pointLight.intensity = 3 + this.level * 0.5;
    }

    // Apply major upgrade special effects and abilities
    if (this.level === 6 || this.level === 7) {
      this._applyMajorUpgrade();
    }
  }

  /**
   * Choose skill branch (called at level 5)
   * @param {string} branch - 'offense', 'control', or 'utility'
   */
  chooseSkillBranch(branch) {
    if (this.skillBranch) return false;
    
    const validBranches = ['offense', 'control', 'utility'];
    if (!validBranches.includes(branch)) return false;
    
    this.skillBranch = branch;
    this.waitingForSkillChoice = false;
    
    console.log(`[TOWER] Skill branch chosen: ${branch}`);
    
    return true;
  }

  /**
   * Show 3D skill tree popup
   */
  showSkillTreePopup() {
    // Se già esiste un popup, non fare nulla
    if (this.skillTreePopup) return;
    
    // Create HTML popup overlay
    const overlay = document.createElement('div');
    overlay.className = 'skill-popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'skill-popup';
    
    // Header
    const header = document.createElement('div');
    header.className = 'skill-popup-header';
    header.innerHTML = `
      <h2 class="skill-popup-title">Skill Tree</h2>
      <p class="skill-popup-subtitle">${this.config.label} Tower</p>
      <p class="skill-popup-points">Skill Points: <span id="skill-points">${this.skillPoints}</span></p>
    `;
    popup.appendChild(header);
    
    // Create tree for each branch
    const treeContainer = document.createElement('div');
    treeContainer.className = 'skill-tree-container';
    
    ['offense', 'control', 'utility'].forEach(branch => {
      const branchSection = document.createElement('div');
      branchSection.style.marginBottom = '1.5rem';
      
      const branchTitle = document.createElement('h3');
      branchTitle.style.textAlign = 'center';
      branchTitle.style.color = branch === 'offense' ? '#ff6464' : branch === 'control' ? '#64ff64' : '#64b4ff';
      branchTitle.style.fontSize = '1.1rem';
      branchTitle.style.fontWeight = '700';
      branchTitle.style.marginBottom = '1rem';
      branchTitle.style.textTransform = 'uppercase';
      branchTitle.textContent = branch;
      branchSection.appendChild(branchTitle);
      
      // Group skills by tier (3 skills = 3 tiers)
      this.skillTree[branch].forEach((skill, index) => {
        const tier = document.createElement('div');
        tier.className = `skill-tier tier-${index + 1}`;
        
        const node = this._createSkillNode(skill, branch);
        tier.appendChild(node);
        
        branchSection.appendChild(tier);
      });
      
      treeContainer.appendChild(branchSection);
    });
    
    popup.appendChild(treeContainer);
    
    // Footer buttons
    const footer = document.createElement('div');
    footer.className = 'skill-popup-footer';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'skill-popup-reset';
    resetBtn.textContent = 'Reset Skills';
    resetBtn.addEventListener('click', () => {
      this.unlockedSkills.clear();
      this.skillPoints = 0;
      document.body.removeChild(overlay);
      this.skillTreePopup = null;
      this.showSkillTreePopup(); // Reopen with reset
    });
    footer.appendChild(resetBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'skill-popup-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.skillTreePopup = null;
    });
    footer.appendChild(closeBtn);
    
    popup.appendChild(footer);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Store reference
    this.skillTreePopup = overlay;
  }
  
  _createSkillNode(skill, branch) {
    const node = document.createElement('div');
    node.className = 'skill-node';
    
    const isUnlocked = this.unlockedSkills.has(skill.id);
    const canUnlock = !skill.requires || this.unlockedSkills.has(skill.requires);
    const hasPoints = this.skillPoints >= skill.cost;
    
    if (isUnlocked) {
      node.classList.add('unlocked');
    } else if (!canUnlock || !hasPoints) {
      node.classList.add('locked');
    }
    
    const header = document.createElement('div');
    header.className = 'skill-node-header';
    header.innerHTML = `
      <div class="skill-node-icon">${skill.icon}</div>
      <div class="skill-node-name">${skill.name}</div>
    `;
    node.appendChild(header);
    
    const desc = document.createElement('div');
    desc.className = 'skill-node-desc';
    desc.textContent = skill.desc;
    node.appendChild(desc);
    
    const cost = document.createElement('div');
    cost.className = 'skill-node-cost';
    cost.textContent = `Cost: ${skill.cost} ${skill.cost === 1 ? 'point' : 'points'}`;
    node.appendChild(cost);
    
    if (!canUnlock && skill.requires) {
      const req = document.createElement('div');
      req.className = 'skill-node-requirement';
      const reqSkill = Object.values(this.skillTree).flat().find(s => s.id === skill.requires);
      req.textContent = `Requires: ${reqSkill?.name || skill.requires}`;
      node.appendChild(req);
    }
    
    // Click handler
    if (!isUnlocked && canUnlock && hasPoints) {
      node.addEventListener('click', () => {
        this.unlockSkill(skill.id, skill.cost);
        // Refresh popup
        document.body.removeChild(this.skillTreePopup);
        this.skillTreePopup = null;
        this.showSkillTreePopup();
      });
    }
    
    return node;
  }
  
  unlockSkill(skillId, cost) {
    if (this.unlockedSkills.has(skillId)) return false;
    if (this.skillPoints < cost) return false;
    
    this.unlockedSkills.add(skillId);
    this.skillPoints -= cost;
    
    console.log(`[TOWER] Unlocked skill: ${skillId}`);
    this._applySkillEffects(skillId);
    
    return true;
  }
  
  _applySkillEffects(skillId) {
    // Apply skill effects based on ID
    // These will modify tower stats
    const effects = {
      // Offense
      'off_damage1': () => { this.damage = (this.damage || this.config.damage) * 1.15; },
      'off_damage2': () => { this.damage = (this.damage || this.config.damage) * 1.25; },
      'off_crit': () => { this.critChance = 0.15; this.critMultiplier = 2.0; },
      
      // Control
      'ctrl_slow1': () => { this.slowEffect = 0.20; },
      'ctrl_slow2': () => { this.slowEffect = 0.35; },
      'ctrl_aoe': () => { this.aoeRangeBonus = 1.30; },
      
      // Utility
      'util_speed1': () => { this.fireRate = (this.fireRate || this.config.fireRate) * 1.20; },
      'util_speed2': () => { this.fireRate = (this.fireRate || this.config.fireRate) * 1.35; },
      'util_multi': () => { this.multiTarget = 2; },
    };
    
    if (effects[skillId]) {
      effects[skillId]();
    }
  }

  /**
   * Create a single skill panel
   */
  _createSkillPanel(skill) {
    const group = new THREE.Group();
    
    // Background panel
    const panelGeo = new THREE.PlaneGeometry(1.2, 1.5);
    const panelMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    group.add(panel);
    
    // Border
    const borderGeo = new THREE.PlaneGeometry(1.25, 1.55);
    const borderMat = new THREE.MeshBasicMaterial({
      color: skill.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = -0.01;
    group.add(border);
    
    // Title text
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 256;
    titleCanvas.height = 64;
    const titleCtx = titleCanvas.getContext('2d');
    titleCtx.fillStyle = skill.color.toString(16).padStart(6, '0');
    titleCtx.fillStyle = '#' + titleCtx.fillStyle;
    titleCtx.font = 'bold 32px Arial';
    titleCtx.textAlign = 'center';
    titleCtx.fillText(skill.name, 128, 40);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMat = new THREE.SpriteMaterial({ map: titleTexture });
    const titleSprite = new THREE.Sprite(titleMat);
    titleSprite.scale.set(1.0, 0.25, 1);
    titleSprite.position.y = 0.5;
    titleSprite.position.z = 0.01;
    group.add(titleSprite);
    
    // Description text
    const descCanvas = document.createElement('canvas');
    descCanvas.width = 256;
    descCanvas.height = 128;
    const descCtx = descCanvas.getContext('2d');
    descCtx.fillStyle = '#ffffff';
    descCtx.font = '18px Arial';
    descCtx.textAlign = 'center';
    const lines = skill.desc.split('\\n');
    lines.forEach((line, i) => {
      descCtx.fillText(line, 128, 40 + i * 30);
    });
    
    const descTexture = new THREE.CanvasTexture(descCanvas);
    const descMat = new THREE.SpriteMaterial({ map: descTexture });
    const descSprite = new THREE.Sprite(descMat);
    descSprite.scale.set(1.0, 0.5, 1);
    descSprite.position.y = -0.2;
    descSprite.position.z = 0.01;
    group.add(descSprite);
    
    // Store skill ID for raycasting
    group.userData.skillId = skill.id;
    group.userData.isSkillPanel = true;
    
    return group;
  }

  /**
   * Dispose tower and clean up
   */
  dispose(scene) {
    // Clean up HTML skill tree popup if exists
    if (this.skillTreePopup && this.skillTreePopup.parentNode) {
      this.skillTreePopup.parentNode.removeChild(this.skillTreePopup);
      this.skillTreePopup = null;
    }
    
    this.upgradeParticles.forEach((particle) => {
      if (particle.parent) {
        particle.parent.remove(particle);
      }
    });
    this.upgradeParticles = [];

    this.showRangeIndicator(false);

    // Clean up special effects (override in subclasses)
    this._disposeSpecialEffects();

    super.dispose(scene);
  }

  /**
   * Create 3D skill choice panel
   */
  _createSkillChoicePanel() {
    if (this.skillChoicePanel) return;

    const panel = new THREE.Group();
    panel.position.set(0, 2.5, 0);
    panel.userData.isSkillPanel = true;

    // Definizioni abilità
    const skills = [
      {
        id: 'offense',
        name: 'OFFENSE',
        desc: '+50% DMG\nCritical Hits',
        color: '#ff0000',
        position: new THREE.Vector3(-1.2, 0, 0)
      },
      {
        id: 'control',
        name: 'CONTROL',
        desc: 'Slow 40%\nAOE +50%',
        color: '#00ff00',
        position: new THREE.Vector3(0, 0, 0)
      },
      {
        id: 'utility',
        name: 'UTILITY',
        desc: 'Fire Rate +40%\nMulti-Target',
        color: '#0099ff',
        position: new THREE.Vector3(1.2, 0, 0)
      }
    ];

    skills.forEach(skill => {
      const skillGroup = new THREE.Group();
      skillGroup.position.copy(skill.position);
      skillGroup.userData.skillId = skill.id;
      skillGroup.userData.isClickable = true;

      // Background panel
      const bgGeo = new THREE.PlaneGeometry(0.9, 1.0);
      const bgMat = new THREE.MeshBasicMaterial({
        color: 0x0a0a0a,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      skillGroup.add(bg);

      // Border
      const borderGeo = new THREE.PlaneGeometry(0.95, 1.05);
      const borderMat = new THREE.MeshBasicMaterial({
        color: skill.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const border = new THREE.Mesh(borderGeo, borderMat);
      border.position.z = -0.01;
      skillGroup.add(border);

      // Title sprite
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = 256;
      titleCanvas.height = 64;
      const titleCtx = titleCanvas.getContext('2d');
      titleCtx.fillStyle = skill.color;
      titleCtx.font = 'bold 36px Arial';
      titleCtx.textAlign = 'center';
      titleCtx.fillText(skill.name, 128, 42);

      const titleTexture = new THREE.CanvasTexture(titleCanvas);
      const titleMat = new THREE.SpriteMaterial({ map: titleTexture });
      const titleSprite = new THREE.Sprite(titleMat);
      titleSprite.scale.set(0.8, 0.2, 1);
      titleSprite.position.set(0, 0.35, 0.02);
      skillGroup.add(titleSprite);

      // Description sprite
      const descCanvas = document.createElement('canvas');
      descCanvas.width = 256;
      descCanvas.height = 128;
      const descCtx = descCanvas.getContext('2d');
      descCtx.fillStyle = '#ffffff';
      descCtx.font = '20px Arial';
      descCtx.textAlign = 'center';
      const lines = skill.desc.split('\n');
      lines.forEach((line, i) => {
        descCtx.fillText(line, 128, 40 + i * 30);
      });

      const descTexture = new THREE.CanvasTexture(descCanvas);
      const descMat = new THREE.SpriteMaterial({ map: descTexture });
      const descSprite = new THREE.Sprite(descMat);
      descSprite.scale.set(0.7, 0.35, 1);
      descSprite.position.set(0, -0.1, 0.02);
      skillGroup.add(descSprite);

      panel.add(skillGroup);
    });

    this.mesh.add(panel);
    this.skillChoicePanel = panel;
  }

  /**
   * Choose skill branch
   */
  chooseSkill(skillId) {
    if (!this.waitingForSkillChoice) return false;
    if (!['offense', 'control', 'utility'].includes(skillId)) return false;

    this.skillBranch = skillId;
    this.waitingForSkillChoice = false;

    // Remove panel
    if (this.skillChoicePanel) {
      this.mesh.remove(this.skillChoicePanel);
      this.skillChoicePanel.traverse(obj => {
        if (obj.material) obj.material.dispose();
        if (obj.geometry) obj.geometry.dispose();
      });
      this.skillChoicePanel = null;
    }

    return true;
  }

  /**
   * Apply major upgrade visual and functional changes
   * Override in subclasses for unique abilities
   */
  _applyMajorUpgrade() {
    // Override in subclasses
    // Level 6: Add powerful visual effect
    // Level 7: Ultimate upgrade with unique ability
  }

  /**
   * Dispose special effects
   * Override in subclasses
   */
  _disposeSpecialEffects() {
    // Override in subclasses
  }
}


