/**
 * InputManager - Handles keyboard, mouse, and touch input
 * Implements Observer Pattern
 */
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Set();
        this.touchActive = false;
        this.mouseDown = false;
        this.listeners = {
            jump: []
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        if (!this.keys.has(key)) {
            this.keys.add(key);
            
            if (key === ' ' || key === 'arrowup' || key === 'w') {
                event.preventDefault();
                this.triggerJump();
            }
        }
    }

    handleKeyUp(event) {
        this.keys.delete(event.key.toLowerCase());
    }

    handleMouseDown(event) {
        event.preventDefault();
        this.mouseDown = true;
        this.triggerJump();
    }

    handleMouseUp(event) {
        this.mouseDown = false;
    }

    handleTouchStart(event) {
        event.preventDefault();
        this.touchActive = true;
        this.triggerJump();
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.touchActive = false;
    }

    triggerJump() {
        this.notifyListeners('jump');
    }

    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    notifyListeners(event) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback());
        }
    }

    isKeyPressed(key) {
        return this.keys.has(key.toLowerCase());
    }

    isJumpPressed() {
        return this.keys.has(' ') || 
               this.keys.has('arrowup') || 
               this.keys.has('w') ||
               this.mouseDown ||
               this.touchActive;
    }

    cleanup() {
        this.keys.clear();
        this.touchActive = false;
        this.mouseDown = false;
    }
}
