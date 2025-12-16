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
    
    // Casino-style gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Dark burgundy to black gradient (classic casino)
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#1a0f0f');
    gradient.addColorStop(0.5, '#0f0a0a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const bgTexture = new THREE.CanvasTexture(canvas);
    this._scene.background = bgTexture;
    
    // Subtle fog for depth
    this._scene.fog = new THREE.Fog(0x0a0505, 15, 35);
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
    this._renderer.toneMappingExposure = 0.8;
  }

  _initLights() {
    // Warm ambient light (casino atmosphere) - ridotta
    const ambientLight = new THREE.AmbientLight(0xffddaa, 0.2);
    this._scene.add(ambientLight);

    // Main overhead light with shadows
    const directionalLight = this._createDirectionalLight();
    this._scene.add(directionalLight);

    // Warm spot lights from above (like casino ceiling lights) - intensità ridotta
    const spotLight1 = new THREE.SpotLight(0xffe8c0, 0.7);
    spotLight1.position.set(0, 10, 0);
    spotLight1.angle = Math.PI / 3;
    spotLight1.penumbra = 0.3;
    spotLight1.decay = 2;
    spotLight1.distance = 25;
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 1024;
    spotLight1.shadow.mapSize.height = 1024;
    this._scene.add(spotLight1);
    
    // Secondary warm light from an angle - ridotta
    const rimLight = new THREE.DirectionalLight(0xffd4aa, 0.25);
    rimLight.position.set(-8, 6, 5);
    this._scene.add(rimLight);

    // Subtle accent lights for depth
    const accentLight1 = new THREE.PointLight(0xff9966, 0.3, 15);
    accentLight1.position.set(6, 3, 4);
    this._scene.add(accentLight1);
    
    const accentLight2 = new THREE.PointLight(0xffaa77, 0.3, 15);
    accentLight2.position.set(-6, 3, -4);
    this._scene.add(accentLight2);
  }

  _createDirectionalLight() {
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
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
    // Casino table base (wood structure)
    const tableBaseGeometry = new THREE.BoxGeometry(12, 0.6, 9);
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.8,
      metalness: 0.1,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
    const tableBase = new THREE.Mesh(tableBaseGeometry, woodMaterial);
    tableBase.position.y = -1.5;
    tableBase.receiveShadow = true;
    this._scene.add(tableBase);
    
    // Green felt surface (classic casino) - verde scuro professionale
    const feltGeometry = new THREE.BoxGeometry(11.8, 0.05, 8.8);
    const feltMaterial = new THREE.MeshStandardMaterial({
      color: 0x064a1f,
      roughness: 0.95,
      metalness: 0,
      normalScale: new THREE.Vector2(2, 2)
    });
    const felt = new THREE.Mesh(feltGeometry, feltMaterial);
    felt.position.y = -1.17;
    felt.receiveShadow = true;
    this._scene.add(felt);
    
    // Wooden edges (refined border)
    this._addTableEdges();
    
    // Add subtle table markings
    this._addTableMarkings();
    
    // Table legs
    this._addTableLegs();
  }
  
  _addTableEdges() {
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.6,
      metalness: 0.2
    });
    
    // Long edges (left/right)
    const longEdgeGeometry = new THREE.BoxGeometry(12, 0.3, 0.4);
    
    const edgeFront = new THREE.Mesh(longEdgeGeometry, edgeMaterial);
    edgeFront.position.set(0, -1.05, 4.6);
    edgeFront.castShadow = true;
    this._scene.add(edgeFront);
    
    const edgeBack = new THREE.Mesh(longEdgeGeometry, edgeMaterial);
    edgeBack.position.set(0, -1.05, -4.6);
    edgeBack.castShadow = true;
    this._scene.add(edgeBack);
    
    // Short edges (front/back)
    const shortEdgeGeometry = new THREE.BoxGeometry(0.4, 0.3, 9);
    
    const edgeLeft = new THREE.Mesh(shortEdgeGeometry, edgeMaterial);
    edgeLeft.position.set(-6, -1.05, 0);
    edgeLeft.castShadow = true;
    this._scene.add(edgeLeft);
    
    const edgeRight = new THREE.Mesh(shortEdgeGeometry, edgeMaterial);
    edgeRight.position.set(6, -1.05, 0);
    edgeRight.castShadow = true;
    this._scene.add(edgeRight);
  }
  
  _addTableMarkings() {
    // Create canvas for table texture with subtle markings
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base green felt color - verde casinò scuro
    ctx.fillStyle = '#064a1f';
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add subtle line border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 944, 944);
    
    // Center circle for dice area
    ctx.beginPath();
    ctx.arc(512, 512, 220, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Logo "7" al centro del cerchio - stile pulito con bordi
    ctx.save();
    ctx.translate(512, 480);
    
    // Bordo nero esterno più spesso
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 38;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    // Linea orizzontale sopra
    ctx.moveTo(-100, -100);
    ctx.lineTo(100, -100);
    // Linea diagonale
    ctx.lineTo(100, -80);
    ctx.lineTo(-30, 110);
    ctx.stroke();
    
    // Bordo oro intermedio
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 22;
    
    ctx.beginPath();
    ctx.moveTo(-100, -100);
    ctx.lineTo(100, -100);
    ctx.lineTo(100, -80);
    ctx.lineTo(-30, 110);
    ctx.stroke();
    
    // Riempimento interno oro chiaro con glow
    ctx.strokeStyle = '#FFED4E';
    ctx.lineWidth = 14;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.moveTo(-100, -100);
    ctx.lineTo(100, -100);
    ctx.lineTo(100, -80);
    ctx.lineTo(-30, 110);
    ctx.stroke();
    
    ctx.restore();
    
    // "SEVEN" text lungo la circonferenza in basso
    const text = 'SEVEN';
    const radius = 220;
    const centerX = 512;
    const centerY = 512;
    const angleStart = Math.PI * 0.1 // Centrato rispetto alla vista camera
    const angleStep = (Math.PI * 0.9) / text.length; // Distribuisci lungo l'arco da sinistra a destra
    
    ctx.font = 'bold 80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < text.length; i++) {
      const angle = angleStart + i * angleStep;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle - Math.PI / 2); // Ruota la lettera perpendicolare all'arco
      
      // Bordo nero
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 10;
      ctx.strokeText(text[text.length - 1 - i], 0, 0);
      
      // Testo oro
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#FFD700';
      ctx.fillText(text[text.length - 1 - i], 0, 0);
      
      ctx.restore();
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Apply to felt
    const markingsGeometry = new THREE.PlaneGeometry(11.6, 8.6);
    const markingsMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      roughness: 0.95,
      metalness: 0
    });
    const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
    markings.rotation.x = -Math.PI / 2;
    markings.position.y = -1.145;
    markings.receiveShadow = true;
    this._scene.add(markings);
  }
  
  _addTableLegs() {
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1a0f,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const legPositions = [
      { x: -5, z: 3.5 },
      { x: 5, z: 3.5 },
      { x: -5, z: -3.5 },
      { x: 5, z: -3.5 }
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos.x, -2.75, pos.z);
      leg.castShadow = true;
      this._scene.add(leg);
    });
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
