/**
 * Orbit Controls
 * Single Responsibility: Camera control
 */

export class OrbitControls {
  constructor(canvas, camera) {
    this._canvas = canvas;
    this._camera = camera;
    this._isDragging = false;
    this._previousPosition = { x: 0, y: 0 };
    this._rotationSpeed = 0.005;
    this._initializeEventListeners();
  }

  _initializeEventListeners() {
    this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this._canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this._canvas.addEventListener('mouseup', () => this._onMouseUp());
    this._canvas.addEventListener('mouseleave', () => this._onMouseLeave());
    this._canvas.addEventListener('touchstart', (e) => this._onTouchStart(e));
    this._canvas.addEventListener('touchmove', (e) => this._onTouchMove(e));
    this._canvas.addEventListener('touchend', () => this._onTouchEnd());
  }

  _onMouseDown(event) {
    this._isDragging = true;
    this._previousPosition = { x: event.clientX, y: event.clientY };
  }

  _onMouseMove(event) {
    if (!this._isDragging) {
      return;
    }

    const deltaX = event.clientX - this._previousPosition.x;
    const deltaY = event.clientY - this._previousPosition.y;

    this._updateCameraPosition(deltaX, deltaY);
    this._previousPosition = { x: event.clientX, y: event.clientY };
  }

  _onMouseUp() {
    this._isDragging = false;
  }

  _onMouseLeave() {
    this._isDragging = false;
  }

  _onTouchStart(event) {
    if (event.touches.length === 1) {
      this._isDragging = true;
      this._previousPosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }

  _onTouchMove(event) {
    if (!this._isDragging || event.touches.length !== 1) {
      return;
    }

    const deltaX = event.touches[0].clientX - this._previousPosition.x;
    const deltaY = event.touches[0].clientY - this._previousPosition.y;

    this._updateCameraPosition(deltaX, deltaY);
    this._previousPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  _onTouchEnd() {
    this._isDragging = false;
  }

  _updateCameraPosition(deltaX, deltaY) {
    this._camera.position.x += deltaX * this._rotationSpeed;
    this._camera.position.y -= deltaY * this._rotationSpeed;
    this._camera.lookAt(0, 0, 0);
  }
}
