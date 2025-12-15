/**
 * Physics Engine
 * Single Responsibility: Physical simulation with Cannon.js
 */

import { GAME_CONSTANTS } from '../constants.js';

export class PhysicsEngine {
  constructor() {
    this._world = null;
    this._diceBodyA = null;
    this._diceBodyB = null;
    this._platformBody = null;
  }

  initialize() {
    // Create physics world
    this._world = new CANNON.World();
    this._world.gravity.set(0, -9.82 * 3, 0); // Stronger gravity for faster action
    this._world.broadphase = new CANNON.NaiveBroadphase();
    this._world.solver.iterations = 16;
    this._world.allowSleep = true;
    this._world.sleepSpeedLimit = 0.1;
    this._world.sleepTimeLimit = 0.3;

    // Add platform (ground)
    this._createPlatform();
  }

  _createPlatform() {
    // Ground platform - circular shape matching visual platform
    const platformShape = new CANNON.Cylinder(5.5, 5.5, 0.4, 32);
    this._platformBody = new CANNON.Body({
      mass: 0,
      shape: platformShape,
      position: new CANNON.Vec3(0, -1.35, 0),
      material: new CANNON.Material({ friction: 0.6, restitution: 0.3 })
    });
    // Rotate cylinder to be horizontal (Cannon.js cylinders are aligned on Y axis by default)
    this._platformBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this._world.addBody(this._platformBody);

    // Add invisible circular walls to contain the dice
    const wallMaterial = new CANNON.Material({ friction: 0.3, restitution: 0.5 });
    const wallHeight = 3;
    const wallRadius = 5;
    const wallSegments = 16;
    
    // Create circular containment with multiple wall segments
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const nextAngle = ((i + 1) / wallSegments) * Math.PI * 2;
      
      const x = Math.cos(angle) * wallRadius;
      const z = Math.sin(angle) * wallRadius;
      
      const wallShape = new CANNON.Box(new CANNON.Vec3(0.3, wallHeight, 0.5));
      const wall = new CANNON.Body({
        mass: 0,
        shape: wallShape,
        position: new CANNON.Vec3(x, 0, z),
        material: wallMaterial
      });
      
      // Rotate wall to face center
      wall.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
      this._world.addBody(wall);
    }
  }

  createDiceBody(position) {
    const size = GAME_CONSTANTS.DICE_SIZE;
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
    
    const body = new CANNON.Body({
      mass: 1,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y + 5, position.z), // Start higher
      material: new CANNON.Material({ friction: 0.5, restitution: 0.4 }),
      linearDamping: 0.1,
      angularDamping: 0.1,
      sleepSpeedLimit: 0.1,
      sleepTimeLimit: 0.3
    });

    this._world.addBody(body);
    return body;
  }

  throwDice(bodyA, bodyB) {
    // Reset positions high above
    bodyA.position.set(
      GAME_CONSTANTS.DICE_POSITION_A.x,
      5,
      GAME_CONSTANTS.DICE_POSITION_A.z
    );
    bodyB.position.set(
      GAME_CONSTANTS.DICE_POSITION_B.x,
      5,
      GAME_CONSTANTS.DICE_POSITION_B.z
    );

    // Wake up if sleeping
    bodyA.wakeUp();
    bodyB.wakeUp();

    // Random initial velocities - reduced to keep dice contained
    const randomVelocity = () => (Math.random() - 0.5) * 1;
    
    bodyA.velocity.set(
      randomVelocity(),
      -1, // Downward
      randomVelocity()
    );
    bodyB.velocity.set(
      randomVelocity(),
      -1,
      randomVelocity()
    );

    // Random angular velocity (spin) - reduced for better control
    bodyA.angularVelocity.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );
    bodyB.angularVelocity.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );

    // Reset rotation
    bodyA.quaternion.set(0, 0, 0, 1);
    bodyB.quaternion.set(0, 0, 0, 1);
  }

  step(deltaTime) {
    this._world.step(1 / 60, deltaTime, 3);
  }

  syncMesh(mesh, body) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  areDiceAtRest(bodyA, bodyB) {
    return bodyA.sleepState === CANNON.Body.SLEEPING && 
           bodyB.sleepState === CANNON.Body.SLEEPING;
  }

  getDiceBody(index) {
    return index === 0 ? this._diceBodyA : this._diceBodyB;
  }

  setDiceBodyA(body) {
    this._diceBodyA = body;
  }

  setDiceBodyB(body) {
    this._diceBodyB = body;
  }
}
