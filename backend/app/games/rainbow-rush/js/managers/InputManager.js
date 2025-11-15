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
        this.jumpPressed = false;
        this.jumpPressTime = 0;
        this.listeners = {
            jump: [],
            jumpRelease: []
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
                if (!this.jumpPressed) {
                    this.jumpPressed = true;
                    this.jumpPressTime = performance.now();
                    this.triggerJump();
                }
            }
        }
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys.delete(key);
        
        if (key === ' ' || key === 'arrowup' || key === 'w') {
            if (this.jumpPressed) {
                const pressDuration = performance.now() - this.jumpPressTime;
                this.jumpPressed = false;
                this.triggerJumpRelease(pressDuration);
            }
        }
    }

    handleMouseDown(event) {
        event.preventDefault();
        if (!this.mouseDown) {
            this.mouseDown = true;
            this.jumpPressed = true;
            this.jumpPressTime = performance.now();
            this.triggerJump();
        }
    }

    handleMouseUp(event) {
        if (this.mouseDown) {
            const pressDuration = performance.now() - this.jumpPressTime;
            this.mouseDown = false;
            this.jumpPressed = false;
            this.triggerJumpRelease(pressDuration);
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (!this.touchActive) {
            this.touchActive = true;
            this.jumpPressed = true;
            this.jumpPressTime = performance.now();
            this.triggerJump();
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (this.touchActive) {
            const pressDuration = performance.now() - this.jumpPressTime;
            this.touchActive = false;
            this.jumpPressed = false;
            this.triggerJumpRelease(pressDuration);
        }
    }

    triggerJump() {
        this.notifyListeners('jump');
    }

    triggerJumpRelease(duration) {
        this.notifyListeners('jumpRelease', duration);
    }

    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
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
