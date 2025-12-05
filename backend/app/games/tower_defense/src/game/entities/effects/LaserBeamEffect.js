import * as THREE from "three";
import { GeometryCache } from "../GeometryCache.js";

/**
 * Laser beam visual effect
 * Renders a beam from tower to target
 */
export class LaserBeamEffect {
  constructor(tower, target) {
    this.tower = tower;
    this.target = target;
    this.group = null;
    this.beam = null;
    this.glowLayers = [];
  }

  create() {
    if (!this.target || !this.target.mesh) return null;

    const start = this.tower.mesh.position
      .clone()
      .add(this.tower.getMuzzleOffset());
    const end = this.target.mesh.position.clone();
    const distance = start.distanceTo(end);

    // Main laser beam - use cached geometry with height=1.0, then scale it
    const beamGeo = GeometryCache.getGeometry("cylinder", {
      radiusTop: 0.04,
      radiusBottom: 0.04,
      height: 1.0,
      radialSegments: 8
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.scale.y = distance; // Scale to actual distance

    // Outer glow layers - use cached geometries with height=1.0, then scale
    this.glowLayers = [];
    for (let i = 0; i < 3; i++) {
      const radius = 0.06 + i * 0.03;
      const glowGeo = GeometryCache.getGeometry("cylinder", {
        radiusTop: radius,
        radiusBottom: radius,
        height: 1.0,
        radialSegments: 8
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3 - i * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.scale.y = distance; // Scale to actual distance
      this.glowLayers.push(glow);
    }

    this.group = new THREE.Group();
    this.group.add(this.beam);
    this.glowLayers.forEach((layer) => this.group.add(layer));

    // Position and orient beam
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    this.group.position.copy(midPoint);
    this.group.lookAt(end);
    this.group.rotateX(Math.PI / 2);

    return this.group;
  }

  update(deltaTime) {
    if (!this.group || !this.target || this.target.isDisposed) {
      return false;
    }

    const start = this.tower.mesh.position
      .clone()
      .add(this.tower.getMuzzleOffset());
    const end = this.target.mesh.position.clone();
    const distance = start.distanceTo(end);

    // Update position and orientation
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    this.group.position.copy(midPoint);
    this.group.lookAt(end);
    this.group.rotateX(Math.PI / 2);

    // Update beam length using scale instead of recreating geometry
    if (this.beam) {
      this.beam.scale.y = distance;
    }

    this.glowLayers.forEach((layer) => {
      layer.scale.y = distance;
    });

    // Pulse effect
    const t = performance.now() * 0.001;
    const pulse = Math.sin(t * 15) * 0.3 + 0.7;
    if (this.beam) {
      this.beam.material.opacity = 0.9 * pulse;
    }
    this.glowLayers.forEach((layer, i) => {
      layer.material.opacity = (0.3 - i * 0.08) * pulse;
    });

    return true;
  }

  dispose() {
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
    // Don't dispose geometries - they're CACHED and shared!
    // Only dispose materials
    if (this.beam && this.beam.material) {
      this.beam.material.dispose();
    }
    this.glowLayers.forEach(layer => {
      if (layer.material) layer.material.dispose();
    });
    this.group = null;
    this.beam = null;
    this.glowLayers = [];
  }
}
