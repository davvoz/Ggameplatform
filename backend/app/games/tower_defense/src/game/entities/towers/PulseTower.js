import * as THREE from "three";
import { Tower } from "../Tower.js";
import { PulseWaveEffect } from "../effects/PulseWaveEffect.js";
import { MaterialCache } from "../MaterialCache.js";

/**
 * Pulse Tower (AOE)
 * Area of effect damage with expanding energy waves
 */
export class PulseTower extends Tower {
  constructor(position, towerConfig) {
    super(position, towerConfig);
    this.pulseWave = null;
    
    // Cache animated objects for performance
    this.animatedObjects = null;
  }

  _buildTowerGeometry(turretGroup) {
    // Simplified resonator base
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.45, 0.2, 4);
    const baseMat = MaterialCache.getMaterial("standard", {
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1.8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    // base.castShadow = true; // DISABLED for performance
    turretGroup.add(base);
    
    // Bordi scuri per definizione
    const baseEdges = new THREE.EdgesGeometry(baseGeo);
    const baseLines = new THREE.LineSegments(baseEdges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
    baseLines.position.y = 0.25;
    turretGroup.add(baseLines);

    // Pulsating core
    const coreGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const coreMat = MaterialCache.getMaterial("physical", {
      color: 0x7fff00,
      emissive: 0x7fff00,
      emissiveIntensity: 7.0,
      metalness: 0,
      roughness: 0,
      transmission: 0.7,
      transparent: true,
      opacity: 0.95,
      ior: 2.2,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.65;
    core.userData.isPulseCore = true;
    turretGroup.add(core);

    // Single expanding ring (reduced from 2)
    const ringGeo = new THREE.TorusGeometry(0.24, 0.025, 4, 8);
    const ringMat = MaterialCache.getMaterial("standard", {
      color: 0x00ff7f,
      emissive: 0x00ff7f,
      emissiveIntensity: 5.0,
      metalness: 1.0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.65;
    ring.userData.isPulseRing = true;
    ring.userData.baseScale = 1.0;
    turretGroup.add(ring);

    // 2 orbiting nodes (reduced from 4)
    for (let i = 0; i < 2; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const nodeMat = MaterialCache.getMaterial("standard", {
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 8.0,
        transparent: true,
        opacity: 0.9,
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.userData.isOrbitNode = true;
      node.userData.nodeIndex = i;
      node.userData.orbitRadius = 0.28;
      node.userData.orbitSpeed = 2.5;
      node.userData.orbitPhase = i * Math.PI;
      node.position.y = 0.65;
      turretGroup.add(node);
    }

    // Top projector (simplified)
    const projectorGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const projectorMat = MaterialCache.getMaterial("physical", {
      color: 0x7fff00,
      emissive: 0x7fff00,
      emissiveIntensity: 6.0,
      metalness: 0,
      roughness: 0,
      transmission: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    const projector = new THREE.Mesh(projectorGeo, projectorMat);
    projector.position.y = 0.90;
    projector.userData.isProjector = true;
    turretGroup.add(projector);

    // Cache animated objects after geometry is built
    setTimeout(() => {
      if (this.mesh) {
        const turret = this.mesh.children.find(c => c.userData.isTurret);
        if (turret) {
          this.animatedObjects = {
            ring: turret.children.find(c => c.userData.isPulseRing),
            nodes: turret.children.filter(c => c.userData.isOrbitNode),
            core: turret.children.find(c => c.userData.isPulseCore),
            projector: turret.children.find(c => c.userData.isProjector)
          };
        }
      }
    }, 0);
  }

  getMuzzleOffset() {
    return new THREE.Vector3(0, 0.95, 0);
  }

  _onFire() {
    // Create expanding pulse wave effect
    if (!this.group) return;
    
    if (this.pulseWave) {
      this.pulseWave.dispose();
    }
    this.pulseWave = PulseWaveEffect.create(
      this.group.position,
      this.config.range
    );
    if (this.group.parent) {
      this.group.parent.add(this.pulseWave);
    }
  }

  _updateTurretAnimations(turretGroup, time, deltaTime) {
    // Update pulse wave effect
    if (this.pulseWave && this.group && this.group.parent) {
      const stillActive = PulseWaveEffect.update(this.pulseWave, deltaTime);
      if (!stillActive) {
        PulseWaveEffect.dispose(this.pulseWave);
        this.group.parent.remove(this.pulseWave);
        this.pulseWave = null;
      }
    }

    if (!this.animatedObjects) return;

    // Core pulsation
    if (this.animatedObjects.core) {
      const coreScale = Math.sin(time * 4 + this.animationOffset) * 0.15 + 1.0;
      this.animatedObjects.core.scale.setScalar(coreScale);
    }

    // Single ring expansion
    if (this.animatedObjects.ring) {
      const expandFactor = Math.sin(time * 3) * 0.3 + 1.0;
      this.animatedObjects.ring.scale.set(expandFactor, expandFactor, 1.0);
      this.animatedObjects.ring.rotation.z = time * 0.5;
    }

    // Orbiting nodes (2 instead of 4)
    this.animatedObjects.nodes.forEach(obj => {
      const angle = time * obj.userData.orbitSpeed + obj.userData.orbitPhase;
      obj.position.x = Math.cos(angle) * obj.userData.orbitRadius;
      obj.position.z = Math.sin(angle) * obj.userData.orbitRadius;
    });

    // Projector rotation
    if (this.animatedObjects.projector) {
      this.animatedObjects.projector.rotation.y = time * 1.5;
    }
  }

  dispose() {
    if (this.pulseWave && this.group && this.group.parent) {
      PulseWaveEffect.dispose(this.pulseWave);
      this.group.parent.remove(this.pulseWave);
      this.pulseWave = null;
    }
    super.dispose();
  }

  _applyMajorUpgrade() {
    const turretGroup = this.mesh.children.find((c) => c.userData.isTurret);
    if (!turretGroup) return;

    if (this.level === 6) {
      // LEVEL 6: Double Pulse - spara 2 onde simultanee
      // Visual: Aggiungi secondo anello rotante
      const ring2Geo = new THREE.TorusGeometry(0.32, 0.03, 6, 12);
      const ring2Mat = MaterialCache.getMaterial("standard", {
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 5.5,
        metalness: 1.0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.75,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = 0.75;
      ring2.userData.isSecondPulseRing = true;
      turretGroup.add(ring2);
      
      // Abilità: double pulse (2x frequenza)
      this.hasDoublePulse = true;
      this.doublePulseMultiplier = 1.8; // Fire rate aumentato
      
    } else if (this.level === 7) {
      // LEVEL 7: Nova Burst - danno massivo in area ridotta
      // Visual: Aggiungi sfera energetica centrale pulsante
      const novaGeo = new THREE.IcosahedronGeometry(0.25, 1);
      const novaMat = MaterialCache.getMaterial("physical", {
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 10.0,
        metalness: 0,
        roughness: 0,
        transmission: 0.5,
        transparent: true,
        opacity: 0.85,
        ior: 2.5,
      });
      const nova = new THREE.Mesh(novaGeo, novaMat);
      nova.position.y = 0.65;
      nova.userData.isNovaSphere = true;
      turretGroup.add(nova);
      
      // Abilità: nova burst (3x damage in area concentrata)
      this.hasNovaBurst = true;
      this.novaBurstDamageMultiplier = 3.0;
      this.novaBurstRangeMultiplier = 0.6; // Range ridotto del 40%
    }
  }
}
