/**
 * Dice Renderer
 * Single Responsibility: 3D rendering with Three.js
 */

import { GAME_CONSTANTS, FACE_ROTATIONS } from '../constants.js';
import { MathUtils } from '../utils/MathUtils.js';
import { DiceFactory } from './DiceFactory.js';
import { OrbitControls } from './OrbitControls.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';

export class DiceRenderer {
  constructor(canvas) {
    this._canvas = canvas;
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._animationId = null;
    this._diceA = null;
    this._diceB = null;
    this._physicsEngine = null;
    this._diceBodyA = null;
    this._diceBodyB = null;
    this._isRolling = false;
    this._lastTime = 0;
  }

  initialize() {
    this._initPhysics();
    this._initScene();
    this._initCamera();
    this._initRenderer();
    this._initLights();
    this._initPlatform();
    this._initDice();
    this._initControls();
    this._initResizeHandler();
    this._startAnimation();
  }

  _initPhysics() {
    this._physicsEngine = new PhysicsEngine();
    this._physicsEngine.initialize();
  }

  _initScene() {
    this._scene = new THREE.Scene();
    this._scene.background = null;
    
    // Add fog for depth
    this._scene.fog = new THREE.Fog(0x0a0a14, 10, 30);
  }

  _initCamera() {
    const aspect = this._canvas.clientWidth / this._canvas.clientHeight;
    this._camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    // Position camera closer for better view
    this._camera.position.set(0, 8, 8);
    this._camera.lookAt(0, 0, 0);
  }

  _initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputEncoding = THREE.sRGBEncoding;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
  }

  _initLights() {
    // Ambient light - soft fill
    const ambientLight = new THREE.AmbientLight(0x8899ff, 0.4);
    this._scene.add(ambientLight);

    // Main directional light with shadows
    const directionalLight = this._createDirectionalLight();
    this._scene.add(directionalLight);

    // Purple rim light for dramatic effect
    const rimLight = new THREE.DirectionalLight(0x7c5cff, 0.6);
    rimLight.position.set(-5, 8, -5);
    this._scene.add(rimLight);

    // Cyan accent light
    const accentLight = new THREE.PointLight(0x00d4ff, 0.8, 20);
    accentLight.position.set(5, 5, 5);
    this._scene.add(accentLight);
    
    // Bottom rim light for platform glow
    const bottomLight = new THREE.PointLight(0xff1493, 0.5, 15);
    bottomLight.position.set(0, -1, 0);
    this._scene.add(bottomLight);
    
    // Spotlight for dramatic shadows
    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 12, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 2;
    spotLight.distance = 20;
    spotLight.castShadow = true;
    this._scene.add(spotLight);
  }

  _createDirectionalLight() {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    return light;
  }

  _initPlatform() {
    // Main platform - larger and more detailed
    const platformGeometry = new THREE.CylinderGeometry(5.5, 5.5, 0.4, 64);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x7c5cff,
      emissiveIntensity: 0.1
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1.35;
    platform.receiveShadow = true;
    platform.castShadow = true;
    this._scene.add(platform);
    
    // Platform rim with glow effect
    const rimGeometry = new THREE.TorusGeometry(5.5, 0.08, 16, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.15;
    this._scene.add(rim);
    
    // Add Cur8 logo on platform using canvas texture
    this._addPlatformLogo();
    
    // Add decorative ring pattern
    this._addDecorativeRings();
  }
  
  _addPlatformLogo() {
    // Create canvas for logo texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Clear background
    ctx.clearRect(0, 0, 1024, 1024);
    
    // Draw 7EVEN logo
    ctx.save();
    ctx.translate(512, 512);
    
    // Background circle with neon gradient
    const bgGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
    bgGradient.addColorStop(0, 'rgba(255, 20, 147, 0.3)');
    bgGradient.addColorStop(0.4, 'rgba(124, 92, 255, 0.25)');
    bgGradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.15)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 350, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer glow ring
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 280, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner ring
    ctx.strokeStyle = 'rgba(255, 20, 147, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 260, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw stylized "7" with neon effect
    const draw7WithGlow = (offsetX, offsetY, color, blur) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.translate(offsetX, offsetY);
      
      // Main "7" shape - stylized and bold
      ctx.beginPath();
      // Top horizontal line
      ctx.moveTo(-120, -150);
      ctx.lineTo(120, -150);
      // Diagonal stroke with slight curve
      ctx.quadraticCurveTo(80, -80, -20, 150);
      ctx.stroke();
      
      // Fill the top part
      ctx.beginPath();
      ctx.moveTo(-120, -150);
      ctx.lineTo(120, -150);
      ctx.lineTo(120, -110);
      ctx.lineTo(-120, -110);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    };
    
    // Draw "7" with triple glow effect (cyan, magenta, white)
    draw7WithGlow(0, 0, 'rgba(0, 212, 255, 0.6)', 40);
    draw7WithGlow(0, 0, 'rgba(255, 20, 147, 0.8)', 25);
    draw7WithGlow(0, 0, '#ffffff', 15);
    
    // Add decorative dots (dice theme)
    const drawDot = (x, y, radius, color) => {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };
    
    // Dots positioned around the 7
    drawDot(-180, -150, 12, '#00d4ff');
    drawDot(180, -150, 12, '#00d4ff');
    drawDot(-180, 150, 12, '#ff1493');
    drawDot(100, 150, 12, '#ff1493');
    drawDot(-80, 0, 10, '#7c5cff');
    drawDot(150, 0, 10, '#7c5cff');
    
    // Add "SEVEN" text below
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text with glow
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SEVEN', 0, 220);
    
    ctx.shadowColor = '#ff1493';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'rgba(255, 20, 147, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText('SEVEN', 0, 220);
    
    ctx.restore();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create logo plane
    const logoGeometry = new THREE.CircleGeometry(3, 64);
    const logoMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
      side: THREE.DoubleSide
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = -1.14;
    this._scene.add(logo);
  }
  
  _addDecorativeRings() {
    // Add multiple decorative rings for depth
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const radius = 3 + i * 0.8;
      const ringGeometry = new THREE.TorusGeometry(radius, 0.02, 8, 64);
      const hue = (i / ringCount) * 0.3;
      const color = new THREE.Color().setHSL(0.5 + hue, 1, 0.5);
      
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5 + i * 0.2,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.6 - i * 0.15
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.13 - i * 0.01;
      this._scene.add(ring);
    }
  }

  _initDice() {
    const diceFactory = new DiceFactory();
    this._diceA = diceFactory.createDie(
      GAME_CONSTANTS.DICE_POSITION_A.x,
      GAME_CONSTANTS.DICE_POSITION_A.y,
      GAME_CONSTANTS.DICE_POSITION_A.z
    );
    this._diceB = diceFactory.createDie(
      GAME_CONSTANTS.DICE_POSITION_B.x,
      GAME_CONSTANTS.DICE_POSITION_B.y,
      GAME_CONSTANTS.DICE_POSITION_B.z
    );
    
    // Set fixed Euler order to prevent gimbal lock
    this._diceA.rotation.order = 'XYZ';
    this._diceB.rotation.order = 'XYZ';
    
    this._scene.add(this._diceA);
    this._scene.add(this._diceB);
    
    // Create physics bodies for the dice
    if (this._physicsEngine) {
      this._diceBodyA = this._physicsEngine.createDiceBody(GAME_CONSTANTS.DICE_POSITION_A);
      this._diceBodyB = this._physicsEngine.createDiceBody(GAME_CONSTANTS.DICE_POSITION_B);
    }
  }

  _initControls() {
    new OrbitControls(this._canvas, this._camera);
  }

  _initResizeHandler() {
    window.addEventListener('resize', () => this._onWindowResize(), false);
  }

  _onWindowResize() {
    const width = this._canvas.clientWidth;
    const height = this._canvas.clientHeight;
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  _startAnimation() {
    const animate = (currentTime) => {
      this._animationId = requestAnimationFrame(animate);
      
      // Calculate delta time for physics
      const deltaTime = this._lastTime ? (currentTime - this._lastTime) / 1000 : 0;
      this._lastTime = currentTime;
      
      // Update physics simulation
      if (this._physicsEngine && this._isRolling) {
        this._physicsEngine.step(deltaTime);
        // Sync Three.js meshes with physics bodies
        if (this._diceBodyA) {
          this._physicsEngine.syncMesh(this._diceA, this._diceBodyA);
        }
        if (this._diceBodyB) {
          this._physicsEngine.syncMesh(this._diceB, this._diceBodyB);
        }
      } else if (!this._isRolling) {
        // Floating animation when not rolling
        this._updateFloatingAnimation();
      }
      
      this._renderer.render(this._scene, this._camera);
    };
    animate(0);
  }



  _updateFloatingAnimation() {
    const time = Date.now() * GAME_CONSTANTS.FLOATING_SPEED;
    this._diceA.position.y = Math.sin(time) * GAME_CONSTANTS.FLOATING_AMPLITUDE;
    this._diceB.position.y = Math.cos(time * 1.2) * GAME_CONSTANTS.FLOATING_AMPLITUDE;
  }

  throwDice() {
    if (this._physicsEngine && this._diceBodyA && this._diceBodyB) {
      this._isRolling = true;
      this._physicsEngine.throwDice(this._diceBodyA, this._diceBodyB);
    }
  }

  areDiceAtRest() {
    if (this._physicsEngine && this._diceBodyA && this._diceBodyB) {
      return this._physicsEngine.areDiceAtRest(this._diceBodyA, this._diceBodyB);
    }
    return false;
  }

  setRolling(isRolling) {
    this._isRolling = isRolling;
  }

  getDiceA() {
    return this._diceA;
  }

  getDiceB() {
    return this._diceB;
  }

  getPhysicsEngine() {
    return this._physicsEngine;
  }

  getDiceBodyA() {
    return this._diceBodyA;
  }

  getDiceBodyB() {
    return this._diceBodyB;
  }

  resetDice() {
    // Reset physics bodies
    if (this._physicsEngine && this._diceBodyA && this._diceBodyB) {
      // Stop all motion
      this._diceBodyA.velocity.set(0, 0, 0);
      this._diceBodyA.angularVelocity.set(0, 0, 0);
      this._diceBodyB.velocity.set(0, 0, 0);
      this._diceBodyB.angularVelocity.set(0, 0, 0);
      
      // Reset positions
      this._diceBodyA.position.set(-1.5, 5, 0);
      this._diceBodyB.position.set(1.5, 5, 0);
      
      // Reset rotations to identity
      this._diceBodyA.quaternion.set(0, 0, 0, 1);
      this._diceBodyB.quaternion.set(0, 0, 0, 1);
      
      // Wake up bodies
      this._diceBodyA.wakeUp();
      this._diceBodyB.wakeUp();
      
      // Sync meshes
      this._physicsEngine.syncMesh(this._diceA, this._diceBodyA);
      this._physicsEngine.syncMesh(this._diceB, this._diceBodyB);
    }
    
    this._isRolling = false;
  }

  cleanup() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }
  }
}
