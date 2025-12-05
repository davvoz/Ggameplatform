import * as THREE from "three";
import { GeometryCache } from "../GeometryCache.js";

/**
 * Pulse wave visual effect
 * Expanding energy wave from tower
 */
export class PulseWaveEffect {
  constructor(tower) {
    this.tower = tower;
    this.group = null;
    this.ring = null;
    this.glowRing = null;
    this.particles = [];
    this.time = 0;
    this.maxTime = 0.6;
    this.startRadius = 0.1;
    this.maxRadius = tower.range;
  }

  create() {
    this.group = new THREE.Group();

    // Main expanding ring - use cached geometry
    const ringGeo = GeometryCache.getGeometry("torus", {
      radius: this.startRadius,
      tube: 0.08,
      radialSegments: 8,
      tubularSegments: 16
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.group.add(this.ring);

    // Outer glow ring - use cached geometry
    const glowRingGeo = GeometryCache.getGeometry("torus", {
      radius: this.startRadius,
      tube: 0.12,
      radialSegments: 6,
      tubularSegments: 16
    });
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    this.glowRing.rotation.x = Math.PI / 2;
    this.group.add(this.glowRing);

    // Particles disabled for performance
    // const particleCount = 12;
    // for (let i = 0; i < particleCount; i++) {
    //   const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);
    //   const particleMat = new THREE.MeshBasicMaterial({
    //     color: 0xffffff,
    //     transparent: true,
    //     opacity: 1.0,
    //     blending: THREE.AdditiveBlending,
    //   });
    //   const particle = new THREE.Mesh(particleGeo, particleMat);
    //   this.particles.push(particle);
    //   this.group.add(particle);
    // }

    // Position wave at tower muzzle
    const origin = this.tower.mesh.position
      .clone()
      .add(this.tower.getMuzzleOffset());
    this.group.position.copy(origin);

    return this.group;
  }

  update(deltaTime) {
    if (!this.group) return false;

    this.time += deltaTime;
    const progress = Math.min(this.time / this.maxTime, 1);

    if (progress >= 1) {
      return false; // Effect is done
    }

    // Expand wave
    const currentRadius =
      this.startRadius + (this.maxRadius - this.startRadius) * progress;

    // Update rings with scale instead of rebuilding geometry
    if (this.ring) {
      const scaleFactor = currentRadius / this.startRadius;
      this.ring.scale.set(scaleFactor, scaleFactor, 1);
      this.ring.material.opacity = 1.0 - progress;
    }

    if (this.glowRing) {
      const scaleFactor = currentRadius / this.startRadius;
      this.glowRing.scale.set(scaleFactor, scaleFactor, 1);
      this.glowRing.material.opacity = (1.0 - progress) * 0.5;
    }

    // Particles disabled for performance
    // this.particles.forEach((particle, i) => {
    //   ...particle animation code...
    // });

    // Update position
    const origin = this.tower.mesh.position
      .clone()
      .add(this.tower.getMuzzleOffset());
    this.group.position.copy(origin);

    return true;
  }

  dispose() {
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.group = null;
    this.ring = null;
    this.glowRing = null;
    this.particles = [];
  }
}
