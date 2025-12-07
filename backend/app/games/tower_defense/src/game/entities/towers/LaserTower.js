import * as THREE from "three";
import { Tower } from "../Tower.js";
import { LaserBeamEffect } from "../effects/LaserBeamEffect.js";
import { MaterialCache } from "../MaterialCache.js";
import { FloatingText } from "../FloatingText.js";

/**
 * Laser Tower
 * Fires continuous laser beams at enemies
 */
export class LaserTower extends Tower {
  constructor(position, towerConfig) {
    super(position, towerConfig);
    this.laserBeam = null;
    
    // This tower uses laser beams, not projectiles
    this.usesProjectiles = false;
    
    // Damage accumulator for continuous laser damage
    this.damageAccumulator = 0;
    
    // Cache animated objects for performance
    this.animatedObjects = null;
  }

  _buildTowerGeometry(turretGroup) {
    // Base crystal chamber - SIMPLIFIED
    const chamberGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.5, 4);
    const chamberMat = MaterialCache.getMaterial("standard", {
      color: 0xff1493,
      emissive: 0xff1493,
      emissiveIntensity: 1.8,
      metalness: 0.95,
      roughness: 0.2,
    });
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    chamber.position.y = 0.35;
    // chamber.castShadow = true; // DISABLED for performance
    turretGroup.add(chamber);
    
    // Bordi scuri per definizione
    const chamberEdges = new THREE.EdgesGeometry(chamberGeo);
    const chamberLines = new THREE.LineSegments(chamberEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    chamberLines.position.y = 0.35;
    turretGroup.add(chamberLines);

    // Energy core (glowing crystal)
    const crystalGeo = new THREE.OctahedronGeometry(0.15, 0);
    const crystalMat = MaterialCache.getMaterial("physical", {
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 6.0,
      metalness: 0,
      roughness: 0,
      transmission: 0.8,
      transparent: true,
      opacity: 0.95,
      ior: 2.4,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 0.5;
    crystal.userData.isCrystal = true;
    turretGroup.add(crystal);
    
    // Bordi scuri per definizione
    const crystalEdges = new THREE.EdgesGeometry(crystalGeo);
    const crystalLines = new THREE.LineSegments(crystalEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    crystalLines.position.y = 0.5;
    turretGroup.add(crystalLines);

    // Focusing lens (single mesh instead of housing + lenses)
    const lensGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const lensMat = MaterialCache.getMaterial("physical", {
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.0,
      metalness: 0,
      roughness: 0,
      transmission: 0.6,
      transparent: true,
      opacity: 0.9,
      ior: 1.8,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.y = 0.88;
    lens.userData.isPulsating = true;
    turretGroup.add(lens);

    // Cache animated objects after geometry is built
    setTimeout(() => {
      if (this.mesh) {
        const turret = this.mesh.getObjectByName("turret");
        if (turret) {
          this.animatedObjects = {
            crystal: turret.children.find(c => c.userData.isCrystal),
            lens: turret.children.find(c => c.userData.isPulsating),
            skillRing: turret.children.find(c => c.userData.isSkillRing) // Use base class decoration
          };
        }
      }
    }, 0);
  }

  getMuzzleOffset() {
    return new THREE.Vector3(0, 1.0, 0);
  }

  _onFire() {
    // Create laser beam when firing
    if (this.currentTarget && !this.currentTarget.isDisposed && this.mesh.parent) {
      if (!this.laserBeam) {
        this.laserBeam = new LaserBeamEffect(this, this.currentTarget);
        const beamGroup = this.laserBeam.create();
        if (beamGroup) {
          this.mesh.parent.add(beamGroup);
        }
      }
    }
  }

  _updateSpecialEffects(deltaTime) {
    // Update laser beam and apply continuous damage
    if (this.firePulseTimer > 0 && this.currentTarget && !this.currentTarget.isDisposed) {
      if (!this.laserBeam) {
        this._onFire();
      }
      if (this.laserBeam && !this.laserBeam.update(deltaTime)) {
        this.laserBeam.dispose();
        this.laserBeam = null;
      }
      
      // Apply continuous damage (DPS)
      // damage is per-shot, fireRate is shots/sec, so DPS = damage * fireRate
      const dps = this.damage * this.fireRate;
      this.damageAccumulator += dps * deltaTime;
      
      // Apply damage in integer chunks
      if (this.damageAccumulator >= 1) {
        const damageToApply = Math.floor(this.damageAccumulator);
        this.damageAccumulator -= damageToApply;
        
        // Apply damage to target
        if (this.currentTarget && !this.currentTarget.isDisposed) {
          // Calculate with critical chance (15%)
          const isCritical = Math.random() < 0.15;
          const actualDamage = isCritical ? damageToApply * 1.5 : damageToApply;
          
          // Get damage type from config (laser type = "laser")
          const damageType = this.config?.damageType || "laser";
          
          this.currentTarget.takeDamage(actualDamage, this.currentTarget.levelManager, this.soundLibrary, damageType);
          
          // Apply slow effect from skills
          if (this.slowEffect && this.slowEffect > 0) {
            const duration = 2; // 2 seconds
            this.currentTarget.applySlow(this.slowEffect, duration);
          }
          
          // Create floating text
          if (this.floatingTexts && Array.isArray(this.floatingTexts)) {
            const hitPos = this.currentTarget.mesh.position.clone();
            hitPos.y += 0.8;
            
            const floatingText = FloatingText.createDamage(hitPos, actualDamage, isCritical);
            floatingText.addToScene(this.mesh.parent);
            this.floatingTexts.push(floatingText);
          }
        }
      }
    } else {
      if (this.laserBeam) {
        this.laserBeam.dispose();
        this.laserBeam = null;
      }
      // Reset damage accumulator when not firing
      this.damageAccumulator = 0;
    }
  }

  _updateTurretAnimations(turretGroup, time, deltaTime) {
    if (!this.animatedObjects) return;

    // Rotate skill ring (from base class)
    if (this.animatedObjects.skillRing) {
      this.animatedObjects.skillRing.rotation.z = time * this.ringRotationSpeed;
    }

    // Rotating crystal
    if (this.animatedObjects.crystal) {
      this.animatedObjects.crystal.rotation.y += deltaTime * 2;
      
      if (this.firePulseTimer > 0) {
        this.animatedObjects.crystal.material.emissiveIntensity = 6.0 + (this.firePulseTimer / 0.18) * 4;
      }
    }

    // Pulsating lens on fire
    if (this.firePulseTimer > 0 && this.animatedObjects.lens) {
      this.animatedObjects.lens.material.emissiveIntensity = 3.0 + (this.firePulseTimer / 0.18) * 5;
    }
  }

  _disposeSpecialEffects() {
    if (this.laserBeam) {
      this.laserBeam.dispose();
      this.laserBeam = null;
    }
  }

  _applyMajorUpgrade() {
    const turretGroup = this.mesh.children.find((c) => c.userData.isTurret);
    if (!turretGroup) return;

    if (this.level === 6) {
      // LEVEL 6: Chain Lightning - laser può colpire nemici secondari
      this.hasChainLightning = true;
      this.chainLightningRange = 2.0;
      this.chainLightningDamagePercent = 0.5; // 50% damage
      
    } else if (this.level === 7) {
      // LEVEL 7: Triple Beam - spara 3 laser contemporaneamente
      this.hasTripleBeam = true;
      this.tripleDamageMultiplier = 2.0; // 2x damage totale
    }
  }
}
