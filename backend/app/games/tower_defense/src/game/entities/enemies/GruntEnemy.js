import * as THREE from "three";
import { BaseEnemy } from "./BaseEnemy.js";

/**
 * Grunt Enemy - Basic enemy type
 * OPTIMIZED: Single simple mesh for performance
 */
export class GruntEnemy extends BaseEnemy {
  constructor(pathPoints, waveConfig) {
    super(pathPoints, waveConfig);
    this.resistances = {
      laser: 1.0,
      plasma: 1.0,
      magic: 1.0
    };
    this.type = "grunt";
  }

  _buildGeometry(group) {
    // Body - octahedron
    const bodyGeo = new THREE.OctahedronGeometry(0.28, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0,
      metalness: 0.6,
      roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = false; // Disabled for performance
    body.receiveShadow = true;
    group.add(body);

    // Edge lines for cell-shaded look
    const edges = new THREE.EdgesGeometry(bodyGeo, 15);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      linewidth: 2,
      opacity: 0.8,
      transparent: true
    });
    const lines = new THREE.LineSegments(edges, lineMat);
    lines.position.y = 0.4;
    group.add(lines);

    // Glowing core (smaller, no edges)
    const coreGeo = new THREE.SphereGeometry(0.12, 8, 8);
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
