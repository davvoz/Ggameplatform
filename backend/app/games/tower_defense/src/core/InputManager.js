import * as THREE from "three";
import nipplejs from "nipplejs";

const VERTICAL_LIMIT = { min: 0.4, max: 1.25 };

export class InputManager {
  constructor(camera, rootElement) {
    this.camera = camera;
    this.rootElement = rootElement;

    this.isPointerDown = false;
    this.lastPointerPos = new THREE.Vector2();
    
    // Ottimizzazione mobile: camera più alta e zoom maggiore
    const isMobile = 'ontouchstart' in window;
    const mobileRadiusBoost = isMobile ? 1.6 : 1.0;
    const mobileHeightBoost = isMobile ? 1.4 : 1.0;
    
    this.rotation = {
      theta: Math.atan2(camera.position.x, camera.position.z),
      phi: Math.acos(
        camera.position.y /
          Math.sqrt(
            camera.position.x ** 2 +
              camera.position.y ** 2 +
              camera.position.z ** 2
          )
      ) / mobileHeightBoost,
      radius: camera.position.length() * mobileRadiusBoost
    };

    this.joystick = null;
    this.joystickVector = { x: 0, y: 0 };

    // Zoom/pinch state
    this.lastPinchDistance = 0;
    this.minRadius = 10;
    this.maxRadius = 35;
    this.zoomStep = 5;
    this.rotationStep = Math.PI / 4; // 45 degrees

    this._bindDesktopControls();
    this._setupJoystick();
    this._updateCameraFromRotation();
  }

  _bindDesktopControls() {
    const canvas = this.rootElement;
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));
    window.addEventListener("pointerup", () => this.onPointerUp());
    
    // Mouse wheel zoom
    canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    
    // Touch pinch zoom
    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", () => this.onTouchEnd());
  }

  _setupJoystick() {
    if (!("ontouchstart" in window)) return;

    const zone = document.createElement("div");
    zone.style.position = "absolute";
    zone.style.left = "0";
    zone.style.bottom = "0";
    zone.style.width = "45%";
    zone.style.height = "50%";
    zone.style.zIndex = "5";
    zone.style.touchAction = "none";
    zone.style.pointerEvents = "auto";

    this.rootElement.appendChild(zone);

    this.joystick = nipplejs.create({
      zone,
      mode: "dynamic",
      color: "white",
      size: 90,
      restOpacity: 0
    });

    this.joystick.on("move", (_, data) => {
      if (!data.vector) return;
      this.joystickVector.x = data.vector.x;
      this.joystickVector.y = data.vector.y;
    });

    this.joystick.on("end", () => {
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
    });
  }

  onPointerDown(event) {
    // Ignora se è un touch multitouch (pinch zoom)
    if (event.pointerType === 'touch' && event.touches && event.touches.length > 1) {
      return;
    }
    this.isPointerDown = true;
    this.lastPointerPos.set(event.clientX, event.clientY);
  }

  onPointerMove(event) {
    if (!this.isPointerDown) return;
    
    // Ignora se è un touch multitouch
    if (event.pointerType === 'touch' && event.touches && event.touches.length > 1) {
      return;
    }
    
    const dx = event.clientX - this.lastPointerPos.x;
    const dy = event.clientY - this.lastPointerPos.y;
    this.lastPointerPos.set(event.clientX, event.clientY);

    // Sensibilità ridotta su mobile per controllo migliore
    const rotationSpeed = ('ontouchstart' in window) ? 0.002 : 0.004;
    this.rotation.theta -= dx * rotationSpeed;
    this.rotation.phi -= dy * rotationSpeed;
    this.rotation.phi = Math.max(
      VERTICAL_LIMIT.min,
      Math.min(VERTICAL_LIMIT.max, this.rotation.phi)
    );

    this._updateCameraFromRotation();
  }

  onPointerUp() {
    this.isPointerDown = false;
  }

  onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY;
    const zoomSpeed = 0.002;
    
    this.rotation.radius += delta * zoomSpeed;
    this.rotation.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.rotation.radius));
    
    this._updateCameraFromRotation();
  }

  onTouchStart(event) {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  onTouchMove(event) {
    if (event.touches.length === 2) {
      event.preventDefault();
      
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (this.lastPinchDistance > 0) {
        const delta = this.lastPinchDistance - distance;
        const zoomSpeed = 0.05;
        
        this.rotation.radius += delta * zoomSpeed;
        this.rotation.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.rotation.radius));
        
        this._updateCameraFromRotation();
      }
      
      this.lastPinchDistance = distance;
    }
  }

  onTouchEnd() {
    this.lastPinchDistance = 0;
  }

  _updateCameraFromRotation() {
    const { radius, theta, phi } = this.rotation;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  update(deltaTime) {
    if (!this.joystick) return;
    if (!this.joystickVector.x && !this.joystickVector.y) return;

    const speed = 0.6 * deltaTime;
    this.rotation.theta -= this.joystickVector.x * speed;
    this.rotation.phi =
      this.rotation.phi -
      this.joystickVector.y * speed * 0.4;

    this.rotation.phi = Math.max(
      VERTICAL_LIMIT.min,
      Math.min(VERTICAL_LIMIT.max, this.rotation.phi)
    );
    this._updateCameraFromRotation();
  }

  zoomIn() {
    this.rotation.radius = Math.max(this.minRadius, this.rotation.radius - this.zoomStep);
    this._updateCameraFromRotation();
  }

  zoomOut() {
    this.rotation.radius = Math.min(this.maxRadius, this.rotation.radius + this.zoomStep);
    this._updateCameraFromRotation();
  }

  rotateLeft() {
    this.rotation.theta += this.rotationStep;
    this._updateCameraFromRotation();
  }

  rotateRight() {
    this.rotation.theta -= this.rotationStep;
    this._updateCameraFromRotation();
  }

  dispose() {
    if (this.joystick) {
      this.joystick.destroy();
      this.joystick = null;
    }
  }
}

