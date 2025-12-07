import * as THREE from "three";
import { Tower } from "../Tower.js";
import { MaterialCache } from "../MaterialCache.js";

/**
 * Rail Tower (Railgun)
 * High damage, electromagnetic projectiles
 */
export class RailTower extends Tower {
  constructor(position, towerConfig) {
    super(position, towerConfig);
    
    // Cache animated objects for performance
    this.animatedObjects = null;
  }

  _buildTowerGeometry(turretGroup) {
    // Simplified railgun base
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.2, 4);
    const baseMat = MaterialCache.getMaterial("standard", {
      color: 0x9932cc,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x9932cc,
      emissiveIntensity: 1.5,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.22;
    // base.castShadow = true; // DISABLED for performance
    turretGroup.add(base);
    
    // Bordi scuri per definizione
    const baseEdges = new THREE.EdgesGeometry(baseGeo);
    const baseLines = new THREE.LineSegments(baseEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    baseLines.position.y = 0.22;
    turretGroup.add(baseLines);

    // Core chamber
    const coreGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 4);
    const coreMat = MaterialCache.getMaterial("standard", {
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 3.0,
      metalness: 1.0,
      roughness: 0.1,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.55;
    // core.castShadow = true; // DISABLED for performance
    core.userData.isPulsating = true;
    turretGroup.add(core);
    
    // Bordi scuri per definizione
    const coreEdges = new THREE.EdgesGeometry(coreGeo);
    const coreLines = new THREE.LineSegments(coreEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    coreLines.position.y = 0.55;
    turretGroup.add(coreLines);

    // Simplified dual rail (single box geometry instead of 2)
    const railsGeo = new THREE.BoxGeometry(0.3, 0.06, 1.1);
    const railsMat = MaterialCache.getMaterial("standard", {
      color: 0xff1493,
      emissive: 0xff1493,
      emissiveIntensity: 2.5,
      metalness: 1.0,
      roughness: 0.08,
    });
    const rails = new THREE.Mesh(railsGeo, railsMat);
    rails.position.set(0, 0.58, 0.1);
    // rails.castShadow = true; // DISABLED for performance
    rails.userData.isRail = true;
    turretGroup.add(rails);
    
    // Bordi scuri per definizione
    const railsEdges = new THREE.EdgesGeometry(railsGeo);
    const railsLines = new THREE.LineSegments(railsEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    railsLines.position.set(0, 0.58, 0.1);
    turretGroup.add(railsLines);

    // Reduced coils (2 instead of 8)
    const coilGeo = new THREE.TorusGeometry(0.14, 0.02, 4, 8);
    const coilMat = MaterialCache.getMaterial("standard", {
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.5,
      metalness: 1.0,
      roughness: 0.1,
    });

    const coil1 = new THREE.Mesh(coilGeo, coilMat);
    coil1.rotation.y = Math.PI / 2;
    coil1.position.set(0, 0.58, -0.1);
    coil1.userData.isCoil = true;
    turretGroup.add(coil1);

    const coil2 = new THREE.Mesh(coilGeo, coilMat);
    coil2.rotation.y = Math.PI / 2;
    coil2.position.set(0, 0.58, 0.3);
    coil2.userData.isCoil = true;
    turretGroup.add(coil2);

    // Barrel + muzzle combined
    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 4);
    const barrelMat = MaterialCache.getMaterial("standard", {
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 4.0,
      metalness: 1.0,
      roughness: 0.05,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.58, 0.85);
    // barrel.castShadow = true; // DISABLED for performance
    barrel.userData.isBarrel = true;
    turretGroup.add(barrel);
    
    // Bordi scuri per definizione
    const barrelEdges = new THREE.EdgesGeometry(barrelGeo);
    const barrelLines = new THREE.LineSegments(barrelEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    barrelLines.rotation.x = Math.PI / 2;
    barrelLines.position.set(0, 0.58, 0.85);
    turretGroup.add(barrelLines);

    // Glowing muzzle
    const muzzleGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const muzzleMat = MaterialCache.getMaterial("standard", {
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 6.0,
      transparent: true,
      opacity: 0.8,
    });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0.58, 1.05);
    muzzle.userData.isMuzzle = true;
    turretGroup.add(muzzle);

    // Cache animated objects after geometry is built
    setTimeout(() => {
      if (this.mesh) {
        const turret = this.mesh.children.find(c => c.userData.isTurret);
        if (turret) {
          this.animatedObjects = {
            skillRing: turret.children.find(c => c.userData.isSkillRing),
            muzzle: turret.children.find(c => c.userData.isMuzzle),
            barrel: turret.children.find(c => c.userData.isBarrel)
          };
        }
      }
    }, 0);
  }

  getMuzzleOffset() {
    // Calculate muzzle position considering turret rotation
    const localMuzzlePos = new THREE.Vector3(0, 0.58, 1.0);
    const rotatedPos = localMuzzlePos.clone();
    rotatedPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.turretRotation);
    return rotatedPos;
  }

  _updateTurretAnimations(turretGroup, time, deltaTime) {
    if (!this.animatedObjects) return;

    // Rotate skill ring (from base class)
    if (this.animatedObjects.skillRing) {
      this.animatedObjects.skillRing.rotation.z = time * this.ringRotationSpeed;
    }

    // Barrel recoil on fire
    if (this.firePulseTimer > 0 && this.animatedObjects.barrel) {
      const recoil = (this.firePulseTimer / 0.18) * -0.15;
      this.animatedObjects.barrel.position.z = 0.85 + recoil;
    }

    // Muzzle flash on fire
    if (this.firePulseTimer > 0 && this.animatedObjects.muzzle) {
      const flashIntensity = 6.0 + (this.firePulseTimer / 0.18) * 6;
      this.animatedObjects.muzzle.material.emissiveIntensity = flashIntensity;
    }
  }

  _applyMajorUpgrade() {
    const turretGroup = this.mesh.children.find((c) => c.userData.isTurret);
    if (!turretGroup) return;

    if (this.level === 6) {
      // LEVEL 6: Piercing Shot - i proiettili attraversano i nemici
      this.hasPiercing = true;
      this.maxPiercingTargets = 3;
      this.piercingDamageDecay = 0.7; // 70% damage per target successivo
      
    } else if (this.level === 7) {
      // LEVEL 7: EMP Blast - colpo rallenta i nemici
      this.hasEMPBlast = true;
      this.empSlowPercent = 0.5; // Rallenta del 50%
      this.empSlowDuration = 2.0; // 2 secondi
    }
  }
}
