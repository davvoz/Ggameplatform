import * as THREE from "three";
import { BaseEntity } from "./BaseEntity.js";
import { FloatingText } from "./FloatingText.js";
import { GeometryCache } from "./GeometryCache.js";

export class Projectile extends BaseEntity {
  constructor(origin, target, damage, color = 0x6cf3c5, floatingTexts = null, type = "energy", tower = null, soundLibrary = null, enemies = null) {
    super();
    this.position = origin.clone();
    this.target = target;
    this.damage = damage;
    this.floatingTexts = floatingTexts;
    this.type = type;
    this.tower = tower; // Reference to tower for skill effects
    this.soundLibrary = soundLibrary; // Audio system
    this.enemies = enemies; // Reference to enemies array for AOE damage

    this.speed = this._getTypeSpeed();
    this.lifeTime = 2.5;
    this.age = 0;

    this.color = color;
    this.velocity = new THREE.Vector3();
    
    // Trail system (disabled)
    this.trailPoints = [];
    this.maxTrailPoints = 5;
    this.trailUpdateCounter = 0;
    
    // Particle system
    this.particles = [];
    this.impactParticles = [];
    
    // Physics
    this.acceleration = 1.5;
    this.currentSpeed = this.speed * 0.3;
    this.rotationAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    this.rotationSpeed = 8 + Math.random() * 4;

    this.mesh = this._createMesh();
    this.mesh.position.copy(this.position);
    
    // Disabled for performance
    // this.trailMesh = this._createTrail();
    // this.glowMesh = this._createGlow();
    this.trailMesh = null;
    this.glowMesh = null;
  }

  _getTypeSpeed() {
    const speeds = {
      energy: 18,
      plasma: 16,
      missile: 12,
      laser: 25,
      magic: 14
    };
    return speeds[this.type] || 15;
  }

  _createMesh() {
    const group = new THREE.Group();
    
    switch(this.type) {
      case "energy":
        return this._createEnergyBolt(group);
      case "plasma":
        return this._createPlasmaBall(group);
      case "missile":
        return this._createMissile(group);
      case "laser":
        return this._createLaserBeam(group);
      case "magic":
        return this._createMagicOrb(group);
      default:
        return this._createEnergyBolt(group);
    }
  }

  _createEnergyBolt(group) {
    // Simplified - single sphere only for performance - CACHED GEOMETRY
    const coreGeo = GeometryCache.getGeometry("sphere", { radius: 0.12, widthSegments: 6, heightSegments: 6 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 5,
      metalness: 0,
      roughness: 0,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = false;
    core.receiveShadow = false;
    group.add(core);

    group.userData.baseEmissiveIntensity = 5;
    return group;
  }

  _createPlasmaBall(group) {
    // Glowing plasma core
    const coreGeo = GeometryCache.getGeometry("icosahedron", { radius: 0.15, detail: 3 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 6,
      metalness: 0.3,
      roughness: 0,
      transparent: true,
      opacity: 1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = false;
    core.receiveShadow = false;
    group.add(core);

    // Electric arcs effect
    const arcCount = 6;
    for(let i = 0; i < arcCount; i++) {
      const arcGeo = GeometryCache.getGeometry("cylinder", {
        radiusTop: 0.01,
        radiusBottom: 0.01,
        height: 0.3,
        radialSegments: 4
      });
      const arcMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: this.color,
        emissiveIntensity: 8,
        transparent: true,
        opacity: 0.8
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.castShadow = false;
      arc.receiveShadow = false;
      
      const angle = (i / arcCount) * Math.PI * 2;
      arc.position.x = Math.cos(angle) * 0.15;
      arc.position.z = Math.sin(angle) * 0.15;
      arc.rotation.z = angle;
      arc.userData.isArc = true;
      arc.userData.arcAngle = angle;
      
      group.add(arc);
    }

    // Outer glow sphere
    const glowGeo = GeometryCache.getGeometry("sphere", {
      radius: 0.25,
      widthSegments: 16,
      heightSegments: 16
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.castShadow = false;
    glow.receiveShadow = false;
    group.add(glow);
    group.add(glow);

    const light = new THREE.PointLight(this.color, 3, 4);
    group.add(light);

    group.userData.baseEmissiveIntensity = 6;
    return group;
  }

  _createMissile(group) {
    // Missile body
    const bodyGeo = GeometryCache.getGeometry("cylinder", {
      radiusTop: 0.06,
      radiusBottom: 0.08,
      height: 0.35,
      radialSegments: 8
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = false;
    body.receiveShadow = false;
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Nose cone
    const noseGeo = GeometryCache.getGeometry("cone", {
      radius: 0.06,
      height: 0.15,
      radialSegments: 8
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 2,
      metalness: 1,
      roughness: 0.1
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.castShadow = false;
    nose.receiveShadow = false;
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -0.25;
    group.add(nose);

    // Fins
    for(let i = 0; i < 4; i++) {
      const finGeo = GeometryCache.getGeometry("box", {
        width: 0.08,
        height: 0.02,
        depth: 0.15
      });
      const finMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.3
      });
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.castShadow = false;
      fin.receiveShadow = false;
      
      const angle = (i / 4) * Math.PI * 2;
      fin.position.x = Math.cos(angle) * 0.08;
      fin.position.y = Math.sin(angle) * 0.08;
      fin.position.z = 0.1;
      fin.rotation.z = angle;
      
      group.add(fin);
    }

    // Engine glow
    const engineGeo = GeometryCache.getGeometry("cylinder", {
      radiusTop: 0.05,
      radiusBottom: 0.08,
      height: 0.1,
      radialSegments: 8
    });
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 6,
      transparent: true,
      opacity: 0.9
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.castShadow = false;
    engine.receiveShadow = false;
    engine.rotation.x = Math.PI / 2;
    engine.position.z = 0.22;
    group.add(engine);

    const light = new THREE.PointLight(0xff6600, 2, 3);
    light.position.z = 0.25;
    group.add(light);

    group.userData.baseEmissiveIntensity = 6;
    return group;
  }

  _createLaserBeam(group) {
    // Laser core beam
    const beamGeo = GeometryCache.getGeometry("cylinder", {
      radiusTop: 0.03,
      radiusBottom: 0.03,
      height: 0.5,
      radialSegments: 8
    });
    const beamMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 10,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.castShadow = false;
    beam.receiveShadow = false;
    beam.rotation.x = Math.PI / 2;
    group.add(beam);

    // Outer glow layers
    for(let i = 0; i < 3; i++) {
      const radius = 0.05 + i * 0.03;
      const glowGeo = GeometryCache.getGeometry("cylinder", {
        radiusTop: radius,
        radiusBottom: radius,
        height: 0.5,
        radialSegments: 8
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: 8 - i * 2,
        transparent: true,
        opacity: 0.4 - i * 0.1,
        side: THREE.DoubleSide
      });
      const glowLayer = new THREE.Mesh(glowGeo, glowMat);
      glowLayer.castShadow = false;
      glowLayer.receiveShadow = false;
      glowLayer.rotation.x = Math.PI / 2;
      group.add(glowLayer);
    }

    // Energy particles along beam
    for(let i = 0; i < 8; i++) {
      const particleGeo = GeometryCache.getGeometry("sphere", {
        radius: 0.02,
        widthSegments: 8,
        heightSegments: 8
      });
      const particleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: this.color,
        emissiveIntensity: 6,
        transparent: true,
        opacity: 0.9
      });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      particle.castShadow = false;
      particle.receiveShadow = false;
      particle.position.z = -0.25 + (i / 7) * 0.5;
      particle.userData.isBeamParticle = true;
      particle.userData.particleIndex = i;
      group.add(particle);
    }

    const light = new THREE.PointLight(this.color, 4, 5);
    group.add(light);

    group.userData.baseEmissiveIntensity = 10;
    return group;
  }

  _createMagicOrb(group) {
    // Inner mystical core
    const coreGeo = GeometryCache.getGeometry("octahedron", {
      radius: 0.1,
      detail: 2
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 7,
      metalness: 0,
      roughness: 0,
      transparent: true,
      opacity: 1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = false;
    core.receiveShadow = false;
    core.userData.isMagicCore = true;
    group.add(core);

    // Orbiting particles
    for(let i = 0; i < 5; i++) {
      const orbitGeo = GeometryCache.getGeometry("sphere", {
        radius: 0.03,
        widthSegments: 8,
        heightSegments: 8
      });
      const orbitMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: this.color,
        emissiveIntensity: 5,
        transparent: true,
        opacity: 0.9
      });
      const orbitParticle = new THREE.Mesh(orbitGeo, orbitMat);
      orbitParticle.castShadow = false;
      orbitParticle.receiveShadow = false;
      
      orbitParticle.userData.isOrbitParticle = true;
      orbitParticle.userData.orbitAngle = (i / 5) * Math.PI * 2;
      orbitParticle.userData.orbitSpeed = 3 + Math.random() * 2;
      orbitParticle.userData.orbitRadius = 0.15 + Math.random() * 0.1;
      
      group.add(orbitParticle);
    }

    // Magical aura rings
    for(let i = 0; i < 2; i++) {
      const ringGeo = GeometryCache.getGeometry("torus", {
        radius: 0.15 + i * 0.08,
        tube: 0.01,
        radialSegments: 8,
        tubularSegments: 24
      });
      const ringMat = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: 4,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.castShadow = false;
      ring.receiveShadow = false;
      ring.userData.isMagicRing = true;
      ring.userData.ringIndex = i;
      group.add(ring);
    }

    const light = new THREE.PointLight(this.color, 3.5, 4);
    group.add(light);

    group.userData.baseEmissiveIntensity = 7;
    return group;
  }

  _createTrail() {
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    const colors = new Float32Array(this.maxTrailPoints * 3);
    
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });
    
    const trail = new THREE.Line(trailGeo, trailMat);
    trail.frustumCulled = false;
    
    return trail;
  }

  _createGlow() {
    const glowGeo = GeometryCache.getGeometry("sphere", {
      radius: 0.3,
      widthSegments: 16,
      heightSegments: 16
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    
    return new THREE.Mesh(glowGeo, glowMat);
  }

  addToScene(scene) {
    super.addToScene(scene);
    if (this.trailMesh) scene.add(this.trailMesh);
    if (this.glowMesh) scene.add(this.glowMesh);
  }

  _updateTrail() {
    this.trailUpdateCounter++;
    if (this.trailUpdateCounter % 2 === 0) {
      this.trailPoints.push(this.position.clone());
      if (this.trailPoints.length > this.maxTrailPoints) {
        this.trailPoints.shift();
      }
    }

    const positions = this.trailMesh.geometry.attributes.position.array;
    const colors = this.trailMesh.geometry.attributes.color.array;
    const color = new THREE.Color(this.color);

    for (let i = 0; i < this.maxTrailPoints; i++) {
      if (i < this.trailPoints.length) {
        const point = this.trailPoints[i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const alpha = i / this.trailPoints.length;
        colors[i * 3] = color.r * alpha;
        colors[i * 3 + 1] = color.g * alpha;
        colors[i * 3 + 2] = color.b * alpha;
      } else {
        positions[i * 3] = this.position.x;
        positions[i * 3 + 1] = this.position.y;
        positions[i * 3 + 2] = this.position.z;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }

    this.trailMesh.geometry.attributes.position.needsUpdate = true;
    this.trailMesh.geometry.attributes.color.needsUpdate = true;
  }

  _spawnTrailParticles() {
    if (Math.random() < 0.3) {
      const particle = {
        position: this.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        life: 0.3,
        maxLife: 0.3,
        size: 0.05 + Math.random() * 0.05
      };
      this.particles.push(particle);
    }
  }

  _updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      }
    }
  }

  _createImpactEffect() {
    if (!this.mesh || !this.mesh.parent) return;

    // Create explosion particles - use cached geometry (medium size)
    const particleGeo = GeometryCache.getGeometry("sphere", {
      radius: 0.04,
      widthSegments: 6,
      heightSegments: 6
    });
    
    const particleCount = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < particleCount; i++) {
      const particleMat = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: 6,
        transparent: true,
        opacity: 1
      });
      const particleMesh = new THREE.Mesh(particleGeo, particleMat);
      
      // Use scale to vary size instead of different geometries
      const sizeVariation = 0.75 + Math.random() * 0.5;
      particleMesh.scale.setScalar(sizeVariation);
      
      particleMesh.position.copy(this.position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      
      particleMesh.userData.velocity = velocity;
      particleMesh.userData.life = 0.4 + Math.random() * 0.3;
      particleMesh.userData.maxLife = particleMesh.userData.life;
      
      this.mesh.parent.add(particleMesh);
      this.impactParticles.push(particleMesh);
    }

    // Flash light
    const flashLight = new THREE.PointLight(this.color, 8, 5);
    flashLight.position.copy(this.position);
    this.mesh.parent.add(flashLight);
    
    setTimeout(() => {
      if (flashLight.parent) flashLight.parent.remove(flashLight);
    }, 100);

    // Shockwave ring - use cached geometry
    const ringGeo = GeometryCache.getGeometry("torus", {
      radius: 0.1,
      tube: 0.02,
      radialSegments: 6,
      tubularSegments: 12
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 5,
      transparent: true,
      opacity: 1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.position);
    ring.rotation.x = Math.PI / 2;
    this.mesh.parent.add(ring);

    const expandRing = () => {
      ring.scale.x += 0.3;
      ring.scale.y += 0.3;
      ring.scale.z += 0.3;
      ringMat.opacity -= 0.05;
      
      if (ringMat.opacity > 0) {
        requestAnimationFrame(expandRing);
      } else {
        if (ring.parent) ring.parent.remove(ring);
      }
    };
    expandRing();
  }

  _updateImpactParticles(deltaTime) {
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const particle = this.impactParticles[i];
      particle.userData.life -= deltaTime;
      
      if (particle.userData.life <= 0) {
        if (particle.parent) particle.parent.remove(particle);
        // Dispose the material (NOT geometry - it's cached!)
        if (particle.material) particle.material.dispose();
        this.impactParticles.splice(i, 1);
      } else {
        particle.position.add(
          particle.userData.velocity.clone().multiplyScalar(deltaTime)
        );
        particle.userData.velocity.y -= 9.8 * deltaTime;
        
        const lifeRatio = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = lifeRatio;
        particle.scale.setScalar(lifeRatio);
      }
    }
  }

  update(deltaTime) {
    if (this.isDisposed) {
      this._updateImpactParticles(deltaTime);
      return;
    }

    this.age += deltaTime;
    if (this.age > this.lifeTime || !this.target || this.target.isDisposed) {
      this.dispose();
      return;
    }

    const targetPos = this.target.mesh.position.clone();
    targetPos.y += 0.5; // Aim for center mass
    
    const dir = targetPos.clone().sub(this.position);
    const distance = dir.length();

    // Check for hit
    if (distance < 0.3) {
      this._onHit();
      return;
    }

    // Physics-based movement with acceleration
    dir.normalize();
    
    // Accelerate towards max speed
    this.currentSpeed = Math.min(
      this.currentSpeed + this.acceleration * deltaTime * 10,
      this.speed
    );
    
    // Homing behavior - gradually turn towards target
    this.velocity.lerp(dir.multiplyScalar(this.currentSpeed), deltaTime * 8);
    
    const step = deltaTime;
    this.position.add(this.velocity.clone().multiplyScalar(step));

    // Update visual elements
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      
      // Rotation - DISABLED FOR PERFORMANCE
      // this.mesh.rotateOnAxis(this.rotationAxis, this.rotationSpeed * deltaTime);
      
      // Point towards movement direction
      if (this.type === "missile" || this.type === "laser") {
        const lookAtPos = this.position.clone().add(this.velocity);
        this.mesh.lookAt(lookAtPos);
      }
      
      this._updateVisualEffects(deltaTime);
    }

    // Disabled for performance
    // this.trailUpdateCounter++;
    // if (this.trailUpdateCounter >= 2) {
    //   this._updateTrail();
    //   this.trailUpdateCounter = 0;
    // }
    // if (this.glowMesh) {
    //   this.glowMesh.position.copy(this.position);
    // }

    // Particles disabled for performance
    // this._spawnTrailParticles();
    // this._updateParticles(deltaTime);
    // this._updateImpactParticles(deltaTime);
  }

  _updateVisualEffects(deltaTime) {
    // DISABLED FOR MASSIVE PERFORMANCE BOOST
    // All projectile animations disabled to save CPU
    return;
    
    const tNorm = this.age / this.lifeTime;
    const pulse = Math.sin(this.age * 15) * 0.3 + 0.7;
    
    this.mesh.children.forEach(child => {
      if (child.material && child.material.emissiveIntensity !== undefined) {
        const base = this.mesh.userData.baseEmissiveIntensity || 3;
        child.material.emissiveIntensity = base * pulse;
      }

      // Type-specific animations
      if (child.userData.isShell) {
        child.rotation.x += deltaTime * 3;
        child.rotation.y += deltaTime * 2;
        const scale = 1 + Math.sin(this.age * 8) * 0.15;
        child.scale.setScalar(scale);
      }

      if (child.userData.ringIndex !== undefined) {
        child.rotation.z += deltaTime * (3 + child.userData.ringIndex);
        child.position.z = Math.sin(this.age * 10 + child.userData.ringIndex) * 0.05;
      }

      if (child.userData.isArc) {
        const arcPulse = Math.sin(this.age * 20 + child.userData.arcAngle) * 0.5 + 0.5;
        child.material.opacity = arcPulse * 0.8;
        child.scale.y = 0.8 + arcPulse * 0.4;
      }

      if (child.userData.isBeamParticle) {
        const offset = (this.age * 5 + child.userData.particleIndex * 0.3) % 1;
        child.position.z = -0.25 + offset * 0.5;
      }

      if (child.userData.isMagicCore) {
        child.rotation.x += deltaTime * 2;
        child.rotation.y += deltaTime * 3;
      }

      if (child.userData.isOrbitParticle) {
        child.userData.orbitAngle += deltaTime * child.userData.orbitSpeed;
        const radius = child.userData.orbitRadius;
        child.position.x = Math.cos(child.userData.orbitAngle) * radius;
        child.position.y = Math.sin(child.userData.orbitAngle) * radius;
        child.position.z = Math.sin(child.userData.orbitAngle * 2) * radius * 0.5;
      }

      if (child.userData.isMagicRing) {
        const idx = child.userData.ringIndex;
        child.rotation.x = Math.sin(this.age * 3 + idx) * 0.5;
        child.rotation.y = this.age * (2 + idx);
      }
    });
  }

  _onHit() {
    // Calculate damage with critical chance
    const isCritical = Math.random() < 0.15;
    const actualDamage = isCritical ? this.damage * 1.5 : this.damage;
    
    // Get damage type from tower config
    const damageType = this.tower?.config?.damageType || this.type;
    
    // Play impact sound
    if (this.soundLibrary) {
      const intensity = actualDamage / 100; // Normalize to 0-2 range
      if (isCritical) {
        this.soundLibrary.critical(intensity);
      } else {
        this.soundLibrary.hit(intensity);
      }
    }
    
    // Create floating text
    if (this.floatingTexts && Array.isArray(this.floatingTexts) && this.target && this.target.mesh) {
      const hitPos = this.target.mesh.position.clone();
      hitPos.y += 0.8;
      
      const floatingText = FloatingText.createDamage(hitPos, actualDamage, isCritical);
      floatingText.addToScene(this.mesh.parent);
      this.floatingTexts.push(floatingText);
    }
    
    this.target.takeDamage(actualDamage, this.target.levelManager, this.soundLibrary, damageType);
    
    // AOE damage for magic type (Pulse Tower)
    if (this.type === "magic" && this.tower?.config?.area && this.enemies) {
      const aoeRange = this.tower.config.area * (this.tower.aoeRangeBonus || 1.0);
      const aoePosition = this.target.mesh.position.clone();
      
      this.enemies.forEach((enemy) => {
        if (enemy.isDisposed || enemy === this.target) return;
        
        const distance = enemy.mesh.position.distanceTo(aoePosition);
        if (distance <= aoeRange) {
          // AOE damage is 50% of main damage
          const aoeDamage = actualDamage * 0.5;
          enemy.takeDamage(aoeDamage, enemy.levelManager, this.soundLibrary, damageType);
          
          // Create smaller floating text for AOE damage
          if (this.floatingTexts && Array.isArray(this.floatingTexts)) {
            const hitPos = enemy.mesh.position.clone();
            hitPos.y += 0.6;
            const floatingText = FloatingText.createDamage(hitPos, aoeDamage, false);
            floatingText.addToScene(this.mesh.parent);
            this.floatingTexts.push(floatingText);
          }
        }
      });
    }
    
    // Apply slow effect from tower skills
    if (this.tower) {
      if (this.tower.slowEffect && this.tower.slowEffect > 0) {
        const duration = 2; // 2 seconds
        this.target.applySlow(this.tower.slowEffect, duration);
      }
    }
    
    // Create impact effect
    this._createImpactEffect();
    
    this.dispose();
  }

  dispose() {
    this.isDisposed = true;
    
    // Clean up any remaining impact particles
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const particle = this.impactParticles[i];
      if (particle.parent) particle.parent.remove(particle);
      if (particle.material) particle.material.dispose();
    }
    this.impactParticles = [];
    
    // DO NOT dispose geometries or materials - they're CACHED and shared!
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }
    
    if (this.trailMesh) {
      if (this.trailMesh.parent) this.trailMesh.parent.remove(this.trailMesh);
    }
    
    if (this.glowMesh) {
      if (this.glowMesh.parent) this.glowMesh.parent.remove(this.glowMesh);
    }
  }
}

