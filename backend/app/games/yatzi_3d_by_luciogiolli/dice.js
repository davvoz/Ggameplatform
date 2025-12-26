import * as THREE from "three";
import * as CANNON from "cannon-es";

export class DiceManager {
  constructor(scene) {
    this.scene = scene;
    this.diceMeshes = [];
    this.diceBodies = [];
    this.values = [1, 1, 1, 1, 1];
    this.held = [false, false, false, false, false];
    this.isRolling = false;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.world = this._createWorld();
    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;
    this.accumulator = 0;
    this.stillTime = 0;
    this.rollCompleteCallback = null;

    this._createTablePhysics();
    this._createDice();
  }

  _createWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.allowSleep = true;
    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.15;
    return world;
  }

  _createTablePhysics() {
    // Ground plane (matches visual table)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // Side walls to keep dice on table (approx around 8 x 5 area)
    const halfW = 4;
    const halfD = 2.5;
    const wallHeight = 1;
    const wallThickness = 0.25;

    const wallShapeZ = new CANNON.Box(
      new CANNON.Vec3(halfW, wallHeight, wallThickness)
    );
    const wallShapeX = new CANNON.Box(
      new CANNON.Vec3(wallThickness, wallHeight, halfD)
    );

    // Front/back walls (along X, at Z +/- halfD)
    const wallFront = new CANNON.Body({ mass: 0, shape: wallShapeZ });
    wallFront.position.set(0, wallHeight, halfD + wallThickness);
    this.world.addBody(wallFront);

    const wallBack = new CANNON.Body({ mass: 0, shape: wallShapeZ });
    wallBack.position.set(0, wallHeight, -halfD - wallThickness);
    this.world.addBody(wallBack);

    // Left/right walls (along Z, at X +/- halfW)
    const wallLeft = new CANNON.Body({ mass: 0, shape: wallShapeX });
    wallLeft.position.set(-halfW - wallThickness, wallHeight, 0);
    this.world.addBody(wallLeft);

    const wallRight = new CANNON.Body({ mass: 0, shape: wallShapeX });
    wallRight.position.set(halfW + wallThickness, wallHeight, 0);
    this.world.addBody(wallRight);
  }

  _createDice() {
    const size = 0.7;
    const half = size / 2;
    const geom = new THREE.BoxGeometry(size, size, size);
    const textures = this._createDiceTextures(256);

    const diceShape = new CANNON.Box(new CANNON.Vec3(half, half, half));

    for (let i = 0; i < 5; i++) {
      const mats = [
        new THREE.MeshStandardMaterial({ map: textures[3], emissive: 0x000000 }), // px -> 3
        new THREE.MeshStandardMaterial({ map: textures[4], emissive: 0x000000 }), // nx -> 4
        new THREE.MeshStandardMaterial({ map: textures[1], emissive: 0x000000 }), // py -> 1
        new THREE.MeshStandardMaterial({ map: textures[6], emissive: 0x000000 }), // ny -> 6
        new THREE.MeshStandardMaterial({ map: textures[2], emissive: 0x000000 }), // pz -> 2
        new THREE.MeshStandardMaterial({ map: textures[5], emissive: 0x000000 })  // nz -> 5
      ];
      const mesh = new THREE.Mesh(geom, mats);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set((i - 2) * 1.1, 2.5, 0);
      mesh.userData.index = i;
      this.group.add(mesh);
      this.diceMeshes.push(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: diceShape,
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: new CANNON.Material({ friction: 0.4, restitution: 0.15 })
      });
      body.angularDamping = 0.15;
      body.linearDamping = 0.1;
      this.world.addBody(body);
      this.diceBodies.push(body);
    }
  }

  _createDiceTextures(size) {
    const textures = {};
    for (let v = 1; v <= 6; v++) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#222";
      const r = size * 0.09;
      const off = size * 0.25;

      const drawDot = (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };

      const mid = size / 2;

      if ([1,3,5].includes(v)) drawDot(mid, mid);
      if (v >= 2) {
        drawDot(mid - off, mid - off);
        drawDot(mid + off, mid + off);
      }
      if (v >= 4) {
        drawDot(mid + off, mid - off);
        drawDot(mid - off, mid + off);
      }
      if (v === 6) {
        drawDot(mid - off, mid);
        drawDot(mid + off, mid);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      tex.colorSpace = THREE.SRGBColorSpace;
      textures[v] = tex;
    }
    return textures;
  }

  _updateHeldVisuals() {
    this.diceMeshes.forEach((mesh, i) => {
      const held = this.held[i];
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        m.emissive.setHex(held ? 0x664400 : 0x000000);
      });
    });
  }

  roll(unheldIndices, duration = 600, onComplete) {
    if (this.isRolling) return;
    this.isRolling = true;
    this.stillTime = 0;
    this.rollCompleteCallback = onComplete || null;

    // Drop unheld dice from above with random impulses
    for (const i of unheldIndices) {
      const body = this.diceBodies[i];

      const x = (i - 2) * 1.1 + (Math.random() - 0.5) * 1.0;
      const z = (Math.random() - 0.5) * 2.0;
      const y = 4 + Math.random() * 1.0;

      body.position.set(x, y, z);
      body.velocity.set(
        (Math.random() - 0.5) * 4,
        -2 - Math.random() * 2,
        (Math.random() - 0.5) * 4
      );
      body.angularVelocity.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      body.wakeUp();
    }

    // If nothing is rolling (all held), immediately complete
    if (unheldIndices.length === 0) {
      this.isRolling = false;
      if (typeof this.rollCompleteCallback === "function") {
        this.rollCompleteCallback();
      }
      this.rollCompleteCallback = null;
    }
  }

  toggleHoldByRay(raycaster, pointer, camera) {
    const intersects = raycaster.intersectObjects(this.diceMeshes, false);
    if (!intersects.length) return -1;
    const mesh = intersects[0].object;
    const idx = mesh.userData.index;
    this.held[idx] = !this.held[idx];
    this._updateHeldVisuals();
    return idx;
  }

  setHeldMask(mask) {
    this.held = mask.slice();
    this._updateHeldVisuals();
  }

  resetHeld() {
    this.held = this.held.map(() => false);
    this._updateHeldVisuals();
  }

  resetValues() {
    this.values = [1, 1, 1, 1, 1];
  }

  getUnheldIndices() {
    const arr = [];
    this.held.forEach((h, i) => {
      if (!h) arr.push(i);
    });
    return arr;
  }

  _orientationToValue(quat) {
    // quat: CANNON.Quaternion
    const worldUp = new CANNON.Vec3(0, 1, 0);

    const axes = [
      { key: "px", vec: new CANNON.Vec3(1, 0, 0) },
      { key: "nx", vec: new CANNON.Vec3(-1, 0, 0) },
      { key: "py", vec: new CANNON.Vec3(0, 1, 0) },
      { key: "ny", vec: new CANNON.Vec3(0, -1, 0) },
      { key: "pz", vec: new CANNON.Vec3(0, 0, 1) },
      { key: "nz", vec: new CANNON.Vec3(0, 0, -1) }
    ];

    let bestKey = "py";
    let bestDot = -Infinity;

    for (const a of axes) {
      const v = quat.vmult(a.vec);
      const dot = v.dot(worldUp);
      if (dot > bestDot) {
        bestDot = dot;
        bestKey = a.key;
      }
    }

    // Mapping from local axis up to face value based on material assignment:
    // +x -> 3, -x -> 4, +y -> 1, -y -> 6, +z -> 2, -z -> 5
    const map = {
      px: 3,
      nx: 4,
      py: 1,
      ny: 6,
      pz: 2,
      nz: 5
    };

    return map[bestKey] || 1;
  }

  _finalizeRoll() {
    // Read values from final orientations
    for (let i = 0; i < this.diceBodies.length; i++) {
      const body = this.diceBodies[i];
      this.values[i] = this._orientationToValue(body.quaternion);
    }
    this.isRolling = false;
    if (typeof this.rollCompleteCallback === "function") {
      this.rollCompleteCallback();
    }
    this.rollCompleteCallback = null;
  }

  update(dt) {
    if (!this.world) return;

    // Step physics
    this.accumulator += dt;
    while (this.accumulator >= this.fixedTimeStep) {
      this.world.step(this.fixedTimeStep, this.fixedTimeStep, this.maxSubSteps);
      this.accumulator -= this.fixedTimeStep;
    }

    // Sync meshes with physics bodies
    for (let i = 0; i < this.diceBodies.length; i++) {
      const body = this.diceBodies[i];
      const mesh = this.diceMeshes[i];
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }

    if (this.isRolling) {
      // Check if all dice are almost still
      let allStill = true;
      for (const body of this.diceBodies) {
        const v = body.velocity;
        const w = body.angularVelocity;
        const speed = v.length();
        const spin = w.length();
        if (speed > 0.15 || spin > 0.6) {
          allStill = false;
          break;
        }
      }

      if (allStill) {
        this.stillTime += dt;
        if (this.stillTime > 0.8) {
          this._finalizeRoll();
        }
      } else {
        this.stillTime = 0;
      }
    }
  }
}