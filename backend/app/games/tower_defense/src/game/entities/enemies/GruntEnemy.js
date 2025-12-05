import * as THREE from "three";
import { BaseEnemy } from "./BaseEnemy.js";

/**
 * Grunt Enemy - Basic enemy type
 * Organic alien form with rotating energy rings
 */
export class GruntEnemy extends BaseEnemy {
  constructor(pathPoints, waveConfig) {
    super(pathPoints, waveConfig);
    // Grunt: resistenze standard (nessun modificatore)
    this.resistances = {
      laser: 1.0,
      plasma: 1.0,
      magic: 1.0
    };
    this.type = "grunt";
  }

  _buildGeometry(group) {
    // Octahedral body with dark edges
    const bodyGeo = new THREE.OctahedronGeometry(0.28, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0,
      metalness: 0.6,
      roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    this._addEdgeLines(bodyGeo, new THREE.Vector3(0, 0.4, 0), group);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2.5,
      metalness: 0,
      roughness: 0,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.4;
    core.userData.pulsingCore = true;
    group.add(core);

    // Orbital rings
    this._addOrbitalRings(group);

    // Energy spikes
    this._addEnergySpikes(group);
  }

  _addOrbitalRings(group) {
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.TorusGeometry(0.35, 0.025, 8, 20);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 1.8,
        metalness: 0.9,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.4;
      ring.rotation.x = i === 0 ? Math.PI / 2 : 0;
      ring.rotation.y = i === 0 ? 0 : Math.PI / 3;
      ring.userData.orbitRing = true;
      ring.userData.ringIndex = i;
      group.add(ring);
    }
  }

  _addEnergySpikes(group) {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.05, 0.25, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 2.0,
        metalness: 1.0,
        roughness: 0.1
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.x = Math.cos(angle) * 0.3;
      spike.position.z = Math.sin(angle) * 0.3;
      spike.position.y = 0.4;
      spike.rotation.z = Math.PI / 2;
      spike.rotation.y = angle;
      group.add(spike);
    }
  }

  _updateAnimation(time, pathIndex) {
    super._updateAnimation(time, pathIndex);

    // Rotate orbital rings
    this.mesh.children.forEach((child) => {
      if (child.userData.orbitRing) {
        child.rotation.z += 0.02 * (child.userData.ringIndex + 1);
      }
      if (child.userData.pulsingCore) {
        const pulse = Math.sin(time * 3) * 0.5 + 1;
        child.material.emissiveIntensity = 2.5 * pulse;
      }
    });
  }
}
