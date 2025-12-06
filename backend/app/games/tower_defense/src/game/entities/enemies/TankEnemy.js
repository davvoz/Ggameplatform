import * as THREE from "three";
import { BaseEnemy } from "./BaseEnemy.js";

/**
 * Tank Enemy - Heavy armored type
 * High HP, slow, with defensive shields
 */
export class TankEnemy extends BaseEnemy {
  constructor(pathPoints, waveConfig) {
    super(pathPoints, waveConfig);
    
    // Tank-specific stat modifications
    this.speed *= 0.7;
    this.maxHp = Math.round(this.maxHp * 2.8);
    this.hp = this.maxHp;
    this.reward = Math.round(this.reward * 2.2);

    // Tank: corazza resistente a proiettili, debole a laser continuo
    this.resistances = {
      laser: 0.8,   // Debole a laser (penetra le corazze)
      plasma: 1.5,  // Resistente a plasma (corazza spessa)
      magic: 1.0    // Standard
    };
    this.type = "tank";

    // Animation adjustments
    this.hoverBase = 0.12;
    this.hoverAmplitude = 0.03;
    this.hoverFrequency = 2.2;
  }

  _getHealthBarHeight() {
    return 1.3;
  }

  _buildGeometry(group) {
    // Hull - ridotto del 30%
    const hullGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x2d0a0a,
      metalness: 0.95,
      roughness: 0.3,
      emissive: 0x5a0000,
      emissiveIntensity: 0.3
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.22;
    hull.castShadow = false; // Disabled for performance
    hull.receiveShadow = true;
    group.add(hull);

    // Hull edges
    const hullEdges = new THREE.EdgesGeometry(hullGeo, 15);
    const hullLines = new THREE.LineSegments(hullEdges, new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      linewidth: 2,
      opacity: 0.9,
      transparent: true
    }));
    hullLines.position.y = 0.22;
    group.add(hullLines);

    // Turret - ridotto del 30%
    const turretGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.42, 6);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x3d1010,
      emissive: 0xff4500,
      emissiveIntensity: 1.0,
      metalness: 1.0,
      roughness: 0.2
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.y = 0.6;
    turret.castShadow = false; // Disabled for performance
    turret.userData.turret = true;
    group.add(turret);

    // Turret edges
    const turretEdges = new THREE.EdgesGeometry(turretGeo, 15);
    const turretLines = new THREE.LineSegments(turretEdges, new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      linewidth: 2,
      opacity: 0.9,
      transparent: true
    }));
    turretLines.position.y = 0.6;
    group.add(turretLines);
  }

  _addHull(group) {
    const hullGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x2d0a0a,
      metalness: 0.95,
      roughness: 0.3,
      emissive: 0x5a0000,
      emissiveIntensity: 0.3
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.3;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    this._addEdgeLines(hullGeo, new THREE.Vector3(0, 0.3, 0), group);
  }

  _addTurret(group) {
    const turretGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.6, 8);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x3d1010,
      emissive: 0xff4500,
      emissiveIntensity: 1.0,
      metalness: 1.0,
      roughness: 0.2
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.y = 0.85;
    turret.castShadow = true;
    turret.userData.turret = true;
    group.add(turret);

    this._addEdgeLines(turretGeo, new THREE.Vector3(0, 0.85, 0), group);
  }

  _addEnergyShields(group) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const shieldGeo = new THREE.BoxGeometry(0.15, 0.6, 0.05);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.0,
        metalness: 0.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.x = Math.cos(angle) * 0.65;
      shield.position.z = Math.sin(angle) * 0.65;
      shield.position.y = 0.55;
      shield.rotation.y = angle;
      shield.userData.shield = true;
      shield.userData.angle = angle;
      group.add(shield);
    }
  }

  _addAntenna(group) {
    const antGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.5, 8);
    const antMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.5,
      metalness: 1.0,
      roughness: 0.1
    });
    const antenna = new THREE.Mesh(antGeo, antMat);
    antenna.position.y = 1.4;
    antenna.userData.antenna = true;
    group.add(antenna);

    const tipGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const tip = new THREE.Mesh(tipGeo, antMat);
    tip.position.y = 1.65;
    tip.userData.antennaTip = true;
    group.add(tip);
  }

  _updateAnimation(time, pathIndex) {
    // Slower, heavier movement
    const sway = Math.sin(time * 1.5 + pathIndex) * 0.1;
    this.mesh.rotation.z = sway * 0.1;
    this.mesh.rotation.y = Math.sin(time * 1.0 + pathIndex) * 0.2;

    // Animate shields
    this.mesh.children.forEach((child) => {
      if (child.userData.shield) {
        const offset = child.userData.angle;
        const pulse = Math.sin(time * 2 + offset) * 0.1 + 1;
        child.material.emissiveIntensity = 2.0 * pulse;
      }
      if (child.userData.turret) {
        child.rotation.y += 0.01;
      }
      if (child.userData.antennaTip) {
        const pulse = Math.sin(time * 4) * 0.5 + 1;
        child.material.emissiveIntensity = 2.5 * pulse;
      }
    });
  }
}
