import * as THREE from "three";
import { BaseEnemy } from "./BaseEnemy.js";

/**
 * Swarm Enemy - Fast, fragile type
 * Insect-like design with wings and rapid movement
 */
export class SwarmEnemy extends BaseEnemy {
  constructor(pathPoints, waveConfig) {
    super(pathPoints, waveConfig);
    
    // Swarm-specific stat modifications
    this.speed *= 1.6;
    this.maxHp = Math.max(6, Math.round(this.maxHp * 0.65));
    this.hp = this.maxHp;
    this.reward = Math.max(6, Math.round(this.reward * 0.75));

    // Swarm: resistente a laser (rapido), debole a magic (AOE)
    this.resistances = {
      laser: 1.4,   // Resistente a laser (velocità rende difficile colpire)
      plasma: 1.0,  // Standard
      magic: 0.7    // Debole a magic/AOE (piccoli e raggruppati)
    };
    this.type = "swarm";

    // Animation adjustments
    this.hoverBase = 0.25;
    this.hoverAmplitude = 0.08;
    this.hoverFrequency = 5.0;
  }

  _getHealthBarHeight() {
    return 0.9;
  }

  _buildGeometry(group) {
    // Body
    const bodyGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x00ffff,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = false; // Disabled for performance
    group.add(body);

    // Body edges
    const bodyEdges = new THREE.EdgesGeometry(bodyGeo, 25);
    const bodyLines = new THREE.LineSegments(bodyEdges, new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      linewidth: 2,
      opacity: 0.7,
      transparent: true
    }));
    bodyLines.position.y = 0.35;
    group.add(bodyLines);

    // Head (smaller, no edges for performance)
    const headGeo = new THREE.SphereGeometry(0.1, 6, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x003366,
      emissive: 0x0099ff,
      emissiveIntensity: 1.8,
      metalness: 0.8,
      roughness: 0.3
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.42;
    head.position.z = 0.22;
    group.add(head);
  }

  _addBody(group) {
    const bodyGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x00ffff,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);
  }

  _addHead(group) {
    const headGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x003366,
      emissive: 0x0099ff,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.3
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.45;
    head.position.z = 0.22;
    group.add(head);

    // Eyes
    for (let i = 0; i < 2; i++) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00ffff,
        emissiveIntensity: 4.0
      });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.x = (i === 0 ? -0.06 : 0.06);
      eye.position.y = 0.48;
      eye.position.z = 0.3;
      eye.userData.eye = true;
      group.add(eye);
    }
  }

  _addWings(group) {
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const offset = i % 2 === 0 ? -0.1 : 0.1;

      const wingGeo = new THREE.ConeGeometry(0.08, 0.35, 3);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.2,
        metalness: 0.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8
      });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.x = side * 0.25;
      wing.position.y = 0.35;
      wing.position.z = offset;
      wing.rotation.z = side * Math.PI / 2;
      wing.rotation.x = Math.PI / 4;
      wing.userData.wing = true;
      wing.userData.wingIndex = i;
      group.add(wing);
    }
  }

  _addEnergyRing(group) {
    const ringGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.5,
      metalness: 1.0,
      roughness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    ring.userData.rotatingRing = true;
    group.add(ring);
  }

  _updateAnimation(time, pathIndex) {
    // Fast, erratic movement
    const sway = Math.sin(time * 5 + pathIndex) * 0.3;
    this.mesh.rotation.z = sway * 0.3;
    this.mesh.rotation.y = Math.sin(time * 4 + pathIndex) * 0.5;

    // Animate wings
    this.mesh.children.forEach((child) => {
      if (child.userData.wing) {
        const offset = child.userData.wingIndex * 0.5;
        const flap = Math.sin(time * 10 + offset) * 0.3;
        child.rotation.x = Math.PI / 4 + flap;
      }
      if (child.userData.rotatingRing) {
        child.rotation.z += 0.05;
      }
      if (child.userData.eye) {
        const blink = Math.sin(time * 5) * 0.5 + 1;
        child.material.emissiveIntensity = 4.0 * blink;
      }
    });
  }
}
